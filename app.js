/**
 * Application Controller
 * Manages UI interactions, bracket rendering, and simulation display
 */

(function() {
  // ===== Theme Toggle =====
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // default dark

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
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

  // ===== DOM References =====
  const runBtn = document.getElementById('runSimBtn');
  const simCountSelect = document.getElementById('simCount');
  const progressArea = document.getElementById('progressArea');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const summarySection = document.getElementById('summarySection');
  const summaryCards = document.getElementById('summaryCards');
  const bracketContainer = document.getElementById('bracketContainer');
  const tableSection = document.getElementById('tableSection');
  const probTableBody = document.getElementById('probTableBody');
  const teamSearch = document.getElementById('teamSearch');
  const tableSort = document.getElementById('tableSort');

  let currentResults = null;
  let activeRegion = 'east';

  // ===== Bracket Tabs =====
  document.querySelectorAll('.bracket-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeRegion = tab.dataset.region;
      renderBracket(activeRegion);
    });
  });

  // ===== Run Simulation =====
  runBtn.addEventListener('click', async () => {
    const numSims = parseInt(simCountSelect.value);
    
    runBtn.disabled = true;
    progressArea.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = `Running 0 / ${numSims.toLocaleString()} simulations...`;

    try {
      currentResults = await engine.simulate(numSims, (progress) => {
        const pct = Math.round(progress * 100);
        progressFill.style.width = pct + '%';
        const done = Math.round(progress * numSims);
        progressText.textContent = `Running ${done.toLocaleString()} / ${numSims.toLocaleString()} simulations...`;
      });

      progressText.textContent = `Completed ${numSims.toLocaleString()} simulations`;
      
      setTimeout(() => {
        progressArea.classList.add('hidden');
        renderSummary();
        renderBracket(activeRegion);
        renderTable();
        summarySection.classList.remove('hidden');
        tableSection.classList.remove('hidden');
      }, 300);

    } catch(err) {
      progressText.textContent = 'Error: ' + err.message;
      console.error(err);
    }

    runBtn.disabled = false;
  });

  // ===== Render Summary Cards =====
  function renderSummary() {
    if (!currentResults) return;

    const sorted = [...currentResults].sort((a, b) => b.champion - a.champion);
    const top8 = sorted.slice(0, 8);
    const maxPct = top8[0].champion;

    const colors = [
      'var(--color-accent)', 'var(--color-blue)', 'var(--color-green)',
      'var(--color-yellow)', 'var(--color-purple)', 'var(--color-accent)',
      'var(--color-blue)', 'var(--color-green)'
    ];

    summaryCards.innerHTML = top8.map((t, i) => `
      <div class="summary-card" style="--bar-color: ${colors[i]}">
        <span class="card-seed">#${t.seed} Seed</span>
        <span class="card-team">${t.name}</span>
        <span class="card-region">${t.regionName} Region</span>
        <span class="card-pct">${t.champion.toFixed(1)}%</span>
        <div class="card-bar">
          <div class="card-bar-fill" style="width: ${(t.champion / maxPct * 100).toFixed(1)}%; background: ${colors[i]}"></div>
        </div>
      </div>
    `).join('');
  }

  // ===== Render Bracket =====
  function renderBracket(regionKey) {
    if (regionKey === 'finalfour') {
      renderFinalFour();
      return;
    }

    const teams = REGIONS[regionKey].teams;
    const matchupProbs = engine.getMatchupProbabilities(regionKey);
    
    // Build round structure
    // Round 1: 8 matchups
    const roundNames = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];
    
    // Get simulation data if available
    const simData = {};
    if (currentResults) {
      currentResults.filter(t => t.region === regionKey).forEach(t => {
        simData[t.name] = t;
      });
    }

    let html = '<div class="bracket-grid">';

    // Round 1
    html += '<div class="bracket-round">';
    html += `<div class="round-title">${roundNames[0]}</div>`;
    for (let i = 0; i < teams.length; i += 2) {
      const tA = teams[i];
      const tB = teams[i + 1];
      const probA = engine.winProbability(tA.rating, tB.rating);
      const probB = 1 - probA;
      const winnerA = probA > probB;

      html += `
        <div class="matchup">
          <div class="matchup-team ${winnerA ? 'winner' : ''}">
            <span class="team-seed">${tA.seed}</span>
            <span class="team-name">${tA.name}</span>
            <span class="team-pct ${probA > 0.7 ? 'high' : ''}">${(probA * 100).toFixed(0)}%</span>
          </div>
          <div class="matchup-team ${!winnerA ? 'winner' : ''}">
            <span class="team-seed">${tB.seed}</span>
            <span class="team-name">${tB.name}</span>
            <span class="team-pct ${probB > 0.7 ? 'high' : ''}">${(probB * 100).toFixed(0)}%</span>
          </div>
        </div>`;
    }
    html += '</div>';

    // Subsequent rounds (show probabilities from sim data)
    const roundKeys = ['r32', 's16', 'e8'];
    for (let r = 0; r < 3; r++) {
      const numMatchups = 4 / Math.pow(2, r);
      html += '<div class="bracket-round">';
      html += `<div class="round-title">${roundNames[r + 1]}</div>`;
      
      if (currentResults) {
        // Get teams sorted by their probability of reaching this round
        const roundKey = roundKeys[r];
        const regionTeams = currentResults
          .filter(t => t.region === regionKey && t[roundKey] > 0)
          .sort((a, b) => b[roundKey] - a[roundKey]);

        // Group into matchup slots based on bracket position
        const slots = getBracketSlots(regionKey, r + 1);
        slots.forEach(slot => {
          html += '<div class="matchup">';
          slot.forEach(teamName => {
            const td = simData[teamName];
            if (td) {
              const pct = td[roundKey];
              html += `
                <div class="matchup-team ${pct > 50 ? 'winner' : ''}">
                  <span class="team-seed">${td.seed}</span>
                  <span class="team-name">${td.name}</span>
                  <span class="team-pct ${pct > 60 ? 'high' : ''}">${pct.toFixed(1)}%</span>
                </div>`;
            }
          });
          html += '</div>';
        });
      } else {
        // No sim data yet — show placeholder
        for (let m = 0; m < numMatchups; m++) {
          html += `
            <div class="matchup">
              <div class="matchup-team"><span class="team-name" style="color:var(--color-text-faint)">Run simulation</span></div>
              <div class="matchup-team"><span class="team-name" style="color:var(--color-text-faint)">to see picks</span></div>
            </div>`;
        }
      }
      html += '</div>';
    }

    html += '</div>';
    bracketContainer.innerHTML = html;
  }

  /**
   * Get bracket slot groupings for later rounds
   * Returns array of [teamNameA, teamNameB] pairs based on bracket position
   */
  function getBracketSlots(regionKey, round) {
    const teams = REGIONS[regionKey].teams;
    // Round 1 matchup winners feed into round 2 in order
    // Bracket structure: 
    // R32: (1/16 winner vs 8/9 winner), (5/12 vs 4/13), (6/11 vs 3/14), (7/10 vs 2/15)
    // S16: (top half R32 winner vs bottom half R32 winner in each half)
    // E8: S16 winners
    
    if (round === 1) {
      // R32: pairs of R64 matchup-winner slots
      return [
        [teams[0].name, teams[1].name, teams[2].name, teams[3].name],  // 1/16 vs 8/9
        [teams[4].name, teams[5].name, teams[6].name, teams[7].name],  // 5/12 vs 4/13
        [teams[8].name, teams[9].name, teams[10].name, teams[11].name], // 6/11 vs 3/14
        [teams[12].name, teams[13].name, teams[14].name, teams[15].name], // 7/10 vs 2/15
      ];
    }
    if (round === 2) {
      // S16: top half vs bottom half
      return [
        [teams[0].name, teams[1].name, teams[2].name, teams[3].name,
         teams[4].name, teams[5].name, teams[6].name, teams[7].name],
        [teams[8].name, teams[9].name, teams[10].name, teams[11].name,
         teams[12].name, teams[13].name, teams[14].name, teams[15].name],
      ];
    }
    if (round === 3) {
      // E8: all teams in region
      return [teams.map(t => t.name)];
    }
    return [];
  }

  // ===== Render Final Four =====
  function renderFinalFour() {
    if (!currentResults) {
      bracketContainer.innerHTML = `
        <div style="text-align:center; padding: var(--space-12); color: var(--color-text-muted);">
          <p>Run the simulation to see Final Four probabilities</p>
        </div>`;
      return;
    }

    const sorted = [...currentResults].sort((a, b) => b.f4 - a.f4);
    const topFF = sorted.slice(0, 12);
    const topChamp = sorted.slice(0, 1)[0];

    // Get top teams from each side
    const eastSouth = currentResults
      .filter(t => t.region === 'east' || t.region === 'south')
      .sort((a, b) => b.f4 - a.f4).slice(0, 4);
    
    const westMidwest = currentResults
      .filter(t => t.region === 'west' || t.region === 'midwest')
      .sort((a, b) => b.f4 - a.f4).slice(0, 4);

    const topFinals = [...currentResults].sort((a, b) => b.finals - a.finals).slice(0, 4);

    let html = `<div class="final-four-grid">`;

    // Semifinal 1: East vs South
    html += `<div class="ff-semifinal">
      <div class="ff-label">East vs South</div>`;
    html += `<div class="matchup">`;
    eastSouth.forEach(t => {
      html += `
        <div class="matchup-team ${t.f4 === eastSouth[0].f4 ? 'winner' : ''}">
          <span class="team-seed">${t.seed}</span>
          <span class="team-name">${t.name}</span>
          <span class="team-pct ${t.f4 > 30 ? 'high' : ''}">${t.f4.toFixed(1)}%</span>
        </div>`;
    });
    html += `</div></div>`;

    // Championship
    html += `<div class="ff-championship">
      <div class="ff-label">Championship</div>
      <div class="matchup">`;
    topFinals.forEach(t => {
      html += `
        <div class="matchup-team ${t.champion === topChamp.champion ? 'winner' : ''}">
          <span class="team-seed">${t.seed}</span>
          <span class="team-name">${t.name}</span>
          <span class="team-pct ${t.champion > 10 ? 'high' : ''}">${t.champion.toFixed(1)}%</span>
        </div>`;
    });
    html += `</div>
      <div class="ff-champion-area">
        <div class="ff-champion-label">Most Likely Champion</div>
        <div class="ff-champion-name">${topChamp.name}</div>
        <div class="ff-champion-pct">${topChamp.champion.toFixed(1)}% — ${topChamp.regionName} #${topChamp.seed}</div>
      </div>
    </div>`;

    // Semifinal 2: West vs Midwest
    html += `<div class="ff-semifinal">
      <div class="ff-label">West vs Midwest</div>`;
    html += `<div class="matchup">`;
    westMidwest.forEach(t => {
      html += `
        <div class="matchup-team ${t.f4 === westMidwest[0].f4 ? 'winner' : ''}">
          <span class="team-seed">${t.seed}</span>
          <span class="team-name">${t.name}</span>
          <span class="team-pct ${t.f4 > 30 ? 'high' : ''}">${t.f4.toFixed(1)}%</span>
        </div>`;
    });
    html += `</div></div>`;

    html += `</div>`;
    bracketContainer.innerHTML = html;
  }

  // ===== Render Table =====
  function renderTable() {
    if (!currentResults) return;
    
    const sortKey = tableSort.value;
    const searchTerm = teamSearch.value.toLowerCase();

    let data = [...currentResults];
    
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
      return b.champion - a.champion;
    });

    probTableBody.innerHTML = data.map(t => {
      const fmt = (v) => v < 0.05 ? '<0.1' : v.toFixed(1);
      const cls = (v) => v > 10 ? 'col-pct highlight' : 'col-pct';
      
      return `<tr>
        <td class="col-seed">${t.seed}</td>
        <td class="col-team">${t.name}</td>
        <td class="col-region">${t.regionName}</td>
        <td class="col-rating">${t.rating}</td>
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

  // Table search/sort handlers
  teamSearch.addEventListener('input', renderTable);
  tableSort.addEventListener('change', renderTable);

  // ===== Initial Bracket Render =====
  renderBracket('east');

  // Auto-run a quick simulation on load
  setTimeout(() => {
    runBtn.click();
  }, 500);

})();
