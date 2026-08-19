/**
 * Componente per la visualizzazione della Guida Asta per Slot
 * Organizza i calciatori per ciascun ruolo (P, D, C, A) in 4 Slot da 10 giocatori ciascuno,
 * ordinati in modo decrescente in base all'Indice di Appetibilità.
 * Include gestione in tempo reale dello stato asta (Disponibile / Preso).
 */

import { store } from '../store.js';
import { notify } from '../utils/notifications.js';
import { sanitizeHtml } from '../utils/helpers.js';

export class AuctionSlotsComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeRole = 'A'; // 'P' | 'D' | 'C' | 'A' | 'ALL'
    this.searchQuery = '';
    this.onlyAvailable = false;
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

  render() {
    if (!this.container) return;

    const data = store.getAuctionSlotsData(this.activeRole, this.searchQuery, this.onlyAvailable);

    const rolesMeta = [
      { key: 'A', label: 'Attaccanti (A)', icon: 'fa-bolt' },
      { key: 'C', label: 'Centrocampisti (C)', icon: 'fa-gears' },
      { key: 'D', label: 'Difensori (D)', icon: 'fa-shield' },
      { key: 'P', label: 'Portieri (P)', icon: 'fa-hands' }
    ];

    const slotTiersMeta = [
      {
        slotKey: 'slot1',
        title: '1º Slot',
        subtitle: 'Top Assoluti & 1ª Fascia Asta',
        headerClass: 'slot-1-header',
        icon: 'fa-crown',
        color: '#ffb703'
      },
      {
        slotKey: 'slot2',
        title: '2º Slot',
        subtitle: 'Semi-Top & Titolari Inamovibili',
        headerClass: 'slot-2-header',
        icon: 'fa-star',
        color: '#00d2ff'
      },
      {
        slotKey: 'slot3',
        title: '3º Slot',
        subtitle: 'Buoni Titolari & Regolari',
        headerClass: 'slot-3-header',
        icon: 'fa-shield-halved',
        color: '#00ff87'
      },
      {
        slotKey: 'slot4',
        title: '4º Slot',
        subtitle: 'Scommesse, Jolly & Low-Cost',
        headerClass: 'slot-4-header',
        icon: 'fa-dice',
        color: '#c084fc'
      }
    ];

    const currentRoleData = data[this.activeRole] || { slot1: [], slot2: [], slot3: [], slot4: [] };

    this.container.innerHTML = `
      <div class="auction-slots-page">
        
        <!-- Header Banner & Controlli -->
        <div class="auction-header-banner">
          <div class="auction-title-group">
            <h1><i class="fa-solid fa-layer-group"></i> Guida Asta per Slot</h1>
            <p>I migliori 40 giocatori per ruolo suddivisi in 4 Slot da 10 giocatori in base all'Indice di Appetibilità.</p>
          </div>

          <div class="auction-controls-row">
            <!-- Tabs Ruolo -->
            <div class="auction-role-tabs">
              ${rolesMeta.map(r => `
                <button class="auction-role-btn ${this.activeRole === r.key ? 'is-active' : ''}" data-role="${r.key}">
                  <i class="fa-solid ${r.icon}"></i> ${r.label}
                </button>
              `).join('')}
            </div>

            <!-- Filtro Disponibili -->
            <button id="toggle-filter-available-btn" class="auction-filter-btn ${this.onlyAvailable ? 'is-active' : ''}" title="Mostra solo i giocatori ancora disponibili per l'asta">
              <i class="fa-solid ${this.onlyAvailable ? 'fa-eye' : 'fa-filter'}"></i>
              <span>${this.onlyAvailable ? 'Solo Disponibili' : 'Tutti'}</span>
            </button>

            <!-- Reset Stato Asta -->
            <button id="reset-auction-status-btn" class="auction-filter-btn reset-btn" title="Ripristina tutti i giocatori come disponibili per una nuova asta">
              <i class="fa-solid fa-rotate-left"></i>
              <span>Reset Asta</span>
            </button>

            <!-- Ricerca -->
            <div class="auction-search-box">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                class="auction-search-input" 
                placeholder="Cerca giocatore o club..." 
                value="${sanitizeHtml(this.searchQuery)}"
              />
              ${this.searchQuery ? `<button class="auction-search-clear" title="Pulisci ricerca"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
          </div>
        </div>

        <!-- Griglia dei 4 Slot da 10 Giocatori -->
        <div class="auction-slots-grid">
          ${slotTiersMeta.map((tier, tierIdx) => {
            const players = currentRoleData[tier.slotKey] || [];
            const offset = tierIdx * 10;
            const availableCount = players.filter(p => p.isAvailable !== false).length;

            return `
              <div class="slot-tier-column" data-slot="${tier.slotKey}">
                <div class="slot-tier-header ${tier.headerClass}">
                  <div class="slot-tier-title-box">
                    <h3><i class="fa-solid ${tier.icon}"></i> ${tier.title}</h3>
                    <div class="slot-tier-desc">${tier.subtitle}</div>
                  </div>
                  <span class="slot-count-badge" title="Disponibili / Totale nello Slot">
                    <span style="color: var(--accent-neon-green);">${availableCount}</span>/${players.length}
                  </span>
                </div>

                <div class="slot-players-list">
                  ${players.length === 0 ? `
                    <div class="slot-empty-state">
                      <i class="fa-solid fa-user-slash"></i>
                      <p>Nessun giocatore corrisponde ai filtri attivi.</p>
                    </div>
                  ` : players.map((p, idx) => {
                    const rankNum = offset + idx + 1;
                    const fm = p.stats?.fantamedia ? Number(p.stats.fantamedia).toFixed(2) : '-';
                    const mv = p.stats?.mediaVoto ? Number(p.stats.mediaVoto).toFixed(2) : '-';
                    const gol = p.stats?.gol || 0;
                    const ass = p.stats?.assist || 0;
                    const appVal = p.appetibilita !== undefined ? Number(p.appetibilita) : 50;
                    const isAvailable = p.isAvailable !== false;

                    return `
                      <div class="slot-player-card ${!isAvailable ? 'is-taken' : ''}" data-player-id="${p.id}" data-team-id="${p.teamId || ''}">
                        <div class="slot-player-rank">#${rankNum}</div>
                        
                        <div class="slot-player-main">
                          <div class="slot-player-name-row">
                            <span class="slot-team-tag">${sanitizeHtml(p.teamName || 'Serie A')}</span>
                            <span class="slot-player-name" title="${sanitizeHtml(p.name)}">${sanitizeHtml(p.name)}</span>
                            <span class="slot-role-tag-mini">${p.role || p.classicRole}</span>
                            ${!isAvailable ? `<span class="slot-taken-badge">PRESO</span>` : ''}
                          </div>
                          <div class="slot-player-meta-row">
                            <span class="slot-stat-badge" title="Fantamedia">FM: ${fm}</span>
                            <span class="slot-stat-badge" title="Media Voto">MV: ${mv}</span>
                            ${gol > 0 ? `<span class="slot-stat-badge" style="color: #00ff87;">⚽ ${gol}</span>` : ''}
                            ${ass > 0 ? `<span class="slot-stat-badge" style="color: #00d2ff;">🅰️ ${ass}</span>` : ''}
                            ${p.isPenaltyTaker ? `<span class="slot-specialist-icon" title="Rigorista">🎯</span>` : ''}
                            ${p.isFreeKickTaker ? `<span class="slot-specialist-icon" title="Punizioni">📐</span>` : ''}
                            ${p.isCornerTaker ? `<span class="slot-specialist-icon" title="Corner">🚩</span>` : ''}
                          </div>
                        </div>

                        <!-- Modifica Rapida Appetibilità Live -->
                        <div class="slot-appetibilita-box" title="Modifica Indice di Appetibilità (0-100)">
                          <i class="fa-solid fa-fire" style="color: #ff4d4d; font-size: 0.8rem;"></i>
                          <input 
                            type="number" 
                            class="slot-appetibilita-input" 
                            data-player-id="${p.id}" 
                            min="0" 
                            max="100" 
                            value="${appVal}"
                          />
                        </div>

                        <!-- Bottone Disponibilità Asta Rapido -->
                        <button class="slot-availability-btn ${isAvailable ? 'is-available' : 'is-taken'}" data-player-id="${p.id}" title="${isAvailable ? 'Segna come PRESO / ACQUISTATO' : 'Segna come DISPONIBILE'}">
                          <i class="fa-solid ${isAvailable ? 'fa-check' : 'fa-xmark'}"></i>
                          <span>${isAvailable ? 'Disp' : 'Preso'}</span>
                        </button>

                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Ruolo Tabs
    this.container.querySelectorAll('.auction-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setRole(btn.dataset.role);
      });
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

    // Ricerca
    const searchInput = this.container.querySelector('.auction-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      // Debounced live filter
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

    // Live Appetibilità Input Editing
    this.container.querySelectorAll('.slot-appetibilita-input').forEach(input => {
      const updateApp = () => {
        const playerId = input.dataset.playerId;
        const val = Math.min(100, Math.max(0, Number(input.value) || 0));
        store.updatePlayer(playerId, { appetibilita: val });
        notify.success(`Appetibilità aggiornata a ${val}/100!`);
      };

      input.addEventListener('change', (e) => {
        e.stopPropagation();
        updateApp();
      });

      input.addEventListener('click', (e) => e.stopPropagation());
    });

    // Toggle Rapido Disponibilità Asta nel singolo Slot
    this.container.querySelectorAll('.slot-availability-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.dataset.playerId;
        const newState = store.togglePlayerAvailability(playerId);
        notify.info(newState ? 'Giocatore segnato come DISPONIBILE' : 'Giocatore segnato come PRESO');
      });
    });

    // Click su card giocatore -> Seleziona
    this.container.querySelectorAll('.slot-player-card').forEach(card => {
      card.addEventListener('click', () => {
        const playerId = card.dataset.playerId;
        const teamId = card.dataset.teamId;
        if (teamId) {
          store.setTeam(teamId);
        }
        store.selectPlayer(playerId);
      });
    });
  }
}
