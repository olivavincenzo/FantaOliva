/**
 * Componente per la visualizzazione della Guida Asta per Slot (Editorial Minimal Design)
 * Organizza i calciatori per ciascun ruolo (P, D, C, A) in 4 Slot da 10 giocatori ciascuno,
 * ordinati in modo decrescente in base all'Indice di Appetibilità.
 * Disposizione in colonna singola a sviluppo verticale su mobile con card a larghezza intera.
 */

import { store } from '../store.js';
import { createPlayerCard } from './playerCard.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class AuctionSlotsComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeRole = 'A'; // 'P' | 'D' | 'C' | 'A'
    this.searchQuery = '';
    this.onlyAvailable = false;
    this.onlyFavorites = false;
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('player:updated', () => {
      if (store.activeView === 'auction_slots') {
        this.render();
      }
    });

    store.subscribe('auction:availabilityChanged', () => {
      if (store.activeView === 'auction_slots') {
        this.render();
      }
    });

    store.subscribe('favorite:toggled', () => {
      if (store.activeView === 'auction_slots') {
        this.render();
      }
    });

    store.subscribe('player:selected', () => {
      if (store.activeView === 'auction_slots') {
        this.updateSelectionHighlight();
      }
    });

    store.subscribe('view:changed', (view) => {
      if (view === 'auction_slots') {
        this.render();
      }
    });

    store.subscribe('team:changed', () => {
      if (store.activeView === 'auction_slots') {
        this.render();
      }
    });
  }

  setRole(role) {
    this.activeRole = role;
    this.render();
  }

  setSearchQuery(q) {
    this.searchQuery = q;
    this.render();
  }

  toggleOnlyAvailable() {
    this.onlyAvailable = !this.onlyAvailable;
    this.render();
  }

  toggleOnlyFavorites() {
    this.onlyFavorites = !this.onlyFavorites;
    this.render();
  }

  render() {
    if (!this.container) return;

    const data = store.getAuctionSlotsData(this.activeRole, this.searchQuery, this.onlyAvailable, this.onlyFavorites);

    const rolesMeta = [
      { key: 'A', label: 'Attaccanti', shortLabel: 'ATT' },
      { key: 'C', label: 'Centrocampisti', shortLabel: 'CEN' },
      { key: 'D', label: 'Difensori', shortLabel: 'DIF' },
      { key: 'P', label: 'Portieri', shortLabel: 'POR' }
    ];

    const slotTiersMeta = [
      {
        tier: 1,
        slotKey: 'slot1',
        title: '1º Slot · Top Assoluti',
        subtitle: 'Titolari inamovibili, rigoristi e top player',
        headerClass: 'slot-1-header',
        color: '#f59e0b'
      },
      {
        tier: 2,
        slotKey: 'slot2',
        title: '2º Slot · Ottimi Titolari',
        subtitle: 'Rendimento costante e bonus frequenti',
        headerClass: 'slot-2-header',
        color: '#38bdf8'
      },
      {
        tier: 3,
        slotKey: 'slot3',
        title: '3º Slot · Titolari / Low Cost',
        subtitle: 'Buoni titolari per completare i reparti',
        headerClass: 'slot-3-header',
        color: '#4ade80'
      },
      {
        tier: 4,
        slotKey: 'slot4',
        title: '4º Slot · Scommesse & Jolly',
        subtitle: 'Giovani talenti, jolly e potenziali sorprese',
        headerClass: 'slot-4-header',
        color: '#c084fc'
      }
    ];

    const currentRoleData = data[this.activeRole] || { slot1: [], slot2: [], slot3: [], slot4: [] };
    const selectedPlayer = store.getSelectedPlayer();

    this.container.innerHTML = `
      <div class="auction-slots-page">

        <!-- HEADER EDITORIAL MINIMAL -->
        <header class="topbar auction-header">
          <div>
            <p class="context">Asta 2026/27 · Guida per Slot</p>
            <h1 class="team-title-heading">SLOT ASTA</h1>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="circle-button" id="reset-auction-status-btn" type="button" aria-label="Reset Asta" title="Ripristina tutti i giocatori come Disponibili">
              ↺
            </button>
          </div>
        </header>

        <!-- BARRA DI RICERCA EDITORIALE -->
        <div class="search" role="search" aria-label="Cerca calciatori per l'asta">
          <svg class="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input 
            type="text" 
            class="auction-search-input search-input" 
            placeholder="Cerca calciatore o squadra per l'asta" 
            value="${sanitizeHtml(this.searchQuery)}"
            autocomplete="off"
          />
          ${this.searchQuery ? `<button class="auction-search-clear search-clear" aria-label="Pulisci ricerca">&times;</button>` : ''}
        </div>

        <!-- FILTRI RUOLI & OPZIONI ASTA -->
        <nav class="filters" aria-label="Filtri Ruolo Asta">
          ${rolesMeta.map(r => `
            <button class="filter ${this.activeRole === r.key ? 'active' : ''}" data-role="${r.key}" type="button">
              ${r.shortLabel}
            </button>
          `).join('')}

          <button id="toggle-filter-available-btn" class="filter ${this.onlyAvailable ? 'active' : ''}" type="button" title="Mostra solo i giocatori ancora disponibili per l'asta">
            <i class="fa-solid ${this.onlyAvailable ? 'fa-circle-check' : 'fa-filter'}"></i> ${this.onlyAvailable ? 'Solo Disponibili' : 'Disponibili'}
          </button>

          <button id="toggle-filter-favorites-btn" class="filter ${this.onlyFavorites ? 'active' : ''}" type="button" title="Mostra solo i giocatori preferiti">
            <i class="fa-${this.onlyFavorites ? 'solid' : 'regular'} fa-star"></i> Preferiti
          </button>
        </nav>

        <!-- DISPOSIZIONE VERTICALE DEGLI SLOT -->
        <div class="auction-slots-grid">
          ${slotTiersMeta.map((tier) => {
            const players = currentRoleData[tier.slotKey] || [];
            const availableCount = players.filter(p => p.isAvailable !== false).length;

            return `
              <section class="slot-tier-column" data-slot="${tier.slotKey}">
                <div class="slot-tier-header ${tier.headerClass}">
                  <div class="slot-tier-title-box">
                    <h3>${tier.title}</h3>
                    <div class="slot-tier-desc">${tier.subtitle}</div>
                  </div>
                  <div class="slot-header-right-meta">
                    <span class="slot-count-badge" title="Disponibili / Totale nello Slot">
                      <strong>${availableCount}</strong>/${players.length}
                    </span>
                  </div>
                </div>

                <div class="slot-players-list" id="slot-list-${tier.slotKey}">
                  ${players.length === 0 ? `
                    <div class="slot-empty-state" style="text-align: center; padding: 24px 12px; color: var(--muted); background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-lg);">
                      <p style="font-size: 12px; font-weight: 580;">Nessun calciatore trovato in questo slot</p>
                    </div>
                  ` : ''}
                </div>
              </section>
            `;
          }).join('')}
        </div>

      </div>
    `;

    // Popola le card giocatori Editorial Minimal per ciascun tier
    slotTiersMeta.forEach((tier, tierIdx) => {
      const players = currentRoleData[tier.slotKey] || [];
      const listEl = this.container.querySelector(`#slot-list-${tier.slotKey}`);
      if (!listEl || players.length === 0) return;

      const offset = tierIdx * 10;
      players.forEach((p, idx) => {
        const rankNum = offset + idx + 1;
        const isSelected = selectedPlayer && selectedPlayer.id === p.id;

        const card = createPlayerCard(p, {
          rank: rankNum,
          isSelected,
          isLineup: false
        });

        listEl.appendChild(card);
      });
    });

    this.bindEvents();
  }

  bindEvents() {
    // Ruolo Tabs
    this.container.querySelectorAll('.filters .filter[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setRole(btn.dataset.role);
      });
    });

    // Filtro Preferiti Toggle
    const favFilterBtn = this.container.querySelector('#toggle-filter-favorites-btn');
    favFilterBtn?.addEventListener('click', () => {
      this.toggleOnlyFavorites();
    });

    // Filtro Disponibili Toggle
    const filterBtn = this.container.querySelector('#toggle-filter-available-btn');
    filterBtn?.addEventListener('click', () => {
      this.toggleOnlyAvailable();
    });

    // Reset Asta
    const resetAstaBtn = this.container.querySelector('#reset-auction-status-btn');
    resetAstaBtn?.addEventListener('click', () => {
      if (confirm('Vuoi ripristinare tutti i calciatori come DISPONIBILI per una nuova asta?')) {
        store.resetAllAuctionAvailability();
        notify.success('Tutti i giocatori sono ora DISPONIBILI all\'asta!');
      }
    });

    // Ricerca Testuale Debounced
    const searchInput = this.container.querySelector('.auction-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this.render();
        const input = this.container.querySelector('.auction-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 250);
    });

    const clearBtn = this.container.querySelector('.auction-search-clear');
    clearBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      this.render();
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
}
