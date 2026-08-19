/**
 * Componente Barra Laterale Squadre Serie A (Team Selector)
 * Gestisce:
 * - Ricerca istantanea squadre
 * - Lista completa 20 club con badge SVG e dettagli
 * - Selezione attiva della squadra
 */

import { store } from '../store.js';
import { getTeamBadgeSvg } from '../data/initialData.js';
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
    this.bindEvents();
    this.subscribeEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="team-sidebar-header">
        <div class="sidebar-section-title-row">
          <div class="sidebar-section-title">
            <i class="fa-solid fa-shield-halved"></i>
            <span>Club Serie A</span>
          </div>
          <span class="teams-count-badge">20 Club</span>
        </div>

        <div class="team-search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            id="team-search-input" 
            class="team-search-input" 
            placeholder="Cerca squadra o città..." 
            autocomplete="off"
          />
          <button id="clear-search-btn" class="clear-search-btn hidden" aria-label="Cancella ricerca">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="team-list-container" id="team-list-container">
        <!-- Rendered via JS -->
      </div>

      <div class="team-sidebar-footer">
        <div class="quick-stats-badge">
          <i class="fa-solid fa-shield-halved"></i>
          <span>20 Squadre Serie A</span>
        </div>
      </div>
    `;

    this.searchInput = this.container.querySelector('#team-search-input');
    this.teamListEl = this.container.querySelector('#team-list-container');
    this.renderTeamList();
  }

  renderTeamList() {
    const teams = store.getAllTeams();
    const currentTeam = store.getCurrentTeam();
    const query = this.searchQuery.trim().toLowerCase();

    const filtered = teams.filter(t => {
      if (!query) return true;
      return t.name.toLowerCase().includes(query) ||
             t.city.toLowerCase().includes(query) ||
             t.shortName.toLowerCase().includes(query) ||
             (t.coach && t.coach.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      this.teamListEl.innerHTML = `
        <div class="no-teams-found">
          <i class="fa-solid fa-shield-slash"></i>
          <p>Nessuna squadra trovata per "${sanitizeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    this.teamListEl.innerHTML = filtered.map(team => {
      const isActive = currentTeam && currentTeam.id === team.id;
      const badgeSvg = getTeamBadgeSvg(team.shortName, team.primaryColor, team.secondaryColor, team.accentColor, `sb_${team.id}`);

      return `
        <div 
          class="team-list-item ${isActive ? 'is-active' : ''}" 
          data-team-id="${team.id}"
          style="--team-primary: ${team.primaryColor}; --team-secondary: ${team.secondaryColor};"
        >
          <div class="team-crest-wrapper">
            ${badgeSvg}
          </div>
          <div class="team-meta">
            <div class="team-name-row">
              <span class="team-title">${sanitizeHtml(team.name)}</span>
              <span class="team-formation-badge">${team.defaultFormation || '4-3-3'}</span>
            </div>
            <div class="team-sub-row">
              <span class="team-coach"><i class="fa-solid fa-user-tie"></i> ${sanitizeHtml(team.coach || 'Allenatore')}</span>
            </div>
          </div>
          <div class="team-active-indicator">
            <i class="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      `;
    }).join('');

    // Bind click events on team items
    this.teamListEl.querySelectorAll('.team-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const teamId = item.dataset.teamId;
        store.setTeam(teamId);
      });
    });
  }

  bindEvents() {
    const clearBtn = this.container.querySelector('#clear-search-btn');

    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      if (this.searchQuery) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
      this.renderTeamList();
    });

    clearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      clearBtn.classList.add('hidden');
      this.renderTeamList();
      this.searchInput.focus();
    });
  }

  subscribeEvents() {
    store.subscribe('team:changed', () => this.renderTeamList());
    store.subscribe('init', () => this.renderTeamList());
  }
}
