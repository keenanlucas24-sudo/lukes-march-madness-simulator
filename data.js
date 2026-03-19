/**
 * 2026 NCAA Tournament — Enhanced Multi-Factor Team Data
 * 
 * Each team now has a full statistical profile for matchup-based simulation:
 * 
 * - adjOE:      KenPom Adjusted Offensive Efficiency (pts per 100 possessions)
 * - adjDE:      KenPom Adjusted Defensive Efficiency (pts allowed per 100 poss)
 * - tempo:      Adjusted tempo (possessions per game)
 * - threePtRate: % of shot attempts that are 3-pointers
 * - threePtPct:  3-point shooting percentage
 * - ftPct:       Free throw percentage
 * - experience:  Roster experience (avg years in college, 0-5 scale)
 * - consistency: How volatile is this team's performance? (0-1, higher = more consistent)
 *                Based on variance in game-to-game margin, conference record vs. expected
 * - benchDepth:  Bench minutes percentage (higher = deeper bench, more fatigue-resistant)
 * - sos:         Strength of schedule rank (lower = harder schedule)
 * - toureyExp:   Tournament experience (recent NCAA tournament appearances by program, 0-5)
 * - hotStreak:   Momentum / form entering tournament (-2 to +2)
 * 
 * Sources: KenPom (On3, CBS Sports), NET Rankings (BetMGM), ESPN BPI, CBS Cheat Sheet
 */

const REGIONS = {
  east: {
    name: "East",
    teams: [
      { seed: 1,  name: "Duke",           adjOE: 128.0, adjDE: 89.1,  tempo: 69.5, threePtRate: 0.445, threePtPct: 0.368, ftPct: 0.755, experience: 2.1,  consistency: 0.88, benchDepth: 0.33, sos: 1,   toureyExp: 4, hotStreak: 1.5,  record: "32-2" },
      { seed: 16, name: "Siena",          adjOE: 103.5, adjDE: 105.8, tempo: 67.2, threePtRate: 0.350, threePtPct: 0.304, ftPct: 0.705, experience: 2.8,  consistency: 0.60, benchDepth: 0.29, sos: 184, toureyExp: 1, hotStreak: 0.5,  record: "23-11" },
      { seed: 8,  name: "Ohio State",     adjOE: 115.2, adjDE: 97.0,  tempo: 68.8, threePtRate: 0.400, threePtPct: 0.352, ftPct: 0.740, experience: 2.5,  consistency: 0.62, benchDepth: 0.31, sos: 31,  toureyExp: 3, hotStreak: 0.5,  record: "21-11" },
      { seed: 9,  name: "TCU",            adjOE: 113.8, adjDE: 98.2,  tempo: 67.5, threePtRate: 0.380, threePtPct: 0.340, ftPct: 0.725, experience: 2.7,  consistency: 0.58, benchDepth: 0.30, sos: 38,  toureyExp: 2, hotStreak: 0.0,  record: "22-11" },
      { seed: 5,  name: "St. John's",     adjOE: 118.5, adjDE: 96.2,  tempo: 69.0, threePtRate: 0.370, threePtPct: 0.350, ftPct: 0.745, experience: 2.9,  consistency: 0.72, benchDepth: 0.32, sos: 21,  toureyExp: 2, hotStreak: 1.0,  record: "26-6" },
      { seed: 12, name: "Northern Iowa",  adjOE: 106.8, adjDE: 99.5,  tempo: 63.4, threePtRate: 0.340, threePtPct: 0.342, ftPct: 0.730, experience: 3.2,  consistency: 0.75, benchDepth: 0.28, sos: 71,  toureyExp: 2, hotStreak: 0.5,  record: "22-12" },
      { seed: 4,  name: "Kansas",         adjOE: 119.8, adjDE: 93.5,  tempo: 68.2, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.735, experience: 2.3,  consistency: 0.68, benchDepth: 0.35, sos: 18,  toureyExp: 5, hotStreak: 0.0,  record: "23-9" },
      { seed: 13, name: "Cal Baptist",    adjOE: 104.2, adjDE: 103.5, tempo: 66.8, threePtRate: 0.360, threePtPct: 0.338, ftPct: 0.710, experience: 2.6,  consistency: 0.55, benchDepth: 0.27, sos: 145, toureyExp: 0, hotStreak: 0.5,  record: "20-12" },
      { seed: 6,  name: "Louisville",     adjOE: 117.0, adjDE: 94.8,  tempo: 69.8, threePtRate: 0.390, threePtPct: 0.355, ftPct: 0.730, experience: 2.2,  consistency: 0.65, benchDepth: 0.34, sos: 16,  toureyExp: 3, hotStreak: 0.5,  record: "23-10" },
      { seed: 11, name: "South Florida",  adjOE: 111.5, adjDE: 98.8,  tempo: 67.5, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.720, experience: 3.0,  consistency: 0.63, benchDepth: 0.30, sos: 48,  toureyExp: 1, hotStreak: 1.0,  record: "25-8" },
      { seed: 3,  name: "Michigan State",  adjOE: 120.5, adjDE: 93.8,  tempo: 70.2, threePtRate: 0.360, threePtPct: 0.340, ftPct: 0.710, experience: 2.8,  consistency: 0.78, benchDepth: 0.36, sos: 11,  toureyExp: 5, hotStreak: 0.5,  record: "25-6" },
      { seed: 14, name: "N. Dakota St.",  adjOE: 105.5, adjDE: 102.0, tempo: 66.5, threePtRate: 0.350, threePtPct: 0.345, ftPct: 0.715, experience: 3.1,  consistency: 0.58, benchDepth: 0.26, sos: 115, toureyExp: 1, hotStreak: 0.5,  record: "24-7" },
      { seed: 7,  name: "UCLA",           adjOE: 114.8, adjDE: 97.5,  tempo: 68.0, threePtRate: 0.380, threePtPct: 0.342, ftPct: 0.735, experience: 2.4,  consistency: 0.60, benchDepth: 0.32, sos: 33,  toureyExp: 4, hotStreak: -0.5, record: "22-10" },
      { seed: 10, name: "UCF",            adjOE: 113.0, adjDE: 99.0,  tempo: 68.5, threePtRate: 0.395, threePtPct: 0.350, ftPct: 0.725, experience: 2.6,  consistency: 0.55, benchDepth: 0.29, sos: 52,  toureyExp: 1, hotStreak: 0.0,  record: "21-11" },
      { seed: 2,  name: "UConn",          adjOE: 123.5, adjDE: 92.0,  tempo: 67.8, threePtRate: 0.400, threePtPct: 0.360, ftPct: 0.762, experience: 2.6,  consistency: 0.82, benchDepth: 0.38, sos: 9,   toureyExp: 5, hotStreak: 1.0,  record: "29-5" },
      { seed: 15, name: "Furman",         adjOE: 104.0, adjDE: 104.5, tempo: 66.0, threePtRate: 0.355, threePtPct: 0.340, ftPct: 0.720, experience: 3.3,  consistency: 0.60, benchDepth: 0.25, sos: 187, toureyExp: 1, hotStreak: 0.0,  record: "19-12" },
    ]
  },
  west: {
    name: "West",
    teams: [
      { seed: 1,  name: "Arizona",        adjOE: 126.5, adjDE: 90.0,  tempo: 69.0, threePtRate: 0.410, threePtPct: 0.365, ftPct: 0.750, experience: 2.2,  consistency: 0.87, benchDepth: 0.35, sos: 3,   toureyExp: 4, hotStreak: 1.5,  record: "32-2" },
      { seed: 16, name: "LIU",            adjOE: 100.0, adjDE: 108.5, tempo: 68.0, threePtRate: 0.365, threePtPct: 0.310, ftPct: 0.668, experience: 2.5,  consistency: 0.48, benchDepth: 0.24, sos: 220, toureyExp: 0, hotStreak: 0.0,  record: "24-10" },
      { seed: 8,  name: "Villanova",      adjOE: 114.5, adjDE: 97.8,  tempo: 66.5, threePtRate: 0.405, threePtPct: 0.355, ftPct: 0.760, experience: 2.7,  consistency: 0.64, benchDepth: 0.30, sos: 36,  toureyExp: 4, hotStreak: 0.5,  record: "24-8" },
      { seed: 9,  name: "Utah State",     adjOE: 115.0, adjDE: 97.2,  tempo: 67.0, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.735, experience: 3.0,  consistency: 0.70, benchDepth: 0.31, sos: 28,  toureyExp: 2, hotStreak: 0.5,  record: "25-6" },
      { seed: 5,  name: "Wisconsin",      adjOE: 116.0, adjDE: 96.5,  tempo: 64.8, threePtRate: 0.365, threePtPct: 0.350, ftPct: 0.755, experience: 3.1,  consistency: 0.74, benchDepth: 0.32, sos: 27,  toureyExp: 4, hotStreak: 0.5,  record: "23-9" },
      { seed: 12, name: "High Point",     adjOE: 108.5, adjDE: 101.0, tempo: 70.5, threePtRate: 0.385, threePtPct: 0.355, ftPct: 0.725, experience: 2.9,  consistency: 0.62, benchDepth: 0.28, sos: 110, toureyExp: 0, hotStreak: 2.0,  record: "28-5" },
      { seed: 4,  name: "Arkansas",       adjOE: 122.0, adjDE: 95.0,  tempo: 71.5, threePtRate: 0.400, threePtPct: 0.348, ftPct: 0.720, experience: 2.0,  consistency: 0.65, benchDepth: 0.34, sos: 17,  toureyExp: 3, hotStreak: 1.0,  record: "23-8" },
      { seed: 13, name: "Hawaii",         adjOE: 107.0, adjDE: 102.5, tempo: 68.2, threePtRate: 0.375, threePtPct: 0.340, ftPct: 0.710, experience: 2.8,  consistency: 0.55, benchDepth: 0.26, sos: 110, toureyExp: 1, hotStreak: 0.0,  record: "20-8" },
      { seed: 6,  name: "BYU",            adjOE: 117.5, adjDE: 96.0,  tempo: 68.5, threePtRate: 0.410, threePtPct: 0.362, ftPct: 0.740, experience: 2.8,  consistency: 0.62, benchDepth: 0.33, sos: 23,  toureyExp: 2, hotStreak: -0.5, record: "23-11" },
      { seed: 11, name: "Texas",          adjOE: 112.0, adjDE: 98.0,  tempo: 68.0, threePtRate: 0.380, threePtPct: 0.338, ftPct: 0.715, experience: 2.74, consistency: 0.52, benchDepth: 0.30, sos: 42,  toureyExp: 4, hotStreak: 0.5,  record: "18-14" },
      { seed: 3,  name: "Gonzaga",        adjOE: 124.0, adjDE: 94.2,  tempo: 71.0, threePtRate: 0.385, threePtPct: 0.358, ftPct: 0.745, experience: 2.4,  consistency: 0.80, benchDepth: 0.42, sos: 6,   toureyExp: 5, hotStreak: 1.0,  record: "30-3" },
      { seed: 14, name: "Kennesaw St.",   adjOE: 105.0, adjDE: 103.0, tempo: 67.0, threePtRate: 0.360, threePtPct: 0.335, ftPct: 0.700, experience: 2.9,  consistency: 0.52, benchDepth: 0.25, sos: 130, toureyExp: 1, hotStreak: 0.5,  record: "22-10" },
      { seed: 7,  name: "Miami (FL)",     adjOE: 115.5, adjDE: 97.0,  tempo: 67.5, threePtRate: 0.390, threePtPct: 0.348, ftPct: 0.742, experience: 2.9,  consistency: 0.65, benchDepth: 0.31, sos: 30,  toureyExp: 3, hotStreak: 0.5,  record: "25-7" },
      { seed: 10, name: "Missouri",       adjOE: 112.5, adjDE: 99.5,  tempo: 69.0, threePtRate: 0.385, threePtPct: 0.340, ftPct: 0.718, experience: 2.5,  consistency: 0.55, benchDepth: 0.29, sos: 58,  toureyExp: 2, hotStreak: 0.0,  record: "20-12" },
      { seed: 2,  name: "Purdue",         adjOE: 131.6, adjDE: 94.5,  tempo: 68.5, threePtRate: 0.395, threePtPct: 0.372, ftPct: 0.770, experience: 2.8,  consistency: 0.78, benchDepth: 0.35, sos: 8,   toureyExp: 5, hotStreak: 1.5,  record: "27-8" },
      { seed: 15, name: "Queens",         adjOE: 102.5, adjDE: 106.0, tempo: 66.5, threePtRate: 0.355, threePtPct: 0.330, ftPct: 0.695, experience: 3.0,  consistency: 0.50, benchDepth: 0.24, sos: 190, toureyExp: 0, hotStreak: 0.0,  record: "20-13" },
    ]
  },
  midwest: {
    name: "Midwest",
    teams: [
      { seed: 1,  name: "Michigan",       adjOE: 124.5, adjDE: 89.0,  tempo: 67.8, threePtRate: 0.390, threePtPct: 0.358, ftPct: 0.752, experience: 2.3,  consistency: 0.90, benchDepth: 0.37, sos: 2,   toureyExp: 4, hotStreak: 1.0,  record: "31-3" },
      { seed: 16, name: "Howard",         adjOE: 101.0, adjDE: 108.0, tempo: 69.5, threePtRate: 0.370, threePtPct: 0.315, ftPct: 0.680, experience: 2.6,  consistency: 0.45, benchDepth: 0.25, sos: 210, toureyExp: 1, hotStreak: 0.5,  record: "23-10" },
      { seed: 8,  name: "Georgia",        adjOE: 115.8, adjDE: 97.5,  tempo: 69.0, threePtRate: 0.385, threePtPct: 0.345, ftPct: 0.728, experience: 2.4,  consistency: 0.58, benchDepth: 0.30, sos: 32,  toureyExp: 1, hotStreak: 0.0,  record: "22-10" },
      { seed: 9,  name: "Saint Louis",    adjOE: 114.0, adjDE: 96.8,  tempo: 66.0, threePtRate: 0.395, threePtPct: 0.405, ftPct: 0.745, experience: 3.2,  consistency: 0.73, benchDepth: 0.29, sos: 29,  toureyExp: 2, hotStreak: 1.0,  record: "26-4" },
      { seed: 5,  name: "Texas Tech",     adjOE: 117.2, adjDE: 95.5,  tempo: 66.5, threePtRate: 0.375, threePtPct: 0.340, ftPct: 0.722, experience: 2.5,  consistency: 0.64, benchDepth: 0.194,sos: 20,  toureyExp: 3, hotStreak: 0.0,  record: "22-10" },
      { seed: 12, name: "Akron",          adjOE: 110.5, adjDE: 100.0, tempo: 68.0, threePtRate: 0.380, threePtPct: 0.352, ftPct: 0.725, experience: 3.1,  consistency: 0.65, benchDepth: 0.28, sos: 54,  toureyExp: 1, hotStreak: 1.0,  record: "25-5" },
      { seed: 4,  name: "Alabama",        adjOE: 129.0, adjDE: 97.5,  tempo: 74.6, threePtRate: 0.480, threePtPct: 0.355, ftPct: 0.715, experience: 1.8,  consistency: 0.55, benchDepth: 0.32, sos: 14,  toureyExp: 4, hotStreak: 0.5,  record: "23-8" },
      { seed: 13, name: "Hofstra",        adjOE: 108.0, adjDE: 102.2, tempo: 68.5, threePtRate: 0.390, threePtPct: 0.348, ftPct: 0.718, experience: 3.0,  consistency: 0.58, benchDepth: 0.27, sos: 88,  toureyExp: 1, hotStreak: 0.5,  record: "22-10" },
      { seed: 6,  name: "Tennessee",      adjOE: 112.8, adjDE: 92.5,  tempo: 65.0, threePtRate: 0.340, threePtPct: 0.325, ftPct: 0.710, experience: 2.6,  consistency: 0.72, benchDepth: 0.33, sos: 19,  toureyExp: 4, hotStreak: 0.0,  record: "22-10" },
      { seed: 11, name: "Miami (OH)",     adjOE: 112.0, adjDE: 99.0,  tempo: 67.5, threePtRate: 0.375, threePtPct: 0.352, ftPct: 0.732, experience: 3.4,  consistency: 0.80, benchDepth: 0.30, sos: 64,  toureyExp: 0, hotStreak: 1.5,  record: "31-1" },
      { seed: 3,  name: "Virginia",       adjOE: 116.5, adjDE: 91.5,  tempo: 62.0, threePtRate: 0.345, threePtPct: 0.338, ftPct: 0.740, experience: 3.0,  consistency: 0.82, benchDepth: 0.34, sos: 13,  toureyExp: 4, hotStreak: 0.5,  record: "28-4" },
      { seed: 14, name: "Wright State",   adjOE: 106.0, adjDE: 103.5, tempo: 68.5, threePtRate: 0.365, threePtPct: 0.342, ftPct: 0.705, experience: 2.8,  consistency: 0.50, benchDepth: 0.25, sos: 127, toureyExp: 1, hotStreak: 0.0,  record: "20-10" },
      { seed: 7,  name: "Kentucky",       adjOE: 116.0, adjDE: 98.0,  tempo: 69.5, threePtRate: 0.385, threePtPct: 0.342, ftPct: 0.728, experience: 1.8,  consistency: 0.55, benchDepth: 0.31, sos: 26,  toureyExp: 5, hotStreak: -1.0, record: "21-12" },
      { seed: 10, name: "Santa Clara",    adjOE: 114.5, adjDE: 99.2,  tempo: 67.0, threePtRate: 0.390, threePtPct: 0.352, ftPct: 0.738, experience: 3.0,  consistency: 0.65, benchDepth: 0.29, sos: 40,  toureyExp: 1, hotStreak: 0.5,  record: "25-8" },
      { seed: 2,  name: "Iowa State",     adjOE: 118.0, adjDE: 91.4,  tempo: 66.5, threePtRate: 0.395, threePtPct: 0.370, ftPct: 0.755, experience: 2.8,  consistency: 0.83, benchDepth: 0.36, sos: 7,   toureyExp: 3, hotStreak: 1.0,  record: "27-7" },
      { seed: 15, name: "Tennessee St.",  adjOE: 103.0, adjDE: 106.5, tempo: 70.0, threePtRate: 0.370, threePtPct: 0.325, ftPct: 0.690, experience: 2.7,  consistency: 0.48, benchDepth: 0.24, sos: 174, toureyExp: 0, hotStreak: 0.0,  record: "20-9" },
    ]
  },
  south: {
    name: "South",
    teams: [
      { seed: 1,  name: "Florida",        adjOE: 122.5, adjDE: 92.0,  tempo: 69.5, threePtRate: 0.308, threePtPct: 0.332, ftPct: 0.725, experience: 2.8,  consistency: 0.78, benchDepth: 0.35, sos: 4,   toureyExp: 4, hotStreak: 0.0,  record: "26-7" },
      { seed: 16, name: "Prairie View",   adjOE: 98.5,  adjDE: 110.0, tempo: 70.5, threePtRate: 0.370, threePtPct: 0.310, ftPct: 0.665, experience: 2.4,  consistency: 0.40, benchDepth: 0.22, sos: 310, toureyExp: 0, hotStreak: -1.0, record: "12-17" },
      { seed: 8,  name: "Iowa",           adjOE: 116.5, adjDE: 98.5,  tempo: 70.0, threePtRate: 0.410, threePtPct: 0.355, ftPct: 0.738, experience: 2.5,  consistency: 0.58, benchDepth: 0.30, sos: 25,  toureyExp: 3, hotStreak: 0.0,  record: "21-12" },
      { seed: 9,  name: "Clemson",        adjOE: 114.5, adjDE: 97.0,  tempo: 67.5, threePtRate: 0.375, threePtPct: 0.345, ftPct: 0.730, experience: 2.8,  consistency: 0.65, benchDepth: 0.31, sos: 34,  toureyExp: 2, hotStreak: 0.5,  record: "24-9" },
      { seed: 5,  name: "Vanderbilt",     adjOE: 120.0, adjDE: 96.0,  tempo: 68.5, threePtRate: 0.385, threePtPct: 0.360, ftPct: 0.745, experience: 2.6,  consistency: 0.70, benchDepth: 0.33, sos: 15,  toureyExp: 1, hotStreak: 1.5,  record: "24-7" },
      { seed: 12, name: "McNeese",        adjOE: 110.0, adjDE: 100.5, tempo: 69.0, threePtRate: 0.400, threePtPct: 0.358, ftPct: 0.730, experience: 3.2,  consistency: 0.68, benchDepth: 0.28, sos: 56,  toureyExp: 0, hotStreak: 1.0,  record: "26-5" },
      { seed: 4,  name: "Nebraska",       adjOE: 119.0, adjDE: 94.0,  tempo: 67.0, threePtRate: 0.370, threePtPct: 0.348, ftPct: 0.740, experience: 2.6,  consistency: 0.72, benchDepth: 0.33, sos: 12,  toureyExp: 1, hotStreak: 0.5,  record: "26-5" },
      { seed: 13, name: "Troy",           adjOE: 107.5, adjDE: 103.0, tempo: 69.5, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.712, experience: 2.8,  consistency: 0.55, benchDepth: 0.26, sos: 120, toureyExp: 0, hotStreak: 1.0,  record: "22-10" },
      { seed: 6,  name: "North Carolina", adjOE: 118.0, adjDE: 96.5,  tempo: 71.0, threePtRate: 0.380, threePtPct: 0.345, ftPct: 0.725, experience: 2.3,  consistency: 0.60, benchDepth: 0.34, sos: 24,  toureyExp: 5, hotStreak: 0.0,  record: "24-8" },
      { seed: 11, name: "VCU",            adjOE: 112.5, adjDE: 98.5,  tempo: 70.5, threePtRate: 0.385, threePtPct: 0.350, ftPct: 0.725, experience: 3.0,  consistency: 0.68, benchDepth: 0.30, sos: 44,  toureyExp: 2, hotStreak: 1.0,  record: "27-7" },
      { seed: 3,  name: "Illinois",       adjOE: 131.2, adjDE: 94.5,  tempo: 69.5, threePtRate: 0.410, threePtPct: 0.368, ftPct: 0.748, experience: 1.9,  consistency: 0.72, benchDepth: 0.35, sos: 5,   toureyExp: 3, hotStreak: 0.5,  record: "24-7" },
      { seed: 14, name: "Penn",           adjOE: 106.5, adjDE: 102.0, tempo: 66.0, threePtRate: 0.365, threePtPct: 0.348, ftPct: 0.735, experience: 3.4,  consistency: 0.62, benchDepth: 0.26, sos: 100, toureyExp: 1, hotStreak: 0.5,  record: "21-5" },
      { seed: 7,  name: "Saint Mary's",   adjOE: 115.0, adjDE: 93.0,  tempo: 63.5, threePtRate: 0.355, threePtPct: 0.340, ftPct: 0.811, experience: 0.74, consistency: 0.75, benchDepth: 0.31, sos: 22,  toureyExp: 3, hotStreak: 0.5,  record: "26-5" },
      { seed: 10, name: "Texas A&M",      adjOE: 113.5, adjDE: 99.0,  tempo: 68.5, threePtRate: 0.380, threePtPct: 0.342, ftPct: 0.720, experience: 2.5,  consistency: 0.58, benchDepth: 0.30, sos: 43,  toureyExp: 3, hotStreak: 0.0,  record: "21-11" },
      { seed: 2,  name: "Houston",        adjOE: 119.5, adjDE: 91.4,  tempo: 66.0, threePtRate: 0.370, threePtPct: 0.352, ftPct: 0.748, experience: 2.5,  consistency: 0.85, benchDepth: 0.37, sos: 8,   toureyExp: 5, hotStreak: 1.0,  record: "28-6" },
      { seed: 15, name: "Idaho",          adjOE: 103.5, adjDE: 105.0, tempo: 67.0, threePtRate: 0.360, threePtPct: 0.335, ftPct: 0.715, experience: 3.0,  consistency: 0.52, benchDepth: 0.24, sos: 155, toureyExp: 0, hotStreak: 0.0,  record: "18-12" },
    ]
  }
};

// Final Four: East vs South (Semi 1), West vs Midwest (Semi 2)
const FINAL_FOUR_MATCHUPS = [
  { semi1: ["east", "south"], label: "Semifinal 1" },
  { semi2: ["west", "midwest"], label: "Semifinal 2" }
];

const ROUND_NAMES = ["R64", "R32", "Sweet 16", "Elite 8", "Final Four", "Finals", "Champion"];

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
