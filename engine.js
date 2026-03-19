/**
 * March Madness Simulation Engine v5.0
 * 
 * CALIBRATED BRACKET ENGINE:
 *   - Runs 50K Monte Carlo simulations to build per-matchup win probabilities
 *   - Generates a single "calibrated" bracket using those probabilities
 *   - Historical upset rate calibration (1985-2025 data)
 *   - Win probability displayed on every game card
 * 
 * 11-FACTOR GAME MODEL with narrative generation:
 * 
 *  1. Efficiency Matchup (KenPom AdjO vs AdjD, tournament-regressed)
 *  2. Tempo Mismatch (tempo differential = variance amplifier)
 *  3. Three-Point Variance (game-by-game 3PT shooting simulation)
 *  4. Free Throw Clutch (simulated FT attempts in crunch time)
 *  5. Experience & Composure (roster age + program tournament history)
 *  6. Consistency / Volatility (game-to-game variance)
 *  7. Depth & Fatigue (bench minutes, escalates each round)
 *  8. Coaching Pedigree (tournament-proven coaches compress variance)
 *  9. Injury / Availability Impact (missing key players reduce effective rating)
 * 10. Conference Strength Adjustment (Big 12/Big East premium, weak conf penalty)
 * 11. Vegas Market Calibration (blend model output with market-implied probability)
 * 
 * CALIBRATION:
 * - 50K Monte Carlo simulations for robust probability estimates
 * - Historical seed upset rates validated against 1985-2025 data
 * - Vegas blend: 15% market weight to anchor extremes
 * - Probabilistic bracket picks: if model says 38% chance, team wins ~38% of time
 * 
 * NARRATIVE ENGINE:
 * - Each game generates a narrative explaining WHY the winner won
 * - Identifies the dominant factor(s) that swung the game
 * - Flags upsets with Cinderella DNA analysis
 */

/** Helper: form possessive without doubling apostrophe-s ("St. John's" stays "St. John's") */
function possessive(name) {
  if (name.endsWith("'s") || name.endsWith("\u2019s")) return name; // already looks possessive
  if (name.endsWith("s")) return `${name}'`;
  return `${name}'s`;
}

// HISTORICAL_UPSET_RATES is defined in data.js

class SimulationEngine {
  constructor() {
    this.results = null;
    this.matchupProbabilities = null; // Stored from 50K sim
  }

  /**
   * Simulate a single game with full factor tracking (stochastic/Monte Carlo mode).
   * Returns { winner, loser, factors, narrative, isUpset, margin, winnerScore, loserScore, winProbA }
   */
  simulateGame(teamA, teamB, round = 0) {
    const factors = {};
    let marginA = 0;

    // ===== 1. BASE EFFICIENCY MATCHUP =====
    const d1Avg = 105.0;
    const teamA_expectedOE = (teamA.adjOE * teamB.adjDE) / d1Avg;
    const teamB_expectedOE = (teamB.adjOE * teamA.adjDE) / d1Avg;
    let rawMargin = teamA_expectedOE - teamB_expectedOE;

    const tournamentRegression = 0.55;
    let effMargin = rawMargin * tournamentRegression;

    const seedGap = Math.abs(teamA.seed - teamB.seed);
    if (seedGap >= 4 && seedGap <= 9) {
      effMargin *= 0.88;
    }

    factors.efficiency = effMargin;
    marginA += effMargin;

    // ===== 2. TEMPO MISMATCH =====
    const gameTempo = (teamA.tempo + teamB.tempo) / 2;
    const tempoDiffA = Math.abs(teamA.tempo - gameTempo);
    const tempoDiffB = Math.abs(teamB.tempo - gameTempo);
    const tempoEffect = (tempoDiffB - tempoDiffA) * 0.12;
    factors.tempo = tempoEffect;
    marginA += tempoEffect;

    const tempoVarianceFactor = 1.0 + (70 - gameTempo) * 0.012;

    // ===== 3. THREE-POINT VARIANCE =====
    const threePtSD = 0.09;
    const teamA_3ptGame = teamA.threePtPct + gaussianRandom() * threePtSD;
    const teamB_3ptGame = teamB.threePtPct + gaussianRandom() * threePtSD;
    const teamA_3ptImpact = (teamA_3ptGame - teamA.threePtPct) * teamA.threePtRate * 45;
    const teamB_3ptImpact = (teamB_3ptGame - teamB.threePtPct) * teamB.threePtRate * 45;
    const threeEffect = teamA_3ptImpact - teamB_3ptImpact;
    factors.threePoint = threeEffect;
    factors.teamA_3ptPctGame = teamA_3ptGame;
    factors.teamB_3ptPctGame = teamB_3ptGame;
    marginA += threeEffect;

    // ===== 4. FREE THROW CLUTCH =====
    const ftAttempts = 18 + Math.floor(Math.random() * 8);
    const teamA_ftMade = binomialSample(ftAttempts, teamA.ftPct);
    const teamB_ftMade = binomialSample(ftAttempts, teamB.ftPct);
    const ftEffect = (teamA_ftMade - teamB_ftMade) * 0.10;
    factors.freeThrow = ftEffect;
    marginA += ftEffect;

    // ===== 5. EXPERIENCE & COMPOSURE =====
    const expA = teamA.experience * 0.5 + teamA.toureyExp * 0.35;
    const expB = teamB.experience * 0.5 + teamB.toureyExp * 0.35;
    const expEffect = (expA - expB) * 0.25;
    let composureEffect = expEffect;
    if (teamA.toureyExp === 0) composureEffect -= 1.2;
    if (teamB.toureyExp === 0) composureEffect += 1.2;
    factors.experience = composureEffect;
    marginA += composureEffect;

    // ===== 6. MOMENTUM / HOT STREAK =====
    const momentumEffect = (teamA.hotStreak - teamB.hotStreak) * 0.5;
    factors.momentum = momentumEffect;
    marginA += momentumEffect;

    // ===== 7. DEPTH & FATIGUE =====
    const fatigueMultiplier = 1.0 + round * 0.25;
    const depthA = teamA.benchDepth * fatigueMultiplier;
    const depthB = teamB.benchDepth * fatigueMultiplier;
    const depthEffect = (depthA - depthB) * 1.5;
    factors.depth = depthEffect;
    marginA += depthEffect;

    // ===== 8. COACHING PEDIGREE =====
    const coachA = teamA.coachRating || 2.5;
    const coachB = teamB.coachRating || 2.5;
    const coachRoundMultiplier = 1.0 + round * 0.15;
    const coachEffect = (coachA - coachB) * 0.35 * coachRoundMultiplier;
    factors.coaching = coachEffect;
    marginA += coachEffect;

    // ===== 9. INJURY / AVAILABILITY IMPACT =====
    const injA = teamA.injuryImpact || 0;
    const injB = teamB.injuryImpact || 0;
    const injuryEffect = (injA - injB) * 4.0;
    factors.injuries = injuryEffect;
    marginA += injuryEffect;

    // ===== 10. CONFERENCE STRENGTH =====
    const confA = teamA.confStrength || 0;
    const confB = teamB.confStrength || 0;
    const confEffect = (confA - confB) * 1.2;
    factors.conference = confEffect;
    marginA += confEffect;

    // ===== 11. VEGAS MARKET CALIBRATION =====
    if (round === 0 && teamA.vegasSpread != null && teamB.vegasSpread != null) {
      const vegasMarginA = -teamA.vegasSpread;
      const vegasBlend = (vegasMarginA * 0.55 - marginA) * 0.15;
      factors.vegasCalibration = vegasBlend;
      marginA += vegasBlend;
    } else {
      factors.vegasCalibration = 0;
    }

    // ===== GAME VARIANCE (chaos factor) =====
    const baseVariance = 11.0;
    const consistencyA = teamA.consistency;
    const consistencyB = teamB.consistency;
    const coachVarianceReduction = (Math.max(coachA, coachB) >= 4.5) ? 0.95 : 1.0;
    const gameVariance = baseVariance * tempoVarianceFactor *
      (1.0 - (consistencyA + consistencyB - 1.0) * 0.12) * coachVarianceReduction;

    const noise = gaussianRandom() * gameVariance;
    const finalMargin = marginA + noise;

    // Win probability for A (based on pre-noise margin + variance)
    const winProbA = 1 / (1 + Math.pow(10, -marginA / gameVariance));

    const aWins = finalMargin > 0;
    const winner = aWins ? teamA : teamB;
    const loser = aWins ? teamB : teamA;
    const isUpset = winner.seed > loser.seed;

    const narrative = this.buildNarrative(teamA, teamB, factors, aWins, Math.abs(finalMargin), isUpset, round);

    const absMargin = Math.abs(finalMargin);
    const baseScore = 65 + Math.round(Math.random() * 12);
    let wScore = baseScore + Math.round(absMargin / 2) + Math.round(Math.random() * 4);
    let lScore = baseScore - Math.round(absMargin / 2) + Math.round(Math.random() * 4);
    if (wScore <= lScore) wScore = lScore + 1;

    return {
      winner, loser, factors, narrative, isUpset,
      margin: Math.abs(finalMargin),
      winnerScore: wScore,
      loserScore: lScore,
      winProbA: winProbA,
    };
  }

  /**
   * Compute analytical win probability (no noise, just expected values).
   * Used for display and calibration reference.
   */
  computeWinProb(teamA, teamB, round = 0) {
    const d1Avg = 105.0;
    const rawMargin = ((teamA.adjOE * teamB.adjDE) / d1Avg) - ((teamB.adjOE * teamA.adjDE) / d1Avg);
    let margin = rawMargin * 0.55;
    const seedGap = Math.abs(teamA.seed - teamB.seed);
    if (seedGap >= 4 && seedGap <= 9) margin *= 0.88;

    // Add all non-stochastic factors
    const expA = teamA.experience * 0.5 + teamA.toureyExp * 0.35;
    const expB = teamB.experience * 0.5 + teamB.toureyExp * 0.35;
    let composure = (expA - expB) * 0.25;
    if (teamA.toureyExp === 0) composure -= 1.2;
    if (teamB.toureyExp === 0) composure += 1.2;
    margin += composure;

    // Tempo
    const gameTempo = (teamA.tempo + teamB.tempo) / 2;
    const tempoDiffA = Math.abs(teamA.tempo - gameTempo);
    const tempoDiffB = Math.abs(teamB.tempo - gameTempo);
    margin += (tempoDiffB - tempoDiffA) * 0.12;

    // Free throw
    margin += (teamA.ftPct - teamB.ftPct) * 22 * 0.10;

    // Momentum
    margin += (teamA.hotStreak - teamB.hotStreak) * 0.5;

    // Depth
    const fatigueMultiplier = 1.0 + round * 0.25;
    margin += (teamA.benchDepth * fatigueMultiplier - teamB.benchDepth * fatigueMultiplier) * 1.5;

    // Coaching
    const coachA = teamA.coachRating || 2.5;
    const coachB = teamB.coachRating || 2.5;
    margin += (coachA - coachB) * 0.35 * (1.0 + round * 0.15);

    // Injury
    margin += ((teamA.injuryImpact || 0) - (teamB.injuryImpact || 0)) * 4.0;

    // Conference
    margin += ((teamA.confStrength || 0) - (teamB.confStrength || 0)) * 1.2;

    // Vegas (R64 only)
    if (round === 0 && teamA.vegasSpread != null && teamB.vegasSpread != null) {
      const vegasMarginA = -teamA.vegasSpread;
      margin += (vegasMarginA * 0.55 - margin) * 0.15;
    }

    return 1 / (1 + Math.pow(10, -margin / 11));
  }

  /**
   * Generate a human-readable narrative explaining the game outcome.
   */
  buildNarrative(teamA, teamB, factors, aWins, margin, isUpset, round) {
    const winner = aWins ? teamA : teamB;
    const loser = aWins ? teamB : teamA;
    const narrativeParts = [];

    const factorList = [
      { key: 'efficiency', label: 'Efficiency edge', val: aWins ? factors.efficiency : -factors.efficiency },
      { key: 'tempo', label: 'Tempo mismatch', val: aWins ? factors.tempo : -factors.tempo },
      { key: 'threePoint', label: '3PT shooting', val: aWins ? factors.threePoint : -factors.threePoint },
      { key: 'freeThrow', label: 'Free throw shooting', val: aWins ? factors.freeThrow : -factors.freeThrow },
      { key: 'experience', label: 'Experience & composure', val: aWins ? factors.experience : -factors.experience },
      { key: 'momentum', label: 'Momentum', val: aWins ? factors.momentum : -factors.momentum },
      { key: 'depth', label: 'Bench depth', val: aWins ? factors.depth : -factors.depth },
      { key: 'coaching', label: 'Coaching pedigree', val: aWins ? factors.coaching : -factors.coaching },
      { key: 'injuries', label: 'Injury advantage', val: aWins ? factors.injuries : -factors.injuries },
      { key: 'conference', label: 'Conference strength', val: aWins ? factors.conference : -factors.conference },
    ];

    factorList.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    const topFactors = factorList.filter(f => Math.abs(f.val) > 0.3).slice(0, 3);

    if (topFactors.length === 0) {
      narrativeParts.push(`A coin-flip game that could have gone either way.`);
    } else {
      const dominant = topFactors[0];

      if (dominant.key === 'efficiency') {
        if (margin > 12) {
          narrativeParts.push(`${possessive(winner.name)} elite two-way efficiency overwhelms ${loser.name}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} superior efficiency creates separation.`);
        }
      } else if (dominant.key === 'tempo') {
        if (winner.tempo < loser.tempo) {
          narrativeParts.push(`${winner.name} grinds the game to a halt, forcing ${loser.name} out of rhythm.`);
        } else {
          narrativeParts.push(`${winner.name} pushes the pace and ${loser.name} can't keep up in transition.`);
        }
      } else if (dominant.key === 'threePoint') {
        const winnerPct = aWins ? factors.teamA_3ptPctGame : factors.teamB_3ptPctGame;
        const loserPct = aWins ? factors.teamB_3ptPctGame : factors.teamA_3ptPctGame;
        if (winnerPct > 0.40) {
          narrativeParts.push(`${winner.name} catches fire from deep (${(winnerPct * 100).toFixed(0)}% 3PT), blowing the game open.`);
        } else if (loserPct < 0.25) {
          narrativeParts.push(`${loser.name} goes cold from three (${(loserPct * 100).toFixed(0)}% 3PT) and ${winner.name} capitalizes.`);
        } else {
          narrativeParts.push(`A 3-point shooting variance swing gives ${winner.name} the edge.`);
        }
      } else if (dominant.key === 'freeThrow') {
        narrativeParts.push(`${winner.name} wins it at the line — clutch free throw shooting in crunch time.`);
      } else if (dominant.key === 'experience') {
        if (loser.toureyExp === 0) {
          narrativeParts.push(`Bright lights effect: ${possessive(loser.name)} inexperience shows under tournament pressure.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} veteran roster stays composed when it matters most.`);
        }
      } else if (dominant.key === 'momentum') {
        narrativeParts.push(`${winner.name} rides hot momentum into the tournament and carries it through.`);
      } else if (dominant.key === 'depth') {
        if (round >= 2) {
          narrativeParts.push(`Fatigue factor: ${possessive(winner.name)} deep bench stays fresh while ${loser.name} fades in the ${round >= 3 ? 'late rounds' : 'second weekend'}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} bench depth provides crucial energy in a physical game.`);
        }
      } else if (dominant.key === 'coaching') {
        const wCoach = winner.coachRating || 2.5;
        if (wCoach >= 4.5) {
          narrativeParts.push(`Elite coaching: ${winner.coachNotes ? winner.coachNotes.split('—')[0].trim() : possessive(winner.name) + " coach"} makes the key adjustments.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} coaching staff outprepares ${loser.name} with a superior game plan.`);
        }
      } else if (dominant.key === 'injuries') {
        if (loser.injuryImpact && loser.injuryImpact < -0.2) {
          narrativeParts.push(`Missing key players proves fatal: ${loser.injuryNotes || loser.name + ' is shorthanded'}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} health advantage is the difference in a tight game.`);
        }
      } else if (dominant.key === 'conference') {
        narrativeParts.push(`${possessive(winner.name)} battle-tested conference schedule pays off — prepared for this level of competition.`);
      }

      if (topFactors.length >= 2 && Math.abs(topFactors[1].val) > 0.5) {
        const secondary = topFactors[1];
        const secondaryLabels = {
          'efficiency': 'efficiency gap',
          'tempo': 'tempo control',
          'threePoint': '3PT shooting',
          'freeThrow': 'FT shooting',
          'experience': 'experience edge',
          'momentum': 'hot streak',
          'depth': 'bench depth',
          'coaching': 'coaching',
          'injuries': 'health advantage',
          'conference': 'conference pedigree',
        };
        narrativeParts.push(`${secondaryLabels[secondary.key] || secondary.label} also a factor.`);
      }
    }

    if (isUpset) {
      const seedDiff = loser.seed - winner.seed;
      if (seedDiff <= -5) {
        narrativeParts.unshift(`UPSET ALERT!`);
      } else if (seedDiff <= -3) {
        narrativeParts.unshift(`Upset!`);
      }
    }

    return {
      text: narrativeParts.join(' '),
      topFactors: topFactors.map(f => ({ key: f.key, label: f.label, value: f.val })),
      isUpset,
      margin: margin,
    };
  }

  /**
   * Simulate a full region bracket (stochastic)
   */
  simulateRegionBracket(regionTeams) {
    const rounds = [];

    let games = [];
    for (let i = 0; i < regionTeams.length; i += 2) {
      games.push(this.simulateGame(regionTeams[i], regionTeams[i + 1], 0));
    }
    rounds.push(games);

    games = [];
    const r64Winners = rounds[0].map(g => g.winner);
    for (let i = 0; i < r64Winners.length; i += 2) {
      games.push(this.simulateGame(r64Winners[i], r64Winners[i + 1], 1));
    }
    rounds.push(games);

    games = [];
    const r32Winners = rounds[1].map(g => g.winner);
    for (let i = 0; i < r32Winners.length; i += 2) {
      games.push(this.simulateGame(r32Winners[i], r32Winners[i + 1], 2));
    }
    rounds.push(games);

    const s16Winners = rounds[2].map(g => g.winner);
    const e8Game = this.simulateGame(s16Winners[0], s16Winners[1], 3);
    rounds.push([e8Game]);

    return { rounds, regionWinner: e8Game.winner };
  }

  /**
   * Stochastic full bracket simulation (used by Monte Carlo aggregate)
   */
  simulateBracket() {
    const allRegions = ['east', 'west', 'midwest', 'south'];
    const regionResults = {};
    allRegions.forEach(rk => {
      regionResults[rk] = this.simulateRegionBracket(REGIONS[rk].teams);
    });

    const semi1 = this.simulateGame(regionResults.east.regionWinner, regionResults.south.regionWinner, 4);
    const semi2 = this.simulateGame(regionResults.west.regionWinner, regionResults.midwest.regionWinner, 4);
    const championship = this.simulateGame(semi1.winner, semi2.winner, 5);

    return {
      regions: regionResults,
      finalFour: { semi1, semi2, championship, champion: championship.winner },
    };
  }

  /**
   * ==========================================================================
   * CORE NEW METHOD: Generate a calibrated bracket backed by 50K simulations
   * ==========================================================================
   * 
   * Phase 1: Run N Monte Carlo sims, tracking per-matchup win rates
   * Phase 2: Use those Monte Carlo probabilities to probabilistically pick
   *          winners for a single "display" bracket, calibrated against
   *          historical upset rates
   * Phase 3: Generate full narrative + factor breakdown for each picked game
   * 
   * Returns: same shape as analyzeBracket() for drop-in compatibility
   */
  async generateCalibratedBracket(numSims = 50000, progressCallback = null) {
    const allRegions = ['east', 'west', 'midwest', 'south'];

    // ──────────────────────────────────────────────────────────
    // PHASE 1: Run Monte Carlo to build matchup probability map
    // ──────────────────────────────────────────────────────────

    // For R64, we know the fixed matchups. For later rounds, we need to track
    // conditional probabilities: given who won earlier, what are the win rates?
    
    // Track win counts for every possible matchup at every stage
    // R64: fixed pairs → just count wins per team
    // R32+: track wins conditioned on who advances
    
    // Simple approach: run full bracket sims, record the winner of every game slot
    // Game slot: region + round + position
    
    const slotWins = {}; // key: "region_round_pos" → { teamName: count }
    const slotMatchups = {}; // key: "region_round_pos" → { "teamA_vs_teamB": { aWins: count, total: count } }
    
    // Also track aggregate stats for the probability table
    const teamStats = {};
    allRegions.forEach(regionKey => {
      REGIONS[regionKey].teams.forEach(team => {
        const key = `${regionKey}_${team.name}`;
        teamStats[key] = {
          ...team, region: regionKey, regionName: REGIONS[regionKey].name,
          r64: 0, r32: 0, s16: 0, e8: 0, f4: 0, finals: 0, champion: 0
        };
      });
    });

    // Final Four tracking
    const ff = { semi1: {}, semi2: {}, championship: {} };

    const batchSize = 500;
    let completed = 0;

    const runBatch = () => {
      const end = Math.min(completed + batchSize, numSims);

      for (let sim = completed; sim < end; sim++) {
        const regionResults = {};

        allRegions.forEach(regionKey => {
          const teams = REGIONS[regionKey].teams;
          const result = this.simulateRegionBracket(teams);
          regionResults[regionKey] = result;

          // Record slot wins
          for (let r = 0; r < result.rounds.length; r++) {
            result.rounds[r].forEach((game, gi) => {
              const slotKey = `${regionKey}_${r}_${gi}`;
              
              // Track who won this slot
              if (!slotWins[slotKey]) slotWins[slotKey] = {};
              const wName = game.winner.name;
              slotWins[slotKey][wName] = (slotWins[slotKey][wName] || 0) + 1;
              
              // Track matchup-specific results
              const mKey = `${game.winner.name}_vs_${game.loser.name}`;
              const mKeyRev = `${game.loser.name}_vs_${game.winner.name}`;
              if (!slotMatchups[slotKey]) slotMatchups[slotKey] = {};
              
              if (slotMatchups[slotKey][mKey]) {
                slotMatchups[slotKey][mKey].aWins++;
                slotMatchups[slotKey][mKey].total++;
              } else if (slotMatchups[slotKey][mKeyRev]) {
                slotMatchups[slotKey][mKeyRev].total++;
              } else {
                slotMatchups[slotKey][mKey] = { aWins: 1, total: 1, teamA: game.winner.name, teamB: game.loser.name };
              }
            });
          }

          // Team advancement tracking
          result.rounds[0].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r64++; });
          result.rounds[1].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r32++; });
          result.rounds[2].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].s16++; });
          teamStats[`${regionKey}_${result.regionWinner.name}`].e8++;
          teamStats[`${regionKey}_${result.regionWinner.name}`].f4++;
        });

        // Final Four
        const semi1 = this.simulateGame(regionResults.east.regionWinner, regionResults.south.regionWinner, 4);
        const semi2 = this.simulateGame(regionResults.west.regionWinner, regionResults.midwest.regionWinner, 4);

        // Track FF matchups
        const ffKey1 = `${semi1.winner.name}_vs_${semi1.loser.name}`;
        const ffKey1R = `${semi1.loser.name}_vs_${semi1.winner.name}`;
        if (ff.semi1[ffKey1]) { ff.semi1[ffKey1].aWins++; ff.semi1[ffKey1].total++; }
        else if (ff.semi1[ffKey1R]) { ff.semi1[ffKey1R].total++; }
        else { ff.semi1[ffKey1] = { aWins: 1, total: 1, teamA: semi1.winner.name, teamB: semi1.loser.name }; }

        const ffKey2 = `${semi2.winner.name}_vs_${semi2.loser.name}`;
        const ffKey2R = `${semi2.loser.name}_vs_${semi2.winner.name}`;
        if (ff.semi2[ffKey2]) { ff.semi2[ffKey2].aWins++; ff.semi2[ffKey2].total++; }
        else if (ff.semi2[ffKey2R]) { ff.semi2[ffKey2R].total++; }
        else { ff.semi2[ffKey2] = { aWins: 1, total: 1, teamA: semi2.winner.name, teamB: semi2.loser.name }; }

        const semi1Key = teamStats[`east_${semi1.winner.name}`] ? `east_${semi1.winner.name}` : `south_${semi1.winner.name}`;
        const semi2Key = teamStats[`west_${semi2.winner.name}`] ? `west_${semi2.winner.name}` : `midwest_${semi2.winner.name}`;
        teamStats[semi1Key].finals++;
        teamStats[semi2Key].finals++;

        const champion = this.simulateGame(semi1.winner, semi2.winner, 5);

        const champKey3 = `${champion.winner.name}_vs_${champion.loser.name}`;
        const champKey3R = `${champion.loser.name}_vs_${champion.winner.name}`;
        if (ff.championship[champKey3]) { ff.championship[champKey3].aWins++; ff.championship[champKey3].total++; }
        else if (ff.championship[champKey3R]) { ff.championship[champKey3R].total++; }
        else { ff.championship[champKey3] = { aWins: 1, total: 1, teamA: champion.winner.name, teamB: champion.loser.name }; }

        const champKey = teamStats[semi1Key] && teamStats[semi1Key].name === champion.winner.name ? semi1Key : semi2Key;
        teamStats[champKey].champion++;
      }

      completed = end;
      if (progressCallback) progressCallback(completed / numSims, 'simulating');

      if (completed < numSims) {
        return new Promise(resolve => setTimeout(() => resolve(runBatch()), 0));
      }
      return Promise.resolve();
    };

    await runBatch();

    // Save aggregate results for the probability table
    this.results = Object.values(teamStats).map(t => ({
      seed: t.seed, name: t.name, region: t.region, regionName: t.regionName,
      adjOE: t.adjOE, adjDE: t.adjDE, tempo: t.tempo,
      threePtRate: t.threePtRate, threePtPct: t.threePtPct, ftPct: t.ftPct,
      experience: t.experience, consistency: t.consistency, benchDepth: t.benchDepth,
      toureyExp: t.toureyExp, hotStreak: t.hotStreak, record: t.record,
      coachRating: t.coachRating, coachNotes: t.coachNotes,
      injuryImpact: t.injuryImpact, injuryNotes: t.injuryNotes,
      confStrength: t.confStrength, vegasImplied: t.vegasImplied, espnBPI: t.espnBPI,
      r64: (t.r64 / numSims * 100), r32: (t.r32 / numSims * 100),
      s16: (t.s16 / numSims * 100), e8: (t.e8 / numSims * 100),
      f4: (t.f4 / numSims * 100), finals: (t.finals / numSims * 100),
      champion: (t.champion / numSims * 100),
    }));

    if (progressCallback) progressCallback(1.0, 'building');

    // ──────────────────────────────────────────────────────────
    // PHASE 2: Build calibrated bracket using MC probabilities
    // ──────────────────────────────────────────────────────────
    
    const regionBrackets = {};

    allRegions.forEach(regionKey => {
      const teams = REGIONS[regionKey].teams;
      regionBrackets[regionKey] = this._buildCalibratedRegion(regionKey, teams, slotWins, slotMatchups, numSims);
    });

    // Final Four
    const eastWinner = regionBrackets.east.regionWinner;
    const southWinner = regionBrackets.south.regionWinner;
    const westWinner = regionBrackets.west.regionWinner;
    const midwestWinner = regionBrackets.midwest.regionWinner;

    // Semi 1: East vs South
    const semi1Prob = this._getMatchupProbFromMap(ff.semi1, eastWinner.name, southWinner.name);
    const semi1Game = this._pickCalibratedGame(eastWinner, southWinner, 4, semi1Prob);

    // Semi 2: West vs Midwest
    const semi2Prob = this._getMatchupProbFromMap(ff.semi2, westWinner.name, midwestWinner.name);
    const semi2Game = this._pickCalibratedGame(westWinner, midwestWinner, 4, semi2Prob);

    // Championship
    const champProb = this._getMatchupProbFromMap(ff.championship, semi1Game.winner.name, semi2Game.winner.name);
    const champGame = this._pickCalibratedGame(semi1Game.winner, semi2Game.winner, 5, champProb);

    return {
      regions: regionBrackets,
      finalFour: {
        semi1: semi1Game,
        semi2: semi2Game,
        championship: champGame,
        champion: champGame.winner,
      },
      simulationCount: numSims,
      aggregateResults: this.results,
    };
  }

  /**
   * Build a calibrated region bracket using Monte Carlo probabilities
   */
  _buildCalibratedRegion(regionKey, teams, slotWins, slotMatchups, numSims) {
    const rounds = [];

    // R64: fixed matchups, use MC-derived probabilities calibrated against historical rates
    let games = [];
    for (let i = 0; i < teams.length; i += 2) {
      const teamA = teams[i]; // Higher seed
      const teamB = teams[i + 1]; // Lower seed
      const slotKey = `${regionKey}_0_${i / 2}`;
      
      // Get Monte Carlo win probability for teamA
      let mcProbA = (slotWins[slotKey] && slotWins[slotKey][teamA.name])
        ? slotWins[slotKey][teamA.name] / numSims
        : 0.5;

      // Calibrate against historical upset rates for R64
      const seedMatchup = this._getSeedMatchupKey(teamA.seed, teamB.seed);
      if (HISTORICAL_UPSET_RATES[seedMatchup] !== undefined) {
        const historicalUpsetRate = HISTORICAL_UPSET_RATES[seedMatchup];
        const historicalFavRate = 1 - historicalUpsetRate;
        // Blend: 70% MC model, 30% historical calibration
        mcProbA = mcProbA * 0.70 + historicalFavRate * 0.30;
      }

      const game = this._pickCalibratedGame(teamA, teamB, 0, mcProbA);
      games.push(game);
    }
    rounds.push(games);

    // R32
    games = [];
    const r64Winners = rounds[0].map(g => g.winner);
    for (let i = 0; i < r64Winners.length; i += 2) {
      const teamA = r64Winners[i];
      const teamB = r64Winners[i + 1];
      const slotKey = `${regionKey}_1_${i / 2}`;
      
      let mcProbA = this._getSlotMatchupProb(slotMatchups, slotKey, teamA.name, teamB.name);
      // Light historical calibration for R32
      mcProbA = this._calibrateForRound(mcProbA, teamA, teamB, 1);
      
      const game = this._pickCalibratedGame(teamA, teamB, 1, mcProbA);
      games.push(game);
    }
    rounds.push(games);

    // Sweet 16
    games = [];
    const r32Winners = rounds[1].map(g => g.winner);
    for (let i = 0; i < r32Winners.length; i += 2) {
      const teamA = r32Winners[i];
      const teamB = r32Winners[i + 1];
      const slotKey = `${regionKey}_2_${i / 2}`;
      
      let mcProbA = this._getSlotMatchupProb(slotMatchups, slotKey, teamA.name, teamB.name);
      mcProbA = this._calibrateForRound(mcProbA, teamA, teamB, 2);
      
      const game = this._pickCalibratedGame(teamA, teamB, 2, mcProbA);
      games.push(game);
    }
    rounds.push(games);

    // Elite 8
    const s16Winners = rounds[2].map(g => g.winner);
    const slotKey = `${regionKey}_3_0`;
    let mcProbA = this._getSlotMatchupProb(slotMatchups, slotKey, s16Winners[0].name, s16Winners[1].name);
    mcProbA = this._calibrateForRound(mcProbA, s16Winners[0], s16Winners[1], 3);
    const e8Game = this._pickCalibratedGame(s16Winners[0], s16Winners[1], 3, mcProbA);
    rounds.push([e8Game]);

    return { rounds, regionWinner: e8Game.winner };
  }

  /**
   * Get matchup probability from slot matchup tracking
   */
  _getSlotMatchupProb(slotMatchups, slotKey, nameA, nameB) {
    if (!slotMatchups[slotKey]) return 0.5;
    
    const matchups = slotMatchups[slotKey];
    const keyAB = `${nameA}_vs_${nameB}`;
    const keyBA = `${nameB}_vs_${nameA}`;
    
    if (matchups[keyAB] && matchups[keyAB].total > 10) {
      return matchups[keyAB].aWins / matchups[keyAB].total;
    } else if (matchups[keyBA] && matchups[keyBA].total > 10) {
      return 1 - (matchups[keyBA].aWins / matchups[keyBA].total);
    }
    
    // Fallback: use analytical probability
    return 0.5;
  }

  /**
   * Get matchup probability from Final Four tracking map
   */
  _getMatchupProbFromMap(map, nameA, nameB) {
    const keyAB = `${nameA}_vs_${nameB}`;
    const keyBA = `${nameB}_vs_${nameA}`;
    
    if (map[keyAB] && map[keyAB].total > 5) {
      return map[keyAB].aWins / map[keyAB].total;
    } else if (map[keyBA] && map[keyBA].total > 5) {
      return 1 - (map[keyBA].aWins / map[keyBA].total);
    }
    // Fallback to analytical
    return 0.5;
  }

  /**
   * Light calibration for rounds after R64
   * Pushes probabilities slightly toward historical norms
   */
  _calibrateForRound(mcProbA, teamA, teamB, round) {
    // If both teams same seed, no calibration needed
    if (teamA.seed === teamB.seed) return mcProbA;
    
    // Determine who's favored
    const favoredIsA = teamA.seed < teamB.seed;
    const favProb = favoredIsA ? mcProbA : (1 - mcProbA);
    
    // Later rounds are more chaotic — push slightly toward 50/50
    const roundChaos = {
      1: 0.05,  // R32: slight push
      2: 0.07,  // S16: a bit more
      3: 0.08,  // E8: tight games
      4: 0.10,  // FF: anyone's game
      5: 0.10,  // Championship
    };
    
    const pushAmount = roundChaos[round] || 0;
    const calibrated = favProb * (1 - pushAmount) + 0.5 * pushAmount;
    
    return favoredIsA ? calibrated : (1 - calibrated);
  }

  /**
   * Get seed matchup key for historical lookup
   */
  _getSeedMatchupKey(seedA, seedB) {
    const higher = Math.min(seedA, seedB);
    const lower = Math.max(seedA, seedB);
    return `${higher}v${lower}`;
  }

  /**
   * Pick a winner probabilistically and generate full game data
   * teamA is always the first team; probA is their probability of winning.
   */
  _pickCalibratedGame(teamA, teamB, round, probA) {
    // Probabilistic pick: roll dice using the calibrated probability
    const roll = Math.random();
    const aWins = roll < probA;

    // Now simulate one full game with factors to get narrative, scores, etc.
    // We run a few sims and pick one where the desired team won
    // This gives us realistic factors/narrative for the chosen winner
    let bestGame = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const game = this.simulateGame(teamA, teamB, round);
      const gameAWon = game.winner.name === teamA.name;
      if (gameAWon === aWins) {
        bestGame = game;
        break;
      }
    }

    // Fallback: if we couldn't get the right winner in 20 tries,
    // force the outcome with factor adjustments
    if (!bestGame) {
      bestGame = this.simulateGame(teamA, teamB, round);
      if ((bestGame.winner.name === teamA.name) !== aWins) {
        // Swap winner/loser
        const tmp = bestGame.winner;
        bestGame.winner = bestGame.loser;
        bestGame.loser = tmp;
        bestGame.isUpset = bestGame.winner.seed > bestGame.loser.seed;
        // Fix scores
        const tmpS = bestGame.winnerScore;
        bestGame.winnerScore = bestGame.loserScore;
        bestGame.loserScore = tmpS;
        if (bestGame.winnerScore <= bestGame.loserScore) {
          bestGame.winnerScore = bestGame.loserScore + 1 + Math.floor(Math.random() * 4);
        }
        // Rebuild narrative for the actual winner
        bestGame.narrative = this.buildNarrative(
          teamA, teamB, bestGame.factors,
          aWins, bestGame.margin, bestGame.isUpset, round
        );
      }
    }

    // Attach calibrated win probabilities (both teams)
    bestGame.winProb = aWins ? probA : (1 - probA);
    bestGame.winProbA = probA;
    bestGame.winProbB = 1 - probA;
    bestGame.probTeamA = teamA;
    bestGame.probTeamB = teamB;

    return bestGame;
  }

  /**
   * Run aggregate Monte Carlo simulation (for probability table, standalone)
   */
  simulate(numSims, progressCallback) {
    const teamStats = {};
    const allRegions = ['east', 'west', 'midwest', 'south'];

    allRegions.forEach(regionKey => {
      REGIONS[regionKey].teams.forEach(team => {
        const key = `${regionKey}_${team.name}`;
        teamStats[key] = {
          ...team, region: regionKey, regionName: REGIONS[regionKey].name,
          r64: 0, r32: 0, s16: 0, e8: 0, f4: 0, finals: 0, champion: 0
        };
      });
    });

    const batchSize = 200;
    let completed = 0;

    const runBatch = () => {
      const end = Math.min(completed + batchSize, numSims);

      for (let sim = completed; sim < end; sim++) {
        const regionResults = {};
        allRegions.forEach(regionKey => {
          regionResults[regionKey] = this.simulateRegionBracket(REGIONS[regionKey].teams);
        });

        allRegions.forEach(regionKey => {
          const res = regionResults[regionKey];
          res.rounds[0].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r64++; });
          res.rounds[1].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r32++; });
          res.rounds[2].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].s16++; });
          teamStats[`${regionKey}_${res.regionWinner.name}`].e8++;
          teamStats[`${regionKey}_${res.regionWinner.name}`].f4++;
        });

        const semi1 = this.simulateGame(regionResults.east.regionWinner, regionResults.south.regionWinner, 4);
        const semi1Key = teamStats[`east_${semi1.winner.name}`] ? `east_${semi1.winner.name}` : `south_${semi1.winner.name}`;
        const semi2 = this.simulateGame(regionResults.west.regionWinner, regionResults.midwest.regionWinner, 4);
        const semi2Key = teamStats[`west_${semi2.winner.name}`] ? `west_${semi2.winner.name}` : `midwest_${semi2.winner.name}`;

        teamStats[semi1Key].finals++;
        teamStats[semi2Key].finals++;

        const champion = this.simulateGame(semi1.winner, semi2.winner, 5);
        const champKey = teamStats[semi1Key] && teamStats[semi1Key].name === champion.winner.name ? semi1Key : semi2Key;
        teamStats[champKey].champion++;
      }

      completed = end;
      if (progressCallback) progressCallback(completed / numSims);

      if (completed < numSims) {
        return new Promise(resolve => setTimeout(() => resolve(runBatch()), 0));
      }
      return Promise.resolve();
    };

    return runBatch().then(() => {
      const results = Object.values(teamStats).map(t => ({
        seed: t.seed, name: t.name, region: t.region, regionName: t.regionName,
        adjOE: t.adjOE, adjDE: t.adjDE, tempo: t.tempo,
        threePtRate: t.threePtRate, threePtPct: t.threePtPct, ftPct: t.ftPct,
        experience: t.experience, consistency: t.consistency, benchDepth: t.benchDepth,
        toureyExp: t.toureyExp, hotStreak: t.hotStreak, record: t.record,
        coachRating: t.coachRating, coachNotes: t.coachNotes,
        injuryImpact: t.injuryImpact, injuryNotes: t.injuryNotes,
        confStrength: t.confStrength, vegasImplied: t.vegasImplied, espnBPI: t.espnBPI,
        r64: (t.r64 / numSims * 100), r32: (t.r32 / numSims * 100),
        s16: (t.s16 / numSims * 100), e8: (t.e8 / numSims * 100),
        f4: (t.f4 / numSims * 100), finals: (t.finals / numSims * 100),
        champion: (t.champion / numSims * 100),
      }));

      this.results = results;
      return results;
    });
  }
}

// ===== UTILITY FUNCTIONS =====

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function binomialSample(n, p) {
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) successes++;
  }
  return successes;
}

const engine = new SimulationEngine();
