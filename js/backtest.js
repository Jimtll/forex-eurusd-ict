// ============================================================
// BACKTESTER — simulation auto ICT sur historique
// Extracted from app.js (refonte modulaire)
// ============================================================

// ============================================================
// FEATURE 12 — BACKTESTER AUTO ICT
// ============================================================

function getZonesForBacktest(type){
  const all = [];
  const tag = (arr, kind) => arr.map(z => ({ ...z, kind }));
  if(type === 'ob' || type === 'ob+fvg') all.push(...tag(state.computed.orderBlocks, 'OB'));
  if(type === 'fvg' || type === 'ob+fvg') all.push(...tag(state.computed.fvgs, 'FVG'));
  if(type === 'bb') all.push(...tag(state.computed.breakers, 'BB'));
  if(type === 'ifvg') all.push(...tag(state.computed.ifvgs, 'IFVG'));
  return all;
}

function findMitigationIdx(zone, candles){
  // Index de la 1re bougie qui touche la zone APRÈS éloignement
  let departed = false;
  for(let i = (zone.idx || 0) + 1; i < candles.length; i++){
    const c = candles[i];
    if(zone.type === 'bullish'){
      if(!departed){ if(c.low > zone.top) departed = true; }
      else if(c.low <= zone.top) return i;
    } else {
      if(!departed){ if(c.high < zone.bottom) departed = true; }
      else if(c.high >= zone.bottom) return i;
    }
  }
  return -1;
}

function simulateTrade(side, entry, sl, tp, candles, startIdx, timeStop){
  const slDist = Math.abs(entry - sl);
  const lastIdx = Math.min(startIdx + timeStop, candles.length - 1);
  for(let i = startIdx + 1; i <= lastIdx; i++){
    const c = candles[i];
    if(side === 'bullish'){
      // Si la bougie touche les deux dans la même candle, on est conservateur : SL d'abord
      if(c.low <= sl) return { result: 'loss', exitIdx: i, exitPrice: sl, R: -1 };
      if(c.high >= tp) return { result: 'win', exitIdx: i, exitPrice: tp, R: (tp - entry) / slDist };
    } else {
      if(c.high >= sl) return { result: 'loss', exitIdx: i, exitPrice: sl, R: -1 };
      if(c.low <= tp) return { result: 'win', exitIdx: i, exitPrice: tp, R: (entry - tp) / slDist };
    }
  }
  // Time stop : close au prix de fin
  const exitPrice = candles[lastIdx].close;
  const R = side === 'bullish' ? (exitPrice - entry) / slDist : (entry - exitPrice) / slDist;
  return { result: 'timeout', exitIdx: lastIdx, exitPrice, R };
}

function runBacktest(config){
  const candles = state.candles;
  if(candles.length < 50) return { trades: [], stats: null, equity: [] };
  const zones = getZonesForBacktest(config.setupType);
  const trades = [];

  for(const zone of zones){
    if(config.direction === 'bullish' && zone.type !== 'bullish') continue;
    if(config.direction === 'bearish' && zone.type !== 'bearish') continue;
    if((zone.score || 0) < config.minScore) continue;
    if(zone.idx === undefined) continue;

    const mitigationIdx = findMitigationIdx(zone, candles);
    if(mitigationIdx === -1) continue;

    let entry, sl, tp;
    const buffer = config.slBuffer * PIP;
    if(zone.type === 'bullish'){
      entry = zone.top;
      sl = zone.bottom - buffer;
      tp = entry + (entry - sl) * config.rr;
    } else {
      entry = zone.bottom;
      sl = zone.top + buffer;
      tp = entry - (sl - entry) * config.rr;
    }

    if(Math.abs(entry - sl) < PIP) continue; // setup trop serré, on skip

    const sim = simulateTrade(zone.type, entry, sl, tp, candles, mitigationIdx, config.timeStop);
    trades.push({
      zoneKind: zone.kind, side: zone.type,
      score: zone.score || 0,
      entryTime: candles[mitigationIdx].time, entryIdx: mitigationIdx,
      entry, sl, tp,
      exitIdx: sim.exitIdx, exitTime: candles[sim.exitIdx].time,
      exitPrice: sim.exitPrice, result: sim.result, R: sim.R,
    });
  }

  trades.sort((a, b) => a.entryTime - b.entryTime);

  const n = trades.length;
  const wins = trades.filter(t => t.R > 0);
  const losses = trades.filter(t => t.R < 0);
  const winrate = n > 0 ? (wins.length / n) * 100 : 0;
  const totalR = trades.reduce((s, t) => s + t.R, 0);
  const avgR = n > 0 ? totalR / n : 0;
  const totalProfit = wins.reduce((s, t) => s + t.R, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.R, 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

  const equity = [];
  let acc = 0, peak = 0, maxDD = 0;
  for(const t of trades){
    acc += t.R;
    equity.push(acc);
    if(acc > peak) peak = acc;
    if(peak - acc > maxDD) maxDD = peak - acc;
  }

  return {
    trades,
    stats: { n, winrate, avgR, totalR, profitFactor, maxDD, wins: wins.length, losses: losses.length },
    equity,
  };
}

let _btEquityChart = null;
let _btLastResults = null;

function renderBacktestResults(results){
  _btLastResults = results;
  const statsEl = document.getElementById('bt-stats');
  const tradesEl = document.getElementById('bt-trades');
  const tradesTitle = document.getElementById('bt-trades-title');
  const equityWrap = document.getElementById('bt-equity-wrap');

  if(!results || !results.stats || results.stats.n === 0){
    statsEl.innerHTML = '<div style="grid-column:span 4;text-align:center;color:var(--orange);padding:30px;font-size:0.86rem">⚠ Aucun setup trouvé avec ces filtres. Essaye un score min plus bas ou un autre type.</div>';
    tradesEl.innerHTML = '';
    tradesTitle.style.display = 'none';
    equityWrap.style.display = 'none';
    return;
  }

  const s = results.stats;
  statsEl.innerHTML = `
    <div class="bt-stat"><div class="label">Trades</div><div class="value">${s.n}</div><div class="sub">${s.wins}W / ${s.losses}L</div></div>
    <div class="bt-stat"><div class="label">Winrate</div><div class="value ${s.winrate>=50?'up':'down'}">${s.winrate.toFixed(1)}%</div></div>
    <div class="bt-stat"><div class="label">R moyen</div><div class="value ${s.avgR>0?'up':'down'}">${s.avgR>0?'+':''}${s.avgR.toFixed(2)}R</div></div>
    <div class="bt-stat"><div class="label">Total R</div><div class="value ${s.totalR>0?'up':'down'}">${s.totalR>0?'+':''}${s.totalR.toFixed(1)}R</div></div>
    <div class="bt-stat"><div class="label">Profit factor</div><div class="value ${s.profitFactor>=1.5?'up':s.profitFactor>=1?'':'down'}">${isFinite(s.profitFactor)?s.profitFactor.toFixed(2):'∞'}</div></div>
    <div class="bt-stat"><div class="label">Max DD</div><div class="value down">-${s.maxDD.toFixed(1)}R</div></div>
    <div class="bt-stat"><div class="label">Expectancy</div><div class="value ${s.avgR>0?'up':'down'}">${(s.avgR*100).toFixed(0)}€ / 100€ risqué</div></div>
    <div class="bt-stat"><div class="label">Verdict</div><div class="value ${s.profitFactor>=1.5?'up':s.profitFactor>=1?'':'down'}" style="font-size:0.92rem">${s.profitFactor>=1.5?'✓ Rentable':s.profitFactor>=1?'⚠ Marginal':'✗ Perdant'}</div></div>
  `;

  // Equity curve
  equityWrap.style.display = 'block';
  if(_btEquityChart) _btEquityChart.destroy();
  const canvas = document.getElementById('bt-equity-chart');
  _btEquityChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: results.equity.map((_, i) => i + 1),
      datasets: [{
        data: results.equity,
        borderColor: results.equity[results.equity.length - 1] >= 0 ? '#10b981' : '#ef4444',
        backgroundColor: results.equity[results.equity.length - 1] >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        fill: true, tension: 0.15, pointRadius: 0, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: c => `Trade ${c.parsed.x} : ${c.parsed.y > 0 ? '+' : ''}${c.parsed.y.toFixed(2)}R cumulés` }
      }},
      scales: {
        x: { display: false },
        y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    },
  });

  // Trades list (max 100, plus récents en premier)
  tradesTitle.style.display = 'block';
  tradesTitle.textContent = `Trades simulés (${results.trades.length})`;
  const top = results.trades.slice().reverse().slice(0, 100);
  tradesEl.innerHTML = top.map(t => {
    const date = new Date(t.entryTime * 1000).toISOString().slice(5, 16).replace('T', ' ');
    const sign = t.R > 0 ? '+' : '';
    return `
      <div class="bt-trade">
        <span class="bt-side ${t.side}">${t.side === 'bullish' ? '▲' : '▼'} ${t.zoneKind}</span>
        <span class="bt-date">${date}</span>
        <span class="bt-prices">${t.entry.toFixed(5)} → ${t.exitPrice.toFixed(5)}</span>
        <span style="font-size:0.65rem;color:var(--muted)">score ${t.score}</span>
        <span class="bt-outcome ${t.result === 'win' ? 'win' : t.result === 'loss' ? 'loss' : 'timeout'}">${sign}${t.R.toFixed(2)}R</span>
      </div>
    `;
  }).join('');
  if(results.trades.length > 100){
    tradesEl.innerHTML += `<div style="text-align:center;padding:8px;font-size:0.7rem;color:var(--muted)">+${results.trades.length - 100} autres trades non affichés</div>`;
  }

  // Update chart markers if toggle is on
  if(document.getElementById('bt-show-markers').checked){
    renderBacktestMarkersOnChart(results.trades);
  }
}

function renderBacktestMarkersOnChart(trades){
  if(!state.series) return;
  // On clean les anciens markers swings d'abord (les markers natifs sont uniques)
  // Sauvegarde si swings actifs, on les réintègrera après
  const swingMarkers = state.indicators.swings
    ? state.computed.swings.slice(-80).map(s => ({
        time: s.time,
        position: s.type === 'high' ? 'aboveBar' : 'belowBar',
        color: '#94a3b8',
        shape: s.type === 'high' ? 'arrowDown' : 'arrowUp',
        size: 0.7,
      }))
    : [];
  const btMarkers = trades.map(t => ({
    time: t.entryTime,
    position: t.side === 'bullish' ? 'belowBar' : 'aboveBar',
    color: t.R > 0 ? '#10b981' : t.R < 0 ? '#ef4444' : '#94a3b8',
    shape: t.side === 'bullish' ? 'arrowUp' : 'arrowDown',
    size: 1.2,
    text: (t.R > 0 ? '+' : '') + t.R.toFixed(1) + 'R',
  }));
  const combined = [...swingMarkers, ...btMarkers].sort((a, b) => a.time - b.time);
  state.series.setMarkers(combined);
  state.btMarkersActive = true;
}

function clearBacktestMarkers(){
  state.btMarkersActive = false;
  renderSwings(); // Restore swing markers only
}

function getBacktestConfig(){
  return {
    setupType: document.getElementById('bt-setup-type').value,
    direction: document.getElementById('bt-direction').value,
    minScore: parseInt(document.getElementById('bt-min-score').value, 10),
    rr: parseFloat(document.getElementById('bt-rr').value),
    timeStop: parseInt(document.getElementById('bt-time-stop').value, 10) || 50,
    slBuffer: parseFloat(document.getElementById('bt-sl-buffer').value) || 3,
  };
}

function updateBtDataInfo(){
  const info = document.getElementById('bt-data-info');
  if(!info) return;
  const n = state.candles.length;
  const mode = state.liveMode ? 'LIVE' : 'mock';
  info.textContent = `${n} bougies ${state.currentTf} (${mode})`;
}

function wireBacktest(){
  const modal = document.getElementById('modal-backtest');
  document.getElementById('open-backtest').addEventListener('click', () => {
    modal.classList.add('open');
    updateBtDataInfo();
  });
  document.getElementById('btn-close-backtest').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });

  document.getElementById('btn-run-backtest').addEventListener('click', () => {
    const config = getBacktestConfig();
    const results = runBacktest(config);
    renderBacktestResults(results);
  });

  document.getElementById('bt-show-markers').addEventListener('change', e => {
    if(e.target.checked && _btLastResults){
      renderBacktestMarkersOnChart(_btLastResults.trades);
    } else {
      clearBacktestMarkers();
    }
  });
}

