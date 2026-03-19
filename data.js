/**
 * 2026 NCAA Tournament Data
 * 
 * Power ratings are composite scores derived from:
 * - KenPom Adjusted Efficiency Margin (primary weight)
 * - NET Rankings
 * - Win-loss record strength
 * - Conference strength adjustments
 * 
 * Higher rating = stronger team. Scale: ~60-100.
 * 
 * Sources: KenPom, BetMGM NET Rankings, CBS Sports, On3.com
 */

const REGIONS = {
  east: {
    name: "East",
    teams: [
      // First Round Matchups (listed as pairs: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15)
      { seed: 1, name: "Duke",            rating: 98, record: "32-2" },
      { seed: 16, name: "Siena",          rating: 38, record: "23-11" },
      { seed: 8, name: "Ohio State",      rating: 68, record: "21-11" },
      { seed: 9, name: "TCU",             rating: 65, record: "22-11" },
      { seed: 5, name: "St. John's",      rating: 76, record: "26-6" },
      { seed: 12, name: "Northern Iowa",  rating: 56, record: "22-12" },
      { seed: 4, name: "Kansas",          rating: 79, record: "23-9" },
      { seed: 13, name: "Cal Baptist",    rating: 42, record: "20-12" },
      { seed: 6, name: "Louisville",      rating: 74, record: "23-10" },
      { seed: 11, name: "South Florida",  rating: 60, record: "25-8" },
      { seed: 3, name: "Michigan State",  rating: 84, record: "25-6" },
      { seed: 14, name: "N. Dakota St.",  rating: 45, record: "24-7" },
      { seed: 7, name: "UCLA",            rating: 70, record: "22-10" },
      { seed: 10, name: "UCF",            rating: 62, record: "21-11" },
      { seed: 2, name: "UConn",           rating: 88, record: "29-5" },
      { seed: 15, name: "Furman",         rating: 40, record: "19-12" },
    ]
  },
  west: {
    name: "West",
    teams: [
      { seed: 1, name: "Arizona",         rating: 96, record: "32-2" },
      { seed: 16, name: "LIU",            rating: 32, record: "24-10" },
      { seed: 8, name: "Villanova",       rating: 66, record: "24-8" },
      { seed: 9, name: "Utah State",      rating: 67, record: "25-6" },
      { seed: 5, name: "Wisconsin",       rating: 72, record: "23-9" },
      { seed: 12, name: "High Point",     rating: 52, record: "28-5" },
      { seed: 4, name: "Arkansas",        rating: 78, record: "23-8" },
      { seed: 13, name: "Hawaii",         rating: 47, record: "20-8" },
      { seed: 6, name: "BYU",             rating: 73, record: "23-11" },
      { seed: 11, name: "Texas",          rating: 63, record: "18-14" },
      { seed: 3, name: "Gonzaga",         rating: 85, record: "30-3" },
      { seed: 14, name: "Kennesaw St.",   rating: 43, record: "22-10" },
      { seed: 7, name: "Miami (FL)",      rating: 69, record: "25-7" },
      { seed: 10, name: "Missouri",       rating: 61, record: "20-12" },
      { seed: 2, name: "Purdue",          rating: 87, record: "27-8" },
      { seed: 15, name: "Queens",         rating: 37, record: "20-13" },
    ]
  },
  midwest: {
    name: "Midwest",
    teams: [
      { seed: 1, name: "Michigan",        rating: 97, record: "31-3" },
      { seed: 16, name: "Howard",         rating: 33, record: "23-10" },
      { seed: 8, name: "Georgia",         rating: 70, record: "22-10" },
      { seed: 9, name: "Saint Louis",     rating: 68, record: "26-4" },
      { seed: 5, name: "Texas Tech",      rating: 75, record: "22-10" },
      { seed: 12, name: "Akron",          rating: 58, record: "25-5" },
      { seed: 4, name: "Alabama",         rating: 80, record: "23-8" },
      { seed: 13, name: "Hofstra",        rating: 48, record: "22-10" },
      { seed: 6, name: "Tennessee",       rating: 77, record: "22-10" },
      { seed: 11, name: "Miami (OH)",     rating: 55, record: "31-1" },
      { seed: 3, name: "Virginia",        rating: 82, record: "28-4" },
      { seed: 14, name: "Wright State",   rating: 44, record: "20-10" },
      { seed: 7, name: "Kentucky",        rating: 71, record: "21-12" },
      { seed: 10, name: "Santa Clara",    rating: 63, record: "25-8" },
      { seed: 2, name: "Iowa State",      rating: 89, record: "27-7" },
      { seed: 15, name: "Tennessee St.",  rating: 36, record: "20-9" },
    ]
  },
  south: {
    name: "South",
    teams: [
      { seed: 1, name: "Florida",         rating: 92, record: "26-7" },
      { seed: 16, name: "Prairie View",   rating: 30, record: "12-17" },
      { seed: 8, name: "Iowa",            rating: 69, record: "21-12" },
      { seed: 9, name: "Clemson",         rating: 67, record: "24-9" },
      { seed: 5, name: "Vanderbilt",      rating: 77, record: "24-7" },
      { seed: 12, name: "McNeese",        rating: 57, record: "26-5" },
      { seed: 4, name: "Nebraska",        rating: 81, record: "26-5" },
      { seed: 13, name: "Troy",           rating: 46, record: "22-10" },
      { seed: 6, name: "North Carolina",  rating: 74, record: "24-8" },
      { seed: 11, name: "VCU",            rating: 61, record: "27-7" },
      { seed: 3, name: "Illinois",        rating: 86, record: "24-7" },
      { seed: 14, name: "Penn",           rating: 44, record: "21-5" },
      { seed: 7, name: "Saint Mary's",    rating: 72, record: "26-5" },
      { seed: 10, name: "Texas A&M",      rating: 64, record: "21-11" },
      { seed: 2, name: "Houston",         rating: 90, record: "28-6" },
      { seed: 15, name: "Idaho",          rating: 38, record: "18-12" },
    ]
  }
};

// Final Four bracket: East winner vs. South winner (Semifinal 1), West winner vs. Midwest winner (Semifinal 2)
const FINAL_FOUR_MATCHUPS = [
  { semi1: ["east", "south"],     label: "Semifinal 1" },
  { semi2: ["west", "midwest"],   label: "Semifinal 2" }
];

const ROUND_NAMES = ["R64", "R32", "Sweet 16", "Elite 8", "Final Four", "Finals", "Champion"];
