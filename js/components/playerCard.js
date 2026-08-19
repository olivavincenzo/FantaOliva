/**
 * Componente per la generazione della card del giocatore (stile EA Sports FC Tactical Hub).
 */

import { ROLES, PLAYER_STATUSES } from '../data/roles.js';
import { store } from '../store.js';
import { sanitizeHtml } from '../utils/helpers.js';

export function createPlayerCard(player, options = {}) {
  const {
    slotId = null,
    isLineup = false,
    isSelected = false,
    compact = false
  } = options;

  if (!player) {
    // Card slot vuoto
    const emptyCard = document.createElement('div');
    emptyCard.className = `player-card empty-slot ${isSelected ? 'is-selected' : ''}`;
    if (slotId) emptyCard.dataset.slotId = slotId;
    emptyCard.innerHTML = `
      <div class="empty-slot-content">
        <i class="fa-solid fa-plus-circle empty-icon"></i>
        <span class="empty-text">Seleziona</span>
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

  const appetibilitaVal = player.appetibilita !== undefined ? Number(player.appetibilita) : (player.stats?.titolarita ?? 50);
  let appetibilitaClass = 'app-mid';
  if (appetibilitaVal >= 75) appetibilitaClass = 'app-high';
  else if (appetibilitaVal <= 40) appetibilitaClass = 'app-low';

  // Costruzione card in stile EA Sports FC
  card.innerHTML = `
    <!-- Glowing Accent border -->
    <div class="card-glow-border" style="--role-color: ${roleInfo.color}; --status-color: ${statusInfo.color}"></div>

    ${!isAvailable ? `
      <div class="card-taken-overlay" title="Giocatore già acquistato / non disponibile all'asta">
        <span class="taken-stamp">PRESO</span>
      </div>
    ` : ''}

    <div class="card-top-bar">
      <!-- Indice di Appetibilità al posto del numero di maglia -->
      <span class="player-appetibilita ${appetibilitaClass}" title="Indice Appetibilità Fantacalcio: ${appetibilitaVal}/100">
        <i class="fa-solid fa-fire"></i>${appetibilitaVal}
      </span>
      <!-- Ruolo badge colorato -->
      <span class="role-badge" style="background-color: ${roleInfo.bgColor}; color: ${roleInfo.color}; border-color: ${roleInfo.borderColor}">
        ${player.role}
      </span>
      <!-- Quick Asta Toggle Dot -->
      <span class="asta-availability-dot ${isAvailable ? 'is-available' : 'is-taken'}" title="Stato Asta: ${isAvailable ? 'Disponibile (clicca per segnare PRESO)' : 'PRESO (clicca per segnare DISPONIBILE)'}">
        <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      </span>
    </div>

    <!-- Avatar / Silhouette -->
    <div class="card-avatar-container">
      <div class="card-avatar-initials" style="background: linear-gradient(135deg, ${roleInfo.color}33, #0a1120)">
        ${displayName.charAt(0).toUpperCase()}
      </div>
    </div>

    <!-- Nome Giocatore -->
    <div class="card-info">
      <div class="player-name" title="${sanitizeHtml(player.name)}">
        ${sanitizeHtml(displayName)}
      </div>
      <div class="player-submeta">
        <span class="fanta-role-tag">${classicRole}</span>
        ${fm ? `<span class="fm-score" title="Fantamedia">FM ${Number(fm).toFixed(1)}</span>` : ''}
      </div>
    </div>

    <!-- Badges Rigorista / Piazzati & Ballottaggi -->
    <div class="card-bottom-badges">
      ${fantaBadges.join('')}
      ${ballottaggioBadge}
    </div>
  `;

  // Listener per toggle rapido disponibilità asta
  const astaToggleBtn = card.querySelector('.asta-availability-dot');
  astaToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.togglePlayerAvailability(player.id);
  });

  return card;
}
