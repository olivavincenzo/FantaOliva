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
            <!-- Toggle Vista Campo / Lista Reparti -->
            <button class="circle-button ${this.layoutMode === 'pitch' ? 'active' : ''}" id="league-toggle-layout-btn" type="button" aria-label="Alterna Campo / Lista Reparti" title="${this.layoutMode === 'pitch' ? 'Mostra Lista Reparti' : 'Mostra Campo Grafico'}">
              <i class="fa-solid ${this.layoutMode === 'pitch' ? 'fa-list' : 'fa-futbol'}" style="font-size: 14px;"></i>
            </button>
          </div>
        </header>

        <div class="pitch-outer-wrapper ${this.layoutMode === 'pitch' ? 'is-pitch-mode' : ''}">

          <!-- BARRA SELETTORE SQUADRE LEGA (Pill Switcher) -->
          <nav class="filters league-teams-nav" style="margin-bottom: 10px;" aria-label="Selettore Squadre FantaLega">
            ${leagueTeams.map(t => {
      const isSelected = t.name.toUpperCase() === currentTeam.name.toUpperCase();
      return `
                <button 
                  type="button" 
                  class="filter ${isSelected ? 'active' : ''}" 
                  data-league-team="${sanitizeHtml(t.name)}"
                  style="${t.name.toUpperCase() === 'VINCENZO' ? 'font-weight: 800; border-color: #22c55e;' : ''}"
                >
                  ${t.name.toUpperCase() === 'VINCENZO' ? '⭐ ' : '🛡️ '}${sanitizeHtml(t.name)}
                </button>
              `;
    }).join('')}
          </nav>

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

              <!-- Controlli Tattici Formazione & CSV Rose -->
              <div style="margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
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

          <!-- CONTENUTO: CAMPO GRAFICO OPPURE LISTA REPARTI -->
          <div id="league-content-area" style="flex: 1; width: 100%; position: relative;">
            ${this.layoutMode === 'pitch' ? this.renderPitchView(formation, currentTeam) : this.renderListView(currentTeam)}
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

    const departments = [
      { code: 'P', name: 'Portieri', items: roster.filter(p => store.getRoleCategory(p) === 'P') },
      { code: 'D', name: 'Difensori', items: roster.filter(p => store.getRoleCategory(p) === 'D') },
      { code: 'C', name: 'Centrocampisti', items: roster.filter(p => store.getRoleCategory(p) === 'C') },
      { code: 'A', name: 'Attaccanti', items: roster.filter(p => store.getRoleCategory(p) === 'A') }
    ];

    let html = `
      <div class="list-view-header-bar" style="margin-bottom: 12px;">
        <div class="section-head-title">
          <div class="section-title-wrap">
            <h2>ROSA COMPLETA · ${sanitizeHtml(currentTeam.name)}</h2>
            <span class="head-count">${roster.length} calciatori</span>
          </div>
        </div>
        <div class="section-columns-switcher" title="Disposizione colonne lista">
          <span class="cols-label">Colonne</span>
          <div class="cols-button-group">
            <button type="button" class="col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
            <button type="button" class="col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
            <button type="button" class="col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
            <button type="button" class="col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
          </div>
        </div>
      </div>
    `;

    departments.forEach(dept => {
      html += `
        <div class="section-header" style="margin-top: 14px; margin-bottom: 8px;">
          <h2>${dept.name}</h2>
          <span>${dept.items.length} calciatori</span>
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
    // Switcher Squadre FantaLega
    this.container.querySelectorAll('.league-teams-nav button[data-league-team]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedTeamName = btn.dataset.leagueTeam;
        this.render();
      });
    });

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

    // Column switcher in list view
    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = Number(btn.dataset.cols) || 2;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_league_cols', cols);
        }
        this.render();
      });
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
}
