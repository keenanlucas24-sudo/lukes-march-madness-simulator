/**
 * Application Controller v2.0
 * Enhanced with upset alerts, matchup analysis, and factor breakdowns
 */

(function() {
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

    summaryCards.innerHTML = top8.map((t, i) => {
      // Generate a quick insight for each team
      const insight = getTeamInsight(t);
      return `
      <div class="summary-card" style="--bar-color: ${colors[i]}">
        <span class="card-seed">#${t.seed} Seed</span>
        <span class="card-team">${t.name}</span>
        <span class="card-region">${t.regionName} Region</span>
        <span class="card-pct">${t.champion.toFixed(1)}%</span>
        <div class="card-insight">${insight}</div>
        <div class="card-bar">
          <div class="card-bar-fill" style="width: ${(t.champion / maxPct * 100).toFixed(1)}%; background: ${colors[i]}"></div>
        </div>
      </div>`;
    }).join('');
  }

  function getTeamInsight(t) {
    if (t.consistency >= 0.85) return 'Elite consistency — unlikely to get upset';
    if (t.threePtRate >= 0.44) return 'High 3PT volume — volatile: blowout or bust';
    if (t.adjDE <= 91.5) return 'Defensive wall — suffocates opponents';
    if (t.adjOE >= 128) return 'Offensive juggernaut — can outscore anyone';
    if (t.experience >= 3.0) return 'Veteran roster — clutch in close games';
    if (t.hotStreak >= 1.5) return 'Red hot entering tournament';
    if (t.benchDepth >= 0.36) return 'Deep bench — built for a 6-game run';
    if (t.tempo <= 64) return 'Pace-controlling — forces opponents off rhythm';
    if (t.adjOE - t.adjDE >= 28) return 'Two-way powerhouse — elite on both ends';
    if (t.toureyExp >= 4) return 'Tournament pedigree — thrives under pressure';
    if (t.consistency >= 0.72) return 'Steady and reliable — few off nights';
    return `Strong all-around — +${(t.adjOE - t.adjDE).toFixed(0)} efficiency margin`;
  }

  // ===== Render Bracket =====
  function renderBracket(regionKey) {
    if (regionKey === 'finalfour') {
      renderFinalFour();
      return;
    }

    const teams = REGIONS[regionKey].teams;
    const roundNames = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];

    const simData = {};
    if (currentResults) {
      currentResults.filter(t => t.region === regionKey).forEach(t => {
        simData[t.name] = t;
      });
    }

    const r32Slots = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]];
    const s16Slots = [[0,1,2,3,4,5,6,7],[8,9,10,11,12,13,14,15]];

    let html = '<div class="bracket-grid">';

    // R64
    html += '<div class="bracket-round">';
    html += `<div class="round-title">${roundNames[0]}</div>`;
    for (let i = 0; i < teams.length; i += 2) {
      const tA = teams[i];
      const tB = teams[i + 1];
      const probA = engine.quickWinProb(tA, tB);
      const probB = 1 - probA;
      const isUpset = probB > 0.25 && tB.seed > tA.seed + 2;
      
      html += `<div class="matchup ${isUpset ? 'upset-alert' : ''}">
        <div class="matchup-team ${probA >= probB ? 'winner' : ''}">
          <span class="team-seed">${tA.seed}</span>
          <span class="team-name">${tA.name}</span>
          <span class="team-pct ${probA > 0.7 ? 'high' : ''}">${(probA * 100).toFixed(0)}%</span>
        </div>
        <div class="matchup-team ${probB > probA ? 'winner' : ''}">
          <span class="team-seed">${tB.seed}</span>
          <span class="team-name">${tB.name}</span>
          <span class="team-pct ${probB > 0.3 ? 'high' : ''}">${(probB * 100).toFixed(0)}%</span>
        </div>
        ${isUpset ? '<div class="upset-tag">UPSET WATCH</div>' : ''}
      </div>`;
    }
    html += '</div>';

    function renderSlotMatchup(slotIndices, roundKey) {
      if (!currentResults) {
        return `<div class="matchup"><div class="matchup-team"><span class="team-name" style="color:var(--color-text-faint)">TBD</span></div><div class="matchup-team"><span class="team-name" style="color:var(--color-text-faint)">TBD</span></div></div>`;
      }
      const slotTeams = slotIndices.map(i => simData[teams[i].name])
        .filter(t => t && t[roundKey] > 0.05)
        .sort((a, b) => b[roundKey] - a[roundKey])
        .slice(0, 2);

      if (slotTeams.length === 0) {
        return `<div class="matchup"><div class="matchup-team"><span class="team-name" style="color:var(--color-text-faint)">TBD</span></div></div>`;
      }

      let h = '<div class="matchup">';
      slotTeams.forEach((td, idx) => {
        const pct = td[roundKey];
        h += `<div class="matchup-team ${idx === 0 ? 'winner' : ''}">
          <span class="team-seed">${td.seed}</span>
          <span class="team-name">${td.name}</span>
          <span class="team-pct ${pct > 50 ? 'high' : ''}">${pct.toFixed(1)}%</span>
        </div>`;
      });
      h += '</div>';
      return h;
    }

    // R32
    html += '<div class="bracket-round">';
    html += `<div class="round-title">${roundNames[1]}</div>`;
    r32Slots.forEach(slot => { html += renderSlotMatchup(slot, 'r32'); });
    html += '</div>';

    // S16
    html += '<div class="bracket-round">';
    html += `<div class="round-title">${roundNames[2]}</div>`;
    s16Slots.forEach(slot => { html += renderSlotMatchup(slot, 's16'); });
    html += '</div>';

    // E8
    html += '<div class="bracket-round">';
    html += `<div class="round-title">${roundNames[3]}</div>`;
    html += renderSlotMatchup(Array.from({length: 16}, (_, i) => i), 'e8');
    html += '</div>';

    html += '</div>';
    bracketContainer.innerHTML = html;
  }

  // ===== Render Final Four =====
  function renderFinalFour() {
    if (!currentResults) {
      bracketContainer.innerHTML = `<div style="text-align:center; padding: var(--space-12); color: var(--color-text-muted);"><p>Run the simulation to see Final Four probabilities</p></div>`;
      return;
    }

    const sorted = [...currentResults].sort((a, b) => b.champion - a.champion);
    const topChamp = sorted[0];

    const eastSouth = currentResults
      .filter(t => t.region === 'east' || t.region === 'south')
      .sort((a, b) => b.f4 - a.f4).slice(0, 4);
    
    const westMidwest = currentResults
      .filter(t => t.region === 'west' || t.region === 'midwest')
      .sort((a, b) => b.f4 - a.f4).slice(0, 4);

    const topFinals = sorted.slice(0, 4);

    let html = `<div class="final-four-grid">`;

    html += `<div class="ff-semifinal"><div class="ff-label">East vs South</div><div class="matchup">`;
    eastSouth.forEach(t => {
      html += `<div class="matchup-team ${t.f4 === eastSouth[0].f4 ? 'winner' : ''}">
        <span class="team-seed">${t.seed}</span>
        <span class="team-name">${t.name}</span>
        <span class="team-pct ${t.f4 > 25 ? 'high' : ''}">${t.f4.toFixed(1)}%</span>
      </div>`;
    });
    html += `</div></div>`;

    html += `<div class="ff-championship"><div class="ff-label">Championship</div><div class="matchup">`;
    topFinals.forEach(t => {
      html += `<div class="matchup-team ${t.champion === topChamp.champion ? 'winner' : ''}">
        <span class="team-seed">${t.seed}</span>
        <span class="team-name">${t.name}</span>
        <span class="team-pct ${t.champion > 8 ? 'high' : ''}">${t.champion.toFixed(1)}%</span>
      </div>`;
    });
    html += `</div>
      <div class="ff-champion-area">
        <div class="ff-champion-label">Most Likely Champion</div>
        <div class="ff-champion-name">${topChamp.name}</div>
        <div class="ff-champion-pct">${topChamp.champion.toFixed(1)}% — ${topChamp.regionName} #${topChamp.seed}</div>
      </div>
    </div>`;

    html += `<div class="ff-semifinal"><div class="ff-label">West vs Midwest</div><div class="matchup">`;
    westMidwest.forEach(t => {
      html += `<div class="matchup-team ${t.f4 === westMidwest[0].f4 ? 'winner' : ''}">
        <span class="team-seed">${t.seed}</span>
        <span class="team-name">${t.name}</span>
        <span class="team-pct ${t.f4 > 25 ? 'high' : ''}">${t.f4.toFixed(1)}%</span>
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
      if (sortKey === 'upset') return getUpsetScore(b) - getUpsetScore(a);
      return b.champion - a.champion;
    });

    probTableBody.innerHTML = data.map(t => {
      const fmt = (v) => v < 0.05 ? '<0.1' : v.toFixed(1);
      const cls = (v) => v > 10 ? 'col-pct highlight' : 'col-pct';
      const aem = (t.adjOE - t.adjDE).toFixed(1);
      
      return `<tr>
        <td class="col-seed">${t.seed}</td>
        <td class="col-team">${t.name}</td>
        <td class="col-region">${t.regionName}</td>
        <td class="col-rating">+${aem}</td>
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
    // How likely is this team to cause an upset (exceed their seed)?
    if (t.seed <= 4) return 0;
    return t.s16; // Sweet 16 probability for a lower seed = upset potential
  }

  teamSearch.addEventListener('input', renderTable);
  tableSort.addEventListener('change', renderTable);

  // ===== Initial Render =====
  renderBracket('east');
  setTimeout(() => { runBtn.click(); }, 500);

})();
