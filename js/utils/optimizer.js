/**
 * Algoritmo di Ottimizzazione Formazione (Lineup Optimizer - Best 11)
 * Simula tutti i moduli tattici e seleziona la migliore combinazione di titolari e panchina
 * in base a indici di schierabilità, probabilità di titolarità, infortuni e bonus.
 */

import { FORMATIONS, FORMATION_LIST } from '../data/formations.js';
import { DEPLOYABILITY_MAP } from '../data/deployabilityData.js';
import { store } from '../store.js';

export class LineupOptimizer {
  /**
   * Calcola il punteggio di schierabilità per la giornata di un calciatore
   */
  static getPlayerScore(player) {
    if (!player) return 0;

    const nameKey = (player.name || player.displayName || '').toLowerCase().trim();
    const depInfo = DEPLOYABILITY_MAP[nameKey] || {};

    // 1. Esclusione immediata se infortunato o squalificato
    if (player.isInjured || depInfo.isInjured || player.isSuspended || depInfo.isSuspended) {
      return -50;
    }

    // 2. Base score: Deployability Value (1.0 - 10.0) o fallback da fantamedia / indici
    let baseScore = depInfo.deployabilityValue;
    if (!baseScore) {
      const fm = Number(player.stats?.fantamedia || player.fantamedia || 6.0);
      const appetibilita = Number(player.appetibilita || 60);
      baseScore = Math.max(1, Math.min(10, (fm * 0.7) + (appetibilita * 0.04)));
    }

    // 3. Probabilità di titolarità (0 - 100%)
    let startProb = depInfo.startingProbability;
    if (startProb === undefined) {
      startProb = player.status === 'titolare' || player.status === 'tit_sicuro' ? 90 : 60;
    }
    const probFactor = Math.max(0.2, startProb / 100);

    // 4. Bonus piazzati / rigoristi
    let bonus = 0;
    if (player.isPenaltyTaker || player.rigorista) bonus += 0.6;
    if (player.isFreeKickTaker || player.punizioni) bonus += 0.3;
    if (player.isCornerTaker || player.corner) bonus += 0.2;

    // 5. Bonus fascia strategia
    const tierId = store.getPlayerTierId(player);
    if (tierId === 'tier_1') bonus += 0.8;
    else if (tierId === 'tier_2') bonus += 0.5;
    else if (tierId === 'tier_3') bonus += 0.2;

    return Number(((baseScore * probFactor) + bonus).toFixed(2));
  }

  /**
   * Ottimizza e schiera l'undici titolare ideale tra i giocatori disponibili
   * @param {Array} players - Array di tutti i 25 calciatori della rosa
   * @param {Object} [options] - Opzioni (es. modulo preferito, modificatore difesa)
   * @returns {Object} { formationId, lineup, bench, totalScore, details }
   */
  static optimize(players = [], options = {}) {
    if (!Array.isArray(players) || players.length === 0) {
      return null;
    }

    // Arricchisci i giocatori con i relativi punteggi
    const scoredPlayers = players.map(p => ({
      ...p,
      optimizerScore: this.getPlayerScore(p),
      roleCat: store.getRoleCategory(p)
    }));

    // Separa per reparto e ordina per punteggio decrescente
    const pool = {
      P: scoredPlayers.filter(p => p.roleCat === 'P').sort((a, b) => b.optimizerScore - a.optimizerScore),
      D: scoredPlayers.filter(p => p.roleCat === 'D').sort((a, b) => b.optimizerScore - a.optimizerScore),
      C: scoredPlayers.filter(p => p.roleCat === 'C').sort((a, b) => b.optimizerScore - a.optimizerScore),
      A: scoredPlayers.filter(p => p.roleCat === 'A').sort((a, b) => b.optimizerScore - a.optimizerScore)
    };

    const preferredFormationId = options.preferredFormationId || null;
    const formationsToTest = preferredFormationId && FORMATIONS[preferredFormationId] 
      ? [FORMATIONS[preferredFormationId]] 
      : FORMATION_LIST.map(f => FORMATIONS[f.id]).filter(Boolean);

    let bestResult = null;

    formationsToTest.forEach(formation => {
      // Conta i posti per reparto nel modulo corrente
      const requiredCounts = { P: 0, D: 0, C: 0, A: 0 };
      formation.slots.forEach(slot => {
        let cat = 'C';
        if (['POR', 'P'].includes(slot.role)) cat = 'P';
        else if (['DC', 'DD', 'DS', 'TD', 'TS', 'D'].includes(slot.role)) cat = 'D';
        else if (['M', 'C', 'CC', 'MED', 'MZ', 'E', 'TRQ', 'T', 'W'].includes(slot.role)) cat = 'C';
        else if (['PC', 'A', 'ATT'].includes(slot.role)) cat = 'A';
        requiredCounts[cat]++;
      });

      // Verifica se la rosa ha abbastanza giocatori per questo modulo
      if (
        pool.P.length < requiredCounts.P ||
        pool.D.length < requiredCounts.D ||
        pool.C.length < requiredCounts.C ||
        pool.A.length < requiredCounts.A
      ) {
        return;
      }

      // Seleziona i migliori per ciascun reparto
      const selectedP = pool.P.slice(0, requiredCounts.P);
      const selectedD = pool.D.slice(0, requiredCounts.D);
      const selectedC = pool.C.slice(0, requiredCounts.C);
      const selectedA = pool.A.slice(0, requiredCounts.A);

      const starters = [...selectedP, ...selectedD, ...selectedC, ...selectedA];
      const totalScore = Number(starters.reduce((sum, p) => sum + p.optimizerScore, 0).toFixed(2));

      if (!bestResult || totalScore > bestResult.totalScore) {
        // Mappa i calciatori negli slot della formazione
        const lineup = {};
        const pointers = { P: 0, D: 0, C: 0, A: 0 };

        formation.slots.forEach(slot => {
          let cat = 'C';
          if (['POR', 'P'].includes(slot.role)) cat = 'P';
          else if (['DC', 'DD', 'DS', 'TD', 'TS', 'D'].includes(slot.role)) cat = 'D';
          else if (['M', 'C', 'CC', 'MED', 'MZ', 'E', 'TRQ', 'T', 'W'].includes(slot.role)) cat = 'C';
          else if (['PC', 'A', 'ATT'].includes(slot.role)) cat = 'A';

          const group = cat === 'P' ? selectedP : (cat === 'D' ? selectedD : (cat === 'C' ? selectedC : selectedA));
          const player = group[pointers[cat]];
          if (player) {
            pointers[cat]++;
            lineup[slot.id] = {
              ...player,
              slotId: slot.id
            };
          }
        });

        // Crea la panchina ordinata per ruolo e punteggio
        const starterIds = new Set(starters.map(p => p.id));
        const bench = [
          ...pool.P.filter(p => !starterIds.has(p.id)),
          ...pool.D.filter(p => !starterIds.has(p.id)),
          ...pool.C.filter(p => !starterIds.has(p.id)),
          ...pool.A.filter(p => !starterIds.has(p.id))
        ];

        bestResult = {
          formationId: formation.id,
          formationName: formation.name,
          lineup,
          bench,
          totalScore,
          startersCount: starters.length,
          benchCount: bench.length
        };
      }
    });

    return bestResult;
  }
}
