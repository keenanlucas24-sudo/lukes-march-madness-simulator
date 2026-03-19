/**
 * Monte Carlo Tournament Simulation Engine
 * 
 * Uses a logistic win probability model calibrated to historical
 * NCAA tournament upset rates. Rating differentials map to
 * realistic outcomes (e.g., 1-seed beats 16-seed ~99%, 
 * 5-seed beats 12-seed ~64%).
 */

class SimulationEngine {
  constructor() {
    this.results = null;
  }

  /**
   * Win probability using logistic function
   * P(A beats B) = 1 / (1 + 10^((ratingB - ratingA) / scaleFactor))
   * scaleFactor controls upset frequency — 15 is calibrated to NCAA historical data
   */
  winProbability(ratingA, ratingB) {
    const diff = ratingA - ratingB;
    return 1 / (1 + Math.pow(10, -diff / 15));
  }

  /**
   * Simulate a single game
   */
  simulateGame(teamA, teamB) {
    const prob = this.winProbability(teamA.rating, teamB.rating);
    return Math.random() < prob ? teamA : teamB;
  }

  /**
   * Simulate a single region (4 rounds: R64 → Elite 8)
   * Returns the region winner and round-by-round results
   */
  simulateRegion(regionTeams) {
    // Teams are ordered as matchup pairs: [1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15]
    let currentRound = [];
    
    // R64: 8 games
    for (let i = 0; i < regionTeams.length; i += 2) {
      currentRound.push(this.simulateGame(regionTeams[i], regionTeams[i + 1]));
    }
    const r64Winners = [...currentRound];

    // R32: 4 games (winners play in order: 1/16 winner vs 8/9 winner, etc.)
    let nextRound = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      nextRound.push(this.simulateGame(currentRound[i], currentRound[i + 1]));
    }
    const r32Winners = [...nextRound];
    currentRound = nextRound;

    // Sweet 16: 2 games
    nextRound = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      nextRound.push(this.simulateGame(currentRound[i], currentRound[i + 1]));
    }
    const s16Winners = [...nextRound];
    currentRound = nextRound;

    // Elite 8: 1 game
    const regionWinner = this.simulateGame(currentRound[0], currentRound[1]);

    return {
      r64Winners,
      r32Winners,
      s16Winners,
      regionWinner
    };
  }

  /**
   * Run full tournament simulation N times
   * Returns aggregated probabilities for each team reaching each round
   */
  simulate(numSims, progressCallback) {
    // Initialize counters for every team
    const teamStats = {};
    const allRegions = ['east', 'west', 'midwest', 'south'];
    
    allRegions.forEach(regionKey => {
      REGIONS[regionKey].teams.forEach(team => {
        const key = `${regionKey}_${team.name}`;
        teamStats[key] = {
          ...team,
          region: regionKey,
          regionName: REGIONS[regionKey].name,
          r64: 0,   // Won first round
          r32: 0,   // Won second round
          s16: 0,   // Made Sweet 16 (won second round)
          e8: 0,    // Made Elite 8
          f4: 0,    // Made Final Four
          finals: 0, // Made Finals
          champion: 0 // Won championship
        };
      });
    });

    const batchSize = 100;
    let completed = 0;

    const runBatch = () => {
      const end = Math.min(completed + batchSize, numSims);
      
      for (let sim = completed; sim < end; sim++) {
        // Simulate each region
        const regionResults = {};
        allRegions.forEach(regionKey => {
          regionResults[regionKey] = this.simulateRegion(REGIONS[regionKey].teams);
        });

        // Record region results
        allRegions.forEach(regionKey => {
          const res = regionResults[regionKey];
          const teams = REGIONS[regionKey].teams;

          // R64 winners
          res.r64Winners.forEach(w => {
            teamStats[`${regionKey}_${w.name}`].r64++;
          });

          // R32 winners
          res.r32Winners.forEach(w => {
            teamStats[`${regionKey}_${w.name}`].r32++;
          });

          // Sweet 16 / Elite 8 winners  
          res.s16Winners.forEach(w => {
            teamStats[`${regionKey}_${w.name}`].s16++;
          });

          // Region winner = Elite 8 winner = Final Four
          teamStats[`${regionKey}_${res.regionWinner.name}`].e8++;
          teamStats[`${regionKey}_${res.regionWinner.name}`].f4++;
        });

        // Final Four: East vs South, West vs Midwest
        const semi1Winner = this.simulateGame(
          regionResults.east.regionWinner,
          regionResults.south.regionWinner
        );
        const semi1Key = allRegions.includes('east') && regionResults.east.regionWinner.name === semi1Winner.name 
          ? `east_${semi1Winner.name}` : `south_${semi1Winner.name}`;
        
        const semi2Winner = this.simulateGame(
          regionResults.west.regionWinner,
          regionResults.midwest.regionWinner
        );
        const semi2Key = regionResults.west.regionWinner.name === semi2Winner.name 
          ? `west_${semi2Winner.name}` : `midwest_${semi2Winner.name}`;

        teamStats[semi1Key].finals++;
        teamStats[semi2Key].finals++;

        // Championship
        const champion = this.simulateGame(semi1Winner, semi2Winner);
        const champKey = teamStats[semi1Key] && teamStats[semi1Key].name === champion.name 
          ? semi1Key : semi2Key;
        teamStats[champKey].champion++;
      }

      completed = end;
      
      if (progressCallback) {
        progressCallback(completed / numSims);
      }

      if (completed < numSims) {
        return new Promise(resolve => setTimeout(() => resolve(runBatch()), 0));
      }
      
      return Promise.resolve();
    };

    return runBatch().then(() => {
      // Convert counts to percentages
      const results = Object.values(teamStats).map(t => ({
        seed: t.seed,
        name: t.name,
        region: t.region,
        regionName: t.regionName,
        rating: t.rating,
        record: t.record,
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
   * Get matchup win probabilities for the bracket view
   */
  getMatchupProbabilities(regionKey) {
    const teams = REGIONS[regionKey].teams;
    const matchups = [];
    for (let i = 0; i < teams.length; i += 2) {
      const probA = this.winProbability(teams[i].rating, teams[i + 1].rating);
      matchups.push({
        teamA: { ...teams[i], prob: probA },
        teamB: { ...teams[i + 1], prob: 1 - probA }
      });
    }
    return matchups;
  }
}

const engine = new SimulationEngine();
