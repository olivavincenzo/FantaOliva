/**
 * Componente FantaLega (Gestione Rose & Squadre della Lega)
 * Permette di consultare e analizzare le formazioni, budget spesi e rose complete
 * di tutti i partecipanti della lega fantacalcio (Vincenzo, Luigi, Giovanni, Dom-Raf, ecc.).
 */

import { store } from '../store.js';
import { createPlayerCard } from './playerCard.js';
import { FORMATIONS, FORMATION_LIST } from '../data/formations.js';
import { LineupOptimizer } from '../utils/optimizer.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';
import { dragDrop } from '../utils/dragDrop.js';

export class LeagueTeamsComponent {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = typeof containerId === 'string' ? (typeof document !== 'undefined' && document.getElementById ? document.getElementById(containerId) : null) : containerId;
    this.selectedTeamName = 'VINCENZO';
    this.layoutMode = 'pitch'; // 'pitch' | 'list'
    this.searchQuery = '';
    this.activeRoleFilter = 'ALL'; // 'ALL' | 'ATT' | 'CEN' | 'DIF' | 'POR'
    this.squadScope = 'ALL'; // 'ALL' | 'STARTERS' | 'BENCH'
    this.gridColumns = Number((typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_league_cols') : null) || 2);
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('league:updated', () => {
      if (store.activeView === 'league') {
        this.render();
      }
    });

    store.subscribe('league:teamChanged', (team) => {
      if (team) {
        this.selectedTeamName = team.name;
        this.render();
      }
    });

    store.subscribe('player:selected', () => {
      if (store.activeView === 'league') {
        this.updateSelectionHighlight();
      }
    });
  }

  updateSelectionHighlight() {
    const selectedPlayer = store.getSelectedPlayer();
    this.container?.querySelectorAll('.player-card').forEach(card => {
      const pId = card.dataset.playerId;
      const isSelected = selectedPlayer && pId === selectedPlayer.id;
      card.classList.toggle('is-selected', Boolean(isSelected));
    });
  }

  render() {
    this.container = this.container || document.getElementById(this.containerId);
    if (!this.container) return;

    const leagueTeams = store.getLeagueTeams();
    const currentTeam = store.getLeagueTeam(this.selectedTeamName) || leagueTeams[0];
    if (!currentTeam) return;

    const roster = currentTeam.roster || [];
    const spent = roster.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const budget = currentTeam.budget || 500;
    const remaining = budget - spent;
    const avgPrice = roster.length > 0 ? (spent / roster.length).toFixed(1) : '0';

    const counts = { P: 0, D: 0, C: 0, A: 0 };
    roster.forEach(p => {
      if (counts[p.role] !== undefined) counts[p.role]++;
    });

    const formationId = currentTeam.formationId || '3-4-3';
    const formation = FORMATIONS[formationId] || FORMATIONS['3-4-3'];

    this.container.innerHTML = `
      <div class="pitch-container" style="height: 100%; width: 100%; display: flex; flex-direction: column;">

        <!-- HEADER EDITORIAL MINIMAL (TOPBAR) -->
        <header class="topbar">
          <div>
            <p class="context">Asta 2026/27 · FantaLega (${leagueTeams.length} Squadre)</p>
            <div class="team-heading-row">
              <h1 class="team-title-heading" id="league-team-title">${sanitizeHtml(currentTeam.name.toUpperCase())}</h1>
              
              <span class="team-formation-badge">${sanitizeHtml(formationId)}</span>
            </div>
          </div>
          <div class="topbar-actions">
            <!-- Pulsante Apri Elenco Squadre Lega (Mobile) -->
            <button class="circle-button" id="league-hud-teams-btn" type="button" aria-label="Squadre Lega" title="Elenco Squadre FantaLega">
              <i class="fa-solid fa-shield-halved" style="font-size: 13px;"></i>
            </button>

            <!-- Toggle Vista Campo / Lista Reparti -->
            <button class="circle-button ${this.layoutMode === 'pitch' ? 'active' : ''}" id="league-toggle-layout-btn" type="button" aria-label="Alterna Campo / Lista Reparti" title="${this.layoutMode === 'pitch' ? 'Mostra Lista Reparti' : 'Mostra Campo Grafico'}">
              <i class="fa-solid ${this.layoutMode === 'pitch' ? 'fa-list' : 'fa-futbol'}" style="font-size: 14px;"></i>
            </button>

            <!-- Pulsante Apri Scheda Giocatore (Ispettore Destro / Right Slidebar) -->
            <button class="circle-button" id="league-toggle-inspector-btn" type="button" aria-label="Scheda Giocatore" title="Apri Scheda Giocatore">
              <i class="fa-solid fa-clipboard-user" style="font-size: 14px;"></i>
            </button>
          </div>
        </header>

        <div class="pitch-outer-wrapper ${this.layoutMode === 'pitch' ? 'is-pitch-mode' : ''}">

          <!-- BANNER TATTICO SQUADRA (Budget Stats & Quote) -->
          <div class="team-tactical-banner" id="league-tactical-banner">
            <div class="team-coach-ratings-row">
              <span class="team-coach-text" title="Rosa"><i class="fa-solid fa-users"></i> Rosa: <strong>${roster.length} calciatori</strong></span>
              <span class="tactical-rating-pill" title="Budget Iniziale"><i class="fa-solid fa-coins"></i> Budget: <strong>${budget} cr</strong></span>
              <span class="tactical-rating-pill" title="Crediti Spesi"><i class="fa-solid fa-arrow-trend-up"></i> Spesi: <strong style="color: #ea580c;">${spent} cr</strong></span>
              <span class="tactical-rating-pill" title="Crediti Rimanenti"><i class="fa-solid fa-wallet"></i> Rimanenti: <strong style="color: #16a34a;">${remaining} cr</strong></span>
              <span class="tactical-rating-pill" title="Costo Medio"><i class="fa-solid fa-calculator"></i> Media: <strong>${avgPrice} cr</strong></span>
            </div>

            <div class="team-specialists-group">
              <div class="tactical-spec-item" title="Portieri">
                <span class="spec-icon">🧤</span> <span class="spec-label">Por:</span> <strong class="spec-names" style="color: ${counts.P >= 3 ? '#16a34a' : 'inherit'};">${counts.P}/3</strong>
              </div>
              <div class="tactical-spec-item" title="Difensori">
                <span class="spec-icon">🛡️</span> <span class="spec-label">Dif:</span> <strong class="spec-names" style="color: ${counts.D >= 8 ? '#16a34a' : 'inherit'};">${counts.D}/8</strong>
              </div>
              <div class="tactical-spec-item" title="Centrocampisti">
                <span class="spec-icon">⚙️</span> <span class="spec-label">Cen:</span> <strong class="spec-names" style="color: ${counts.C >= 8 ? '#16a34a' : 'inherit'};">${counts.C}/8</strong>
              </div>
              <div class="tactical-spec-item" title="Attaccanti">
                <span class="spec-icon">⚡</span> <span class="spec-label">Att:</span> <strong class="spec-names" style="color: ${counts.A >= 6 ? '#16a34a' : 'inherit'};">${counts.A}/6</strong>
              </div>
              </div>

              <!-- Controlli Tattici Formazione & CSV Rose -->
              <div class="team-tool-group">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <!-- Selettore Modulo -->
                  <div class="topbar-formation-wrap" title="Cambia Modulo Tattico" style="height: 28px;">
                    <select id="league-formation-select" class="topbar-formation-select" aria-label="Cambia Modulo" style="height: 28px; padding: 2px 22px 2px 8px; font-size: 11px;">
                      ${FORMATION_LIST.map(f => `
                        <option value="${f.id}" ${f.id === formationId ? 'selected' : ''}>${f.id}</option>
                      `).join('')}
                    </select>
                    <span class="formation-arrow" style="font-size: 9px; right: 7px;">▾</span>
                  </div>

                  <!-- Pulsante Ottimizza Formazione (Schiera Miglior 11) -->
                  <button type="button" class="fanta-btn primary-btn btn-sm" id="league-optimize-lineup-btn" style="background: linear-gradient(135deg, #9333ea, #4f46e5); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 3px 10px; font-size: 11px; font-weight: 750; box-shadow: 0 2px 10px rgba(147, 51, 234, 0.35);" title="Calcola e schiera automaticamente i migliori 11 titolari per la giornata">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> <span>Miglior 11</span>
                  </button>

                  <!-- Carica CSV Rose -->
                  <button type="button" class="fanta-btn secondary-btn btn-sm" id="league-upload-csv-btn" style="padding: 3px 10px; font-size: 11px;" title="Aggiorna o carica file CSV rose">
                    <i class="fa-solid fa-file-csv"></i> Aggiorna Rose CSV
                  </button>
                </div>
            </div>

          </div>

          <!-- BARRA DI RICERCA EDITORIALE CON ICONA FILTRI MOBILE -->
          <div class="search-with-mobile-filter" style="${this.layoutMode === 'pitch' ? 'display: none !important;' : ''}">
            <div class="search" role="search" aria-label="Cerca giocatori">
              <svg class="search-icon" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input 
                type="text" 
                id="league-search-input" 
                class="search-input" 
                placeholder="Cerca calciatore o ruolo..." 
                value="${sanitizeHtml(this.searchQuery)}"
                autocomplete="off"
              />
              <button id="league-search-clear" class="search-clear ${this.searchQuery ? '' : 'hidden'}" aria-label="Pulisci ricerca">&times;</button>
            </div>

            <!-- Singola icona filtri per modalità Mobile -->
            <button type="button" class="circle-button pitch-mobile-filter-btn" id="league-open-filters-modal-btn" aria-label="Filtri" title="Filtri">
              <i class="fa-solid fa-sliders"></i>
              <span class="filter-indicator-dot ${this.activeRoleFilter !== 'ALL' || this.squadScope !== 'ALL' ? '' : 'hidden'}" id="league-filter-active-dot"></span>
            </button>
          </div>

          <!-- FILTRI RUOLI, SQUAD SCOPE & COLONNE A SCORRIMENTO ORIZZONTALE (DESKTOP) -->
          <nav class="filters" aria-label="Filtri giocatori" style="${this.layoutMode === 'pitch' ? 'display: none !important;' : ''}">
            <button class="filter ${this.activeRoleFilter === 'ALL' ? 'active' : ''}" data-role="ALL" type="button">Tutti · <span id="league-filter-total-count">${roster.length}</span></button>
            <button class="filter ${this.activeRoleFilter === 'ATT' ? 'active' : ''}" data-role="ATT" type="button">ATT</button>
            <button class="filter ${this.activeRoleFilter === 'CEN' ? 'active' : ''}" data-role="CEN" type="button">CEN</button>
            <button class="filter ${this.activeRoleFilter === 'DIF' ? 'active' : ''}" data-role="DIF" type="button">DIF</button>
            <button class="filter ${this.activeRoleFilter === 'POR' ? 'active' : ''}" data-role="POR" type="button">POR</button>

            <!-- Filtro Titolari / Panchina / Tutti -->
            <div class="squad-scope-selector" role="group" aria-label="Filtro titolari o panchina">
              <button type="button" class="squad-scope-btn ${this.squadScope === 'STARTERS' ? 'is-active' : ''}" data-scope="STARTERS" title="Mostra solo la formazione titolare">
                Titolari <span class="scope-count" id="league-scope-count-starters">${currentTeam.lineup ? Object.values(currentTeam.lineup).filter(Boolean).length : 11}</span>
              </button>
              <button type="button" class="squad-scope-btn ${this.squadScope === 'BENCH' ? 'is-active' : ''}" data-scope="BENCH" title="Mostra i giocatori in panchina">
                <i class="fa-solid fa-chair" style="font-size: 10px;"></i> Panchina <span class="scope-count" id="league-scope-count-bench">${Math.max(0, roster.length - (currentTeam.lineup ? Object.values(currentTeam.lineup).filter(Boolean).length : 11))}</span>
              </button>
              <button type="button" class="squad-scope-btn ${this.squadScope === 'ALL' ? 'is-active' : ''}" data-scope="ALL" title="Mostra tutti i calciatori della rosa (Titolari + Panchina)">
                Tutti <span class="scope-count" id="league-scope-count-all">${roster.length}</span>
              </button>
            </div>

            <!-- Selettore Colonne Lista -->
            <div class="section-columns-switcher" title="Disposizione colonne lista" style="margin-left: auto;">
              <span class="cols-label">Colonne</span>
              <div class="cols-button-group">
                <button type="button" class="col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
                <button type="button" class="col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
                <button type="button" class="col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
                <button type="button" class="col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
              </div>
            </div>
          </nav>

          <!-- CONTENUTO: CAMPO GRAFICO OPPURE LISTA REPARTI -->
          <div id="league-content-area" style="flex: 1; width: 100%; position: relative;">
            ${this.layoutMode === 'pitch' ? this.renderPitchView(formation, currentTeam) : this.renderListView(currentTeam)}
          </div>

        </div>

        <!-- MODALE FILTRI FANTALEGA (MOBILE) -->
        <div class="modal-backdrop hidden" id="league-filters-modal" role="dialog" aria-modal="true" aria-labelledby="league-filters-title">
          <div class="fanta-modal modal-sm">
            <div class="modal-header">
              <div class="modal-title-group">
                <i class="fa-solid fa-sliders modal-title-icon" style="color: var(--ink);"></i>
                <h3 id="league-filters-title">Filtri Rosa FantaLega</h3>
              </div>
              <button class="modal-close-btn" id="close-league-filters-btn" aria-label="Chiudi filtri">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="modal-body" style="padding: 18px 16px; display: flex; flex-direction: column; gap: 18px;">
              <!-- Sezione 1: Ruolo -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Ruolo</label>
                <div class="modal-filter-pills" style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button type="button" class="filter modal-league-role-btn ${this.activeRoleFilter === 'ALL' ? 'active' : ''}" data-role="ALL">Tutti</button>
                  <button type="button" class="filter modal-league-role-btn ${this.activeRoleFilter === 'ATT' ? 'active' : ''}" data-role="ATT">ATT</button>
                  <button type="button" class="filter modal-league-role-btn ${this.activeRoleFilter === 'CEN' ? 'active' : ''}" data-role="CEN">CEN</button>
                  <button type="button" class="filter modal-league-role-btn ${this.activeRoleFilter === 'DIF' ? 'active' : ''}" data-role="DIF">DIF</button>
                  <button type="button" class="filter modal-league-role-btn ${this.activeRoleFilter === 'POR' ? 'active' : ''}" data-role="POR">POR</button>
                </div>
              </div>

              <!-- Sezione 2: Ambito Formazione -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Ambito</label>
                <div class="squad-scope-selector" style="display: flex; width: 100%;">
                  <button type="button" class="squad-scope-btn modal-league-scope-btn ${this.squadScope === 'STARTERS' ? 'is-active' : ''}" data-scope="STARTERS" style="flex: 1; justify-content: center;">
                    Titolari <span class="scope-count" id="modal-league-scope-count-starters">${currentTeam.lineup ? Object.values(currentTeam.lineup).filter(Boolean).length : 11}</span>
                  </button>
                  <button type="button" class="squad-scope-btn modal-league-scope-btn ${this.squadScope === 'BENCH' ? 'is-active' : ''}" data-scope="BENCH" style="flex: 1; justify-content: center;">
                    <i class="fa-solid fa-chair" style="font-size: 10px;"></i> Panchina <span class="scope-count" id="modal-league-scope-count-bench">${Math.max(0, roster.length - (currentTeam.lineup ? Object.values(currentTeam.lineup).filter(Boolean).length : 11))}</span>
                  </button>
                  <button type="button" class="squad-scope-btn modal-league-scope-btn ${this.squadScope === 'ALL' ? 'is-active' : ''}" data-scope="ALL" style="flex: 1; justify-content: center;">
                    Tutti <span class="scope-count" id="modal-league-scope-count-all">${roster.length}</span>
                  </button>
                </div>
              </div>

              <!-- Sezione 3: Disposizione Colonne -->
              <div>
                <label style="font-size: 11px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block;">Disposizione Colonne</label>
                <div class="cols-button-group" style="display: inline-flex;">
                  <button type="button" class="col-btn modal-league-col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
                  <button type="button" class="col-btn modal-league-col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
                  <button type="button" class="col-btn modal-league-col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
                  <button type="button" class="col-btn modal-league-col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="fanta-btn secondary-btn" id="reset-league-filters-btn" type="button">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
              <button class="fanta-btn primary-btn" id="apply-league-filters-btn" type="button">
                <i class="fa-solid fa-check"></i> Applica
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  resolveRosterPlayer(item) {
    const found = store.getPlayer(item.fantacalcioId) || store.getPlayer(item.name);
    if (found) {
      const p = structuredClone ? structuredClone(found) : JSON.parse(JSON.stringify(found));
      p.purchasePrice = item.price;
      p.pricePaid = item.price;
      return p;
    }
    return {
      id: `player_${item.fantacalcioId || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      csvId: item.fantacalcioId,
      name: item.name,
      displayName: item.name,
      role: item.role,
      classicRole: item.role,
      fantaRole: item.role,
      mantraRole: item.mantraRole,
      teamName: item.club,
      purchasePrice: item.price,
      pricePaid: item.price,
      status: 'titolare',
      quotazioni: { qtA: item.qt, fvm: item.qt }
    };
  }

  renderPitchView(formation, currentTeam) {
    const selectedPlayer = store.getSelectedPlayer();
    const roster = (currentTeam.roster || []).map(item => this.resolveRosterPlayer(item));

    // Suddividi i calciatori per reparto per schierarli ordinatamente negli slot tattici
    const playersByRole = {
      POR: roster.filter(p => store.getRoleCategory(p) === 'P'),
      DIF: roster.filter(p => store.getRoleCategory(p) === 'D'),
      CEN: roster.filter(p => store.getRoleCategory(p) === 'C'),
      ATT: roster.filter(p => store.getRoleCategory(p) === 'A')
    };

    const rolePointers = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };

    const slotMap = new Map();
    formation.slots.forEach(slot => {
      const posX = slot.x !== undefined ? slot.x : (slot.left !== undefined ? slot.left : 50);
      const posY = slot.y !== undefined ? slot.y : (slot.top !== undefined ? slot.top : 50);
      slotMap.set(slot.id, { x: posX, y: posY });
    });

    let svgLinesHtml = '';
    if (formation.connections) {
      formation.connections.forEach(([slotAId, slotBId]) => {
        const posA = slotMap.get(slotAId);
        const posB = slotMap.get(slotBId);
        if (posA && posB) {
          svgLinesHtml += `
            <line 
              x1="${posA.x}" y1="${posA.y}" 
              x2="${posB.x}" y2="${posB.y}" 
              stroke="rgba(16, 16, 20, 0.25)" 
              stroke-width="0.35" 
              stroke-dasharray="1 0.6"
            />
          `;
        }
      });
    }

    const slotsHtml = formation.slots.map(slot => {
      let roleGroup = 'CEN';
      if (['POR', 'P'].includes(slot.role)) roleGroup = 'POR';
      else if (['DC', 'DD', 'DS', 'TD', 'TS', 'D'].includes(slot.role)) roleGroup = 'DIF';
      else if (['M', 'C', 'CC', 'MED', 'MZ', 'E', 'TRQ', 'T', 'W'].includes(slot.role)) roleGroup = 'CEN';
      else if (['PC', 'A', 'ATT'].includes(slot.role)) roleGroup = 'ATT';

      const player = playersByRole[roleGroup][rolePointers[roleGroup]];
      if (player) rolePointers[roleGroup]++;

      const isSelected = selectedPlayer && player && selectedPlayer.id === player.id;
      const posX = slot.x !== undefined ? slot.x : (slot.left !== undefined ? slot.left : 50);
      const posY = slot.y !== undefined ? slot.y : (slot.top !== undefined ? slot.top : 50);

      const cardEl = createPlayerCard(player, {
        slotId: slot.id,
        slotRole: slot.role || slot.label,
        isLineup: true,
        compact: true,
        isSelected
      });

      return `
        <div 
          class="pitch-slot-wrapper ${player ? 'is-occupied' : 'is-empty'} ${isSelected ? 'is-selected' : ''}"
          data-slot-id="${slot.id}"
          data-slot-role="${slot.role || slot.label}"
          data-player-id="${player ? player.id : ''}"
          style="left: ${posX}%; top: ${posY}%;"
        >
          ${cardEl.outerHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="soccer-pitch" style="display: block; position: relative; min-height: 580px; width: 100%;">
        <div class="pitch-grass-stripes"></div>
        <div class="pitch-lines">
          <div class="pitch-boundary"></div>
          <div class="halfway-line"></div>
          <div class="center-circle"></div>
          <div class="center-spot"></div>
          <div class="penalty-box top-box"></div>
          <div class="goal-box top-goal-box"></div>
          <div class="penalty-spot top-spot"></div>
          <div class="penalty-arc top-arc"></div>
          <div class="penalty-box bottom-box"></div>
          <div class="goal-box bottom-goal-box"></div>
          <div class="penalty-spot bottom-spot"></div>
          <div class="penalty-arc bottom-arc"></div>
        </div>
        <svg class="tactical-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g>${svgLinesHtml}</g>
        </svg>
        <div class="pitch-slots-layer" id="league-pitch-slots-layer" style="position: absolute; inset: 0;">
          ${slotsHtml}
        </div>
      </div>
    `;
  }

  renderListView(currentTeam) {
    const selectedPlayer = store.getSelectedPlayer();
    const roster = (currentTeam.roster || []).map(item => this.resolveRosterPlayer(item));
    const formationId = currentTeam.formationId || '3-4-3';
    const formation = FORMATIONS[formationId] || FORMATIONS['3-4-3'];

    // Calcola titolari e riserve
    let starters = [];
    let bench = [];
    if (currentTeam.lineup && Object.keys(currentTeam.lineup).length > 0) {
      const lineupPlayerIds = new Set(Object.values(currentTeam.lineup).map(p => p?.id).filter(Boolean));
      starters = roster.filter(p => lineupPlayerIds.has(p.id));
      bench = roster.filter(p => !lineupPlayerIds.has(p.id));
    } else {
      const countsNeeded = { P: formation.roles?.P || 1, D: formation.roles?.D || 3, C: formation.roles?.C || 4, A: formation.roles?.A || 3 };
      const startersSet = new Set();
      ['P', 'D', 'C', 'A'].forEach(cat => {
        const pool = roster.filter(p => store.getRoleCategory(p) === cat);
        const needed = countsNeeded[cat] || 0;
        pool.slice(0, needed).forEach(p => {
          startersSet.add(p.id);
          starters.push(p);
        });
      });
      bench = roster.filter(p => !startersSet.has(p.id));
    }

    let targetItems = roster;
    if (this.squadScope === 'STARTERS') {
      targetItems = starters;
    } else if (this.squadScope === 'BENCH') {
      targetItems = bench;
    }

    // Filtra per ricerca
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      targetItems = targetItems.filter(p => {
        return (p.name || '').toLowerCase().includes(q) ||
          (p.displayName || '').toLowerCase().includes(q) ||
          (p.teamName || '').toLowerCase().includes(q) ||
          (p.role || '').toLowerCase().includes(q);
      });
    }

    // Filtra per ruolo
    if (this.activeRoleFilter !== 'ALL') {
      targetItems = targetItems.filter(p => store.getRoleCategory(p) === this.activeRoleFilter);
    }

    const departments = [
      { code: 'P', name: 'Portieri', items: targetItems.filter(p => store.getRoleCategory(p) === 'P') },
      { code: 'D', name: 'Difensori', items: targetItems.filter(p => store.getRoleCategory(p) === 'D') },
      { code: 'C', name: 'Centrocampisti', items: targetItems.filter(p => store.getRoleCategory(p) === 'C') },
      { code: 'A', name: 'Attaccanti', items: targetItems.filter(p => store.getRoleCategory(p) === 'A') }
    ];

    if (targetItems.length === 0) {
      return `
        <div class="inspector-empty-state" style="padding: 40px 20px; text-align: center;">
          <div class="empty-icon-circle"><i class="fa-solid fa-users-slash"></i></div>
          <h3>Nessun calciatore trovato</h3>
          <p>Nessun giocatore della rosa corrisponde ai filtri impostati.</p>
        </div>
      `;
    }

    let html = '';
    departments.forEach(dept => {
      if (dept.items.length === 0) return;
      const deptSuffix = this.squadScope === 'BENCH' ? 'in Panchina' : (this.squadScope === 'STARTERS' ? 'Titolari' : '');
      html += `
        <div class="section-header" style="margin-top: 14px; margin-bottom: 8px;">
          <h2>${dept.name} ${deptSuffix ? `<span style="font-size: 11px; opacity: 0.7; font-weight: normal; margin-left: 4px;">(${deptSuffix})</span>` : ''}</h2>
          <span>${dept.items.length} ${this.squadScope === 'BENCH' ? 'riserve' : 'calciatori'}</span>
        </div>
        <div class="player-list cols-${this.gridColumns}">
          ${dept.items.map(player => {
            const isSelected = selectedPlayer && selectedPlayer.id === player.id;
            const cardEl = createPlayerCard(player, {
              isLineup: false,
              isSelected,
              showTeam: true
            });
            return cardEl.outerHTML;
          }).join('')}
        </div>
      `;
    });

    return html;
  }

  bindEvents() {
    // Ottimizza Formazione (Schiera Miglior 11 per la squadra selezionata)
    this.container.querySelector('#league-optimize-lineup-btn')?.addEventListener('click', () => {
      const currentTeam = store.getLeagueTeam(this.selectedTeamName);
      if (!currentTeam || !currentTeam.roster || currentTeam.roster.length < 11) {
        notify.warning('Rosa incompleta: servono almeno 11 calciatori per ottimizzare la formazione.');
        return;
      }

      const fullPlayers = currentTeam.roster.map(p => this.resolveRosterPlayer(p));
      const result = LineupOptimizer.optimize(fullPlayers);
      if (result) {
        currentTeam.formationId = result.formationId;
        currentTeam.lineup = result.lineup;
        currentTeam.bench = result.bench;
        store.saveLeagueTeamsToStorage();
        store.emit('league:updated', store.getLeagueTeams());
        notify.success(`⚡ Formazione di ${currentTeam.name} ottimizzata! Modulo: ${result.formationId} (Punteggio: ${result.totalScore})`);
        this.render();
      } else {
        notify.error('Impossibile ottimizzare: non ci sono abbastanza calciatori per i ruoli richiesti.');
      }
    });

    // Formazione switch
    const formSelect = this.container.querySelector('#league-formation-select');
    formSelect?.addEventListener('change', (e) => {
      const team = store.getLeagueTeam(this.selectedTeamName);
      if (team) {
        team.formationId = e.target.value;
        store.saveLeagueTeamsToStorage();
        this.render();
      }
    });

    // Toggle Vista Campo / Lista
    this.container.querySelector('#league-toggle-layout-btn')?.addEventListener('click', () => {
      this.layoutMode = this.layoutMode === 'pitch' ? 'list' : 'pitch';
      this.render();
    });

    // Toggle Scheda Giocatore (Ispettore Destro / Right Slidebar)
    this.container.querySelector('#league-toggle-inspector-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sidebarInspector = document.querySelector('#sidebar-inspector');
      const sidebarTeams = document.querySelector('#sidebar-teams');
      const backdrop = document.querySelector('#mobile-drawer-backdrop');

      if (window.innerWidth <= 900) {
        if (sidebarInspector?.classList.contains('mobile-open')) {
          sidebarInspector?.classList.remove('mobile-open');
          backdrop?.classList.add('hidden');
        } else {
          sidebarInspector?.classList.add('mobile-open');
          sidebarTeams?.classList.remove('mobile-open');
          backdrop?.classList.remove('hidden');
        }
      } else {
        document.body.classList.toggle('right-sidebar-collapsed');
      }
    });

    // Toggle Elenco Squadre Lega (Mobile Left Drawer)
    this.container.querySelector('#league-hud-teams-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sidebarTeams = document.querySelector('#sidebar-teams');
      const sidebarInspector = document.querySelector('#sidebar-inspector');
      const backdrop = document.querySelector('#mobile-drawer-backdrop');

      if (window.innerWidth <= 900) {
        if (sidebarTeams?.classList.contains('mobile-open')) {
          sidebarTeams?.classList.remove('mobile-open');
          backdrop?.classList.add('hidden');
        } else {
          sidebarTeams?.classList.add('mobile-open');
          sidebarInspector?.classList.remove('mobile-open');
          backdrop?.classList.remove('hidden');
        }
      } else {
        document.body.classList.toggle('left-sidebar-collapsed');
      }
    });

    // Ricerca Giocatori nella Rosa FantaLega
    const searchInput = this.container.querySelector('#league-search-input');
    const searchClear = this.container.querySelector('#league-search-clear');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      searchClear?.classList.toggle('hidden', !this.searchQuery);
      this.updateListViewContent();
    });
    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      searchClear.classList.add('hidden');
      this.updateListViewContent();
    });

    // Filtro Ruoli Desktop
    const filterBtns = this.container.querySelectorAll('.filters .filter[data-role]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeRoleFilter = btn.dataset.role;
        this.updateListViewContent();
      });
    });

    // Filtro Titolari / Panchina / Tutti
    this.container.querySelectorAll('.squad-scope-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.squadScope = btn.dataset.scope || 'ALL';
        this.updateListViewContent();
      });
    });

    // Selettore Colonne Lista
    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cols = Number(btn.dataset.cols) || 2;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_league_cols', cols);
        }
        this.updateListViewContent();
      });
    });

    // Modale Filtri Mobile FantaLega
    const openModalBtn = this.container.querySelector('#league-open-filters-modal-btn');
    const filtersModal = this.container.querySelector('#league-filters-modal');
    const closeModalBtn = this.container.querySelector('#close-league-filters-btn');
    const applyModalBtn = this.container.querySelector('#apply-league-filters-btn');
    const resetModalBtn = this.container.querySelector('#reset-league-filters-btn');

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

    // Filtri Ruoli nella Modale Mobile
    this.container.querySelectorAll('.modal-league-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.modal-league-role-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeRoleFilter = btn.dataset.role;

        this.container.querySelectorAll('.filters .filter[data-role]').forEach(b => {
          b.classList.toggle('active', b.dataset.role === this.activeRoleFilter);
        });

        this.updateListViewContent();
      });
    });

    // Reset Filtri nella Modale
    resetModalBtn?.addEventListener('click', () => {
      this.activeRoleFilter = 'ALL';
      this.squadScope = 'ALL';
      this.gridColumns = 2;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fantaoliva_league_cols', 2);
      }
      this.container.querySelectorAll('.filters .filter[data-role]').forEach(b => {
        b.classList.toggle('active', b.dataset.role === 'ALL');
      });
      this.container.querySelectorAll('.modal-league-role-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.role === 'ALL');
      });
      this.updateListViewContent();
    });

    // Carica/Aggiorna Rose CSV
    this.container.querySelector('#league-upload-csv-btn')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const content = evt.target.result;
            const success = store.importLeagueRostersFromCsv(content);
            if (success) {
              notify.success('Rose della Lega importate e aggiornate con successo!');
              this.render();
            } else {
              notify.error('Formato file CSV non valido.');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });

    // Player Card click events -> apre l'ispettore a destra
    this.bindCardEvents();
  }

  bindCardEvents() {
    this.container.querySelectorAll('.player-card[data-player-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = card.dataset.playerId;
        const slotId = card.dataset.slotId;
        if (playerId) {
          store.selectPlayer(playerId, slotId);
          if (document.body.classList.contains('right-sidebar-collapsed')) {
            document.body.classList.remove('right-sidebar-collapsed');
          }
          const sidebarInspector = document.querySelector('#sidebar-inspector');
          const backdrop = document.querySelector('#mobile-drawer-backdrop');
          if (window.innerWidth <= 900) {
            sidebarInspector?.classList.add('mobile-open');
            backdrop?.classList.remove('hidden');
          }
        }
      });
    });
  }

  updateListViewContent() {
    const currentTeam = store.getLeagueTeam(this.selectedTeamName);
    if (!currentTeam) return;

    const contentArea = this.container.querySelector('#league-content-area');
    if (contentArea && this.layoutMode === 'list') {
      contentArea.innerHTML = this.renderListView(currentTeam);
      this.bindCardEvents();
    }

    this.syncFilterControls(currentTeam);
  }

  syncFilterControls(currentTeam) {
    if (!currentTeam) return;
    const roster = (currentTeam.roster || []).map(item => this.resolveRosterPlayer(item));
    const startersCount = currentTeam.lineup ? Object.values(currentTeam.lineup).filter(Boolean).length : 11;
    const benchCount = Math.max(0, roster.length - startersCount);

    const totalCountEl = this.container.querySelector('#league-filter-total-count');
    if (totalCountEl) totalCountEl.textContent = roster.length;

    const startersCountEl = this.container.querySelector('#league-scope-count-starters');
    if (startersCountEl) startersCountEl.textContent = startersCount;
    const modalStartersCountEl = this.container.querySelector('#modal-league-scope-count-starters');
    if (modalStartersCountEl) modalStartersCountEl.textContent = startersCount;

    const benchCountEl = this.container.querySelector('#league-scope-count-bench');
    if (benchCountEl) benchCountEl.textContent = benchCount;
    const modalBenchCountEl = this.container.querySelector('#modal-league-scope-count-bench');
    if (modalBenchCountEl) modalBenchCountEl.textContent = benchCount;

    const allCountEl = this.container.querySelector('#league-scope-count-all');
    if (allCountEl) allCountEl.textContent = roster.length;
    const modalAllCountEl = this.container.querySelector('#modal-league-scope-count-all');
    if (modalAllCountEl) modalAllCountEl.textContent = roster.length;

    this.container.querySelectorAll('.squad-scope-btn').forEach(btn => {
      btn.classList.toggle('is-active', (btn.dataset.scope || 'ALL') === this.squadScope);
    });

    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.classList.toggle('is-active', Number(btn.dataset.cols) === this.gridColumns);
    });

    this.container.querySelectorAll('.modal-league-role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === this.activeRoleFilter);
    });

    const activeDot = this.container.querySelector('#league-filter-active-dot');
    if (activeDot) {
      activeDot.classList.toggle('hidden', this.activeRoleFilter === 'ALL' && this.squadScope === 'ALL');
    }
  }
}
