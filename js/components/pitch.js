/**
 * Componente Campo da Calcio & Vista Giocatori Squadra (Editorial Minimal Design)
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
    this.activeRoleFilter = 'ALL';
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.renderBasePitch();
    this.bindTopControls();
    this.subscribeEvents();
    this.updatePitch();
  }

  renderBasePitch() {
    const formationOptions = FORMATION_LIST.map(f => {
      const isSel = store.getCurrentFormation()?.id === f.id ? 'selected' : '';
      return `<option value="${f.id}" ${isSel}>${f.id}</option>`;
    }).join('');

    const team = store.getCurrentTeam();
    const teamName = team ? team.name.toUpperCase() : 'INTER';

    this.container.innerHTML = `
      <div class="pitch-outer-wrapper">
        
        <!-- HEADER EDITORIAL MINIMAL -->
        <header class="topbar">
          <div>
            <p class="context">Asta 2026/27 · Serie A</p>
            <h1 class="team-title-heading" id="pitch-watermark-club">${sanitizeHtml(teamName)}</h1>
          </div>
          <div class="topbar-actions">
            <button class="circle-button" id="pitch-hud-teams-btn" type="button" aria-label="Cambia Squadra" title="Cambia Squadra Serie A">
              ⇄
            </button>
            <button class="circle-button" id="toggle-pitch-layout-btn" type="button" aria-label="Alterna Campo Grafico / Lista Giocatori" title="Mostra Campo Grafico">
              <i class="fa-solid fa-futbol" style="font-size: 14px;"></i>
            </button>
            <div class="topbar-formation-wrap" title="Cambia Modulo Tattico">
              <select id="topbar-formation-select" class="topbar-formation-select" aria-label="Seleziona Modulo Tattico">
                ${formationOptions}
              </select>
              <span class="formation-arrow">▾</span>
            </div>
          </div>
        </header>

        <!-- BARRA DI RICERCA EDITORIALE -->
        <div class="search" role="search" aria-label="Cerca giocatori">
          <svg class="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input 
            type="text" 
            id="pitch-search-input" 
            class="search-input" 
            placeholder="Cerca giocatore o squadra" 
            autocomplete="off"
          />
          <button id="pitch-search-clear" class="search-clear hidden" aria-label="Pulisci ricerca">&times;</button>
        </div>

        <!-- FILTRI RUOLI A SCORRIMENTO ORIZZONTALE -->
        <nav class="filters" aria-label="Filtri giocatori">
          <button class="filter active" data-role="ALL" type="button">Tutti · <span id="filter-total-count">0</span></button>
          <button class="filter" data-role="ATT" type="button">ATT</button>
          <button class="filter" data-role="CEN" type="button">CEN</button>
          <button class="filter" data-role="DIF" type="button">DIF</button>
          <button class="filter" data-role="POR" type="button">POR</button>
        </nav>

        <!-- 1. LISTA VERTICALE EDITORIALE (Visualizzazione Principale) -->
        <div class="pitch-vertical-list-container" id="pitch-vertical-list"></div>

        <!-- 2. CAMPO DA CALCIO GRAFICO (Visualizzazione Alternativa) -->
        <div class="soccer-pitch hidden" id="soccer-pitch">
          <div class="pitch-grass-stripes"></div>
          <div class="pitch-lines">
            <div class="pitch-boundary"></div>
            <div class="halfway-line"></div>
            <div class="center-circle"></div>
            <div class="center-spot"></div>
            <div class="penalty-box top-box"></div>
            <div class="goal-box top-goal-box"></div>
            <div class="penalty-spot top-spot"></div>
            <div class="penalty-arc top-arc"></div>
            <div class="penalty-box bottom-box"></div>
            <div class="goal-box bottom-goal-box"></div>
            <div class="penalty-spot bottom-spot"></div>
            <div class="penalty-arc bottom-arc"></div>
          </div>
          <svg class="tactical-lines-svg" id="tactical-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g id="tactical-lines-group"></g>
          </svg>
          <div class="pitch-slots-layer" id="pitch-slots-layer"></div>
        </div>

      </div>
    `;

    this.pitchEl = this.container.querySelector('#soccer-pitch');
    this.slotsLayer = this.container.querySelector('#pitch-slots-layer');
    this.linesSvgLayer = this.container.querySelector('#tactical-lines-group');
    this.verticalListEl = this.container.querySelector('#pitch-vertical-list');
    if (this.pitchEl) dragDrop.init(this.pitchEl);
  }

  bindTopControls() {
    // Selettore Squadre Trigger
    const teamsBtn = this.container.querySelector('#pitch-hud-teams-btn');
    teamsBtn?.addEventListener('click', () => {
      const sidebarTeams = document.querySelector('#sidebar-teams');
      const sidebarInspector = document.querySelector('#sidebar-inspector');
      const backdrop = document.querySelector('#mobile-drawer-backdrop');

      if (window.innerWidth <= 900) {
        sidebarTeams?.classList.toggle('mobile-open');
        sidebarInspector?.classList.remove('mobile-open');
        backdrop?.classList.toggle('hidden', !sidebarTeams?.classList.contains('mobile-open'));
      } else {
        document.body.classList.toggle('left-sidebar-collapsed');
      }
    });

    // Selettore Modulo Topbar
    const topbarFormationSelect = this.container.querySelector('#topbar-formation-select');
    topbarFormationSelect?.addEventListener('change', (e) => {
      store.setFormation(e.target.value);
    });

    // Filtro Ruoli
    const filterBtns = this.container.querySelectorAll('.filters .filter[data-role]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeRoleFilter = btn.dataset.role;
        this.renderVerticalList();
      });
    });

    // Ricerca Giocatori
    const searchInput = this.container.querySelector('#pitch-search-input');
    const searchClear = this.container.querySelector('#pitch-search-clear');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      searchClear?.classList.toggle('hidden', !this.searchQuery);
      this.renderVerticalList();
    });

    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      searchClear.classList.add('hidden');
      this.renderVerticalList();
      searchInput?.focus();
    });

    // Toggle Vista Lista / Campo
    const toggleLayoutBtn = this.container.querySelector('#toggle-pitch-layout-btn');
    const outerWrapper = this.container.querySelector('.pitch-outer-wrapper');

    toggleLayoutBtn?.addEventListener('click', () => {
      const isPitchHidden = this.pitchEl?.classList.contains('hidden');
      if (isPitchHidden) {
        // Mostra campo
        this.pitchEl?.classList.remove('hidden');
        this.verticalListEl?.classList.add('hidden');
        outerWrapper?.classList.add('is-pitch-mode');
        toggleLayoutBtn.classList.add('active');
        toggleLayoutBtn.title = 'Mostra Lista Giocatori';
        toggleLayoutBtn.innerHTML = '<i class="fa-solid fa-list" style="font-size: 14px;"></i>';
        this.updateSlotsPositions();
        this.renderTacticalLines();
      } else {
        // Mostra lista editoriale
        this.pitchEl?.classList.add('hidden');
        this.verticalListEl?.classList.remove('hidden');
        outerWrapper?.classList.remove('is-pitch-mode');
        toggleLayoutBtn.classList.remove('active');
        toggleLayoutBtn.title = 'Mostra Campo Grafico';
        toggleLayoutBtn.innerHTML = '<i class="fa-solid fa-futbol" style="font-size: 14px;"></i>';
        this.renderVerticalList();
      }
    });
  }

  subscribeEvents() {
    store.subscribe('formation:changed', () => this.updatePitch());
    store.subscribe('team:changed', () => this.updatePitch());
    store.subscribe('team:reset', () => this.updatePitch());
    store.subscribe('player:selected', () => this.updateSelectionHighlight());
    store.subscribe('player:updated', () => this.updatePitch());
    store.subscribe('ballottaggio:updated', () => this.updatePitch());
    store.subscribe('pitch:layoutChanged', () => this.updatePitch());
    store.subscribe('position:customized', () => {
      this.updateSlotsPositions();
      this.renderTacticalLines();
    });
  }

  updatePitch() {
    const team = store.getCurrentTeam();
    const clubEl = this.container.querySelector('#pitch-watermark-club');
    if (team && clubEl) {
      clubEl.textContent = team.name.toUpperCase();
    }

    const formation = store.getCurrentFormation();
    const topbarFormationSelect = this.container.querySelector('#topbar-formation-select');
    if (formation && topbarFormationSelect) {
      topbarFormationSelect.value = formation.id;
    }

    this.renderVerticalList();
    this.updateSlotsPositions();
    this.renderTacticalLines();
  }

  renderVerticalList() {
    if (!this.verticalListEl) return;
    this.verticalListEl.innerHTML = '';

    const currentTeam = store.getCurrentTeam();
    const lineup = store.getLineupPlayers();
    const currentFormation = store.getCurrentFormation();
    const formationLabel = currentFormation ? currentFormation.id : '4-3-3';
    const selectedPlayer = store.getSelectedPlayer();

    // Funzione helper per ottenere la categoria del ruolo (ATT, CEN, DIF, POR)
    const getRoleCategory = (player) => {
      if (!player) return 'CEN';
      const r = (player.role || '').toUpperCase();
      const f = (player.classicRole || player.fantaRole || '').toUpperCase();
      if (['A', 'PC', 'W'].includes(r) || f === 'A') return 'ATT';
      if (['C', 'M', 'T', 'E'].includes(r) || f === 'C') return 'CEN';
      if (['D', 'DC', 'TD', 'TS'].includes(r) || f === 'D') return 'DIF';
      if (['P', 'POR'].includes(r) || f === 'P') return 'POR';
      return 'CEN';
    };

    // Raggruppamento per reparto
    const departments = [
      { key: 'ATT', name: 'Attaccanti', items: [] },
      { key: 'CEN', name: 'Centrocampisti', items: [] },
      { key: 'DIF', name: 'Difensori', items: [] },
      { key: 'POR', name: 'Portieri', items: [] }
    ];

    // Raccogli sia i titolari che i panchinari per mostrare l'intera rosa della squadra attiva
    const starters = lineup.map(i => ({
      player: i.player,
      slotId: i.slot?.id,
      slotRole: i.slot?.role || i.slot?.label,
      isLineup: true
    })).filter(i => i.player);

    const bench = (currentTeam?.bench || []).map(p => ({
      player: p,
      slotId: null,
      slotRole: p.role,
      isLineup: false
    })).filter(i => i.player);

    const seenIds = new Set();
    const allSquadItems = [];
    starters.forEach(s => {
      if (!seenIds.has(s.player.id)) {
        seenIds.add(s.player.id);
        allSquadItems.push(s);
      }
    });
    bench.forEach(b => {
      if (!seenIds.has(b.player.id)) {
        seenIds.add(b.player.id);
        allSquadItems.push(b);
      }
    });

    allSquadItems.forEach(item => {
      const p = item.player;
      if (!p) return;

      // Filtro ricerca
      if (this.searchQuery) {
        const matchName = (p.name || '').toLowerCase().includes(this.searchQuery) ||
                          (p.displayName || '').toLowerCase().includes(this.searchQuery);
        const matchRole = (p.role || '').toLowerCase().includes(this.searchQuery) ||
                          (p.classicRole || '').toLowerCase().includes(this.searchQuery);
        if (!matchName && !matchRole) return;
      }

      const cat = getRoleCategory(p);

      // Filtro ruoli
      if (this.activeRoleFilter !== 'ALL' && cat !== this.activeRoleFilter) {
        return;
      }

      const dept = departments.find(d => d.key === cat) || departments[1];
      dept.items.push(item);
    });

    const totalCountEl = this.container.querySelector('#filter-total-count');
    if (totalCountEl) {
      totalCountEl.textContent = allSquadItems.length;
    }

    let hasAnyPlayer = false;

    departments.forEach(dept => {
      if (dept.items.length === 0) return;
      hasAnyPlayer = true;

      const formationOptions = FORMATION_LIST.map(f => {
        const isSel = currentFormation?.id === f.id ? 'selected' : '';
        return `<option value="${f.id}" ${isSel}>${f.id}</option>`;
      }).join('');

      // Section Header con Selettore Modulo a destra
      const headerEl = document.createElement('div');
      headerEl.className = 'section-header';
      headerEl.innerHTML = `
        <h2>${sanitizeHtml(dept.name)}</h2>
        <div class="section-formation-wrap" title="Cambia Modulo Tattico">
          <select class="section-formation-select" aria-label="Seleziona Modulo Tattico">
            ${formationOptions}
          </select>
          <span class="formation-arrow">▾</span>
        </div>
      `;

      headerEl.querySelector('.section-formation-select')?.addEventListener('change', (e) => {
        store.setFormation(e.target.value);
      });

      this.verticalListEl.appendChild(headerEl);

      // Section List
      const listSection = document.createElement('section');
      listSection.className = 'player-list';
      listSection.setAttribute('aria-label', `Elenco ${dept.name}`);

      dept.items.forEach(item => {
        const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;

        const card = createPlayerCard(item.player, {
          slotId: item.slotId,
          slotRole: item.slotRole,
          isLineup: item.isLineup,
          isSelected
        });

        listSection.appendChild(card);
      });

      this.verticalListEl.appendChild(listSection);
    });

    if (!hasAnyPlayer) {
      this.verticalListEl.innerHTML = `
        <div style="text-align: center; padding: 36px 14px; color: var(--muted);">
          <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p style="font-size: 13px; font-weight: 580;">Nessun calciatore trovato per i filtri selezionati</p>
        </div>
      `;
    }
  }

  updateSlotsPositions() {
    if (!this.slotsLayer) return;
    this.slotsLayer.innerHTML = '';

    const lineup = store.getLineupPlayers();
    const selectedPlayer = store.getSelectedPlayer();

    lineup.forEach(item => {
      const slotEl = document.createElement('div');
      slotEl.className = 'pitch-slot-wrapper';
      slotEl.dataset.slotId = item.slot.id;
      slotEl.style.left = `${item.x}%`;
      slotEl.style.top = `${item.y}%`;

      const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;

      const card = createPlayerCard(item.player, {
        slotId: item.slot.id,
        slotRole: item.slot.role || item.slot.label,
        isLineup: true,
        compact: true,
        isSelected
      });

      slotEl.appendChild(card);
      this.slotsLayer.appendChild(slotEl);
    });
  }

  updateSelectionHighlight() {
    const selectedPlayer = store.getSelectedPlayer();
    this.container.querySelectorAll('.player-card').forEach(card => {
      const pId = card.dataset.playerId;
      const isSelected = selectedPlayer && pId === selectedPlayer.id;
      card.classList.toggle('is-selected', Boolean(isSelected));
    });
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
            stroke="rgba(16, 16, 20, 0.25)" 
            stroke-width="0.35" 
            stroke-dasharray="1 0.6"
          />
        `;
      }
    });

    this.linesSvgLayer.innerHTML = svgLinesHtml;
  }
}
