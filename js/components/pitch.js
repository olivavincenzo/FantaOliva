/**
 * Componente Campo da Calcio & Vista Giocatori Squadra (Editorial Minimal Design)
 */

import { store } from '../store.js';
import { FORMATION_LIST } from '../data/formations.js';
import { createPlayerCard } from './playerCard.js';
import { dragDrop } from '../utils/dragDrop.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class PitchComponent {
  constructor(container) {
    this.container = container;
    this.pitchEl = null;
    this.slotsLayer = null;
    this.linesSvgLayer = null;
    this.verticalListEl = null;
    this.activeRoleFilter = 'ALL';
    this.squadScope = 'STARTERS'; // 'STARTERS' | 'BENCH' | 'ALL'
    this.searchQuery = '';
    this.gridColumns = Number((typeof localStorage !== 'undefined' ? localStorage.getItem('fantaoliva_pitch_list_cols') : null) || 1);

    this.init();
  }

  init() {
    this.renderBasePitch();
    this.bindTopControls();
    this.bindTacticalBannerEvents();
    this.subscribeEvents();
    this.updatePitch();
  }

  renderBasePitch() {
    const formationOptions = FORMATION_LIST.map(f => {
      const isSel = store.getCurrentFormation()?.id === f.id ? 'selected' : '';
      return `<option value="${f.id}" ${isSel}>${f.id}</option>`;
    }).join('');

    const team = store.getCurrentTeam();
    const teamName = team ? team.name.toUpperCase() : 'INTER';
    const sosData = store.getTeamSosData(team);
    const teamNotes = team ? store.getTeamPersonalNotes(team.id) : '';

    const coachName = sosData?.coach || team?.coach || 'Mister';
    const currentModule = sosData?.module || team?.module || team?.defaultFormation || '4-3-3';
    const attackRating = Number(sosData?.attackRating ?? team?.attackRating ?? 3.5).toFixed(1);
    const defenseRating = Number(sosData?.defenseRating ?? team?.defenseRating ?? 3.5).toFixed(1);

    const rigList = (sosData?.rig || team?.rig || []).map(r => r.name || r.displayName || r).filter(Boolean);
    const punList = (sosData?.pun || team?.pun || []).map(r => r.name || r.displayName || r).filter(Boolean);
    const corList = (sosData?.corner || team?.corner || []).map(r => r.name || r.displayName || r).filter(Boolean);

    const rigText = rigList.length > 0 ? rigList.join(' · ') : '—';
    const punText = punList.length > 0 ? punList.join(' · ') : '—';
    const corText = corList.length > 0 ? corList.join(' · ') : '—';

    const keyPoints = (sosData?.keyPoints || team?.keyPoints || []);
    const keyPointsHtml = keyPoints.map(kp => {
      const toneClass = kp.tone === 'good' ? 'tone-good' : (kp.tone === 'bad' ? 'tone-bad' : 'tone-neutral');
      const icon = kp.tone === 'good' ? '✓' : (kp.tone === 'bad' ? '⚠' : 'ℹ');
      return `<span class="team-keypoint-chip ${toneClass}" title="Punto Chiave Tattico"><span class="kp-icon">${icon}</span> ${sanitizeHtml(kp.text)}</span>`;
    }).join('');

    const ballottaggiList = (sosData?.ballottaggi || team?.ballottaggi || []);
    const ballottaggiHtml = ballottaggiList.map(duel => {
      if (!Array.isArray(duel) || duel.length < 2) return '';
      const items = duel.map((p, idx) => `
        <span class="duel-player ${idx === 0 ? 'leader' : ''}" data-duel-name="${sanitizeHtml(p.name)}" title="${sanitizeHtml(p.name)} (${p.perc}%) - Doppio click per aprire scheda">${sanitizeHtml(p.name)} <strong class="perc-val">${p.perc}%</strong></span>
      `).join('<span class="vs-divider">⚔️</span>');
      return `<span class="team-ballottaggio-chip" title="Ballottaggio Ufficiale">${items}</span>`;
    }).filter(Boolean).join('');

    this.container.innerHTML = `
      <!-- HEADER EDITORIAL MINIMAL (FISSO IN CIMA) -->
      <header class="topbar">
        <div>
          <p class="context">Asta 2026/27 · Serie A</p>
          <div class="team-heading-row">
            <h1 class="team-title-heading" id="pitch-watermark-club">${sanitizeHtml(teamName)}</h1>
            <span class="team-formation-badge" id="pitch-formation-badge">${sanitizeHtml(currentModule)}</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="circle-button" id="pitch-hud-teams-btn" type="button" aria-label="Cambia Squadra" title="Cambia Squadra Serie A">
            ⇄
          </button>
          <button class="circle-button" id="toggle-pitch-layout-btn" type="button" aria-label="Alterna Campo Grafico / Lista Giocatori" title="Mostra Campo Grafico">
            <i class="fa-solid fa-futbol" style="font-size: 14px;"></i>
          </button>
        </div>
      </header>

      <div class="pitch-outer-wrapper">
        <!-- BANNER TATTICO SQUADRA (Coach & Ratings + Specialisti & Punti Chiave) -->
        <div class="team-tactical-banner" id="pitch-tactical-banner">
          <div class="team-coach-ratings-row" id="pitch-coach-ratings-row">
            <span class="team-coach-text" title="Allenatore"><i class="fa-solid fa-user-tie"></i> All. <strong>${sanitizeHtml(coachName)}</strong></span>
            <span class="tactical-rating-pill" title="Indice Attacco SOS Fanta (1-5)">⚔️ Att: <strong>${attackRating}/5</strong></span>
            <span class="tactical-rating-pill" title="Indice Difesa SOS Fanta (1-5)">🛡️ Dif: <strong>${defenseRating}/5</strong></span>
          </div>
          <div class="team-specialists-group">
            <div class="tactical-spec-item" title="Gerarchia Rigoristi: ${sanitizeHtml(rigText)}">
              <span class="spec-icon">🎯</span> <span class="spec-label">Rig:</span> <strong class="spec-names">${sanitizeHtml(rigText)}</strong>
            </div>
            <div class="tactical-spec-item" title="Gerarchia Tiratori Punizioni: ${sanitizeHtml(punText)}">
              <span class="spec-icon">📐</span> <span class="spec-label">Pun:</span> <strong class="spec-names">${sanitizeHtml(punText)}</strong>
            </div>
            <div class="tactical-spec-item" title="Gerarchia Calci d'Angolo: ${sanitizeHtml(corText)}">
              <span class="spec-icon">🚩</span> <span class="spec-label">Cor:</span> <strong class="spec-names">${sanitizeHtml(corText)}</strong>
            </div>
          </div>
          ${keyPointsHtml ? `
            <div class="team-keypoints-wrap">
              ${keyPointsHtml}
            </div>
          ` : ''}
          ${ballottaggiHtml ? `
            <div class="team-ballottaggi-group">
              <span class="spec-label"><i class="fa-solid fa-scale-unbalanced"></i> Ballottaggi:</span>
              <div class="ballottaggi-chips-wrap">
                ${ballottaggiHtml}
              </div>
            </div>
          ` : ''}
          <div class="team-personal-notes-group">
            <div class="team-notes-header">
              <span class="spec-label"><i class="fa-regular fa-note-sticky"></i> Note personali squadra:</span>
            </div>
            <div class="team-notes-card">
              <textarea 
                id="team-personal-notes-textarea" 
                class="team-notes-textarea" 
                placeholder="Scrivi una nota personale su ${sanitizeHtml(teamName)}…"
              >${sanitizeHtml(teamNotes)}</textarea>
              <div class="team-notes-footer">
                <span class="team-notes-hint"><i class="fa-solid fa-lock" style="font-size: 8px;"></i> Personale · salvata in locale</span>
                <button type="button" id="save-team-notes-btn" class="save-team-notes-btn">
                  <i class="fa-solid fa-floppy-disk"></i> Salva nota
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- BARRA DI RICERCA EDITORIALE -->
        <div class="search" role="search" aria-label="Cerca giocatori">
          <svg class="search-icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input 
            type="text" 
            id="pitch-search-input" 
            class="search-input" 
            placeholder="Cerca giocatore o squadra" 
            autocomplete="off"
          />
          <button id="pitch-search-clear" class="search-clear hidden" aria-label="Pulisci ricerca">&times;</button>
        </div>

        <!-- FILTRI RUOLI A SCORRIMENTO ORIZZONTALE -->
        <nav class="filters" aria-label="Filtri giocatori">
          <button class="filter active" data-role="ALL" type="button">Tutti · <span id="filter-total-count">0</span></button>
          <button class="filter" data-role="ATT" type="button">ATT</button>
          <button class="filter" data-role="CEN" type="button">CEN</button>
          <button class="filter" data-role="DIF" type="button">DIF</button>
          <button class="filter" data-role="POR" type="button">POR</button>
        </nav>

        <!-- 1. LISTA VERTICALE EDITORIALE (Visualizzazione Principale) -->
        <div class="pitch-vertical-list-container" id="pitch-vertical-list"></div>

        <!-- 2. CAMPO DA CALCIO GRAFICO (Visualizzazione Alternativa) -->
        <div class="soccer-pitch hidden" id="soccer-pitch">
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
          <svg class="tactical-lines-svg" id="tactical-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g id="tactical-lines-group"></g>
          </svg>
          <div class="pitch-slots-layer" id="pitch-slots-layer"></div>
        </div>

      </div>
    `;

    this.pitchEl = this.container.querySelector('#soccer-pitch');
    this.slotsLayer = this.container.querySelector('#pitch-slots-layer');
    this.linesSvgLayer = this.container.querySelector('#tactical-lines-group');
    this.verticalListEl = this.container.querySelector('#pitch-vertical-list');
    if (this.pitchEl) dragDrop.init(this.pitchEl);
  }

  bindTopControls() {
    // Selettore Squadre Trigger
    const teamsBtn = this.container.querySelector('#pitch-hud-teams-btn');
    teamsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const sidebarTeams = document.querySelector('#sidebar-teams');
      const sidebarInspector = document.querySelector('#sidebar-inspector');
      const backdrop = document.querySelector('#mobile-drawer-backdrop');

      if (window.innerWidth <= 900) {
        const isAlreadyOpen = sidebarTeams?.classList.contains('mobile-open');
        if (isAlreadyOpen) {
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

    // Selettore Modulo Topbar
    const topbarFormationSelect = this.container.querySelector('#topbar-formation-select');
    topbarFormationSelect?.addEventListener('change', (e) => {
      store.setFormation(e.target.value);
    });

    // Filtro Ruoli
    const filterBtns = this.container.querySelectorAll('.filters .filter[data-role]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeRoleFilter = btn.dataset.role;
        this.renderVerticalList();
      });
    });

    // Ricerca Giocatori
    const searchInput = this.container.querySelector('#pitch-search-input');
    const searchClear = this.container.querySelector('#pitch-search-clear');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      searchClear?.classList.toggle('hidden', !this.searchQuery);
      this.renderVerticalList();
    });

    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      searchClear.classList.add('hidden');
      this.renderVerticalList();
      searchInput?.focus();
    });

    // Toggle Vista Lista / Campo
    const toggleLayoutBtn = this.container.querySelector('#toggle-pitch-layout-btn');
    const outerWrapper = this.container.querySelector('.pitch-outer-wrapper');

    toggleLayoutBtn?.addEventListener('click', () => {
      const isPitchHidden = this.pitchEl?.classList.contains('hidden');
      if (isPitchHidden) {
        // Mostra campo
        this.pitchEl?.classList.remove('hidden');
        this.verticalListEl?.classList.add('hidden');
        outerWrapper?.classList.add('is-pitch-mode');
        toggleLayoutBtn.classList.add('active');
        toggleLayoutBtn.title = 'Mostra Lista Giocatori';
        toggleLayoutBtn.innerHTML = '<i class="fa-solid fa-list" style="font-size: 14px;"></i>';
        this.updateSlotsPositions();
        this.renderTacticalLines();
      } else {
        // Mostra lista editoriale
        this.pitchEl?.classList.add('hidden');
        this.verticalListEl?.classList.remove('hidden');
        outerWrapper?.classList.remove('is-pitch-mode');
        toggleLayoutBtn.classList.remove('active');
        toggleLayoutBtn.title = 'Mostra Campo Grafico';
        toggleLayoutBtn.innerHTML = '<i class="fa-solid fa-futbol" style="font-size: 14px;"></i>';
        this.renderVerticalList();
      }
    });
  }

  subscribeEvents() {
    store.subscribe('formation:changed', () => this.updatePitch(false));
    store.subscribe('team:changed', () => this.updatePitch(true));
    store.subscribe('team:reset', () => this.updatePitch(true));
    store.subscribe('player:selected', () => this.updateSelectionHighlight({ scroll: false }));
    store.subscribe('player:updated', () => this.updatePitch(false));
    store.subscribe('favorite:toggled', () => this.updatePitch(false));
    store.subscribe('ballottaggio:updated', () => this.updatePitch(false));
    store.subscribe('pitch:layoutChanged', () => this.updatePitch(false));
    store.subscribe('position:customized', () => {
      this.updateSlotsPositions();
      this.renderTacticalLines();
    });
  }

  updatePitch(resetScroll = false) {
    const team = store.getCurrentTeam();
    const clubEl = this.container.querySelector('#pitch-watermark-club');
    if (team && clubEl) {
      clubEl.textContent = team.name.toUpperCase();
    }

    const formation = store.getCurrentFormation();
    const topbarFormationSelect = this.container.querySelector('#topbar-formation-select');
    if (formation && topbarFormationSelect) {
      topbarFormationSelect.value = formation.id;
    }

    this.updateTacticalBanner();
    this.renderVerticalList();
    this.updateSlotsPositions();
    this.renderTacticalLines();

    if (resetScroll) {
      const outerWrapper = this.container.querySelector('.pitch-outer-wrapper');
      if (outerWrapper) {
        outerWrapper.scrollTop = 0;
      }
    }
  }

  updateTacticalBanner() {
    const team = store.getCurrentTeam();
    if (!team) return;
    const sosData = store.getTeamSosData(team);

    const coachName = sosData?.coach || team.coach || 'Mister';
    const currentModule = sosData?.module || team.module || team.defaultFormation || '4-3-3';
    const attackRating = Number(sosData?.attackRating ?? team.attackRating ?? 3.5).toFixed(1);
    const defenseRating = Number(sosData?.defenseRating ?? team.defenseRating ?? 3.5).toFixed(1);

    const moduleBadgeEl = this.container.querySelector('#pitch-formation-badge');
    if (moduleBadgeEl) {
      moduleBadgeEl.textContent = currentModule;
    }

    const rigList = (sosData?.rig || team.rig || []).map(r => r.name || r.displayName || r).filter(Boolean);
    const punList = (sosData?.pun || team.pun || []).map(r => r.name || r.displayName || r).filter(Boolean);
    const corList = (sosData?.corner || team.corner || []).map(r => r.name || r.displayName || r).filter(Boolean);

    const rigText = rigList.length > 0 ? rigList.join(' · ') : '—';
    const punText = punList.length > 0 ? punList.join(' · ') : '—';
    const corText = corList.length > 0 ? corList.join(' · ') : '—';

    const keyPoints = (sosData?.keyPoints || team.keyPoints || []);
    const keyPointsHtml = keyPoints.map(kp => {
      const toneClass = kp.tone === 'good' ? 'tone-good' : (kp.tone === 'bad' ? 'tone-bad' : 'tone-neutral');
      const icon = kp.tone === 'good' ? '✓' : (kp.tone === 'bad' ? '⚠' : 'ℹ');
      return `<span class="team-keypoint-chip ${toneClass}" title="Punto Chiave Tattico"><span class="kp-icon">${icon}</span> ${sanitizeHtml(kp.text)}</span>`;
    }).join('');

    const ballottaggiList = (sosData?.ballottaggi || team.ballottaggi || []);
    const ballottaggiHtml = ballottaggiList.map(duel => {
      if (!Array.isArray(duel) || duel.length < 2) return '';
      const items = duel.map((p, idx) => `
        <span class="duel-player ${idx === 0 ? 'leader' : ''}" data-duel-name="${sanitizeHtml(p.name)}" title="${sanitizeHtml(p.name)} (${p.perc}%) - Doppio click per aprire scheda">${sanitizeHtml(p.name)} <strong class="perc-val">${p.perc}%</strong></span>
      `).join('<span class="vs-divider">⚔️</span>');
      return `<span class="team-ballottaggio-chip" title="Ballottaggio Ufficiale">${items}</span>`;
    }).filter(Boolean).join('');

    const teamNotes = store.getTeamPersonalNotes(team.id);
    const bannerEl = this.container.querySelector('#pitch-tactical-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="team-coach-ratings-row" id="pitch-coach-ratings-row">
          <span class="team-coach-text" title="Allenatore"><i class="fa-solid fa-user-tie"></i> All. <strong>${sanitizeHtml(coachName)}</strong></span>
          <span class="tactical-rating-pill" title="Indice Attacco SOS Fanta (1-5)">⚔️ Att: <strong>${attackRating}/5</strong></span>
          <span class="tactical-rating-pill" title="Indice Difesa SOS Fanta (1-5)">🛡️ Dif: <strong>${defenseRating}/5</strong></span>
        </div>
        <div class="team-specialists-group">
          <div class="tactical-spec-item" title="Gerarchia Rigoristi: ${sanitizeHtml(rigText)}">
            <span class="spec-icon">🎯</span> <span class="spec-label">Rig:</span> <strong class="spec-names">${sanitizeHtml(rigText)}</strong>
          </div>
          <div class="tactical-spec-item" title="Gerarchia Tiratori Punizioni: ${sanitizeHtml(punText)}">
            <span class="spec-icon">📐</span> <span class="spec-label">Pun:</span> <strong class="spec-names">${sanitizeHtml(punText)}</strong>
          </div>
          <div class="tactical-spec-item" title="Gerarchia Calci d'Angolo: ${sanitizeHtml(corText)}">
            <span class="spec-icon">🚩</span> <span class="spec-label">Cor:</span> <strong class="spec-names">${sanitizeHtml(corText)}</strong>
          </div>
        </div>
        ${keyPointsHtml ? `
          <div class="team-keypoints-wrap">
            ${keyPointsHtml}
          </div>
        ` : ''}
        ${ballottaggiHtml ? `
          <div class="team-ballottaggi-group">
            <span class="spec-label"><i class="fa-solid fa-scale-unbalanced"></i> Ballottaggi:</span>
            <div class="ballottaggi-chips-wrap">
              ${ballottaggiHtml}
            </div>
          </div>
        ` : ''}
        <div class="team-personal-notes-group">
          <div class="team-notes-header">
            <span class="spec-label"><i class="fa-regular fa-note-sticky"></i> Note personali squadra:</span>
          </div>
          <div class="team-notes-card">
            <textarea 
              id="team-personal-notes-textarea" 
              class="team-notes-textarea" 
              placeholder="Scrivi una nota personale su ${sanitizeHtml(team.name)}…"
            >${sanitizeHtml(teamNotes)}</textarea>
            <div class="team-notes-footer">
              <span class="team-notes-hint"><i class="fa-solid fa-lock" style="font-size: 8px;"></i> Personale · salvata in locale</span>
              <button type="button" id="save-team-notes-btn" class="save-team-notes-btn">
                <i class="fa-solid fa-floppy-disk"></i> Salva nota
              </button>
            </div>
          </div>
        </div>
      `;

      this.bindTacticalBannerEvents();
    }
  }

  bindTacticalBannerEvents() {
    const bannerEl = this.container?.querySelector('#pitch-tactical-banner');
    if (!bannerEl) return;

    const team = store.getCurrentTeam();
    if (!team) return;

    const textarea = bannerEl.querySelector('#team-personal-notes-textarea');
    const saveBtn = bannerEl.querySelector('#save-team-notes-btn');

    if (textarea) {
      const resize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(48, textarea.scrollHeight)}px`;
      };
      resize();
      setTimeout(resize, 40);

      textarea.addEventListener('input', () => {
        resize();
        store.setTeamPersonalNotes(team.id, textarea.value);
      });

      textarea.addEventListener('blur', () => {
        store.setTeamPersonalNotes(team.id, textarea.value);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const noteVal = textarea ? textarea.value : '';
        store.setTeamPersonalNotes(team.id, noteVal);
        notify.success(`Nota salvata per ${team.name}`);
      });
    }

    // Listener per i giocatori nei ballottaggi del banner tattico
    bannerEl.querySelectorAll('.duel-player').forEach(el => {
      const openBannerDuelPlayer = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const pName = el.dataset.duelName || el.textContent.replace(/\d+%/g, '').replace(/[⚔️ℹ️]/g, '').trim();
        const found = store.getPlayer(pName);
        if (found) {
          store.selectPlayer(found.id);

          if (document.body.classList.contains('right-sidebar-collapsed')) {
            document.body.classList.remove('right-sidebar-collapsed');
          }

          const sidebarInspector = document.querySelector('#sidebar-inspector');
          const sidebarTeams = document.querySelector('#sidebar-teams');
          const backdrop = document.querySelector('#mobile-drawer-backdrop');

          if (window.innerWidth <= 900) {
            sidebarInspector?.classList.add('mobile-open');
            sidebarTeams?.classList.remove('mobile-open');
            backdrop?.classList.remove('hidden');
          }
        }
      };

      el.addEventListener('dblclick', openBannerDuelPlayer);
      el.addEventListener('click', openBannerDuelPlayer);
    });
  }

  renderVerticalList() {
    if (!this.verticalListEl) return;
    this.verticalListEl.innerHTML = '';

    const currentTeam = store.getCurrentTeam();
    const lineup = store.getLineupPlayers();
    const currentFormation = store.getCurrentFormation();
    const formationLabel = currentFormation ? currentFormation.id : '4-3-3';
    const selectedPlayer = store.getSelectedPlayer();

    // Funzione helper per ottenere la categoria del ruolo (ATT, CEN, DIF, POR)
    const getRoleCategory = (player) => {
      const cat = store.getRoleCategory(player);
      if (cat === 'P') return 'POR';
      if (cat === 'D') return 'DIF';
      if (cat === 'C') return 'CEN';
      if (cat === 'A') return 'ATT';
      return 'CEN';
    };

    // Raggruppamento per reparto
    const departments = [
      { key: 'ATT', name: 'Attaccanti', items: [] },
      { key: 'CEN', name: 'Centrocampisti', items: [] },
      { key: 'DIF', name: 'Difensori', items: [] },
      { key: 'POR', name: 'Portieri', items: [] }
    ];

    // Raccogli sia i titolari che i panchinari per mostrare l'intera rosa della squadra attiva
    const starters = lineup.map(i => ({
      player: i.player,
      slotId: i.slot?.id,
      slotRole: i.slot?.role || i.slot?.label,
      isLineup: true
    })).filter(i => i.player);

    const bench = (currentTeam?.bench || []).map(p => ({
      player: p,
      slotId: null,
      slotRole: p.role,
      isLineup: false
    })).filter(i => i.player);

    const seenIds = new Set();
    const allSquadItems = [];
    starters.forEach(s => {
      if (!seenIds.has(s.player.id)) {
        seenIds.add(s.player.id);
        allSquadItems.push(s);
      }
    });
    bench.forEach(b => {
      if (!seenIds.has(b.player.id)) {
        seenIds.add(b.player.id);
        allSquadItems.push(b);
      }
    });

    let targetItems = allSquadItems;
    if (this.squadScope === 'STARTERS') {
      targetItems = starters;
    } else if (this.squadScope === 'BENCH') {
      targetItems = bench;
    }

    targetItems.forEach(item => {
      const p = item.player;
      if (!p) return;

      // Filtro ricerca
      if (this.searchQuery) {
        const matchName = (p.name || '').toLowerCase().includes(this.searchQuery) ||
          (p.displayName || '').toLowerCase().includes(this.searchQuery);
        const matchRole = (p.role || '').toLowerCase().includes(this.searchQuery) ||
          (p.classicRole || '').toLowerCase().includes(this.searchQuery);
        if (!matchName && !matchRole) return;
      }

      const cat = getRoleCategory(p);

      // Filtro ruoli
      if (this.activeRoleFilter !== 'ALL' && cat !== this.activeRoleFilter) {
        return;
      }

      const dept = departments.find(d => d.key === cat) || departments[1];
      dept.items.push(item);
    });

    const totalCountEl = this.container.querySelector('#filter-total-count');
    if (totalCountEl) {
      totalCountEl.textContent = targetItems.length;
    }

    let hasAnyPlayer = false;

    // Barra Superiore Lista con Selettore Colonne 1 2 3 4 e Filtro Titolari/Panchina
    const team = store.getCurrentTeam();
    const teamTitle = team ? team.name : 'Rosa';
    const topBarEl = document.createElement('div');
    topBarEl.className = 'list-view-header-bar';
    topBarEl.innerHTML = `
      <div class="section-head-title">
        <div class="section-title-wrap">
          <h2>${this.squadScope === 'BENCH' ? 'Panchina' : (this.squadScope === 'STARTERS' ? 'Titolari' : 'Rosa')} ${sanitizeHtml(teamTitle)}</h2>
          <span class="head-count">${targetItems.length} calciatori</span>
        </div>
        <div class="squad-scope-selector" role="group" aria-label="Filtro titolari o panchina">
          <button type="button" class="squad-scope-btn ${this.squadScope === 'STARTERS' ? 'is-active' : ''}" data-scope="STARTERS" title="Mostra solo la formazione titolare">
            Titolari <span class="scope-count">${starters.length}</span>
          </button>
          <button type="button" class="squad-scope-btn ${this.squadScope === 'BENCH' ? 'is-active' : ''}" data-scope="BENCH" title="Mostra i giocatori in panchina divisi per ruolo">
            <i class="fa-solid fa-chair" style="font-size: 10px;"></i> Panchina <span class="scope-count">${bench.length}</span>
          </button>
          <button type="button" class="squad-scope-btn ${this.squadScope === 'ALL' ? 'is-active' : ''}" data-scope="ALL" title="Mostra tutti i calciatori della rosa (Titolari + Panchina)">
            Tutti <span class="scope-count">${allSquadItems.length}</span>
          </button>
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
    `;

    topBarEl.querySelectorAll('.squad-scope-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.squadScope = btn.dataset.scope || 'ALL';
        this.renderVerticalList();
      });
    });

    topBarEl.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cols = Number(btn.dataset.cols) || 1;
        this.gridColumns = cols;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fantaoliva_pitch_list_cols', cols);
        }
        this.renderVerticalList();
      });
    });

    this.verticalListEl.appendChild(topBarEl);

    departments.forEach(dept => {
      if (dept.items.length === 0) return;
      hasAnyPlayer = true;

      // Section Header Reparto
      const headerEl = document.createElement('div');
      headerEl.className = 'section-header';
      const deptSuffix = this.squadScope === 'BENCH' ? 'in Panchina' : (this.squadScope === 'STARTERS' ? 'Titolari' : '');
      headerEl.innerHTML = `
        <h2>${sanitizeHtml(dept.name)} ${deptSuffix ? `<span style="font-size: 11px; opacity: 0.7; font-weight: normal; margin-left: 4px;">(${deptSuffix})</span>` : ''}</h2>
        <span>${dept.items.length} ${this.squadScope === 'BENCH' ? 'riserve' : 'calciatori'}</span>
      `;

      this.verticalListEl.appendChild(headerEl);

      // Section List con classe di colonne
      const listSection = document.createElement('section');
      listSection.className = `player-list cols-${this.gridColumns}`;
      listSection.setAttribute('aria-label', `Elenco ${dept.name}`);

      dept.items.forEach(item => {
        const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;

        const card = createPlayerCard(item.player, {
          slotId: item.slotId,
          slotRole: item.slotRole,
          isLineup: item.isLineup,
          isSelected
        });

        listSection.appendChild(card);
      });

      this.verticalListEl.appendChild(listSection);
    });

    if (!hasAnyPlayer) {
      this.verticalListEl.innerHTML = `
        <div style="text-align: center; padding: 36px 14px; color: var(--muted);">
          <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <p style="font-size: 13px; font-weight: 580;">Nessun calciatore trovato per i filtri selezionati</p>
        </div>
      `;
    } else {
      this.scrollToSelectedPlayer(false);
    }
  }

  updateSlotsPositions() {
    if (!this.slotsLayer) return;
    this.slotsLayer.innerHTML = '';

    const lineup = store.getLineupPlayers();
    const selectedPlayer = store.getSelectedPlayer();

    lineup.forEach(item => {
      const slotEl = document.createElement('div');
      slotEl.className = 'pitch-slot-wrapper';
      slotEl.dataset.slotId = item.slot.id;
      slotEl.style.left = `${item.x}%`;
      slotEl.style.top = `${item.y}%`;

      const isSelected = selectedPlayer && item.player && selectedPlayer.id === item.player.id;
      if (isSelected) {
        slotEl.classList.add('is-selected');
      }

      const card = createPlayerCard(item.player, {
        slotId: item.slot.id,
        slotRole: item.slot.role || item.slot.label,
        isLineup: true,
        compact: true,
        isSelected
      });

      slotEl.appendChild(card);
      this.slotsLayer.appendChild(slotEl);
    });
  }

  updateSelectionHighlight(options = { scroll: true, smooth: true }) {
    const selectedPlayer = store.getSelectedPlayer();
    this.container.querySelectorAll('.player-card').forEach(card => {
      const pId = card.dataset.playerId;
      const isSelected = selectedPlayer && pId === selectedPlayer.id;
      card.classList.toggle('is-selected', Boolean(isSelected));
    });

    this.slotsLayer?.querySelectorAll('.pitch-slot-wrapper').forEach(slotEl => {
      const isSlotSelected = slotEl.querySelector('.player-card.is-selected');
      slotEl.classList.toggle('is-selected', Boolean(isSlotSelected));
    });

    if (options && options.scroll) {
      this.scrollToSelectedPlayer(options.smooth !== false);
    }
  }

  scrollToSelectedPlayer(smooth = true) {
    const selectedPlayer = store.getSelectedPlayer();
    if (!selectedPlayer) return;

    setTimeout(() => {
      const selectedCard = this.verticalListEl?.querySelector(`.player-card[data-player-id="${selectedPlayer.id}"]`);
      const outerWrapper = this.container?.querySelector('.pitch-outer-wrapper');
      if (selectedCard && outerWrapper) {
        const cardRect = selectedCard.getBoundingClientRect();
        const wrapperRect = outerWrapper.getBoundingClientRect();
        const targetScrollTop = outerWrapper.scrollTop + (cardRect.top - wrapperRect.top) - (wrapperRect.height / 2) + (cardRect.height / 2);

        outerWrapper.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: smooth ? 'smooth' : 'auto'
        });

        selectedCard.classList.remove('is-scroll-target');
        void selectedCard.offsetWidth; // trigger reflow
        selectedCard.classList.add('is-scroll-target');
      }
    }, 60);
  }

  renderTacticalLines() {
    if (!this.linesSvgLayer) return;
    const formation = store.getCurrentFormation();
    if (!formation || !formation.connections) {
      this.linesSvgLayer.innerHTML = '';
      return;
    }

    const lineup = store.getLineupPlayers();
    const slotMap = new Map();
    lineup.forEach(item => {
      slotMap.set(item.slot.id, { x: item.x, y: item.y });
    });

    let svgLinesHtml = '';
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

    this.linesSvgLayer.innerHTML = svgLinesHtml;
  }
}
