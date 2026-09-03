/**
 * Componente Barra Laterale Squadre Serie A (Team Directory - Editorial Minimal)
 * Raggruppa i 20 club per lettera alfabetica con conteggio rosa e ricerca istantanea,
 * secondo il design di desktop-player-directory.html.
 */

import { store } from '../store.js';
import { sanitizeHtml } from '../utils/helpers.js';

export class TeamSelectorComponent {
  constructor(container) {
    this.container = container;
    this.searchInput = null;
    this.teamListEl = null;
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  render() {
    const isLeague = store.activeView === 'league';
    const leagueTeams = store.getLeagueTeams ? store.getLeagueTeams() : [];

    this.container.innerHTML = `
      <div class="team-sidebar-inner">
        <!-- Brand Header -->
        <div class="brand">
          <div class="brand-mark" style="${isLeague ? 'background: linear-gradient(135deg, #10b981, #059669);' : ''}">${isLeague ? 'FL' : 'FO'}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="brand-name">${isLeague ? 'FantaLega' : 'FantaOliva'}</div>
            ${isLeague ? `<div class="season">${leagueTeams.length} Squadre · 2026/27</div>` : ''}
          </div>
          <button class="sidebar-close-btn" id="close-teams-sidebar-btn" title="Comprimi barra squadre" aria-label="Chiudi barra">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Ricerca Club -->
        <div class="search sidebar-search" role="search" aria-label="Cerca squadra">
          <svg class="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input 
            type="text" 
            id="team-search-input" 
            class="search-input" 
            placeholder="${isLeague ? 'Cerca squadra lega...' : 'Cerca club...'}" 
            autocomplete="off"
            value="${sanitizeHtml(this.searchQuery)}"
          />
          <button id="clear-search-btn" class="search-clear ${this.searchQuery ? '' : 'hidden'}" aria-label="Cancella ricerca">&times;</button>
        </div>

        <!-- Label Rubrica -->
        <span class="sidebar-label">${isLeague ? 'Squadre FantaLega' : 'Rubrica squadre'}</span>

        <!-- Navigazione Directory Alfabetica -->
        <nav class="directory" id="team-list-container"></nav>
      </div>
    `;

    this.searchInput = this.container.querySelector('#team-search-input');
    this.teamListEl = this.container.querySelector('#team-list-container');
    this.renderTeamList();
    this.bindEvents();
  }

  renderTeamList() {
    if (!this.teamListEl) return;

    if (store.activeView === 'league') {
      this.renderLeagueTeamList();
      return;
    }

    const teams = store.getAllTeams();
    const currentTeam = store.getCurrentTeam();
    const query = this.searchQuery.trim().toLowerCase();

    const filtered = teams.filter(t => {
      if (!query) return true;
      return (t.name || '').toLowerCase().includes(query) ||
        (t.city || '').toLowerCase().includes(query) ||
        (t.shortName || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      this.teamListEl.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--muted); font-size: 11px;">
          <p>Nessun club trovato per "${sanitizeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    // Raggruppamento alfabetico
    const grouped = {};
    filtered.forEach(t => {
      const letter = (t.name[0] || 'A').toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(t);
    });

    let html = '';
    Object.keys(grouped).sort().forEach(letter => {
      const list = grouped[letter];
      html += `
        <div class="team-group">
          <div class="letter">${letter}</div>
          <div class="team-list">
            ${list.map(t => {
        const isActive = currentTeam && currentTeam.id === t.id;
        const squadCount = Object.values(t.lineup || {}).filter(Boolean).length + (t.bench?.length || 0);
        const countDisplay = squadCount > 0 ? squadCount : (t.players?.length || 25);

        return `
                <button class="team ${isActive ? 'active' : ''}" data-team-id="${t.id}" type="button">
                  <span>${sanitizeHtml(t.name)}</span>
                  <span class="team-count">${countDisplay}</span>
                </button>
              `;
      }).join('')}
          </div>
        </div>
      `;
    });

    this.teamListEl.innerHTML = html;

    // Bind click handlers per selezione squadra Serie A
    this.teamListEl.querySelectorAll('.team[data-team-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamId = btn.dataset.teamId;
        store.setTeam(teamId);

        // Su mobile, chiudi il drawer dopo la selezione
        if (window.innerWidth <= 900) {
          const sidebarTeams = document.querySelector('#sidebar-teams');
          const backdrop = document.querySelector('#mobile-drawer-backdrop');
          sidebarTeams?.classList.remove('mobile-open');
          backdrop?.classList.add('hidden');
        }
      });
    });
  }

  renderLeagueTeamList() {
    if (!this.teamListEl) return;

    const leagueTeams = store.getLeagueTeams ? store.getLeagueTeams() : [];
    const currentSelected = window.app?.leagueTeams?.selectedTeamName || 'VINCENZO';
    const query = this.searchQuery.trim().toLowerCase();

    const filtered = leagueTeams.filter(t => {
      if (!query) return true;
      return (t.name || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      this.teamListEl.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--muted); font-size: 11px;">
          <p>Nessuna squadra lega trovata per "${sanitizeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="team-group" style="grid-template-columns: 1fr;">
        <div class="team-list">
          ${filtered.map(t => {
            const isVincenzo = t.name.toUpperCase() === 'VINCENZO';
            const isActive = t.name.toUpperCase() === currentSelected.toUpperCase();
            const squadCount = t.roster ? t.roster.length : (t.players ? t.players.length : 25);

            return `
              <button 
                class="team ${isActive ? 'active' : ''}" 
                data-league-team="${sanitizeHtml(t.name)}" 
                type="button"
                style="${isVincenzo ? 'font-weight: 780;' : ''}"
              >
                <span style="display: flex; align-items: center; gap: 7px;">
                  <span style="font-size: 13px;">${isVincenzo ? '⭐' : '🛡️'}</span>
                  <span>${sanitizeHtml(t.name)}</span>
                </span>
                <span class="team-count" style="${isActive ? 'color: var(--green); font-weight: 750;' : ''}">${squadCount}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.teamListEl.innerHTML = html;

    // Bind click handlers per selezione squadra FantaLega
    this.teamListEl.querySelectorAll('button[data-league-team]').forEach(btn => {
      btn.addEventListener('click', () => {
        const teamName = btn.dataset.leagueTeam;
        if (window.app?.leagueTeams) {
          window.app.leagueTeams.selectedTeamName = teamName;
          window.app.leagueTeams.render();
        }
        store.emit('league:teamChanged', { name: teamName });
        this.renderTeamList();

        // Su mobile, chiudi il drawer dopo la selezione
        if (window.innerWidth <= 900) {
          const sidebarTeams = document.querySelector('#sidebar-teams');
          const backdrop = document.querySelector('#mobile-drawer-backdrop');
          sidebarTeams?.classList.remove('mobile-open');
          backdrop?.classList.add('hidden');
        }
      });
    });
  }

  bindEvents() {
    const clearBtn = this.container.querySelector('#clear-search-btn');

    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      if (this.searchQuery) {
        clearBtn?.classList.remove('hidden');
      } else {
        clearBtn?.classList.add('hidden');
      }
      this.renderTeamList();
    });

    clearBtn?.addEventListener('click', () => {
      if (this.searchInput) this.searchInput.value = '';
      this.searchQuery = '';
      clearBtn.classList.add('hidden');
      this.renderTeamList();
      this.searchInput?.focus();
    });

    const closeBtn = this.container.querySelector('#close-teams-sidebar-btn') || this.container.querySelector('.sidebar-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.innerWidth <= 900) {
        const sidebarTeams = document.querySelector('#sidebar-teams');
        const backdrop = document.querySelector('#mobile-drawer-backdrop');
        sidebarTeams?.classList.remove('mobile-open');
        backdrop?.classList.add('hidden');
      } else {
        document.body.classList.toggle('left-sidebar-collapsed');
      }
    });
  }

  subscribeEvents() {
    store.subscribe('team:changed', () => this.renderTeamList());
    store.subscribe('init', () => this.renderTeamList());
    store.subscribe('view:changed', () => {
      this.searchQuery = '';
      this.render();
    });
    store.subscribe('league:teamChanged', () => this.renderTeamList());
    store.subscribe('league:updated', () => this.renderTeamList());
  }
}
