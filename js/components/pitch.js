/**
 * Componente Campo da Calcio (Tactical Soccer Pitch)
 * Gestisce:
 * - Rendering grafico del campo realistico e linee di campo
 * - Posizionamento animato delle 11 card sul campo
 * - Disegno delle linee tattiche di coordinazione (SVG)
 * - Drag & Drop unificato su mouse e touch
 */

import { store } from '../store.js';
import { createPlayerCard } from './playerCard.js';
import { dragDrop } from '../utils/dragDrop.js';

export class PitchComponent {
  constructor(container) {
    this.container = container;
    this.pitchEl = null;
    this.slotsLayer = null;
    this.linesSvgLayer = null;

    this.init();
  }

  init() {
    this.renderBasePitch();
    dragDrop.init(this.pitchEl);
    this.subscribeEvents();
    this.updatePitch();
  }

  renderBasePitch() {
    this.container.innerHTML = `
      <div class="pitch-outer-wrapper">
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
      </div>
    `;

    this.pitchEl = this.container.querySelector('#soccer-pitch');
    this.slotsLayer = this.container.querySelector('#pitch-slots-layer');
    this.linesSvgLayer = this.container.querySelector('#tactical-lines-group');
  }

  subscribeEvents() {
    store.subscribe('formation:changed', () => this.updatePitch());
    store.subscribe('team:changed', () => this.updatePitch());
    store.subscribe('team:reset', () => this.updatePitch());
    store.subscribe('player:selected', () => this.updateSelectionHighlight());
    store.subscribe('player:updated', () => this.updatePitch());
    store.subscribe('ballottaggio:updated', () => this.updatePitch());
    store.subscribe('ui:linesToggled', (show) => this.toggleLinesVisibility(show));
    store.subscribe('position:customized', () => {
      this.updateSlotsPositions();
      this.renderTacticalLines();
    });
  }

  updatePitch() {
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
        isLineup: true,
        isSelected
      });

      // Bind Pointer Event per avviare il Drag & Drop unificato
      card.addEventListener('pointerdown', (e) => {
        dragDrop.startDrag(e, {
          type: 'pitch',
          playerId: item.player?.id,
          slotId: item.slot.id,
          sourceEl: card
        });
      });

      // Etichetta del ruolo slot di posizione
      const slotLabel = document.createElement('div');
      slotLabel.className = 'slot-role-tag';
      slotLabel.textContent = item.slot.label || item.slot.role;

      slotWrapper.appendChild(card);
      slotWrapper.appendChild(slotLabel);

      // Rendering dei sostituti assegnati sotto al titolare
      const substitutesList = item.player?.substitutes || [];
      if (substitutesList.length > 0) {
        const subsContainer = document.createElement('div');
        subsContainer.className = 'slot-substitutes-container';

        substitutesList.slice(0, 2).forEach((subId, idx) => {
          const subPlayer = store.getPlayer(subId);
          if (!subPlayer) return;

          const subPill = document.createElement('div');
          subPill.className = 'pitch-sub-pill';
          subPill.title = `${idx + 1}ª Scelta Sostituto: ${subPlayer.name} (${subPlayer.role})`;
          subPill.innerHTML = `
            <span class="sub-prefix">${idx + 1}ª</span>
            <span class="sub-name">${subPlayer.name || subPlayer.displayName}</span>
            <button type="button" class="sub-quick-swap-btn" title="Promuovi subito ${subPlayer.name} titolare">
              <i class="fa-solid fa-repeat"></i>
            </button>
          `;

          // Tasto di swap rapido
          subPill.querySelector('.sub-quick-swap-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            store.assignPlayerToSlot(item.slot.id, subPlayer.id);
          });

          // Click sulla pillola per selezionare il sostituto nell'ispettore
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

    this.slotsLayer.querySelectorAll('.player-card').forEach(card => {
      if (card.dataset.playerId === selectedId) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
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
