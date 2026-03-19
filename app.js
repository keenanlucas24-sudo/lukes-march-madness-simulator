/**
 * Application Controller v4.0
 * 
 * ROUND-BY-ROUND BRACKET REVEAL:
 * - Deterministic bracket computed up front, revealed one round at a time
 * - "Advance" button progresses through: R64 → R32 → S16 → E8 → F4 → Championship
 * - Champion banner only shown after Championship is revealed
 * - Probabilities tab still uses Monte Carlo (10K sims) as statistical reference
 */

(function () {
  // ===== Theme Toggle =====
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = 'dark';

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  root.setAttribute('data-theme', theme);
  updateToggleIcon();

  if (toggle) {
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon();
    });
  }

  // ===== Constants =====
  const ROUND_LABELS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];
  const ROUND_SHORT  = ['R64', 'R32', 'Sweet 16', 'Elite 8', 'Final Four', 'Title'];
  const ALL_REGIONS = ['east', 'west', 'midwest', 'south'];

  // ===== State =====
  let currentBracket = null;     // Full deterministic bracket (computed up front)
  let revealedRound = -1;        // -1 = not started, 0 = R64 shown, ... 5 = Championship shown
  let aggregateResults = null;   // Monte Carlo aggregate
  let activeView = 'bracket';
  let detailGame = null;

  // ===== DOM =====
  const simBtn = document.getElementById('simBtn');
  const bracketArea = document.getElementById('bracketArea');
  const detailPanel = document.getElementById('detailPanel');
  const detailOverlay = document.getElementById('detailOverlay');
  const viewTabs = document.querySelectorAll('.view-tab');
  const bracketView = document.getElementById('bracketView');
  const probView = document.getElementById('probView');
  const methodView = document.getElementById('methodView');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const probTableBody = document.getElementById('probTableBody');
  const teamSearch = document.getElementById('teamSearch');
  const tableSort = document.getElementById('tableSort');
  const championBanner = document.getElementById('championBanner');
  const championName = document.getElementById('championName');
  const championDetails = document.getElementById('championDetails');
  const championPath = document.getElementById('championPath');
  const upsetCounter = document.getElementById('upsetCounter');
  const advanceBtn = document.getElementById('advanceBtn');
  const roundIndicator = document.getElementById('roundIndicator');

  // ===== View Tabs =====
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeView = tab.dataset.view;

      bracketView.classList.toggle('hidden', activeView !== 'bracket');
      probView.classList.toggle('hidden', activeView !== 'probabilities');
      methodView.classList.toggle('hidden', activeView !== 'methodology');

      if (activeView === 'probabilities' && !aggregateResults) {
        runAggregate();
      }
    });
  });

  // ===== Generate Bracket Button =====
  simBtn.addEventListener('click', () => {
    // Compute full bracket deterministically
    currentBracket = engine.analyzeBracket();
    revealedRound = -1;

    // Hide champion banner
    championBanner.classList.add('hidden');

    // Show bracket area
    bracketArea.classList.remove('hidden');

    // Reveal R64
    advanceRound();

    simBtn.classList.add('pulse');
    setTimeout(() => simBtn.classList.remove('pulse'), 300);
  });

  // ===== Advance Round =====
  function advanceRound() {
    if (!currentBracket) return;
    if (revealedRound >= 5) return; // already fully revealed

    revealedRound++;
    renderBracket();
    updateRoundControls();

    // Scroll bracket area into view
    bracketArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (advanceBtn) {
    advanceBtn.addEventListener('click', advanceRound);
  }

  function updateRoundControls() {
    if (!roundIndicator || !advanceBtn) return;

    if (revealedRound < 0) {
      roundIndicator.textContent = '';
      advanceBtn.classList.add('hidden');
      return;
    }

    // Show current round label
    roundIndicator.textContent = ROUND_LABELS[revealedRound];

    if (revealedRound >= 5) {
      // All rounds revealed — show champion
      advanceBtn.classList.add('hidden');
      renderChampionBanner();
      championBanner.classList.remove('hidden');
      championBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      advanceBtn.classList.remove('hidden');
      advanceBtn.textContent = `Advance to ${ROUND_LABELS[revealedRound + 1]}`;
    }
  }

  // ===== Close Detail Panel =====
  if (detailOverlay) {
    detailOverlay.addEventListener('click', closeDetail);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  function closeDetail() {
    if (detailPanel) detailPanel.classList.add('hidden');
    if (detailOverlay) detailOverlay.classList.add('hidden');
    detailGame = null;
  }

  // ===== Render Champion Banner =====
  function renderChampionBanner() {
    if (!currentBracket) return;
    const champ = currentBracket.finalFour.champion;
    const champGame = currentBracket.finalFour.championship;

    championName.textContent = champ.name;
    championDetails.innerHTML = `<span class="champ-seed">#${champ.seed} seed</span> · <span class="champ-region">${REGIONS[getTeamRegion(champ.name)].name} Region</span> · <span class="champ-record">${champ.record}</span>`;

    // Build champion path
    const path = getChampionPath(champ.name);
    championPath.innerHTML = path.map((g, i) => {
      const roundName = ROUND_SHORT[i];
      return `<span class="path-game ${g.isUpset ? 'upset' : ''}">
        <span class="path-round">${roundName}</span>
        <span class="path-opponent">vs ${g.loser} <span class="path-score">${g.score}</span></span>
      </span>`;
    }).join('<span class="path-arrow">→</span>');

    // Count upsets
    let upsets = 0;
    ALL_REGIONS.forEach(rk => {
      currentBracket.regions[rk].rounds.forEach(round => {
        round.forEach(game => { if (game.isUpset) upsets++; });
      });
    });
    [currentBracket.finalFour.semi1, currentBracket.finalFour.semi2, currentBracket.finalFour.championship].forEach(g => {
      if (g.isUpset) upsets++;
    });
    upsetCounter.textContent = `${upsets} upset${upsets !== 1 ? 's' : ''} predicted`;
  }

  function getTeamRegion(name) {
    for (const rk of ALL_REGIONS) {
      if (REGIONS[rk].teams.some(t => t.name === name)) return rk;
    }
    return 'east';
  }

  function getChampionPath(champName) {
    const path = [];
    const champRegion = getTeamRegion(champName);
    const regionRes = currentBracket.regions[champRegion];

    for (let r = 0; r < regionRes.rounds.length; r++) {
      const game = regionRes.rounds[r].find(g => g.winner.name === champName);
      if (game) {
        path.push({
          loser: game.loser.name,
          score: `${game.winnerScore}-${game.loserScore}`,
          isUpset: game.isUpset,
        });
      }
    }

    const semis = [currentBracket.finalFour.semi1, currentBracket.finalFour.semi2];
    const semiGame = semis.find(g => g.winner.name === champName);
    if (semiGame) {
      path.push({
        loser: semiGame.loser.name,
        score: `${semiGame.winnerScore}-${semiGame.loserScore}`,
        isUpset: semiGame.isUpset,
      });
    }

    const champGame = currentBracket.finalFour.championship;
    if (champGame.winner.name === champName) {
      path.push({
        loser: champGame.loser.name,
        score: `${champGame.winnerScore}-${champGame.loserScore}`,
        isUpset: champGame.isUpset,
      });
    }

    return path;
  }

  // ===== Render Bracket (round-by-round) =====
  function renderBracket() {
    if (!currentBracket || revealedRound < 0) return;

    let html = '';

    // Regional rounds (0-3)
    if (revealedRound <= 3) {
      // Show all games up to and including the current revealed round, across all regions
      html += '<div class="bracket-rounds">';

      for (let r = 0; r <= Math.min(revealedRound, 3); r++) {
        const isCurrentRound = (r === revealedRound);
        html += `<div class="bracket-round-section ${isCurrentRound ? 'current-round' : 'past-round'}" id="round-${r}">`;
        html += `<div class="round-header"><h3 class="round-title">${ROUND_LABELS[r]}</h3>`;
        html += `<span class="round-game-count">${r <= 3 ? ALL_REGIONS.reduce((c, rk) => c + currentBracket.regions[rk].rounds[r].length, 0) : ''} games</span></div>`;

        // Show games grouped by region
        html += '<div class="round-regions">';
        ALL_REGIONS.forEach(rk => {
          const regionRound = currentBracket.regions[rk].rounds[r];
          if (!regionRound || regionRound.length === 0) return;
          html += `<div class="region-group">`;
          html += `<div class="region-group-label">${REGIONS[rk].name}</div>`;
          html += '<div class="region-games">';
          regionRound.forEach((game, gi) => {
            html += renderGameCard(game, rk, r, gi, isCurrentRound);
          });
          html += '</div></div>';
        });
        html += '</div></div>';
      }

      html += '</div>';

    } else {
      // Final Four + Championship (rounds 4-5)
      html += '<div class="bracket-rounds">';

      // Show collapsed summary of regional rounds
      html += renderRegionalSummary();

      // Final Four (round 4)
      if (revealedRound >= 4) {
        const ff = currentBracket.finalFour;
        const isCurrentFF = (revealedRound === 4);
        html += `<div class="bracket-round-section ${isCurrentFF ? 'current-round' : 'past-round'}" id="round-4">`;
        html += `<div class="round-header"><h3 class="round-title">Final Four</h3></div>`;
        html += '<div class="round-regions"><div class="region-games ff-games">';
        html += renderGameCard(ff.semi1, 'ff', 4, 0, isCurrentFF, 'East vs South');
        html += renderGameCard(ff.semi2, 'ff', 4, 1, isCurrentFF, 'West vs Midwest');
        html += '</div></div></div>';
      }

      // Championship (round 5)
      if (revealedRound >= 5) {
        const ff = currentBracket.finalFour;
        html += `<div class="bracket-round-section current-round" id="round-5">`;
        html += `<div class="round-header"><h3 class="round-title">National Championship</h3></div>`;
        html += '<div class="round-regions"><div class="region-games ff-games">';
        html += renderGameCard(ff.championship, 'ff', 5, 0, true, 'Title Game');
        html += '</div></div></div>';
      }

      html += '</div>';
    }

    bracketArea.innerHTML = html;

    // Attach detail button handlers
    bracketArea.querySelectorAll('.detail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.game-card');
        const region = card.dataset.region;
        const round = parseInt(card.dataset.round);
        const game = parseInt(card.dataset.game);

        if (region === 'ff') {
          openFinalFourDetail(round, game);
        } else {
          openDetail(region, round, game);
        }
      });
    });

    // Scroll to the current round section
    const currentSection = document.getElementById(`round-${revealedRound}`);
    if (currentSection) {
      setTimeout(() => {
        currentSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  function renderRegionalSummary() {
    let html = '<div class="regional-summary">';
    html += '<div class="summary-label">Regional Winners</div>';
    html += '<div class="summary-teams">';
    ALL_REGIONS.forEach(rk => {
      const winner = currentBracket.regions[rk].regionWinner;
      html += `<div class="summary-team">
        <span class="summary-seed">${winner.seed}</span>
        <span class="summary-name">${winner.name}</span>
        <span class="summary-region">${REGIONS[rk].name}</span>
      </div>`;
    });
    html += '</div></div>';
    return html;
  }

  function renderGameCard(game, region, round, gameIdx, isNew, subtitle) {
    const seedColor = getSeedColor(game.winner.seed);
    const winProb = game.winProb ? `${(game.winProb * 100).toFixed(0)}%` : '';
    const marginLabel = game.margin ? game.margin.toFixed(1) : '';

    return `<div class="game-card ${game.isUpset ? 'upset-game' : ''} ${isNew ? 'new-reveal' : ''}" data-round="${round}" data-game="${gameIdx}" data-region="${region}">
      ${subtitle ? `<div class="game-subtitle">${subtitle}</div>` : ''}
      ${game.isUpset ? '<div class="upset-badge">UPSET</div>' : ''}
      <div class="game-teams">
        <div class="game-team winner" style="--seed-color: ${seedColor}">
          <span class="g-seed">${game.winner.seed}</span>
          <span class="g-name">${game.winner.name}</span>
          <span class="g-score">${game.winnerScore}</span>
        </div>
        <div class="game-team loser">
          <span class="g-seed">${game.loser.seed}</span>
          <span class="g-name">${game.loser.name}</span>
          <span class="g-score">${game.loserScore}</span>
        </div>
      </div>
      <div class="game-meta">
        ${winProb ? `<span class="game-confidence">Model confidence: ${winProb}</span>` : ''}
      </div>
      <div class="game-narrative">${game.narrative.text}</div>
      <div class="game-factors-mini">
        ${game.narrative.topFactors.slice(0, 2).map(f => `<span class="factor-tag ${f.value > 0 ? 'positive' : 'negative'}">${f.label}</span>`).join('')}
      </div>
      <button class="detail-btn" aria-label="View matchup details">Details →</button>
    </div>`;
  }

  // ===== Matchup Detail Panel =====
  function openDetail(region, roundIdx, gameIdx) {
    const game = currentBracket.regions[region].rounds[roundIdx][gameIdx];
    renderDetailPanel(game);
  }

  function openFinalFourDetail(round, gameIdx) {
    const ff = currentBracket.finalFour;
    let game;
    if (round === 4) {
      game = gameIdx === 0 ? ff.semi1 : ff.semi2;
    } else {
      game = ff.championship;
    }
    renderDetailPanel(game);
  }

  function renderDetailPanel(game) {
    detailGame = game;
    const w = game.winner;
    const l = game.loser;
    const f = game.factors;

    const factorRows = [
      { label: 'Efficiency Matchup', val: f.efficiency, desc: `${w.name}: ${w.adjOE.toFixed(1)} AdjOE / ${w.adjDE.toFixed(1)} AdjDE vs ${l.name}: ${l.adjOE.toFixed(1)} / ${l.adjDE.toFixed(1)}`, num: '1' },
      { label: 'Tempo Mismatch', val: f.tempo, desc: `Game tempo: ${((w.tempo + l.tempo) / 2).toFixed(1)} | ${w.name}: ${w.tempo} · ${l.name}: ${l.tempo}`, num: '2' },
      { label: '3PT Variance', val: f.threePoint, desc: `${w.name}: ${(w.threePtPct * 100).toFixed(0)}% (${(w.threePtRate * 100).toFixed(0)}% rate) · ${l.name}: ${(l.threePtPct * 100).toFixed(0)}% (${(l.threePtRate * 100).toFixed(0)}% rate)`, num: '3' },
      { label: 'Free Throw Clutch', val: f.freeThrow, desc: `${w.name}: ${(w.ftPct * 100).toFixed(1)}% FT vs ${l.name}: ${(l.ftPct * 100).toFixed(1)}% FT`, num: '4' },
      { label: 'Experience', val: f.experience, desc: `${w.name}: ${w.experience.toFixed(1)}yr roster / ${w.toureyExp} tourney exp vs ${l.name}: ${l.experience.toFixed(1)}yr / ${l.toureyExp}`, num: '5' },
      { label: 'Momentum', val: f.momentum, desc: `${w.name}: ${w.hotStreak > 0 ? '+' : ''}${w.hotStreak} vs ${l.name}: ${l.hotStreak > 0 ? '+' : ''}${l.hotStreak}`, num: '6' },
      { label: 'Bench Depth', val: f.depth, desc: `${w.name}: ${(w.benchDepth * 100).toFixed(0)}% bench min vs ${l.name}: ${(l.benchDepth * 100).toFixed(0)}%`, num: '7' },
      { label: 'Coaching', val: f.coaching, desc: `${w.name}: ${w.coachRating}/5 vs ${l.name}: ${l.coachRating}/5`, num: '8' },
      { label: 'Injuries', val: f.injuries, desc: `${w.injuryNotes || 'Healthy'} vs ${l.injuryNotes || 'Healthy'}`, num: '9' },
      { label: 'Conference', val: f.conference, desc: `${w.name}: ${w.confStrength > 0 ? '+' : ''}${w.confStrength.toFixed(2)} vs ${l.name}: ${l.confStrength > 0 ? '+' : ''}${l.confStrength.toFixed(2)}`, num: '10' },
      { label: 'Vegas Calibration', val: f.vegasCalibration, desc: `${w.vegasImplied ? (w.vegasImplied * 100).toFixed(1) + '% implied' : 'N/A'} | Spread: ${w.vegasSpread || 'N/A'}`, num: '11' },
    ];

    let html = `
      <div class="detail-header">
        <button class="detail-close" aria-label="Close">✕</button>
        <div class="detail-matchup">
          <div class="detail-team winner">
            <span class="detail-seed" style="background: ${getSeedColor(w.seed)}">${w.seed}</span>
            <div>
              <div class="detail-name">${w.name}</div>
              <div class="detail-record">${w.record} · ${w.regionName || REGIONS[getTeamRegion(w.name)].name}</div>
            </div>
            <span class="detail-score">${game.winnerScore}</span>
          </div>
          <div class="detail-vs">vs</div>
          <div class="detail-team loser">
            <span class="detail-seed">${l.seed}</span>
            <div>
              <div class="detail-name">${l.name}</div>
              <div class="detail-record">${l.record} · ${l.regionName || REGIONS[getTeamRegion(l.name)].name}</div>
            </div>
            <span class="detail-score">${game.loserScore}</span>
          </div>
        </div>
        ${game.winProb ? `<div class="detail-confidence">Model confidence: ${(game.winProb * 100).toFixed(1)}%</div>` : ''}
        ${game.isUpset ? '<div class="detail-upset-tag">UPSET</div>' : ''}
      </div>

      <div class="detail-narrative">
        <div class="narrative-label">Game Story</div>
        <p>${game.narrative.text}</p>
      </div>

      <div class="detail-factors">
        <div class="factors-label">Factor Breakdown (11 Factors)</div>
        ${factorRows.map(fr => {
      const absVal = Math.abs(fr.val);
      const pct = Math.min(absVal / 3 * 100, 100);
      const favorsWinner = fr.val > 0.05;
      const favorsLoser = fr.val < -0.05;
      return `<div class="factor-row">
            <div class="factor-info">
              <span class="factor-icon">${fr.num}</span>
              <span class="factor-name">${fr.label}</span>
              <span class="factor-val ${favorsWinner ? 'positive' : favorsLoser ? 'negative' : 'neutral'}">${fr.val > 0 ? '+' : ''}${fr.val.toFixed(2)}</span>
            </div>
            <div class="factor-bar-container">
              <div class="factor-bar ${favorsWinner ? 'positive' : favorsLoser ? 'negative' : 'neutral'}" style="width: ${pct}%"></div>
            </div>
            <div class="factor-desc">${fr.desc}</div>
          </div>`;
    }).join('')}
      </div>

      <div class="detail-profiles">
        <div class="profile-label">Team Profiles</div>
        <div class="profile-grid">
          ${renderTeamProfile(w, 'Winner')}
          ${renderTeamProfile(l, 'Loser')}
        </div>
      </div>

      <div class="detail-coaching">
        <div class="coaching-label">Coaching Notes</div>
        <div class="coaching-grid">
          <div class="coaching-card">
            <div class="coaching-team">${w.name}</div>
            <div class="coaching-rating-bar">
              <div class="coaching-bar-track"><div class="coaching-bar-fill" style="width:${(w.coachRating / 5 * 100)}%"></div></div>
              <span class="coaching-score">${w.coachRating}/5</span>
            </div>
            <div class="coaching-note">${w.coachNotes || 'No notes available'}</div>
          </div>
          <div class="coaching-card">
            <div class="coaching-team">${l.name}</div>
            <div class="coaching-rating-bar">
              <div class="coaching-bar-track"><div class="coaching-bar-fill" style="width:${(l.coachRating / 5 * 100)}%"></div></div>
              <span class="coaching-score">${l.coachRating}/5</span>
            </div>
            <div class="coaching-note">${l.coachNotes || 'No notes available'}</div>
          </div>
        </div>
      </div>

      <div class="detail-vegas">
        <div class="vegas-label">Market Data</div>
        <div class="vegas-grid">
          <div class="vegas-item"><span class="vegas-key">Vegas Spread</span><span class="vegas-val">${w.vegasSpread != null ? (w.vegasSpread > 0 ? '+' + w.vegasSpread : w.vegasSpread) : 'N/A'}</span></div>
          <div class="vegas-item"><span class="vegas-key">${w.name} Title Implied</span><span class="vegas-val">${w.vegasImplied ? (w.vegasImplied * 100).toFixed(1) + '%' : 'N/A'}</span></div>
          <div class="vegas-item"><span class="vegas-key">${l.name} Title Implied</span><span class="vegas-val">${l.vegasImplied ? (l.vegasImplied * 100).toFixed(1) + '%' : 'N/A'}</span></div>
          <div class="vegas-item"><span class="vegas-key">ESPN BPI</span><span class="vegas-val">${w.espnBPI ? (w.espnBPI * 100).toFixed(1) + '%' : 'N/A'} / ${l.espnBPI ? (l.espnBPI * 100).toFixed(1) + '%' : 'N/A'}</span></div>
        </div>
      </div>
    `;

    detailPanel.innerHTML = html;
    detailPanel.classList.remove('hidden');
    detailOverlay.classList.remove('hidden');

    detailPanel.querySelector('.detail-close').addEventListener('click', closeDetail);
  }

  function renderTeamProfile(team, label) {
    const em = (team.adjOE - team.adjDE).toFixed(1);
    return `<div class="profile-card">
      <div class="profile-team-name">${team.name} <span class="profile-label-tag">${label}</span></div>
      <div class="profile-stats">
        <div class="stat"><span class="stat-label">AdjOE</span><span class="stat-val">${team.adjOE.toFixed(1)}</span></div>
        <div class="stat"><span class="stat-label">AdjDE</span><span class="stat-val">${team.adjDE.toFixed(1)}</span></div>
        <div class="stat"><span class="stat-label">Net</span><span class="stat-val accent">+${em}</span></div>
        <div class="stat"><span class="stat-label">Tempo</span><span class="stat-val">${team.tempo.toFixed(1)}</span></div>
        <div class="stat"><span class="stat-label">3PT%</span><span class="stat-val">${(team.threePtPct * 100).toFixed(1)}%</span></div>
        <div class="stat"><span class="stat-label">3PT Rate</span><span class="stat-val">${(team.threePtRate * 100).toFixed(0)}%</span></div>
        <div class="stat"><span class="stat-label">FT%</span><span class="stat-val">${(team.ftPct * 100).toFixed(1)}%</span></div>
        <div class="stat"><span class="stat-label">Experience</span><span class="stat-val">${team.experience.toFixed(1)} yr</span></div>
        <div class="stat"><span class="stat-label">Consistency</span><span class="stat-val">${(team.consistency * 100).toFixed(0)}%</span></div>
        <div class="stat"><span class="stat-label">Bench</span><span class="stat-val">${(team.benchDepth * 100).toFixed(0)}%</span></div>
        <div class="stat"><span class="stat-label">SOS Rank</span><span class="stat-val">#${team.sos}</span></div>
        <div class="stat"><span class="stat-label">Coach</span><span class="stat-val">${team.coachRating}/5</span></div>
      </div>
      ${team.injuryImpact < 0 ? `<div class="profile-injury">INJ: ${team.injuryNotes}</div>` : ''}
    </div>`;
  }

  // ===== Aggregate Monte Carlo =====
  async function runAggregate() {
    const numSims = 10000;
    progressArea.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = `Running 0 / ${numSims.toLocaleString()} simulations...`;

    try {
      aggregateResults = await engine.simulate(numSims, (progress) => {
        const pct = Math.round(progress * 100);
        progressFill.style.width = pct + '%';
        const done = Math.round(progress * numSims);
        progressText.textContent = `Running ${done.toLocaleString()} / ${numSims.toLocaleString()} simulations...`;
      });

      progressText.textContent = `Completed ${numSims.toLocaleString()} simulations`;
      setTimeout(() => {
        progressArea.classList.add('hidden');
        renderTable();
        document.getElementById('tableSection').classList.remove('hidden');
      }, 300);
    } catch (err) {
      progressText.textContent = 'Error: ' + err.message;
      console.error(err);
    }
  }

  // ===== Render Probability Table =====
  function renderTable() {
    if (!aggregateResults) return;

    const sortKey = tableSort ? tableSort.value : 'champion';
    const searchTerm = teamSearch ? teamSearch.value.toLowerCase() : '';

    let data = [...aggregateResults];

    if (searchTerm) {
      data = data.filter(t =>
        t.name.toLowerCase().includes(searchTerm) ||
        t.regionName.toLowerCase().includes(searchTerm)
      );
    }

    data.sort((a, b) => {
      if (sortKey === 'seed') return a.seed - b.seed || b.champion - a.champion;
      if (sortKey === 'finalfour') return b.f4 - a.f4;
      if (sortKey === 'sweet16') return b.s16 - a.s16;
      if (sortKey === 'upset') return getUpsetScore(b) - getUpsetScore(a);
      return b.champion - a.champion;
    });

    probTableBody.innerHTML = data.map(t => {
      const fmt = (v) => v < 0.05 ? '<0.1' : v.toFixed(1);
      const cls = (v) => v > 10 ? 'col-pct highlight' : 'col-pct';
      const aem = (t.adjOE - t.adjDE).toFixed(1);
      const inj = t.injuryImpact < -0.1 ? ' [INJ]' : '';
      const coach = t.coachRating >= 4.5 ? ' [HC]' : '';

      return `<tr>
        <td class="col-seed">${t.seed}</td>
        <td class="col-team">${t.name}${inj}${coach}</td>
        <td class="col-region">${t.regionName}</td>
        <td class="col-rating">+${aem}</td>
        <td class="col-coach">${t.coachRating.toFixed(1)}</td>
        <td class="${cls(t.r64)}">${fmt(t.r64)}%</td>
        <td class="${cls(t.r32)}">${fmt(t.r32)}%</td>
        <td class="${cls(t.s16)}">${fmt(t.s16)}%</td>
        <td class="${cls(t.e8)}">${fmt(t.e8)}%</td>
        <td class="${cls(t.f4)}">${fmt(t.f4)}%</td>
        <td class="${cls(t.finals)}">${fmt(t.finals)}%</td>
        <td class="${cls(t.champion)}">${fmt(t.champion)}%</td>
      </tr>`;
    }).join('');
  }

  function getUpsetScore(t) {
    if (t.seed <= 4) return 0;
    return t.s16;
  }

  if (teamSearch) teamSearch.addEventListener('input', renderTable);
  if (tableSort) tableSort.addEventListener('change', renderTable);

  // ===== Seed Color Helper =====
  function getSeedColor(seed) {
    if (seed <= 1) return 'var(--color-seed-1)';
    if (seed <= 2) return 'var(--color-seed-2)';
    if (seed <= 3) return 'var(--color-seed-3)';
    if (seed <= 4) return 'var(--color-seed-4)';
    if (seed <= 8) return 'var(--color-seed-mid)';
    return 'var(--color-seed-low)';
  }

  // ===== Auto-generate on load =====
  setTimeout(() => {
    simBtn.click();
  }, 300);

})();
