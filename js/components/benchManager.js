/**
 * Componente Gestione Rosa & Panchina (Bench Manager)
 * Permette di:
 * - Visualizzare i giocatori non schierati titolari
 * - Filtrare per ruolo (TUTTI, POR, DIF, CEN, ATT)
 * - Trascinare o sostituire direttamente un titolare con un click
 * - Aggiungere nuovi giocatori personalizzati alla squadra
 */

import { store } from '../store.js';
import { ROLE_CATEGORIES } from '../data/roles.js';
import { createPlayerCard } from './playerCard.js';
import { dragDrop } from '../utils/dragDrop.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export function renderBenchPanel(container) {
  const benchPlayers = store.getBenchPlayers();
  const activeFilter = store.activeBenchFilter;
  const selectedSlotId = store.selectedSlotId;

  const filteredPlayers = benchPlayers.filter(p => {
    if (activeFilter === 'ALL') return true;
    const classic = (p.classicRole || p.fantaRole || '').toUpperCase();
    const role = (p.role || '').toUpperCase();

    if (activeFilter === 'POR') return classic === 'P' || role === 'POR';
    if (activeFilter === 'DIF') return classic === 'D' || ['DC', 'TD', 'TS', 'E', 'DD', 'DS'].includes(role);
    if (activeFilter === 'CEN') return classic === 'C' || ['M', 'C', 'T', 'E', 'W'].includes(role);
    if (activeFilter === 'ATT') return classic === 'A' || ['W', 'A', 'PC', 'T'].includes(role);
    return true;
  });

  container.innerHTML = `
    <div class="bench-panel-inner">
      <div class="bench-header-row">
        <div class="bench-count">
          <i class="fa-solid fa-users"></i>
          <span>Panchina & Riserve (${benchPlayers.length})</span>
        </div>
        <button id="open-add-player-modal-btn" class="fanta-btn primary-btn btn-sm">
          <i class="fa-solid fa-user-plus"></i> Nuovo Giocatore
        </button>
      </div>

      <!-- Filtri Ruolo -->
      <div class="role-filter-pills">
        ${ROLE_CATEGORIES.map(cat => `
          <button 
            class="filter-pill ${activeFilter === cat.id ? 'is-active' : ''}" 
            data-filter="${cat.id}"
          >
            ${cat.name}
          </button>
        `).join('')}
      </div>

      <!-- Lista Carte Panchina -->
      <div class="bench-cards-grid" id="bench-cards-grid">
        ${filteredPlayers.length === 0 ? `
          <div class="empty-bench-state">
            <i class="fa-solid fa-user-slash"></i>
            <p>Nessun giocatore in panchina per questo filtro.</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Render cards
  const grid = container.querySelector('#bench-cards-grid');
  filteredPlayers.forEach(player => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'bench-card-wrapper';

    const card = createPlayerCard(player, {
      isLineup: false,
      compact: true
    });

    // Pointer event per Drag & Drop verso il campo
    card.addEventListener('pointerdown', (e) => {
      dragDrop.startDrag(e, {
        type: 'bench',
        playerId: player.id,
        sourceEl: card
      });
    });

    // Azione rapida: Sostituisci slot selezionato o schiera nel ruolo
    const quickSubBtn = document.createElement('button');
    quickSubBtn.className = 'quick-sub-btn';
    quickSubBtn.title = selectedSlotId ? `Schiera nella posizione selezionata` : `Schiera sul campo da titolare`;
    quickSubBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Schiera`;

    quickSubBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let targetSlot = selectedSlotId;

      if (!targetSlot) {
        // Cerca lo slot del campo più compatibile per il ruolo
        const lineup = store.getLineupPlayers();
        const role = (player.role || '').toUpperCase();
        const classic = (player.classicRole || player.fantaRole || 'C').toUpperCase();

        const match = lineup.find(item => item.slot.role === role) ||
                      lineup.find(item => item.slot.role.startsWith(classic)) ||
                      lineup[0];
        if (match) targetSlot = match.slot.id;
      }

      if (targetSlot) {
        store.assignPlayerToSlot(targetSlot, player.id);
        notify.success(`${player.name || player.displayName} schierato titolare!`);
      }
    });

    cardWrapper.appendChild(card);
    cardWrapper.appendChild(quickSubBtn);
    grid.appendChild(cardWrapper);
  });

  // Bind filter buttons
  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      store.setBenchFilter(filter);
      renderBenchPanel(container);
    });
  });

  // Bind Open Add Player Modal
  const addPlayerBtn = container.querySelector('#open-add-player-modal-btn');
  addPlayerBtn?.addEventListener('click', () => {
    const modal = document.querySelector('#add-player-modal');
    if (modal) modal.classList.remove('hidden');
  });
}
