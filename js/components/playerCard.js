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
  if (store.getPlayerSpecialists) {
    const spec = store.getPlayerSpecialists(player);
    return spec.detailedText || spec.labelText || '—';
  }
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

function renderIndexSegments(score) {
  const s = Math.max(1, Math.min(5, Number(score) || 3));
  let segs = '';
  for (let i = 1; i <= 5; i++) {
    segs += `<span class="segment-bar ${i <= s ? 'is-filled' : ''}"></span>`;
  }
  return `<div class="index-segments-bar" role="img" aria-label="${s}/5">${segs}</div>`;
}

export function createPlayerCard(player, options = {}) {
  const {
    slotId = null,
    slotRole = null,
    isLineup = false,
    isSelected = false,
    compact = false,
    rank = null,
    showTeam = false
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
  const isAvailable = player.isAvailable !== false;

  const isFavorite = Boolean(player.isFavorite || store.isPlayerFavorite(player.id) || (player.csvId && store.isPlayerFavorite(player.csvId.toString())));

  const card = document.createElement('article');
  card.className = [
    'player-card',
    isLineup ? 'pitch-slot-card' : 'bench-player-card',
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
  const classicRole = store.getRoleCategory(player) || player.classicRole || player.fantaRole || 'C';
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

  const qtA = player.quotazioni?.qtA ?? '-';
  const fvm = player.quotazioni?.fvm ?? '-';
  const tier = store.getPlayerTier(player);

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

  const isInMyTeam = store.isPlayerInMyTeam(player.id);
  const myTeamInfo = isInMyTeam ? store.getMyTeamPlayerInfo(player.id) : null;

  // Header player top con foto, info piazzati e preferiti
  const headerHtml = `
    <header class="player-top">
      ${avatarHtml}
      <div class="identity">
        <div class="player-name-row">
          <h3 class="player-name" title="${sanitizeHtml(player.name)}">${sanitizeHtml(displayName)}</h3>          
          ${isFavorite ? `<span class="card-fav-star" title="Calciatore nei Preferiti"><i class="fa-solid fa-star"></i></span>` : ''}
        </div>
        <div class="player-set-pieces-row ${piazzatiText !== '—' ? 'has-active-set-pieces' : ''}">
          ${rank ? `<span class="rank-badge">#${rank}</span>` : ''}
          ${showTeam && teamName ? `<span class="team-badge" title="Squadra: ${sanitizeHtml(teamName)}">${sanitizeHtml(teamName)}</span><span class="separator">·</span>` : ''}
          <span class="set-pieces-badge ${piazzatiText !== '—' ? 'has-set-pieces' : ''}">${piazzatiText}</span>
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
  `;

  // Strip Fascia Strategia (dimensione fissa e stato di default "Non impostato")
  const strategyStripHtml = `
    <div class="player-card-strategy-strip">
      ${tier ? `
        <span class="player-strategy-badge" style="background: ${tier.color}1c; color: ${tier.color}; border: 1px solid ${tier.color}45;" title="Fascia Strategia: ${sanitizeHtml(tier.name)}">
          <span class="tier-dot" style="background: ${tier.color};"></span>
          <span class="tier-label-text">${sanitizeHtml(tier.name)}</span>
        </span>
      ` : `
        <span class="player-strategy-badge badge-unassigned" title="Fascia non impostata per questa strategia">
          <span class="tier-dot unassigned-dot"></span>
          <span class="tier-label-text">Non impostato</span>
        </span>
      `}
    </div>
  `;

  const specificRole = (player.role && player.role !== classicRole) ? player.role : (player.mantraRole && player.mantraRole !== classicRole ? player.mantraRole : (player.role || ''));

  // Metriche Core: Titolarità, Affidabilità, Integrità, Crediti Consigliati e Ruolo
  const metricsHtml = `
    <div class="core-metrics ${compact ? 'compact-metrics' : ''}">
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
      <div class="metric metric-role">
        <div class="roles-badges-wrap">
          <span class="role role-${classicRole.toLowerCase()}" title="Ruolo Classic: ${classicRole}">${classicRole}</span>
          ${specificRole ? `<span class="role role-tactical" title="Ruolo Specifico: ${specificRole}">${specificRole}</span>` : ''}
        </div>
        <span class="metric-label">Ruolo</span>
      </div>
    </div>
  `;

  // Data rail: compatto escluso in modalità campo, orizzontale classico con colonne fisse allineate
  const railHtml = compact ? '' : `
    <div class="data-rail">
      <div class="market-list">
        <div class="market market-qta" title="Quotazione Attuale Classic"><label>QtA</label><strong>${qtA}</strong></div>
        <div class="market market-fvm" title="Fantavoto di Mercato (base 1000)"><label>FVM</label><strong>${fvm}</strong></div>
      </div>
      <div class="season">
        <span class="stat-item stat-fm" title="Fantamedia Stagionale"><span class="stat-lbl">FM</span><strong class="stat-val">${fmVal}</strong></span>
        <span class="stat-item stat-mv" title="Media Voto"><span class="stat-lbl">MV</span><strong class="stat-val">${mvVal}</strong></span>
        <span class="stat-item stat-pg" title="Partite Giocate / Presenze"><span class="stat-lbl">PG</span><strong class="stat-val">${presenze}</strong></span>
        <span class="stat-item stat-g" title="Gol Segnati"><span class="stat-lbl">G</span><strong class="stat-val">${gol}</strong></span>
        <span class="stat-item stat-a" title="Assist Realizzati"><span class="stat-lbl">A</span><strong class="stat-val">${assist}</strong></span>
      </div>
    </div>
  `;

  // Template Strutturale Editorial Minimal
  card.innerHTML = `
    ${headerHtml}
    ${strategyStripHtml}
    ${metricsHtml}
    ${railHtml}
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
    if (e.target.closest('.availability')) return;
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
    if (e.target.closest('.availability')) return;
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
