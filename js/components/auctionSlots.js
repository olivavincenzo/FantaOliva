/**
 * Componente per la visualizzazione della Guida Asta per Slot
 * Organizza i calciatori per ciascun ruolo (P, D, C, A) in 4 Slot da 10 giocatori ciascuno,
 * ordinati in modo decrescente in base all'Indice di Appetibilità.
 * Include gestione in tempo reale dello stato asta (Disponibile / Preso).
 */

import { store } from '../store.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class AuctionSlotsComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeRole = 'A'; // 'P' | 'D' | 'C' | 'A' | 'ALL'
    this.searchQuery = '';
    this.onlyAvailable = false;
    // Su mobile: Slot 1 aperto di default, gli altri collassati
    this.collapsedSlots = {
      slot_1: false,
      slot_2: true,
      slot_3: true,
      slot_4: true
    };
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
      { key: 'A', label: 'Attaccanti', shortLabel: 'A', icon: 'fa-bolt', pillClass: 'role-pill-a' },
      { key: 'C', label: 'Centrocampisti', shortLabel: 'C', icon: 'fa-gears', pillClass: 'role-pill-c' },
      { key: 'D', label: 'Difensori', shortLabel: 'D', icon: 'fa-shield', pillClass: 'role-pill-d' },
      { key: 'P', label: 'Portieri', shortLabel: 'P', icon: 'fa-hands', pillClass: 'role-pill-p' }
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

        <!-- BARRA STRUMENTI & FILTRI SLOT ASTA (Fluida e Responsive) -->
        <div class="auction-toolbar-card">
          <div class="auction-toolbar-row">

            <!-- Ricerca Testuale Ampia -->
            <div class="auction-search-box">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                class="auction-search-input" 
                placeholder="Cerca calciatore o club..." 
                value="${sanitizeHtml(this.searchQuery)}"
              />
              ${this.searchQuery ? `<button class="auction-search-clear" title="Pulisci ricerca"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>

            <!-- Tabs Ruolo Rapido -->
            <div class="auction-role-tabs" aria-label="Filtro per Ruolo Asta">
              ${rolesMeta.map(r => `
                <button class="auction-role-btn ${r.pillClass} ${this.activeRole === r.key ? 'is-active' : ''}" data-role="${r.key}" title="${r.label}">
                  <i class="fa-solid ${r.icon}"></i>
                  <span class="role-label-desktop">${r.label}</span>
                  <span class="role-label-mobile">${r.shortLabel}</span>
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

          </div>
        </div>

        <!-- Griglia dei 4 Slot da 10 Giocatori (con supporto Accordion su mobile) -->
        <div class="auction-slots-grid">
          ${slotTiersMeta.map((tier, tierIdx) => {
      const players = currentRoleData[tier.slotKey] || [];
      const offset = tierIdx * 10;
      const availableCount = players.filter(p => p.isAvailable !== false).length;
      const isCollapsed = Boolean(this.collapsedSlots?.[tier.slotKey]);

      return `
              <div class="slot-tier-column ${isCollapsed ? 'is-collapsed' : ''}" data-slot="${tier.slotKey}">
                <div class="slot-tier-header ${tier.headerClass}">
                  <div class="slot-tier-title-box">
                    <h3><i class="fa-solid ${tier.icon}"></i> ${tier.title}</h3>
                    <div class="slot-tier-desc">${tier.subtitle}</div>
                  </div>
                  <div class="slot-header-right-meta">
                    <span class="slot-count-badge" title="Disponibili / Totale nello Slot">
                      <span style="color: var(--accent-neon-green);">${availableCount}</span>/${players.length}
                    </span>
                    <i class="fa-solid fa-chevron-down slot-accordion-arrow"></i>
                  </div>
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
        const titolarita = p.stats?.titolarita ?? p.titolaritaPerc ?? 50;
        const titClass = getTitolaritaClass(titolarita);
        const isAvailable = p.isAvailable !== false;
        const qtA = p.quotazioni?.qtA ?? '-';
        const fvm = p.quotazioni?.fvm ?? '-';
        const mantraRole = p.mantraRole || '';

        return `
                      <div class="slot-player-card ${!isAvailable ? 'is-taken' : ''}" data-player-id="${p.id}" data-team-id="${p.teamId || ''}" title="${sanitizeHtml(p.name)} (${sanitizeHtml(p.teamName || 'Serie A')}) - Doppio click per aprire la Lavagna Tattica">
                        
                        <!-- RIGA 1: Posizione Slot, Club, Nome, Ruolo & Icona Disponibilità Asta -->
                        <div class="slot-row-1-identity">
                          <span class="slot-player-rank">#${rankNum}</span>
                          <span class="slot-team-tag">${sanitizeHtml(p.teamName || 'Serie A')}</span>
                          <span class="slot-player-name" title="${sanitizeHtml(p.name)}">${sanitizeHtml(p.name)}</span>
                          
                          <div class="slot-role-and-actions">
                            <span class="slot-role-tag-mini" title="${mantraRole ? `Ruolo Mantra: ${mantraRole}` : ''}">${p.role || p.classicRole}${mantraRole ? ` · ${mantraRole}` : ''}</span>
                            ${!isAvailable ? `<span class="slot-taken-badge">PRESO</span>` : ''}
                            <button class="slot-availability-dot-btn ${isAvailable ? 'is-available' : 'is-taken'}" data-player-id="${p.id}" title="${isAvailable ? 'Disponibile all\'asta (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}">
                              <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                            </button>
                          </div>
                        </div>

                        <!-- RIGA 2: Indice di Appetibilità & Indice di Titolarità -->
                        <div class="slot-row-2-indices">
                          <div class="slot-appetibilita-box" title="Modifica Indice Appetibilità (0-100)">
                            <i class="fa-solid fa-fire" style="color: #ff4d4d; font-size: 0.85rem;"></i>
                            <input 
                              type="number" 
                              class="slot-appetibilita-input" 
                              data-player-id="${p.id}" 
                              min="0" 
                              max="100" 
                              value="${appVal}"
                            />
                            <span class="index-suffix">/100</span>
                          </div>

                          <div class="slot-titolarita-box">
                            <span class="slot-tit-badge ${titClass}" title="Probabilità di Titolarità in Serie A">${titolarita}% Tit</span>
                          </div>
                        </div>

                        <!-- RIGA 3: Qt, FVM, FM, MV, Gol, Assist, Rigorista, Punizioni & Corner -->
                        <div class="slot-row-3-stats">
                          ${qtA !== '-' ? `<span class="slot-stat-pill" title="Quotazione Attuale 2026/27">Qt: <strong>${qtA}</strong></span>` : ''}
                          ${fvm !== '-' ? `<span class="slot-stat-pill" title="FantaValore di Mercato">FVM: <strong>${fvm}</strong></span>` : ''}
                          <span class="slot-stat-pill" title="Fantamedia">FM: <strong>${fm}</strong></span>
                          <span class="slot-stat-pill" title="Media Voto">MV: <strong>${mv}</strong></span>
                          ${gol > 0 ? `<span class="slot-stat-pill stat-gol" title="Gol segnati">⚽ ${gol}</span>` : ''}
                          ${ass > 0 ? `<span class="slot-stat-pill stat-ass" title="Assist forniti">🅰️ ${ass}</span>` : ''}
                          ${p.isPenaltyTaker ? `<span class="slot-specialist-chip" title="1º Rigorista">🎯 Rigori</span>` : ''}
                          ${p.isFreeKickTaker ? `<span class="slot-specialist-chip" title="Tiratore Punizioni">📐 Punizioni</span>` : ''}
                          ${p.isCornerTaker ? `<span class="slot-specialist-chip" title="Tiratore Corner">🚩 Corner</span>` : ''}
                        </div>

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

    // Toggle Rapido Disponibilità Asta nel singolo Slot (Icona accanto al ruolo)
    this.container.querySelectorAll('.slot-availability-dot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.dataset.playerId;
        const newState = store.togglePlayerAvailability(playerId);
        notify.info(newState ? 'Giocatore segnato come DISPONIBILE' : 'Giocatore segnato come PRESO');
      });
    });

    // Accordion Toggle: Cliccando sull'header dello slot espandi/collassi la lista su mobile
    this.container.querySelectorAll('.slot-tier-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        const column = header.closest('.slot-tier-column');
        if (column) {
          const isNowCollapsed = column.classList.toggle('is-collapsed');
          const slotKey = column.dataset.slot;
          if (slotKey) {
            this.collapsedSlots[slotKey] = isNowCollapsed;
          }
        }
      });
    });

    // Click e Doppio Click / Doppio Tocco su card giocatore nello slot asta
    this.container.querySelectorAll('.slot-player-card').forEach(card => {
      let lastTap = 0;

      const handleGoToTacticalWithInspector = () => {
        const playerId = card.dataset.playerId;
        const teamId = card.dataset.teamId;

        // 1. Imposta la squadra del calciatore
        if (teamId && teamId !== store.currentTeamId) {
          store.setTeam(teamId);
        }

        // 2. Seleziona il calciatore (apre la scheda)
        store.selectPlayer(playerId);

        // 3. Passa alla vista 'tactical' (Campo)
        store.setView('tactical');

        // 4. Desktop: apri sidebar se collassata
        if (document.body.classList.contains('right-sidebar-collapsed')) {
          document.body.classList.remove('right-sidebar-collapsed');
        }

        // 5. Mobile: apri il drawer della scheda laterale e attiva il backdrop
        const sidebarInspector = document.querySelector('#sidebar-inspector');
        const sidebarTeams = document.querySelector('#sidebar-teams');
        const backdrop = document.querySelector('#mobile-drawer-backdrop');
        const toggleInspectorBtn = document.querySelector('#mobile-inspector-btn');
        const toggleFieldBtn = document.querySelector('#mobile-field-btn');

        if (window.innerWidth <= 900) {
          sidebarInspector?.classList.add('mobile-open');
          sidebarTeams?.classList.remove('mobile-open');
          backdrop?.classList.remove('hidden');
          if (toggleInspectorBtn) toggleInspectorBtn.classList.add('active');
          if (toggleFieldBtn) toggleFieldBtn.classList.remove('active');
        }

        const player = store.getPlayer(playerId);
        const team = store.getTeam(teamId);
        notify.info(`Aperta lavagna tattica (${team ? team.name : ''}) con la scheda di ${player ? player.name : ''}`);
      };

      // Native dblclick per mouse Desktop
      card.addEventListener('dblclick', (e) => {
        if (e.target.closest('.slot-availability-dot-btn') || e.target.closest('.slot-appetibilita-input')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleGoToTacticalWithInspector();
      });

      // Click e doppio tocco per Mobile & Desktop
      card.addEventListener('click', (e) => {
        if (e.target.closest('.slot-availability-dot-btn') || e.target.closest('.slot-appetibilita-input')) {
          return;
        }
        const now = Date.now();
        const timesince = now - lastTap;

        if (timesince < 350 && timesince > 0) {
          // Doppio click / tocco rapido -> Porta al campo con la scheda aperta
          e.stopPropagation();
          handleGoToTacticalWithInspector();
          lastTap = 0;
        } else {
          // Singolo click / tocco -> Seleziona giocatore e squadra
          lastTap = now;
          const playerId = card.dataset.playerId;
          const teamId = card.dataset.teamId;
          if (teamId && teamId !== store.currentTeamId) {
            store.setTeam(teamId);
          }
          store.selectPlayer(playerId);
        }
      });
    });
  }
}
