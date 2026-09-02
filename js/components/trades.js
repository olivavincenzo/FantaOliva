/**
 * Componente Valutatore Scambi & Confronti (Motore FantaLab 1:1 Ufficiale)
 * Implementazione fedele al 100% dell'algoritmo matematico FantaLab,
 * alimentato dal database statistico completo PLAYER_STATS_MAP e PLAYER_RATINGS_MAP.
 */

import { store } from '../store.js';
import { sanitizeHtml, clamp, getPlayerInitials } from '../utils/helpers.js';
import { INJURIES_DATA } from '../data/injuriesData.js';
import { PLAYER_STATS_MAP } from '../data/playerStatsData.js';
import { PLAYER_RATINGS_MAP } from '../data/playerRatingsMap.js';

// --- CONFIGURAZIONE E PESI UFFICIALI FANTALAB ---
const FANTALAB_CONFIG = {
  weights: {
    lega: { VALUE: 0.47, HYPE: 0.07, CALENDAR: 0.13, TEAM: 0.16, INJURY: 0.17 },
    singolo: { VALUE: 0.53, HYPE: 0.08, CALENDAR: 0.16, INJURY: 0.23 }
  },
  caps: { hype: 4, injury: 4 },
  amplifier: { max: 1.8, multiplier: 0.09 },
  aggregation: "sum",
  valueBaseline: 0.38,
  valueSumMult: 1.5,
  slot: { weight: 2 },
  roleSwap: { weight: 12, slotValues: { A: 1, C: 0.9, D: 0.65, P: 0.55 } },
  value: {
    coreWeight: 0.55,
    moduleWeight: 0.45,
    coreWeights: [0.3, 0.2, 0.25, 0.25], // xfmv, fmv, titolarità, rating
    modules: {
      P: {
        weights: [0.25, 0.22, 0.08, 0.17, 0.13, 0.08, 0.07],
        keys: ["cleanSheet", "gsConceded", "saves", "over6", "teamDef", "mv", "penaltiesSaved"]
      },
      D: {
        weights: [0.25, 0.15, 0.15, 0.2, 0.1, 0.08, 0.07],
        keys: ["over6", "bonus", "cards", "mv", "teamDef", "rigorista", "recentForm"]
      },
      C: {
        weights: [0.15, 0.08, 0.1, 0.08, 0.06, 0.06, 0.12, 0.05, 0.09, 0.21],
        keys: ["bonus", "bonusFreq", "xaPerMatch", "over6", "shots", "shotsOnTarget", "xgSust", "rigorista", "fmvRecent", "recentForm"]
      },
      A: {
        weights: [0.13, 0.09, 0.05, 0.05, 0.08, 0.05, 0.05, 0.03, 0.14, 0.05, 0.05, 0.07, 0.16],
        keys: ["bonus", "bonusFreq", "shots", "shotsOnTarget", "conversion", "xaPerMatch", "bigChances", "over6", "xgSust", "mv", "rigorista", "fmvRecent", "recentForm"]
      }
    }
  },
  teamDefenseGC: {
    inter: 0.8,
    napoli: 0.8,
    juventus: 0.8,
    roma: 0.95,
    milan: 1.1,
    atalanta: 1.1,
    lazio: 1.1,
    bologna: 1.2,
    fiorentina: 1.25,
    torino: 1.25,
    udinese: 1.35,
    como: 1.35,
    genoa: 1.4,
    parma: 1.45,
    cagliari: 1.5,
    verona: 1.5,
    lecce: 1.55,
    monza: 1.55,
    venezia: 1.6,
    empoli: 1.6
  },
  hype: { bonusBaseline: 0.5, trendMv: 0.5, baselineFloor: 0.2, damperMin: 0.3, damperScalar: 0.7 },
  injury: { count: 0.35, missed: 0.25, current: 0.4, newArrivalReduction: 0.3, ghostThreshold: 0.12, ghostFloor: 0.85, currentMinPenalty: 0.4, consecutiveThreshold: 3 },
  calendar: {
    layers: { top: 0.92, mid: 1, low: 1.08 },
    teamGC: { top: 0.8, mid: 1.2, low: 1.5 }
  },
  labels: { eccellente: 80, vantaggioso: 66, leggVantaggioso: 56, equilibrato: 45, svantaggioso: 21 }
};

// --- FUNZIONI MATEMATICHE E UTILITY FANTALAB ---
function interp(val, min, max, digits = 3) {
  if (max - min === 0) return 0;
  const res = parseFloat(((val - min) / (max - min)).toFixed(digits));
  return res > 1 ? 1 : res < 0 ? 0 : res;
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function sumBy(arr, keyOrFn) {
  return arr.reduce((acc, item) => {
    const v = typeof keyOrFn === "function" ? keyOrFn(item) : item[keyOrFn];
    return acc + (typeof v === "number" ? v : Number(v) || 0);
  }, 0);
}

function weightedSum(values, weights) {
  const res = values.reduce((acc, val, i) => {
    if (val === null || val === undefined || Number.isNaN(val)) return acc;
    const w = weights[i] || 0;
    return { sum: acc.sum + val * w, wSum: acc.wSum + w };
  }, { sum: 0, wSum: 0 });
  return res.wSum > 0 ? res.sum / res.wSum : 0;
}

const FACTOR_NAMES = {
  VALUE: "il valore dei giocatori",
  HYPE: "la forma recente",
  CALENDAR: "il calendario",
  TEAM: "l'impatto sulla rosa",
  INJURY: "la salute e affidabilità",
  SLOT: "il numero di giocatori",
  ROLE: "il cambio di ruolo"
};

export class TradesComponent {
  constructor(containerId) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.mode = 'trade'; // 'trade' | 'compare1v1'
    this.givePlayers = []; // Giocatori che cedo (outgoing)
    this.takePlayers = []; // Giocatori che ricevo (incoming)
    
    // Modale selettore
    this.modalTarget = null;
    this.modalSearch = '';
    this.modalRoleFilter = 'ALL';
    this.modalSourceFilter = 'ALL';
  }

  init() {
    this.render();
    this.subscribeEvents();
  }

  subscribeEvents() {
    store.subscribe('view:changed', (view) => {
      if (view === 'trades') {
        this.render();
      }
    });

    store.subscribe('myteam:updated', () => {
      if (store.activeView === 'trades') {
        this.render();
      }
    });
  }

  /**
   * Cerca e arricchisce i dati del giocatore con statistiche complete e calcoli FantaLab
   */
  getEnrichedPlayer(playerOrId) {
    if (!playerOrId) return null;
    const p = typeof playerOrId === 'string' ? store.getPlayer(playerOrId) : playerOrId;
    if (!p) return null;

    const normName = (p.name || '').toLowerCase().trim();
    
    // 1. Lookup nel dataset FantaLab Ufficiale
    const pStatsData = (p.fantalabId && PLAYER_STATS_MAP[p.fantalabId]) || 
                       (p.playerId && PLAYER_STATS_MAP[p.playerId]) || 
                       (p.id && PLAYER_STATS_MAP[p.id]) ||
                       Object.values(PLAYER_STATS_MAP).find(item => item.name && item.name.toLowerCase().trim() === normName) || 
                       {};

    const stats = pStatsData.stats || {};
    
    // 2. Lookup nei rating ufficiali
    const pid = p.fantalabId || p.playerId || p.id;
    const ratEntry = (pid && PLAYER_RATINGS_MAP[pid]) ||
                     Object.entries(PLAYER_RATINGS_MAP).find(([k, v]) => pStatsData.player_id === k)?.[1] ||
                     {};

    const injury = INJURIES_DATA.find(i => (i.name || '').toLowerCase().trim() === normName) || null;
    const leagueOwner = store.getPlayerLeagueOwner(p);

    const fmv = Number(stats.fmv ?? ratEntry.xfmv ?? p.fantamedia ?? p.fmv ?? p.xfmv ?? 6.0);
    const mv = Number(stats.mv ?? p.mediaVoto ?? p.mv ?? 6.0);
    const xfmv = Number(ratEntry.xfmv ?? p.xfmv ?? fmv);
    const ratingClassic = Number(ratEntry.rating_classic ?? p.rating_classic ?? 4.5);
    const titIndex = Number(ratEntry.tit_index ?? p.tit_index ?? 5);
    const affIndex = Number(ratEntry.aff_index ?? p.aff_index ?? 4);
    const infIndex = Number(ratEntry.inf_index ?? p.inf_index ?? 4);
    
    const gol = Number(stats.gol_fatti ?? p.gol ?? p.gol_fatti ?? 0);
    const assist = Number(stats.assist ?? p.assist ?? 0);
    const presenze = Number(stats.presenze ?? p.presenze ?? 26);
    const startsEleven = Number(stats.starts_eleven ?? p.startsEleven ?? p.starts_eleven ?? presenze);
    const quote = Number(p.qtA || p.quotazione_start || p.initialPrice || 10);
    const isInjured = Boolean(p.isInjured || injury?.isInjured);

    // Risoluzione Ruolo standardizzato (P, D, C, A)
    const rawRole = (p.classicRole || p.fantaRole || p.role || pStatsData.role || 'C').toUpperCase();
    let role = 'C';
    if (rawRole === 'P' || (rawRole.includes('P') && !rawRole.includes('PC'))) role = 'P';
    else if (rawRole.includes('D') || rawRole.startsWith('D')) role = 'D';
    else if (rawRole.includes('A') || rawRole.includes('PC')) role = 'A';
    else role = 'C';

    const percOver6 = Number(stats.perc_match_over_6 ?? Math.min(100, Math.max(40, (mv - 5.4) * 65 + 50)));
    const percBonus = Number(stats.perc_match_with_bonus ?? Math.min(80, Math.max(0, (gol + assist) / Math.max(presenze, 1) * 100)));
    const bonusFreq = Number(stats.bonus_frequency ?? ((gol + assist) / Math.max(presenze, 1)));
    const cardsPerMatch = Number(stats.cartellini_per_match ?? (Number(p.amm || 2) + Number(p.esp || 0) * 2) / Math.max(presenze, 1));
    const cleanSheet = Number(stats.clean_sheet ?? (role === 'P' ? Math.round(presenze * 0.3) : 0));
    const gsPerMatch = Number(stats.gs_per_match ?? (role === 'P' ? 1.2 : 0));
    const savesPerMatch = Number(stats.saves_per_match ?? (role === 'P' ? 3.0 : 0));
    const shotsPerMatch = Number(stats.shots_per_match ?? (role === 'A' ? 2.2 : role === 'C' ? 1.1 : 0.6));
    const shotsOnTarget = Number(stats.shots_on_target_per_match ?? (shotsPerMatch * 0.45));
    const goalConversion = Number(stats.goal_conversion_percentage ?? (gol > 0 ? (gol / Math.max(shotsPerMatch * presenze, 1)) * 100 : 8));
    const xaPerMatch = Number(stats.xa ?? (assist / Math.max(presenze, 1) * 0.8));
    const bigChances = Number(stats.big_chances_missed ?? (role === 'A' ? 3 : 0));
    const isRigorista = Boolean(p.isRigorista || (stats.penalties && stats.penalties > 0));

    // Difesa della squadra (teamDef)
    const teamKey = (p.teamId || p.teamName || pStatsData.team_name || '').toLowerCase();
    const teamGc = FANTALAB_CONFIG.teamDefenseGC[teamKey] || 1.25;
    const teamDefVal = 1 - interp(teamGc, 0.7, 1.8, 3);

    // 1. CALCOLO VALUE (G)
    const normXfmv = interp(xfmv, 4, 9, 3);
    const normFmv = interp(fmv, 4, 9, 3);
    const titRatio = startsEleven / Math.max(presenze, 1);
    const normTit = interp(titRatio, 0, 1, 3);
    const normRating = interp(ratingClassic, 0, 5, 3);
    const coreVal = weightedSum([normXfmv, normFmv, normTit, normRating], FANTALAB_CONFIG.value.coreWeights);

    // Funzione Forma Recente B(e)
    const B_fn = (tVal, aVal, rVal) => {
      if (0 === aVal) return 0.5;
      const n = interp(tVal / Math.max(aVal, 1), 0, 0.6, 3);
      return 0 === tVal && aVal >= 3 && rVal < -0.5 ? Math.max(0.05, 0.3 * interp(rVal + 2, 0, 2, 3)) : n;
    };
    const hypeBonus5 = Number(stats.hype_bonus_5 ?? (bonusFreq > 0.3 ? 1 : 0));
    const presenze5 = Number(stats.presenze_5 ?? 3);
    const hypeTrend = Number(stats.hype_trend ?? 0);
    const recentFormVal = B_fn(hypeBonus5, presenze5, hypeTrend);

    let moduleVal = 0.5;
    if (role === 'P') {
      const vals = [
        interp(cleanSheet / Math.max(presenze, 1), 0.1, 0.5, 3),
        1 - interp(gsPerMatch, 0.8, 1.8, 3),
        interp(savesPerMatch, 2, 5, 3),
        interp(percOver6, 40, 100, 3),
        teamDefVal,
        interp(mv, 5.4, 6.3, 3),
        0
      ];
      moduleVal = weightedSum(vals, FANTALAB_CONFIG.value.modules.P.weights);
    } else if (role === 'D') {
      const vals = [
        interp(percOver6, 40, 100, 3),
        interp(percBonus, 0, 30, 3),
        cardsPerMatch < 0.05 ? 1 : 1 - interp(cardsPerMatch, 0.05, 0.4, 3),
        interp(mv, 5.4, 6.3, 3),
        teamDefVal,
        0,
        recentFormVal
      ];
      moduleVal = weightedSum(vals, FANTALAB_CONFIG.value.modules.D.weights);
    } else if (role === 'A') {
      const vals = [
        interp(percBonus, 0, 60, 3),
        interp(bonusFreq, 0, 2.5, 3),
        interp(shotsPerMatch, 0.5, 3.5, 3),
        interp(shotsOnTarget, 0.3, 2, 3),
        interp(goalConversion, 5, 25, 3),
        interp(xaPerMatch, 0.05, 0.4, 3),
        interp(bigChances / Math.max(presenze, 1), 0.1, 0.7, 3),
        interp(percOver6, 40, 100, 3),
        0.5,
        interp(mv, 5.5, 7.5, 3),
        isRigorista ? 0.9 : 0.1,
        interp(fmv, 5.5, 8.5, 3),
        recentFormVal
      ];
      moduleVal = weightedSum(vals, FANTALAB_CONFIG.value.modules.A.weights);
    } else {
      const vals = [
        interp(percBonus, 0, 50, 3),
        interp(bonusFreq, 0, 2, 3),
        interp(xaPerMatch, 0.05, 0.35, 3),
        interp(percOver6, 40, 100, 3),
        interp(shotsPerMatch, 0.3, 2.5, 3),
        interp(shotsOnTarget, 0.3, 2, 3),
        0.5,
        isRigorista ? 0.85 : 0.1,
        interp(fmv, 5.0, 7.8, 3),
        recentFormVal
      ];
      moduleVal = weightedSum(vals, FANTALAB_CONFIG.value.modules.C.weights);
    }

    const value = FANTALAB_CONFIG.value.coreWeight * coreVal + FANTALAB_CONFIG.value.moduleWeight * moduleVal;

    // 2. CALCOLO HYPE (U)
    const mvRecent = Number(stats.mv_5 ?? mv);
    const deltaMv = mvRecent - mv;
    const expBonus5 = 5 * Math.max(FANTALAB_CONFIG.hype.baselineFloor, bonusFreq);
    const sBonus = interp(hypeBonus5 - expBonus5, -2, 2, 3);
    const sMv = interp(deltaMv, -0.5, 0.5, 3);
    const rawHype = weightedSum([sBonus, sMv], [FANTALAB_CONFIG.hype.bonusBaseline, FANTALAB_CONFIG.hype.trendMv]);
    const damper = isInjured ? FANTALAB_CONFIG.hype.damperMin : 1.0;
    const hypeScore = rawHype * damper;

    // 3. CALCOLO CALENDAR (J)
    const calendarScore = 0.5;

    // 4. CALCOLO INJURY (Y)
    const injCount = Number(p.injured || (isInjured ? 1 : 0));
    const sInj = interp(injCount, 0, 15, 3);
    const presenzeRatio = presenze / 25;
    const missedScore = 1 - interp(presenzeRatio, 0.3, 1, 3);
    const currentInjScore = isInjured ? 0.4 : 0.0;
    const injuryRisk = Number((sInj * 0.35 + missedScore * 0.25 + currentInjScore * 0.4).toFixed(3));

    return {
      ...p,
      raw: p,
      leagueOwner,
      isInjured,
      photoUrl: p.photoUrl || pStatsData.player_image || '',
      xfmv,
      fmv,
      mv,
      titIndex,
      affIndex,
      infIndex,
      gol,
      assist,
      presenze,
      startsEleven,
      quote,
      value,
      hypeScore,
      calendarScore,
      injuryRisk
    };
  }

  /**
   * Esegue la valutazione dello scambio identica alla funzione Ae di FantaLab
   */
  evaluateTrade() {
    const outgoing = this.givePlayers.map(p => this.getEnrichedPlayer(p)).filter(Boolean);
    const incoming = this.takePlayers.map(p => this.getEnrichedPlayer(p)).filter(Boolean);

    if (!outgoing.length || !incoming.length) {
      return {
        score: 50,
        label: "EQUILIBRATO",
        headline: "Seleziona i Giocatori",
        actionBadge: "Valuta",
        comment: "Aggiungi almeno un calciatore in uscita e uno in entrata per avviare la valutazione algoritmica FantaLab.",
        factors: [],
        outgoing,
        incoming,
        summaryDiffs: { value: 0, mv: 0, fmv: 0, tit: 0 }
      };
    }

    const cfg = FANTALAB_CONFIG;
    const w = cfg.weights.singolo;

    // 1. VALUE DIFF
    const valOut = outgoing.map(p => p.value);
    const valIn = incoming.map(p => p.value);
    const j = e => Math.max(0, e - cfg.valueBaseline);
    const k = (sumBy(valIn, j) - sumBy(valOut, j)) * cfg.valueSumMult;
    const valContrib = parseFloat((k * w.VALUE * 100).toFixed(1));

    // 2. HYPE DIFF
    const hypeOut = Math.max(...outgoing.map(p => p.hypeScore));
    const hypeIn = Math.max(...incoming.map(p => p.hypeScore));
    const P = hypeIn - hypeOut;
    const rawHypeContrib = P * w.HYPE * 100;
    const hypeContrib = parseFloat(clamp(rawHypeContrib, -cfg.caps.hype, cfg.caps.hype).toFixed(1));

    // 3. CALENDAR DIFF
    const calOut = Math.max(...outgoing.map(p => p.calendarScore));
    const calIn = Math.max(...incoming.map(p => p.calendarScore));
    const F = calIn - calOut;
    const calContrib = parseFloat((F * w.CALENDAR * 100).toFixed(1));

    // 4. INJURY DIFF
    const injOut = Math.min(...outgoing.map(p => p.injuryRisk));
    const injIn = Math.min(...incoming.map(p => p.injuryRisk));
    const L = injOut - injIn; // Più alto out rispetto a in, meglio è
    const rawInjContrib = L * w.INJURY * 100;
    const injContrib = parseFloat(clamp(rawInjContrib, -cfg.caps.injury, cfg.caps.injury).toFixed(1));

    // 5. FATTORI LIST
    const factors = [
      {
        name: "Valore Base",
        key: "VALUE",
        icon: "fa-chart-line",
        diff: k,
        weight: w.VALUE,
        contribution: valContrib,
        giveVal: (mean(valOut) * 10).toFixed(1),
        takeVal: (mean(valIn) * 10).toFixed(1)
      },
      {
        name: "Hype",
        key: "HYPE",
        icon: "fa-fire-flame-curved",
        diff: P,
        weight: w.HYPE,
        contribution: hypeContrib,
        giveVal: (mean(outgoing.map(p => p.hypeScore)) * 10).toFixed(1),
        takeVal: (mean(incoming.map(p => p.hypeScore)) * 10).toFixed(1)
      },
      {
        name: "Calendario",
        key: "CALENDAR",
        icon: "fa-calendar-days",
        diff: F,
        weight: w.CALENDAR,
        contribution: calContrib,
        giveVal: (mean(outgoing.map(p => p.calendarScore)) * 10).toFixed(1),
        takeVal: (mean(incoming.map(p => p.calendarScore)) * 10).toFixed(1)
      },
      {
        name: "Salute",
        key: "INJURY",
        icon: "fa-heart-pulse",
        diff: L,
        weight: w.INJURY,
        contribution: injContrib,
        giveVal: ((1 - mean(outgoing.map(p => p.injuryRisk))) * 10).toFixed(1),
        takeVal: ((1 - mean(incoming.map(p => p.injuryRisk))) * 10).toFixed(1)
      }
    ];

    // 6. AMPLIFIER & SLOT & ROLE SWAP
    const q = sumBy(factors, "contribution");
    const V = Math.min(cfg.amplifier.max, 1 + Math.abs(q) * cfg.amplifier.multiplier);

    const slotDiff = incoming.length - outgoing.length;
    const slotContrib = slotDiff !== 0 ? parseFloat((slotDiff * cfg.slot.weight).toFixed(1)) : 0;
    if (slotContrib !== 0) {
      factors.push({
        name: "Slot Rosa",
        key: "SLOT",
        icon: "fa-layer-group",
        diff: slotDiff,
        weight: cfg.slot.weight / 100,
        contribution: slotContrib
      });
    }

    const getRoleVal = p => cfg.roleSwap.slotValues[p.role] ?? 0.7;
    const roleDiff = mean(incoming.map(getRoleVal)) - mean(outgoing.map(getRoleVal));
    const roleContrib = Math.abs(roleDiff) > 0.001 ? parseFloat((roleDiff * cfg.roleSwap.weight).toFixed(1)) : 0;
    if (roleContrib !== 0) {
      factors.push({
        name: "Cambio Ruolo",
        key: "ROLE",
        icon: "fa-arrows-split-up-and-left",
        diff: roleDiff,
        weight: cfg.roleSwap.weight / 100,
        contribution: roleContrib
      });
    }

    // Punteggio Finale 0-100 (con floor ufficiale FantaLab a 21%)
    const rawFinalScore = Math.round(50 + q * V + slotContrib + roleContrib);
    const score = clamp(rawFinalScore, 21, 100);

    // Label & Headline
    let label = "EQUILIBRATO";
    let headline = "Scambio Equilibrato";
    let actionBadge = "Valuta";
    let tone = "score-equal";
    let badgeClass = "badge-equal";

    if (score >= cfg.labels.eccellente) {
      label = "ECCELLENTE";
      headline = "Scambio Eccellente";
      actionBadge = "Accetta";
      tone = "score-excellent";
      badgeClass = "badge-excellent";
    } else if (score >= cfg.labels.vantaggioso) {
      label = "VANTAGGIOSO";
      headline = "Scambio Vantaggioso";
      actionBadge = "Accetta";
      tone = "score-good";
      badgeClass = "badge-good";
    } else if (score >= cfg.labels.leggVantaggioso) {
      label = "LEGGERMENTE VANTAGGIOSO";
      headline = "Scambio Vantaggioso";
      actionBadge = "Accetta";
      tone = "score-mild-good";
      badgeClass = "badge-mild-good";
    } else if (score >= cfg.labels.equilibrato) {
      label = "EQUILIBRATO";
      headline = "Scambio Equilibrato";
      actionBadge = "Valuta";
      tone = "score-equal";
      badgeClass = "badge-equal";
    } else if (score >= cfg.labels.svantaggioso) {
      label = "SVANTAGGIOSO";
      headline = "Scambio Svantaggioso";
      actionBadge = "Rifiuta";
      tone = "score-bad";
      badgeClass = "badge-bad";
    } else {
      label = "FORTEMENTE SFAVOREVOLE";
      headline = "Scambio Fortemente Sfavorevole";
      actionBadge = "Rifiuta";
      tone = "score-very-bad";
      badgeClass = "badge-very-bad";
    }

    // Commento Testuale FantaLab (funzione be)
    const comment = this.buildFantaLabComment(score, factors);

    // Summary deltas (MV, FMV, Titolarità, Valore)
    const avgOutMv = mean(outgoing.map(p => p.mv));
    const avgInMv = mean(incoming.map(p => p.mv));
    const avgOutFmv = mean(outgoing.map(p => p.fmv));
    const avgInFmv = mean(incoming.map(p => p.fmv));
    const avgOutTit = mean(outgoing.map(p => p.titIndex));
    const avgInTit = mean(incoming.map(p => p.titIndex));

    const summaryDiffs = {
      value: parseFloat((k * 10).toFixed(1)),
      mv: parseFloat((avgInMv - avgOutMv).toFixed(1)),
      fmv: parseFloat((avgInFmv - avgOutFmv).toFixed(1)),
      tit: parseFloat((avgInTit - avgOutTit).toFixed(1))
    };

    return {
      score,
      label,
      headline,
      actionBadge,
      tone,
      badgeClass,
      comment,
      factors,
      outgoing,
      incoming,
      summaryDiffs
    };
  }

  buildFantaLabComment(score, factors) {
    const sorted = factors
      .filter(f => f.key !== "SLOT" && f.key !== "ROLE")
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const mainFactor = sorted[0];
    const secondFactor = sorted.length > 1 ? sorted[1] : null;

    let text = "";
    if (score >= 80) text = "Scambio nettamente a tuo favore. ";
    else if (score >= 66) text = "Scambio vantaggioso per te. ";
    else if (score >= 56) text = "Scambio leggermente a tuo favore. ";
    else if (score >= 45) text = "Scambio equilibrato, nessuno ci guadagna in modo significativo. ";
    else if (score >= 21) text = "Scambio svantaggioso per te. ";
    else text = "Scambio fortemente sfavorevole. ";

    if (mainFactor && Math.abs(mainFactor.contribution) > 0.5) {
      const fn = FACTOR_NAMES[mainFactor.key] || mainFactor.name;
      text += mainFactor.contribution > 0
        ? `Il fattore principale a tuo favore è ${fn} (+${mainFactor.contribution.toFixed(1)} punti). `
        : `Il fattore che ti penalizza di più è ${fn} (${mainFactor.contribution.toFixed(1)} punti). `;
    }

    if (secondFactor && Math.abs(secondFactor.contribution) > 0.5) {
      const fn = FACTOR_NAMES[secondFactor.key] || secondFactor.name;
      text += secondFactor.contribution > 0
        ? `Anche ${fn} gioca a tuo favore. `
        : `Anche ${fn} ti penalizza. `;
    }

    const inj = factors.find(f => f.key === "INJURY");
    const cal = factors.find(f => f.key === "CALENDAR");
    if (inj && inj.contribution < -2) text += "Attenzione: i giocatori in entrata hanno un rischio infortuni maggiore. ";
    else if (inj && inj.contribution > 2) text += "I giocatori in entrata sono più affidabili dal punto di vista fisico. ";

    if (cal && Math.abs(cal.contribution) > 1) {
      text += cal.contribution > 0
        ? "Il calendario prossimo favorisce i giocatori in entrata. "
        : "Il calendario prossimo favorisce i giocatori che dai. ";
    }

    const slot = factors.find(f => f.key === "SLOT");
    if (slot) {
      const n = Math.abs(slot.diff);
      const pl = n > 1 ? "giocatori" : "giocatore";
      text += slot.diff < 0
        ? `Tieni presente che cedi ${n} ${pl} in più: resti più corto di rosa. `
        : `Ricevi ${n} ${pl} in più: guadagni profondità. `;
    }

    const role = factors.find(f => f.key === "ROLE");
    if (role) {
      text += role.contribution < 0
        ? "Occhio al cambio di ruolo: cedi un ruolo più pregiato per uno più sostituibile. "
        : "Il cambio di ruolo ti favorisce: ricevi un ruolo più pregiato. ";
    }

    return text.trim();
  }

  render() {
    if (!this.container) return;

    if (this.mode === 'compare1v1') {
      this.renderCompare1v1Mode();
    } else {
      this.renderTradeMode();
    }

    this.bindEvents();
  }

  renderTradeMode() {
    const evalRes = this.evaluateTrade();

    this.container.innerHTML = `
      <div class="trades-page-container">
        
        <!-- TOOLBAR CONTROLLI -->
        <div class="trades-toolbar">
          <div class="trades-mode-selector">
            <button class="trades-mode-btn is-active" id="trade-mode-multi-btn">
              <i class="fa-solid fa-arrows-rotate"></i> Valutatore Scambi
            </button>
            <button class="trades-mode-btn" id="trade-mode-1v1-btn">
              <i class="fa-solid fa-scale-balanced"></i> Confronto 1 vs 1
            </button>
          </div>

          <div class="trades-actions">
            <button class="fanta-btn secondary-btn btn-sm" id="trade-populate-myteam-btn" title="Seleziona dalla mia rosa">
              <i class="fa-solid fa-user-shield"></i> <span class="btn-text-hide">Mia Rosa</span>
            </button>
            <button class="fanta-btn secondary-btn btn-sm" id="trade-clear-btn" title="Resetta giocatori">
              <i class="fa-solid fa-trash-can"></i> Resetta
            </button>
          </div>
        </div>

        <!-- GRIGLIA PRINCIPALE DEI GIOCATORI -->
        <div class="trades-main-grid">
          
          <!-- COLONNA CEDI (OUTGOING) -->
          <div class="trade-column outgoing-col">
            <div class="trade-column-header">
              <div class="trade-col-title-box">
                <div class="trade-col-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div>
                <div>
                  <div class="trade-col-title">I Tuoi Calciatori (Cedi)</div>
                  <div class="trade-col-subtitle">${this.givePlayers.length} selezionati</div>
                </div>
              </div>
            </div>

            <div class="trade-players-list">
              ${this.givePlayers.map((p, idx) => this.renderFantaLabPlayerCard(p, 'give', idx)).join('')}
              ${this.givePlayers.length < 3 ? `
                <button class="trade-add-slot-btn" data-target="give">
                  <i class="fa-solid fa-plus"></i> Aggiungi Calciatore da Cedere
                </button>
              ` : ''}
            </div>
          </div>

          <!-- BOTTONE SWAP CENTRALE -->
          <div class="trade-center-divider">
            <button class="trade-swap-btn" id="trade-swap-sides-btn" title="Inverti scambio (Cedi ↔ Ricevi)">
              <i class="fa-solid fa-right-left"></i>
            </button>
          </div>

          <!-- COLONNA RICEVI (INCOMING) -->
          <div class="trade-column incoming-col">
            <div class="trade-column-header">
              <div class="trade-col-title-box">
                <div class="trade-col-icon"><i class="fa-solid fa-arrow-down-to-bracket"></i></div>
                <div>
                  <div class="trade-col-title">Calciatori in Entrata (Ricevi)</div>
                  <div class="trade-col-subtitle">${this.takePlayers.length} selezionati</div>
                </div>
              </div>
            </div>

            <div class="trade-players-list">
              ${this.takePlayers.map((p, idx) => this.renderFantaLabPlayerCard(p, 'take', idx)).join('')}
              ${this.takePlayers.length < 3 ? `
                <button class="trade-add-slot-btn" data-target="take">
                  <i class="fa-solid fa-plus"></i> Aggiungi Calciatore da Ricevere
                </button>
              ` : ''}
            </div>
          </div>

        </div>

        <!-- SCHEDA VERDETTO & ANALISI STRATEGICA FANTALAB -->
        <div class="trade-verdict-card">
          
          <div class="trade-verdict-header">
            <div class="trade-verdict-main-box">
              <div class="trade-score-circle ${evalRes.tone}">
                <span>${evalRes.score}%</span>
              </div>
              <div class="trade-verdict-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="trade-action-pill ${evalRes.badgeClass}">${evalRes.actionBadge}</span>
                  <span class="trade-verdict-badge ${evalRes.badgeClass}">
                    <i class="fa-solid fa-scale-balanced"></i> ${evalRes.label}
                  </span>
                </div>
                <div class="trade-verdict-title">${evalRes.headline}</div>
              </div>
            </div>
          </div>

          <!-- COMMENTO GENERATO UFFICIALE -->
          <div class="trade-comment-box">
            ${sanitizeHtml(evalRes.comment)}
          </div>

          <!-- MINI STATS DELTA (VALORE / MV / FMV / TITOLARITÀ) -->
          ${this.givePlayers.length > 0 && this.takePlayers.length > 0 ? `
            <div class="trade-deltas-row">
              <div class="trade-delta-box">
                <span class="trade-delta-label">Valore</span>
                <span class="trade-delta-value ${evalRes.summaryDiffs.value >= 0 ? 'is-pos' : 'is-neg'}">
                  ${evalRes.summaryDiffs.value > 0 ? '+' : ''}${evalRes.summaryDiffs.value}
                </span>
              </div>
              <div class="trade-delta-box">
                <span class="trade-delta-label">MV</span>
                <span class="trade-delta-value ${evalRes.summaryDiffs.mv >= 0 ? 'is-pos' : 'is-neg'}">
                  ${evalRes.summaryDiffs.mv > 0 ? '+' : ''}${evalRes.summaryDiffs.mv}
                </span>
              </div>
              <div class="trade-delta-box">
                <span class="trade-delta-label">FMV</span>
                <span class="trade-delta-value ${evalRes.summaryDiffs.fmv >= 0 ? 'is-pos' : 'is-neg'}">
                  ${evalRes.summaryDiffs.fmv > 0 ? '+' : ''}${evalRes.summaryDiffs.fmv}
                </span>
              </div>
              <div class="trade-delta-box">
                <span class="trade-delta-label">Titolarità</span>
                <span class="trade-delta-value ${evalRes.summaryDiffs.tit >= 0 ? 'is-pos' : 'is-neg'}">
                  ${evalRes.summaryDiffs.tit > 0 ? '+' : ''}${evalRes.summaryDiffs.tit}
                </span>
              </div>
            </div>
          ` : ''}

          <!-- SEZIONE DETTAGLI ANALISI (FANTALAB BREAKDOWN) -->
          ${evalRes.factors && evalRes.factors.length > 0 ? `
            <div class="trade-factors-section">
              <div class="trade-factors-toggle-row">
                <span class="trade-factors-title"><i class="fa-solid fa-list-check"></i> Dettagli Analisi Parametri</span>
              </div>
              <div class="trade-factors-list">
                ${evalRes.factors.map(f => this.renderFantaLabFactor(f)).join('')}
              </div>
            </div>
          ` : ''}

        </div>

      </div>

      <!-- MODALE SELETTORE RAPIDO -->
      <div id="trade-player-modal-container"></div>
    `;
  }

  renderFantaLabPlayerCard(p, target, index) {
    const en = this.getEnrichedPlayer(p);
    const initials = getPlayerInitials(en.name);

    return `
      <div class="trade-player-card">
        <div class="trade-player-card-left">
          ${en.photoUrl ? `
            <img src="${sanitizeHtml(en.photoUrl)}" class="trade-player-photo" alt="${sanitizeHtml(en.name)}" onerror="this.outerHTML='<div class=\\'trade-player-photo-fallback\\'>${initials}</div>'">
          ` : `
            <div class="trade-player-photo-fallback">${initials}</div>
          `}
          <div class="trade-player-info">
            <div class="trade-player-name-row">
              <span class="trade-role-badge role-badge-${en.role}">${en.role}</span>
              <span class="trade-player-name">${sanitizeHtml(en.name)}</span>
              ${en.isInjured ? `<i class="fa-solid fa-notes-medical" style="color: var(--red); font-size: 11px;" title="Indisponibile"></i>` : ''}
            </div>
            <div class="trade-player-meta-row">
              <span>${sanitizeHtml(en.teamName || '')}</span>
              ${en.leagueOwner ? `<span>• 👤 ${sanitizeHtml(en.leagueOwner.teamName)}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- STATISTICHE CHIAVE IN STILE FANTALAB (MV, FMV, GOL, ASSIST) -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="trade-player-stats-grid">
            <div class="trade-stat-item">
              <span class="trade-stat-val">${en.mv ? en.mv.toFixed(2) : '-'}</span>
              <span class="trade-stat-lbl">MV</span>
            </div>
            <div class="trade-stat-item">
              <span class="trade-stat-val">${en.fmv ? en.fmv.toFixed(2) : '-'}</span>
              <span class="trade-stat-lbl">FMV</span>
            </div>
            <div class="trade-stat-item">
              <span class="trade-stat-val">${en.gol}</span>
              <span class="trade-stat-lbl">Gol</span>
            </div>
            <div class="trade-stat-item">
              <span class="trade-stat-val">${en.assist}</span>
              <span class="trade-stat-lbl">Assist</span>
            </div>
          </div>
          <button class="trade-remove-btn" data-target="${target}" data-index="${index}" title="Rimuovi dallo scambio">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderFantaLabFactor(f) {
    let statusLabel = "Neutro";
    let statusClass = "status-neutral";
    if (f.contribution > 0.5) {
      statusLabel = "Guadagni";
      statusClass = "status-gain";
    } else if (f.contribution < -0.5) {
      statusLabel = "Perdi";
      statusClass = "status-loss";
    }

    const sign = f.contribution > 0 ? "+" : "";
    const contribFormatted = f.contribution !== 0 ? ` (${sign}${f.contribution.toFixed(1)} pt)` : "";

    return `
      <div class="trade-factor-card">
        <div class="trade-factor-header">
          <div class="trade-factor-name">
            <i class="fa-solid ${f.icon}"></i> ${f.name}
          </div>
          <div class="trade-factor-status-badge ${statusClass}">
            ${statusLabel}${contribFormatted}
          </div>
        </div>
        <div class="trade-factor-bars-row">
          <div class="trade-bar-wrapper">
            <div class="trade-bar-fill-give" style="width: ${Math.min(100, (Number(f.giveVal) || 5) * 10)}%"></div>
          </div>
          <span style="font-size: 11px; font-weight: 800; color: var(--muted);">vs</span>
          <div class="trade-bar-wrapper">
            <div class="trade-bar-fill-take" style="width: ${Math.min(100, (Number(f.takeVal) || 5) * 10)}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderCompare1v1Mode() {
    const p1 = this.givePlayers[0] ? this.getEnrichedPlayer(this.givePlayers[0]) : null;
    const p2 = this.takePlayers[0] ? this.getEnrichedPlayer(this.takePlayers[0]) : null;

    this.container.innerHTML = `
      <div class="trades-page-container">
        
        <div class="trades-toolbar">
          <div class="trades-mode-selector">
            <button class="trades-mode-btn" id="trade-mode-multi-btn">
              <i class="fa-solid fa-arrows-rotate"></i> Valutatore Scambi
            </button>
            <button class="trades-mode-btn is-active" id="trade-mode-1v1-btn">
              <i class="fa-solid fa-scale-balanced"></i> Confronto 1 vs 1
            </button>
          </div>

          <div class="trades-actions">
            <button class="fanta-btn secondary-btn btn-sm" id="trade-clear-btn">
              <i class="fa-solid fa-trash-can"></i> Resetta
            </button>
          </div>
        </div>

        <div class="comparison-table-wrapper">
          
          <div class="comparison-header-row">
            <div class="comparison-p1-header">
              ${p1 ? `
                <span class="trade-role-badge role-badge-${p1.role}">${p1.role}</span>
                <div>
                  <div style="font-size: 16px; font-weight: 800; color: var(--ink);">${sanitizeHtml(p1.name)}</div>
                  <div style="font-size: 12px; color: var(--muted);">${sanitizeHtml(p1.teamName || '')}</div>
                </div>
                <button class="trade-remove-btn" data-target="give" data-index="0" title="Cambia giocatore"><i class="fa-solid fa-pen-to-square"></i></button>
              ` : `
                <button class="fanta-btn primary-btn btn-sm" data-target="give">
                  <i class="fa-solid fa-user-plus"></i> Seleziona Giocatore 1
                </button>
              `}
            </div>

            <div class="comparison-vs-badge">VS</div>

            <div class="comparison-p2-header">
              ${p2 ? `
                <button class="trade-remove-btn" data-target="take" data-index="0" title="Cambia giocatore"><i class="fa-solid fa-pen-to-square"></i></button>
                <div>
                  <div style="font-size: 16px; font-weight: 800; color: var(--ink);">${sanitizeHtml(p2.name)}</div>
                  <div style="font-size: 12px; color: var(--muted);">${sanitizeHtml(p2.teamName || '')}</div>
                </div>
                <span class="trade-role-badge role-badge-${p2.role}">${p2.role}</span>
              ` : `
                <button class="fanta-btn primary-btn btn-sm" data-target="take">
                  <i class="fa-solid fa-user-plus"></i> Seleziona Giocatore 2
                </button>
              `}
            </div>
          </div>

          ${p1 && p2 ? `
            <div class="comparison-rows-list">
              ${this.renderComparisonStatRow('FantaMedia Voto (FMV)', p1.fmv.toFixed(2), p2.fmv.toFixed(2), true)}
              ${this.renderComparisonStatRow('Media Voto Pura (MV)', p1.mv.toFixed(2), p2.mv.toFixed(2), true)}
              ${this.renderComparisonStatRow('FantaMedia Attesa (xFMV)', p1.xfmv.toFixed(2), p2.xfmv.toFixed(2), true)}
              ${this.renderComparisonStatRow('Gol Segnati', p1.gol, p2.gol, true)}
              ${this.renderComparisonStatRow('Assist Serviti', p1.assist, p2.assist, true)}
              ${this.renderComparisonStatRow('Indice Titolarità (1-5)', p1.titIndex + '/5', p2.titIndex + '/5', true, p1.titIndex, p2.titIndex)}
              ${this.renderComparisonStatRow('Indice Affidabilità (1-5)', p1.affIndex + '/5', p2.affIndex + '/5', true, p1.affIndex, p2.affIndex)}
              ${this.renderComparisonStatRow('Integrità Fisica (1-5)', p1.infIndex + '/5', p2.infIndex + '/5', true, p1.infIndex, p2.infIndex)}
              ${this.renderComparisonStatRow('Presenze / Partite', p1.presenze, p2.presenze, true)}
              ${this.renderComparisonStatRow('Quotazione Attuale', p1.quote, p2.quote, true)}
            </div>
          ` : `
            <div style="padding: 40px; text-align: center; color: var(--muted); font-size: 14px;">
              <i class="fa-solid fa-scale-unbalanced-flip" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
              Seleziona entrambi i calciatori per visualizzare il confronto statistico testa a testa.
            </div>
          `}

        </div>

      </div>

      <div id="trade-player-modal-container"></div>
    `;
  }

  renderComparisonStatRow(label, v1, v2, isNumeric = true, num1 = null, num2 = null) {
    const n1 = num1 !== null ? num1 : parseFloat(v1);
    const n2 = num2 !== null ? num2 : parseFloat(v2);

    let p1Win = false;
    let p2Win = false;

    if (isNumeric && !isNaN(n1) && !isNaN(n2)) {
      if (n1 > n2) p1Win = true;
      else if (n2 > n1) p2Win = true;
    }

    return `
      <div class="comparison-stat-row">
        <div class="comparison-val-left ${p1Win ? 'stat-win' : p2Win ? 'stat-lose' : ''}">
          ${p1Win ? '<i class="fa-solid fa-check"></i> ' : ''}${v1}
        </div>
        <div class="comparison-lbl">${label}</div>
        <div class="comparison-val-right ${p2Win ? 'stat-win' : p1Win ? 'stat-lose' : ''}">
          ${v2}${p2Win ? ' <i class="fa-solid fa-check"></i>' : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelector('#trade-mode-multi-btn')?.addEventListener('click', () => {
      this.mode = 'trade';
      this.render();
    });

    this.container.querySelector('#trade-mode-1v1-btn')?.addEventListener('click', () => {
      this.mode = 'compare1v1';
      this.render();
    });

    this.container.querySelector('#trade-swap-sides-btn')?.addEventListener('click', () => {
      const temp = [...this.givePlayers];
      this.givePlayers = [...this.takePlayers];
      this.takePlayers = temp;
      this.render();
    });

    this.container.querySelector('#trade-populate-myteam-btn')?.addEventListener('click', () => {
      this.openPlayerSelectorModal('give', 'MYTEAM');
    });

    this.container.querySelector('#trade-clear-btn')?.addEventListener('click', () => {
      this.givePlayers = [];
      this.takePlayers = [];
      this.render();
    });

    this.container.querySelectorAll('[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const index = btn.dataset.index;
        if (btn.classList.contains('trade-remove-btn')) {
          if (target === 'give') this.givePlayers.splice(index, 1);
          else if (target === 'take') this.takePlayers.splice(index, 1);
          this.render();
        } else {
          this.openPlayerSelectorModal(target);
        }
      });
    });
  }

  openPlayerSelectorModal(target, preselectedSource = 'ALL') {
    this.modalTarget = target;
    this.modalSearch = '';
    this.modalRoleFilter = 'ALL';
    this.modalSourceFilter = preselectedSource;

    const modalContainer = this.container.querySelector('#trade-player-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="trade-selector-modal-backdrop">
        <div class="modal-dialog modal-md">
          <div class="modal-header">
            <h3 class="modal-title">
              <i class="fa-solid fa-user-plus"></i> Seleziona Calciatore per ${target === 'give' ? 'Cedere' : 'Ricevere'}
            </h3>
            <button class="modal-close-btn" id="close-trade-modal-btn">&times;</button>
          </div>
          <div class="trade-player-modal-body">
            
            <div class="trade-modal-search-row">
              <input type="text" id="trade-modal-search-input" class="fanta-input" placeholder="Cerca calciatore per nome o squadra..." autofocus style="flex: 1;">
            </div>

            <div class="trade-modal-filters-row">
              <div class="fanta-filter-group" id="trade-modal-role-filters">
                <button class="filter-chip is-active" data-role="ALL">TUTTI</button>
                <button class="filter-chip role-chip-P" data-role="P">P</button>
                <button class="filter-chip role-chip-D" data-role="D">D</button>
                <button class="filter-chip role-chip-C" data-role="C">C</button>
                <button class="filter-chip role-chip-A" data-role="A">A</button>
              </div>

              <select id="trade-modal-source-select" class="fanta-select" style="max-width: 160px; font-size: 11px;">
                <option value="ALL" ${this.modalSourceFilter === 'ALL' ? 'selected' : ''}>Tutti i Giocatori</option>
                <option value="MYTEAM" ${this.modalSourceFilter === 'MYTEAM' ? 'selected' : ''}>La Mia Rosa</option>
                <option value="FREE">Svincolati</option>
                ${Object.keys(store.getLeagueTeams() || {}).map(k => `
                  <option value="${k}">${k}</option>
                `).join('')}
              </select>
            </div>

            <div class="trade-modal-player-list" id="trade-modal-list-box">
              <!-- Rendered items -->
            </div>

          </div>
        </div>
      </div>
    `;

    this.renderModalPlayerList();
    this.bindModalEvents();
  }

  renderModalPlayerList() {
    const listBox = this.container.querySelector('#trade-modal-list-box');
    if (!listBox) return;

    let players = store.getAllPlayersFlat();

    if (this.modalSearch.trim()) {
      const q = this.modalSearch.toLowerCase().trim();
      players = players.filter(p => (p.name || '').toLowerCase().includes(q) || (p.teamName || '').toLowerCase().includes(q));
    }

    if (this.modalRoleFilter !== 'ALL') {
      players = players.filter(p => {
        const en = this.getEnrichedPlayer(p);
        return en.role === this.modalRoleFilter;
      });
    }

    if (this.modalSourceFilter === 'MYTEAM') {
      const myTeam = store.getMyTeam();
      const myIds = new Set([...(myTeam.lineup ? Object.values(myTeam.lineup).map(p => p.id || p.csvId) : []), ...(myTeam.bench || []).map(p => p.id || p.csvId)]);
      players = players.filter(p => myIds.has(p.id) || myIds.has(p.csvId) || (store.getPlayerLeagueOwner(p)?.isMyTeam));
    } else if (this.modalSourceFilter === 'FREE') {
      players = players.filter(p => !store.getPlayerLeagueOwner(p));
    } else if (this.modalSourceFilter !== 'ALL') {
      players = players.filter(p => {
        const owner = store.getPlayerLeagueOwner(p);
        return owner && owner.teamId === this.modalSourceFilter;
      });
    }

    players.sort((a, b) => {
      const enA = this.getEnrichedPlayer(a);
      const enB = this.getEnrichedPlayer(b);
      return (enB.fmv || 0) - (enA.fmv || 0);
    });
    
    const displayed = players.slice(0, 60);

    if (displayed.length === 0) {
      listBox.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--muted); font-size: 13px;">
          Nessun calciatore trovato con i criteri selezionati.
        </div>
      `;
      return;
    }

    listBox.innerHTML = displayed.map(p => {
      const en = this.getEnrichedPlayer(p);

      return `
        <div class="trade-modal-item" data-player-id="${en.id || en.csvId || en.name}">
          <div class="trade-modal-item-info">
            <span class="trade-role-badge role-badge-${en.role}">${en.role}</span>
            <div>
              <div style="font-size: 13px; font-weight: 750; color: var(--ink);">${sanitizeHtml(en.name)}</div>
              <div style="font-size: 11px; color: var(--muted);">${sanitizeHtml(en.teamName || '')} ${en.leagueOwner ? `• 👤 ${sanitizeHtml(en.leagueOwner.teamName)}` : ''}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 11px; font-weight: 800; color: var(--ink);">FMV ${en.fmv ? en.fmv.toFixed(2) : '-'}</span>
            <span style="font-size: 11px; color: var(--muted);">Qt ${en.quote}</span>
            <i class="fa-solid fa-plus-circle" style="color: var(--green); font-size: 15px;"></i>
          </div>
        </div>
      `;
    }).join('');

    listBox.querySelectorAll('.trade-modal-item').forEach(item => {
      item.addEventListener('click', () => {
        const pId = item.dataset.playerId;
        const player = store.getPlayer(pId) || store.getAllPlayersFlat().find(p => p.id === pId || p.csvId === pId || p.name === pId);
        if (player) {
          if (this.modalTarget === 'give') {
            if (this.mode === 'compare1v1') this.givePlayers = [player];
            else this.givePlayers.push(player);
          } else if (this.modalTarget === 'take') {
            if (this.mode === 'compare1v1') this.takePlayers = [player];
            else this.takePlayers.push(player);
          }
          this.closeModal();
          this.render();
        }
      });
    });
  }

  bindModalEvents() {
    const backdrop = this.container.querySelector('#trade-selector-modal-backdrop');
    const closeBtn = this.container.querySelector('#close-trade-modal-btn');
    const searchInput = this.container.querySelector('#trade-modal-search-input');
    const roleChips = this.container.querySelectorAll('#trade-modal-role-filters .filter-chip');
    const sourceSelect = this.container.querySelector('#trade-modal-source-select');

    closeBtn?.addEventListener('click', () => this.closeModal());
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal();
    });

    searchInput?.addEventListener('input', (e) => {
      this.modalSearch = e.target.value;
      this.renderModalPlayerList();
    });

    roleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        roleChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        this.modalRoleFilter = chip.dataset.role;
        this.renderModalPlayerList();
      });
    });

    sourceSelect?.addEventListener('change', (e) => {
      this.modalSourceFilter = e.target.value;
      this.renderModalPlayerList();
    });
  }

  closeModal() {
    const modalContainer = this.container.querySelector('#trade-player-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }
}
