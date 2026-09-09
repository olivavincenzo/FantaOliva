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
  if (!player) return '—';
  const iconMap = {
    rig: '🎯',
    pun: '📐',
    corner: '🚩'
  };
  const titleMap = {
    rig: 'Rigorista',
    pun: 'Tiratore Punizioni',
    corner: 'Tiratore Calci d\'angolo'
  };

  if (store.getPlayerSpecialists) {
    const spec = store.getPlayerSpecialists(player);
    if (spec && Array.isArray(spec.items) && spec.items.length > 0) {
      return spec.items.map(item => {
        const icon = iconMap[item.type] || '🎯';
        const typeTitle = titleMap[item.type] || 'Piazzato';
        const orderText = item.order ? `${item.order}ª scelta` : 'Specialista';
        const fullTitle = `${orderText} ${typeTitle}`;
        const num = item.order ? `<strong class="sp-num">${item.order}</strong>` : '';
        return `<span class="sp-item sp-${item.type}" title="${fullTitle}">${num}<span class="sp-ico">${icon}</span></span>`;
      }).join(' ');
    }
  }

  const isRigorista = Boolean(player.isPenaltyTaker ?? player.rigorista ?? false);
  const isPunizioni = Boolean(player.isFreeKickTaker ?? player.punizioni ?? false);
  const isCorner = Boolean(player.isCornerTaker ?? player.corner ?? false);

  const chips = [];
  if (isRigorista) chips.push(`<span class="sp-item sp-rig" title="1ª scelta Rigorista"><strong class="sp-num">1</strong><span class="sp-ico">🎯</span></span>`);
  if (isPunizioni) chips.push(`<span class="sp-item sp-pun" title="Tiratore Punizioni"><span class="sp-ico">📐</span></span>`);
  if (isCorner) chips.push(`<span class="sp-item sp-corner" title="Tiratore Calci d'angolo"><span class="sp-ico">🚩</span></span>`);

  return chips.length > 0 ? chips.join(' ') : '—';
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

/**
 * Formatta il nome della fascia per la visualizzazione compatta (Soluzione 3).
 * - Fino a 11 caratteri (es. "SUPER TOP", "1ª FASCIA", "SEMI-TOP", "TITOLARE"): mostra il nome per intero (100%).
 * - Per nomi lunghi (> 11 caratteri): garantisce sempre almeno il 70% dei caratteri prima di '…'.
 */
function formatTierName(name, isCompact = false) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  // Fino a 16 caratteri entra comodamente (su riga intera o 5 colonne) e viene mostrato al 100% per intero
  if (!isCompact || trimmed.length <= 16) return trimmed;

  // Calcola il 70% minimo garantito dei caratteri originali
  const minChars = Math.ceil(trimmed.length * 0.7);

  // Se il testo è composto da più parole, cerca un confine naturale di parola che copra >= 70%
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    let accumulated = '';
    for (const w of words) {
      const next = accumulated ? `${accumulated} ${w}` : w;
      if (next.length >= minChars) {
        accumulated = next;
        break;
      }
      accumulated = next;
    }
    if (accumulated && accumulated.length >= minChars && accumulated.length < trimmed.length) {
      return `${accumulated}…`;
    }
  }

  // Altrimenti, tronca garantendo matematicamente almeno il 70% dei caratteri
  const sliceLen = Math.max(minChars, 9);
  if (sliceLen < trimmed.length) {
    return `${trimmed.slice(0, sliceLen).trim()}…`;
  }
  return trimmed;
}

function getTeamJerseySvg(player, team) {
  const classicRole = (player?.classicRole || player?.fantaRole || player?.role || 'C').toUpperCase();
  const isGk = classicRole === 'P' || classicRole === 'POR';

  if (isGk) {
    return `
      <svg class="jersey-svg" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M16 12 L24 6 L40 6 L48 12 L56 22 L46 29 L44 24 L44 58 L20 58 L20 24 L18 29 L8 22 Z" fill="#f59e0b"/>
        <path d="M25 6 C 25 14, 39 14, 39 6" fill="none" stroke="#000000" stroke-width="2.5"/>
        <circle cx="28" cy="22" r="3" fill="#003cd6" opacity="0.9"/>
      </svg>
    `;
  }

  const primary = team?.primaryColor || '#003cd6';
  const secondary = team?.secondaryColor || (primary.toLowerCase() === '#ffffff' ? '#111827' : '#0b0f19');
  const accent = team?.accentColor || '#ffdd00';

  return `
    <svg class="jersey-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 12 L24 6 L40 6 L48 12 L56 22 L46 29 L44 24 L44 58 L20 58 L20 24 L18 29 L8 22 Z" fill="${primary}"/>
      <rect x="23" y="6" width="6" height="52" fill="${secondary}"/>
      <rect x="35" y="6" width="6" height="52" fill="${secondary}"/>
      <circle cx="28" cy="22" r="3" fill="${accent}" opacity="0.9"/>
    </svg>
  `;
}

function getSetPiecesChipsHtml(player) {
  if (!player || !store.getPlayerSpecialists) return '';
  const spec = store.getPlayerSpecialists(player);
  if (!spec || !Array.isArray(spec.items) || spec.items.length === 0) return '';

  const iconMap = { rig: '🎯', pun: '📐', corner: '🚩' };
  const classMap = { rig: 'sp-rig', pun: 'sp-pun', corner: 'sp-cor' };
  const titleMap = { rig: 'Rigori', pun: 'Punizioni', corner: 'Corner' };

  return spec.items.map(item => {
    const icon = iconMap[item.type] || '🎯';
    const cls = classMap[item.type] || 'sp-rig';
    const title = item.order ? `${item.order}ª scelta ${titleMap[item.type] || 'Piazzati'}` : (titleMap[item.type] || 'Specialista');
    const orderStr = item.order ? `${item.order}` : '';
    return `<span class="sp-chip ${cls}" title="${title}">${orderStr}${icon}</span>`;
  }).join('');
}

function getTierStyleAndClass(tier) {
  if (!tier || !tier.name) {
    return {
      className: 'tier-default',
      style: '',
      label: 'N.D.'
    };
  }

  const nameNorm = tier.name.toLowerCase().replace(/[^a-z]/g, '');
  let cls = 'tier-default';
  let hasPresetClass = false;

  if (nameNorm.includes('supertop')) {
    cls = 'tier-supertop';
    hasPresetClass = true;
  } else if (nameNorm.includes('top')) {
    cls = 'tier-top';
    hasPresetClass = true;
  } else if (nameNorm.includes('semitop')) {
    cls = 'tier-semitop';
    hasPresetClass = true;
  } else if (nameNorm.includes('titolare')) {
    cls = 'tier-titolare';
    hasPresetClass = true;
  }

  const style = (!hasPresetClass && tier.color) ? `background: ${tier.color}; color: #050b1a; box-shadow: 0 0 10px ${tier.color}80;` : '';
  return {
    className: cls,
    style,
    label: tier.name.toUpperCase()
  };
}

export function renderIndexSegments(score) {
  const s = Math.max(1, Math.min(5, Math.round(Number(score) || 3)));
  let segs = '';
  for (let i = 1; i <= 5; i++) {
    segs += `<span class="segment-bar ${i <= s ? 'is-filled' : ''}"></span>`;
  }
  return `<div class="index-segments-bar score-${s}" data-score="${s}" role="img" aria-label="${s}/5">${segs}</div>`;
}

export function createPlayerCard(player, options = {}) {
  const {
    slotId = null,
    slotRole = null,
    isLineup = false,
    isPitchCard = false,
    isSelected = false,
    compact = false,
    rank = null,
    showTeam = false
  } = options;

  const is3dPitchCard = Boolean(isPitchCard || (isLineup && compact));

  if (!player) {
    // Card slot vuoto: mostra direttamente il ruolo/posizione dello slot
    const emptyCard = document.createElement('div');
    emptyCard.className = `player-card empty-slot ${is3dPitchCard ? 'studio-empty-slot' : ''} ${isSelected ? 'is-selected' : ''}`;
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
  const isAvailable = player.isAvailable !== false;

  const isFavorite = Boolean(player.isFavorite || store.isPlayerFavorite(player.id) || (player.csvId && store.isPlayerFavorite(player.csvId.toString())));

  const classicRole = store.getRoleCategory(player) || player.classicRole || player.fantaRole || 'C';
  const roleNorm = (classicRole || 'C').toUpperCase();
  const roleChar = (roleNorm === 'P' || roleNorm === 'POR') ? 'p' : roleNorm.charAt(0).toLowerCase();
  const roleClass = `role-${roleChar}`;

  const card = document.createElement('article');
  card.className = [
    'player-card',
    isLineup ? 'pitch-slot-card' : 'bench-player-card',
    is3dPitchCard ? `studio-player-card ${roleClass}` : '',
    isSelected ? 'is-selected' : '',
    compact ? 'is-compact' : '',
    isFavorite ? 'is-favorite' : '',
    !isAvailable ? 'is-unavailable is-taken' : '',
    `status-${player.status}`
  ].filter(Boolean).join(' ');

  if (slotId) card.dataset.slotId = slotId;
  card.dataset.playerId = player.id;

  const displayName = player.displayName || player.name || 'Giocatore';
  const initials = getPlayerInitials(player.name || displayName);
  const fmVal = player.stats?.fantamedia ?? player.fantamedia ?? '-';
  const mvVal = player.stats?.mediaVoto ?? '-';
  const presenze = player.stats?.presenze ?? 0;
  const gol = player.stats?.gol ?? 0;
  const assist = player.stats?.assist ?? 0;
  const titolarita = player.stats?.titolarita ?? player.titolaritaPerc;
  const titClass = getTitolaritaClass(titolarita ?? 50);

  const indices = store.getPlayerIndices(player);
  const suggestedPrice = store.getPlayerSuggestedPrice(player);

  const currentTeam = store.getCurrentTeam();
  const teamName = player.teamName || (player.teamId ? store.getTeam(player.teamId)?.name : null) || currentTeam?.name || 'Serie A';
  const statusText = getStatusLabel(player.status);
  const piazzatiText = getPiazzatiLabel(player);
  const hasSetPieces = piazzatiText !== '—';
  const spCount = hasSetPieces ? (piazzatiText.match(/class="sp-item/g) || []).length : 0;
  let setPiecesClass = 'has-no-set-pieces sp-count-0';
  if (spCount === 1) {
    setPiecesClass = 'has-single-set-piece has-1-set-piece sp-count-1';
  } else if (spCount === 2) {
    setPiecesClass = 'has-double-set-piece has-2-set-pieces has-multi-set-pieces sp-count-2';
  } else if (spCount >= 3) {
    setPiecesClass = 'has-triple-set-piece has-3-set-pieces has-multi-set-pieces sp-count-3';
  }
  card.classList.add(...setPiecesClass.split(' '));
  if (hasSetPieces) card.classList.add('has-active-set-pieces');

  const qtA = player.quotazioni?.qtA ?? '-';
  const fvm = player.quotazioni?.fvm ?? '-';
  const tier = store.getPlayerTier(player);

  // Se la card è compatta, verifica se il 70% dei caratteri della fascia entra nello spazio disponibile sulla riga.
  // Se non entra al 70%, la fascia va a capo su Riga 3 (mantenendo la grandezza originale del font)!
  if (compact && tier?.name) {
    const tierNameLen = tier.name.trim().length;
    const chars70 = Math.ceil(tierNameLen * 0.7);
    // Con 1 piazzato (spCount === 1) ci sono solo 3 colonne disponibili sulla riga (~40px), entrano max 5 caratteri
    if (spCount === 1 && chars70 > 5) {
      card.classList.add('has-tier-row-3');
    } else if (spCount === 0 && chars70 > 13) {
      // Con 0 piazzati ci sono 5 colonne disponibili sulla riga (~75px), entrano max 13 caratteri
      card.classList.add('has-tier-row-3');
    }
  }

  // Ballottaggio badge (pillole separate per ciascuna scelta con icona e percentuali)
  let ballottaggioHtml = '';
  const ballottaggio = store.getBallottaggioForPlayer(player.id) || (slotId ? store.getBallottaggioForSlot(slotId) : null) || (player.ballottaggio ? {
    opponentName: player.ballottaggio.vs,
    percA: player.ballottaggio.perc,
    percB: player.ballottaggio.opponentPerc || (100 - (player.ballottaggio.perc || 50)),
    substitutes: player.substitutes || []
  } : null);

  if (ballottaggio) {
    if (ballottaggio.substitutes && ballottaggio.substitutes.length > 0) {
      const badges = ballottaggio.substitutes.map((s, idx) => {
        const rawName = s.displayName || s.name || '';
        const nameClean = rawName.includes('(') ? rawName : `${rawName}${s.perc ? ` (${s.perc}%)` : ''}`;
        const subId = s.id || s.playerId || '';
        const subName = (s.name || s.displayName || '').replace(/\s*\(\d+%\)$/, '').trim();
        return `<span class="duel" data-duel-id="${subId}" data-duel-name="${sanitizeHtml(subName)}" title="In ballottaggio con ${sanitizeHtml(nameClean)} (Doppio click per aprire scheda)"><i class="fa-solid fa-scale-unbalanced" style="font-size: 7.5px;"></i> ${idx + 1}ª ${sanitizeHtml(nameClean)}</span>`;
      }).join(' ');

      ballottaggioHtml = `<div class="duels-list">${badges}</div>`;
    } else if (ballottaggio.opponentName) {
      const opp = ballottaggio.opponentName;
      const perc = ballottaggio.percA ?? ballottaggio.percentageA ?? 50;
      const oppClean = opp.includes('(') ? opp : `${opp} (${ballottaggio.percB ?? (100 - perc)}%)`;
      const oppName = opp.replace(/\s*\(\d+%\)$/, '').trim();
      ballottaggioHtml = `
        <div class="duels-list">
          <span class="duel" data-duel-name="${sanitizeHtml(oppName)}" title="Ballottaggio con ${sanitizeHtml(oppClean)} (Doppio click per aprire scheda)"><i class="fa-solid fa-scale-unbalanced" style="font-size: 7.5px;"></i> 1ª ${sanitizeHtml(oppClean)}</span>
        </div>
      `;
    }
  }

  const photoUrl = player.photoUrl || player.playerImage || '';
  const avatarHtml = `
    <div class="avatar ${photoUrl ? 'has-photo' : ''}">
      ${photoUrl
      ? `<img src="${photoUrl}" alt="" loading="lazy" class="card-thumb-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" /><span class="avatar-fallback-initials" style="display: none;">${initials}</span>`
      : `${initials}`}
    </div>
  `;

  const leagueOwner = store.getPlayerLeagueOwner(player);
  const isInMyTeam = store.isPlayerInMyTeam(player.id) || (leagueOwner && leagueOwner.isMyTeam);
  const myTeamInfo = isInMyTeam ? store.getMyTeamPlayerInfo(player.id) : null;
  const effectiveAvailable = (leagueOwner ? false : isAvailable);
  const injury = store.getPlayerInjury ? store.getPlayerInjury(player) : null;
  const isInjured = injury && (injury.isInjured || injury.isDoubtful || injury.status === 'injured');
  const injuryBtnHtml = isInjured ? `
    <button class="card-injury-badge-btn ${injury.isDoubtful ? 'is-doubtful' : 'is-injured'}" 
            type="button" 
            title="🏥 ${sanitizeHtml(injury.injuryDescription || (injury.isDoubtful ? 'In dubbio' : 'Infortunato'))} (Clicca per andare in Infermeria)" 
            aria-label="Infortunato">
      <i class="fa-solid ${injury.isDoubtful ? 'fa-triangle-exclamation' : 'fa-notes-medical'}"></i>
    </button>
  ` : '';

  const specificRole = (player.role && player.role !== classicRole) ? player.role : (player.mantraRole && player.mantraRole !== classicRole ? player.mantraRole : (player.role || ''));

  const rolesBadgesHtml = `
    <div class="roles-badges-wrap">
      <span class="role role-${classicRole.toLowerCase()}" title="Ruolo Classic: ${classicRole}">${classicRole}</span>
      ${specificRole ? `<span class="role role-tactical" title="Ruolo Specifico: ${specificRole}">${specificRole}</span>` : ''}
    </div>
  `;

  const strategyStripHtml = `
    <div class="player-card-strategy-strip">
      ${tier ? `
        <span class="player-strategy-badge" style="background: ${tier.color}1c; color: ${tier.color}; border: 1px solid ${tier.color}45;" title="Fascia Strategia: ${sanitizeHtml(tier.name)}">
          <span class="tier-label-text">${sanitizeHtml(formatTierName(tier.name, compact))}</span>
        </span>
      ` : `
        <span class="player-strategy-badge badge-unassigned" title="Fascia non impostata per questa strategia">
          <span class="tier-dot unassigned-dot"></span>
          <span class="tier-label-text">${compact ? 'N.D.' : 'Non impostato'}</span>
        </span>
      `}
    </div>
  `;

  // Header player top con foto, info piazzati e preferiti
  const headerHtml = `
    <header class="player-top">
      ${avatarHtml}
      <div class="identity">
        <div class="player-name-row">
          <h3 class="player-name" title="${sanitizeHtml(player.name)}">${sanitizeHtml(displayName)}</h3>
        </div>
        <div class="player-set-pieces-row ${piazzatiText !== '—' ? 'has-active-set-pieces' : ''} ${setPiecesClass}">
          ${rank ? `<span class="rank-badge">#${rank}</span>` : ''}
          ${showTeam && teamName ? `<span class="team-badge" title="Squadra: ${sanitizeHtml(teamName)}">${sanitizeHtml(teamName)}</span><span class="separator">·</span>` : ''}
          <span class="set-pieces-badge ${piazzatiText !== '—' ? 'has-set-pieces' : ''}">${piazzatiText}</span>
        </div>
      </div>
      ${compact ? '' : `
        ${rolesBadgesHtml}
        ${strategyStripHtml}
        <div class="player-top-actions">
          ${injuryBtnHtml}
          <button class="card-fav-btn ${isFavorite ? 'is-fav' : ''}" type="button" title="${isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}" aria-label="Preferito">
            <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-star"></i>
          </button>
          <button class="availability ${effectiveAvailable ? 'available' : 'taken'}" type="button" title="Stato Asta: ${effectiveAvailable ? 'Disponibile (clicca per segnare PRESO)' : (leagueOwner ? `PRESO da ${leagueOwner.teamName} (${leagueOwner.price} cr)` : 'PRESO (clicca per segnare DISPONIBILE)')}" aria-label="Cambia stato asta">
            <svg viewBox="0 0 24 24">
              ${effectiveAvailable
        ? '<path d="m5 12 4 4L19 6" />'
        : '<path d="m7 7 10 10M17 7 7 17" />'}
            </svg>
          </button>
        </div>
      `}
    </header>
  `;

  // Metriche Core: Titolarità, Affidabilità, Integrità, Crediti Consigliati, Ruolo e Statistiche Stagionali
  const seasonHtml = `
    <div class="season">
      <span class="stat-item stat-fm" title="Fantamedia Stagionale"><span class="stat-lbl">FM</span><strong class="stat-val">${fmVal}</strong></span>
      <span class="stat-item stat-mv" title="Media Voto"><span class="stat-lbl">MV</span><strong class="stat-val">${mvVal}</strong></span>
      <span class="stat-item stat-pg" title="Partite Giocate / Presenze"><span class="stat-lbl">PG</span><strong class="stat-val">${presenze}</strong></span>
      <span class="stat-item stat-g" title="Gol Segnati"><span class="stat-lbl">G</span><strong class="stat-val">${gol}</strong></span>
      <span class="stat-item stat-a" title="Assist Realizzati"><span class="stat-lbl">A</span><strong class="stat-val">${assist}</strong></span>
    </div>
  `;

  const metricsHtml = compact ? `
    <div class="core-metrics compact-metrics">
      <div class="metric metric-role" title="Ruolo: ${classicRole}">
        ${rolesBadgesHtml}
      </div>
      ${strategyStripHtml}
    </div>
  ` : `
    <div class="core-metrics">
      <div class="metric metric-index" title="Titolarità: ${indices.titIndex}/5 (${sanitizeHtml(indices.titDesc)})">
        <div class="metric-index-wrap">
          ${renderIndexSegments(indices.titIndex)}
          <span class="metric-index-val">${indices.titIndex}/5</span>
        </div>
        <span class="metric-label">Titol.</span>
      </div>
      <div class="metric metric-index" title="Affidabilità: ${indices.affIndex}/5 (${sanitizeHtml(indices.affDesc)})">
        <div class="metric-index-wrap">
          ${renderIndexSegments(indices.affIndex)}
          <span class="metric-index-val">${indices.affIndex}/5</span>
        </div>
        <span class="metric-label">Affid.</span>
      </div>
      <div class="metric metric-index" title="Integrità: ${indices.infIndex}/5 (${sanitizeHtml(indices.infDesc)})">
        <div class="metric-index-wrap">
          ${renderIndexSegments(indices.infIndex)}
          <span class="metric-index-val">${indices.infIndex}/5</span>
        </div>
        <span class="metric-label">Integr.</span>
      </div>
      <div class="metric metric-credits" title="Crediti consigliati asta: ${suggestedPrice !== null ? `${suggestedPrice} cr` : '—'}">
        <div class="metric-credits-val">
          <strong class="credits-number">${suggestedPrice !== null ? `${suggestedPrice}` : '—'}</strong>
          ${suggestedPrice !== null ? `<span class="credits-unit">cr</span>` : ''}
        </div>
        <span class="metric-label">Consigliati</span>
      </div>
      ${seasonHtml}
    </div>
  `;

  // Data rail: compatto escluso in modalità campo, orizzontale classico con colonne fisse allineate
  const railHtml = compact ? '' : `
    <div class="data-rail">
      <div class="market-list">
        <div class="market market-qta" title="Quotazione Attuale Classic"><label>QtA</label><strong>${qtA}</strong></div>
        <div class="market market-fvm" title="Fantavoto di Mercato (base 1000)"><label>FVM</label><strong>${fvm}</strong></div>
      </div>
    </div>
  `;

  if (is3dPitchCard) {
    const roleDisplay = (classicRole === 'P' || classicRole === 'POR') ? 'POR' : roleChar.toUpperCase();
    const chipsHtml = getSetPiecesChipsHtml(player);
    const tierInfo = getTierStyleAndClass(tier);
    const photoUrl = player.photoUrl || player.playerImage || player.photo || '';

    // Opzione 3A: Pillola Flottante in Basso per Ballottaggio
    let duelBottomPillHtml = '';
    if (ballottaggio) {
      let oppCleanName = '';
      let oppPercVal = 50;
      let myPercVal = 50;
      let subId = '';

      if (ballottaggio.substitutes && ballottaggio.substitutes.length > 0) {
        const primarySub = ballottaggio.substitutes[0];
        const rawName = primarySub.displayName || primarySub.name || '';
        oppCleanName = rawName.replace(/\s*\(\d+%\)$/, '').trim();
        oppPercVal = primarySub.perc ?? ballottaggio.percB ?? 50;
        myPercVal = ballottaggio.percA ?? (100 - oppPercVal);
        subId = primarySub.id || primarySub.playerId || '';
      } else if (ballottaggio.opponentName) {
        const opp = ballottaggio.opponentName;
        oppCleanName = opp.replace(/\s*\(\d+%\)$/, '').trim();
        oppPercVal = ballottaggio.percB ?? (100 - (ballottaggio.percA ?? 50));
        myPercVal = ballottaggio.percA ?? 50;
        subId = ballottaggio.playerBId || '';
      }

      if (oppCleanName) {
        duelBottomPillHtml = `
          <div class="duel-sub-badge is-bottom-full duel" data-duel-id="${subId}" data-duel-name="${sanitizeHtml(oppCleanName)}" title="${myPercVal}% vs ${sanitizeHtml(oppCleanName)} (${oppPercVal}%) (Doppio click per aprire scheda)">
            <i class="fa-solid fa-scale-unbalanced" style="font-size: 6px;"></i> vs <span class="opp-highlight">${sanitizeHtml(oppCleanName)}</span> ${oppPercVal}%
          </div>
        `;
      }
    }

    card.innerHTML = `
      <div class="card-top-bar">
        <span class="role-badge-tag badge-${roleChar}">${roleDisplay}</span>
        ${chipsHtml ? `<div class="set-pieces-chips">${chipsHtml}</div>` : ''}
      </div>
      <div class="card-center-figure">
        <div class="player-avatar-circle ${photoUrl ? 'has-photo' : ''}">
          ${photoUrl ? `
            <img src="${photoUrl}" alt="${sanitizeHtml(displayName)}" class="player-avatar-photo" loading="lazy" onerror="this.parentElement.classList.remove('has-photo'); this.parentElement.classList.add('photo-error');" />
            <span class="player-avatar-fallback">${initials}</span>
          ` : `
            <span class="player-avatar-fallback">${initials}</span>
          `}
        </div>
      </div>
      <div class="player-name-tag" title="${sanitizeHtml(player.name || displayName)}">${sanitizeHtml(displayName.toUpperCase())}</div>
      <div class="player-tier-tag ${tierInfo.className}" ${tierInfo.style ? `style="${tierInfo.style}"` : ''}>
        ${sanitizeHtml(tierInfo.label)}
      </div>
      ${duelBottomPillHtml}
    `;
  } else {
    // Template Strutturale Editorial Minimal
    card.innerHTML = `
      ${headerHtml}
      ${metricsHtml}
      ${railHtml}
      ${ballottaggioHtml}
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

  const navigateToPlayerTactical = () => {
    const targetTeamId = player.teamId || (player.teamName ? store.teams.find(t => t.name.toLowerCase() === player.teamName.toLowerCase())?.id : null);

    // 1. Commuta la vista alla Lavagna Tattica
    if (window.app?.switchView) {
      window.app.switchView('tactical');
    } else {
      store.setView('tactical');
    }

    // 2. Seleziona la squadra del giocatore impostando contestualmente il giocatore come selezionato
    if (targetTeamId) {
      store.setTeam(targetTeamId, player.id, slotId);
    } else {
      store.selectPlayer(player.id, slotId);
    }

    // 3. Scrolla direttamente alla player card del giocatore nella lista della lavagna
    setTimeout(() => {
      window.app?.pitch?.scrollToSelectedPlayer(true);
    }, 80);

    // 4. Desktop: apri sidebar destra se collassata
    if (document.body.classList.contains('right-sidebar-collapsed')) {
      document.body.classList.remove('right-sidebar-collapsed');
    }

    // 5. Mobile: apri drawer sidebar destra
    const sidebarInspector = document.querySelector('#sidebar-inspector');
    const sidebarTeams = document.querySelector('#sidebar-teams');
    const backdrop = document.querySelector('#mobile-drawer-backdrop');

    if (window.innerWidth <= 900) {
      sidebarInspector?.classList.add('mobile-open');
      sidebarTeams?.classList.remove('mobile-open');
      backdrop?.classList.remove('hidden');
    }
  };

  const selectPlayerAndOpenInspector = () => {
    const targetTeamId = player.teamId || (player.teamName ? store.teams.find(t => t.name.toLowerCase() === player.teamName.toLowerCase())?.id : null);

    if (store.activeView === 'tactical' && targetTeamId && targetTeamId !== store.currentTeamId) {
      store.setTeam(targetTeamId, player.id, slotId);
    } else {
      store.selectPlayer(player.id, slotId);
    }

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

  // 1. Native dblclick per mouse -> Su mobile apre scheda giocatore, su desktop naviga alla lavagna
  card.addEventListener('dblclick', (e) => {
    if (e.target.closest('.availability') || e.target.closest('.card-fav-btn') || e.target.closest('.card-injury-badge-btn')) return;
    e.stopPropagation();
    e.preventDefault();
    if (window.innerWidth <= 900) {
      selectPlayerAndOpenInspector();
    } else {
      navigateToPlayerTactical();
    }
  });

  // 2. Click / Touch handler (mobile: 1 click seleziona, 2 click apre scheda; desktop: 1 click seleziona+ispettore, 2 click naviga lavagna)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.availability') || e.target.closest('.card-fav-btn') || e.target.closest('.card-injury-badge-btn')) return;
    if (hasMoved) {
      hasMoved = false;
      return;
    }
    e.stopPropagation();

    const isMobile = window.innerWidth <= 900;
    const now = Date.now();

    if (now - lastTapTime < 350) {
      // Doppio click / doppio tocco
      lastTapTime = 0;
      if (isMobile) {
        // In modalità mobile (sia vista lista che vista campo): apre la scheda giocatore (drawer ispezione)
        selectPlayerAndOpenInspector();
      } else {
        navigateToPlayerTactical();
      }
    } else {
      // Singolo click
      lastTapTime = now;
      if (isMobile && store.activeView !== 'myteam') {
        // In mobile il singolo click seleziona il giocatore
        const targetTeamId = player.teamId || (player.teamName ? store.teams.find(t => t.name.toLowerCase() === player.teamName.toLowerCase())?.id : null);
        if (store.activeView === 'tactical' && targetTeamId && targetTeamId !== store.currentTeamId) {
          store.setTeam(targetTeamId, player.id, slotId);
        } else {
          store.selectPlayer(player.id, slotId);
        }
      } else {
        selectPlayerAndOpenInspector();
      }
    }
  });

  // Listener per navigazione rapida al tab Infermeria
  const injuryBtn = card.querySelector('.card-injury-badge-btn');
  injuryBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.app?.switchView) {
      window.app.switchView('injuries');
    } else {
      store.setView('injuries');
    }
    setTimeout(() => {
      window.app?.injuries?.scrollToPlayer(player.name || player.displayName || player.id);
    }, 120);
  });

  // Listener per toggle rapido preferito
  const favToggleBtn = card.querySelector('.card-fav-btn');
  favToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.togglePlayerFavorite(player.id);
  });

  // Listener per toggle rapido disponibilità asta
  const astaToggleBtn = card.querySelector('.availability');
  astaToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.togglePlayerAvailability(player.id);
  });

  // Listener per badge ballottaggio (apre la scheda del giocatore in ballottaggio al doppio click o click)
  card.querySelectorAll('.duel').forEach(duelEl => {
    const openDuelPlayer = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const duelId = duelEl.dataset.duelId;
      const duelName = duelEl.dataset.duelName;
      const foundPlayer = (duelId ? store.getPlayer(duelId) : null) || (duelName ? store.getPlayer(duelName) : null);
      if (foundPlayer) {
        store.selectPlayer(foundPlayer.id);

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

    duelEl.addEventListener('dblclick', openDuelPlayer);
    duelEl.addEventListener('click', openDuelPlayer);
  });

  return card;
}
