/**
 * Componente Listone Completo Calciatori Serie A
 * Permette la consultazione, ricerca, filtraggio per ruolo/squadra/asta e
 * ordinamento multi-colonna di tutti i giocatori del campionato.
 */

import { store } from '../store.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class PlayersListoneComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchQuery = '';
    this.activeRole = 'ALL'; // 'ALL' | 'P' | 'D' | 'C' | 'A'
    this.selectedTeam = 'ALL';
    this.availabilityFilter = 'ALL'; // 'ALL' | 'AVAILABLE' | 'TAKEN'
    this.sortBy = 'appetibilita'; // 'appetibilita' | 'fantamedia' | 'mediaVoto' | 'qtA' | 'fvm' | 'gol' | 'assist' | 'presenze' | 'titolarita' | 'name' | 'teamName'
    this.sortOrder = 'desc'; // 'asc' | 'desc'
    this._searchTimer = null;
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

    store.subscribe('team:changed', () => {
      if (store.activeView === 'listone') {
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
  }

  getFilteredAndSortedPlayers() {
    const all = store.getAllPlayersFlat();

    // 1. Filtro Ruolo
    let filtered = all.filter(p => {
      if (this.activeRole === 'ALL') return true;
      const r = (p.classicRole || p.role || '').toUpperCase();
      return r === this.activeRole;
    });

    // 2. Filtro Squadra
    if (this.selectedTeam !== 'ALL') {
      filtered = filtered.filter(p => p.teamId === this.selectedTeam);
    }

    // 3. Filtro Disponibilità Asta
    if (this.availabilityFilter === 'AVAILABLE') {
      filtered = filtered.filter(p => p.isAvailable !== false);
    } else if (this.availabilityFilter === 'TAKEN') {
      filtered = filtered.filter(p => p.isAvailable === false);
    }

    // 4. Ricerca Testuale (Nome o Squadra)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = (p.name || p.displayName || '').toLowerCase().includes(q);
        const teamMatch = (p.teamName || '').toLowerCase().includes(q);
        const roleMatch = (p.role || '').toLowerCase().includes(q);
        return nameMatch || teamMatch || roleMatch;
      });
    }

    // 5. Ordinamento Multi-Colonna
    filtered.sort((a, b) => {
      let valA, valB;

      switch (this.sortBy) {
        case 'name':
          valA = (a.name || a.displayName || '').toLowerCase();
          valB = (b.name || b.displayName || '').toLowerCase();
          return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

        case 'teamName':
          valA = (a.teamName || '').toLowerCase();
          valB = (b.teamName || '').toLowerCase();
          return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

        case 'appetibilita':
          valA = Number(a.appetibilita ?? 50);
          valB = Number(b.appetibilita ?? 50);
          break;

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

        case 'titolarita':
          valA = Number(a.stats?.titolarita ?? a.titolaritaPerc ?? 50);
          valB = Number(b.stats?.titolarita ?? b.titolaritaPerc ?? 50);
          break;

        default:
          valA = Number(a.appetibilita ?? 50);
          valB = Number(b.appetibilita ?? 50);
      }

      if (this.sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });

    return { filtered, total: all.length };
  }

  getRoleBadge(role, mantraRole) {
    const r = (role || 'C').toUpperCase();
    let badgeClass = 'role-badge-c';
    if (r === 'P' || r.includes('P')) badgeClass = 'role-badge-p';
    else if (r === 'D' || r.includes('D')) badgeClass = 'role-badge-d';
    else if (r === 'A' || r.includes('A')) badgeClass = 'role-badge-a';

    return `
      <div class="listone-role-box">
        <span class="role-badge ${badgeClass}">${r}</span>
        ${mantraRole ? `<span class="listone-mantra-role" title="Ruolo Mantra: ${sanitizeHtml(mantraRole)}">${sanitizeHtml(mantraRole)}</span>` : ''}
      </div>
    `;
  }

  getSortArrow(columnKey) {
    if (this.sortBy !== columnKey) {
      return '<i class="fa-solid fa-sort sort-icon-inactive"></i>';
    }
    return this.sortOrder === 'desc' 
      ? '<i class="fa-solid fa-sort-down sort-icon-active"></i>' 
      : '<i class="fa-solid fa-sort-up sort-icon-active"></i>';
  }

  render() {
    if (!this.container) return;

    const { filtered, total } = this.getFilteredAndSortedPlayers();
    const teams = Object.values(store.teams || {});

    this.container.innerHTML = `
      <div class="listone-page-container">

        <!-- BARRA STRUMENTI & FILTRI LISTONE -->
        <div class="listone-toolbar-card">
          <div class="listone-toolbar-row primary-filters-row">
            
            <!-- Ricerca Testuale -->
            <div class="listone-search-box">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                class="listone-search-input" 
                placeholder="Cerca calciatore o club..." 
                value="${sanitizeHtml(this.searchQuery)}"
              />
              ${this.searchQuery ? `<button class="listone-search-clear" title="Pulisci ricerca"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>

            <!-- Filtro Ruolo Rapido -->
            <div class="listone-role-filters" aria-label="Filtro per Ruolo">
              <button class="listone-filter-pill ${this.activeRole === 'ALL' ? 'is-active' : ''}" data-role="ALL">Tutti</button>
              <button class="listone-filter-pill role-pill-p ${this.activeRole === 'P' ? 'is-active' : ''}" data-role="P">P</button>
              <button class="listone-filter-pill role-pill-d ${this.activeRole === 'D' ? 'is-active' : ''}" data-role="D">D</button>
              <button class="listone-filter-pill role-pill-c ${this.activeRole === 'C' ? 'is-active' : ''}" data-role="C">C</button>
              <button class="listone-filter-pill role-pill-a ${this.activeRole === 'A' ? 'is-active' : ''}" data-role="A">A</button>
            </div>

            <!-- Filtro Squadra Dropdown -->
            <div class="listone-team-filter-wrapper">
              <i class="fa-solid fa-shield-halved team-filter-icon"></i>
              <select class="listone-team-select" id="listone-team-select" aria-label="Filtro Squadra">
                <option value="ALL" ${this.selectedTeam === 'ALL' ? 'selected' : ''}>Tutte le Squadre (${teams.length})</option>
                ${teams.map(t => `<option value="${t.id}" ${this.selectedTeam === t.id ? 'selected' : ''}>${sanitizeHtml(t.name)}</option>`).join('')}
              </select>
            </div>

            <!-- Filtro Stato Asta (Disponibile / Preso) -->
            <div class="listone-avail-filter-group">
              <button class="listone-avail-btn ${this.availabilityFilter === 'ALL' ? 'is-active' : ''}" data-avail="ALL" title="Mostra tutti i calciatori">Tutti</button>
              <button class="listone-avail-btn avail-green ${this.availabilityFilter === 'AVAILABLE' ? 'is-active' : ''}" data-avail="AVAILABLE" title="Solo calciatori disponibili"><i class="fa-solid fa-circle-check"></i> Disponibili</button>
              <button class="listone-avail-btn avail-red ${this.availabilityFilter === 'TAKEN' ? 'is-active' : ''}" data-avail="TAKEN" title="Solo calciatori già presi"><i class="fa-solid fa-circle-xmark"></i> Presi</button>
            </div>

            <!-- Contatore Risultati -->
            <div class="listone-count-badge" title="Calciatori visualizzati / Totale">
              <i class="fa-solid fa-users"></i>
              <span><strong>${filtered.length}</strong> / ${total}</span>
            </div>

          </div>
        </div>

        <!-- TABELLA INTERATTIVA CALCIATORI -->
        <div class="listone-table-card">
          <div class="listone-table-responsive-wrapper">
            <table class="listone-table">
              <thead>
                <tr>
                  <th class="col-center col-action">Asta</th>
                  <th class="col-center col-role">Ruolo</th>
                  <th class="col-left col-name sortable-th" data-sort="name">
                    <span>Calciatore</span> ${this.getSortArrow('name')}
                  </th>
                  <th class="col-left col-team sortable-th" data-sort="teamName">
                    <span>Squadra</span> ${this.getSortArrow('teamName')}
                  </th>
                  <th class="col-center col-appetibilita sortable-th" data-sort="appetibilita" title="Indice Appetibilità Fantacalcio (0-100)">
                    <span>🔥 App</span> ${this.getSortArrow('appetibilita')}
                  </th>
                  <th class="col-center col-tit sortable-th" data-sort="titolarita" title="% Titolarità stimata">
                    <span>% Tit</span> ${this.getSortArrow('titolarita')}
                  </th>
                  <th class="col-center col-qta sortable-th" data-sort="qtA" title="Quotazione Attuale Classic">
                    <span>QtA</span> ${this.getSortArrow('qtA')}
                  </th>
                  <th class="col-center col-fvm sortable-th" data-sort="fvm" title="FantaValore Mercato (base 1000)">
                    <span>FVM</span> ${this.getSortArrow('fvm')}
                  </th>
                  <th class="col-center col-fm sortable-th" data-sort="fantamedia" title="Fantamedia Stagionale">
                    <span>FM</span> ${this.getSortArrow('fantamedia')}
                  </th>
                  <th class="col-center col-mv sortable-th" data-sort="mediaVoto" title="Media Voto Pura">
                    <span>MV</span> ${this.getSortArrow('mediaVoto')}
                  </th>
                  <th class="col-center col-gol sortable-th" data-sort="gol" title="Gol Segnati">
                    <span>⚽ Gol</span> ${this.getSortArrow('gol')}
                  </th>
                  <th class="col-center col-ass sortable-th" data-sort="assist" title="Assist Vincenti">
                    <span>🅰 Ass</span> ${this.getSortArrow('assist')}
                  </th>
                  <th class="col-center col-pres sortable-th" data-sort="presenze" title="Partite a Voto / Presenze">
                    <span>📅 PV</span> ${this.getSortArrow('presenze')}
                  </th>
                  <th class="col-center col-specialisti">Specialisti</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="14" class="listone-empty-state">
                      <div class="empty-state-box">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>Nessun calciatore trovato con i filtri selezionati.</p>
                      </div>
                    </td>
                  </tr>
                ` : filtered.map((p, idx) => {
                  const fm = p.stats?.fantamedia ? Number(p.stats.fantamedia).toFixed(2) : '-';
                  const mv = p.stats?.mediaVoto ? Number(p.stats.mediaVoto).toFixed(2) : '-';
                  const gol = p.stats?.gol || 0;
                  const ass = p.stats?.assist || 0;
                  const pres = p.stats?.presenze || p.stats?.pv || 0;
                  const appVal = p.appetibilita !== undefined ? Number(p.appetibilita) : 50;
                  const titolarita = p.stats?.titolarita ?? p.titolaritaPerc ?? 50;
                  const titClass = getTitolaritaClass(titolarita);
                  const isAvailable = p.isAvailable !== false;
                  const qtA = p.quotazioni?.qtA ?? '-';
                  const fvm = p.quotazioni?.fvm ?? '-';
                  const mantraRole = p.mantraRole || '';
                  const classicRole = p.classicRole || p.role || 'C';

                  // Flags specialisti
                  const isPenalty = p.isPenaltyTaker || p.rigorista;
                  const isFreeKick = p.isFreeKickTaker || p.punizioni;
                  const isCorner = p.isCornerTaker || p.corner;

                  return `
                    <tr class="listone-row ${!isAvailable ? 'is-taken' : ''}" data-player-id="${p.id}" data-team-id="${p.teamId || ''}" title="${sanitizeHtml(p.name)} - Doppio click per aprire la scheda tecnica">
                      
                      <!-- 1. Stato Asta Toggle -->
                      <td class="col-center col-action">
                        <button class="listone-availability-btn ${isAvailable ? 'is-available' : 'is-taken'}" data-player-id="${p.id}" title="${isAvailable ? 'Disponibile all\'asta (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}">
                          <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                        </button>
                      </td>

                      <!-- 2. Ruolo -->
                      <td class="col-center col-role">
                        ${this.getRoleBadge(classicRole, mantraRole)}
                      </td>

                      <!-- 3. Nome Calciatore -->
                      <td class="col-left col-name">
                        <div class="listone-player-info">
                          <span class="player-main-name">${sanitizeHtml(p.name || p.displayName)}</span>
                          ${!isAvailable ? `<span class="listone-taken-stamp">PRESO</span>` : ''}
                        </div>
                      </td>

                      <!-- 4. Squadra -->
                      <td class="col-left col-team">
                        <span class="listone-team-pill">${sanitizeHtml(p.teamName || 'Serie A')}</span>
                      </td>

                      <!-- 5. Appetibilità Editabile -->
                      <td class="col-center col-appetibilita">
                        <div class="listone-app-input-wrap">
                          <i class="fa-solid fa-fire" style="color: ${appVal >= 75 ? '#ff4d4d' : appVal >= 50 ? '#ffb703' : '#6c757d'}; font-size: 0.8rem;"></i>
                          <input 
                            type="number" 
                            class="listone-app-input" 
                            data-player-id="${p.id}" 
                            min="0" 
                            max="100" 
                            value="${appVal}"
                            title="Modifica Indice Appetibilità"
                          />
                        </div>
                      </td>

                      <!-- 6. Titolarità -->
                      <td class="col-center col-tit">
                        <span class="listone-tit-badge ${titClass}">${titolarita}%</span>
                      </td>

                      <!-- 7. Quotazione Attuale Classic -->
                      <td class="col-center col-qta">
                        <span class="stat-chip">${qtA}</span>
                      </td>

                      <!-- 8. FVM -->
                      <td class="col-center col-fvm">
                        <span class="stat-chip highlight-fvm">${fvm}</span>
                      </td>

                      <!-- 9. Fantamedia -->
                      <td class="col-center col-fm">
                        <span class="stat-num-val ${fm >= 7.0 ? 'highlight-top-fm' : ''}">${fm}</span>
                      </td>

                      <!-- 10. Media Voto -->
                      <td class="col-center col-mv">
                        <span class="stat-num-val">${mv}</span>
                      </td>

                      <!-- 11. Gol -->
                      <td class="col-center col-gol">
                        <span class="stat-gol-pill ${gol > 0 ? 'has-gol' : ''}">${gol}</span>
                      </td>

                      <!-- 12. Assist -->
                      <td class="col-center col-ass">
                        <span class="stat-ass-pill ${ass > 0 ? 'has-ass' : ''}">${ass}</span>
                      </td>

                      <!-- 13. Presenze -->
                      <td class="col-center col-pres">
                        <span class="stat-pres-pill">${pres}</span>
                      </td>

                      <!-- 14. Specialisti Piazzati -->
                      <td class="col-center col-specialisti">
                        <div class="listone-specialists-box">
                          ${isPenalty ? '<span class="specialist-dot pen" title="1° Rigorista">🎯</span>' : ''}
                          ${isFreeKick ? '<span class="specialist-dot fk" title="Punizioni">📐</span>' : ''}
                          ${isCorner ? '<span class="specialist-dot crn" title="Corner">🚩</span>' : ''}
                        </div>
                      </td>

                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 1. Ricerca Live con debounce
    const searchInput = this.container.querySelector('.listone-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this.render();
        const input = this.container.querySelector('.listone-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 200);
    });

    const clearSearchBtn = this.container.querySelector('.listone-search-clear');
    clearSearchBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      this.render();
    });

    // 2. Filtro Ruolo
    this.container.querySelectorAll('.listone-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeRole = btn.dataset.role;
        this.render();
      });
    });

    // 3. Filtro Squadra
    const teamSelect = this.container.querySelector('#listone-team-select');
    teamSelect?.addEventListener('change', (e) => {
      this.selectedTeam = e.target.value;
      this.render();
    });

    // 4. Filtro Disponibilità Asta
    this.container.querySelectorAll('.listone-avail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.availabilityFilter = btn.dataset.avail;
        this.render();
      });
    });

    // 5. Ordinamento cliccando sulle colonne dell'header
    this.container.querySelectorAll('.sortable-th').forEach(th => {
      th.addEventListener('click', () => {
        const sortField = th.dataset.sort;
        if (this.sortBy === sortField) {
          this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
          this.sortBy = sortField;
          this.sortOrder = (sortField === 'name' || sortField === 'teamName') ? 'asc' : 'desc';
        }
        this.render();
      });
    });

    // 6. Live Appetibilità Input
    this.container.querySelectorAll('.listone-app-input').forEach(input => {
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

    // 7. Toggle Disponibilità Asta
    this.container.querySelectorAll('.listone-availability-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.dataset.playerId;
        const newState = store.togglePlayerAvailability(playerId);
        notify.info(newState ? 'Calciatore segnato come DISPONIBILE' : 'Calciatore segnato come PRESO');
      });
    });

    // 8. Click e Doppio Click / Doppio Tocco sulle righe
    this.container.querySelectorAll('.listone-row').forEach(row => {
      let lastTap = 0;

      const handleGoToTacticalWithInspector = () => {
        const playerId = row.dataset.playerId;
        const teamId = row.dataset.teamId;

        // 1. Imposta la squadra
        if (teamId && teamId !== store.currentTeamId) {
          store.setTeam(teamId);
        }

        // 2. Seleziona il giocatore
        store.selectPlayer(playerId);

        // 3. Passa alla vista 'tactical'
        store.setView('tactical');

        // 4. Desktop: apri sidebar destra se collassata
        if (document.body.classList.contains('right-sidebar-collapsed')) {
          document.body.classList.remove('right-sidebar-collapsed');
        }

        // 5. Mobile: apri il drawer della scheda laterale
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

      // Native dblclick per Desktop
      row.addEventListener('dblclick', (e) => {
        if (e.target.closest('.listone-availability-btn') || e.target.closest('.listone-app-input')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleGoToTacticalWithInspector();
      });

      // Click e doppio tap per Mobile
      row.addEventListener('click', (e) => {
        if (e.target.closest('.listone-availability-btn') || e.target.closest('.listone-app-input')) {
          return;
        }
        const now = Date.now();
        const timesince = now - lastTap;

        if (timesince < 350 && timesince > 0) {
          e.stopPropagation();
          handleGoToTacticalWithInspector();
          lastTap = 0;
        } else {
          lastTap = now;
          const playerId = row.dataset.playerId;
          const teamId = row.dataset.teamId;
          if (teamId && teamId !== store.currentTeamId) {
            store.setTeam(teamId);
          }
          store.selectPlayer(playerId);
        }
      });
    });
  }
}
