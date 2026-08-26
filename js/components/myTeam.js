/**
 * Componente Lavagna Tattica & Gestione Rosa Personale "La Mia Rosa"
 */

import { store } from '../store.js';
import { FORMATIONS, FORMATION_LIST } from '../data/formations.js';
import { createPlayerCard } from './playerCard.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class MyTeamComponent {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.layoutMode = 'pitch'; // 'pitch' | 'list'
    this.is3D = (typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_myteam_3d') === 'true' : false);
    this.squadScope = 'STARTERS'; // 'STARTERS' | 'BENCH' | 'ALL'
    this.activeRoleFilter = 'ALL';
    this.gridColumns = Number((typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_myteam_cols') : null) || 2);
    this.searchQuery = '';
  }

  init() {
    this.container = this.container || document.getElementById(this.containerId);
    if (!this.container) return;

    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('myteam:updated', () => this.render());
    store.subscribe('player:selected', () => this.highlightSelectedPlayer());
    store.subscribe('view:changed', (view) => {
      if (view === 'myteam') {
        this.render();
      }
    });
  }

  render() {
    this.container = this.container || document.getElementById(this.containerId);
    if (!this.container) return;

    const myTeam = store.getMyTeam();
    const stats = store.getMyTeamStats();
    const formation = FORMATIONS[myTeam.formationId] || FORMATIONS['3-4-3'];

    this.container.innerHTML = `
      <div class="pitch-container" style="height: 100%; width: 100%; display: flex; flex-direction: column;">

        <!-- HEADER EDITORIAL MINIMAL (TOPBAR) -->
        <header class="topbar">
          <div>
            <p class="context">Asta 2026/27 · Rosa Personalizzata</p>
            <div class="team-heading-row">
              <h1 class="team-title-heading" id="myteam-watermark-title">${sanitizeHtml((myTeam.name || 'LA MIA ROSA').toUpperCase())}</h1>
              <button type="button" class="btn-edit-tier" id="edit-myteam-name-btn" title="Rinomina squadra" style="padding: 2px 7px; font-size: 0.70rem;">
                <i class="fa-solid fa-pencil"></i>
              </button>
              <span class="team-formation-badge" id="myteam-formation-badge">${sanitizeHtml(myTeam.formationId || '3-4-3')}</span>
            </div>
          </div>
          <div class="topbar-actions">
            <!-- Selettore Modulo Topbar -->
            <div class="topbar-formation-wrap" title="Cambia Modulo Tattico">
              <select id="myteam-formation-select" class="topbar-formation-select" aria-label="Cambia Modulo">
                ${FORMATION_LIST.map(f => `
                  <option value="${f.id}" ${f.id === myTeam.formationId ? 'selected' : ''}>${f.id}</option>
                `).join('')}
              </select>
              <span class="formation-arrow">▾</span>
            </div>

            <!-- Toggle Vista Campo / Lista Reparti -->
            <button class="circle-button ${this.layoutMode === 'pitch' ? 'active' : ''}" id="myteam-toggle-layout-btn" type="button" aria-label="Alterna Campo / Lista Reparti" title="${this.layoutMode === 'pitch' ? 'Mostra Lista Reparti' : 'Mostra Campo Grafico'}">
              <i class="fa-solid ${this.layoutMode === 'pitch' ? 'fa-list' : 'fa-futbol'}" style="font-size: 14px;"></i>
            </button>

            <!-- Toggle Visuale 3D -->
            ${this.layoutMode === 'pitch' ? `
              <button class="circle-button ${this.is3D ? 'active' : ''}" id="myteam-toggle-3d-btn" type="button" aria-label="Prospettiva 3D" title="Alterna visuale 3D / 2D">
                <i class="fa-solid fa-cube" style="font-size: 14px;"></i>
              </button>
            ` : ''}
          </div>
        </header>

        <div class="pitch-outer-wrapper ${this.layoutMode === 'pitch' ? 'is-pitch-mode' : ''}">

          <!-- BANNER TATTICO SQUADRA (Rosa Summary, Budget Stats, Quote & Note) -->
          <div class="team-tactical-banner" id="myteam-tactical-banner">
            <div class="team-coach-ratings-row">
              <span class="team-coach-text" title="Riepilogo Rosa"><i class="fa-solid fa-shield-halved"></i> Rosa: <strong>${stats.totalPlayers} calciatori</strong> (${stats.startersCount} titolari · ${stats.benchCount} riserve)</span>
              <span class="tactical-rating-pill" id="myteam-budget-pill" style="cursor: pointer;" title="Clicca per modificare budget asta (es. 500 o 1000)"><i class="fa-solid fa-coins"></i> Budget: <strong>${stats.budget} cr</strong></span>
              <span class="tactical-rating-pill" title="Crediti spesi totali"><i class="fa-solid fa-arrow-trend-up"></i> Spesi: <strong style="color: #ea580c;">${stats.spent} cr</strong></span>
              <span class="tactical-rating-pill" title="Crediti rimanenti per l'asta"><i class="fa-solid fa-wallet"></i> Rimanenti: <strong style="color: #16a34a;">${stats.remaining} cr</strong></span>
              <span class="tactical-rating-pill" title="Costo medio per calciatore"><i class="fa-solid fa-calculator"></i> Media: <strong>${stats.avgPrice} cr</strong></span>
            </div>

            <div class="team-specialists-group">
              <div class="tactical-spec-item" title="Quote Portieri (consigliati 3)">
                <span class="spec-icon">🧤</span> <span class="spec-label">Por:</span> <strong class="spec-names" style="color: ${stats.counts.P >= 3 ? '#16a34a' : 'inherit'};">${stats.counts.P}/3</strong>
              </div>
              <div class="tactical-spec-item" title="Quote Difensori (consigliati 8)">
                <span class="spec-icon">🛡️</span> <span class="spec-label">Dif:</span> <strong class="spec-names" style="color: ${stats.counts.D >= 8 ? '#16a34a' : 'inherit'};">${stats.counts.D}/8</strong>
              </div>
              <div class="tactical-spec-item" title="Quote Centrocampisti (consigliati 8)">
                <span class="spec-icon">⚙️</span> <span class="spec-label">Cen:</span> <strong class="spec-names" style="color: ${stats.counts.C >= 8 ? '#16a34a' : 'inherit'};">${stats.counts.C}/8</strong>
              </div>
              <div class="tactical-spec-item" title="Quote Attaccanti (consigliati 6)">
                <span class="spec-icon">⚡</span> <span class="spec-label">Att:</span> <strong class="spec-names" style="color: ${stats.counts.A >= 6 ? '#16a34a' : 'inherit'};">${stats.counts.A}/6</strong>
              </div>

              <!-- Azioni Rapide Toolbar (Aggiungi e Svuota Rosa) -->
              <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
                <button type="button" class="fanta-btn primary-btn btn-sm" id="myteam-add-player-btn" style="padding: 3px 10px; font-size: 11px;">
                  <i class="fa-solid fa-user-plus"></i> Aggiungi Calciatore
                </button>
                ${stats.totalPlayers > 0 ? `
                  <button type="button" class="fanta-btn secondary-btn btn-sm" id="myteam-clear-roster-btn" title="Svuota la tua rosa" style="padding: 3px 8px; font-size: 11px;">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                ` : ''}
              </div>
            </div>

          </div>

          <!-- CONTENUTO: CAMPO GRAFICO OPPURE LISTA REPARTI -->
          <div id="myteam-content-area" style="flex: 1; width: 100%; position: relative;">
            ${this.layoutMode === 'pitch' ? this.renderPitchView(formation, myTeam) : this.renderListView(myTeam)}
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  }

  renderPitchView(formation, myTeam) {
    const selectedPlayer = store.getSelectedPlayer();

    // Map di coordinate percentuali (x, y) per le linee tattiche
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
      const player = myTeam.lineup?.[slot.id];
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
          style="left: ${posX}%; top: ${posY}%;"
        >
          ${cardEl.outerHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="soccer-pitch ${this.is3D ? 'is-3d-pitch' : ''}" style="display: block; position: relative; min-height: 580px; width: 100%;">
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
        <div class="pitch-slots-layer" id="myteam-pitch-slots-layer" style="position: absolute; inset: 0;">
          ${slotsHtml}
        </div>
      </div>
    `;
  }

  renderListView(myTeam) {
    const starters = Object.values(myTeam.lineup || {}).filter(Boolean);
    const bench = (myTeam.bench || []).filter(Boolean);
    const allPlayers = [...starters, ...bench];
    const selectedPlayer = store.getSelectedPlayer();

    let targetPlayers = allPlayers;
    if (this.squadScope === 'STARTERS') {
      targetPlayers = starters;
    } else if (this.squadScope === 'BENCH') {
      targetPlayers = bench;
    }

    const departments = [
      { key: 'P', name: 'Portieri', items: [] },
      { key: 'D', name: 'Difensori', items: [] },
      { key: 'C', name: 'Centrocampisti', items: [] },
      { key: 'A', name: 'Attaccanti', items: [] }
    ];

    targetPlayers.forEach(p => {
      const cat = store.getRoleCategory(p);
      const dept = departments.find(d => d.key === cat) || departments[1];
      dept.items.push(p);
    });

    return `
      <div class="list-view-header-bar" style="margin-bottom: 12px;">
        <div class="section-head-title">
          <div class="section-title-wrap">
            <h2>${this.squadScope === 'BENCH' ? 'Panchina' : (this.squadScope === 'STARTERS' ? 'Titolari' : 'Rosa Completa')}</h2>
            <span class="head-count">${targetPlayers.length} calciatori</span>
          </div>
          <div class="squad-scope-selector" role="group">
            <button type="button" class="squad-scope-btn ${this.squadScope === 'STARTERS' ? 'is-active' : ''}" data-scope="STARTERS">
              Titolari <span class="scope-count">${starters.length}</span>
            </button>
            <button type="button" class="squad-scope-btn ${this.squadScope === 'BENCH' ? 'is-active' : ''}" data-scope="BENCH">
              <i class="fa-solid fa-chair" style="font-size: 10px;"></i> Panchina <span class="scope-count">${bench.length}</span>
            </button>
            <button type="button" class="squad-scope-btn ${this.squadScope === 'ALL' ? 'is-active' : ''}" data-scope="ALL">
              Tutti <span class="scope-count">${allPlayers.length}</span>
            </button>
          </div>
        </div>

        <div class="section-columns-switcher">
          <span class="cols-label">Colonne</span>
          <div class="cols-button-group">
            <button type="button" class="col-btn ${this.gridColumns === 1 ? 'is-active' : ''}" data-cols="1">1</button>
            <button type="button" class="col-btn ${this.gridColumns === 2 ? 'is-active' : ''}" data-cols="2">2</button>
            <button type="button" class="col-btn ${this.gridColumns === 3 ? 'is-active' : ''}" data-cols="3">3</button>
            <button type="button" class="col-btn ${this.gridColumns === 4 ? 'is-active' : ''}" data-cols="4">4</button>
          </div>
        </div>
      </div>

      <div class="pitch-vertical-list-container" style="display: flex; flex-direction: column; gap: 14px;">
        ${allPlayers.length === 0 ? `
          <div style="text-align: center; padding: 48px 16px; background: var(--paper); border-radius: var(--radius-lg); border: 1px dashed var(--line);">
            <div style="font-size: 2.2rem; color: #22c55e; margin-bottom: 10px;">🛡️</div>
            <h3 style="font-size: 1.1rem; font-weight: 750; color: var(--ink); margin-bottom: 6px;">La tua rosa è ancora vuota!</h3>
            <p style="font-size: 0.84rem; color: var(--muted); max-width: 420px; margin: 0 auto 16px;">
              Aggiungi i tuoi calciatori acquistati all'asta direttamente dal listone o dalla ricerca per creare la tua formazione dei sogni.
            </p>
            <button type="button" class="fanta-btn primary-btn" id="myteam-add-empty-btn">
              <i class="fa-solid fa-user-plus"></i> Inizia ad Aggiungere Calciatori
            </button>
          </div>
        ` : departments.map(dept => {
          if (dept.items.length === 0) return '';
          return `
            <div class="section-header">
              <h2>${sanitizeHtml(dept.name)} ${this.squadScope === 'BENCH' ? '(in Panchina)' : ''}</h2>
              <span>${dept.items.length} giocatori</span>
            </div>
            <section class="player-list cols-${this.gridColumns}">
              ${dept.items.map(p => {
                const isLineup = Object.values(myTeam.lineup || {}).some(lp => lp && lp.id === p.id);
                const isSelected = selectedPlayer && selectedPlayer.id === p.id;
                const cardEl = createPlayerCard(p, {
                  isLineup,
                  isSelected
                });
                return cardEl.outerHTML;
              }).join('')}
            </section>
          `;
        }).join('')}
      </div>
    `;
  }

  bindEvents() {
    // Formazione switch
    const formSelect = this.container.querySelector('#myteam-formation-select');
    formSelect?.addEventListener('change', (e) => {
      store.setMyTeamFormation(e.target.value);
    });

    // Toggle Vista Campo / Lista
    this.container.querySelector('#myteam-toggle-layout-btn')?.addEventListener('click', () => {
      this.layoutMode = this.layoutMode === 'pitch' ? 'list' : 'pitch';
      this.render();
    });

    // 3D Perspective Toggle
    this.container.querySelector('#myteam-toggle-3d-btn')?.addEventListener('click', () => {
      this.is3D = !this.is3D;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fantaoliva_myteam_3d', String(this.is3D));
      }
      this.render();
    });

    // Scope switcher in list view
    this.container.querySelectorAll('.squad-scope-btn[data-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.squadScope = btn.dataset.scope || 'STARTERS';
        this.render();
      });
    });

    // Column switcher in list view
    this.container.querySelectorAll('.col-btn[data-cols]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = Number(btn.dataset.cols) || 2;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_myteam_cols', cols);
        }
        this.render();
      });
    });

    // Edit Name
    this.container.querySelector('#edit-myteam-name-btn')?.addEventListener('click', () => {
      const currentName = store.getMyTeam().name || 'La Mia Rosa';
      const newName = window.prompt('Inserisci il nome della tua squadra:', currentName);
      if (newName !== null && newName.trim()) {
        store.setMyTeamName(newName.trim());
        notify.success(`Nome squadra aggiornato in "${newName.trim()}"!`);
      }
    });

    // Edit Budget
    this.container.querySelector('#myteam-budget-pill')?.addEventListener('click', () => {
      const currentBudget = store.getMyTeam().budget || 500;
      const newBudget = window.prompt('Imposta il budget iniziale dell\'asta (es. 500 o 1000):', currentBudget);
      if (newBudget !== null && !isNaN(Number(newBudget)) && Number(newBudget) > 0) {
        store.setMyTeamBudget(Number(newBudget));
        notify.success(`Budget asta impostato a ${Number(newBudget)} crediti!`);
      }
    });

    // Add player buttons (attivo solo in Lista Reparti per cercare nel Database)
    const openAddModal = () => {
      store.selectedSlotId = null;
      const modal = document.querySelector('#add-player-modal');
      if (modal) modal.classList.remove('hidden');
    };
    this.container.querySelector('#myteam-add-player-btn')?.addEventListener('click', openAddModal);
    this.container.querySelector('#myteam-add-empty-btn')?.addEventListener('click', openAddModal);

    // Slot click events (sia vuoti che occupati)
    this.container.querySelectorAll('.pitch-slot-wrapper').forEach(slotWrapper => {
      slotWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotId = slotWrapper.dataset.slotId;
        const slotRole = slotWrapper.dataset.slotRole;
        const card = slotWrapper.querySelector('.player-card');
        const playerId = card?.dataset.playerId;

        if (playerId) {
          const player = store.getPlayer(playerId);
          if (player) {
            store.selectPlayer(player.id, slotId);
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
        } else {
          // Slot vuoto -> apri selettore per schierare dalla panchina
          this.openRosterSlotPicker(slotId, slotRole);
        }
      });

      // Doppio click su slot occupato per sostituire
      slotWrapper.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const slotId = slotWrapper.dataset.slotId;
        const slotRole = slotWrapper.dataset.slotRole;
        this.openRosterSlotPicker(slotId, slotRole);
      });
    });

    // Svuota Rosa
    this.container.querySelector('#myteam-clear-roster-btn')?.addEventListener('click', () => {
      if (window.confirm('Sei sicuro di voler rimuovere tutti i calciatori da "La Mia Rosa"?')) {
        const mt = store.getMyTeam();
        mt.lineup = {};
        mt.bench = [];
        store.saveMyTeamToStorage();
        store.emit('myteam:updated', mt);
        notify.info('La tua rosa è stata svuotata.');
      }
    });

    // Player Card click events inside pitch & list
    this.container.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = card.dataset.playerId;
        const slotId = card.dataset.slotId;
        if (playerId) {
          const player = store.getPlayer(playerId);
          if (player) {
            store.selectPlayer(player.id, slotId);
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
        }
      });
    });
  }

  openRosterSlotPicker(slotId, slotRole) {
    const myTeam = store.getMyTeam();
    const currentOccupant = myTeam.lineup?.[slotId];

    // Categoria ruolo macro ('P', 'D', 'C', 'A')
    const targetRole = store.getRoleCategory(slotRole);

    // Trova i calciatori in panchina della Mia Rosa compatibili per ruolo
    const availablePlayers = (myTeam.bench || []).filter(p => {
      if (!p) return false;
      return store.getRoleCategory(p) === targetRole;
    });

    const existingBackdrop = document.querySelector('#myteam-roster-selector-modal');
    if (existingBackdrop) existingBackdrop.remove();

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'myteam-roster-selector-modal';
    modalBackdrop.className = 'myteam-roster-selector-backdrop';

    const roleName = targetRole === 'P' ? 'Portiere' : targetRole === 'D' ? 'Difensore' : targetRole === 'C' ? 'Centrocampista' : 'Attaccante';

    modalBackdrop.innerHTML = `
      <div class="myteam-roster-selector-card">
        <div class="myteam-roster-header">
          <div class="myteam-roster-title">
            <h3>Schiera ${roleName} Titolare (${slotRole})</h3>
            <p>Seleziona un calciatore dalla panchina della tua rosa</p>
          </div>
          <button type="button" class="modal-close-btn" id="close-roster-picker-btn">&times;</button>
        </div>

        <div class="myteam-roster-body">
          ${currentOccupant ? `
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--line); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.78rem; color: var(--muted);">Titolare attuale: <strong>${sanitizeHtml(currentOccupant.displayName || currentOccupant.name)}</strong></span>
              <button type="button" class="fanta-btn secondary-btn btn-sm" id="btn-unassign-slot" style="color: #ea580c;">
                <i class="fa-solid fa-arrow-down"></i> Metti in Panchina
              </button>
            </div>
          ` : ''}

          ${availablePlayers.length === 0 ? `
            <div style="text-align: center; padding: 28px 14px;">
              <i class="fa-solid fa-chair" style="font-size: 2rem; color: var(--muted); opacity: 0.5; margin-bottom: 8px;"></i>
              <h4 style="font-size: 0.95rem; font-weight: 750; color: var(--ink); margin: 0 0 6px;">Nessun ${roleName.toLowerCase()} in panchina</h4>
              <p style="font-size: 0.78rem; color: var(--muted); margin: 0 0 14px;">
                Non hai ancora calciatori di questo ruolo tra le riserve della tua rosa.
              </p>
              <button type="button" class="fanta-btn primary-btn btn-sm" id="btn-go-to-list-and-add">
                <i class="fa-solid fa-list"></i> Vai alla Lista Reparti per Aggiungere dal Database
              </button>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${availablePlayers.map(p => {
                const photoUrl = p.photoUrl || p.playerImage || '';
                const initials = (p.name || '??').slice(0, 2).toUpperCase();
                const price = p.purchasePrice || p.pricePaid || 0;
                return `
                  <div class="roster-picker-item" data-player-id="${p.id}">
                    <div class="roster-picker-left">
                      <div class="roster-picker-avatar">
                        ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />` : initials}
                      </div>
                      <div class="roster-picker-info">
                        <span class="picker-player-name">${sanitizeHtml(p.displayName || p.name)}</span>
                        <div class="picker-player-meta">
                          <span class="role-badge role-${(p.role || p.classicRole || 'C').toLowerCase()}" style="font-size: 0.65rem; padding: 1px 5px;">${p.role || p.classicRole}</span>
                          <span>${sanitizeHtml(p.teamName || 'Serie A')}</span>
                          ${price > 0 ? `<span>· Pagato: <strong>${price} cr</strong></span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="roster-picker-right">
                      <button type="button" class="fanta-btn success-btn btn-sm" style="padding: 4px 10px; font-size: 0.74rem;">
                        <i class="fa-solid fa-arrow-up"></i> Schiera
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    const closeModal = () => modalBackdrop.remove();
    modalBackdrop.querySelector('#close-roster-picker-btn')?.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    modalBackdrop.querySelector('#btn-unassign-slot')?.addEventListener('click', () => {
      store.assignPlayerToMyTeamSlot(slotId, null);
      notify.info('Calciatore spostato in panchina');
      closeModal();
    });

    modalBackdrop.querySelector('#btn-go-to-list-and-add')?.addEventListener('click', () => {
      closeModal();
      this.layoutMode = 'list';
      this.render();
      const modal = document.querySelector('#add-player-modal');
      if (modal) {
        modal.classList.remove('hidden');
        const roleBtn = modal.querySelector(`.role-filter-btn[data-role="${slotRole}"]`);
        if (roleBtn) roleBtn.click();
      }
    });

    modalBackdrop.querySelectorAll('.roster-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const playerId = item.dataset.playerId;
        const player = (myTeam.bench || []).find(p => p.id === playerId);
        if (player) {
          store.assignPlayerToMyTeamSlot(slotId, playerId);
          notify.success(`⭐ ${player.displayName || player.name} schierato titolare in posizione ${slotRole}!`);
          closeModal();
        }
      });
    });
  }

  highlightSelectedPlayer() {
    const selectedPlayer = store.getSelectedPlayer();
    this.container.querySelectorAll('.player-card').forEach(card => {
      if (selectedPlayer && card.dataset.playerId === selectedPlayer.id) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
    });
  }
}
