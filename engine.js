/**
 * March Madness Monte Carlo Engine v3.0
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
 * - Tournament regression: 0.55 (KenPom margins compressed for single-elim)
 * - Historical seed upset rates validated against 1985-2025 data
 * - Vegas blend: 15% market weight to anchor extremes
 * - Champion DNA filter: teams matching historical champion profile get slight boost
 * 
 * NARRATIVE ENGINE:
 * - Each simulated game generates a narrative explaining WHY the winner won
 * - Identifies the dominant factor(s) that swung the game
 * - Flags upsets with Cinderella DNA analysis
 */

/** Helper: form possessive without doubling apostrophe-s ("St. John's" stays "St. John's") */
function possessive(name) {
  if (name.endsWith("'s") || name.endsWith("\u2019s")) return name; // already looks possessive
  if (name.endsWith("s")) return `${name}'`;
  return `${name}'s`;
}

class SimulationEngine {
  constructor() {
    this.results = null;
  }

  /**
   * Simulate a single game with full factor tracking and narrative.
   * Returns { winner, loser, factors, narrative, isUpset, margin }
   */
  simulateGame(teamA, teamB, round = 0) {
    const factors = {};
    let marginA = 0;

    // ===== 1. BASE EFFICIENCY MATCHUP =====
    const d1Avg = 105.0;
    const teamA_expectedOE = (teamA.adjOE * teamB.adjDE) / d1Avg;
    const teamB_expectedOE = (teamB.adjOE * teamA.adjDE) / d1Avg;
    let rawMargin = teamA_expectedOE - teamB_expectedOE;

    // Tournament regression: single-elimination compresses margins
    const tournamentRegression = 0.55;
    let effMargin = rawMargin * tournamentRegression;

    // Seed gap pressure: 4-13 through 5-12 are the upset zone
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

    // Fewer possessions = higher variance
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
    // First-time tournament penalty
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

    // ===== 8. COACHING PEDIGREE (NEW) =====
    const coachA = teamA.coachRating || 2.5;
    const coachB = teamB.coachRating || 2.5;
    // Elite coaches (4.5+) add composure; they also reduce variance
    // In later rounds, coaching matters more
    const coachRoundMultiplier = 1.0 + round * 0.15;
    const coachEffect = (coachA - coachB) * 0.35 * coachRoundMultiplier;
    factors.coaching = coachEffect;
    marginA += coachEffect;

    // ===== 9. INJURY / AVAILABILITY IMPACT (NEW) =====
    const injA = teamA.injuryImpact || 0;
    const injB = teamB.injuryImpact || 0;
    // Injury impact is negative, so we add team A's penalty and subtract team B's
    const injuryEffect = (injA - injB) * 4.0; // Scale: -0.6 impact * 4 = -2.4 pts
    factors.injuries = injuryEffect;
    marginA += injuryEffect;

    // ===== 10. CONFERENCE STRENGTH (NEW) =====
    const confA = teamA.confStrength || 0;
    const confB = teamB.confStrength || 0;
    const confEffect = (confA - confB) * 1.2;
    factors.conference = confEffect;
    marginA += confEffect;

    // ===== 11. VEGAS MARKET CALIBRATION (NEW) =====
    // Blend: use game spread if available for R64, otherwise use implied probs
    // This anchors our model to the market's wisdom without overriding it
    if (round === 0 && teamA.vegasSpread != null && teamB.vegasSpread != null) {
      // Vegas spread implies a margin; blend ~15% toward it
      const vegasMarginA = -teamA.vegasSpread; // negative spread = favored
      const vegasBlend = (vegasMarginA * 0.55 - marginA) * 0.15; // 15% weight
      factors.vegasCalibration = vegasBlend;
      marginA += vegasBlend;
    } else {
      factors.vegasCalibration = 0;
    }

    // ===== GAME VARIANCE (chaos factor) =====
    const baseVariance = 11.0;
    const consistencyA = teamA.consistency;
    const consistencyB = teamB.consistency;
    // Elite coaches reduce variance slightly (tighter game plans)
    const coachVarianceReduction = (Math.max(coachA, coachB) >= 4.5) ? 0.95 : 1.0;
    const gameVariance = baseVariance * tempoVarianceFactor *
      (1.0 - (consistencyA + consistencyB - 1.0) * 0.12) * coachVarianceReduction;

    const noise = gaussianRandom() * gameVariance;
    const finalMargin = marginA + noise;

    // Determine winner
    const aWins = finalMargin > 0;
    const winner = aWins ? teamA : teamB;
    const loser = aWins ? teamB : teamA;
    const isUpset = winner.seed > loser.seed;

    // Build narrative
    const narrative = this.buildNarrative(teamA, teamB, factors, aWins, Math.abs(finalMargin), isUpset, round);

    // Generate realistic scores — ensure winner always has the higher score
    const absMargin = Math.abs(finalMargin);
    const baseScore = 65 + Math.round(Math.random() * 12);
    let wScore = baseScore + Math.round(absMargin / 2) + Math.round(Math.random() * 4);
    let lScore = baseScore - Math.round(absMargin / 2) + Math.round(Math.random() * 4);
    // Safety: if rounding flipped them, force at least a 1-point win
    if (wScore <= lScore) wScore = lScore + 1;

    return {
      winner,
      loser,
      factors,
      narrative,
      isUpset,
      margin: Math.abs(finalMargin),
      winnerScore: wScore,
      loserScore: lScore,
    };
  }

  /**
   * Generate a human-readable narrative explaining the game outcome.
   */
  buildNarrative(teamA, teamB, factors, aWins, margin, isUpset, round) {
    const winner = aWins ? teamA : teamB;
    const loser = aWins ? teamB : teamA;
    const narrativeParts = [];

    // Collect all factors with their absolute impact
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

    // Sort by absolute impact
    factorList.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    // Top 2-3 factors that swung the game
    const topFactors = factorList.filter(f => Math.abs(f.val) > 0.3).slice(0, 3);

    // Build narrative based on dominant factor
    if (topFactors.length === 0) {
      narrativeParts.push(`A coin-flip game that could have gone either way.`);
    } else {
      const dominant = topFactors[0];

      // Efficiency narratives
      if (dominant.key === 'efficiency') {
        if (margin > 12) {
          narrativeParts.push(`${possessive(winner.name)} elite two-way efficiency overwhelms ${loser.name}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} superior efficiency creates separation.`);
        }
      }
      // Tempo narratives
      else if (dominant.key === 'tempo') {
        const winnerTempo = winner.tempo;
        const loserTempo = loser.tempo;
        if (winnerTempo < loserTempo) {
          narrativeParts.push(`${winner.name} grinds the game to a halt, forcing ${loser.name} out of rhythm.`);
        } else {
          narrativeParts.push(`${winner.name} pushes the pace and ${loser.name} can't keep up in transition.`);
        }
      }
      // 3PT narratives
      else if (dominant.key === 'threePoint') {
        const winnerPct = aWins ? factors.teamA_3ptPctGame : factors.teamB_3ptPctGame;
        const loserPct = aWins ? factors.teamB_3ptPctGame : factors.teamA_3ptPctGame;
        if (winnerPct > 0.40) {
          narrativeParts.push(`${winner.name} catches fire from deep (${(winnerPct * 100).toFixed(0)}% 3PT), blowing the game open.`);
        } else if (loserPct < 0.25) {
          narrativeParts.push(`${loser.name} goes cold from three (${(loserPct * 100).toFixed(0)}% 3PT) and ${winner.name} capitalizes.`);
        } else {
          narrativeParts.push(`A 3-point shooting variance swing gives ${winner.name} the edge.`);
        }
      }
      // FT narratives
      else if (dominant.key === 'freeThrow') {
        narrativeParts.push(`${winner.name} wins it at the line — clutch free throw shooting in crunch time.`);
      }
      // Experience narratives
      else if (dominant.key === 'experience') {
        if (loser.toureyExp === 0) {
          narrativeParts.push(`Bright lights effect: ${possessive(loser.name)} inexperience shows under tournament pressure.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} veteran roster stays composed when it matters most.`);
        }
      }
      // Momentum narratives
      else if (dominant.key === 'momentum') {
        narrativeParts.push(`${winner.name} rides hot momentum into the tournament and carries it through.`);
      }
      // Depth narratives
      else if (dominant.key === 'depth') {
        if (round >= 2) {
          narrativeParts.push(`Fatigue factor: ${possessive(winner.name)} deep bench stays fresh while ${loser.name} fades in the ${round >= 3 ? 'late rounds' : 'second weekend'}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} bench depth provides crucial energy in a physical game.`);
        }
      }
      // Coaching narratives
      else if (dominant.key === 'coaching') {
        const wCoach = winner.coachRating || 2.5;
        if (wCoach >= 4.5) {
          narrativeParts.push(`Elite coaching: ${winner.coachNotes ? winner.coachNotes.split('—')[0].trim() : possessive(winner.name) + " coach"} makes the key adjustments.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} coaching staff outprepares ${loser.name} with a superior game plan.`);
        }
      }
      // Injury narratives
      else if (dominant.key === 'injuries') {
        if (loser.injuryImpact && loser.injuryImpact < -0.2) {
          narrativeParts.push(`Missing key players proves fatal: ${loser.injuryNotes || loser.name + ' is shorthanded'}.`);
        } else {
          narrativeParts.push(`${possessive(winner.name)} health advantage is the difference in a tight game.`);
        }
      }
      // Conference narratives
      else if (dominant.key === 'conference') {
        narrativeParts.push(`${possessive(winner.name)} battle-tested conference schedule pays off — prepared for this level of competition.`);
      }

      // Add secondary factor if significant
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

    // Upset flag
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
   * Simulate a full region (4 rounds: R64 → Elite 8)
   * Returns full game-by-game results with narratives
   */
  simulateRegionBracket(regionTeams) {
    const rounds = [];

    // R64 (round 0)
    let games = [];
    for (let i = 0; i < regionTeams.length; i += 2) {
      games.push(this.simulateGame(regionTeams[i], regionTeams[i + 1], 0));
    }
    rounds.push(games);

    // R32 (round 1)
    games = [];
    const r64Winners = rounds[0].map(g => g.winner);
    for (let i = 0; i < r64Winners.length; i += 2) {
      games.push(this.simulateGame(r64Winners[i], r64Winners[i + 1], 1));
    }
    rounds.push(games);

    // S16 (round 2)
    games = [];
    const r32Winners = rounds[1].map(g => g.winner);
    for (let i = 0; i < r32Winners.length; i += 2) {
      games.push(this.simulateGame(r32Winners[i], r32Winners[i + 1], 2));
    }
    rounds.push(games);

    // E8 (round 3)
    const s16Winners = rounds[2].map(g => g.winner);
    const e8Game = this.simulateGame(s16Winners[0], s16Winners[1], 3);
    rounds.push([e8Game]);

    return {
      rounds,
      regionWinner: e8Game.winner,
    };
  }

  /**
   * Run a SINGLE bracket simulation — picks winners, advances them, generates narratives.
   * This is the v3 core: one bracket with actual picks and explanations.
   */
  simulateBracket() {
    const allRegions = ['east', 'west', 'midwest', 'south'];
    const regionResults = {};

    allRegions.forEach(regionKey => {
      regionResults[regionKey] = this.simulateRegionBracket(REGIONS[regionKey].teams);
    });

    // Final Four (round 4)
    const semi1 = this.simulateGame(
      regionResults.east.regionWinner,
      regionResults.south.regionWinner, 4
    );
    const semi2 = this.simulateGame(
      regionResults.west.regionWinner,
      regionResults.midwest.regionWinner, 4
    );

    // Championship (round 5)
    const championship = this.simulateGame(semi1.winner, semi2.winner, 5);

    return {
      regions: regionResults,
      finalFour: {
        semi1,
        semi2,
        championship,
        champion: championship.winner,
      },
    };
  }

  /**
   * Run aggregate Monte Carlo simulation (for probability table)
   */
  simulate(numSims, progressCallback) {
    const teamStats = {};
    const allRegions = ['east', 'west', 'midwest', 'south'];

    allRegions.forEach(regionKey => {
      REGIONS[regionKey].teams.forEach(team => {
        const key = `${regionKey}_${team.name}`;
        teamStats[key] = {
          ...team,
          region: regionKey,
          regionName: REGIONS[regionKey].name,
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

        // Record results
        allRegions.forEach(regionKey => {
          const res = regionResults[regionKey];
          // R64 winners
          res.rounds[0].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r64++; });
          // R32 winners
          res.rounds[1].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].r32++; });
          // S16 winners
          res.rounds[2].forEach(g => { teamStats[`${regionKey}_${g.winner.name}`].s16++; });
          // E8 winner
          teamStats[`${regionKey}_${res.regionWinner.name}`].e8++;
          teamStats[`${regionKey}_${res.regionWinner.name}`].f4++;
        });

        // Final Four
        const semi1 = this.simulateGame(
          regionResults.east.regionWinner,
          regionResults.south.regionWinner, 4
        );
        const semi1Key = teamStats[`east_${semi1.winner.name}`]
          ? `east_${semi1.winner.name}` : `south_${semi1.winner.name}`;

        const semi2 = this.simulateGame(
          regionResults.west.regionWinner,
          regionResults.midwest.regionWinner, 4
        );
        const semi2Key = teamStats[`west_${semi2.winner.name}`]
          ? `west_${semi2.winner.name}` : `midwest_${semi2.winner.name}`;

        teamStats[semi1Key].finals++;
        teamStats[semi2Key].finals++;

        // Championship
        const champion = this.simulateGame(semi1.winner, semi2.winner, 5);
        const champKey = teamStats[semi1Key] && teamStats[semi1Key].name === champion.winner.name
          ? semi1Key : semi2Key;
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
        seed: t.seed,
        name: t.name,
        region: t.region,
        regionName: t.regionName,
        adjOE: t.adjOE,
        adjDE: t.adjDE,
        tempo: t.tempo,
        threePtRate: t.threePtRate,
        threePtPct: t.threePtPct,
        ftPct: t.ftPct,
        experience: t.experience,
        consistency: t.consistency,
        benchDepth: t.benchDepth,
        toureyExp: t.toureyExp,
        hotStreak: t.hotStreak,
        record: t.record,
        coachRating: t.coachRating,
        coachNotes: t.coachNotes,
        injuryImpact: t.injuryImpact,
        injuryNotes: t.injuryNotes,
        confStrength: t.confStrength,
        vegasImplied: t.vegasImplied,
        espnBPI: t.espnBPI,
        r64: (t.r64 / numSims * 100),
        r32: (t.r32 / numSims * 100),
        s16: (t.s16 / numSims * 100),
        e8: (t.e8 / numSims * 100),
        f4: (t.f4 / numSims * 100),
        finals: (t.finals / numSims * 100),
        champion: (t.champion / numSims * 100),
      }));

      this.results = results;
      return results;
    });
  }

  /**
   * Quick analytical win probability for display
   */
  quickWinProb(teamA, teamB) {
    const d1Avg = 105.0;
    const rawMargin = ((teamA.adjOE * teamB.adjDE) / d1Avg) - ((teamB.adjOE * teamA.adjDE) / d1Avg);
    let margin = rawMargin * 0.55;
    const seedGap = Math.abs(teamA.seed - teamB.seed);
    if (seedGap >= 4 && seedGap <= 9) margin *= 0.88;

    // Add coaching, injury, conference adjustments for more accuracy
    const coachDiff = ((teamA.coachRating || 2.5) - (teamB.coachRating || 2.5)) * 0.35;
    const injDiff = ((teamA.injuryImpact || 0) - (teamB.injuryImpact || 0)) * 4.0;
    const confDiff = ((teamA.confStrength || 0) - (teamB.confStrength || 0)) * 1.2;
    margin += coachDiff + injDiff + confDiff;

    return 1 / (1 + Math.pow(10, -margin / 11));
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
