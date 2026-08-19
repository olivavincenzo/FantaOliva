/**
 * Componente Campo da Calcio (Tactical Soccer Pitch)
 * Gestisce:
 * - Rendering grafico del campo realistico e linee di campo
 * - Posizionamento animato delle 11 card sul campo
 * - Disegno delle linee tattiche di coordinazione (SVG)
 * - Drag & Drop unificato su mouse e touch
 */

import { store } from '../store.js';
import { FORMATION_LIST } from '../data/formations.js';
import { createPlayerCard } from './playerCard.js';
import { dragDrop } from '../utils/dragDrop.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';

export class PitchComponent {
  constructor(container) {
    this.container = container;
    this.pitchEl = null;
    this.slotsLayer = null;
    this.linesSvgLayer = null;
    this.verticalListEl = null;

    this.init();
  }

  init() {
    this.renderBasePitch();
    this.subscribeEvents();
    this.updatePitch();
  }

  renderBasePitch() {
    const formationOptions = FORMATION_LIST.map(f => {
      const isSel = store.getCurrentFormation()?.id === f.id ? 'selected' : '';
      return `<option value="${f.id}" ${isSel}>${f.id}</option>`;
    }).join('');

    this.container.innerHTML = `
      <div class="pitch-outer-wrapper">
        <!-- BARRA STRUMENTI IN UNA RIGA SOPRA AL CAMPO -->
        <div class="pitch-top-toolbar" id="pitch-top-toolbar">
          <div class="pitch-toolbar-left">
            <button id="pitch-hud-teams-btn" class="pitch-toolbar-btn pitch-team-trigger" title="Seleziona Squadra Serie A">
              <i class="fa-solid fa-shield-halved"></i>
              <span class="pitch-watermark-club" id="pitch-watermark-club"></span>
            </button>
          </div>

          <div class="pitch-toolbar-right">
            <div class="pitch-formation-picker">
              <select id="formation-select" class="pitch-formation-select" aria-label="Seleziona Modulo Tattico">
                ${formationOptions}
              </select>
              <i class="fa-solid fa-chevron-down formation-arrow"></i>
            </div>

            <div class="pitch-toolbar-group">
              <button id="toggle-pitch-layout-btn" class="pitch-toolbar-btn" title="Cambia visualizzazione: Campo Grafico / Lista Verticale">
                <i class="fa-solid fa-list-ol"></i>
                <span class="btn-text-hide">Lista</span>
              </button>
              <button id="toggle-lines-btn" class="pitch-toolbar-btn is-active" title="Mostra/Nascondi linee tattiche">
                <i class="fa-solid fa-diagram-project"></i>
                <span class="btn-text-hide">Linee</span>
              </button>
              <button id="reset-positions-btn" class="pitch-toolbar-btn icon-only" title="Riallinea posizioni standard del modulo">
                <i class="fa-solid fa-arrows-to-dot"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 1. CAMPO DA CALCIO GRAFICO (Visualizzazione Standard) -->
        <div class="soccer-pitch" id="soccer-pitch">
          <!-- Effetto manto erboso a strisce -->
          <div class="pitch-grass-stripes"></div>
          
          <!-- Linee di campo (Marcature regolamentari) -->
          <div class="pitch-lines">
            <!-- Linea perimetrale -->
            <div class="pitch-boundary"></div>
            
            <!-- Centrocampo -->
            <div class="halfway-line"></div>
            <div class="center-circle"></div>
            <div class="center-spot"></div>

            <!-- Area di rigore Superiore (Attacco) -->
            <div class="penalty-box top-box"></div>
            <div class="goal-box top-goal-box"></div>
            <div class="penalty-spot top-spot"></div>
            <div class="penalty-arc top-arc"></div>
            <div class="goal-frame top-goal"></div>

            <!-- Area di rigore Inferiore (Difesa / Portiere) -->
            <div class="penalty-box bottom-box"></div>
            <div class="goal-box bottom-goal-box"></div>
            <div class="penalty-spot bottom-spot"></div>
            <div class="penalty-arc bottom-arc"></div>
            <div class="goal-frame bottom-goal"></div>

            <!-- Bandierine / Archi d'angolo -->
            <div class="corner-arc top-left"></div>
            <div class="corner-arc top-right"></div>
            <div class="corner-arc bottom-left"></div>
            <div class="corner-arc bottom-right"></div>
          </div>

          <!-- Layer SVG per le linee tattiche di collegamento -->
          <svg class="tactical-lines-svg" id="tactical-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tactical-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="rgba(0, 255, 135, 0.45)" />
                <stop offset="100%" stop-color="rgba(0, 210, 255, 0.45)" />
              </linearGradient>
              <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="tactical-lines-group"></g>
          </svg>

          <!-- Layer degli Slot Giocatori sul campo -->
          <div class="pitch-slots-layer" id="pitch-slots-layer"></div>
        </div>

        <!-- 2. LISTA VERTICALE TITOLARI SEMPLIFICATA (A ➔ C ➔ D ➔ P) -->
        <div class="pitch-vertical-list-container hidden" id="pitch-vertical-list"></div>
      </div>
    `;

    this.pitchEl = this.container.querySelector('#soccer-pitch');
    this.slotsLayer = this.container.querySelector('#pitch-slots-layer');
    this.linesSvgLayer = this.container.querySelector('#tactical-lines-group');
    this.verticalListEl = this.container.querySelector('#pitch-vertical-list');
    if (this.pitchEl) dragDrop.init(this.pitchEl);
  }

  subscribeEvents() {
    store.subscribe('formation:changed', () => this.updatePitch());
    store.subscribe('team:changed', () => this.updatePitch());
    store.subscribe('team:reset', () => this.updatePitch());
    store.subscribe('player:selected', () => this.updateSelectionHighlight());
    store.subscribe('player:updated', () => this.updatePitch());
    store.subscribe('ballottaggio:updated', () => this.updatePitch());
    store.subscribe('ui:linesToggled', (show) => this.toggleLinesVisibility(show));
    store.subscribe('pitch:layoutChanged', () => this.updatePitch());
    store.subscribe('position:customized', () => {
      this.updateSlotsPositions();
      this.renderTacticalLines();
    });
  }

  updatePitch() {
    // Aggiornamento Nome Squadra in alto sul campo
    const team = store.getCurrentTeam();
    const clubEl = this.container.querySelector('#pitch-watermark-club');
    if (team && clubEl) {
      clubEl.textContent = team.name || '';
    }

    // Sincronizza valore modulo nel selettore toolbar
    const formationSelect = this.container.querySelector('#formation-select');
    const currFormation = store.getCurrentFormation();
    if (formationSelect && currFormation) {
      formationSelect.value = currFormation.id;
    }

    const isListMode = store.pitchLayoutMode === 'list';

    if (isListMode) {
      if (this.pitchEl) {
        this.pitchEl.style.display = 'none';
        this.pitchEl.classList.add('hidden');
      }
      if (this.verticalListEl) {
        this.verticalListEl.style.display = 'flex';
        this.verticalListEl.classList.remove('hidden');
        this.renderVerticalList();
      }
      return;
    }

    if (this.pitchEl) {
      this.pitchEl.style.display = 'block';
      this.pitchEl.classList.remove('hidden');
    }
    if (this.verticalListEl) {
      this.verticalListEl.style.display = 'none';
      this.verticalListEl.classList.add('hidden');
    }

    const lineup = store.getLineupPlayers();
    const selectedPlayer = store.getSelectedPlayer();

    this.slotsLayer.innerHTML = '';

    lineup.forEach(item => {
      const slotWrapper = document.createElement('div');
      slotWrapper.className = 'pitch-slot-wrapper';
      slotWrapper.dataset.slotId = item.slot.id;
      slotWrapper.style.left = `${item.x}%`;
      slotWrapper.style.top = `${item.y}%`;

      const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;

      const card = createPlayerCard(item.player, {
        slotId: item.slot.id,
        slotRole: item.slot.role || item.slot.label,
        isLineup: true,
        isSelected
      });

      // Bind Pointer Event per avviare il Drag & Drop unificato sul campo grafico
      card.addEventListener('pointerdown', (e) => {
        dragDrop.startDrag(e, {
          type: 'pitch',
          playerId: item.player?.id,
          slotId: item.slot.id,
          sourceEl: card
        });
      });

      slotWrapper.appendChild(card);

      // Rendering di tutti i sostituti assegnati sotto al titolare
      const substitutesList = item.player?.substitutes || [];
      if (substitutesList.length > 0) {
        const subsContainer = document.createElement('div');
        subsContainer.className = 'slot-substitutes-container';

        substitutesList.forEach((subId, idx) => {
          const subPlayer = store.getPlayer(subId);
          if (!subPlayer) return;

          const subTit = subPlayer.stats?.titolarita ?? subPlayer.titolaritaPerc ?? 50;
          const subTitClass = getTitolaritaClass(subTit);
          const subIsTaken = subPlayer.isAvailable === false;

          const subPill = document.createElement('div');
          subPill.className = `pitch-sub-pill ${subIsTaken ? 'is-taken' : ''}`;
          subPill.title = `${idx + 1}ª Scelta Sostituto: ${subPlayer.name} (${subPlayer.role}) - ${subTit}% Titolarità${subIsTaken ? ' - PRESO (non disponibile all\'asta)' : ''} (Clicca per ispezionare)`;
          subPill.innerHTML = `
            <span class="sub-prefix">${idx + 1}ª</span>
            <div class="sub-info-row">
              <span class="sub-name">${sanitizeHtml(subPlayer.name || subPlayer.displayName)}</span>
              <span class="sub-tit-badge ${subTitClass}" title="% Titolarità">${subTit}% Tit</span>
            </div>
          `;

          // Click sulla pillola per selezionare e ispezionare il sostituto
          subPill.addEventListener('click', (e) => {
            e.stopPropagation();
            store.selectPlayer(subPlayer.id);
          });

          subsContainer.appendChild(subPill);
        });

        slotWrapper.appendChild(subsContainer);
      }

      this.slotsLayer.appendChild(slotWrapper);
    });

    this.renderTacticalLines();
    this.toggleLinesVisibility(store.showTacticalLines);
  }

  updateSlotsPositions() {
    const lineup = store.getLineupPlayers();
    lineup.forEach(item => {
      const slotWrapper = this.slotsLayer.querySelector(`[data-slot-id="${item.slot.id}"]`);
      if (slotWrapper) {
        slotWrapper.style.left = `${item.x}%`;
        slotWrapper.style.top = `${item.y}%`;
      }
    });
  }

  updateSelectionHighlight() {
    const selectedPlayer = store.getSelectedPlayer();
    const selectedId = selectedPlayer ? selectedPlayer.id : null;

    this.container.querySelectorAll('.player-card').forEach(card => {
      if (card.dataset.playerId === selectedId) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
    });
  }

  renderVerticalList() {
    if (!this.verticalListEl) return;

    const lineup = store.getLineupPlayers();
    const selectedPlayer = store.getSelectedPlayer();

    // Raggruppa i titolari rigorosamente per reparto:
    // 1. Attaccanti (A)
    // 2. Centrocampisti (C)
    // 3. Difensori (D)
    // 4. Portiere (P)
    const departments = [
      { key: 'A', name: 'Attaccanti', icon: 'fa-futbol', colorClass: 'dept-attack', items: [] },
      { key: 'C', name: 'Centrocampisti', icon: 'fa-bolt', colorClass: 'dept-midfield', items: [] },
      { key: 'D', name: 'Difensori', icon: 'fa-shield', colorClass: 'dept-defense', items: [] },
      { key: 'P', name: 'Portiere', icon: 'fa-mitten', colorClass: 'dept-goalkeeper', items: [] }
    ];

    lineup.forEach(item => {
      const r = (item.player?.classicRole || item.player?.role || item.slot.role || '').toUpperCase();
      if (r === 'A' || r.includes('A') || r === 'PC' || r === 'AD' || r === 'AS') {
        departments[0].items.push(item);
      } else if (r === 'C' || r.includes('C') || r === 'TRQ' || r === 'MED' || r === 'CC' || r === 'E') {
        departments[1].items.push(item);
      } else if (r === 'D' || r.includes('D') || r === 'DC' || r === 'TD' || r === 'TS' || r === 'B') {
        departments[2].items.push(item);
      } else if (r === 'P' || r.includes('P') || r === 'POR') {
        departments[3].items.push(item);
      } else {
        departments[1].items.push(item);
      }
    });

    this.verticalListEl.innerHTML = '';

    const scrollWrapper = document.createElement('div');
    scrollWrapper.className = 'pitch-vertical-list-scroll';

    departments.forEach(dept => {
      if (dept.items.length === 0) return;

      const deptSection = document.createElement('div');
      deptSection.className = `pitch-list-dept-section ${dept.colorClass}`;

      deptSection.innerHTML = `
        <div class="pitch-list-dept-header">
          <div class="dept-title-box">
            <i class="fa-solid ${dept.icon}"></i>
            <span>${dept.name}</span>
          </div>
          <span class="dept-count-badge">${dept.items.length} ${dept.items.length === 1 ? 'Titolare' : 'Titolari'}</span>
        </div>
        <div class="pitch-list-dept-items-grid"></div>
      `;

      const gridEl = deptSection.querySelector('.pitch-list-dept-items-grid');

      dept.items.forEach(item => {
        const rowItem = document.createElement('div');
        rowItem.className = 'pitch-list-slot-item';
        rowItem.dataset.slotId = item.slot.id;

        const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;

        const card = createPlayerCard(item.player, {
          slotId: item.slot.id,
          slotRole: item.slot.role || item.slot.label,
          isLineup: true,
          isSelected
        });

        rowItem.appendChild(card);

        // Rendering sostituti e ballottaggi
        const substitutesList = item.player?.substitutes || [];
        if (substitutesList.length > 0) {
          const subsContainer = document.createElement('div');
          subsContainer.className = 'slot-substitutes-container';

          substitutesList.forEach((subId, idx) => {
            const subPlayer = store.getPlayer(subId);
            if (!subPlayer) return;

            const subTit = subPlayer.stats?.titolarita ?? subPlayer.titolaritaPerc ?? 50;
            const subTitClass = getTitolaritaClass(subTit);
            const subIsTaken = subPlayer.isAvailable === false;

            const subPill = document.createElement('div');
            subPill.className = `pitch-sub-pill ${subIsTaken ? 'is-taken' : ''}`;
            subPill.title = `${idx + 1}ª Scelta Sostituto: ${subPlayer.name} (${subPlayer.role}) - ${subTit}% Titolarità${subIsTaken ? ' - PRESO' : ''}`;
            subPill.innerHTML = `
              <span class="sub-prefix">${idx + 1}ª</span>
              <div class="sub-info-row">
                <span class="sub-name">${sanitizeHtml(subPlayer.name || subPlayer.displayName)}</span>
                <span class="sub-tit-badge ${subTitClass}">${subTit}% Tit</span>
              </div>
            `;

            subPill.addEventListener('click', (e) => {
              e.stopPropagation();
              store.selectPlayer(subPlayer.id);
            });

            subsContainer.appendChild(subPill);
          });

          rowItem.appendChild(subsContainer);
        }

        gridEl.appendChild(rowItem);
      });

      scrollWrapper.appendChild(deptSection);
    });

    this.verticalListEl.appendChild(scrollWrapper);
  }

  renderTacticalLines() {
    if (!this.linesSvgLayer) return;
    const formation = store.getCurrentFormation();
    if (!formation || !formation.connections) {
      this.linesSvgLayer.innerHTML = '';
      return;
    }

    const lineup = store.getLineupPlayers();
    const slotMap = new Map();
    lineup.forEach(item => {
      slotMap.set(item.slot.id, { x: item.x, y: item.y });
    });

    let svgLinesHtml = '';
    formation.connections.forEach(([slotAId, slotBId]) => {
      const posA = slotMap.get(slotAId);
      const posB = slotMap.get(slotBId);

      if (posA && posB) {
        svgLinesHtml += `
          <line 
            x1="${posA.x}" y1="${posA.y}" 
            x2="${posB.x}" y2="${posB.y}" 
            stroke="url(#tactical-line-grad)" 
            stroke-width="0.35" 
            stroke-dasharray="1 0.6"
            filter="url(#line-glow)"
          />
        `;
      }
    });

    this.linesSvgLayer.innerHTML = svgLinesHtml;
  }

  toggleLinesVisibility(show) {
    const svg = this.container.querySelector('#tactical-lines-svg');
    if (svg) {
      svg.style.display = show ? 'block' : 'none';
    }
  }
}
