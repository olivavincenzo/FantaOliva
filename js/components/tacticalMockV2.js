import { store } from '../store.js';
import { INITIAL_TEAMS } from '../data/initialData.js';
import { PLAYER_STATS_MAP } from '../data/playerStatsData.js';
import { PLAYER_INDICES_MAP } from '../data/playerIndices.js';
import { SOS_TEAMS_DATA } from '../data/sosTeamsData.js';
import { INJURIES_DATA } from '../data/injuriesData.js';
import { PLAYER_HISTORY_MAP } from '../data/playerHistoryData.js';

export const SERIE_A_CRESTS = {
  inter: 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png',
  juventus: 'https://cdn.sportmonks.com/images/soccer/teams/17/625.png',
  milan: 'https://cdn.sportmonks.com/images/soccer/teams/17/113.png',
  napoli: 'https://cdn.sportmonks.com/images/soccer/teams/21/597.png',
  roma: 'https://cdn.sportmonks.com/images/soccer/teams/5/37.png',
  atalanta: 'https://cdn.falsesoftware.com/teams/atalanta.png',
  lazio: 'https://cdn.sportmonks.com/images/soccer/teams/11/43.png',
  fiorentina: 'https://cdn.sportmonks.com/images/soccer/teams/13/109.png',
  bologna: 'https://cdn.sportmonks.com/images/soccer/teams/1/8513.png',
  torino: 'https://cdn.sportmonks.com/images/soccer/teams/5/613.png',
  como: 'https://cdn.sportmonks.com/images/soccer/teams/12/268.png',
  udinese: 'https://cdn.sportmonks.com/images/soccer/teams/26/346.png',
  parma: 'https://cdn.sportmonks.com/images/soccer/teams/14/398.png',
  genoa: 'https://cdn.sportmonks.com/images/soccer/teams/6/102.png',
  cagliari: 'https://cdn.sportmonks.com/images/soccer/teams/9/585.png',
  lecce: 'https://cdn.sportmonks.com/images/soccer/teams/14/7790.png',
  monza: 'https://cdn.sportmonks.com/images/soccer/teams/28/1628.png',
  sassuolo: 'https://cdn.sportmonks.com/images/soccer/teams/26/2714.png',
  venezia: 'https://cdn.falsesoftware.com/teams/venezia.png',
  frosinone: 'https://cdn.sportmonks.com/images/soccer/teams/6/4070.png'
};

// Funzione ausiliaria per estrarre la stringa dei piazzati ufficiali (SOS Fanta)
function getSetPiecesString(rawPlayer, teamSos, role) {
  if (role === 'P') return 'Nessun piazzato · Portiere';
  const pieces = [];

  if (Array.isArray(teamSos?.rig)) {
    const rIdx = teamSos.rig.findIndex(item =>
      (rawPlayer.fantalabId && item.playerId === rawPlayer.fantalabId) ||
      (item.name && rawPlayer.name && (item.name.toLowerCase() === rawPlayer.name.toLowerCase() || rawPlayer.fullName?.toLowerCase().includes(item.name.toLowerCase())))
    );
    if (rIdx !== -1) {
      pieces.push(`${rIdx + 1}° Rigorista`);
    } else if (rawPlayer.isPenaltyTaker || rawPlayer.rigorista) {
      pieces.push('Rigorista');
    }
  } else if (rawPlayer.isPenaltyTaker || rawPlayer.rigorista) {
    pieces.push('Rigorista');
  }

  if (Array.isArray(teamSos?.pun)) {
    const pIdx = teamSos.pun.findIndex(item =>
      (rawPlayer.fantalabId && item.playerId === rawPlayer.fantalabId) ||
      (item.name && rawPlayer.name && (item.name.toLowerCase() === rawPlayer.name.toLowerCase() || rawPlayer.fullName?.toLowerCase().includes(item.name.toLowerCase())))
    );
    if (pIdx !== -1) {
      pieces.push(`${pIdx + 1}° Punizioni`);
    } else if (rawPlayer.isFreeKickTaker || rawPlayer.punizioni) {
      pieces.push('Punizioni');
    }
  } else if (rawPlayer.isFreeKickTaker || rawPlayer.punizioni) {
    pieces.push('Punizioni');
  }

  if (Array.isArray(teamSos?.corner)) {
    const cIdx = teamSos.corner.findIndex(item =>
      (rawPlayer.fantalabId && item.playerId === rawPlayer.fantalabId) ||
      (item.name && rawPlayer.name && (item.name.toLowerCase() === rawPlayer.name.toLowerCase() || rawPlayer.fullName?.toLowerCase().includes(item.name.toLowerCase())))
    );
    if (cIdx !== -1) {
      pieces.push(`${cIdx + 1}° Corner`);
    } else if (rawPlayer.isCornerTaker || rawPlayer.corner) {
      pieces.push('Corner');
    }
  } else if (rawPlayer.isCornerTaker || rawPlayer.corner) {
    pieces.push('Corner');
  }

  if (pieces.length === 0) {
    return role === 'D' ? 'Saltatore in area · Nessun piazzato' : 'Nessun piazzato';
  }
  return pieces.join(' · ');
}

// Funzione ausiliaria per rilevare ballottaggi reali dal modulo SOS Fanta
function getPlayerBallot(rawPlayer, teamSos) {
  if (Array.isArray(teamSos?.ballottaggi)) {
    for (const pair of teamSos.ballottaggi) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const myIdx = pair.findIndex(item =>
        (rawPlayer.fantalabId && item.playerId === rawPlayer.fantalabId) ||
        (item.name && rawPlayer.name && (item.name.toLowerCase() === rawPlayer.name.toLowerCase() || rawPlayer.fullName?.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(rawPlayer.name.toLowerCase())))
      );
      if (myIdx !== -1) {
        const myItem = pair[myIdx];
        const rivalItem = pair[myIdx === 0 ? 1 : 0];
        const myPerc = myItem.perc || 50;
        const rivalPerc = rivalItem?.perc || (100 - myPerc);
        const rivalName = rivalItem?.name || 'Alternativa';
        const rivalRole = rivalItem?.role || rawPlayer.role || '';
        const isAdvantage = myPerc >= rivalPerc;
        return {
          hasBallot: true,
          ballot: `${myPerc}% - ${rivalPerc}%`,
          ballotDesc: `ballottaggio con ${rivalName}<br>${isAdvantage ? 'attualmente in vantaggio' : 'in leggero svantaggio'}`,
          myPerc: myPerc,
          rivalPerc: rivalPerc,
          rivalName: rivalName,
          rivalRole: rivalRole
        };
      }
    }
  }

  const isPanchina = rawPlayer.status === 'panchina';
  if (isPanchina) {
    return {
      hasBallot: false,
      ballot: 'Seconda scelta',
      ballotDesc: 'riserva di reparto<br>subentro a gara in corso',
      myPerc: 30,
      rivalPerc: 70,
      rivalName: 'Titolare di reparto',
      rivalRole: rawPlayer.role || ''
    };
  }

  return {
    hasBallot: false,
    ballot: 'Nessuno',
    ballotDesc: 'titolare inamovibile<br>nessun ballottaggio aperto',
    myPerc: 100,
    rivalPerc: 0,
    rivalName: rawPlayer.substitutes?.[0] ? rawPlayer.substitutes[0].split('_')[1] || 'Riserva' : 'Nessuna alternativa fissa',
    rivalRole: rawPlayer.role || ''
  };
}

// Funzione universale per idratare i dati del giocatore da FantaLab, SOS Fanta e Infermeria
function buildPlayerData(rawPlayer, team, idx) {
  if (!rawPlayer) {
    return {
      id: idx,
      num: idx + 1,
      name: 'Giocatore',
      full: 'Giocatore',
      role: 'C',
      roleClass: 'badge-role-c',
      desc: 'Titolare',
      age: 25,
      nat: 'ITA',
      apps: 0,
      starterApps: 0,
      goals: 0,
      assists: 0,
      metricKey: 'Gol / Assist',
      metricVal: '0 / 0',
      fm: '6.00',
      mv: '6.00',
      credits: '50 CR',
      fvm: 50,
      rating: '7.0',
      tier: 'JOLLY',
      titolaritaStars: '3/5',
      titIndex: 3,
      titDesc: 'Nelle rotazioni',
      integritaStars: '4/5',
      infIndex: 4,
      infDesc: 'Pochissimi infortuni',
      affIndex: 3,
      affDesc: 'Alterna buone prestazioni',
      fitness: 90,
      img: SERIE_A_CRESTS[team?.id] || 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png',
      stat1: '0 G • 0 A',
      stat1Desc: 'rendimento stagionale',
      setPieces: 'Nessun piazzato',
      ballot: 'Nessuno',
      ballotDesc: 'titolare',
      realStats: null,
      quotazioni: null,
      fantaComment: ''
    };
  }

  const fStats = (rawPlayer.fantalabId && PLAYER_STATS_MAP[rawPlayer.fantalabId]?.stats) || null;
  const history = (rawPlayer.fantalabId && PLAYER_HISTORY_MAP[rawPlayer.fantalabId]) || null;
  const season26_27 = history?.seasons?.s_26_27 || null;
  const season25_26 = history?.seasons?.s_25_26 || null;

  let indices = null;
  if (rawPlayer.csvId && PLAYER_INDICES_MAP[rawPlayer.csvId]) {
    indices = PLAYER_INDICES_MAP[rawPlayer.csvId];
  } else if (rawPlayer.fantalabId) {
    indices = Object.values(PLAYER_INDICES_MAP).find(x => x.playerId === rawPlayer.fantalabId) || null;
  }

  const teamCode = (team?.shortName || '').toUpperCase() ||
    (Object.keys(SOS_TEAMS_DATA).find(k =>
      SOS_TEAMS_DATA[k].code?.toLowerCase() === (team?.shortName || team?.id)?.toLowerCase() ||
      SOS_TEAMS_DATA[k].name?.toLowerCase() === team?.name?.toLowerCase()
    ) || 'INT');
  const teamSos = SOS_TEAMS_DATA[teamCode] || {};

  let injury = null;
  if (Array.isArray(INJURIES_DATA)) {
    injury = INJURIES_DATA.find(inj =>
      (rawPlayer.fantalabId && inj.id === rawPlayer.fantalabId) ||
      (inj.name && rawPlayer.name && (inj.name.toLowerCase() === rawPlayer.name.toLowerCase() || rawPlayer.fullName?.toLowerCase().includes(inj.name.toLowerCase())))
    ) || null;
  }

  const role = rawPlayer.fantaRole || rawPlayer.classicRole || 'C';
  const roleClass = 'badge-role-' + role.toLowerCase();
  const desc = rawPlayer.role || rawPlayer.classicRole || (role === 'P' ? 'Portiere Titolare' : (role === 'D' ? 'Difensore Titolare' : (role === 'C' ? 'Centrocampista' : 'Attaccante')));

  // Dati stagione scorsa 2025/26 (completata)
  const goals25 = season25_26?.gf ?? (fStats?.gol_fatti ?? (rawPlayer.stats?.gol ?? rawPlayer.stats?.gf ?? 0));
  const assists25 = season25_26?.assist ?? (fStats?.assist ?? (rawPlayer.stats?.assist ?? 0));
  const apps25 = season25_26?.presenze ?? (fStats?.presenze ?? (rawPlayer.stats?.presenze ?? rawPlayer.stats?.pv ?? 25));
  const starterApps25 = season25_26?.starts_eleven ?? (fStats?.starts_eleven ?? (rawPlayer.stats?.titolarita ? Math.round(apps25 * (rawPlayer.stats.titolarita / 100)) : apps25));

  // Dati stagione attuale 2026/27 (appena iniziata)
  const goals26 = season26_27?.gf ?? 0;
  const assists26 = season26_27?.assist ?? 0;
  const apps26 = season26_27?.presenze ?? 0;
  const gs26 = season26_27?.gs ?? 0;
  const cs26 = season26_27?.clean_sheet ?? 0;
  const rp26 = season26_27?.rp ?? 0;

  const currSeason26Data = {
    goals: goals26,
    assists: assists26,
    apps: apps26,
    gs: gs26,
    clean_sheet: cs26,
    rp: rp26,
    fm: typeof season26_27?.fmv === 'number' ? season26_27.fmv.toFixed(2) : null,
    mv: typeof season26_27?.mv === 'number' ? season26_27.mv.toFixed(2) : null,
    starts: season26_27?.starts_eleven ?? 0,
    xg: season26_27?.xg ?? 0,
    xa: season26_27?.xa ?? 0,
    shots: season26_27?.shots_per_match ?? 0
  };

  const prevSeason25Data = season25_26 ? {
    goals: goals25,
    assists: assists25,
    apps: apps25,
    gs: season25_26.gs ?? 0,
    clean_sheet: fStats?.clean_sheet ?? (rawPlayer.stats?.cleanSheet ?? null),
    rp: season25_26.rp ?? 0,
    fm: typeof season25_26.fmv === 'number' ? season25_26.fmv.toFixed(2) : null,
    mv: typeof season25_26.mv === 'number' ? season25_26.mv.toFixed(2) : null,
    starts: starterApps25
  } : null;

  const goals = goals25;
  const assists = assists25;
  const apps = apps25;
  const starterApps = starterApps25;

  const fmVal = (typeof fStats?.fmv === 'number' && fStats.fmv > 0)
    ? fStats.fmv
    : ((typeof rawPlayer.stats?.fantamedia === 'number' && rawPlayer.stats.fantamedia > 0)
      ? rawPlayer.stats.fantamedia
      : (6.00 + ((rawPlayer.appetibilita || 70) / 40)));
  const fm = fmVal.toFixed(2);

  const mvVal = (typeof fStats?.mv === 'number' && fStats.mv > 0)
    ? fStats.mv
    : ((typeof rawPlayer.stats?.mediaVoto === 'number' && rawPlayer.stats.mediaVoto > 0)
      ? rawPlayer.stats.mediaVoto
      : 6.15);
  const mv = mvVal.toFixed(2);

  const cr = rawPlayer.quotazioni?.fvm || rawPlayer.quotazioni?.qtA || 50;
  const credits = `${cr} CR`;

  const app = rawPlayer.appetibilita || 70;
  const rating = fStats?.rating ? fStats.rating.toFixed(1) : (app / 10).toFixed(1);
  const tier = app >= 92 ? 'SUPER TOP' : (app >= 84 ? 'TOP' : (app >= 75 ? 'SEMI-TOP' : (app >= 65 ? 'TITOLARE' : 'JOLLY')));

  const titIndex = indices?.titIndex ?? (rawPlayer.stats?.titolarita ? Math.min(5, Math.max(1, Math.round(rawPlayer.stats.titolarita / 20))) : (rawPlayer.status === 'tit_sicuro' ? 5 : 4));
  const titolaritaStars = `${titIndex}/5`;
  const titDesc = indices?.titDesc || (titIndex >= 5 ? 'Titolare inamovibile' : (titIndex >= 4 ? 'Titolare con concorrenza' : 'Nelle rotazioni'));

  const infIndex = indices?.infIndex ?? 5;
  const integritaStars = `${infIndex}/5`;
  const infDesc = indices?.infDesc || (infIndex >= 5 ? 'È sempre integro' : (infIndex >= 4 ? 'Pochissimi infortuni' : 'Ogni tanto salta qualche partita'));

  const affIndex = indices?.affIndex ?? 4;
  const affDesc = indices?.affDesc || (affIndex >= 5 ? 'Rendimento super costante' : (affIndex >= 4 ? 'Quasi sempre sufficiente' : 'Alterna buone prestazioni'));

  let fitness = 95;
  if (injury) {
    fitness = typeof injury.startingProbability === 'number' ? injury.startingProbability : (injury.isInjured ? 35 : 65);
  } else {
    fitness = infIndex === 5 ? 98 : (infIndex === 4 ? 93 : (infIndex === 3 ? 88 : 82));
  }

  const setPieces = getSetPiecesString(rawPlayer, teamSos, role);
  const ballotObj = getPlayerBallot(rawPlayer, teamSos);

  let metricKey = 'Gol / Assist';
  let metricVal = `${goals} / ${assists}`;
  if (role === 'P') {
    metricKey = 'Clean Sheet';
    metricVal = `${fStats?.clean_sheet ?? (rawPlayer.stats?.cleanSheet ?? 12)}`;
  } else if (fStats?.xg) {
    metricKey = 'Expected Goals';
    metricVal = `${fStats.xg.toFixed(1)} xG`;
  }

  const img = rawPlayer.photoUrl || rawPlayer.playerImage || SERIE_A_CRESTS[team?.id] || 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';
  const num = rawPlayer.number || (role === 'P' ? 1 : (idx === 0 ? 1 : idx + 2));

  return {
    id: idx,
    num: num,
    name: rawPlayer.displayName || rawPlayer.name,
    full: rawPlayer.fullName || rawPlayer.name,
    role: role,
    roleClass: roleClass,
    desc: desc,
    age: rawPlayer.age || 26,
    nat: rawPlayer.nationality || rawPlayer.nat || 'ITA',
    apps: apps,
    starterApps: starterApps,
    goals: goals,
    assists: assists,
    metricKey: metricKey,
    metricVal: metricVal,
    fm: fm,
    mv: mv,
    starts: fStats?.perc_starts_eleven ? `${fStats.perc_starts_eleven}%` : `${Math.round((starterApps / (apps || 1)) * 100)}%`,
    credits: credits,
    cr: cr,
    rating: rating,
    tier: tier,
    titolaritaStars: titolaritaStars,
    titIndex: titIndex,
    titDesc: titDesc,
    integritaStars: integritaStars,
    infIndex: infIndex,
    infDesc: infDesc,
    affIndex: affIndex,
    affDesc: affDesc,
    fitness: fitness,
    img: img,
    stat1: role === 'P' ? `${metricVal} CS` : `${goals} G • ${assists} A`,
    stat1Desc: rawPlayer.fantaComment ? (rawPlayer.fantaComment.slice(0, 48) + '...') : 'rendimento stagionale',
    setPieces: setPieces,
    ballot: ballotObj.ballot,
    ballotDesc: ballotObj.ballotDesc,
    ballotData: ballotObj,
    realStats: fStats,
    rawPlayer: rawPlayer,
    quotazioni: rawPlayer.quotazioni,
    stats: rawPlayer.stats,
    fantaComment: rawPlayer.fantaComment || '',
    injury: injury,
    currSeason26: currSeason26Data,
    prevSeason25: prevSeason25Data,
    currGoals: goals26,
    currAssists: assists26,
    currApps: apps26,
    currGS: gs26,
    currRP: rp26,
    currCleanSheet: cs26,
    prevGoals: goals25,
    prevAssists: assists25,
    prevApps: apps25,
    prevSeason: prevSeason25Data,
    historySeasons: history?.seasons || null
  };
}

export class TacticalMockV2Component {
  constructor(container) {
    this.container = container;
    this.animationId = null;
    this.isDestroyed = false;
    this.init();
  }

  init() {
    if (!this.container) return;
    try {
      this.setup();
    } catch (err) {
      console.error('Errore durante init TacticalMockV2Component:', err);
    }
  }

  setup() {

    // RECUPERO SQUADRA ATTIVA INIZIALE (INTER O DA STORE)
    const allTeams = (store?.getAllTeams ? store.getAllTeams() : null) || INITIAL_TEAMS;
    const initialTeamId = store?.currentTeamId || 'inter';
    const initialTeam = allTeams.find(t => t.id === initialTeamId) || allTeams[0];
    let currentTeam = initialTeam;
    let activeTeamId = initialTeam ? initialTeam.id : 'inter';

    // COSTRUZIONE ROSA 11 TITOLARI CON METRICHE REALI FANTALAB & SOS FANTA
    const playerSquad = [];
    const initLineup = [];
    for (let i = 1; i <= 11; i++) {
      const p = initialTeam?.lineup?.[`pos_${i}`];
      if (p) initLineup.push(p);
    }
    if (initLineup.length < 11) {
      const vals = Object.values(initialTeam?.lineup || {}).filter(Boolean);
      vals.forEach(p => {
        if (initLineup.length < 11 && !initLineup.includes(p)) {
          initLineup.push(p);
        }
      });
    }
    initLineup.slice(0, 11).forEach((rawPlayer, idx) => {
      playerSquad[idx] = buildPlayerData(rawPlayer, initialTeam, idx);
    });

    // Aggiorna header squadra iniziale
    const crestEl = document.getElementById('headerTeamCrest');
    if (crestEl && initialTeam) {
      crestEl.src = SERIE_A_CRESTS[initialTeam.id] || 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';
      crestEl.alt = `${initialTeam.name} Crest`;
    }
    const nameEl = document.getElementById('headerTeamName');
    if (nameEl && initialTeam) nameEl.textContent = initialTeam.name;
    const coachEl = document.getElementById('headerTeamCoach');
    if (coachEl && initialTeam) coachEl.textContent = `All. ${initialTeam.coach || 'Mister'} • Asta 2026/27`;
    const hmInit = document.getElementById('headerModule');
    if (hmInit && initialTeam && (initialTeam.defaultFormation || initialTeam.module)) {
      hmInit.textContent = initialTeam.defaultFormation || initialTeam.module;
    }
    const bmInit = document.getElementById('backCurrentModule');
    if (bmInit && initialTeam && (initialTeam.defaultFormation || initialTeam.module)) {
      bmInit.textContent = initialTeam.defaultFormation || initialTeam.module;
    }

    // GESTIONE PREFERITI & SELEZIONE INIZIALE DEL GIOCATORE TOP
    let currentSelectedPlayerId = 0;
    let maxInitScore = -1;
    playerSquad.forEach((p, idx) => {
      const r = parseFloat(p.rating) || 0;
      const cr = p.cr || 0;
      const score = r * 30 + cr;
      if (score > maxInitScore) {
        maxInitScore = score;
        currentSelectedPlayerId = idx;
      }
    });
    const favoritePlayerIds = new Set([currentSelectedPlayerId]);

    function updateFavoriteButton(playerId) {
      const isFav = favoritePlayerIds.has(playerId);

      // Aggiorna bottone preferito barra giocatore selezionato
      const favBtn = document.getElementById('barRating');
      if (favBtn && playerId === currentSelectedPlayerId) {
        favBtn.classList.toggle('is-favorite', isFav);
        favBtn.title = isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
        const svg = favBtn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
      }

      // Aggiorna bottone preferito nella riga della lista roster
      const rowFavBtn = document.querySelector(`.row-rating[data-player-id="${playerId}"]`);
      if (rowFavBtn) {
        rowFavBtn.classList.toggle('is-favorite', isFav);
        rowFavBtn.title = isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti";
        const svg = rowFavBtn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
      }
    }

    function toggleFavorite(playerId, event) {
      if (event) {
        event.stopPropagation();
      }

      if (favoritePlayerIds.has(playerId)) {
        favoritePlayerIds.delete(playerId);
      } else {
        favoritePlayerIds.add(playerId);
      }

      updateFavoriteButton(playerId);
    }

    const favToggleBtn = document.getElementById('barRating');
    if (favToggleBtn) {
      favToggleBtn.addEventListener('click', (e) => {
        toggleFavorite(currentSelectedPlayerId, e);
      });
    }

    // GENERAZIONE RIGHE GIOCATORI NELLA LISTA ROSTER
    const listContainer = document.getElementById('playersListContainer');

    function renderRosterRows() {
      if (!listContainer) return;
      listContainer.innerHTML = '';

      playerSquad.forEach((p, idx) => {
        const isFav = favoritePlayerIds.has(p.id);
        const row = document.createElement('div');
        row.className = `player-row ${idx === currentSelectedPlayerId ? 'active' : ''}`;
        row.id = `playerRow_${idx}`;
        row.innerHTML = `
          <div class="row-top">
            <div class="row-left">
              <img class="row-avatar" src="${p.img}" alt="${p.name}" onerror="this.onerror=null; this.src='https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';">
              <div class="row-num">${p.num}</div>
              <div class="row-name-group">
                <div class="row-main-name">
                  ${p.full}
                  <span class="row-role-tag ${p.roleClass}">${p.role}</span>
                </div>
                <div class="row-sub-info">${p.desc} · ${p.age} anni · ${p.nat}</div>
              </div>
            </div>
            <button type="button" class="row-rating ${isFav ? 'is-favorite' : ''}" data-player-id="${p.id}" title="${isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}" aria-label="Preferito">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          </div>

          <div class="row-metrics-grid">
            <div class="metric-box">
              <span class="metric-label">Presenze</span>
              <span class="metric-val">${p.apps}</span>
            </div>
            <div class="metric-box">
              <span class="metric-label">${p.metricKey}</span>
              <span class="metric-val">${p.metricVal}</span>
            </div>
            <div class="metric-box" title="FM / MV: 26/27 attuale (${p.currSeason26?.fm || 'S.V.'} FM • ${p.currSeason26?.mv || 'S.V.'} MV) | 25/26 scorsa (${p.prevSeason25?.fm || p.fm} FM • ${p.prevSeason25?.mv || p.mv} MV)">
              <span class="metric-label">FM • MV</span>
              <span class="metric-val">${p.currSeason26?.fm ? `${p.currSeason26.fm} • ${p.currSeason26.mv}` : `${p.fm} • ${p.mv}`}</span>
            </div>
            <div class="metric-box">
              <span class="metric-label">Consigliati</span>
              <span class="metric-val">${p.credits}</span>
            </div>
          </div>

          <div class="fitness-bar-wrap">
            <span>Integrità & Forma: ${p.fitness}%</span>
            <div class="fitness-track">
              <div class="fitness-fill" style="width: ${p.fitness}%;"></div>
            </div>
          </div>
        `;

        const rowFavBtn = row.querySelector('.row-rating');
        if (rowFavBtn) {
          rowFavBtn.addEventListener('click', (e) => {
            toggleFavorite(p.id, e);
          });
        }

        row.addEventListener('click', () => {
          selectPlayer(idx, true);
        });

        listContainer.appendChild(row);
      });

      if (typeof applyFiltersAndSort === 'function') {
        applyFiltersAndSort();
      }
    }

    renderRosterRows();

    // SCENA THREE.JS (Campo 3D Verticale)
    const canvas = document.getElementById('threejs-canvas');
    const container = document.getElementById('pitchContainer');
    const cardsLayer = document.getElementById('cardsLayer');

    let scene, camera, renderer, controls;
    const initialCamPos = new THREE.Vector3(0, 24, 21);

    try {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.copy(initialCamPos);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;

      // OrbitControls: zoom disabilitato per permettere lo scorrimento naturale della pagina!
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableZoom = false;
      controls.maxPolarAngle = Math.PI / 2.18;
      controls.target.set(0, 0, -0.5);

      // LUCI
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
      dirLight.position.set(12, 28, 16);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // TEXTURE DEL CAMPO VERTICALE
      function createVerticalPitchTexture() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 700;
        pCanvas.height = 1024;
        const ctx = pCanvas.getContext('2d');

        const stripes = 14;
        const stripeH = pCanvas.height / stripes;
        for (let i = 0; i < stripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#d2ff50' : '#d2ff50';
          ctx.fillRect(0, i * stripeH, pCanvas.width, stripeH);
        }

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        const m = 38;
        const w = pCanvas.width;
        const h = pCanvas.height;

        ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);

        ctx.beginPath();
        ctx.moveTo(m, h / 2);
        ctx.lineTo(w - m, h / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 75, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        const boxW = 270;
        const boxH = 140;
        ctx.strokeRect((w - boxW) / 2, m, boxW, boxH);
        ctx.strokeRect((w - boxW) / 2, h - m - boxH, boxW, boxH);

        const sBoxW = 130;
        const sBoxH = 50;
        ctx.strokeRect((w - sBoxW) / 2, m, sBoxW, sBoxH);
        ctx.strokeRect((w - sBoxW) / 2, h - m - sBoxH, sBoxW, sBoxH);

        ctx.beginPath();
        ctx.arc(w / 2, m + 95, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w / 2, m + 95, 55, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h - m - 95, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w / 2, h - m - 95, 55, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();

        return new THREE.CanvasTexture(pCanvas);
      }

      // TERRENO
      const pitchGeo = new THREE.BoxGeometry(18, 0.4, 26);
      const pitchMat = [
        new THREE.MeshBasicMaterial({ color: '#9CD237' }),
        new THREE.MeshBasicMaterial({ color: '#9CD237' }),
        new THREE.MeshBasicMaterial({ map: createVerticalPitchTexture() }),
        new THREE.MeshBasicMaterial({ color: '#9CD237' }),
        new THREE.MeshBasicMaterial({ color: '#9CD237' }),
        new THREE.MeshBasicMaterial({ color: '#9CD237' }),
      ];
      const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
      pitchMesh.position.y = -0.2;
      scene.add(pitchMesh);

      // PORTE 3D
      function createVerticalGoal(zPos, isTop) {
        const goalGroup = new THREE.Group();
        const pipeMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', metalness: 0.25, roughness: 0.4 });

        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4);
        const post1 = new THREE.Mesh(postGeo, pipeMat);
        post1.position.set(-1.6, 0.7, 0);
        const post2 = new THREE.Mesh(postGeo, pipeMat);
        post2.position.set(1.6, 0.7, 0);

        const crossbarGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2);
        const crossbar = new THREE.Mesh(crossbarGeo, pipeMat);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(0, 1.4, 0);

        const netGeo = new THREE.BoxGeometry(3.2, 1.35, 1.2);
        const netMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', wireframe: true, transparent: true, opacity: 0.25 });
        const net = new THREE.Mesh(netGeo, netMat);
        net.position.set(0, 0.7, isTop ? -0.6 : 0.6);

        goalGroup.add(post1, post2, crossbar, net);
        goalGroup.position.set(0, 0, zPos);
        scene.add(goalGroup);
      }
      createVerticalGoal(-12.2, true);
      createVerticalGoal(12.2, false);

    } catch (e) {
      console.warn("Three.js init error, falling back:", e);
    }

    // FORMAZIONI VERTICALI CON IL 3-5-2 INTER IN PRIMO PIANO
    const formations = {
      '3-5-2': [
        { x: 0, z: 10.6 },                           // 0: Martinez Jo. (P)
        { x: -4.8, z: 7.6 }, { x: 0, z: 8.2 }, { x: 4.8, z: 7.6 }, // 1: Bastoni, 2: Stones, 3: Akanji
        { x: -6.8, z: 1.8 },                         // 4: Dimarco (LWB)
        { x: 6.8, z: 1.8 },                          // 5: Diouf (RWB)
        { x: 3.6, z: 3.2 },                          // 6: Barella (RCM)
        { x: 0, z: 5.2 },                            // 7: Calhanoglu (REG)
        { x: -3.6, z: 3.2 },                         // 8: Jones C. (LCM)
        { x: -2.8, z: -4.8 },                        // 9: Thuram (ST)
        { x: 2.4, z: -6.2 }                          // 10: Lautaro (ST)
      ],
      '4-3-3': [
        { x: 0, z: 10.6 },                           // Martinez Jo.
        { x: -5.6, z: 7.2 }, { x: -1.9, z: 7.8 }, { x: 1.9, z: 7.8 }, { x: 5.6, z: 7.2 }, // Dimarco, Bastoni, Stones, Akanji
        { x: -3.6, z: 2.8 }, { x: 0, z: 4.8 }, { x: 3.6, z: 2.8 },                     // Jones, Calha, Barella
        { x: -5.2, z: -4.6 }, { x: 0, z: -6.4 }, { x: 5.2, z: -4.6 }                    // Diouf, Lautaro, Thuram
      ],
      '4-4-2': [
        { x: 0, z: 10.6 },
        { x: -5.6, z: 7.2 }, { x: -1.9, z: 7.8 }, { x: 1.9, z: 7.8 }, { x: 5.6, z: 7.2 },
        { x: -5.8, z: 2.4 }, { x: -2.0, z: 3.4 }, { x: 2.0, z: 3.4 }, { x: 5.8, z: 2.4 },
        { x: -2.8, z: -4.8 }, { x: 2.4, z: -6.2 }
      ]
    };

    // CREAZIONE PEDINE 3D E CARD ANCORATE
    const playerObjects = [];

    playerSquad.forEach((p, idx) => {
      let pGroup = null;
      if (scene) {
        pGroup = new THREE.Group();

        const pinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 20);
        const pinMat = new THREE.MeshStandardMaterial({ color: '#292A2C', roughness: 0.3 });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.receiveShadow = true;
        pGroup.add(pin);

        const ringColor = p.role === 'P' ? '#F59E0B' : (p.role === 'D' ? '#10B981' : (p.role === 'C' ? '#0EA5E9' : '#EF4444'));
        const ringGeo = new THREE.RingGeometry(0.33, 0.38, 20);
        const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.042;
        pGroup.add(ring);

        const initPos = formations['3-5-2'][idx];
        pGroup.position.set(initPos.x, 0, initPos.z);
        scene.add(pGroup);
      }

      // Card HTML ancorata
      const cardEl = document.createElement('div');
      cardEl.className = 'field-player-card' + (idx === 10 ? ' selected' : '');
      cardEl.innerHTML = `
        <div class="card-num-badge ${p.roleClass}">${p.role}</div>
        <div class="card-info">
          <span class="card-name">${p.name}</span>
          <span class="card-role">${p.desc.split(' ')[0]}</span>
        </div>
      `;

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPlayer(idx, false);
      });

      cardsLayer.appendChild(cardEl);

      playerObjects.push({
        data: p,
        mesh: pGroup,
        dom: cardEl
      });
    });



    let selectAnimTimeout = null;
    let selectClearTimeout = null;

    // SELEZIONE SINCRONIZZATA CON TRANSIZIONE FLUIDA
    function selectPlayer(idx, fromRowClick = false, shouldScroll = true) {
      // Evidenzia card sul campo 3D istantaneamente (zero input lag)
      playerObjects.forEach((po, i) => {
        po.dom.classList.toggle('selected', i === idx);
      });

      // Evidenzia riga nella lista
      document.querySelectorAll('.player-row').forEach((row, i) => {
        row.classList.toggle('active', i === idx);
      });

      // Scorrimento lista consentito SOLO su desktop (>900px) e quando espressamente richiesto
      // Mai su mobile per non far saltare la vista via dal campo verso il fondo pagina
      if (!fromRowClick && shouldScroll && window.innerWidth > 900) {
        const targetRow = document.getElementById(`playerRow_${idx}`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      const p = playerSquad[idx];
      currentSelectedPlayerId = p.id;

      const playerBar = document.querySelector('.selected-player-bar');
      const statsWrap = document.querySelector('.stats-carousel-wrap');

      // Annulla eventuali timeout precedenti per evitare sovrapposizioni
      if (selectAnimTimeout) clearTimeout(selectAnimTimeout);
      if (selectClearTimeout) clearTimeout(selectClearTimeout);

      // Fase 1: micro-dissolvenza fluida di uscita
      if (playerBar) {
        playerBar.classList.remove('is-flowing-in');
        playerBar.classList.add('is-fading-out', 'bar-glow');
      }
      if (statsWrap) {
        statsWrap.classList.remove('is-flowing-in');
        statsWrap.classList.add('is-fading-out');
      }

      selectAnimTimeout = setTimeout(() => {
        // Aggiorna contenuti DOM durante la dissolvenza morbida
        document.getElementById('barAvatar').src = p.img;
        document.getElementById('barName').textContent = p.full;
        document.getElementById('barRole').textContent = p.setPieces || `${p.desc} · ${p.tier}`;
        updateFavoriteButton(p.id);

        // Statistiche Pagina 1
        const elGoals = document.getElementById('statGoals');
        const elGoalsDesc = document.getElementById('statGoalsDesc');
        if (p.role === 'P') {
          const cs26 = p.currSeason26?.clean_sheet ?? (p.currCleanSheet ?? 0);
          const gs26 = p.currSeason26?.gs ?? (p.currGS ?? 0);
          const apps26 = p.currSeason26?.apps ?? (p.currApps ?? 0);
          if (elGoals) elGoals.textContent = `${cs26} CS • ${gs26} GS`;
          if (elGoalsDesc) {
            if (p.prevSeason25) {
              const gs25 = p.prevSeason25.gs ?? 0;
              const apps25 = p.prevSeason25.apps ?? 0;
              elGoalsDesc.innerHTML = `26/27 attuale (${apps26} pres.)<br><span class="stat-prev-val">25/26 scorsa: ${gs25} GS (${apps25} pres.)</span>`;
            } else {
              elGoalsDesc.innerHTML = `26/27 attuale (${apps26} pres.)<br><span class="stat-prev-val">25/26 scorsa: Nuovo in Serie A</span>`;
            }
          }
        } else {
          const g26 = p.currSeason26?.goals ?? (p.currGoals ?? 0);
          const a26 = p.currSeason26?.assists ?? (p.currAssists ?? 0);
          const apps26 = p.currSeason26?.apps ?? (p.currApps ?? 0);
          if (elGoals) elGoals.textContent = `${g26} G • ${a26} A`;
          if (elGoalsDesc) {
            if (p.prevSeason25) {
              const g25 = p.prevSeason25.goals ?? 0;
              const a25 = p.prevSeason25.assists ?? 0;
              elGoalsDesc.innerHTML = `26/27 attuale (${apps26} pres.)<br><span class="stat-prev-val">25/26 scorsa: ${g25} G • ${a25} A</span>`;
            } else {
              elGoalsDesc.innerHTML = `26/27 attuale (${apps26} pres.)<br><span class="stat-prev-val">25/26 scorsa: Nuovo in Serie A</span>`;
            }
          }
        }
        const elFm = document.getElementById('statFm');
        const elFmDesc = document.getElementById('statFmDesc');
        const fm26 = p.currSeason26?.fm;
        const mv26 = p.currSeason26?.mv;
        const apps26 = p.currSeason26?.apps ?? 0;
        const fm25 = p.prevSeason25?.fm || p.fm;
        const mv25 = p.prevSeason25?.mv || p.mv;

        if (elFm) {
          if (fm26 && mv26) {
            elFm.textContent = `${fm26} FM • ${mv26} MV`;
          } else if (fm26) {
            elFm.textContent = `${fm26} FM`;
          } else if (mv26) {
            elFm.textContent = `${mv26} MV`;
          } else {
            elFm.textContent = 'S.V. (26/27)';
          }
        }
        if (elFmDesc) {
          const presText26 = `26/27 attuale (${apps26} pres.)`;
          if (p.prevSeason25 && fm25 && mv25) {
            elFmDesc.innerHTML = `${presText26}<br><span class="stat-prev-val">25/26 scorsa: ${fm25} FM • ${mv25} MV</span>`;
          } else if (p.prevSeason25 && fm25) {
            elFmDesc.innerHTML = `${presText26}<br><span class="stat-prev-val">25/26 scorsa: ${fm25} FM</span>`;
          } else {
            elFmDesc.innerHTML = `${presText26}<br><span class="stat-prev-val">25/26 scorsa: Nuovo in Serie A</span>`;
          }
        }
        const elCredits = document.getElementById('statCredits');
        if (elCredits) elCredits.textContent = p.credits;
        const elStarts = document.getElementById('statStarts');
        if (elStarts) elStarts.textContent = p.tier;
        const elStartsDesc = document.getElementById('statStartsDesc');
        if (elStartsDesc) elStartsDesc.innerHTML = `titolarità ${p.titolaritaStars} e integrità ${p.integritaStars}`;

        // Statistiche Pagina 2
        const elBallot = document.getElementById('statBallot');
        if (elBallot) elBallot.textContent = p.ballot || 'Nessuno';
        const elBallotDesc = document.getElementById('statBallotDesc');
        if (elBallotDesc) elBallotDesc.innerHTML = p.ballotDesc || 'titolare inamovibile<br>nessun ballottaggio';
        const elMetric = document.getElementById('statMetric');
        if (elMetric) elMetric.textContent = p.metricVal;
        const elMetricDesc = document.getElementById('statMetricDesc');
        if (elMetricDesc) elMetricDesc.innerHTML = `${p.metricKey}<br>incidenza fanta`;
        const elApps = document.getElementById('statApps');
        if (elApps) elApps.textContent = `${p.apps}/38`;
        const elAppsDesc = document.getElementById('statAppsDesc');
        if (elAppsDesc) elAppsDesc.innerHTML = `partite a voto<br>${p.starterApps !== undefined ? p.starterApps : p.apps} da titolare`;
        const elFitness = document.getElementById('statFitness');
        if (elFitness) elFitness.textContent = `${p.fitness}%`;

        // Fase 2: entrata a cascata liquida e sincronizzata
        if (playerBar) {
          playerBar.classList.remove('is-fading-out');
          playerBar.classList.add('is-flowing-in');
        }
        if (statsWrap) {
          statsWrap.classList.remove('is-fading-out');
          statsWrap.classList.add('is-flowing-in');
        }

        // Pulizia al termine per preservare gli stati hover
        selectClearTimeout = setTimeout(() => {
          if (playerBar) {
            playerBar.classList.remove('is-flowing-in', 'bar-glow');
          }
          if (statsWrap) {
            statsWrap.classList.remove('is-flowing-in');
          }
        }, 450);
      }, 75);
    }

    // Inizializza subito la selezione sulla card attiva del top player
    selectPlayer(currentSelectedPlayerId, false, false);

    // GESTIONE RICERCA E FILTRI (MOC)
    let currentSearch = '';
    let currentRole = 'ALL';
    let currentSort = 'default';

    const searchInput = document.getElementById('rosterSearchInput');
    const searchClear = document.getElementById('rosterSearchClear');
    const filterBtn = document.getElementById('rosterFilterBtn');
    const filterPanel = document.getElementById('rosterFilterPanel');
    const filterActiveDot = document.getElementById('filterActiveDot');
    const filterActiveCount = document.getElementById('filterActiveCount');
    const filterResetBtn = document.getElementById('filterResetBtn');
    const filterApplyBtn = document.getElementById('filterApplyBtn');
    const rosterCount = document.getElementById('rosterCount');
    const emptyState = document.getElementById('rosterEmptyState');

    if (filterBtn && filterPanel) {
      // Toggle Pannello Filtri
      filterBtn.addEventListener('click', () => {
        const isOpen = filterPanel.classList.toggle('open');
        filterBtn.classList.toggle('active', isOpen);
      });

      // Applica Filtri da pulsante (chiude pannello con feedback)
      if (filterApplyBtn) {
        filterApplyBtn.addEventListener('click', () => {
          filterPanel.classList.remove('open');
          filterBtn.classList.remove('active');
          applyRosterFilters();
        });
      }

      // Ricerca in tempo reale
      if (searchInput && searchClear) {
        searchInput.addEventListener('input', (e) => {
          currentSearch = e.target.value.trim().toLowerCase();
          searchClear.style.display = currentSearch ? 'flex' : 'none';
          applyRosterFilters();
        });

        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          currentSearch = '';
          searchClear.style.display = 'none';
          searchInput.focus();
          applyRosterFilters();
        });
      }

      // Selezione Chip Ruolo
      document.querySelectorAll('.role-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.role-filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentRole = chip.dataset.role;
          updateFilterBadge();
          applyRosterFilters();
        });
      });

      // Selezione Chip Ordinamento
      document.querySelectorAll('.sort-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.sort-filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentSort = chip.dataset.sort;
          applyRosterFilters();
        });
      });

      // Reset Filtri
      if (filterResetBtn) {
        filterResetBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          currentSearch = '';
          if (searchClear) searchClear.style.display = 'none';

          currentRole = 'ALL';
          document.querySelectorAll('.role-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.role === 'ALL'));

          currentSort = 'default';
          document.querySelectorAll('.sort-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.sort === 'default'));

          updateFilterBadge();
          applyRosterFilters();
        });
      }
    }

    function updateFilterBadge() {
      const roleLabels = { ALL: 'Tutti', P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
      if (filterActiveCount) {
        filterActiveCount.textContent = roleLabels[currentRole] || 'Tutti';
      }
      const hasFilter = currentRole !== 'ALL' || currentSort !== 'default' || currentSearch !== '';
      if (filterActiveDot) {
        filterActiveDot.style.display = hasFilter ? 'block' : 'none';
      }
    }

    function applyRosterFilters() {
      updateFilterBadge();

      // Indici filtrati
      let indices = playerSquad.map((_, i) => i);

      // Filtro Ruolo
      if (currentRole !== 'ALL') {
        indices = indices.filter(i => playerSquad[i].role === currentRole);
      }

      // Filtro Testuale
      if (currentSearch) {
        indices = indices.filter(i => {
          const p = playerSquad[i];
          const fullMatch = p.full.toLowerCase().includes(currentSearch);
          const nameMatch = p.name.toLowerCase().includes(currentSearch);
          const roleMatch = p.role.toLowerCase().includes(currentSearch);
          const descMatch = p.desc.toLowerCase().includes(currentSearch);
          return fullMatch || nameMatch || roleMatch || descMatch;
        });
      }

      // Ordinamento
      if (currentSort === 'rating') {
        indices.sort((a, b) => parseFloat(playerSquad[b].rating) - parseFloat(playerSquad[a].rating));
      } else if (currentSort === 'fm') {
        indices.sort((a, b) => parseFloat(playerSquad[b].fm) - parseFloat(playerSquad[a].fm));
      } else if (currentSort === 'credits') {
        indices.sort((a, b) => parseInt(playerSquad[b].credits) - parseInt(playerSquad[a].credits));
      }

      const isFilteredSet = new Set(indices);
      let visibleCount = 0;

      // Mostra / nasconde le righe
      playerSquad.forEach((_, i) => {
        const row = document.getElementById(`playerRow_${i}`);
        if (row) {
          const visible = isFilteredSet.has(i);
          row.style.display = visible ? 'flex' : 'none';
          if (visible) visibleCount++;
        }
      });

      // Riordina nel DOM
      if (currentSort !== 'default') {
        indices.forEach(idx => {
          const row = document.getElementById(`playerRow_${idx}`);
          if (row && listContainer) listContainer.appendChild(row);
        });
      } else {
        playerSquad.forEach((_, idx) => {
          const row = document.getElementById(`playerRow_${idx}`);
          if (row && listContainer) listContainer.appendChild(row);
        });
      }

      // Aggiorna contatore e stato vuoto
      if (rosterCount) {
        rosterCount.textContent = `${visibleCount} Calciator${visibleCount === 1 ? 'e' : 'i'}`;
      }
      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }

      // Sincronizzazione visiva con campo 3D
      playerObjects.forEach((po, i) => {
        const isMatch = isFilteredSet.has(i);
        if (po.dom) {
          po.dom.style.opacity = isMatch ? '1' : '0.2';
          po.dom.style.pointerEvents = isMatch ? 'auto' : 'none';
        }
        if (po.mesh) {
          po.mesh.visible = isMatch;
        }
      });
    }

    // CAMBIO FORMAZIONE ANIMATO
    window.setFormation = function (type) {
      document.querySelectorAll('.form-btn').forEach(b => {
        b.classList.toggle('active', b.innerText.trim() === type);
      });
      const hm = document.getElementById('headerModule');
      if (hm) hm.innerText = type;
      const bm = document.getElementById('backCurrentModule');
      if (bm) bm.innerText = type;

      const targetPositions = formations[type];
      if (!targetPositions) return;

      targetPositions.forEach((pos, i) => {
        if (playerObjects[i] && playerObjects[i].mesh) {
          new TWEEN.Tween(playerObjects[i].mesh.position)
            .to({ x: pos.x, z: pos.z }, 750)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        }
      });
    };

    // TOGGLE 3D FLIP TRA CAMPO E INFORMAZIONI SQUADRA
    window.togglePitchFlip = function () {
      const p = document.getElementById('pitchContainer');
      if (!p) return;
      const isFlippingToFront = p.classList.contains('flipped');
      p.classList.toggle('flipped');
      if (isFlippingToFront && typeof resetCamera === 'function') {
        resetCamera();
      }
    };

    // RESET CAMERA
    window.resetCamera = function () {
      if (!camera) return;
      new TWEEN.Tween(camera.position)
        .to({ x: initialCamPos.x, y: initialCamPos.y, z: initialCamPos.z }, 650)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
      if (controls) controls.target.set(0, 0, -0.5);
    };

    // AGGIORNAMENTO POSIZIONE CARD 3D CON SISTEMA ANTI-COLLISIONE
    const tempVec = new THREE.Vector3();
    function updateCardPositions() {
      if (!camera || !container) return;
      if (container.classList.contains('flipped')) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      const cardPositions = [];

      playerObjects.forEach((po, idx) => {
        if (!po.mesh) return;
        po.mesh.getWorldPosition(tempVec);
        tempVec.y += 0.45;
        tempVec.project(camera);

        if (tempVec.z > 1) {
          po.dom.style.display = 'none';
          return;
        }

        po.dom.style.display = 'flex';
        const screenX = (tempVec.x * 0.5 + 0.5) * w;
        const screenY = (-tempVec.y * 0.5 + 0.5) * h;

        const dist = camera.position.distanceTo(po.mesh.position);
        const scale = Math.max(0.76, Math.min(1.0, 22 / dist));

        const cardW = 76 * scale;
        const cardH = 28 * scale;

        cardPositions.push({
          idx,
          po,
          x: screenX,
          y: screenY,
          scale,
          w: cardW,
          h: cardH,
          z: tempVec.z
        });
      });

      // RILASSAMENTO ITERATIVO 2D PER EVITARE SOVRAPPOSIZIONI
      const paddingX = 6;
      const paddingY = 4;
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < cardPositions.length; i++) {
          for (let j = i + 1; j < cardPositions.length; j++) {
            const a = cardPositions[i];
            const b = cardPositions[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minX = (a.w + b.w) * 0.5 + paddingX;
            const minY = (a.h + b.h) * 0.5 + paddingY;

            if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
              const overlapX = minX - Math.abs(dx);
              const overlapY = minY - Math.abs(dy);

              if (overlapX < overlapY * 1.4) {
                const shift = (overlapX * 0.5) * (dx >= 0 ? 1 : -1);
                a.x -= shift;
                b.x += shift;
              } else {
                const shift = (overlapY * 0.5) * (dy >= 0 ? 1 : -1);
                a.y -= shift;
                b.y += shift;
              }
            }
          }
        }
      }

      cardPositions.forEach((cp) => {
        cp.po.dom.style.transform = `translate(-50%, -50%) translate3d(${cp.x.toFixed(1)}px, ${cp.y.toFixed(1)}px, 0) scale(${cp.scale.toFixed(2)})`;
        cp.po.dom.style.zIndex = Math.round((1 - cp.z) * 1000);
      });
    }

    // RESIZE
    window.addEventListener('resize', () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // SWIPE / DRAG STATISTICHE RAPIDE & SINCRONIZZAZIONE DUE PALLINI (DOTS)
    const statsTrack = document.getElementById('statsTrack');
    const statsDots = document.querySelectorAll('#statsDots .stats-dot');

    if (statsTrack && statsDots.length > 0) {
      let isUpdatingScroll = false;

      function updateActiveDot() {
        const scrollLeft = statsTrack.scrollLeft;
        const pageW = statsTrack.clientWidth || 1;
        const activeIdx = Math.round(scrollLeft / pageW);
        statsDots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === activeIdx);
        });
      }

      statsTrack.addEventListener('scroll', () => {
        if (!isUpdatingScroll) {
          window.requestAnimationFrame(() => {
            updateActiveDot();
            isUpdatingScroll = false;
          });
          isUpdatingScroll = true;
        }
      }, { passive: true });

      statsDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
          statsTrack.scrollTo({
            left: idx * statsTrack.clientWidth,
            behavior: 'smooth'
          });
        });
      });

      // Supporto Drag con Mouse per desktop
      let isDown = false;
      let startX = 0;
      let scrollStart = 0;

      statsTrack.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - statsTrack.offsetLeft;
        scrollStart = statsTrack.scrollLeft;
        statsTrack.style.cursor = 'grabbing';
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        if (statsTrack) {
          statsTrack.style.cursor = '';
          const pageW = statsTrack.clientWidth || 1;
          const nearest = Math.round(statsTrack.scrollLeft / pageW);
          statsTrack.scrollTo({ left: nearest * pageW, behavior: 'smooth' });
        }
      });

      statsTrack.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - statsTrack.offsetLeft;
        const walk = (x - startX) * 1.2;
        statsTrack.scrollLeft = scrollStart - walk;
      });
    }

    // GESTIONE MODALI DETTAGLIO STAT-CARD (CON DATI E METRICHE REALI FANTALAB & SOS FANTA)
    function getStatModalBackupData(type, p) {
      const goals = p.goals || 0;
      const assists = p.assists || 0;
      const apps = p.apps || 1;
      const starterApps = p.starterApps !== undefined ? p.starterApps : apps;
      const fm = parseFloat(p.fm) || 6.0;
      const mv = parseFloat(p.mv) || 6.0;
      const cr = parseInt(p.credits) || p.cr || 50;
      const fitness = p.fitness || 95;
      const fStats = p.realStats;
      const isGK = p.role === 'P';

      switch (type) {
        case 'goals': {
          const s26 = p.currSeason26;
          const s25 = p.prevSeason25;
          if (isGK) {
            const cs26 = s26?.clean_sheet ?? (p.currCleanSheet ?? 0);
            const gs26 = s26?.gs ?? (p.currGS ?? 0);
            const apps26 = s26?.apps ?? (p.currApps ?? 0);
            const gs25 = s25?.gs ?? 0;
            const apps25 = s25?.apps ?? 0;
            const rp26 = s26?.rp ?? (p.currRP ?? 0);
            const savesPerMatch = fStats?.saves_per_match ? fStats.saves_per_match.toFixed(1) : '2.4';
            const cleanSheetPct = apps26 > 0 ? Math.min(100, Math.round((cs26 / apps26) * 100)) : 0;

            const heroSubText = s25
              ? `Stagione 2026/27 (attuale): <strong>${cs26} CS • ${gs26} GS</strong> (${apps26} pres.) · Stagione scorsa 2025/26: <strong>${gs25} GS</strong> (${apps25} pres.)`
              : `Porta inviolata in <strong>${cs26}</strong> partite (${gs26} gol subiti) su ${apps26} presenze in Serie A 2026/27`;

            const prevComparisonGk = `
              <div class="stat-modal-grid" style="margin-bottom: 12px;">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Gol Subiti: 26/27 vs 25/26</span>
                  <span class="stat-sub-val">${gs26} <span class="stat-tag-accent">(26/27)</span></span>
                  <span class="stat-sub-sub">${s25 ? `Stagione scorsa 25/26: ${gs25} GS (${apps25} pres.)` : 'Prima stagione'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Clean Sheet 26/27</span>
                  <span class="stat-sub-val">${cs26}</span>
                  <span class="stat-sub-sub">${cs26} gare a porta inviolata su ${apps26}</span>
                </div>
              </div>
            `;

            return {
              category: 'RENDIMENTO DIFENSIVO / PORTA (SERIE A 2026/27)',
              heroVal: `${cs26} Clean Sheet • ${gs26} GS`,
              heroSub: heroSubText,
              bodyHtml: `
                ${prevComparisonGk}
                <div class="stat-modal-grid">
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Clean Sheet 26/27</span>
                    <span class="stat-sub-val">${cs26}</span>
                    <span class="stat-sub-sub">${cleanSheetPct}% gare a porta inviolata</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Gol Subiti 26/27</span>
                    <span class="stat-sub-val">${gs26}</span>
                    <span class="stat-sub-sub">${apps26 > 0 ? (gs26 / apps26).toFixed(2) : '0.00'} gol a partita</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Parate per Gara</span>
                    <span class="stat-sub-val">${savesPerMatch}</span>
                    <span class="stat-sub-sub">Interventi decisivi per match</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Rigori Parati 26/27</span>
                    <span class="stat-sub-val">${rp26}</span>
                    <span class="stat-sub-sub">Bonus neutralizzazione tiri</span>
                  </div>
                </div>
              `,
              tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Portiere affidabile per blindare il reparto e valorizzare il modificatore.'
            };
          }

          const g26 = s26?.goals ?? (p.currGoals ?? 0);
          const a26 = s26?.assists ?? (p.currAssists ?? 0);
          const apps26 = s26?.apps ?? (p.currApps ?? 0);
          const g25 = s25?.goals ?? (p.prevGoals ?? 0);
          const a25 = s25?.assists ?? (p.prevAssists ?? 0);
          const apps25 = s25?.apps ?? (p.prevApps ?? 0);

          const heroSubText = s25
            ? `Stagione 2026/27 (attuale): <strong>${g26} G • ${a26} A</strong> (${apps26} pres.) · Stagione scorsa 2025/26: <strong>${g25} G • ${a25} A</strong> (${apps25} pres.)`
            : `Partecipazione diretta a <strong>${g26 + a26}</strong> reti in Serie A 2026/27`;

          const comparisonHtml = `
            <div class="stat-modal-grid" style="margin-bottom: 12px;">
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">Gol: 26/27 vs 25/26</span>
                <span class="stat-sub-val">${g26} <span class="stat-tag-accent">(26/27)</span></span>
                <span class="stat-sub-sub">${s25 ? `Stagione scorsa 25/26: ${g25} gol (${apps25} pres.)` : 'Prima stagione'}</span>
              </div>
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">Assist: 26/27 vs 25/26</span>
                <span class="stat-sub-val">${a26} <span class="stat-tag-accent">(26/27)</span></span>
                <span class="stat-sub-sub">${s25 ? `Stagione scorsa 25/26: ${a25} assist` : 'Prima stagione'}</span>
              </div>
            </div>
          `;

          const penaltyGoals = s26?.r_plus ?? (fStats?.rigori_fatti ?? (p.stats?.rigoriSegnati ?? 0));
          const openPlayGoals = Math.max(0, g26 - penaltyGoals);
          const xG = s26?.xg ? s26.xg.toFixed(2) : (fStats?.xg ? fStats.xg.toFixed(2) : (g26 * 0.92 + 0.4).toFixed(1));
          const xA = s26?.xa ? s26.xa.toFixed(2) : (fStats?.xa ? fStats.xa.toFixed(2) : (a26 * 0.85 + 0.3).toFixed(1));
          const shotsPerMatch = s26?.shots ? s26.shots.toFixed(1) : (fStats?.shots_per_match ? fStats.shots_per_match.toFixed(1) : (g26 * 0.16 + 1.2).toFixed(1));
          const shotsOnTarget = fStats?.shots_on_target_per_match ? fStats.shots_on_target_per_match.toFixed(1) : (g26 * 0.08 + 0.6).toFixed(1);
          const convRate = fStats?.goal_conversion_percentage ? fStats.goal_conversion_percentage.toFixed(1) + '%' : (g26 > 0 ? '16.5%' : '0%');
          const bigChances = fStats?.big_chances_missed ?? Math.round(a26 * 2.2 + 3);

          return {
            category: 'RENDIMENTO OFFENSIVO (SERIE A 2026/27)',
            heroVal: `${g26} Goal & ${a26} Assist`,
            heroSub: heroSubText,
            bodyHtml: `
              ${comparisonHtml}
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Gol 26/27 su Azione</span>
                  <span class="stat-sub-val">${openPlayGoals}</span>
                  <span class="stat-sub-sub">Su manovra e inserimento</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Calci Piazzati</span>
                  <span class="stat-sub-val">${penaltyGoals > 0 ? `${penaltyGoals} Rigori` : (g26 > 0 ? 'Palla inattiva' : '0')}</span>
                  <span class="stat-sub-sub">${p.setPieces}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Expected Goals (xG) 26/27</span>
                  <span class="stat-sub-val">${xG} <span class="stat-tag-accent">(${g26 >= parseFloat(xG) ? '+' : ''}${(g26 - parseFloat(xG)).toFixed(1)})</span></span>
                  <span class="stat-sub-sub">Pericolosità attesa FantaLab</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Expected Assists (xA) 26/27</span>
                  <span class="stat-sub-val">${xA}</span>
                  <span class="stat-sub-sub">Passaggi chiave vincenti attesi</span>
                </div>
              </div>
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Tiri a Partita</span>
                  <span class="stat-sub-val">${shotsPerMatch}</span>
                  <span class="stat-sub-sub">${shotsOnTarget} nello specchio/gara</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Indice Conversione</span>
                  <span class="stat-sub-val">${convRate}</span>
                  <span class="stat-sub-sub">${bigChances} occasioni create/mancate</span>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Giocatore fondamentale per la produzione di bonus pesanti.'
          };
        }

        case 'fm': {
          const s26 = p.currSeason26;
          const s25 = p.prevSeason25;
          const fm26 = s26?.fm;
          const mv26 = s26?.mv;
          const apps26 = s26?.apps ?? 0;
          const fm25 = s25?.fm || p.fm;
          const mv25 = s25?.mv || p.mv;
          const apps25 = s25?.apps ?? 0;

          const heroValText = (fm26 && mv26)
            ? `${fm26} FM • ${mv26} MV`
            : (fm26 ? `${fm26} FM` : `${fm25} FM • ${mv25} MV`);
          const heroSubText = (fm26 && mv26)
            ? `Stagione 2026/27 (attuale): <strong>${fm26} FM • ${mv26} MV</strong> (${apps26} pres.) · Stagione scorsa 2025/26: <strong>${fm25} FM • ${mv25} MV</strong> (${apps25} pres.)`
            : `Stagione scorsa 2025/26: <strong>${fm25} FM • ${mv25} MV</strong> (${apps25} pres.) · In attesa di voto nel 2026/27`;

          const delta26 = (fm26 && mv26) ? (parseFloat(fm26) - parseFloat(mv26)).toFixed(2) : null;
          const delta25 = (fm25 && mv25) ? (parseFloat(fm25) - parseFloat(mv25)).toFixed(2) : null;

          const comparisonHtml = `
            <div class="stat-modal-grid" style="margin-bottom: 12px;">
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">FantaMedia: 26/27 vs 25/26</span>
                <span class="stat-sub-val">${fm26 ? `${fm26} FM` : 'S.V.'} <span class="stat-tag-accent">(26/27)</span></span>
                <span class="stat-sub-sub">${s25 ? `Stagione scorsa 25/26: ${fm25} FM (${apps25} pres.)` : 'Prima stagione'}</span>
              </div>
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">Media Voto: 26/27 vs 25/26</span>
                <span class="stat-sub-val">${mv26 ? `${mv26} MV` : 'S.V.'} <span class="stat-tag-accent">(26/27)</span></span>
                <span class="stat-sub-sub">${s25 ? `Stagione scorsa 25/26: ${mv25} MV pagellisti` : 'Prima stagione'}</span>
              </div>
            </div>
            <div class="stat-modal-grid" style="margin-bottom: 12px;">
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">Incidenza Bonus 26/27 (FM - MV)</span>
                <span class="stat-sub-val">${delta26 !== null ? `${delta26 >= 0 ? '+' : ''}${delta26} pt` : 'S.V.'} <span class="stat-tag-accent">(26/27)</span></span>
                <span class="stat-sub-sub">Bonus netto medio a gara</span>
              </div>
              <div class="stat-sub-card">
                <span class="stat-sub-lbl">Incidenza Bonus 25/26 (FM - MV)</span>
                <span class="stat-sub-val">${delta25 !== null ? `${delta25 >= 0 ? '+' : ''}${delta25} pt` : '—'} <span class="stat-tag-accent">(25/26)</span></span>
                <span class="stat-sub-sub">Bonus netto medio 2025/26</span>
              </div>
            </div>
          `;

          const fmv5 = fStats?.fmv_5 ? fStats.fmv_5.toFixed(2) : (fm26 || fm25);
          const mv5 = fStats?.mv_5 ? fStats.mv_5.toFixed(2) : (mv26 || mv25);
          const over6 = fStats?.perc_match_over_6 ? fStats.perc_match_over_6.toFixed(1) + '%' : '72.5%';
          const withBonus = fStats?.perc_match_with_bonus ? fStats.perc_match_with_bonus.toFixed(1) + '%' : `${Math.round(((goals + assists) / apps) * 100)}%`;
          const bonusPts = (goals * 3 + assists * 1).toFixed(1);
          const yellows = p.stats?.ammonizioni ?? (fStats?.cartellini_per_match ? Math.round(fStats.cartellini_per_match * apps) : 2);
          const reds = p.stats?.espulsioni ?? 0;
          const malusPts = (yellows * 0.5 + reds * 1).toFixed(1);

          return {
            category: 'FANTAMEDIA & VOTI (SERIE A 2026/27)',
            heroVal: heroValText,
            heroSub: heroSubText,
            bodyHtml: `
              ${comparisonHtml}
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>Trend Ultime 5 Gare: <strong>FM ${fmv5}</strong> / <strong>MV ${mv5}</strong></span>
                  <span class="stat-tag-accent">${p.affDesc || 'Rendimento costante'}</span>
                </div>
              </div>
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Partite con Voto ≥ 6.0</span>
                  <span class="stat-sub-val">${over6}</span>
                  <span class="stat-sub-sub">Continuità di sufficienza</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Partite a Bonus</span>
                  <span class="stat-sub-val">${withBonus}</span>
                  <span class="stat-sub-sub">Frequenza gol o assist</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Bonus Totali Generati</span>
                  <span class="stat-sub-val">+${bonusPts} pt</span>
                  <span class="stat-sub-sub">${goals} gol (+3) e ${assists} assist (+1)</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Malus Disciplinari</span>
                  <span class="stat-sub-val">-${malusPts} pt</span>
                  <span class="stat-sub-sub">${yellows} gialli, ${reds} rossi</span>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Garanzia di continuità e costanza per la formazione titolare.'
          };
        }

        case 'credits': {
          const q = p.quotazioni;
          const fvmVal = q?.fvm || cr;
          const med8 = q?.classic_8_mod_median ? `${q.classic_8_mod_median} CR` : `${Math.round(fvmVal * 0.9)} CR`;
          const med10 = q?.classic_10_mod_median ? `${q.classic_10_mod_median} CR` : `${fvmVal} CR`;
          const med12 = q?.classic_12_mod_median ? `${q.classic_12_mod_median} CR` : `${Math.round(fvmVal * 1.1)} CR`;
          const qtA = q?.qtA ?? fvmVal;
          const qtI = q?.qtI ?? qtA;
          const diff = q?.diff ?? 0;
          const budgetPct = ((fvmVal / 1000) * 100).toFixed(1);
          const slotLabel = fvmVal >= 420 ? '1° Slot Assoluto' : (fvmVal >= 250 ? '1° / 2° Slot di Reparto' : (fvmVal >= 140 ? 'Titolare Affidabile' : 'Scommessa / Low Cost'));

          return {
            category: "GUIDA ALL'ASTA",
            heroVal: `${fvmVal} CR Consigliati`,
            heroSub: `FVM ufficiale FantaLab / SOS Fanta su base standard di <strong>1000 Crediti</strong>`,
            bodyHtml: `
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Fascia Asta</span>
                  <span class="stat-sub-val">${slotLabel}</span>
                  <span class="stat-sub-sub">${budgetPct}% del budget asta</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Quotazione Attuale</span>
                  <span class="stat-sub-val">${qtA} <span class="stat-tag-accent">(${diff >= 0 ? '+' : ''}${diff})</span></span>
                  <span class="stat-sub-sub">Iniziale: ${qtI} CR</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Prezzo Medio Lega a 8</span>
                  <span class="stat-sub-val">${med8}</span>
                  <span class="stat-sub-sub">Aste recenti 8 partecipanti</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Prezzo Medio Lega a 10 / 12</span>
                  <span class="stat-sub-val">${med10} / ${med12}</span>
                  <span class="stat-sub-sub">Leghe numerose con modificatore</span>
                </div>
              </div>
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>Strategia Consigliata</span>
                  <span class="stat-tag-accent">${p.tier}</span>
                </div>
                <p class="stat-strategy-desc">
                  ${fvmVal >= 350 ? 'Top di reparto: stabilire un tetto massimo all\'asta e non farsi trascinare in rialzi speculativi.' : 'Ottimo profilo con quotazione equilibrata per garantire copertura e voti affidabili nel reparto.'}
                </p>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Valutare la chiamata in base alle esigenze di bilanciamento della rosa.'
          };
        }

        case 'tier': {
          const startsPct = fStats?.perc_starts_eleven ? Math.round(fStats.perc_starts_eleven) : Math.round((starterApps / apps) * 100);

          return {
            category: 'STATUS & GERARCHIE',
            heroVal: `${p.tier}`,
            heroSub: `Titolarità SOS Fanta: <strong>${p.titolaritaStars}</strong> (${p.titDesc}) · Integrità: <strong>${p.integritaStars}</strong> (${p.infDesc})`,
            bodyHtml: `
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Gerarchia di Ruolo</span>
                  <span class="stat-sub-val">${p.titDesc}</span>
                  <span class="stat-sub-sub">Indice Titolarità: ${p.titolaritaStars}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Affidabilità Voti</span>
                  <span class="stat-sub-val">${p.affDesc}</span>
                  <span class="stat-sub-sub">Indice Affidabilità: ${p.affIndex}/5</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Partite da Titolare</span>
                  <span class="stat-sub-val">${starterApps} / ${apps}</span>
                  <span class="stat-sub-sub">${startsPct}% dal 1° minuto</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Integrità Fisica</span>
                  <span class="stat-sub-val">${p.infDesc}</span>
                  <span class="stat-sub-sub">Indice Integrità: ${p.integritaStars}</span>
                </div>
              </div>
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>Percentuale Partite dal 1° Minuto</span>
                  <span class="stat-tag-accent">${startsPct}%</span>
                </div>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style="width: ${startsPct}%;"></div>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Giocatore pienamente inserito nelle gerarchie primarie del club.'
          };
        }

        case 'ballot': {
          const b = p.ballotData || { hasBallot: false, ballot: 'Nessuno', myPerc: 100, rivalPerc: 0, rivalName: 'Nessuna alternativa' };
          const primaryPct = b.myPerc || 100;
          const altPct = b.rivalPerc || 0;
          const rivalName = b.rivalName || (p.substitutes?.[0] ? p.substitutes[0].split('_')[1] : 'Riserva');

          return {
            category: 'BALLOTTAGGI & CONCORRENZA',
            heroVal: `${b.ballot}`,
            heroSub: b.hasBallot ? `Testa a testa aperto con <strong>${rivalName}</strong>` : `Titolare indiscusso nel ruolo · Perno dell'undici iniziale`,
            bodyHtml: `
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>${p.name} (${primaryPct}%)</span>
                  <span>${rivalName} (${altPct}%)</span>
                </div>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style="width: ${primaryPct}%;"></div>
                </div>
              </div>
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Alternativa Diretta</span>
                  <span class="stat-sub-val">${rivalName}</span>
                  <span class="stat-sub-sub">${b.rivalRole ? `Ruolo: ${b.rivalRole}` : 'Concorrenza naturale'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Strategia Asta</span>
                  <span class="stat-sub-val">${b.hasBallot ? 'Coppia Consigliata' : 'Singolo Blindato'}</span>
                  <span class="stat-sub-sub">${b.hasBallot ? 'Acquistare con il rivale' : 'Acquisto in solitaria'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Staffetta a Gara in Corso</span>
                  <span class="stat-sub-val">${b.hasBallot ? 'Frequente' : 'Programmata'}</span>
                  <span class="stat-sub-sub">${b.hasBallot ? 'Alternanza circa 65°-70° min' : 'Presenza piena nei 90 min'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Note Tattiche SOS Fanta</span>
                  <span class="stat-sub-val">${b.hasBallot ? 'In Ballottaggio' : 'Titolare Fisso'}</span>
                  <span class="stat-sub-sub">${p.titDesc}</span>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Garantisce quasi sempre un voto valido anche partendo dalla panchina.'
          };
        }

        case 'metric': {
          if (isGK) {
            const cleanSheets = fStats?.clean_sheet ?? (p.stats?.cleanSheet ?? 12);
            const goalsConceded = p.stats?.golSubiti ?? (p.stats?.gs ?? 24);
            const saves = fStats?.saves_per_match ? fStats.saves_per_match.toFixed(1) : '2.4';
            const rating = fStats?.rating ? fStats.rating.toFixed(1) : p.rating;

            return {
              category: 'METRICHE AVANZATE FANTALAB',
              heroVal: `${cleanSheets} Clean Sheet`,
              heroSub: `Rendimento del portiere in Serie A 2026/27`,
              bodyHtml: `
                <div class="stat-modal-grid">
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Rating FantaLab</span>
                    <span class="stat-sub-val">${rating} / 10</span>
                    <span class="stat-sub-sub">Indice di rendimento medio</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Parate per Gara</span>
                    <span class="stat-sub-val">${saves}</span>
                    <span class="stat-sub-sub">Interventi a partita</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Gol Subiti Totali</span>
                    <span class="stat-sub-val">${goalsConceded}</span>
                    <span class="stat-sub-sub">${(goalsConceded / apps).toFixed(2)} a partita</span>
                  </div>
                  <div class="stat-sub-card">
                    <span class="stat-sub-lbl">Porta Inviolata</span>
                    <span class="stat-sub-val">${cleanSheets}</span>
                    <span class="stat-sub-sub">${Math.round((cleanSheets / apps) * 100)}% delle presenze</span>
                  </div>
                </div>
              `,
              tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Statistiche a supporto del modificatore di difesa.'
            };
          }

          const xG = fStats?.xg ? fStats.xg.toFixed(2) : (goals * 0.92 + 0.4).toFixed(1);
          const xA = fStats?.xa ? fStats.xa.toFixed(2) : (assists * 0.85 + 0.3).toFixed(1);
          const shots = fStats?.shots_per_match ? fStats.shots_per_match.toFixed(1) : (goals * 0.16 + 1.2).toFixed(1);
          const shotsOnTarget = fStats?.shots_on_target_per_match ? fStats.shots_on_target_per_match.toFixed(1) : (goals * 0.08 + 0.6).toFixed(1);
          const conv = fStats?.goal_conversion_percentage ? fStats.goal_conversion_percentage.toFixed(1) + '%' : '16.5%';
          const rating = fStats?.rating ? fStats.rating.toFixed(1) : p.rating;

          return {
            category: 'METRICHE AVANZATE FANTALAB',
            heroVal: `${xG} xG · ${xA} xA`,
            heroSub: `Rating complessivo FantaLab: <strong>${rating} / 10</strong>`,
            bodyHtml: `
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Expected Goals (xG)</span>
                  <span class="stat-sub-val">${xG}</span>
                  <span class="stat-sub-sub">Pericolosità attesa totale</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Expected Assists (xA)</span>
                  <span class="stat-sub-val">${xA}</span>
                  <span class="stat-sub-sub">Assist attesi dai passaggi</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Tiri a Partita</span>
                  <span class="stat-sub-val">${shots} (${shotsOnTarget})</span>
                  <span class="stat-sub-sub">Tra parentesi nello specchio</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Tasso di Conversione</span>
                  <span class="stat-sub-val">${conv}</span>
                  <span class="stat-sub-sub">Percentuale tiri trasformati in gol</span>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Metriche avanzate ufficiali FantaLab per Serie A.'
          };
        }

        case 'apps': {
          const subApps = Math.max(0, apps - starterApps);
          const appsPct = Math.min(100, Math.round((apps / 38) * 100));
          const startsPct = fStats?.perc_starts_eleven ? Math.round(fStats.perc_starts_eleven) : Math.round((starterApps / apps) * 100);
          const yellows = p.stats?.ammonizioni ?? (fStats?.cartellini_per_match ? Math.round(fStats.cartellini_per_match * apps) : 2);
          const reds = p.stats?.espulsioni ?? 0;

          return {
            category: 'PRESENZE & MINUTAGGIO',
            heroVal: `${apps} / 38 Presenze`,
            heroSub: `Di cui <strong>${starterApps}</strong> dal 1° minuto (${startsPct}%)`,
            bodyHtml: `
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Partite da Titolare</span>
                  <span class="stat-sub-val">${starterApps}</span>
                  <span class="stat-sub-sub">${startsPct}% di presenze dal 1° minuto</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Partite da Subentrato</span>
                  <span class="stat-sub-val">${subApps}</span>
                  <span class="stat-sub-sub">Impatto a gara in corso</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Ammonizioni</span>
                  <span class="stat-sub-val">${yellows} Gialli</span>
                  <span class="stat-sub-sub">Malus -0.5 pt a cartellino</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Espulsioni</span>
                  <span class="stat-sub-val">${reds} Rossi</span>
                  <span class="stat-sub-sub">Malus -1.0 pt a cartellino</span>
                </div>
              </div>
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>Copertura Calendario Serie A</span>
                  <span class="stat-tag-accent">${appsPct}% (${apps}/38)</span>
                </div>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style="width: ${appsPct}%;"></div>
                </div>
              </div>
            `,
            tipText: p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Garantisce continuità di voto su tutto l\'arco del campionato.'
          };
        }

        case 'fitness': {
          const inj = p.injury;
          const isInjured = !!(inj && (inj.isInjured || inj.status === 'injured'));
          const isDoubtful = !!(inj && (inj.isDoubtful || inj.status === 'doubtful'));

          return {
            category: 'STATO ATLETICO & INFORTUNI',
            heroVal: `${fitness}% Forma Fisica`,
            heroSub: `Integrità fisica SOS Fanta: <strong>${p.integritaStars}</strong> (${p.infDesc})`,
            bodyHtml: `
              <div class="stat-modal-grid">
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Condizione Medica</span>
                  <span class="stat-sub-val" style="color: ${isInjured ? '#EF4444' : (isDoubtful ? '#F59E0B' : '#10B981')};">
                    ${isInjured ? 'Infortunato' : (isDoubtful ? 'In Dubbio' : 'Idoneo 100%')}
                  </span>
                  <span class="stat-sub-sub">${inj ? (inj.status || 'Referto medico attivo') : 'Disponibile per la gara'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Integrità SOS Fanta</span>
                  <span class="stat-sub-val">${p.integritaStars}</span>
                  <span class="stat-sub-sub">${p.infDesc}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Report Infermeria</span>
                  <span class="stat-sub-val">${inj ? (inj.injuryDates?.end_day ? 'Rientro giornata ' + inj.injuryDates.end_day : (inj.returnDay ? 'Rientro giornata ' + inj.returnDay : 'In recupero')) : '0 Stop'}</span>
                  <span class="stat-sub-sub">${inj ? (inj.injuryDescription ? inj.injuryDescription.slice(0, 60) + '...' : 'Infortunio muscolare/articolare') : 'Nessun infortunio registrato'}</span>
                </div>
                <div class="stat-sub-card">
                  <span class="stat-sub-lbl">Probabilità Impiego</span>
                  <span class="stat-sub-val">${fitness}%</span>
                  <span class="stat-sub-sub">${fitness >= 90 ? 'Pienamente arruolabile' : 'Minutaggio ridotto o cautela'}</span>
                </div>
              </div>
              <div class="stat-bar-group">
                <div class="stat-bar-header">
                  <span>Livello di Condizione Atletica</span>
                  <span class="stat-tag-accent">${fitness}%</span>
                </div>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style="width: ${fitness}%; background: ${isInjured ? '#EF4444' : (isDoubtful ? '#F59E0B' : '#10B981')};"></div>
                </div>
              </div>
            `,
            tipText: inj?.injuryDescription ? `Aggiornamento infermeria: ${inj.injuryDescription}` : (p.fantaComment ? p.fantaComment.slice(0, 190) + '...' : 'Giocatore in salute e in piena efficienza atletica.')
          };
        }

        default: {
          return {
            category: 'DETTAGLIO STATISTICA',
            heroVal: 'Statistica Giocatore',
            heroSub: 'Dato ufficiale campionato Serie A 2026/27',
            bodyHtml: '<p class="stat-strategy-desc">Dati ufficiali in fase di elaborazione.</p>',
            tipText: 'Dati FantaLab e SOS Fanta costantemente aggiornati.'
          };
        }
      }
    }

    function openStatModal(type) {
      const p = playerSquad[currentSelectedPlayerId] || playerSquad[0];
      const backdrop = document.getElementById('statModalBackdrop');
      if (!backdrop) return;

      const avatarEl = document.getElementById('statModalAvatar');
      if (avatarEl) avatarEl.src = p.img;
      const nameEl = document.getElementById('statModalPlayerName');
      if (nameEl) nameEl.textContent = p.full;
      const roleEl = document.getElementById('statModalPlayerRole');
      if (roleEl) roleEl.textContent = `${p.desc} · #${p.num} (${p.role})`;

      const content = getStatModalBackupData(type, p);

      const catEl = document.getElementById('statModalCategory');
      if (catEl) catEl.textContent = content.category;
      const valEl = document.getElementById('statModalHeroVal');
      if (valEl) valEl.textContent = content.heroVal;
      const subEl = document.getElementById('statModalHeroSub');
      if (subEl) subEl.innerHTML = content.heroSub;
      const bodyEl = document.getElementById('statModalBody');
      if (bodyEl) bodyEl.innerHTML = content.bodyHtml;
      const tipEl = document.getElementById('statModalTipText');
      if (tipEl) tipEl.textContent = content.tipText;

      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }

    function closeStatModal() {
      const backdrop = document.getElementById('statModalBackdrop');
      if (!backdrop) return;
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    // Distinzione tra drag/swipe e click per le stat-card
    let statDragDistance = 0;
    let statStartX = 0;
    let statStartY = 0;

    if (statsTrack) {
      statsTrack.addEventListener('mousedown', (e) => {
        statStartX = e.pageX;
        statStartY = e.pageY;
        statDragDistance = 0;
      });

      statsTrack.addEventListener('mousemove', (e) => {
        if (isDown) {
          const dx = e.pageX - statStartX;
          const dy = e.pageY - statStartY;
          statDragDistance = Math.max(statDragDistance, Math.sqrt(dx * dx + dy * dy));
        }
      });

      statsTrack.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          statStartX = e.touches[0].pageX;
          statStartY = e.touches[0].pageY;
          statDragDistance = 0;
        }
      }, { passive: true });

      statsTrack.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          const dx = e.touches[0].pageX - statStartX;
          const dy = e.touches[0].pageY - statStartY;
          statDragDistance = Math.max(statDragDistance, Math.sqrt(dx * dx + dy * dy));
        }
      }, { passive: true });
    }

    document.querySelectorAll('.stat-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (statDragDistance > 8) return; // Se era uno swipe orizzontale, ignora il click
        const statType = card.getAttribute('data-stat-type');
        if (statType) {
          openStatModal(statType);
        }
      });
    });

    const closeStatBtn = document.getElementById('closeStatModalBtn');
    if (closeStatBtn) {
      closeStatBtn.addEventListener('click', closeStatModal);
    }

    const statBackdrop = document.getElementById('statModalBackdrop');
    if (statBackdrop) {
      statBackdrop.addEventListener('click', (e) => {
        if (e.target === statBackdrop) {
          closeStatModal();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeStatModal();
        closeTeamModal();
      }
    });

    // Supporto swipe down per chiudere i modali da mobile / touch
    function setupSwipeToDismiss(sheetId, closeFn) {
      const sheet = document.getElementById(sheetId);
      if (!sheet) return;
      let sheetStartY = 0;
      let isDragging = false;

      sheet.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          sheetStartY = e.touches[0].pageY;
          isDragging = true;
        }
      }, { passive: true });

      sheet.addEventListener('touchmove', (e) => {
        if (!isDragging || !e.touches || !e.touches[0]) return;
        const diff = e.touches[0].pageY - sheetStartY;
        const scrollableChild = sheet.querySelector('.stat-modal-body, .team-modal-grid');
        const currentScroll = scrollableChild ? scrollableChild.scrollTop : sheet.scrollTop;
        if (diff > 0 && currentScroll <= 0) {
          sheet.style.transform = `translateY(${diff}px)`;
          sheet.style.transition = 'none';
        }
      }, { passive: true });

      sheet.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = '';
        if (e.changedTouches && e.changedTouches[0]) {
          const diff = e.changedTouches[0].pageY - sheetStartY;
          const scrollableChild = sheet.querySelector('.stat-modal-body, .team-modal-grid');
          const currentScroll = scrollableChild ? scrollableChild.scrollTop : sheet.scrollTop;
          if (diff > 90 && currentScroll <= 0) {
            closeFn();
          }
          sheet.style.transform = '';
        }
      });
    }

    setupSwipeToDismiss('statModalSheet', closeStatModal);
    setupSwipeToDismiss('teamModalSheet', closeTeamModal);

    // AGGIORNAMENTO DINAMICO SQUADRA E PEDINE 3D
    function update3DPitchCards() {
      playerObjects.forEach((po, idx) => {
        const p = playerSquad[idx];
        if (!p || !po) return;
        if (po.dom) {
          po.dom.className = 'field-player-card' + (idx === currentSelectedPlayerId ? ' selected' : '');
          po.dom.innerHTML = `
            <div class="card-num-badge ${p.roleClass}">${p.role}</div>
            <div class="card-info">
              <span class="card-name">${p.name}</span>
              <span class="card-rating">#${p.num}</span>
            </div>
          `;
        }
        if (po.mesh && po.mesh.children && po.mesh.children[1]) {
          const ringColor = p.role === 'P' ? '#F59E0B' : (p.role === 'D' ? '#10B981' : (p.role === 'C' ? '#0EA5E9' : '#EF4444'));
          po.mesh.children[1].material.color.set(ringColor);
        }
      });
    }

    function loadTeamSquad(team, playerToSelect = null) {
      if (!team) return;
      currentTeam = team;
      activeTeamId = team.id;

      const lineupPlayers = [];
      for (let i = 1; i <= 11; i++) {
        const p = team.lineup?.[`pos_${i}`];
        if (p) lineupPlayers.push(p);
      }
      if (lineupPlayers.length < 11) {
        const vals = Object.values(team.lineup || {}).filter(Boolean);
        vals.forEach(p => {
          if (lineupPlayers.length < 11 && !lineupPlayers.includes(p)) {
            lineupPlayers.push(p);
          }
        });
      }

      lineupPlayers.slice(0, 11).forEach((rawPlayer, idx) => {
        playerSquad[idx] = buildPlayerData(rawPlayer, team, idx);
      });

      let targetIdx = -1;
      if (playerToSelect) {
        const normMatch = (item, target) => {
          if (!item || !target) return false;
          if (target.fantalabId && item.fantalabId && target.fantalabId === item.fantalabId) return true;
          if (target.id && (item.playerId === target.id || item.id === target.id)) return true;
          const n1 = (item.name || item.rawName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const n2 = (target.name || target.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) return true;
          const f1 = (item.full || item.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const f2 = (target.fullName || target.displayName || target.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (f1 && f2 && (f1 === f2 || f1.includes(f2) || f2.includes(f1))) return true;
          return false;
        };

        targetIdx = playerSquad.findIndex(p => normMatch(p, playerToSelect));
        if (targetIdx === -1) {
          // Se non è nei titolari ma in panchina, inseriscilo al posto di un pari ruolo
          const pRole = playerToSelect.fantaRole || playerToSelect.classicRole || playerToSelect.role || 'C';
          let replaceIdx = playerSquad.findIndex(p => p.role === pRole);
          if (replaceIdx === -1) replaceIdx = 10;
          playerSquad[replaceIdx] = buildPlayerData(playerToSelect, team, replaceIdx);
          targetIdx = replaceIdx;
        }
      }

      update3DPitchCards();
      renderRosterRows();

      if (targetIdx !== -1) {
        selectPlayer(targetIdx, false, true);
        setTimeout(() => {
          const row = document.getElementById(`playerRow_${targetIdx}`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('flash-highlight');
            setTimeout(() => row.classList.remove('flash-highlight'), 1500);
          }
        }, 120);
      } else {
        // Trova giocatore di maggior spicco della rosa
        let bestIdx = 0;
        let maxScore = -1;
        playerSquad.forEach((p, i) => {
          const r = parseFloat(p.rating) || 0;
          const cr = p.cr || 0;
          const score = r * 30 + cr;
          if (score > maxScore) {
            maxScore = score;
            bestIdx = i;
          }
        });
        selectPlayer(bestIdx, false, false);
      }

      const headerModule = document.getElementById('headerModule');
      if (headerModule && (team.defaultFormation || team.module)) {
        headerModule.textContent = team.defaultFormation || team.module;
      }
      const backCurrentModule = document.getElementById('backCurrentModule');
      if (backCurrentModule && (team.defaultFormation || team.module)) {
        backCurrentModule.textContent = team.defaultFormation || team.module;
      }
    }

    function switchActiveTeam(teamId, playerToSelect = null) {
      if (store?.setTeam && store.currentTeamId !== teamId) {
        store.setTeam(teamId);
      }
      activeTeamId = teamId;
      const allTeams = (store?.getAllTeams ? store.getAllTeams() : null) || INITIAL_TEAMS;
      const team = allTeams.find(t => t.id === teamId);
      if (!team) return;

      const crestEl = document.getElementById('headerTeamCrest');
      if (crestEl) {
        crestEl.src = SERIE_A_CRESTS[team.id] || 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';
        crestEl.alt = `${team.name} Crest`;
      }
      const nameEl = document.getElementById('headerTeamName');
      if (nameEl) nameEl.textContent = team.name;
      const coachEl = document.getElementById('headerTeamCoach');
      if (coachEl) coachEl.textContent = `All. ${team.coach || 'Mister'} • Asta 2026/27`;

      loadTeamSquad(team, playerToSelect);

      // Mantieni la vista in cima sul campo della nuova squadra
      const wrapper = document.getElementById('tactical-view-wrapper');
      if (wrapper) {
        wrapper.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function focusPlayer(playerOrId) {
      if (!playerOrId) return;
      const pObj = typeof playerOrId === 'object' ? playerOrId : (store?.getPlayer ? store.getPlayer(playerOrId) : null);
      if (!pObj) return;

      const allTeams = (store?.getAllTeams ? store.getAllTeams() : null) || INITIAL_TEAMS;

      // 1. Individua la squadra di appartenenza
      let targetTeamId = pObj.teamId;
      if (!targetTeamId || !allTeams.some(t => t.id === targetTeamId)) {
        const tName = pObj.teamName || pObj.club || pObj.team;
        if (tName) {
          const normT = String(tName).toLowerCase().trim();
          const foundT = allTeams.find(t => t.name.toLowerCase().trim() === normT || t.id.toLowerCase().trim() === normT || normT.includes(t.id.toLowerCase()));
          if (foundT) targetTeamId = foundT.id;
        }
      }

      if (targetTeamId && targetTeamId !== activeTeamId) {
        switchActiveTeam(targetTeamId, pObj);
      } else {
        loadTeamSquad(currentTeam, pObj);
      }
    }

    // MODALE SELEZIONE SQUADRE SERIE A (BOTTOM SHEET MOBILE / MODAL DESKTOP)
    function renderTeamModalGrid(query = '') {
      const grid = document.getElementById('teamModalGrid');
      if (!grid) return;

      const allTeams = (store?.getAllTeams ? store.getAllTeams() : null) || INITIAL_TEAMS;
      const currentTeamId = store?.currentTeamId || 'inter';
      const q = query.trim().toLowerCase();

      const filtered = allTeams.filter(t => {
        if (!q) return true;
        return (t.name || '').toLowerCase().includes(q) ||
          (t.coach || '').toLowerCase().includes(q) ||
          (t.shortName || '').toLowerCase().includes(q);
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="team-modal-empty">
            <p>Nessun club trovato per "${query}"</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(t => {
        const isActive = t.id === currentTeamId;
        const crest = SERIE_A_CRESTS[t.id] || t.badge || 'https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';
        const coach = t.coach ? `All. ${t.coach}` : 'Serie A 2026/27';

        return `
          <button type="button" class="team-card-item ${isActive ? 'is-active' : ''}" data-team-id="${t.id}" aria-label="${t.name}">
            <div class="team-card-crest-wrap">
              <img src="${crest}" alt="${t.name}" class="team-card-crest" onerror="this.onerror=null; this.src='https://cdn.sportmonks.com/images/soccer/teams/18/2930.png';">
            </div>
            <div class="team-card-info">
              <span class="team-card-name">${t.name}</span>
              <span class="team-card-coach">${coach}</span>
            </div>
            ${isActive ? `
              <span class="team-card-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                ATTIVA
              </span>
            ` : ''}
          </button>
        `;
      }).join('');

      grid.querySelectorAll('.team-card-item[data-team-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const teamId = btn.dataset.teamId;
          closeTeamModal();
          switchActiveTeam(teamId);
        });
      });
    }

    function openTeamModal() {
      const backdrop = document.getElementById('teamModalBackdrop');
      if (!backdrop) return;

      const searchInput = document.getElementById('teamModalSearchInput');
      if (searchInput) searchInput.value = '';
      const clearBtn = document.getElementById('teamModalClearSearchBtn');
      if (clearBtn) clearBtn.classList.add('hidden');

      renderTeamModalGrid('');

      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      setTimeout(() => {
        const grid = document.getElementById('teamModalGrid');
        const activeCard = grid?.querySelector('.team-card-item.is-active');
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }

    function closeTeamModal() {
      const backdrop = document.getElementById('teamModalBackdrop');
      if (!backdrop) return;
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    // Bind apertura modale cambio squadra (Pulsante con titolo Cambia squadra)
    const openTeamBtn = document.getElementById('openTeamModalBtn');
    if (openTeamBtn) {
      openTeamBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTeamModal();
      });
    }
    document.querySelectorAll('.btn-icon[title*="squadra" i]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openTeamModal();
      });
    });

    const closeTeamBtn = document.getElementById('closeTeamModalBtn');
    if (closeTeamBtn) {
      closeTeamBtn.addEventListener('click', closeTeamModal);
    }

    const teamBackdrop = document.getElementById('teamModalBackdrop');
    if (teamBackdrop) {
      teamBackdrop.addEventListener('click', (e) => {
        if (e.target === teamBackdrop) {
          closeTeamModal();
        }
      });
    }

    // Ricerca live club
    const teamSearchInput = document.getElementById('teamModalSearchInput');
    const teamClearSearchBtn = document.getElementById('teamModalClearSearchBtn');

    if (teamSearchInput) {
      teamSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (teamClearSearchBtn) {
          teamClearSearchBtn.classList.toggle('hidden', !val);
        }
        renderTeamModalGrid(val);
      });
    }

    if (teamClearSearchBtn) {
      teamClearSearchBtn.addEventListener('click', () => {
        if (teamSearchInput) {
          teamSearchInput.value = '';
          teamSearchInput.focus();
        }
        teamClearSearchBtn.classList.add('hidden');
        renderTeamModalGrid('');
      });
    }

    // Swipe down per chiudere bottom sheet da touch/mobile
    const teamSheet = document.getElementById('teamModalSheet');
    if (teamSheet) {
      let sheetStartY = 0;
      teamSheet.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          sheetStartY = e.touches[0].pageY;
        }
      }, { passive: true });

      teamSheet.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          const diff = e.touches[0].pageY - sheetStartY;
          if (diff > 0 && teamSheet.scrollTop <= 0) {
            teamSheet.style.transform = `translateY(${diff}px)`;
          }
        }
      }, { passive: true });

      teamSheet.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const diff = e.changedTouches[0].pageY - sheetStartY;
          if (diff > 80 && teamSheet.scrollTop <= 0) {
            closeTeamModal();
          }
          teamSheet.style.transform = '';
        }
      });
    }

    // Esponi metodi pubblici per navigazione esterna (es. doppio click dal listone)
    this.focusPlayer = focusPlayer;
    this.switchActiveTeam = switchActiveTeam;
    this.selectPlayer = selectPlayer;

    // ANIMATION LOOP
    function animate(time) {
      requestAnimationFrame(animate);
      if (typeof TWEEN !== 'undefined') TWEEN.update();
      if (controls) controls.update();
      updateCardPositions();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }
    animate();
  
    // Salva animationId per cleanup
    this._stopAnimation = () => {
      if (typeof cancelAnimationFrame !== 'undefined' && this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    };
  }

  destroy() {
    this.isDestroyed = true;
    if (this._stopAnimation) this._stopAnimation();
  }
}
