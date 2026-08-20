/**
 * Componente per la generazione della card del giocatore (stile EA Sports FC Tactical Hub).
 */

import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { store } from '../store.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';

export function createPlayerCard(player, options = {}) {
  const {
    slotId = null,
    slotRole = null,
    isLineup = false,
    isSelected = false,
    compact = false
  } = options;

  if (!player) {
    // Card slot vuoto: mostra direttamente il ruolo/posizione dello slot
    const emptyCard = document.createElement('div');
    emptyCard.className = `player-card empty-slot ${isSelected ? 'is-selected' : ''}`;
    if (slotId) emptyCard.dataset.slotId = slotId;
    const labelText = slotRole ? `${slotRole}` : 'Seleziona';
    emptyCard.innerHTML = `
      <div class="empty-slot-content">
        <i class="fa-solid fa-plus-circle empty-icon"></i>
        <span class="empty-text">${sanitizeHtml(labelText)}</span>
      </div>
    `;
    return emptyCard;
  }

  const roleInfo = ROLES[player.role] || ROLES.C;
  const statusInfo = PLAYER_STATUSES[player.status] || PLAYER_STATUSES.tit_sicuro;
  const ballottaggio = store.getBallottaggioForPlayer(player.id);

  const isAvailable = player.isAvailable !== false;

  const card = document.createElement('div');
  card.className = [
    'player-card',
    isLineup ? 'pitch-slot-card' : 'bench-player-card',
    isSelected ? 'is-selected' : '',
    compact ? 'is-compact' : '',
    !isAvailable ? 'is-unavailable' : '',
    `status-${player.status}`
  ].filter(Boolean).join(' ');

  if (slotId) card.dataset.slotId = slotId;
  card.dataset.playerId = player.id;

  const isRigorista = player.isPenaltyTaker ?? player.rigorista ?? false;
  const isPunizioni = player.isFreeKickTaker ?? player.punizioni ?? false;
  const isCorner = player.isCornerTaker ?? player.corner ?? false;

  // Icone fantacalcio veloci
  const fantaBadges = [];
  if (isRigorista) fantaBadges.push('<span class="fanta-badge fanta-rigori" title="1º Rigorista">🎯</span>');
  if (isPunizioni) fantaBadges.push('<span class="fanta-badge fanta-puniz" title="Tiratore Punizioni">📐</span>');
  if (isCorner)    fantaBadges.push('<span class="fanta-badge fanta-corner" title="Tiratore Corner">🚩</span>');

  // Ballottaggio badge se presente
  let ballottaggioBadge = '';
  if (ballottaggio && isLineup) {
    const isPlayerA = ballottaggio.playerAId === player.id;
    const perc = isPlayerA ? (ballottaggio.percentageA || ballottaggio.percA || 50) : (ballottaggio.percentageB || ballottaggio.percB || 50);
    const opponentId = isPlayerA ? ballottaggio.playerBId : ballottaggio.playerAId;
    const opponent = store.getPlayer(opponentId);
    const opponentName = opponent ? (opponent.displayName || opponent.name) : 'Altro';

    ballottaggioBadge = `
      <div class="ballottaggio-pill" title="In ballottaggio con ${sanitizeHtml(opponentName)} (${perc}%)">
        <i class="fa-solid fa-scale-balanced"></i> ${perc}%
      </div>
    `;
  }

  const displayName = player.displayName || player.name || 'Giocatore';
  const classicRole = player.classicRole || player.fantaRole || 'C';
  const fm = player.stats?.fantamedia ?? player.fantamedia;
  const titolarita = player.stats?.titolarita ?? player.titolaritaPerc;
  const titClass = getTitolaritaClass(titolarita ?? 50);

  const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);
  let appetibilitaClass = 'app-mid';
  if (appetibilitaVal >= 75) appetibilitaClass = 'app-high';
  else if (appetibilitaVal <= 40) appetibilitaClass = 'app-low';

  const positionNotes = player.positionNotes || player.comment || '';
  const fantaComment = player.fantaComment || '';
  const hasNotes = Boolean(positionNotes.trim() || fantaComment.trim());

  if (isLineup) {
    const qtA = player.quotazioni?.qtA ?? '-';
    const fvm = player.quotazioni?.fvm ?? '-';
    const fmVal = player.stats?.fantamedia ?? player.fantamedia ?? '-';
    const mvVal = player.stats?.mediaVoto ?? '-';
    const presenze = player.stats?.presenze ?? 0;
    const gol = player.stats?.gol ?? 0;
    const assist = player.stats?.assist ?? 0;

    // Card Tattica sul Campo (Visualizzazione Diretta con tutte le statistiche)
    card.innerHTML = `
      <div class="card-glow-border" style="--role-color: ${roleInfo.color}; --status-color: ${statusInfo.color}"></div>

      ${!isAvailable ? `
        <div class="card-taken-overlay" title="Giocatore già acquistato / non disponibile all'asta">
          <span class="taken-stamp">PRESO</span>
        </div>
      ` : ''}

      <!-- NOME CALCIATORE & STATO ASTA -->
      <div class="card-header-row">
        <div class="player-name" title="${sanitizeHtml(player.name)}">
          ${sanitizeHtml(displayName)}
        </div>
        <div class="card-top-bar">
          <span class="asta-availability-dot ${isAvailable ? 'is-available' : 'is-taken'}" title="Stato Asta: ${isAvailable ? 'Disponibile (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}">
            <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          </span>
        </div>
      </div>

      <!-- RIGHE STATISTICHE COMPLETE FANTACALCIO -->
      <div class="card-stats-rows">
        <!-- Riga 1: Appetibilità, Titolarità, Ruolo + Flags -->
        <div class="card-stats-row">
          <span class="player-appetibilita ${appetibilitaClass}" title="Indice Appetibilità Fantacalcio: ${appetibilitaVal}/100">
            <i class="fa-solid fa-fire"></i>${appetibilitaVal}
          </span>
          ${titolarita !== undefined ? `<span class="tit-badge ${titClass}" title="% Titolarità">${titolarita}%</span>` : ''}
          <span class="slot-role-tag-sub" style="background: ${roleInfo.bgColor}; color: ${roleInfo.color}; border: 1px solid ${roleInfo.borderColor};" title="Posizione: ${player.role}${player.mantraRole ? ` (Mantra: ${player.mantraRole})` : ''}">${player.role || classicRole}</span>
          ${fantaBadges.join('')}
        </div>

        <!-- Riga 2: Quotazione Iniziale & FantaValore Mercato -->
        <div class="card-stats-row stat-row-nums">
          <span class="stat-chip" title="Quotazione Attuale (Classic)">QtA ${qtA}</span>
          <span class="stat-chip" title="FantaValore Mercato (base 1000)">FVM ${fvm}</span>
        </div>

        <!-- Riga 3: Fantamedia, Media Voto, Presenze, Gol, Assist -->
        <div class="card-stats-row stat-row-nums">
          <span class="stat-chip" title="Fantamedia">FM ${fmVal}</span>
          <span class="stat-chip" title="Media Voto">MV ${mvVal}</span>
          <span class="stat-chip" title="Presenze"><i class="fa-solid fa-calendar"></i> ${presenze}</span>
          <span class="stat-chip" title="Gol Segnati">⚽ ${gol}</span>
          <span class="stat-chip" title="Assist">🅰 ${assist}</span>
        </div>
      </div>

      <!-- BADGES INFERIORI (Ballottaggio) -->
      ${ballottaggioBadge ? `
        <div class="card-bottom-badges">
          ${ballottaggioBadge}
        </div>
      ` : ''}
    `;
  } else {
    // Card standard per Panchina (compatta)
    card.innerHTML = `
      <div class="card-glow-border" style="--role-color: ${roleInfo.color}; --status-color: ${statusInfo.color}"></div>

      ${!isAvailable ? `
        <div class="card-taken-overlay" title="Giocatore già acquistato / non disponibile all'asta">
          <span class="taken-stamp">PRESO</span>
        </div>
      ` : ''}

      <div class="card-top-bar" style="justify-content: flex-end;">
        <span class="asta-availability-dot ${isAvailable ? 'is-available' : 'is-taken'}" title="Stato Asta: ${isAvailable ? 'Disponibile (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}">
          <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        </span>
      </div>

      <div class="card-info">
        <div class="player-name" title="${sanitizeHtml(player.name)}">
          ${sanitizeHtml(displayName)}
        </div>
        <div class="player-submeta">
          <span class="player-appetibilita ${appetibilitaClass}" title="Indice Appetibilità Fantacalcio: ${appetibilitaVal}/100">
            <i class="fa-solid fa-fire"></i>${appetibilitaVal}
          </span>
          ${titolarita !== undefined ? `<span class="tit-badge ${titClass}" title="% Titolarità">${titolarita}% Tit</span>` : ''}
          <span class="slot-role-tag-sub" style="background: ${roleInfo.bgColor}; color: ${roleInfo.color}; border: 1px solid ${roleInfo.borderColor};" title="Ruolo: ${player.role} (${classicRole})">${player.role}</span>
        </div>
      </div>

      <div class="card-bottom-badges">
        ${fantaBadges.join('')}
        ${ballottaggioBadge}
      </div>
    `;
  }

  // Gestione Universale Click (selezione) e Doppio Click / Doppio Tocco (apertura scheda)
  let lastTapTime = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let hasMoved = false;

  card.addEventListener('pointerdown', (e) => {
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    hasMoved = false;
  }, { passive: true });

  card.addEventListener('pointermove', (e) => {
    if (!hasMoved) {
      const dist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
      if (dist > 8) {
        hasMoved = true;
      }
    }
  }, { passive: true });

  const triggerOpenInspector = () => {
    store.selectPlayer(player.id, slotId);

    // Desktop: apri sidebar destra se collassata
    if (document.body.classList.contains('right-sidebar-collapsed')) {
      document.body.classList.remove('right-sidebar-collapsed');
    }

    // Mobile: apri drawer sidebar destra
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
  };

  // 1. Native dblclick per mouse Desktop
  card.addEventListener('dblclick', (e) => {
    if (e.target.closest('.asta-availability-dot')) return;
    e.stopPropagation();
    e.preventDefault();
    triggerOpenInspector();
  });

  // 2. Click / Touch handler per singolo click (selezione) e doppio tocco mobile (<350ms)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.asta-availability-dot')) return;
    if (hasMoved) {
      // È stato uno scorrimento (scroll), non selezionare il calciatore
      hasMoved = false;
      return;
    }
    e.stopPropagation();

    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 350 && tapLength > 0) {
      // Doppio tocco / click rapido -> Apre la scheda
      triggerOpenInspector();
      lastTapTime = 0;
    } else {
      // Singolo tocco / click -> Seleziona il giocatore
      lastTapTime = currentTime;
      store.selectPlayer(player.id, slotId);
    }
  });

  // Listener per toggle rapido disponibilità asta
  const astaToggleBtn = card.querySelector('.asta-availability-dot');
  astaToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.togglePlayerAvailability(player.id);
  });

  return card;
}
