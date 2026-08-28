/**
 * Componente Infermeria & Indisponibili Serie A (FantaLab Design)
 * Permette di consultare la lista completa di tutti i calciatori infortunati,
 * in dubbio e squalificati con diagnosi clinica, stima del rientro e filtri per ruolo/club/lega.
 */

import { store } from '../store.js';
import { INJURIES_DATA } from '../data/injuriesData.js';
import { sanitizeHtml } from '../utils/helpers.js';

export class InjuriesComponent {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = typeof containerId === 'string' ? (typeof document !== 'undefined' && document.getElementById ? document.getElementById(containerId) : null) : containerId;
    this.searchQuery = '';
    this.activeRole = 'ALL'; // 'ALL' | 'P' | 'D' | 'C' | 'A'
    this.selectedTeam = 'ALL';
    this.statusFilter = 'ALL'; // 'ALL' | 'INJURED' | 'DOUBTFUL' | 'SUSPENDED' | 'MYTEAM'
    this.gridColumns = Number((typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_injuries_cols') : null) || 2);
    this._searchTimer = null;
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('player:selected', () => {
      if (store.activeView === 'injuries') {
        this.updateSelectionHighlight();
      }
    });

    store.subscribe('view:changed', (view) => {
      if (view === 'injuries') {
        this.render();
      }
    });

    store.subscribe('myteam:updated', () => {
      if (store.activeView === 'injuries') {
        this.render();
      }
    });
  }

  updateSelectionHighlight() {
    const selectedPlayer = store.getSelectedPlayer();
    this.container?.querySelectorAll('.injury-card').forEach(card => {
      const pId = card.dataset.playerId;
      const isSelected = selectedPlayer && (pId === selectedPlayer.id || pId === selectedPlayer.csvId);
      card.classList.toggle('is-selected', Boolean(isSelected));
    });
  }

  getFilteredList() {
    let list = INJURIES_DATA
      .filter(item => item && item.name && item.name.toLowerCase() !== 'giocatore' && item.name.toLowerCase() !== 'nuovo giocatore')
      .map(item => {
      const storePlayer = store.getPlayer(item.name) || 
                          store.getPlayer(item.displayName) || 
                          store.getAllPlayersFlat().find(p => p.name.toLowerCase() === item.name.toLowerCase());
      
      const leagueOwner = storePlayer ? store.getPlayerLeagueOwner(storePlayer) : null;
      const isInMyTeam = storePlayer ? (store.isPlayerInMyTeam(storePlayer.id) || (leagueOwner && leagueOwner.isMyTeam)) : false;

      return {
        ...item,
        storePlayer,
        leagueOwner,
        isInMyTeam,
        role: storePlayer?.role || item.role || 'C',
        classicRole: storePlayer?.classicRole || item.classicRole || 'C',
        teamName: storePlayer?.teamName || item.teamName,
        photoUrl: storePlayer?.photoUrl || storePlayer?.playerImage || item.photoUrl || ''
      };
    });

    // 1. Filtro Ruolo
    if (this.activeRole !== 'ALL') {
      list = list.filter(p => {
        const cat = store.getRoleCategory(p);
        return cat === this.activeRole;
      });
    }

    // 2. Filtro Squadra
    if (this.selectedTeam !== 'ALL') {
      list = list.filter(p => {
        const tId = (p.teamName || '').toLowerCase();
        return tId.includes(this.selectedTeam.toLowerCase()) || (p.storePlayer?.teamId === this.selectedTeam);
      });
    }

    // 3. Filtro Stato
    if (this.statusFilter === 'INJURED') {
      list = list.filter(p => p.isInjured);
    } else if (this.statusFilter === 'DOUBTFUL') {
      list = list.filter(p => p.isDoubtful);
    } else if (this.statusFilter === 'SUSPENDED') {
      list = list.filter(p => p.isSuspended);
    } else if (this.statusFilter === 'MYTEAM') {
      list = list.filter(p => p.isInMyTeam);
    }

    // 4. Ricerca Testuale (Nome, Squadra o Tipo Infortunio)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(p => {
        const nameMatch = (p.name || p.displayName || '').toLowerCase().includes(q);
        const teamMatch = (p.teamName || '').toLowerCase().includes(q);
        const descMatch = (p.injuryDescription || '').toLowerCase().includes(q);
        return nameMatch || teamMatch || descMatch;
      });
    }

    return list;
  }

  render() {
    this.container = this.container || document.getElementById(this.containerId);
    if (!this.container) return;

    const filtered = this.getFilteredList();
    const totalInjured = INJURIES_DATA.filter(p => p.isInjured).length;
    const totalSuspended = INJURIES_DATA.filter(p => p.isSuspended).length;
    const totalDoubtful = INJURIES_DATA.filter(p => p.isDoubtful).length;
    const teams = store.getAllTeams();

    this.container.innerHTML = `
      <div class="injuries-page-container">

        <!-- HEADER EDITORIAL MINIMAL -->
        <header class="topbar" style="margin-bottom: 8px;">
          <div>
            <p class="context">Serie A · Report Medico & Squalifiche</p>
            <div class="team-heading-row">
              <h1 class="team-title-heading">INFERMERIA & INDISPONIBILI</h1>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="section-columns-switcher" title="Disposizione colonne">
              <span class="cols-label">Colonne</span>
              <div class="cols-button-group">
                <button type="button" class="col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
                <button type="button" class="col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
                <button type="button" class="col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
                <button type="button" class="col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
              </div>
            </div>
            <span class="listone-total-badge" title="Indisponibili visualizzati">
              <strong>${filtered.length}</strong>/${INJURIES_DATA.length}
            </span>
          </div>
        </header>

        <!-- BANNER STATISTICHE GLOBALI -->
        <div class="injuries-stats-banner">
          <span class="injury-stat-pill stat-injured" title="Calciatori attualmente infortunati">
            <i class="fa-solid fa-hospital"></i> Infortunati: <strong>${totalInjured}</strong>
          </span>
          <span class="injury-stat-pill stat-suspended" title="Calciatori squalificati per la prossima giornata">
            <i class="fa-solid fa-square" style="color: #dc2626;"></i> Squalificati: <strong>${totalSuspended}</strong>
          </span>
          ${totalDoubtful > 0 ? `
            <span class="injury-stat-pill stat-doubtful" title="Calciatori in dubbio">
              <i class="fa-solid fa-triangle-exemption"></i> In dubbio: <strong>${totalDoubtful}</strong>
            </span>
          ` : ''}
          <span class="injury-stat-pill" style="margin-left: auto;" title="Fonte dati ufficiali">
            <i class="fa-solid fa-shield-virus"></i> SOS Fanta · Aggiornamento Live
          </span>
        </div>

        <!-- BARRA DI RICERCA EDITORIALE -->
        <div class="search" role="search" aria-label="Cerca infortunato o diagnosi" style="margin-bottom: 8px;">
          <svg class="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input 
            type="text" 
            class="injuries-search-input search-input" 
            placeholder="Cerca calciatore, club o diagnosi clinica (es. crociato, flessori, caviglia)..." 
            value="${sanitizeHtml(this.searchQuery)}"
            autocomplete="off"
          />
          ${this.searchQuery ? `<button class="injuries-search-clear search-clear" aria-label="Pulisci ricerca">&times;</button>` : ''}
        </div>

        <!-- BARRA FILTRI RUOLI, CLUB & STATO -->
        <nav class="filters" aria-label="Filtri Infermeria" style="margin-bottom: 12px;">
          <button class="filter ${this.activeRole === 'ALL' ? 'active' : ''}" data-role="ALL" type="button">Tutti · ${filtered.length}</button>
          <button class="filter ${this.activeRole === 'A' ? 'active' : ''}" data-role="A" type="button">ATT</button>
          <button class="filter ${this.activeRole === 'C' ? 'active' : ''}" data-role="C" type="button">CEN</button>
          <button class="filter ${this.activeRole === 'D' ? 'active' : ''}" data-role="D" type="button">DIF</button>
          <button class="filter ${this.activeRole === 'P' ? 'active' : ''}" data-role="P" type="button">POR</button>

          <!-- Dropdown Club Serie A -->
          <div class="listone-select-pill-wrap" title="Filtra per Club">
            <select class="injuries-team-select filter filter-select" id="injuries-team-select" aria-label="Filtro Squadra">
              <option value="ALL" ${this.selectedTeam === 'ALL' ? 'selected' : ''}>Tutti i Club (${teams.length})</option>
              ${teams.map(t => `<option value="${t.id}" ${this.selectedTeam === t.id ? 'selected' : ''}>${sanitizeHtml(t.name)}</option>`).join('')}
            </select>
            <span class="select-arrow">▾</span>
          </div>

          <!-- Dropdown Stato Indisponibilità -->
          <div class="listone-select-pill-wrap" title="Filtra per Stato">
            <select class="injuries-status-select filter filter-select" id="injuries-status-select" aria-label="Filtro Stato">
              <option value="ALL" ${this.statusFilter === 'ALL' ? 'selected' : ''}>Tutti gli Stati</option>
              <option value="INJURED" ${this.statusFilter === 'INJURED' ? 'selected' : ''}>🏥 Solo Infortunati (${totalInjured})</option>
              <option value="SUSPENDED" ${this.statusFilter === 'SUSPENDED' ? 'selected' : ''}>🟥 Solo Squalificati (${totalSuspended})</option>
              <option value="MYTEAM" ${this.statusFilter === 'MYTEAM' ? 'selected' : ''}>⭐ Solo Mia Rosa</option>
            </select>
            <span class="select-arrow">▾</span>
          </div>
        </nav>

        <!-- GRIGLIA CARDS INDISPONIBILI -->
        <div class="injuries-cards-grid cols-${this.gridColumns}" id="injuries-cards-grid">
          ${filtered.length === 0 ? `
            <div class="inspector-empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
              <div class="empty-icon-circle"><i class="fa-solid fa-notes-medical"></i></div>
              <h3>Nessun calciatore trovato</h3>
              <p>Nessun infortunato o indisponibile corrisponde ai filtri selezionati.</p>
            </div>
          ` : filtered.map(item => this.renderInjuryCard(item)).join('')}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  renderInjuryCard(item) {
    const roleCat = store.getRoleCategory(item);
    const roleClass = `role-${roleCat.toLowerCase()}`;
    const selectedPlayer = store.getSelectedPlayer();
    const isSelected = selectedPlayer && (selectedPlayer.id === item.id || selectedPlayer.name?.toLowerCase() === item.name?.toLowerCase());

    const statusBadgeHtml = item.isSuspended 
      ? `<span class="injury-status-badge is-suspended"><i class="fa-solid fa-square"></i> Squalificato</span>`
      : (item.isDoubtful 
          ? `<span class="injury-status-badge is-doubtful"><i class="fa-solid fa-triangle-exclamation"></i> In dubbio</span>`
          : `<span class="injury-status-badge is-injured"><i class="fa-solid fa-hospital"></i> Infortunato</span>`);

    const returnHtml = item.returnDay 
      ? `<span class="injury-return-badge" title="Rientro stimato"><i class="fa-solid fa-clock-rotate-left"></i> Rientro: <strong>${item.returnDay}ª Giornata</strong></span>`
      : (item.injuryDates?.start_day ? `<span class="injury-return-badge"><i class="fa-solid fa-clock"></i> Giornata ${item.injuryDates.start_day}</span>` : '');

    return `
      <div 
        class="injury-card ${isSelected ? 'is-selected' : ''}" 
        data-player-id="${item.storePlayer ? item.storePlayer.id : item.id}"
        data-player-name="${sanitizeHtml(item.name)}"
        title="Clicca per aprire la scheda dettagliata di ${sanitizeHtml(item.displayName)}"
      >
        <div class="injury-card-top">
          <div class="injury-avatar-wrap">
            ${item.photoUrl ? `
              <img src="${item.photoUrl}" alt="" class="injury-avatar-img" onerror="this.style.display='none';" />
            ` : `<span style="font-weight: 800; color: var(--muted); font-size: 13px;">${item.displayName.slice(0, 2).toUpperCase()}</span>`}
            <span class="injury-badge-overlay"><i class="fa-solid fa-plus"></i></span>
          </div>

          <div class="injury-card-identity">
            <div class="injury-player-name-row">
              <h3 class="injury-player-name">${sanitizeHtml(item.displayName || item.name)}</h3>
              <span class="role ${roleClass}" style="font-size: 9px; padding: 1px 5px;">${item.classicRole || item.role}</span>
              ${item.leagueOwner ? `<span class="badge-league-owner" title="Acquistato da ${sanitizeHtml(item.leagueOwner.teamName)}"><i class="fa-solid fa-users"></i> ${sanitizeHtml(item.leagueOwner.teamName)}</span>` : ''}
            </div>

            <div class="injury-meta-row">
              <span>${sanitizeHtml(item.teamName)}</span>
              <span>·</span>
              ${statusBadgeHtml}
              ${returnHtml}
            </div>
          </div>
        </div>

        ${item.injuryDescription ? `
          <div class="injury-diagnosis-box">
            <div class="injury-diagnosis-title">
              <i class="fa-solid fa-stethoscope"></i> Diagnosi & Condizioni
            </div>
            <div>${sanitizeHtml(item.injuryDescription)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  bindEvents() {
    // Filtri Ruolo
    this.container.querySelectorAll('.filters button[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeRole = btn.dataset.role;
        this.render();
      });
    });

    // Filtro Club
    const teamSelect = this.container.querySelector('#injuries-team-select');
    teamSelect?.addEventListener('change', (e) => {
      this.selectedTeam = e.target.value;
      this.render();
    });

    // Filtro Stato
    const statusSelect = this.container.querySelector('#injuries-status-select');
    statusSelect?.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.render();
    });

    // Ricerca Testuale
    const searchInput = this.container.querySelector('.injuries-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this.render();
        const input = this.container.querySelector('.injuries-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 250);
    });

    const clearBtn = this.container.querySelector('.injuries-search-clear');
    clearBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      this.render();
    });

    // Colonne Switcher
    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = Number(btn.dataset.cols) || 2;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_injuries_cols', cols);
        }
        this.render();
      });
    });

    // Click su Card Infortunato -> Apre l'Ispettore laterale
    this.container.querySelectorAll('.injury-card[data-player-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = card.dataset.playerId;
        const pName = card.dataset.playerName;
        
        let player = store.getPlayer(pId) || store.getPlayer(pName) || store.getAllPlayersFlat().find(p => p.name.toLowerCase() === pName?.toLowerCase());
        if (!player) {
          player = {
            id: pId,
            name: pName,
            displayName: pName,
            role: 'C',
            classicRole: 'C',
            teamName: 'Serie A'
          };
        }

        store.selectPlayer(player.id);
        if (document.body.classList.contains('right-sidebar-collapsed')) {
          document.body.classList.remove('right-sidebar-collapsed');
        }
        const sidebarInspector = document.querySelector('#sidebar-inspector');
        const backdrop = document.querySelector('#mobile-drawer-backdrop');
        if (window.innerWidth <= 900) {
          sidebarInspector?.classList.add('mobile-open');
          backdrop?.classList.remove('hidden');
        }
      });
    });
  }
}
