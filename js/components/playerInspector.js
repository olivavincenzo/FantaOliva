/**
 * Componente Ispettore Giocatore & Scheda Tattica / Fantacalcio (Right Sidebar)
 * Gestisce:
 * - Navigazione a 3 Tab (1. Scheda & Fantacalcio, 2. Sostituti & Ballottaggi, 3. Panchina & Rosa)
 * - Modifica dati anagrafici, ruolo, stato, statistiche fantacalcio
 * - Gestione della gerarchia dei sostituti (1ª, 2ª, 3ª scelta)
 * - Commenti tattici per la posizione e note di squadra
 */

import { store } from '../store.js';
import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { renderBallottaggioSection } from './ballottaggioManager.js';
import { sanitizeHtml, getTitolaritaClass, getPlayerInitials } from '../utils/helpers.js';
import { notify } from '../utils/notifications.js';

export class PlayerInspectorComponent {
  constructor(container) {
    this.container = container;
    this.activeTab = 'tab-details'; // 'tab-details' | 'tab-subs'

    this.init();
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('player:selected', () => this.render());
    store.subscribe('player:updated', () => this.render());
    store.subscribe('player:added', () => this.render());
    store.subscribe('team:changed', () => this.render());
    store.subscribe('formation:changed', () => this.render());
    store.subscribe('auction:availabilityChanged', () => this.render());
    store.subscribe('strategy:changed', () => this.render());
    store.subscribe('strategy:updated', () => this.render());
    store.subscribe('strategy:playerAssigned', () => this.render());
  }

  setTab(tabId) {
    this.activeTab = tabId;
    this.render();
  }

  render() {
    this.container = this.container || document.getElementById(this.containerId);
    if (!this.container) return;

    const player = store.getSelectedPlayer();
    const currentTeam = store.getCurrentTeam();
    const selectedSlotId = store.selectedSlotId;

    if (!player) {
      this.container.innerHTML = `
        <div class="inspector-header">
          <div class="inspector-player-summary">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <h2 class="inspector-name">${sanitizeHtml(currentTeam?.name || 'Squadra')}</h2>
              <button class="sidebar-close-btn" id="close-inspector-btn" title="Chiudi scheda" aria-label="Chiudi">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="inspector-tags-row">
              <span class="team-tag">${sanitizeHtml(currentTeam?.shortName || '')}</span>
              <span class="team-tag">${sanitizeHtml(currentTeam?.coach || 'Allenatore')}</span>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="inspector-tabs-nav">
            <button class="inspector-tab-btn ${this.activeTab === 'tab-details' ? 'is-active' : ''}" data-tab="tab-details">
              <i class="fa-solid fa-clipboard-user"></i> Scheda & Fanta
            </button>
            <button class="inspector-tab-btn ${this.activeTab === 'tab-subs' ? 'is-active' : ''}" data-tab="tab-subs">
              <i class="fa-solid fa-arrows-split-up-and-left"></i> Ballottaggi
            </button>
          </div>
        </div>

        <div class="inspector-body">
          <div class="tab-content" id="inspector-tab-container"></div>
        </div>
      `;

      this.bindCloseButton();

      this.container.querySelectorAll('.inspector-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setTab(btn.dataset.tab);
        });
      });

      const tabContainer = this.container.querySelector('#inspector-tab-container');

      if (this.activeTab === 'tab-subs') {
        renderBallottaggioSection(tabContainer, null);
      } else {
        tabContainer.innerHTML = `
          <div class="inspector-empty-state">
            <div class="empty-icon-circle">
              <i class="fa-solid fa-person-running"></i>
            </div>
            <h3>Nessun Giocatore Selezionato</h3>
            <p>Clicca su una card sul campo o in panchina per visualizzare e modificare la scheda tattica e i dati fantacalcio.</p>
            <button id="open-add-player-empty-btn" class="fanta-btn primary-btn" style="margin-top: 14px;">
              <i class="fa-solid fa-user-plus"></i> Aggiungi Nuovo Giocatore
            </button>
          </div>
        `;
        tabContainer.querySelector('#open-add-player-empty-btn')?.addEventListener('click', () => {
          const modal = document.querySelector('#add-player-modal');
          if (modal) modal.classList.remove('hidden');
        });
      }
      return;
    }

    const roleInfo = ROLES[player.role] || ROLES.C;
    const fullName = player.name + (player.surname ? ' ' + player.surname : '');
    const displayName = player.displayName || player.name || '';
    const initials = getPlayerInitials(player.name || displayName);
    const classicRole = player.classicRole || player.fantaRole || 'C';
    const mantraRole = player.mantraRole || '';
    const roleLabel = roleInfo.name || player.role || 'Calciatore';

    const teamName = player.teamName || currentTeam?.name || 'Serie A';

    const isAvailable = player.isAvailable !== false;
    const isFavorite = store.isPlayerFavorite(player.id);
    const playerTier = store.getPlayerTier(player);

    const photoUrl = player.photoUrl || player.playerImage || '';
    const avatarHtml = photoUrl
      ? `<div class="large-avatar has-photo">
          <img src="${photoUrl}" alt="${sanitizeHtml(fullName)}" class="player-profile-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
          <span class="avatar-fallback-initials" style="display: none;">${initials}</span>
        </div>`
      : `<div class="large-avatar">${initials}</div>`;

    this.container.innerHTML = `
      <div class="detail-top">
        <span class="detail-title">Scheda giocatore</span>
        <button class="detail-close sidebar-close-btn" id="close-inspector-btn" title="Comprimi scheda" aria-label="Chiudi dettaglio">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Scheda Profilo Giocatore -->
      <section class="profile">
        <div class="profile-head">
          ${avatarHtml}
          <div style="flex: 1; min-width: 0;">
            <h2 class="profile-name" title="${sanitizeHtml(fullName)}">${sanitizeHtml(fullName)}</h2>
            <p class="profile-meta">${sanitizeHtml(teamName)} · ${sanitizeHtml(roleLabel)} · ${classicRole}${mantraRole ? ` · ${mantraRole}` : ''}</p>
          </div>
          <button id="toggle-player-favorite-btn" class="inspector-favorite-toggle ${isFavorite ? 'is-fav' : ''}" title="${isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}">
            <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-star"></i>
          </button>
        </div>
        <div class="status-line ${isAvailable ? 'available' : 'taken'}" id="toggle-player-auction-btn" style="cursor: pointer;" title="Clicca per cambiare disponibilità all'asta">
          <div><span class="status-dot"></span>${isAvailable ? "Disponibile all'asta" : "Già preso / Non disponibile"}</div>
          <span style="font-size: 9px; opacity: 0.6; margin-left: auto;">Cambia ⇄</span>
        </div>
      </section>

      <!-- Navigazione Tab -->
      <div class="inspector-tabs-nav">
        <button class="inspector-tab-btn ${this.activeTab === 'tab-details' ? 'is-active' : ''}" data-tab="tab-details">
          <i class="fa-solid fa-clipboard-user"></i> Scheda & Dati
        </button>
        <button class="inspector-tab-btn ${this.activeTab === 'tab-subs' ? 'is-active' : ''}" data-tab="tab-subs">
          <i class="fa-solid fa-arrows-split-up-and-left"></i> Ballottaggi
        </button>
      </div>

      <div class="inspector-body">
        <div class="tab-content" id="inspector-tab-container"></div>
      </div>
    `;

    this.bindCloseButton();

    // Bind toggle preferiti
    const favToggleBtn = this.container.querySelector('#toggle-player-favorite-btn');
    favToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const newFav = store.togglePlayerFavorite(player.id);
      notify.success(newFav ? `⭐ ${fullName} aggiunto ai Preferiti!` : `⭐ ${fullName} rimosso dai Preferiti`);
    });

    // Bind toggle disponibilità asta
    const auctionToggleBtn = this.container.querySelector('#toggle-player-auction-btn');
    auctionToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const newState = store.togglePlayerAvailability(player.id);
      notify.info(newState ? `${fullName} segnato come DISPONIBILE all'asta` : `${fullName} segnato come PRESO / NON DISPONIBILE`);
    });

    // Bind tab clicks
    this.container.querySelectorAll('.inspector-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTab(btn.dataset.tab);
      });
    });

    const tabContainer = this.container.querySelector('#inspector-tab-container');

    if (this.activeTab === 'tab-details') {
      this.renderDetailsTab(tabContainer, player);
    } else if (this.activeTab === 'tab-subs') {
      this.renderSubstitutesTab(tabContainer, player, selectedSlotId);
    }
  }

  renderDetailsTab(container, player) {
    if (!container || !player) return;

    try {
      const classicRole = store.getRoleCategory(player) || player.classicRole || player.fantaRole || 'C';
      const indices = store.getPlayerIndices(player);

      const spec = store.getPlayerSpecialists ? store.getPlayerSpecialists(player) : null;
      const isRigorista = spec ? spec.isRigorista : Boolean(player.isPenaltyTaker ?? player.rigorista ?? false);
      const isPunizioni = spec ? spec.isPunizioni : Boolean(player.isFreeKickTaker ?? player.punizioni ?? false);
      const isCorner = spec ? spec.isCorner : Boolean(player.isCornerTaker ?? player.corner ?? false);
      const piazzatiText = spec ? spec.detailedText : (isRigorista || isPunizioni || isCorner ? 'Sì' : '—');

      // Ballottaggio info
      const ballottaggio = store.getBallottaggioForPlayer(player.id);
      let ballottaggioText = '';
      if (ballottaggio) {
        if (ballottaggio.duelLabel) {
          ballottaggioText = sanitizeHtml(ballottaggio.duelLabel);
        } else {
          const isPlayerA = ballottaggio.playerAId === player.id;
          const perc = isPlayerA ? (ballottaggio.percentageA || ballottaggio.percA || 50) : (ballottaggio.percentageB || ballottaggio.percB || 50);
          const opponentId = isPlayerA ? ballottaggio.playerBId : ballottaggio.playerAId;
          const opponent = store.getPlayer(opponentId);
          const oppName = opponent ? (opponent.displayName || opponent.name) : (ballottaggio.opponentName || 'Altro');
          ballottaggioText = `${perc}% vs ${sanitizeHtml(oppName)}`;
        }
      }

      // Quotazioni & Rendimento
      const qtA = player.quotazioni?.qtA ?? '-';
      const fvm = player.quotazioni?.fvm ?? '-';
      const titolarita = player.stats?.titolarita ?? player.titolaritaPerc ?? 50;
      const fm = player.stats?.fantamedia ?? player.fantamedia;
      const mv = player.stats?.mediaVoto ?? player.mediaVoto;
      const fmtFm = (fm !== undefined && fm !== null && fm !== '-' && !isNaN(Number(fm))) ? Number(fm).toFixed(2) : (fm || '-');
      const fmtMv = (mv !== undefined && mv !== null && mv !== '-' && !isNaN(Number(mv))) ? Number(mv).toFixed(2) : (mv || '-');
      const presenze = player.stats?.presenze ?? player.stats?.pv ?? 0;
      const gol = player.stats?.gol ?? player.stats?.gf ?? player.gol ?? 0;
      const assist = player.stats?.assist ?? player.stats?.ass ?? player.assist ?? 0;

      // Strategia e Ruolo
      const activeStrategy = store.getActiveStrategy();
      const roleKey = store.getRoleCategory(player);
      const roleTiers = Array.isArray(store.getTiersForRole(roleKey)) ? store.getTiersForRole(roleKey) : [];
      const currentTierId = store.getPlayerTierId(player);

      const normName = (player.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const normDisp = (player.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const sosComment = activeStrategy?.playerComments?.[normName] || activeStrategy?.playerComments?.[normDisp] || '';
      const sosPrice = activeStrategy?.playerPrices?.[normName] || activeStrategy?.playerPrices?.[normDisp] || null;

      const notes = player.comment || player.positionNotes || player.notes || sosComment || '';

    container.innerHTML = `
      <!-- SEZIONE STRATEGIA & FASCIA CUSTOM -->
      <section class="detail-section">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h2>Fascia Strategia (${roleKey})</h2>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${sosPrice ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-sm);" title="Prezzo consigliato asta (base 500)"><i class="fa-solid fa-coins"></i> ${sosPrice} cr</span>` : ''}
            <span class="inspector-strategy-name-tag" title="Strategia Attiva"><i class="fa-solid fa-chess-knight"></i> ${sanitizeHtml(activeStrategy?.name || 'Strategia')}</span>
          </div>
        </div>
        <div class="inspector-strategy-tiers-grid">
          ${roleTiers.map(t => {
            const isAssigned = currentTierId === t.id;
            return `
              <button 
                type="button" 
                class="strategy-tier-pill-btn ${isAssigned ? 'is-active' : ''}" 
                data-tier-id="${t.id}"
                title="Assegna a ${sanitizeHtml(t.name)}"
              >
                <span class="tier-circle" style="background: ${t.color};"></span>
                <span>${sanitizeHtml(t.name)}</span>
              </button>
            `;
          }).join('')}
          ${currentTierId ? `
            <button 
              type="button" 
              class="strategy-tier-pill-btn btn-remove-tier" 
              data-tier-id="none"
              title="Rimuovi fascia da questo giocatore"
            >
              <i class="fa-solid fa-xmark"></i> Rimuovi
            </button>
          ` : ''}
        </div>
        <div style="margin-top: 8px; text-align: right;">
          <button type="button" class="fanta-btn secondary-btn" id="open-strat-manager-from-inspector" style="padding: 4px 10px; font-size: 0.72rem; border-radius: var(--radius-sm);">
            <i class="fa-solid fa-sliders"></i> Gestisci Fasce ${roleKey}
          </button>
        </div>
      </section>

      <!-- SEZIONE RUOLO & QUOTAZIONI -->
      <section class="detail-section">
        <h2>Ruolo & Quotazioni</h2>
        <div class="mini-grid">
          <div class="mini-stat">
            <span>Ruolo Classic</span>
            <strong style="display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span class="role role-${classicRole.toLowerCase()}" style="font-size: 11px; padding: 1px 6px;">${classicRole}</span>
              ${player.role && player.role !== classicRole ? `<span style="font-size: 11px; color: var(--muted); font-weight: 600;">(${player.role})</span>` : ''}
            </strong>
          </div>
          <div class="mini-stat">
            <span>QtA Classic</span>
            <strong>${qtA}</strong>
          </div>
          <div class="mini-stat">
            <span>FVM · base 1000</span>
            <strong>${fvm}</strong>
          </div>
        </div>
      </section>

      <!-- SEZIONE INDICI GUIDA ASTA (TITOLARITÀ, AFFIDABILITÀ, INTEGRITÀ) -->
      <section class="detail-section">
        <h2>Indici Guida Asta (1-5)</h2>
        <div class="indices-selector-list">
          <div class="index-select-group">
            <div class="index-select-header">
              <span class="index-select-title">Titolarità:</span>
              <strong class="index-select-rating">${indices.titIndex}/5</strong>
            </div>
            <select id="edit-tit-index" class="fanta-select index-edit-dropdown">
              <option value="1" ${indices.titIndex === 1 ? 'selected' : ''}>1 · Non gioca mai</option>
              <option value="2" ${indices.titIndex === 2 ? 'selected' : ''}>2 · Subentra raramente</option>
              <option value="3" ${indices.titIndex === 3 ? 'selected' : ''}>3 · Nelle rotazioni</option>
              <option value="4" ${indices.titIndex === 4 ? 'selected' : ''}>4 · Titolare con concorrenza</option>
              <option value="5" ${indices.titIndex === 5 ? 'selected' : ''}>5 · Titolare inamovibile</option>
            </select>
          </div>

          <div class="index-select-group">
            <div class="index-select-header">
              <span class="index-select-title">Affidabilità:</span>
              <strong class="index-select-rating">${indices.affIndex}/5</strong>
            </div>
            <select id="edit-aff-index" class="fanta-select index-edit-dropdown">
              <option value="1" ${indices.affIndex === 1 ? 'selected' : ''}>1 · Del tutto inaffidabile a livello di voti</option>
              <option value="2" ${indices.affIndex === 2 ? 'selected' : ''}>2 · Profilo altamente incostante</option>
              <option value="3" ${indices.affIndex === 3 ? 'selected' : ''}>3 · Alterna buone prestazioni ad altre deludenti</option>
              <option value="4" ${indices.affIndex === 4 ? 'selected' : ''}>4 · Quasi sempre sufficiente</option>
              <option value="5" ${indices.affIndex === 5 ? 'selected' : ''}>5 · Rendimento super costante</option>
            </select>
          </div>

          <div class="index-select-group">
            <div class="index-select-header">
              <span class="index-select-title">Integrità:</span>
              <strong class="index-select-rating">${indices.infIndex}/5</strong>
            </div>
            <select id="edit-inf-index" class="fanta-select index-edit-dropdown">
              <option value="1" ${indices.infIndex === 1 ? 'selected' : ''}>1 · Molto fragile</option>
              <option value="2" ${indices.infIndex === 2 ? 'selected' : ''}>2 · Ha avuto diversi infortuni</option>
              <option value="3" ${indices.infIndex === 3 ? 'selected' : ''}>3 · Ogni tanto salta qualche partita</option>
              <option value="4" ${indices.infIndex === 4 ? 'selected' : ''}>4 · Pochissimi infortuni</option>
              <option value="5" ${indices.infIndex === 5 ? 'selected' : ''}>5 · È sempre integro</option>
            </select>
          </div>
        </div>
      </section>

      <!-- SEZIONE RENDIMENTO STAGIONE CON SPECIALISTI INTEGRATI -->
      <section class="detail-section">
        <h2>Rendimento stagione</h2>
        <div class="info-card">
          <div class="info-row"><span>Fantamedia</span><strong>${fmtFm}</strong></div>
          <div class="info-row"><span>Media voto</span><strong>${fmtMv}</strong></div>
          <div class="info-row"><span>Presenze</span><strong>${presenze}</strong></div>
          <div class="info-row"><span>Gol / Assist</span><strong>${gol} / ${assist}</strong></div>
          <div class="info-row info-row-piazzati">
            <span>Calci piazzati</span>
            <div class="specialists-checkbox-row inline-specialists">
              <label class="checkbox-chip ${isRigorista ? 'is-checked' : ''}" title="Rigorista${spec?.rigOrder ? ` (${spec.rigOrder}ª scelta)` : ''}">
                <input type="checkbox" id="edit-rigorista" ${isRigorista ? 'checked' : ''} />
                <span class="chip-icon">🎯</span> Rig.${spec?.rigOrder ? ` (${spec.rigOrder}ª)` : ''}
              </label>
              <label class="checkbox-chip ${isPunizioni ? 'is-checked' : ''}" title="Tiratore Punizioni${spec?.punOrder ? ` (${spec.punOrder}ª scelta)` : ''}">
                <input type="checkbox" id="edit-punizioni" ${isPunizioni ? 'checked' : ''} />
                <span class="chip-icon">📐</span> Pun.${spec?.punOrder ? ` (${spec.punOrder}ª)` : ''}
              </label>
              <label class="checkbox-chip ${isCorner ? 'is-checked' : ''}" title="Tiratore Calci d'angolo${spec?.cornerOrder ? ` (${spec.cornerOrder}ª scelta)` : ''}">
                <input type="checkbox" id="edit-corner" ${isCorner ? 'checked' : ''} />
                <span class="chip-icon">🚩</span> Cor.${spec?.cornerOrder ? ` (${spec.cornerOrder}ª)` : ''}
              </label>
            </div>
          </div>
          ${ballottaggioText ? `<div class="info-row"><span>Ballottaggio</span><strong>${ballottaggioText}</strong></div>` : ''}
        </div>
      </section>

      <!-- SEZIONE NOTA PERSONALE -->
      <section class="detail-section">
        <h2>Nota personale</h2>
        <div class="note-card">
          <textarea id="player-notes-textarea" placeholder="Scrivi una nota su ${sanitizeHtml(player.name)}…">${sanitizeHtml(notes)}</textarea>
          <div class="note-footer">
            <span class="note-hint">Visibile solo a te</span>
            <button type="button" id="save-player-note-btn" class="save-note">Salva nota</button>
          </div>
        </div>
      </section>
    `;

    // Bind Assegnazione Fascia Strategia
    container.querySelectorAll('.strategy-tier-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tierId = btn.dataset.tierId;
        store.assignPlayerTier(player, tierId);
        if (tierId && tierId !== 'none') {
          const tier = roleTiers.find(t => t.id === tierId);
          notify.success(`Assegnato a "${tier?.name || 'Fascia'}"`);
        } else {
          notify.info(`Fascia rimossa per ${player.displayName || player.name}`);
        }
        this.render();
      });
    });

    // Bind Apertura Gestione Fasce
    container.querySelector('#open-strat-manager-from-inspector')?.addEventListener('click', () => {
      window.app?.strategyManager?.open(roleKey);
    });

    // Helper unificato per estrarre e salvare tutti i dati del form
    const saveCurrentForm = (notifyUser = false) => {
      const isRigoristaVal = Boolean(container.querySelector('#edit-rigorista')?.checked);
      const isPunizioniVal = Boolean(container.querySelector('#edit-punizioni')?.checked);
      const isCornerVal = Boolean(container.querySelector('#edit-corner')?.checked);
      const noteVal = container.querySelector('#player-notes-textarea')?.value.trim() ?? '';
      const newTitIndex = Number(container.querySelector('#edit-tit-index')?.value) || indices.titIndex;
      const newAffIndex = Number(container.querySelector('#edit-aff-index')?.value) || indices.affIndex;
      const newInfIndex = Number(container.querySelector('#edit-inf-index')?.value) || indices.infIndex;

      const updatedData = {
        name: player.name,
        displayName: player.displayName || player.name,
        strategyTierId: player.strategyTierId || store.getPlayerTierId(player) || null,
        role: player.role || classicRole,
        classicRole: player.classicRole || classicRole,
        fantaRole: player.fantaRole || classicRole,
        mantraRole: player.mantraRole || '',
        status: player.status || 'tit_sicuro',
        titIndex: newTitIndex,
        affIndex: newAffIndex,
        infIndex: newInfIndex,
        isPenaltyTaker: isRigoristaVal,
        rigorista: isRigoristaVal,
        isFreeKickTaker: isPunizioniVal,
        punizioni: isPunizioniVal,
        isCornerTaker: isCornerVal,
        corner: isCornerVal,
        notes: noteVal,
        comment: noteVal,
        positionNotes: noteVal,
        quotazioni: player.quotazioni || {},
        stats: {
          ...(player.stats || {})
        }
      };

      store.updatePlayer(player.id, updatedData);
      if (notifyUser) {
        notify.success(`Dati e indici di ${player.displayName || player.name} salvati!`);
      }
    };

    // Live Auto-Save su Checkbox Specialisti (Rigorista, Punizioni, Corner)
    container.querySelectorAll('.checkbox-chip input').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.checkbox-chip').classList.toggle('is-checked', input.checked);
        saveCurrentForm(false);
      });
    });

    // Live Auto-Save su Modifica Select Indici (Titolarità, Affidabilità, Integrità, Ruolo)
    container.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => {
        saveCurrentForm(false);
      });
    });

    // Live Auto-Save su Modifica Input al cambio / blur
    container.querySelectorAll('input').forEach(el => {
      if (el.type !== 'checkbox') {
        el.addEventListener('change', () => saveCurrentForm(false));
      }
    });

    // Auto-Resize dinamico per il container Note Personali (nessuno scrolling)
    const notesTextarea = container.querySelector('#player-notes-textarea');
    if (notesTextarea) {
      const resizeNotes = () => {
        notesTextarea.style.height = 'auto';
        notesTextarea.style.height = `${Math.max(60, notesTextarea.scrollHeight)}px`;
      };
      resizeNotes();
      requestAnimationFrame(resizeNotes);
      setTimeout(resizeNotes, 60);

      notesTextarea.addEventListener('input', resizeNotes);
    }

    // Pulsante Salva Nota
    container.querySelector('#save-player-note-btn')?.addEventListener('click', () => {
      saveCurrentForm(true);
    });

    } catch (err) {
      console.error('Errore nel rendering scheda dettagli giocatore:', err);
      container.innerHTML = `<div class="inspector-empty-state"><p>Errore nel caricamento dei dati: ${err.message}</p></div>`;
    }
  }

  renderSubstitutesTab(container, player, selectedSlotId) {
    const allPlayers = store.getAllPlayers();
    const substitutesList = player.substitutes || [];
    const availableBench = allPlayers.filter(p => p.id !== player.id && !substitutesList.includes(p.id));

    container.innerHTML = `
      <div class="subs-and-ballottaggi-container">
        
        <!-- SEZIONE SOSTITUTI GERARCHICI -->
        <div class="form-section-card">
          <div class="form-section-title">
            <i class="fa-solid fa-arrows-up-down"></i> Gerarchia Sostituti per questa Posizione
          </div>
          <p class="section-desc">Definisci l'ordine di subentro per questa posizione (1ª scelta, 2ª scelta, ecc.).</p>

          <div class="substitutes-list-box" id="substitutes-list-box">
            ${substitutesList.length === 0 ? `
              <div class="empty-subs-notice">
                <i class="fa-solid fa-circle-question"></i>
                <p>Nessun sostituto assegnato per questa posizione.</p>
              </div>
            ` : ''}
          </div>

          <!-- Aggiungi Sostituto -->
          <div class="add-sub-box">
            <select id="add-sub-select" class="fanta-select">
              <option value="">-- Aggiungi un sostituto dalla rosa --</option>
              ${availableBench.map(p => `
                <option value="${p.id}">${sanitizeHtml(p.name || p.displayName)} (${p.role} - ${p.classicRole || p.fantaRole || 'C'})</option>
              `).join('')}
            </select>
            <button id="add-sub-btn" class="fanta-btn primary-btn btn-sm">
              <i class="fa-solid fa-plus"></i> Aggiungi
            </button>
          </div>
        </div>

        <!-- SEZIONE BALLOTTAGGIO -->
        <div class="form-section-card" id="ballottaggio-section-container">
          <!-- Rendered by ballottaggioManager -->
        </div>

      </div>
    `;

    // Render list of substitutes with reorder and delete actions
    const subListBox = container.querySelector('#substitutes-list-box');
    substitutesList.forEach((subId, idx) => {
      const subPlayer = store.getPlayer(subId);
      if (!subPlayer) return;

      const subRow = document.createElement('div');
      subRow.className = 'substitute-item-row';
      const fm = subPlayer.stats?.fantamedia ?? subPlayer.fantamedia ?? '-';
      subRow.innerHTML = `
        <div class="sub-priority-badge">${idx + 1}ª Scelta</div>
        <div class="sub-player-info">
          <span class="sub-name">${sanitizeHtml(subPlayer.name || subPlayer.displayName)}</span>
          <span class="sub-meta">${subPlayer.role} | FM: ${fm}</span>
        </div>
        <div class="sub-actions">
          ${idx > 0 ? `<button class="sub-action-btn move-up-btn" data-index="${idx}" title="Sposta su"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
          ${idx < substitutesList.length - 1 ? `<button class="sub-action-btn move-down-btn" data-index="${idx}" title="Sposta giù"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
          <button class="sub-action-btn remove-sub-btn" data-player-id="${subPlayer.id}" title="Rimuovi sostituto"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `;

      subListBox.appendChild(subRow);
    });

    // Bind Add Sub
    const addSubBtn = container.querySelector('#add-sub-btn');
    const addSubSelect = container.querySelector('#add-sub-select');
    addSubBtn?.addEventListener('click', () => {
      const subId = addSubSelect.value;
      if (!subId) {
        notify.warning('Seleziona un giocatore da aggiungere come sostituto');
        return;
      }
      store.addSubstitute(player.id, subId);
      notify.success('Sostituto aggiunto!');
      this.renderSubstitutesTab(container, player, selectedSlotId);
    });

    // Bind Move & Remove
    container.querySelectorAll('.remove-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        store.removeSubstitute(player.id, btn.dataset.playerId);
        notify.info('Sostituto rimosso');
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    container.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const newList = [...substitutesList];
        [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        store.reorderSubstitutes(player.id, newList);
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    container.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const newList = [...substitutesList];
        [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
        store.reorderSubstitutes(player.id, newList);
        this.renderSubstitutesTab(container, player, selectedSlotId);
      });
    });

    // Render Ballottaggio Section
    const ballContainer = container.querySelector('#ballottaggio-section-container');
    if (ballContainer) {
      renderBallottaggioSection(ballContainer, player, selectedSlotId);
    }
  }

  bindCloseButton() {
    const closeBtn = this.container.querySelector('#close-inspector-btn') || this.container.querySelector('.sidebar-close-btn');
    closeBtn?.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        const sidebarInspector = document.querySelector('#sidebar-inspector');
        const backdrop = document.querySelector('#mobile-drawer-backdrop');
        sidebarInspector?.classList.remove('mobile-open');
        backdrop?.classList.add('hidden');
      } else {
        document.body.classList.toggle('right-sidebar-collapsed');
      }
    });
  }
}
