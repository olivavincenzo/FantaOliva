/**
 * Componente Listone Completo Calciatori Serie A (Editorial Minimal Design)
 * Permette la consultazione, ricerca, filtraggio per ruolo/squadra/disponibilità e
 * ordinamento multi-criterio di tutti i giocatori del campionato tramite le card Editorial Minimal.
 */

import { store } from '../store.js';
import { createPlayerCard } from './playerCard.js';
import { sanitizeHtml } from '../utils/helpers.js';

export class PlayersListoneComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchQuery = '';
    this.activeRole = 'ALL'; // 'ALL' | 'P' | 'D' | 'C' | 'A'
    this.selectedTeam = 'ALL';
    this.availabilityFilter = 'ALL'; // 'ALL' | 'AVAILABLE' | 'TAKEN' | 'FAVORITES'
    this.onlyFavorites = false;
    this.onlyMyTeam = false;
    this.leagueFilter = 'ALL'; // 'ALL' | 'FREE' | 'MYTEAM' | 'VINCENZO' | 'LUIGI' | ...
    this.sortBy = 'strategy_tier'; // 'strategy_tier' | 'fantamedia' | 'mediaVoto' | 'qtA' | 'fvm' | 'gol' | 'assist' | 'presenze' | 'name' | 'teamName'
    this.sortOrder = 'desc'; // 'asc' | 'desc'
    this.gridColumns = Number((typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_listone_cols') : null) || 2);
    this._searchTimer = null;
    this.renderLimit = 40; // Progressive loading batch size
    this._scrollListenerBound = false;
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('player:updated', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('favorite:toggled', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('team:changed', () => {
      if (store.activeView === 'listone' && this.selectedTeam !== 'ALL') {
        this.render();
      }
    });

    store.subscribe('view:changed', (view) => {
      if (view === 'listone') {
        this.render();
      }
    });

    store.subscribe('auction:availabilityChanged', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('strategy:changed', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('strategy:updated', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('strategy:playerAssigned', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('myteam:updated', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('league:updated', () => {
      if (store.activeView === 'listone') {
        this.render();
      }
    });

    store.subscribe('player:selected', () => {
      if (store.activeView === 'listone') {
        this.updateSelectionHighlight();
      }
    });
  }

  getFilteredAndSortedPlayers() {
    const all = store.getAllPlayersFlat();

    // Helper per categoria ruolo
    const getRoleCategory = (p) => store.getRoleCategory(p);

    // 1. Filtro Ruolo
    let filtered = all.filter(p => {
      if (this.activeRole === 'ALL') return true;
      return getRoleCategory(p) === this.activeRole;
    });

    // 2. Filtro Squadra
    if (this.selectedTeam !== 'ALL') {
      filtered = filtered.filter(p => p.teamId === this.selectedTeam);
    }

    // 3. Filtro Disponibilità Asta & Preferiti
    if (this.availabilityFilter === 'AVAILABLE') {
      filtered = filtered.filter(p => store.isPlayerAvailable(p));
    } else if (this.availabilityFilter === 'TAKEN') {
      filtered = filtered.filter(p => !store.isPlayerAvailable(p));
    } else if (this.availabilityFilter === 'FAVORITES' || this.onlyFavorites) {
      filtered = filtered.filter(p => p.isFavorite || store.isPlayerFavorite(p.id));
    }

    // Filtro La Mia Rosa
    if (this.onlyMyTeam) {
      filtered = filtered.filter(p => store.isPlayerInMyTeam(p.id) || store.getPlayerLeagueOwner(p)?.isMyTeam);
    }

    // Filtro FantaLega (Svincolati o Squadra Specifica)
    if (this.leagueFilter === 'FREE') {
      filtered = filtered.filter(p => !store.isPlayerOwnedInLeague(p));
    } else if (this.leagueFilter === 'MYTEAM') {
      filtered = filtered.filter(p => store.isPlayerInMyTeam(p.id) || store.getPlayerLeagueOwner(p)?.isMyTeam);
    } else if (this.leagueFilter && this.leagueFilter !== 'ALL') {
      filtered = filtered.filter(p => {
        const owner = store.getPlayerLeagueOwner(p);
        return owner && owner.teamName.toUpperCase() === this.leagueFilter.toUpperCase();
      });
    }

    // 4. Ricerca Testuale
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = (p.name || p.displayName || '').toLowerCase().includes(q);
        const teamMatch = (p.teamName || '').toLowerCase().includes(q);
        const roleMatch = (p.role || '').toLowerCase().includes(q);
        return nameMatch || teamMatch || roleMatch;
      });
    }

    // 5. Ordinamento Multi-Criterio
    filtered.sort((a, b) => {
      let valA, valB;

      if (this.sortBy === 'strategy_tier') {
        const tierA = store.getPlayerTier(a);
        const tierB = store.getPlayerTier(b);
        const rankA = tierA ? tierA.order : 9999;
        const rankB = tierB ? tierB.order : 9999;

        if (rankA !== rankB) {
          return this.sortOrder === 'asc' ? rankB - rankA : rankA - rankB;
        }

        // Secondary tiebreaker: fantamedia decrescente, poi fvm, poi presenze
        const fmA = Number(a.stats?.fantamedia || a.fantamedia || 0);
        const fmB = Number(b.stats?.fantamedia || b.fantamedia || 0);
        if (fmB !== fmA) return fmB - fmA;

        const fvmA = Number(a.quotazioni?.fvm || 0);
        const fvmB = Number(b.quotazioni?.fvm || 0);
        if (fvmB !== fvmA) return fvmB - fvmA;

        const presA = Number(a.stats?.presenze || 0);
        const presB = Number(b.stats?.presenze || 0);
        return presB - presA;
      }

      switch (this.sortBy) {
        case 'name':
          valA = (a.name || a.displayName || '').toLowerCase();
          valB = (b.name || b.displayName || '').toLowerCase();
          return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

        case 'teamName':
          valA = (a.teamName || '').toLowerCase();
          valB = (b.teamName || '').toLowerCase();
          return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

        case 'fantamedia':
          valA = Number(a.stats?.fantamedia || a.fantamedia || 0);
          valB = Number(b.stats?.fantamedia || b.fantamedia || 0);
          break;

        case 'mediaVoto':
          valA = Number(a.stats?.mediaVoto || 0);
          valB = Number(b.stats?.mediaVoto || 0);
          break;

        case 'qtA':
          valA = Number(a.quotazioni?.qtA || 0);
          valB = Number(b.quotazioni?.qtA || 0);
          break;

        case 'fvm':
          valA = Number(a.quotazioni?.fvm || 0);
          valB = Number(b.quotazioni?.fvm || 0);
          break;

        case 'gol':
          valA = Number(a.stats?.gol || 0);
          valB = Number(b.stats?.gol || 0);
          break;

        case 'assist':
          valA = Number(a.stats?.assist || 0);
          valB = Number(b.stats?.assist || 0);
          break;

        case 'presenze':
          valA = Number(a.stats?.presenze || a.stats?.pv || 0);
          valB = Number(b.stats?.presenze || b.stats?.pv || 0);
          break;

        case 'titolarita_index': {
          const indA = store.getPlayerIndices(a);
          const indB = store.getPlayerIndices(b);
          valA = Number(indA.titIndex || 3);
          valB = Number(indB.titIndex || 3);
          break;
        }

        case 'affidabilita_index': {
          const indA = store.getPlayerIndices(a);
          const indB = store.getPlayerIndices(b);
          valA = Number(indA.affIndex || 3);
          valB = Number(indB.affIndex || 3);
          break;
        }

        case 'integrita_index': {
          const indA = store.getPlayerIndices(a);
          const indB = store.getPlayerIndices(b);
          valA = Number(indA.infIndex || 3);
          valB = Number(indB.infIndex || 3);
          break;
        }

        case 'titolarita':
          valA = Number(a.stats?.titolarita ?? a.titolaritaPerc ?? 50);
          valB = Number(b.stats?.titolarita ?? b.titolaritaPerc ?? 50);
          break;

        default:
          valA = Number(a.stats?.fantamedia || a.fantamedia || 0);
          valB = Number(b.stats?.fantamedia || b.fantamedia || 0);
      }

      if (valB !== valA) {
        return this.sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // Tiebreaker alfabetico
      return (a.name || '').localeCompare(b.name || '');
    });

    return filtered;
  }

  render() {
    if (!this.container) return;

    const filtered = this.getFilteredAndSortedPlayers();
    const total = store.getAllPlayersFlat().length;
    const teams = store.getAllTeams();
    const isOnlyAvail = this.availabilityFilter === 'AVAILABLE';
    const activeStrat = store.getActiveStrategy();

    const sortOptions = [
      { key: 'strategy_tier', label: `👑 Gerarchia (${activeStrat?.name || 'Strategia'})` },
      { key: 'titolarita_index', label: '🟢 Titolarità (1-5)' },
      { key: 'affidabilita_index', label: '🛡️ Affidabilità (1-5)' },
      { key: 'integrita_index', label: '🩺 Integrità (1-5)' },
      { key: 'qtA', label: 'Quotazione Classic (QtA)' },
      { key: 'fvm', label: 'FVM (Fantavoto di Mercato)' },
      { key: 'fantamedia', label: 'FM Fantamedia' },
      { key: 'mediaVoto', label: 'MV Media Voto' },
      { key: 'gol', label: '⚽ Gol Segnati' },
      { key: 'assist', label: '🅰 Assist' },
      { key: 'name', label: 'Nome Calciatore' }
    ];

    this.container.innerHTML = `
      <div class="listone-page-container">

        <!-- HEADER LISTONE EDITORIAL MINIMAL -->
        <header class="topbar listone-header">
          <div>
            <p class="context">Asta 2026/27 · Serie A</p>
            <h1 class="team-title-heading">LISTONE COMPLETO</h1>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="listone-total-badge" title="Calciatori visualizzati / Totale">
              <strong>${filtered.length}</strong>/${total}
            </span>
          </div>
        </header>

        <!-- BARRA DI RICERCA EDITORIALE CON ICONA FILTRI MOBILE -->
        <div class="search-with-mobile-filter">
          <div class="search" role="search" aria-label="Cerca nel listone">
            <svg class="search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input 
              type="text" 
              class="listone-search-input search-input" 
              placeholder="Cerca calciatore o squadra nel listone" 
              value="${sanitizeHtml(this.searchQuery)}"
              autocomplete="off"
            />
            ${this.searchQuery ? `<button class="listone-search-clear search-clear" aria-label="Pulisci ricerca">&times;</button>` : ''}
          </div>

          <!-- Singola icona filtri per modalità Mobile -->
          <button type="button" class="circle-button pitch-mobile-filter-btn" id="listone-open-filters-modal-btn" aria-label="Filtri" title="Filtri">
            <i class="fa-solid fa-sliders"></i>
            <span class="filter-indicator-dot ${this.activeRole !== 'ALL' || this.selectedTeam !== 'ALL' || this.leagueFilter !== 'ALL' || this.availabilityFilter !== 'ALL' || this.onlyFavorites ? '' : 'hidden'}" id="listone-filter-active-dot"></span>
          </button>
        </div>

        <!-- FILTRI RUOLI, SQUADRE & ORDINAMENTO A SCORRIMENTO ORIZZONTALE (DESKTOP) -->
        <nav class="filters" aria-label="Filtri Listone">
          <button class="filter ${this.activeRole === 'ALL' ? 'active' : ''}" data-role="ALL" type="button">Tutti · ${filtered.length}</button>
          <button class="filter ${this.activeRole === 'A' ? 'active' : ''}" data-role="A" type="button">ATT</button>
          <button class="filter ${this.activeRole === 'C' ? 'active' : ''}" data-role="C" type="button">CEN</button>
          <button class="filter ${this.activeRole === 'D' ? 'active' : ''}" data-role="D" type="button">DIF</button>
          <button class="filter ${this.activeRole === 'P' ? 'active' : ''}" data-role="P" type="button">POR</button>

          <!-- Dropdown Squadre FantaLega & Svincolati -->
          <div class="listone-select-pill-wrap" title="Filtra per Rosa FantaLega o Svincolati">
            <select class="listone-league-select filter filter-select" id="listone-league-select" aria-label="Filtro FantaLega">
              <option value="ALL" ${this.leagueFilter === 'ALL' ? 'selected' : ''}>🏆 Tutte le Rose Lega</option>
              <option value="FREE" ${this.leagueFilter === 'FREE' ? 'selected' : ''}>🟢 Solo Svincolati / Liberi</option>
              <option value="MYTEAM" ${this.leagueFilter === 'MYTEAM' ? 'selected' : ''}>⭐ Vincenzo (Mia Rosa)</option>
              ${store.getLeagueTeams().filter(t => t.name.toUpperCase() !== 'VINCENZO').map(t => `
                <option value="${t.name}" ${this.leagueFilter === t.name ? 'selected' : ''}>🛡️ ${t.name} (${t.roster?.length || 0})</option>
              `).join('')}
            </select>
            <span class="select-arrow">▾</span>
          </div>

          <!-- Dropdown Squadre Serie A -->
          <div class="listone-select-pill-wrap" title="Filtra per Club Serie A">
            <select class="listone-team-select filter filter-select" id="listone-team-select" aria-label="Filtro Squadra">
              <option value="ALL" ${this.selectedTeam === 'ALL' ? 'selected' : ''}>Tutti i Club (${teams.length})</option>
              ${teams.map(t => `<option value="${t.id}" ${this.selectedTeam === t.id ? 'selected' : ''}>${sanitizeHtml(t.name)}</option>`).join('')}
            </select>
            <span class="select-arrow">▾</span>
          </div>

          <!-- Dropdown Ordinamento -->
          <div class="listone-select-pill-wrap" title="Ordina Calciatori">
            <select class="listone-sort-select filter filter-select" id="listone-sort-select" aria-label="Ordina Calciatori">
              ${sortOptions.map(s => `<option value="${s.key}" ${this.sortBy === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <span class="select-arrow">▾</span>
          </div>

          <!-- Pulsante Strategia Attiva -->
          <button class="filter" type="button" data-action="open-strategy-modal" title="Configura gerarchia e fasce della strategia attiva">
            <i class="fa-solid fa-chess-knight"></i> ${sanitizeHtml(activeStrat?.name || 'Strategia')}
          </button>

          <!-- Toggle Solo Disponibili -->
          <button id="toggle-listone-available-btn" class="filter ${isOnlyAvail ? 'active' : ''}" type="button" title="Mostra solo i giocatori disponibili per l'asta">
            <i class="fa-solid ${isOnlyAvail ? 'fa-circle-check' : 'fa-filter'}"></i> ${isOnlyAvail ? 'Solo Disponibili' : 'Disponibili'}
          </button>

          <!-- Toggle Preferiti -->
          <button id="toggle-listone-fav-btn" class="filter ${this.onlyFavorites ? 'active' : ''}" type="button" title="Mostra solo preferiti">
            <i class="fa-${this.onlyFavorites ? 'solid' : 'regular'} fa-star"></i> Preferiti
          </button>

          <!-- Disposizione colonne lista -->
          <div class="section-columns-switcher" title="Disposizione colonne listone" style="margin-left: auto;">
            <span class="cols-label">Colonne</span>
            <div class="cols-button-group">
              <button type="button" class="col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
              <button type="button" class="col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
              <button type="button" class="col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
              <button type="button" class="col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
            </div>
          </div>
        </nav>

        <!-- LISTA CARDS CALCIATORI EDITORIAL MINIMAL -->
        <div class="listone-cards-container" id="listone-cards-container">
          <div class="listone-cards-grid cols-${this.gridColumns}" id="listone-cards-grid"></div>

          ${filtered.length > this.renderLimit ? `
            <div class="listone-load-more-box" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 0 20px; flex-wrap: wrap;">
              <button id="listone-load-more-btn" class="filter" type="button" style="height: 36px; padding: 0 18px; font-size: 11px;">
                <i class="fa-solid fa-plus"></i> Mostra altri calciatori (${filtered.length - this.renderLimit} rimanenti)
              </button>
              <button id="listone-show-all-btn" class="filter active" type="button" style="height: 36px; padding: 0 18px; font-size: 11px;" title="Mostra tutti i ${filtered.length} calciatori">
                <i class="fa-solid fa-list-check"></i> Mostra tutti (${filtered.length})
              </button>
            </div>
          ` : ''}
        </div>

        <!-- MODALE FILTRI LISTONE (MOBILE) -->
        <div class="modal-backdrop hidden" id="listone-filters-modal" role="dialog" aria-modal="true" aria-labelledby="listone-filters-title">
          <div class="fanta-modal modal-sm">
            <div class="modal-header">
              <div class="modal-title-group">
                <i class="fa-solid fa-sliders modal-title-icon" style="color: var(--ink);"></i>
                <h3 id="listone-filters-title">Filtri Listone & Asta</h3>
              </div>
              <button class="modal-close-btn" id="close-listone-filters-btn" aria-label="Chiudi filtri">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="modal-body" style="padding: 18px 16px; display: flex; flex-direction: column; gap: 16px;">
              <!-- Sezione 1: Ruolo -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Ruolo</label>
                <div class="modal-filter-pills" style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button type="button" class="filter modal-listone-role-btn ${this.activeRole === 'ALL' ? 'active' : ''}" data-role="ALL">Tutti</button>
                  <button type="button" class="filter modal-listone-role-btn ${this.activeRole === 'A' ? 'active' : ''}" data-role="A">ATT</button>
                  <button type="button" class="filter modal-listone-role-btn ${this.activeRole === 'C' ? 'active' : ''}" data-role="C">CEN</button>
                  <button type="button" class="filter modal-listone-role-btn ${this.activeRole === 'D' ? 'active' : ''}" data-role="D">DIF</button>
                  <button type="button" class="filter modal-listone-role-btn ${this.activeRole === 'P' ? 'active' : ''}" data-role="P">POR</button>
                </div>
              </div>

              <!-- Sezione 2: FantaLega & Svincolati -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Stato FantaLega</label>
                <div class="listone-select-pill-wrap" style="width: 100%;">
                  <select class="filter filter-select" id="modal-listone-league-select" style="width: 100%;">
                    <option value="ALL" ${this.leagueFilter === 'ALL' ? 'selected' : ''}>🏆 Tutte le Rose Lega</option>
                    <option value="FREE" ${this.leagueFilter === 'FREE' ? 'selected' : ''}>🟢 Solo Svincolati / Liberi</option>
                    <option value="MYTEAM" ${this.leagueFilter === 'MYTEAM' ? 'selected' : ''}>⭐ Vincenzo (Mia Rosa)</option>
                    ${store.getLeagueTeams().filter(t => t.name.toUpperCase() !== 'VINCENZO').map(t => `
                      <option value="${t.name}" ${this.leagueFilter === t.name ? 'selected' : ''}>🛡️ ${t.name} (${t.roster?.length || 0})</option>
                    `).join('')}
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <!-- Sezione 3: Club Serie A -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Club Serie A</label>
                <div class="listone-select-pill-wrap" style="width: 100%;">
                  <select class="filter filter-select" id="modal-listone-team-select" style="width: 100%;">
                    <option value="ALL" ${this.selectedTeam === 'ALL' ? 'selected' : ''}>Tutti i Club (${teams.length})</option>
                    ${teams.map(t => `<option value="${t.id}" ${this.selectedTeam === t.id ? 'selected' : ''}>${sanitizeHtml(t.name)}</option>`).join('')}
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <!-- Sezione 4: Ordinamento -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Ordina Per</label>
                <div class="listone-select-pill-wrap" style="width: 100%;">
                  <select class="filter filter-select" id="modal-listone-sort-select" style="width: 100%;">
                    ${sortOptions.map(s => `<option value="${s.key}" ${this.sortBy === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <!-- Sezione 5: Toggle Rapidi (Disponibili & Preferiti) -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Stato Asta</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="filter ${isOnlyAvail ? 'active' : ''}" id="modal-toggle-listone-available-btn">
                    <i class="fa-solid ${isOnlyAvail ? 'fa-circle-check' : 'fa-filter'}"></i> ${isOnlyAvail ? 'Solo Disponibili' : 'Tutti i Giocatori'}
                  </button>
                  <button type="button" class="filter ${this.onlyFavorites ? 'active' : ''}" id="modal-toggle-listone-fav-btn">
                    <i class="fa-${this.onlyFavorites ? 'solid' : 'regular'} fa-star"></i> Solo Preferiti
                  </button>
                </div>
              </div>

              <!-- Sezione 6: Disposizione Colonne -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Disposizione Colonne</label>
                <div class="cols-button-group" style="display: inline-flex;">
                  <button type="button" class="col-btn modal-listone-col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
                  <button type="button" class="col-btn modal-listone-col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
                  <button type="button" class="col-btn modal-listone-col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
                  <button type="button" class="col-btn modal-listone-col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="fanta-btn secondary-btn" id="reset-listone-filters-btn" type="button">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
              <button class="fanta-btn primary-btn" id="apply-listone-filters-btn" type="button">
                <i class="fa-solid fa-check"></i> Applica
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    // Renderizza le card fino al renderLimit
    const gridEl = this.container.querySelector('#listone-cards-grid');
    const selectedPlayer = store.getSelectedPlayer();

    if (gridEl) {
      if (filtered.length === 0) {
        gridEl.innerHTML = `
          <div style="text-align: center; padding: 36px 14px; color: var(--muted); width: 100%;">
            <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
            <p style="font-size: 13px; font-weight: 580;">Nessun calciatore trovato per i filtri selezionati</p>
          </div>
        `;
      } else {
        const visiblePlayers = filtered.slice(0, this.renderLimit);
        visiblePlayers.forEach((p, idx) => {
          const isSelected = selectedPlayer && selectedPlayer.id === p.id;
          const card = createPlayerCard(p, {
            rank: idx + 1,
            isSelected,
            isLineup: false,
            showTeam: true
          });
          gridEl.appendChild(card);
        });
      }
    }

    this.bindEvents();
  }

  bindEvents() {
    // Selettore Colonne 1 2 3 4
    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cols = Number(btn.dataset.cols) || 2;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_listone_cols', cols);
        }
        this.render();
      });
    });

    // Modale Filtri Mobile
    const openModalBtn = this.container.querySelector('#listone-open-filters-modal-btn');
    const filtersModal = this.container.querySelector('#listone-filters-modal');
    const closeModalBtn = this.container.querySelector('#close-listone-filters-btn');
    const applyModalBtn = this.container.querySelector('#apply-listone-filters-btn');
    const resetModalBtn = this.container.querySelector('#reset-listone-filters-btn');

    openModalBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      filtersModal?.classList.remove('hidden');
    });

    const closeFiltersModal = () => {
      filtersModal?.classList.add('hidden');
    };

    closeModalBtn?.addEventListener('click', closeFiltersModal);
    applyModalBtn?.addEventListener('click', closeFiltersModal);
    filtersModal?.addEventListener('click', (e) => {
      if (e.target === filtersModal) closeFiltersModal();
    });

    // Filtro Ruoli nella Modale Mobile
    this.container.querySelectorAll('.modal-listone-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeRole = btn.dataset.role;
        this.renderLimit = 40;
        this.render();
      });
    });

    // Dropdown FantaLega nella Modale
    const modalLeagueSelect = this.container.querySelector('#modal-listone-league-select');
    modalLeagueSelect?.addEventListener('change', (e) => {
      this.leagueFilter = e.target.value;
      this.renderLimit = 40;
      this.render();
    });

    // Dropdown Club nella Modale
    const modalTeamSelect = this.container.querySelector('#modal-listone-team-select');
    modalTeamSelect?.addEventListener('change', (e) => {
      this.selectedTeam = e.target.value;
      this.renderLimit = 40;
      this.render();
    });

    // Dropdown Sort nella Modale
    const modalSortSelect = this.container.querySelector('#modal-listone-sort-select');
    modalSortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.sortOrder = (e.target.value === 'name' || e.target.value === 'teamName') ? 'asc' : 'desc';
      this.renderLimit = 40;
      this.render();
    });

    // Toggle Disponibili nella Modale
    const modalAvailBtn = this.container.querySelector('#modal-toggle-listone-available-btn');
    modalAvailBtn?.addEventListener('click', () => {
      this.availabilityFilter = this.availabilityFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE';
      this.renderLimit = 40;
      this.render();
    });

    // Toggle Preferiti nella Modale
    const modalFavBtn = this.container.querySelector('#modal-toggle-listone-fav-btn');
    modalFavBtn?.addEventListener('click', () => {
      this.onlyFavorites = !this.onlyFavorites;
      this.renderLimit = 40;
      this.render();
    });

    // Reset Filtri nella Modale
    resetModalBtn?.addEventListener('click', () => {
      this.activeRole = 'ALL';
      this.selectedTeam = 'ALL';
      this.leagueFilter = 'ALL';
      this.availabilityFilter = 'ALL';
      this.onlyFavorites = false;
      this.sortBy = 'strategy_tier';
      this.sortOrder = 'asc';
      this.gridColumns = 2;
      this.renderLimit = 40;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fantaoliva_listone_cols', 2);
      }
      this.render();
    });

    // Ruolo Tabs
    this.container.querySelectorAll('.filters .filter[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeRole = btn.dataset.role;
        this.renderLimit = 40;
        this.render();
      });
    });

    // Filtro Dropdown Squadra Serie A
    const teamSelect = this.container.querySelector('#listone-team-select');
    teamSelect?.addEventListener('change', (e) => {
      this.selectedTeam = e.target.value;
      this.renderLimit = 40;
      this.render();
    });

    // Filtro Dropdown FantaLega
    const leagueSelect = this.container.querySelector('#listone-league-select');
    leagueSelect?.addEventListener('change', (e) => {
      this.leagueFilter = e.target.value;
      this.renderLimit = 40;
      this.render();
    });

    // Selettore Ordinamento
    const sortSelect = this.container.querySelector('#listone-sort-select');
    sortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.sortOrder = (e.target.value === 'name' || e.target.value === 'teamName') ? 'asc' : 'desc';
      this.renderLimit = 40;
      this.render();
    });

    // Toggle Disponibili
    const availBtn = this.container.querySelector('#toggle-listone-available-btn');
    availBtn?.addEventListener('click', () => {
      this.availabilityFilter = this.availabilityFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE';
      this.renderLimit = 40;
      this.render();
    });

    // Toggle Preferiti
    const favBtn = this.container.querySelector('#toggle-listone-fav-btn');
    favBtn?.addEventListener('click', () => {
      this.onlyFavorites = !this.onlyFavorites;
      this.renderLimit = 40;
      this.render();
    });

    // Pulsante Apri Modale Strategie
    this.container.querySelectorAll('[data-action="open-strategy-modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.app?.strategyManager?.open(this.activeRole !== 'ALL' ? this.activeRole : 'A');
      });
    });

    // Ricerca Testuale Debounced
    const searchInput = this.container.querySelector('.listone-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderLimit = 40;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this.render();
        const input = this.container.querySelector('.listone-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 250);
    });

    const clearBtn = this.container.querySelector('.listone-search-clear');
    clearBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      this.renderLimit = 40;
      this.render();
    });

    // Pulsante Carica Altri
    const loadMoreBtn = this.container.querySelector('#listone-load-more-btn');
    loadMoreBtn?.addEventListener('click', () => {
      this.renderLimit += 40;
      this.render();
    });

    // Pulsante Mostra Tutti
    const showAllBtn = this.container.querySelector('#listone-show-all-btn');
    showAllBtn?.addEventListener('click', () => {
      const filtered = this.getFilteredAndSortedPlayers();
      this.renderLimit = filtered.length;
      this.render();
    });

    // Infinite scroll automatico all'avvicinamento del fondo
    const scrollContainer = this.container.querySelector('.listone-page-container');
    if (scrollContainer && !this._scrollListenerBound) {
      this._scrollListenerBound = true;
      scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 300) {
          const filtered = this.getFilteredAndSortedPlayers();
          if (this.renderLimit < filtered.length) {
            this.renderLimit += 40;
            this.render();
          }
        }
      });
    }
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
