/**
 * Componente per la generazione della card del giocatore (Design System Editorial Minimal).
 */

import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { store } from '../store.js';
import { sanitizeHtml, getTitolaritaClass } from '../utils/helpers.js';

function getPlayerInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPiazzatiLabel(player) {
  const isRigorista = Boolean(player.isPenaltyTaker ?? player.rigorista ?? false);
  const isPunizioni = Boolean(player.isFreeKickTaker ?? player.punizioni ?? false);
  const isCorner = Boolean(player.isCornerTaker ?? player.corner ?? false);

  const list = [];
  if (isRigorista) list.push('Rig.');
  if (isPunizioni) list.push('Pun.');
  if (isCorner) list.push('Cor.');

  return list.length > 0 ? list.join(' · ') : '—';
}

function getStatusLabel(status) {
  const map = {
    tit_sicuro: 'Titolarissimo',
    titolare: 'Titolare',
    ballottaggio: 'In Ballottaggio',
    alternativa: 'Alternativa',
    giovane: 'Giovane',
    fuori_rosa: 'Fuori Rosa',
    infortunato: 'Infortunato'
  };
  return map[status] || 'Titolare';
}

export function createPlayerCard(player, options = {}) {
  const {
    slotId = null,
    slotRole = null,
    isLineup = false,
    isSelected = false,
    compact = false,
    rank = null
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

  const card = document.createElement('article');
  card.className = [
    'player-card',
    isLineup ? 'pitch-slot-card' : 'bench-player-card',
    isSelected ? 'is-selected' : '',
    compact ? 'is-compact' : '',
    !isAvailable ? 'is-unavailable is-taken' : '',
    `status-${player.status}`
  ].filter(Boolean).join(' ');

  if (slotId) card.dataset.slotId = slotId;
  card.dataset.playerId = player.id;

  const displayName = player.displayName || player.name || 'Giocatore';
  const initials = getPlayerInitials(player.name || displayName);
  const classicRole = player.classicRole || player.fantaRole || 'C';
  const fmVal = player.stats?.fantamedia ?? player.fantamedia ?? '-';
  const mvVal = player.stats?.mediaVoto ?? '-';
  const presenze = player.stats?.presenze ?? 0;
  const gol = player.stats?.gol ?? 0;
  const assist = player.stats?.assist ?? 0;
  const titolarita = player.stats?.titolarita ?? player.titolaritaPerc;
  const titClass = getTitolaritaClass(titolarita ?? 50);

  const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);
  const isElite = appetibilitaVal >= 75;

  const currentTeam = store.getCurrentTeam();
  const teamName = player.teamName || (player.teamId ? store.getTeam(player.teamId)?.name : null) || currentTeam?.name || 'Serie A';
  const statusText = getStatusLabel(player.status);
  const piazzatiText = getPiazzatiLabel(player);

  const qtA = player.quotazioni?.qtA ?? '-';
  const fvm = player.quotazioni?.fvm ?? '-';

  // Ballottaggio badge
  let ballottaggioHtml = '';
  if (ballottaggio && isLineup) {
    const isPlayerA = ballottaggio.playerAId === player.id;
    const perc = isPlayerA ? (ballottaggio.percentageA || ballottaggio.percA || 50) : (ballottaggio.percentageB || ballottaggio.percB || 50);
    const opponentId = isPlayerA ? ballottaggio.playerBId : ballottaggio.playerAId;
    const opponent = store.getPlayer(opponentId);
    const opponentName = opponent ? (opponent.displayName || opponent.name) : 'Altro';

    ballottaggioHtml = `
      <span class="duel" title="In ballottaggio con ${sanitizeHtml(opponentName)} (${perc}%)">
        <svg viewBox="0 0 24 24"><path d="M12 3v18M6 6h12M5 6l-3 7h7L6 6Zm13 0-3 7h7l-3-7Z" /></svg>
        Ballottaggio · ${perc}% vs ${sanitizeHtml(opponentName)}
      </span>
    `;
  }

  // Template Strutturale Editorial Minimal
  card.innerHTML = `
    <header class="player-top">
      <div class="avatar">${initials}</div>
      <div class="identity">
        <h3 class="player-name" title="${sanitizeHtml(player.name)}">${sanitizeHtml(displayName)}</h3>
        <div class="player-meta">
          ${rank ? `<span class="rank-badge">#${rank}</span><span class="separator">·</span>` : ''}
          <span>${sanitizeHtml(teamName)}</span>
          <span class="separator">·</span>
          <span>${sanitizeHtml(statusText)}</span>
        </div>
      </div>
      <button class="availability ${isAvailable ? 'available' : 'taken'}" type="button" title="Stato Asta: ${isAvailable ? 'Disponibile (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}" aria-label="Cambia stato asta">
        <svg viewBox="0 0 24 24">
          ${isAvailable 
            ? '<path d="m5 12 4 4L19 6" />' 
            : '<path d="m7 7 10 10M17 7 7 17" />'}
        </svg>
      </button>
    </header>

    <div class="core-metrics">
      <div class="metric">
        <div class="metric-value ${isElite ? 'elite' : ''}">${appetibilitaVal}</div>
        <span class="metric-label">Appetibilità</span>
      </div>
      <div class="metric">
        <div class="metric-value">${titolarita !== undefined ? `${titolarita}%` : '—'}</div>
        <span class="metric-label">Titolarità</span>
      </div>
      <div class="metric">
        <span class="role">${player.role || classicRole}</span>
        <span class="metric-label">Ruolo</span>
      </div>
      <div class="metric">
        <div class="set-pieces">${piazzatiText}</div>
        <span class="metric-label">Piazzati</span>
      </div>
    </div>

    <div class="data-rail">
      <div class="market-list">
        <div class="market"><label>QtA</label><strong>${qtA}</strong></div>
        <div class="market"><label>FVM</label><strong>${fvm}</strong></div>
      </div>
      <div class="season">
        <span>FM <strong>${fmVal}</strong></span>
        <span>MV <strong>${mvVal}</strong></span>
        <span>PG <strong>${presenze}</strong></span>
        <span>G <strong>${gol}</strong></span>
        <span>A <strong>${assist}</strong></span>
      </div>
    </div>

    ${ballottaggioHtml}
  `;

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

    if (window.innerWidth <= 900) {
      sidebarInspector?.classList.add('mobile-open');
      sidebarTeams?.classList.remove('mobile-open');
      backdrop?.classList.remove('hidden');
    }
  };

  // 1. Native dblclick per mouse Desktop
  card.addEventListener('dblclick', (e) => {
    if (e.target.closest('.availability')) return;
    e.stopPropagation();
    e.preventDefault();
    triggerOpenInspector();
  });

  // 2. Click / Touch handler per singolo click (selezione) e doppio tocco mobile (<350ms)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.availability')) return;
    if (hasMoved) {
      hasMoved = false;
      return;
    }
    e.stopPropagation();

    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 350 && tapLength > 0) {
      triggerOpenInspector();
      lastTapTime = 0;
    } else {
      lastTapTime = currentTime;
      store.selectPlayer(player.id, slotId);
    }
  });

  // Listener per toggle rapido disponibilità asta
  const astaToggleBtn = card.querySelector('.availability');
  astaToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.togglePlayerAvailability(player.id);
  });

  return card;
}
