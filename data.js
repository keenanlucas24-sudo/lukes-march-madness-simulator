/**
 * 2026 NCAA Tournament — Enhanced Multi-Factor Team Data v3
 * 
 * Now includes 15 factors per team:
 * 
 * CORE STATS (KenPom-based):
 * - adjOE:      Adjusted Offensive Efficiency (pts per 100 possessions)
 * - adjDE:      Adjusted Defensive Efficiency (pts allowed per 100 poss)
 * - tempo:      Adjusted tempo (possessions per game)
 * - threePtRate: % of shot attempts that are 3-pointers
 * - threePtPct:  3-point shooting percentage
 * - ftPct:       Free throw percentage
 * - experience:  Roster experience (avg years in college, 0-5 scale)
 * - consistency: Performance volatility (0-1, higher = more consistent)
 * - benchDepth:  Bench minutes percentage
 * - sos:         Strength of schedule rank (lower = harder)
 * - toureyExp:   Program tournament experience (0-5)
 * - hotStreak:   Momentum entering tournament (-2 to +2)
 * 
 * NEW v3 FACTORS:
 * - coachRating:    Head coach tournament pedigree (0-5 scale)
 *                   Based on career tournament wins, Final Fours, championships
 * - injuryImpact:   Team-level injury/suspension impact (-1 to 0)
 *                   0 = fully healthy, -1 = devastating loss
 *                   Based on PPG/usage of missing players
 * - confStrength:   Conference strength adjustment (-0.5 to +0.5)
 *                   Based on NET conference rankings, recent champion production
 * - vegasImplied:   DraftKings championship implied probability (0-1)
 *                   Represents the market's aggregate view
 * - vegasSpread:    First round spread (negative = favored)
 *                   Used to calibrate game-level predictions
 * - espnBPI:        ESPN BPI championship win probability (0-1)
 * - coachNotes:     Brief coaching tournament history
 * - injuryNotes:    Key injury/availability details
 * 
 * Sources: KenPom, ESPN BPI, DraftKings, FanDuel, BetMGM, CBS Sports,
 *          RotoWire, Yahoo Sports, Action Network, VSiN
 */

const REGIONS = {
  east: {
    name: "East",
    teams: [
      { seed: 1,  name: "Duke",           adjOE: 128.0, adjDE: 89.1,  tempo: 69.5, threePtRate: 0.445, threePtPct: 0.368, ftPct: 0.755, experience: 2.1,  consistency: 0.88, benchDepth: 0.33, sos: 1,   toureyExp: 4, hotStreak: 1.5,  record: "32-2",
        coachRating: 4.0, coachNotes: "Scheyer 8-3 in tourney, 1 Final Four (2025), youngest coach to reach F4 since 2011",
        injuryImpact: -0.35, injuryNotes: "Khaman Maluach (calf, day-to-day), Isaiah Evans (ankle, day-to-day) — two key rotation pieces questionable",
        confStrength: 0.15, vegasImplied: 0.222, vegasSpread: -27.5, espnBPI: 0.244 },

      { seed: 16, name: "Siena",          adjOE: 103.5, adjDE: 105.8, tempo: 67.2, threePtRate: 0.350, threePtPct: 0.304, ftPct: 0.705, experience: 2.8,  consistency: 0.60, benchDepth: 0.29, sos: 184, toureyExp: 1, hotStreak: 0.5,  record: "23-11",
        coachRating: 1.0, coachNotes: "Limited tournament experience at this level",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.4, vegasImplied: 0.0005, vegasSpread: 27.5, espnBPI: 0.001 },

      { seed: 8,  name: "Ohio State",     adjOE: 115.2, adjDE: 97.0,  tempo: 68.8, threePtRate: 0.400, threePtPct: 0.352, ftPct: 0.740, experience: 2.5,  consistency: 0.62, benchDepth: 0.31, sos: 31,  toureyExp: 3, hotStreak: 0.5,  record: "21-11",
        coachRating: 2.0, coachNotes: "Jake Diebler in 2nd full season, limited tournament track record",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.25, vegasImplied: 0.004, vegasSpread: -2.5, espnBPI: 0.001 },

      { seed: 9,  name: "TCU",            adjOE: 113.8, adjDE: 98.2,  tempo: 67.5, threePtRate: 0.380, threePtPct: 0.340, ftPct: 0.725, experience: 2.7,  consistency: 0.58, benchDepth: 0.30, sos: 38,  toureyExp: 2, hotStreak: 0.0,  record: "22-11",
        coachRating: 2.0, coachNotes: "Jamie Dixon, experienced but no deep runs recently",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.30, vegasImplied: 0.002, vegasSpread: 2.5, espnBPI: 0.001 },

      { seed: 5,  name: "St. John's",     adjOE: 118.5, adjDE: 96.2,  tempo: 69.0, threePtRate: 0.370, threePtPct: 0.350, ftPct: 0.745, experience: 2.9,  consistency: 0.72, benchDepth: 0.32, sos: 21,  toureyExp: 2, hotStreak: 1.0,  record: "26-6",
        coachRating: 5.0, coachNotes: "Rick Pitino — 2 national titles, 7 Final Fours, 22-11 career tourney record. Elite March pedigree",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.30, vegasImplied: 0.016, vegasSpread: -9.5, espnBPI: 0.005 },

      { seed: 12, name: "Northern Iowa",  adjOE: 106.8, adjDE: 99.5,  tempo: 63.4, threePtRate: 0.340, threePtPct: 0.342, ftPct: 0.730, experience: 3.2,  consistency: 0.75, benchDepth: 0.28, sos: 71,  toureyExp: 2, hotStreak: 0.5,  record: "22-12",
        coachRating: 1.5, coachNotes: "Ben Jacobson, veteran mid-major coach with some tourney success",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.15, vegasImplied: 0.0005, vegasSpread: 9.5, espnBPI: 0.001 },

      { seed: 4,  name: "Kansas",         adjOE: 119.8, adjDE: 93.5,  tempo: 68.2, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.735, experience: 2.3,  consistency: 0.68, benchDepth: 0.35, sos: 18,  toureyExp: 5, hotStreak: 0.0,  record: "23-9",
        coachRating: 4.5, coachNotes: "Bill Self — 2008 champion, 4 Final Fours, 32-16 career tourney record. All-time great March coach",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.35, vegasImplied: 0.013, vegasSpread: -14.5, espnBPI: 0.005 },

      { seed: 13, name: "Cal Baptist",    adjOE: 104.2, adjDE: 103.5, tempo: 66.8, threePtRate: 0.360, threePtPct: 0.338, ftPct: 0.710, experience: 2.6,  consistency: 0.55, benchDepth: 0.27, sos: 145, toureyExp: 0, hotStreak: 0.5,  record: "20-12",
        coachRating: 0.5, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.35, vegasImplied: 0.001, vegasSpread: 14.5, espnBPI: 0.001 },

      { seed: 6,  name: "Louisville",     adjOE: 117.0, adjDE: 94.8,  tempo: 69.8, threePtRate: 0.390, threePtPct: 0.355, ftPct: 0.730, experience: 2.2,  consistency: 0.65, benchDepth: 0.34, sos: 16,  toureyExp: 3, hotStreak: 0.5,  record: "23-10",
        coachRating: 3.0, coachNotes: "Pat Kelsey, first year at Louisville, limited tourney HC record",
        injuryImpact: -0.40, injuryNotes: "Mikel Brown OUT (back injury) — 13.2 PPG, key rotation player",
        confStrength: 0.15, vegasImplied: 0.008, vegasSpread: -4.5, espnBPI: 0.009 },

      { seed: 11, name: "South Florida",  adjOE: 111.5, adjDE: 98.8,  tempo: 67.5, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.720, experience: 3.0,  consistency: 0.63, benchDepth: 0.30, sos: 48,  toureyExp: 1, hotStreak: 1.0,  record: "25-8",
        coachRating: 1.5, coachNotes: "Amir Abdur-Rahim, building the program, limited tourney track record",
        injuryImpact: 0, injuryNotes: "Healthy — 19-3 over last 22 games",
        confStrength: 0.0, vegasImplied: 0.001, vegasSpread: 4.5, espnBPI: 0.001 },

      { seed: 3,  name: "Michigan State",  adjOE: 120.5, adjDE: 93.8,  tempo: 70.2, threePtRate: 0.360, threePtPct: 0.340, ftPct: 0.710, experience: 2.8,  consistency: 0.78, benchDepth: 0.36, sos: 11,  toureyExp: 5, hotStreak: 0.5,  record: "25-6",
        coachRating: 5.0, coachNotes: "Tom Izzo — 2000 champion, 8 Final Fours, iconic March coach. Mr. March",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.20, vegasImplied: 0.022, vegasSpread: -16.5, espnBPI: 0.013 },

      { seed: 14, name: "N. Dakota St.",  adjOE: 105.5, adjDE: 102.0, tempo: 66.5, threePtRate: 0.350, threePtPct: 0.345, ftPct: 0.715, experience: 3.1,  consistency: 0.58, benchDepth: 0.26, sos: 115, toureyExp: 1, hotStreak: 0.5,  record: "24-7",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.30, vegasImplied: 0.0005, vegasSpread: 16.5, espnBPI: 0.001 },

      { seed: 7,  name: "UCLA",           adjOE: 114.8, adjDE: 97.5,  tempo: 68.0, threePtRate: 0.380, threePtPct: 0.342, ftPct: 0.735, experience: 2.4,  consistency: 0.60, benchDepth: 0.32, sos: 33,  toureyExp: 4, hotStreak: -0.5, record: "22-10",
        coachRating: 3.5, coachNotes: "Mick Cronin, consistent tourney presence, 2021 Final Four",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.20, vegasImplied: 0.005, vegasSpread: -5.5, espnBPI: 0.001 },

      { seed: 10, name: "UCF",            adjOE: 113.0, adjDE: 99.0,  tempo: 68.5, threePtRate: 0.395, threePtPct: 0.350, ftPct: 0.725, experience: 2.6,  consistency: 0.55, benchDepth: 0.29, sos: 52,  toureyExp: 1, hotStreak: 0.0,  record: "21-11",
        coachRating: 1.5, coachNotes: "Limited tournament HC experience",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.05, vegasImplied: 0.002, vegasSpread: 5.5, espnBPI: 0.001 },

      { seed: 2,  name: "UConn",          adjOE: 123.5, adjDE: 92.0,  tempo: 67.8, threePtRate: 0.400, threePtPct: 0.360, ftPct: 0.762, experience: 2.6,  consistency: 0.82, benchDepth: 0.38, sos: 9,   toureyExp: 5, hotStreak: 1.0,  record: "29-5",
        coachRating: 5.0, coachNotes: "Dan Hurley — back-to-back champion (2023, 2024). 16-3 in last 3 tourneys. Elite tier",
        injuryImpact: 0, injuryNotes: "Healthy — large sharp bets backing UConn at sportsbooks",
        confStrength: 0.30, vegasImplied: 0.032, vegasSpread: -20.5, espnBPI: 0.025 },

      { seed: 15, name: "Furman",         adjOE: 104.0, adjDE: 104.5, tempo: 66.0, threePtRate: 0.355, threePtPct: 0.340, ftPct: 0.720, experience: 3.3,  consistency: 0.60, benchDepth: 0.25, sos: 187, toureyExp: 1, hotStreak: 0.0,  record: "19-12",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.35, vegasImplied: 0.001, vegasSpread: 20.5, espnBPI: 0.001 },
    ]
  },
  west: {
    name: "West",
    teams: [
      { seed: 1,  name: "Arizona",        adjOE: 126.5, adjDE: 90.0,  tempo: 69.0, threePtRate: 0.410, threePtPct: 0.365, ftPct: 0.750, experience: 2.2,  consistency: 0.87, benchDepth: 0.35, sos: 3,   toureyExp: 4, hotStreak: 1.5,  record: "32-2",
        coachRating: 3.5, coachNotes: "Tommy Lloyd, 2022 Pac-12 COTY, one Elite Eight appearance. Rising coach",
        injuryImpact: 0, injuryNotes: "Healthy — most public money in futures (22.3% of handle)",
        confStrength: 0.35, vegasImplied: 0.208, vegasSpread: -30.5, espnBPI: 0.140 },

      { seed: 16, name: "LIU",            adjOE: 100.0, adjDE: 108.5, tempo: 68.0, threePtRate: 0.365, threePtPct: 0.310, ftPct: 0.668, experience: 2.5,  consistency: 0.48, benchDepth: 0.24, sos: 220, toureyExp: 0, hotStreak: 0.0,  record: "24-10",
        coachRating: 0.5, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.45, vegasImplied: 0.001, vegasSpread: 30.5, espnBPI: 0.001 },

      { seed: 8,  name: "Villanova",      adjOE: 114.5, adjDE: 97.8,  tempo: 66.5, threePtRate: 0.405, threePtPct: 0.355, ftPct: 0.760, experience: 2.7,  consistency: 0.64, benchDepth: 0.30, sos: 36,  toureyExp: 4, hotStreak: 0.5,  record: "24-8",
        coachRating: 3.0, coachNotes: "Kyle Neptune, limited tourney HC record; program has elite March DNA",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.30, vegasImplied: 0.004, vegasSpread: 1.5, espnBPI: 0.001 },

      { seed: 9,  name: "Utah State",     adjOE: 115.0, adjDE: 97.2,  tempo: 67.0, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.735, experience: 3.0,  consistency: 0.70, benchDepth: 0.31, sos: 28,  toureyExp: 2, hotStreak: 0.5,  record: "25-6",
        coachRating: 2.0, coachNotes: "Jerrod Calhoun, solid mid-major coach",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.10, vegasImplied: 0.002, vegasSpread: -1.5, espnBPI: 0.001 },

      { seed: 5,  name: "Wisconsin",      adjOE: 116.0, adjDE: 96.5,  tempo: 64.8, threePtRate: 0.365, threePtPct: 0.350, ftPct: 0.755, experience: 3.1,  consistency: 0.74, benchDepth: 0.32, sos: 27,  toureyExp: 4, hotStreak: 0.5,  record: "23-9",
        coachRating: 3.5, coachNotes: "Greg Gard, 2023 Sweet 16, consistent tourney producer. Wisconsin system coach",
        injuryImpact: 0, injuryNotes: "Healthy — line moved from -12.5 to -10 (sharp money on High Point)",
        confStrength: 0.20, vegasImplied: 0.013, vegasSpread: -10.5, espnBPI: 0.002 },

      { seed: 12, name: "High Point",     adjOE: 108.5, adjDE: 101.0, tempo: 70.5, threePtRate: 0.385, threePtPct: 0.355, ftPct: 0.725, experience: 2.9,  consistency: 0.62, benchDepth: 0.28, sos: 110, toureyExp: 0, hotStreak: 2.0,  record: "28-5",
        coachRating: 1.0, coachNotes: "Tubby Smith, has national championship experience (2006 at Memphis path) but aging",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money moved line from WIS -12.5 to -10",
        confStrength: -0.20, vegasImplied: 0.001, vegasSpread: 10.5, espnBPI: 0.001 },

      { seed: 4,  name: "Arkansas",       adjOE: 122.0, adjDE: 95.0,  tempo: 71.5, threePtRate: 0.400, threePtPct: 0.348, ftPct: 0.720, experience: 2.0,  consistency: 0.65, benchDepth: 0.34, sos: 17,  toureyExp: 3, hotStreak: 1.0,  record: "23-8",
        coachRating: 4.0, coachNotes: "John Calipari — 2012 champion, 4 Final Fours, elite recruiter. 1st year at Arkansas",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money on Hawaii +15.5 against them",
        confStrength: 0.15, vegasImplied: 0.020, vegasSpread: -15.5, espnBPI: 0.006 },

      { seed: 13, name: "Hawaii",         adjOE: 107.0, adjDE: 102.5, tempo: 68.2, threePtRate: 0.375, threePtPct: 0.340, ftPct: 0.710, experience: 2.8,  consistency: 0.55, benchDepth: 0.26, sos: 110, toureyExp: 1, hotStreak: 0.0,  record: "20-8",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money backing them +15.5 (59% of handle, only 38% of bets)",
        confStrength: -0.25, vegasImplied: 0.001, vegasSpread: 15.5, espnBPI: 0.001 },

      { seed: 6,  name: "BYU",            adjOE: 117.5, adjDE: 96.0,  tempo: 68.5, threePtRate: 0.410, threePtPct: 0.362, ftPct: 0.740, experience: 2.8,  consistency: 0.62, benchDepth: 0.33, sos: 23,  toureyExp: 2, hotStreak: -0.5, record: "23-11",
        coachRating: 2.5, coachNotes: "Kevin Young, limited tourney HC record",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.35, vegasImplied: 0.004, vegasSpread: -1.5, espnBPI: 0.002 },

      { seed: 11, name: "Texas",          adjOE: 112.0, adjDE: 98.0,  tempo: 68.0, threePtRate: 0.380, threePtPct: 0.338, ftPct: 0.715, experience: 2.74, consistency: 0.52, benchDepth: 0.30, sos: 42,  toureyExp: 4, hotStreak: 0.5,  record: "18-14",
        coachRating: 2.5, coachNotes: "Terry Carlton, First Four win shows momentum",
        injuryImpact: 0, injuryNotes: "Won First Four game vs NC State",
        confStrength: 0.15, vegasImplied: 0.002, vegasSpread: 1.5, espnBPI: 0.001 },

      { seed: 3,  name: "Gonzaga",        adjOE: 124.0, adjDE: 94.2,  tempo: 71.0, threePtRate: 0.385, threePtPct: 0.358, ftPct: 0.745, experience: 2.4,  consistency: 0.80, benchDepth: 0.42, sos: 6,   toureyExp: 5, hotStreak: 1.0,  record: "30-3",
        coachRating: 4.5, coachNotes: "Mark Few — 2 championship game appearances, multiple Elite Eights. Perennial contender",
        injuryImpact: -0.50, injuryNotes: "Braden Huff OUT (17.8 PPG) — massive loss to starting lineup and offensive production",
        confStrength: 0.05, vegasImplied: 0.024, vegasSpread: -20.5, espnBPI: 0.037 },

      { seed: 14, name: "Kennesaw St.",   adjOE: 105.0, adjDE: 103.0, tempo: 67.0, threePtRate: 0.360, threePtPct: 0.335, ftPct: 0.700, experience: 2.9,  consistency: 0.52, benchDepth: 0.25, sos: 130, toureyExp: 1, hotStreak: 0.5,  record: "22-10",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.30, vegasImplied: 0.001, vegasSpread: 20.5, espnBPI: 0.001 },

      { seed: 7,  name: "Miami (FL)",     adjOE: 115.5, adjDE: 97.0,  tempo: 67.5, threePtRate: 0.390, threePtPct: 0.348, ftPct: 0.742, experience: 2.9,  consistency: 0.65, benchDepth: 0.31, sos: 30,  toureyExp: 3, hotStreak: 0.5,  record: "25-7",
        coachRating: 3.5, coachNotes: "Jim Larrañaga — 2023 Final Four, 2022 Elite Eight. Proven March performer",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money backing them -1.5 vs Missouri",
        confStrength: 0.15, vegasImplied: 0.002, vegasSpread: -1.5, espnBPI: 0.001 },

      { seed: 10, name: "Missouri",       adjOE: 112.5, adjDE: 99.5,  tempo: 69.0, threePtRate: 0.385, threePtPct: 0.340, ftPct: 0.718, experience: 2.5,  consistency: 0.55, benchDepth: 0.29, sos: 58,  toureyExp: 2, hotStreak: 0.0,  record: "20-12",
        coachRating: 2.0, coachNotes: "Dennis Gates, limited tourney HC record",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.15, vegasImplied: 0.002, vegasSpread: 1.5, espnBPI: 0.001 },

      { seed: 2,  name: "Purdue",         adjOE: 131.6, adjDE: 94.5,  tempo: 68.5, threePtRate: 0.395, threePtPct: 0.372, ftPct: 0.770, experience: 2.8,  consistency: 0.78, benchDepth: 0.35, sos: 8,   toureyExp: 5, hotStreak: 1.5,  record: "27-8",
        coachRating: 4.0, coachNotes: "Matt Painter — 2024 championship game, 2023/2024 back-to-back Final Fours. Elite recent run",
        injuryImpact: 0, injuryNotes: "Healthy — $100K Final Four bet placed at BetMGM, 8.9% of all championship handle",
        confStrength: 0.20, vegasImplied: 0.038, vegasSpread: -25.5, espnBPI: 0.043 },

      { seed: 15, name: "Queens",         adjOE: 102.5, adjDE: 106.0, tempo: 66.5, threePtRate: 0.355, threePtPct: 0.330, ftPct: 0.695, experience: 3.0,  consistency: 0.50, benchDepth: 0.24, sos: 190, toureyExp: 0, hotStreak: 0.0,  record: "20-13",
        coachRating: 0.5, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.40, vegasImplied: 0.0005, vegasSpread: 25.5, espnBPI: 0.001 },
    ]
  },
  midwest: {
    name: "Midwest",
    teams: [
      { seed: 1,  name: "Michigan",       adjOE: 124.5, adjDE: 89.0,  tempo: 67.8, threePtRate: 0.390, threePtPct: 0.358, ftPct: 0.752, experience: 2.3,  consistency: 0.90, benchDepth: 0.37, sos: 2,   toureyExp: 4, hotStreak: 1.0,  record: "31-3",
        coachRating: 3.5, coachNotes: "Dusty May, first year at Michigan, strong mid-major track record (FAU Final Four 2023)",
        injuryImpact: -0.20, injuryNotes: "LJ Cason OUT (season-ending ACL) — rotation contributor but not a top-2 player",
        confStrength: 0.20, vegasImplied: 0.213, vegasSpread: -30.5, espnBPI: 0.153 },

      { seed: 16, name: "Howard",         adjOE: 101.0, adjDE: 108.0, tempo: 69.5, threePtRate: 0.370, threePtPct: 0.315, ftPct: 0.680, experience: 2.6,  consistency: 0.45, benchDepth: 0.25, sos: 210, toureyExp: 1, hotStreak: 0.5,  record: "23-10",
        coachRating: 1.0, coachNotes: "Won First Four game vs UMBC",
        injuryImpact: 0, injuryNotes: "Healthy — won First Four",
        confStrength: -0.45, vegasImplied: 0.0005, vegasSpread: 30.5, espnBPI: 0.001 },

      { seed: 8,  name: "Georgia",        adjOE: 115.8, adjDE: 97.5,  tempo: 69.0, threePtRate: 0.385, threePtPct: 0.345, ftPct: 0.728, experience: 2.4,  consistency: 0.58, benchDepth: 0.30, sos: 32,  toureyExp: 1, hotStreak: 0.0,  record: "22-10",
        coachRating: 2.0, coachNotes: "Mike White, limited tourney success",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money backing Georgia -2.5 vs Saint Louis",
        confStrength: 0.15, vegasImplied: 0.002, vegasSpread: -2.5, espnBPI: 0.001 },

      { seed: 9,  name: "Saint Louis",    adjOE: 114.0, adjDE: 96.8,  tempo: 66.0, threePtRate: 0.395, threePtPct: 0.405, ftPct: 0.745, experience: 3.2,  consistency: 0.73, benchDepth: 0.29, sos: 29,  toureyExp: 2, hotStreak: 1.0,  record: "26-4",
        coachRating: 2.5, coachNotes: "Josh Schertz, strong mid-major coach (Indiana State success)",
        injuryImpact: 0, injuryNotes: "Healthy — 40.5% 3PT shooting is elite",
        confStrength: 0.05, vegasImplied: 0.002, vegasSpread: 2.5, espnBPI: 0.001 },

      { seed: 5,  name: "Texas Tech",     adjOE: 117.2, adjDE: 95.5,  tempo: 66.5, threePtRate: 0.375, threePtPct: 0.340, ftPct: 0.722, experience: 2.5,  consistency: 0.64, benchDepth: 0.194,sos: 20,  toureyExp: 3, hotStreak: 0.0,  record: "22-10",
        coachRating: 3.0, coachNotes: "Grant McCasland, 2nd year. Texas Tech has recent tourney DNA (2019 championship game)",
        injuryImpact: 0, injuryNotes: "Healthy but thin bench (19.4% bench minutes — worst in field)",
        confStrength: 0.35, vegasImplied: 0.008, vegasSpread: -7.5, espnBPI: 0.003 },

      { seed: 12, name: "Akron",          adjOE: 110.5, adjDE: 100.0, tempo: 68.0, threePtRate: 0.380, threePtPct: 0.352, ftPct: 0.725, experience: 3.1,  consistency: 0.65, benchDepth: 0.28, sos: 54,  toureyExp: 1, hotStreak: 1.0,  record: "25-5",
        coachRating: 1.5, coachNotes: "John Groce, limited tourney success",
        injuryImpact: 0, injuryNotes: "Healthy — public loves Akron +7.5",
        confStrength: -0.10, vegasImplied: 0.001, vegasSpread: 7.5, espnBPI: 0.001 },

      { seed: 4,  name: "Alabama",        adjOE: 129.0, adjDE: 97.5,  tempo: 74.6, threePtRate: 0.480, threePtPct: 0.355, ftPct: 0.715, experience: 1.8,  consistency: 0.55, benchDepth: 0.32, sos: 14,  toureyExp: 4, hotStreak: 0.5,  record: "23-8",
        coachRating: 4.5, coachNotes: "Nate Oats — 2023 Final Four, 2024 Sweet 16. Fast-paced system produces volatile outcomes",
        injuryImpact: -0.60, injuryNotes: "Latrell Holloway SUSPENDED (16.8 PPG, team's leading scorer) — devastating loss for tournament",
        confStrength: 0.15, vegasImplied: 0.005, vegasSpread: -11.5, espnBPI: 0.009 },

      { seed: 13, name: "Hofstra",        adjOE: 108.0, adjDE: 102.2, tempo: 68.5, threePtRate: 0.390, threePtPct: 0.348, ftPct: 0.718, experience: 3.0,  consistency: 0.58, benchDepth: 0.27, sos: 88,  toureyExp: 1, hotStreak: 0.5,  record: "22-10",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money backing Hofstra +11.5 vs Alabama",
        confStrength: -0.20, vegasImplied: 0.0005, vegasSpread: 11.5, espnBPI: 0.001 },

      { seed: 6,  name: "Tennessee",      adjOE: 112.8, adjDE: 92.5,  tempo: 65.0, threePtRate: 0.340, threePtPct: 0.325, ftPct: 0.710, experience: 2.6,  consistency: 0.72, benchDepth: 0.33, sos: 19,  toureyExp: 4, hotStreak: 0.0,  record: "22-10",
        coachRating: 4.0, coachNotes: "Rick Barnes — multiple Sweet 16s, Elite Eights across Texas and Tennessee. Proven",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.15, vegasImplied: 0.008, vegasSpread: -11.5, espnBPI: 0.010 },

      { seed: 11, name: "Miami (OH)",     adjOE: 112.0, adjDE: 99.0,  tempo: 67.5, threePtRate: 0.375, threePtPct: 0.352, ftPct: 0.732, experience: 3.4,  consistency: 0.80, benchDepth: 0.30, sos: 64,  toureyExp: 0, hotStreak: 1.5,  record: "31-1",
        coachRating: 1.5, coachNotes: "Travis Steele, strong regular season but first tournament for program",
        injuryImpact: 0, injuryNotes: "Healthy — 31-1 record, won First Four vs SMU. Most consistent mid-major",
        confStrength: -0.10, vegasImplied: 0.0007, vegasSpread: 11.5, espnBPI: 0.001 },

      { seed: 3,  name: "Virginia",       adjOE: 116.5, adjDE: 91.5,  tempo: 62.0, threePtRate: 0.345, threePtPct: 0.338, ftPct: 0.740, experience: 3.0,  consistency: 0.82, benchDepth: 0.34, sos: 13,  toureyExp: 4, hotStreak: 0.5,  record: "28-4",
        coachRating: 4.5, coachNotes: "Tony Bennett — 2019 champion. Slowest tempo in the field creates chaos. Pack-line defense master",
        injuryImpact: 0, injuryNotes: "Healthy — analysts see undervalued path in bottom half of Midwest",
        confStrength: 0.15, vegasImplied: 0.013, vegasSpread: -18.5, espnBPI: 0.005 },

      { seed: 14, name: "Wright State",   adjOE: 106.0, adjDE: 103.5, tempo: 68.5, threePtRate: 0.365, threePtPct: 0.342, ftPct: 0.705, experience: 2.8,  consistency: 0.50, benchDepth: 0.25, sos: 127, toureyExp: 1, hotStreak: 0.0,  record: "20-10",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.30, vegasImplied: 0.001, vegasSpread: 18.5, espnBPI: 0.001 },

      { seed: 7,  name: "Kentucky",       adjOE: 116.0, adjDE: 98.0,  tempo: 69.5, threePtRate: 0.385, threePtPct: 0.342, ftPct: 0.728, experience: 1.8,  consistency: 0.55, benchDepth: 0.31, sos: 26,  toureyExp: 5, hotStreak: -1.0, record: "21-12",
        coachRating: 3.5, coachNotes: "Mark Pope, first year at Kentucky. Limited tourney HC record but elite program",
        injuryImpact: -0.35, injuryNotes: "Amari Williams NOT EXPECTED (ankle) — key big man, significantly impacts interior presence",
        confStrength: 0.15, vegasImplied: 0.005, vegasSpread: -3.5, espnBPI: 0.002 },

      { seed: 10, name: "Santa Clara",    adjOE: 114.5, adjDE: 99.2,  tempo: 67.0, threePtRate: 0.390, threePtPct: 0.352, ftPct: 0.738, experience: 3.0,  consistency: 0.65, benchDepth: 0.29, sos: 40,  toureyExp: 1, hotStreak: 0.5,  record: "25-8",
        coachRating: 2.0, coachNotes: "Herb Sendek, experienced coach",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.0, vegasImplied: 0.002, vegasSpread: 3.5, espnBPI: 0.001 },

      { seed: 2,  name: "Iowa State",     adjOE: 118.0, adjDE: 91.4,  tempo: 66.5, threePtRate: 0.395, threePtPct: 0.370, ftPct: 0.755, experience: 2.8,  consistency: 0.83, benchDepth: 0.36, sos: 7,   toureyExp: 3, hotStreak: 1.0,  record: "27-7",
        coachRating: 3.5, coachNotes: "T.J. Otzelberger — 2024 Sweet 16, building consistent program. Action Network's Final Four pick",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.35, vegasImplied: 0.063, vegasSpread: -24.5, espnBPI: 0.059 },

      { seed: 15, name: "Tennessee St.",  adjOE: 103.0, adjDE: 106.5, tempo: 70.0, threePtRate: 0.370, threePtPct: 0.325, ftPct: 0.690, experience: 2.7,  consistency: 0.48, benchDepth: 0.24, sos: 174, toureyExp: 0, hotStreak: 0.0,  record: "20-9",
        coachRating: 0.5, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.40, vegasImplied: 0.001, vegasSpread: 24.5, espnBPI: 0.001 },
    ]
  },
  south: {
    name: "South",
    teams: [
      { seed: 1,  name: "Florida",        adjOE: 122.5, adjDE: 92.0,  tempo: 69.5, threePtRate: 0.308, threePtPct: 0.332, ftPct: 0.725, experience: 2.8,  consistency: 0.78, benchDepth: 0.35, sos: 4,   toureyExp: 4, hotStreak: 0.0,  record: "26-7",
        coachRating: 3.5, coachNotes: "Todd Golden — 2025 champion. Defending title but one-and-done expectation is high",
        injuryImpact: 0, injuryNotes: "Healthy — defending champion but South region considered most open",
        confStrength: 0.15, vegasImplied: 0.118, vegasSpread: -35.5, espnBPI: 0.077 },

      { seed: 16, name: "Prairie View",   adjOE: 98.5,  adjDE: 110.0, tempo: 70.5, threePtRate: 0.370, threePtPct: 0.310, ftPct: 0.665, experience: 2.4,  consistency: 0.40, benchDepth: 0.22, sos: 310, toureyExp: 0, hotStreak: -1.0, record: "12-17",
        coachRating: 0.5, coachNotes: "First tournament appearance via First Four win",
        injuryImpact: 0, injuryNotes: "Won First Four vs Lehigh",
        confStrength: -0.50, vegasImplied: 0.001, vegasSpread: 35.5, espnBPI: 0.001 },

      { seed: 8,  name: "Iowa",           adjOE: 116.5, adjDE: 98.5,  tempo: 70.0, threePtRate: 0.410, threePtPct: 0.355, ftPct: 0.738, experience: 2.5,  consistency: 0.58, benchDepth: 0.30, sos: 25,  toureyExp: 3, hotStreak: 0.0,  record: "21-12",
        coachRating: 3.0, coachNotes: "Fran McCaffery, multiple tourney appearances, consistent Big Ten coach",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money backing Iowa -2.5 vs Clemson",
        confStrength: 0.20, vegasImplied: 0.003, vegasSpread: -2.5, espnBPI: 0.001 },

      { seed: 9,  name: "Clemson",        adjOE: 114.5, adjDE: 97.0,  tempo: 67.5, threePtRate: 0.375, threePtPct: 0.345, ftPct: 0.730, experience: 2.8,  consistency: 0.65, benchDepth: 0.31, sos: 34,  toureyExp: 2, hotStreak: 0.5,  record: "24-9",
        coachRating: 3.0, coachNotes: "Brad Brownell, 2024 Elite Eight run. Proven March performer",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.15, vegasImplied: 0.004, vegasSpread: 2.5, espnBPI: 0.001 },

      { seed: 5,  name: "Vanderbilt",     adjOE: 120.0, adjDE: 96.0,  tempo: 68.5, threePtRate: 0.385, threePtPct: 0.360, ftPct: 0.745, experience: 2.6,  consistency: 0.70, benchDepth: 0.33, sos: 15,  toureyExp: 1, hotStreak: 1.5,  record: "24-7",
        coachRating: 2.5, coachNotes: "Mark Byington, building the program. Limited tourney HC record",
        injuryImpact: 0, injuryNotes: "Healthy — clean draw, biggest longshot line move (+15000 to +6600)",
        confStrength: 0.15, vegasImplied: 0.013, vegasSpread: -11.5, espnBPI: 0.006 },

      { seed: 12, name: "McNeese",        adjOE: 110.0, adjDE: 100.5, tempo: 69.0, threePtRate: 0.400, threePtPct: 0.358, ftPct: 0.730, experience: 3.2,  consistency: 0.68, benchDepth: 0.28, sos: 56,  toureyExp: 0, hotStreak: 1.0,  record: "26-5",
        coachRating: 1.0, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.15, vegasImplied: 0.001, vegasSpread: 11.5, espnBPI: 0.001 },

      { seed: 4,  name: "Nebraska",       adjOE: 119.0, adjDE: 94.0,  tempo: 67.0, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.740, experience: 2.6,  consistency: 0.72, benchDepth: 0.33, sos: 12,  toureyExp: 1, hotStreak: 0.5,  record: "26-5",
        coachRating: 2.5, coachNotes: "Fred Hoiberg, limited tournament success as HC",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.20, vegasImplied: 0.010, vegasSpread: -13.5, espnBPI: 0.006 },

      { seed: 13, name: "Troy",           adjOE: 107.5, adjDE: 103.0, tempo: 69.5, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.712, experience: 2.8,  consistency: 0.55, benchDepth: 0.26, sos: 120, toureyExp: 0, hotStreak: 1.0,  record: "22-10",
        coachRating: 1.0, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.25, vegasImplied: 0.001, vegasSpread: 13.5, espnBPI: 0.001 },

      { seed: 6,  name: "North Carolina", adjOE: 118.0, adjDE: 96.5,  tempo: 71.0, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.725, experience: 2.3,  consistency: 0.60, benchDepth: 0.34, sos: 24,  toureyExp: 5, hotStreak: 0.0,  record: "24-8",
        coachRating: 3.5, coachNotes: "Hubert Davis, 2022 championship game. Tar Heel tradition but injury concerns",
        injuryImpact: -0.55, injuryNotes: "Caleb Wilson OUT (season-ending, 19.8 PPG) — team's best player, devastating loss",
        confStrength: 0.15, vegasImplied: 0.004, vegasSpread: -2.5, espnBPI: 0.001 },

      { seed: 11, name: "VCU",            adjOE: 112.5, adjDE: 98.5,  tempo: 70.5, threePtRate: 0.385, threePtPct: 0.350, ftPct: 0.725, experience: 3.0,  consistency: 0.68, benchDepth: 0.30, sos: 44,  toureyExp: 2, hotStreak: 1.0,  record: "27-7",
        coachRating: 2.0, coachNotes: "Ryan Odom, building program but limited tourney HC record",
        injuryImpact: 0, injuryNotes: "Healthy — SportsLine model flags VCU as dangerous given UNC's Wilson injury",
        confStrength: 0.0, vegasImplied: 0.002, vegasSpread: 2.5, espnBPI: 0.001 },

      { seed: 3,  name: "Illinois",       adjOE: 131.2, adjDE: 94.5,  tempo: 69.5, threePtRate: 0.410, threePtPct: 0.368, ftPct: 0.748, experience: 1.9,  consistency: 0.72, benchDepth: 0.35, sos: 5,   toureyExp: 3, hotStreak: 0.5,  record: "24-7",
        coachRating: 3.0, coachNotes: "Brad Underwood, 2024 Sweet 16. Improved March track record",
        injuryImpact: 0, injuryNotes: "Healthy — sharp money on Illinois, line moved from -22.5 to -24.5",
        confStrength: 0.20, vegasImplied: 0.050, vegasSpread: -24.5, espnBPI: 0.042 },

      { seed: 14, name: "Penn",           adjOE: 106.5, adjDE: 102.0, tempo: 66.0, threePtRate: 0.365, threePtPct: 0.348, ftPct: 0.735, experience: 3.4,  consistency: 0.62, benchDepth: 0.26, sos: 100, toureyExp: 1, hotStreak: 0.5,  record: "21-5",
        coachRating: 1.0, coachNotes: "Limited tournament experience",
        injuryImpact: 0, injuryNotes: "Healthy — most experienced roster in the field (avg 3.4 years)",
        confStrength: -0.25, vegasImplied: 0.0007, vegasSpread: 24.5, espnBPI: 0.001 },

      { seed: 7,  name: "Saint Mary's",   adjOE: 115.0, adjDE: 93.0,  tempo: 63.5, threePtRate: 0.355, threePtPct: 0.340, ftPct: 0.811, experience: 0.74, consistency: 0.75, benchDepth: 0.31, sos: 22,  toureyExp: 3, hotStreak: 0.5,  record: "26-5",
        coachRating: 3.5, coachNotes: "Randy Bennett, multiple tournament appearances, consistent producer from WCC",
        injuryImpact: 0, injuryNotes: "Healthy — 81.1% FT is best in the field. Sharp money backing SMC -3.5",
        confStrength: 0.05, vegasImplied: 0.003, vegasSpread: -3.5, espnBPI: 0.001 },

      { seed: 10, name: "Texas A&M",      adjOE: 113.5, adjDE: 99.0,  tempo: 68.5, threePtRate: 0.380, threePtPct: 0.342, ftPct: 0.720, experience: 2.5,  consistency: 0.58, benchDepth: 0.30, sos: 43,  toureyExp: 3, hotStreak: 0.0,  record: "21-11",
        coachRating: 2.5, coachNotes: "Buzz Williams, multiple tourney appearances",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: 0.15, vegasImplied: 0.003, vegasSpread: 3.5, espnBPI: 0.001 },

      { seed: 2,  name: "Houston",        adjOE: 119.5, adjDE: 91.4,  tempo: 66.0, threePtRate: 0.370, threePtPct: 0.352, ftPct: 0.748, experience: 2.5,  consistency: 0.85, benchDepth: 0.37, sos: 8,   toureyExp: 5, hotStreak: 1.0,  record: "28-6",
        coachRating: 4.5, coachNotes: "Kelvin Sampson — 2023 championship game, 2024 Sweet 16. 3 consecutive Final Fours (2022-24). Elite",
        injuryImpact: 0, injuryNotes: "Healthy — oddsmakers' favorite to win South region (+250)",
        confStrength: 0.35, vegasImplied: 0.091, vegasSpread: -23.5, espnBPI: 0.094 },

      { seed: 15, name: "Idaho",          adjOE: 103.5, adjDE: 105.0, tempo: 67.0, threePtRate: 0.360, threePtPct: 0.335, ftPct: 0.715, experience: 3.0,  consistency: 0.52, benchDepth: 0.24, sos: 155, toureyExp: 0, hotStreak: 0.0,  record: "18-12",
        coachRating: 0.5, coachNotes: "First tournament appearance",
        injuryImpact: 0, injuryNotes: "Healthy",
        confStrength: -0.35, vegasImplied: 0.0005, vegasSpread: 23.5, espnBPI: 0.001 },
    ]
  }
};

// Final Four: East vs South (Semi 1), West vs Midwest (Semi 2)
const FINAL_FOUR_MATCHUPS = [
  { semi1: ["east", "south"], label: "Semifinal 1" },
  { semi2: ["west", "midwest"], label: "Semifinal 2" }
];

const ROUND_NAMES = ["R64", "R32", "Sweet 16", "Elite 8", "Final Four", "Championship", "Champion"];

/**
 * Historical seed upset rates (Round of 64, 1985-2025)
 * Used for model calibration validation
 */
const HISTORICAL_UPSET_RATES = {
  "1v16": 0.0125,  // 2/160
  "2v15": 0.069,   // 11/160
  "3v14": 0.144,   // 23/160
  "4v13": 0.206,   // 33/160
  "5v12": 0.356,   // 57/160
  "6v11": 0.388,   // 62/160
  "7v10": 0.388,   // 62/160
  "8v9":  0.519,   // 83/160 (9-seed wins)
};

/**
 * Historical champion DNA (from research, 2010-2025)
 * Used to calibrate which teams have champion-like profiles
 */
const CHAMPION_DNA = {
  kenpomTop6Pct: 0.93,       // 93% of champs were KenPom top 6
  oneSeedPct: 0.65,          // 65% were 1-seeds
  avgAdjOE: 122.5,           // Average champion offensive efficiency
  avgAdjDE: 90.8,            // Average champion defensive efficiency
  avgEffMargin: 31.7,        // Average efficiency margin
  bigEastBig12Titles: 4,     // 4 of last 5 champions from Big East or Big 12
  minFTPct: 0.719,           // Champions average 71.9% FT
};

/**
 * Cinderella DNA (from research — what makes upsets happen)
 */
const CINDERELLA_DNA = {
  defenseFirst: true,         // Defense-first teams upset more
  slowTempo: true,            // Slow tempo reduces possessions = more variance
  threePointThreshold: 0.35,  // 35%+ 3PT enables hot shooting runs
  veteranRosters: true,       // Experience handles pressure
  ftThreshold: 0.72,          // Good FT shooting closes out upsets
};
