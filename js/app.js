// ============================================================
// APP — chart init, UI wiring, paper trading, backtester,
// replay, annotations, sync, onboarding, bottom nav, etc.
// Généré par extraction depuis index.html (refonte modulaire)
// ============================================================
'use strict';


// ============================================================
// MOCK DATA GENERATOR — bougies EUR/USD réalistes
// ============================================================
// Génère des bougies M15 sur ~90 jours, puis aggrège pour
// H1 / H4 / D1. Volatilité dépendante des sessions GMT.

// ============================================================
// STATE
// ============================================================
const TF_SECONDS = { M1: 60, M5: 300, M15: 900, H1: 3600, H4: 14400, D1: 86400 };
const state = {
  m15: [],
  currentTf: 'H1',
  candles: [],
  chart: null,
  series: null,
  // Phase 2 — ICT
  indicators: {
    swings: false, bos: false, liquidity: false,
    ob: false, fvg: false, pd: false, kz: false,
    breaker: false, ifvg: false, ote: false,
    amd: false, pdarrays: false, irlerl: false,
    multitf: false, news: false,
  },
  computed: {
    swings: [],
    structure: { trend: null, events: [] },
    liquidity: { bsl: [], ssl: [], sweeps: [] },
    orderBlocks: [],
    fvgs: [],
    pd: null,
    breakers: [],
    ifvgs: [],
    ote: null,
  },
  // Phase 4 — Risk
  rrTrade: { active: false, entry: null, sl: null, tp: null, lines: [] },
  trades: JSON.parse(localStorage.getItem('eurusd_trades') || '[]'),
  // Phase 5 — Live data
  liveMode: false,
  livePollTimer: null,
  apiKey: localStorage.getItem('twelvedata_key') || '',
  pollIntervalMs: parseInt(localStorage.getItem('poll_interval_ms') || '60000', 10),
  overlayCanvas: null,
  overlayCtx: null,
  priceLines: [], // { kind, line }
};

function regenerateData(){
  // Clear caches et bases dérivées
  state.m1 = null;
  if(typeof _computeCache !== 'undefined' && _computeCache.clear) _computeCache.clear();
  // Génère selon le mode choisi (réaliste ou random)
  const mode = localStorage.getItem('mock_mode') || 'realistic';
  if(mode === 'realistic' && typeof generateRealisticM15 === 'function'){
    state.m15 = generateRealisticM15(7000);
  } else {
    state.m15 = generateM15Candles(7000);
  }
  rebuildCurrentTf();
}

async function rebuildCurrentTf(){
  if(state.liveMode){
    try {
      const candles = await fetchTwelveData(state.currentTf, 800);
      state.candles = candles;
    } catch(err){
      console.warn('[TF switch] fallback mock :', err.message);
      state.candles = buildMockTf(state.currentTf);
    }
  } else {
    state.candles = buildMockTf(state.currentTf);
  }
  if(state.series) state.series.setData(state.candles);
  updatePriceDisplay();
  fitTimeRange();
  recomputeAll();
  renderAll();
  if(state.liveMode) startLivePolling();
}

function buildMockTf(tf){
  // M1 / M5 : base M1 dédiée (générée à la demande, ~5 jours scalping)
  if(tf === 'M1' || tf === 'M5'){
    if(!state.m1 || state.m1.length === 0){
      state.m1 = generateRealisticM1(5000);
    }
    return tf === 'M1' ? state.m1.slice() : aggregate(state.m1, 300);
  }
  // M15 base : aggrège vers M15/H1/H4/D1
  if(tf === 'M15') return state.m15.slice();
  return aggregate(state.m15, TF_SECONDS[tf]);
}

// ============================================================
// CHART
// ============================================================
function initChart(){
  const container = document.getElementById('chart');
  const chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { type: 'solid', color: '#0f1117' },
      textColor: '#94a3b8',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.04)' },
      horzLines: { color: 'rgba(255,255,255,0.04)' },
    },
    rightPriceScale: {
      borderColor: 'rgba(255,255,255,0.07)',
    },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.07)',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 6,
      barSpacing: 7,
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: 'rgba(255,255,255,0.18)', width: 1, style: 3 },
      horzLine: { color: 'rgba(255,255,255,0.18)', width: 1, style: 3 },
    },
    handleScroll: true,
    handleScale: true,
    localization: {
      priceFormatter: p => p.toFixed(5),
    },
  });

  const series = chart.addCandlestickSeries({
    upColor: '#10b981',
    downColor: '#ef4444',
    borderUpColor: '#10b981',
    borderDownColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
  });

  // Update OHLC overlay on crosshair move
  chart.subscribeCrosshairMove(param => {
    if(!param || !param.time || !param.seriesData){
      // Pas de hover : affiche la dernière bougie
      const last = state.candles[state.candles.length - 1];
      if(last) renderOhlc(last);
      return;
    }
    const c = param.seriesData.get(series);
    if(c) renderOhlc(c);
  });

  state.chart = chart;
  state.series = series;

  // Resize handling
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    sizeOverlay();
    drawCanvasOverlays();
  });
  ro.observe(container);

  // Setup overlay canvas + redraw hooks
  setupOverlayCanvas();
  chart.timeScale().subscribeVisibleLogicalRangeChange(drawCanvasOverlays);
}

function renderOhlc(c){
  const fmt = v => v.toFixed(5);
  document.getElementById('ov-o').textContent = fmt(c.open);
  document.getElementById('ov-h').textContent = fmt(c.high);
  document.getElementById('ov-l').textContent = fmt(c.low);
  const closeEl = document.getElementById('ov-c');
  closeEl.textContent = fmt(c.close);
  closeEl.className = 'ohlc-val ' + (c.close >= c.open ? 'up' : 'down');
}

function fitTimeRange(){
  if(!state.chart || state.candles.length === 0) return;
  // Affiche les ~150 dernières bougies au démarrage / au switch
  const visibleCount = Math.min(150, state.candles.length);
  const lastIdx = state.candles.length - 1;
  const fromIdx = Math.max(0, lastIdx - visibleCount + 1);
  state.chart.timeScale().setVisibleLogicalRange({
    from: fromIdx,
    to: lastIdx + 4, // un peu d'air à droite
  });
}

function updatePriceDisplay(){
  if(state.candles.length === 0) return;
  const last = state.candles[state.candles.length - 1];
  const prev = state.candles[state.candles.length - 2] || last;

  document.getElementById('price-display').textContent = last.close.toFixed(5);

  const deltaPips = (last.close - prev.close) / PIP;
  const changeEl = document.getElementById('price-change');
  const sign = deltaPips > 0 ? '+' : '';
  changeEl.textContent = `${sign}${deltaPips.toFixed(1)} pips`;
  changeEl.className = 'change ' + (deltaPips > 0.1 ? 'up' : deltaPips < -0.1 ? 'down' : 'flat');

  renderOhlc(last);
}

// ============================================================
// UI WIRING
// ============================================================
function wireTimeframePills(){
  document.querySelectorAll('.tf-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTf = btn.dataset.tf;
      rebuildCurrentTf();
    });
  });
}

function wireSectionToggles(){
  document.querySelectorAll('.panel-section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });
}

function wireSettingsModal(){
  const modal = document.getElementById('modal-settings');
  document.getElementById('open-settings').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('btn-close-settings').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => {
    if(e.target === modal) modal.classList.remove('open');
  });
  document.getElementById('btn-regen').addEventListener('click', () => {
    regenerateData();
    modal.classList.remove('open');
  });
  // Relance onboarding
  const btnRestart = document.getElementById('btn-restart-onboarding');
  if(btnRestart) btnRestart.addEventListener('click', () => {
    modal.classList.remove('open');
    startOnboarding();
  });
}

function wireDrawerToggle(){
  const panel = document.getElementById('side-panel');
  const toggle = document.getElementById('drawer-toggle');
  const hint = document.getElementById('mobile-hint');
  const hintShown = localStorage.getItem('mobile_hint_dismissed') === 'true';
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.classList.add('opened-once');
    if(hint) hint.classList.remove('visible');
    localStorage.setItem('mobile_hint_dismissed', 'true');
  });
  // Affiche le hint après 1.5s sur mobile si jamais ouvert
  if(!hintShown && window.innerWidth <= 900 && hint){
    setTimeout(() => { hint.classList.add('visible'); }, 1500);
    // Auto-hide après 8s
    setTimeout(() => { hint.classList.remove('visible'); }, 9500);
  }
  // Swipe gesture : depuis le bord droit, swipe vers la gauche ouvre le drawer
  let touchStartX = null, touchStartY = null;
  document.addEventListener('touchstart', e => {
    if(window.innerWidth > 900) return;
    const t = e.touches[0];
    if(t.clientX > window.innerWidth - 30){
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if(touchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = touchStartX - t.clientX;
    const dy = Math.abs(touchStartY - t.clientY);
    if(dx > 40 && dy < 60 && !panel.classList.contains('open')){
      panel.classList.add('open');
      toggle.classList.add('opened-once');
      if(hint) hint.classList.remove('visible');
      localStorage.setItem('mobile_hint_dismissed', 'true');
    }
    touchStartX = null;
  }, { passive: true });
}

function wireIndicatorToggles(){
  document.querySelectorAll('input[data-ind]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.ind;
      if(Object.prototype.hasOwnProperty.call(state.indicators, key)){
        state.indicators[key] = input.checked;
        // multitf modifie les htfZones + scores → besoin de recompute
        if(key === 'multitf') recomputeAll();
        renderAll();
      }
    });
  });
}

// ============================================================
// PHASE 4 — RISK : Position size + R/R Visualizer + Journal
// ============================================================

const PIP_VALUE_PER_LOT = 10; // EUR/USD : 1 pip = 10$ par lot standard

function calcPositionSize(){
  const cap = parseFloat(document.getElementById('ps-capital').value);
  const risk = parseFloat(document.getElementById('ps-risk').value);
  const entry = parseFloat(document.getElementById('ps-entry').value);
  const sl = parseFloat(document.getElementById('ps-sl').value);
  const result = document.getElementById('ps-result');
  if(isNaN(cap) || isNaN(risk) || isNaN(entry) || isNaN(sl) || cap <= 0 || risk <= 0){
    result.innerHTML = '<div style="color:var(--orange)">⚠ Remplis tous les champs avec des valeurs valides.</div>';
    result.classList.add('show');
    return;
  }
  if(entry === sl){
    result.innerHTML = '<div style="color:var(--orange)">⚠ L\'entrée et le SL doivent être différents.</div>';
    result.classList.add('show');
    return;
  }
  const pipsRisk = Math.abs(entry - sl) / PIP;
  const riskEur = cap * risk / 100;
  const lots = riskEur / (pipsRisk * PIP_VALUE_PER_LOT);
  const units = lots * 100000;
  result.innerHTML = `
    <div class="line"><span class="label">Risque (€)</span><span class="val">${riskEur.toFixed(2)} €</span></div>
    <div class="line"><span class="label">Distance SL</span><span class="val">${pipsRisk.toFixed(1)} pips</span></div>
    <div class="line"><span class="label">Taille en lots</span><span class="val highlight">${lots.toFixed(3)} lots</span></div>
    <div class="line"><span class="label">Unités (EUR)</span><span class="val">${units.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span></div>
    <div class="line"><span class="label">Valeur d'un pip</span><span class="val">${(lots * PIP_VALUE_PER_LOT).toFixed(2)} €</span></div>
  `;
  result.classList.add('show');
}

function wirePositionSize(){
  const modal = document.getElementById('modal-position-size');
  document.getElementById('open-position-size').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('btn-close-ps').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  document.getElementById('btn-ps-calc').addEventListener('click', calcPositionSize);
  document.getElementById('btn-ps-use-current').addEventListener('click', () => {
    if(state.candles.length === 0) return;
    const last = state.candles[state.candles.length - 1];
    document.getElementById('ps-entry').value = last.close.toFixed(5);
    document.getElementById('ps-sl').value = (last.close - 50 * PIP).toFixed(5);
  });
  // Calcul auto au changement de valeurs
  ['ps-capital', 'ps-risk', 'ps-entry', 'ps-sl'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if(document.getElementById('ps-result').classList.contains('show')) calcPositionSize();
    });
  });
}

// ── R/R Visualizer ────────────────────────────────────────
function clearRRLines(){
  state.priceLines = state.priceLines.filter(p => {
    if(p.kind === 'rr'){ state.series.removePriceLine(p.line); return false; }
    return true;
  });
}

function updateRRDisplay(){
  const e = parseFloat(document.getElementById('rr-entry').value);
  const s = parseFloat(document.getElementById('rr-sl').value);
  const t = parseFloat(document.getElementById('rr-tp').value);
  const ratioEl = document.getElementById('rr-ratio');
  if(isNaN(e) || isNaN(s) || isNaN(t)){ ratioEl.textContent = '—'; ratioEl.className = 'rr-ratio'; return; }
  const reward = Math.abs(t - e);
  const risk = Math.abs(e - s);
  if(risk === 0){ ratioEl.textContent = '∞'; ratioEl.className = 'rr-ratio'; return; }
  const rr = reward / risk;
  ratioEl.textContent = '1 : ' + rr.toFixed(2);
  ratioEl.className = 'rr-ratio ' + (rr >= 2 ? 'good' : rr >= 1 ? '' : 'bad');
  // Update price lines
  state.rrTrade.entry = e; state.rrTrade.sl = s; state.rrTrade.tp = t;
  clearRRLines();
  const lines = [
    { price: e, color: '#10b981', title: 'Entry', style: LightweightCharts.LineStyle.Solid },
    { price: s, color: '#ef4444', title: 'SL', style: LightweightCharts.LineStyle.Dashed },
    { price: t, color: '#3b82f6', title: 'TP', style: LightweightCharts.LineStyle.Dashed },
  ];
  for(const l of lines){
    const line = state.series.createPriceLine({
      price: l.price, color: l.color, lineWidth: 2,
      lineStyle: l.style, axisLabelVisible: true, title: l.title,
    });
    state.priceLines.push({ kind: 'rr', line });
  }
  // Update les handles draggables
  updateRRHandlesPosition();
}

function wireRR(){
  const floating = document.getElementById('rr-floating');
  const btn = document.getElementById('toggle-rr');
  btn.addEventListener('click', () => {
    state.rrTrade.active = !state.rrTrade.active;
    btn.classList.toggle('active', state.rrTrade.active);
    if(state.rrTrade.active){
      floating.classList.add('open');
      document.getElementById('rr-handles').classList.add('active');
      // Init avec le prix actuel
      if(state.candles.length > 0){
        const last = state.candles[state.candles.length - 1].close;
        document.getElementById('rr-entry').value = last.toFixed(5);
        document.getElementById('rr-sl').value = (last - 50 * PIP).toFixed(5);
        document.getElementById('rr-tp').value = (last + 100 * PIP).toFixed(5);
        updateRRDisplay();
      }
    } else {
      floating.classList.remove('open');
      document.getElementById('rr-handles').classList.remove('active');
      clearRRLines();
    }
  });
  document.getElementById('rr-close').addEventListener('click', () => btn.click());
  ['rr-entry', 'rr-sl', 'rr-tp'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateRRDisplay);
  });
  setupRRHandlesDrag();
}

// ── Drag handles SL/TP/Entry ──
function setupRRHandlesDrag(){
  const lines = ['entry', 'sl', 'tp'];
  for(const line of lines){
    const handle = document.querySelector(`.rr-handle.${line}`);
    let dragging = false;

    const startDrag = e => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      handle.classList.add('dragging');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', endDrag);
      window.addEventListener('touchcancel', endDrag);
    };

    const onMove = e => {
      if(!dragging) return;
      e.preventDefault();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const chartEl = document.getElementById('chart');
      const rect = chartEl.getBoundingClientRect();
      const y = clientY - rect.top;
      const price = state.series.coordinateToPrice(y);
      if(price === null || isNaN(price)) return;
      document.getElementById('rr-' + line).value = price.toFixed(5);
      updateRRDisplay();
    };

    const endDrag = () => {
      if(!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('touchcancel', endDrag);
    };

    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: false });
  }
}

// Update les handles positionnement à chaque pan/zoom du chart
function updateRRHandlesPosition(){
  if(!state.rrTrade.active) return;
  const handles = document.getElementById('rr-handles');
  ['entry', 'sl', 'tp'].forEach(line => {
    const price = state.rrTrade[line];
    const handle = handles.querySelector(`.rr-handle.${line}`);
    if(price === null || isNaN(price)){ handle.style.display = 'none'; return; }
    const y = state.series.priceToCoordinate(price);
    if(y === null){ handle.style.display = 'none'; return; }
    handle.style.display = 'flex';
    handle.style.top = y + 'px';
  });
}

// ── Journal ────────────────────────────────────────────────
let equityChart = null;

function saveTrades(){
  localStorage.setItem('eurusd_trades', JSON.stringify(state.trades));
  scheduleAutoSync();
}

function addTrade(){
  const side = document.querySelector('input[name="jr-side"]:checked').value;
  const entry = parseFloat(document.getElementById('jr-entry').value);
  const sl = parseFloat(document.getElementById('jr-sl').value);
  const tp = parseFloat(document.getElementById('jr-tp').value);
  const result = parseFloat(document.getElementById('jr-result').value);
  const setup = document.getElementById('jr-setup').value;
  const notes = document.getElementById('jr-notes').value;
  if(isNaN(result)){ alert('Résultat (R) manquant'); return; }
  state.trades.push({
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    side, entry: entry || null, sl: sl || null, tp: tp || null,
    result, setup, notes,
  });
  saveTrades();
  // Clear inputs
  ['jr-entry', 'jr-sl', 'jr-tp', 'jr-result', 'jr-notes'].forEach(id => document.getElementById(id).value = '');
  renderJournal();
}

function deleteTrade(id){
  const trade = state.trades.find(t => t.id === id);
  if(!trade) return;
  state.lastDeletedTrade = trade;
  state.trades = state.trades.filter(t => t.id !== id);
  saveTrades();
  renderJournal();
  // Undo toast (était dans un wrapper)
  if(typeof showToast === 'function'){
    showToast(`🗑 "${trade.setup} ${trade.side}" supprimé`, () => {
      state.trades.push(state.lastDeletedTrade);
      state.trades.sort((a, b) => a.id - b.id);
      saveTrades();
      renderJournal();
      state.lastDeletedTrade = null;
    }, 6000);
  }
}

function getFilteredTrades(){
  const setup = (document.getElementById('jr-filter-setup') || {}).value || '';
  const side = (document.getElementById('jr-filter-side') || {}).value || '';
  return state.trades.filter(t => {
    if(setup && t.setup !== setup) return false;
    if(side && t.side !== side) return false;
    return true;
  });
}

function exportTradesCSV(){
  const trades = getFilteredTrades();
  if(trades.length === 0){ alert('Aucun trade à exporter (vérifie les filtres).'); return; }
  const headers = ['Date', 'Sens', 'Entry', 'SL', 'TP', 'Résultat (R)', 'Setup', 'Notes'];
  const escape = v => {
    if(v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[,;"\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = trades.map(t => [
    t.date, t.side, t.entry || '', t.sl || '', t.tp || '', t.result, t.setup, t.notes || ''
  ].map(escape).join(','));
  const csv = headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eurusd-trades-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function renderJournal(){
  // Stats (toujours sur trades non filtrés pour vue d'ensemble)
  const trades = state.trades;
  const n = trades.length;
  const wins = trades.filter(t => t.result > 0);
  const losses = trades.filter(t => t.result < 0);
  const winrate = n > 0 ? (wins.length / n * 100).toFixed(1) : '—';
  const avgR = n > 0 ? (trades.reduce((s, t) => s + t.result, 0) / n).toFixed(2) : '—';
  const totalR = trades.reduce((s, t) => s + t.result, 0).toFixed(2);
  const totalProfit = wins.reduce((s, t) => s + t.result, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.result, 0));
  const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : (totalProfit > 0 ? '∞' : '—');

  document.getElementById('journal-stats').innerHTML = `
    <div class="journal-stat"><div class="label">Trades</div><div class="value">${n}</div></div>
    <div class="journal-stat"><div class="label">Winrate</div><div class="value ${winrate >= 50 ? 'up' : winrate !== '—' ? 'down' : ''}">${winrate}${winrate !== '—' ? '%' : ''}</div></div>
    <div class="journal-stat"><div class="label">R moyen</div><div class="value ${avgR > 0 ? 'up' : avgR < 0 ? 'down' : ''}">${avgR}R</div></div>
    <div class="journal-stat"><div class="label">Total R</div><div class="value ${totalR > 0 ? 'up' : totalR < 0 ? 'down' : ''}">${totalR}R</div></div>
  `;

  // Equity curve
  const equityCanvas = document.getElementById('equity-chart');
  if(equityChart) equityChart.destroy();
  const equityData = [];
  let acc = 0;
  for(const t of trades){ acc += t.result; equityData.push(acc); }
  if(equityData.length > 0 && equityCanvas && typeof Chart !== 'undefined'){
    equityChart = new Chart(equityCanvas, {
      type: 'line',
      data: {
        labels: equityData.map((_, i) => i + 1),
        datasets: [{
          data: equityData,
          borderColor: equityData[equityData.length - 1] >= 0 ? '#10b981' : '#ef4444',
          backgroundColor: equityData[equityData.length - 1] >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    });
  }

  // Trades list (avec filtres appliqués)
  const list = document.getElementById('journal-trades');
  if(trades.length === 0){
    list.innerHTML = '<div style="font-size:0.78rem;color:var(--muted);text-align:center;padding:20px">Aucun trade enregistré. Logge ton premier trade pour voir tes stats.</div>';
    return;
  }
  const filtered = getFilteredTrades();
  if(filtered.length === 0){
    list.innerHTML = '<div style="font-size:0.78rem;color:var(--muted);text-align:center;padding:20px">Aucun trade ne correspond aux filtres.</div>';
    return;
  }
  list.innerHTML = filtered.slice().reverse().map(t => `
    <div class="journal-trade">
      <span class="side ${t.side}">${t.side === 'long' ? '▲' : '▼'} ${t.side}</span>
      <span style="color:var(--muted2)">${t.date}</span>
      <span style="font-size:0.66rem;color:var(--muted2);background:var(--surface3);padding:2px 6px;border-radius:99px">${t.setup}</span>
      <span class="r ${t.result > 0 ? 'up' : 'down'}">${t.result > 0 ? '+' : ''}${t.result}R</span>
      <button class="delete-trade" data-id="${t.id}" title="Supprimer">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.delete-trade').forEach(b => {
    b.addEventListener('click', () => deleteTrade(parseInt(b.dataset.id)));
  });
}

function wireJournal(){
  const modal = document.getElementById('modal-journal');
  document.getElementById('open-journal').addEventListener('click', () => {
    modal.classList.add('open');
    renderJournal();
  });
  document.getElementById('btn-close-journal').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  document.getElementById('btn-add-trade').addEventListener('click', addTrade);
  document.getElementById('btn-export-csv').addEventListener('click', exportTradesCSV);
  ['jr-filter-setup', 'jr-filter-side'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderJournal);
  });
  // Radio side group visual
  document.querySelectorAll('input[name="jr-side"]').forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('#jr-side-group label').forEach(l => l.classList.remove('selected'));
      document.querySelector(`label[for="${r.id}"]`).classList.add('selected');
    });
  });
}

// ============================================================
// PHASE 5 — TwelveData live data
// ============================================================

const TWELVE_TF_MAP = { M1: '1min', M5: '5min', M15: '15min', H1: '1h', H4: '4h', D1: '1day' };

async function fetchTwelveData(tfKey, size = 800){
  const interval = TWELVE_TF_MAP[tfKey];
  const key = state.apiKey;
  if(!key) throw new Error('Pas de clé API');
  const url = `https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=${interval}&apikey=${encodeURIComponent(key)}&outputsize=${size}&format=JSON`;
  const r = await fetch(url);
  const j = await r.json();
  if(j.status === 'error' || j.code) throw new Error(j.message || 'Erreur API');
  if(!j.values || !Array.isArray(j.values)) throw new Error('Format de réponse inattendu');
  const candles = j.values.reverse().map(v => ({
    time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
  })).filter(c => !isNaN(c.open));
  // Intégré directement (était un wrapper _originalFetchTwelveData)
  if(typeof incrementQuota === 'function') incrementQuota();
  state.lastRefreshTs = Date.now();
  if(typeof updateLiveMeta === 'function') updateLiveMeta();
  return candles;
}

async function enableLiveMode(){
  const status = document.getElementById('api-status');
  const key = document.getElementById('api-key-input').value.trim();
  if(!key){ status.innerHTML = '<span style="color:var(--orange)">⚠ Saisis ta clé API.</span>'; return; }
  status.innerHTML = '<span style="color:var(--muted2)">⏳ Test en cours...</span>';
  state.apiKey = key;
  try {
    const candles = await fetchTwelveData(state.currentTf, 800);
    if(candles.length === 0) throw new Error('Aucune bougie reçue');
    localStorage.setItem('twelvedata_key', key);
    state.liveMode = true;
    state.candles = candles;
    state.series.setData(state.candles);
    updatePriceDisplay();
    fitTimeRange();
    recomputeAll();
    renderAll();
    updateStatusBadge();
    startLivePolling();
    status.innerHTML = `<span style="color:var(--acc)">✓ Connecté ! ${candles.length} bougies ${state.currentTf} chargées.</span>`;
  } catch(err){
    status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}. <a href="https://twelvedata.com/" target="_blank" style="color:var(--acc)">Vérifie ta clé</a>.</span>`;
    state.liveMode = false;
    updateStatusBadge();
  }
}

function disableLiveMode(){
  state.liveMode = false;
  stopLivePolling();
  updateStatusBadge();
  regenerateData();
  document.getElementById('api-status').innerHTML = '<span style="color:var(--muted2)">Repassé en mode MOCK.</span>';
}

function updateStatusBadge(){
  const badge = document.getElementById('status-badge');
  if(state.liveMode){
    badge.textContent = 'LIVE';
    badge.className = 'status-badge live';
  } else {
    badge.textContent = 'MOCK';
    badge.className = 'status-badge mock';
  }
}

function startLivePolling(){
  stopLivePolling();
  // Intervalle configurable, minimum 10s
  const interval = Math.max(10000, state.pollIntervalMs);
  state.livePollTimer = setInterval(async () => {
    if(!state.liveMode) return;
    try {
      const candles = await fetchTwelveData(state.currentTf, 200);
      if(candles.length > 0){
        // Merge : remplace les dernières bougies + ajoute les nouvelles
        const lastKnownTime = state.candles.length > 0 ? state.candles[state.candles.length - 1].time : 0;
        const newOnes = candles.filter(c => c.time >= lastKnownTime - 600);
        // Reconstruit en gardant l'historique
        const idxStart = state.candles.findIndex(c => c.time >= newOnes[0].time);
        if(idxStart >= 0) state.candles = state.candles.slice(0, idxStart).concat(newOnes);
        else state.candles = newOnes;
        state.series.setData(state.candles);
        updatePriceDisplay();
        recomputeAll();
        renderAll();
      }
    } catch(err){
      console.warn('[Live] Polling échoué :', err.message);
    }
  }, interval);
}

function stopLivePolling(){
  if(state.livePollTimer){ clearInterval(state.livePollTimer); state.livePollTimer = null; }
}

function wireApiKey(){
  document.getElementById('api-key-input').value = state.apiKey;
  document.getElementById('btn-test-api').addEventListener('click', enableLiveMode);
  document.getElementById('btn-mock-mode').addEventListener('click', disableLiveMode);
}

// ============================================================
// FEATURE 15 — PWA : service worker + install prompt
// ============================================================

let _pwaDeferredPrompt = null;

function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  // Register avec un path relatif au dossier courant (au cas où l'app est servie depuis un sous-chemin)
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(reg => console.info('[SW] enregistré', reg.scope))
    .catch(err => console.warn('[SW] échec', err));
}

function wirePwaInstall(){
  const btn = document.getElementById('install-btn');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaDeferredPrompt = e;
    btn.style.display = 'flex';
  });
  btn.addEventListener('click', async () => {
    if(!_pwaDeferredPrompt) return;
    _pwaDeferredPrompt.prompt();
    const { outcome } = await _pwaDeferredPrompt.userChoice;
    if(outcome === 'accepted') btn.style.display = 'none';
    _pwaDeferredPrompt = null;
  });
  // Si déjà installé, on cache (event séparé)
  window.addEventListener('appinstalled', () => {
    btn.style.display = 'none';
    _pwaDeferredPrompt = null;
  });
}

// ============================================================
// FEATURE 13 — ALERTES NAVIGATEUR
// ============================================================

state.alerts = {
  enabled: localStorage.getItem('alerts_enabled') === 'true',
  types: {
    aplus: localStorage.getItem('alert_aplus') !== 'false',
    sweep: localStorage.getItem('alert_sweep') !== 'false',
    killzone: localStorage.getItem('alert_killzone') !== 'false',
  },
  sentIds: new Set(),
  lastKzStatus: null,
};

function notifSupported(){ return 'Notification' in window; }

async function requestNotifPermission(){
  if(!notifSupported()) return false;
  if(Notification.permission === 'granted') return true;
  if(Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

function sendNotif(title, body, tag){
  if(!state.alerts.enabled || !notifSupported() || Notification.permission !== 'granted') return;
  if(state.alerts.sentIds.has(tag)) return;
  state.alerts.sentIds.add(tag);
  try {
    new Notification(title, { body, tag, icon: './icon.svg', silent: false });
  } catch(e){ console.warn('[Notif]', e); }
}

function checkAlerts(){
  if(!state.alerts.enabled) return;
  // A+ setups (score >= 4)
  if(state.alerts.types.aplus){
    const aplus = [
      ...state.computed.orderBlocks.filter(o => !o.mitigated && (o.score || 0) >= 4).map(o => ({ ...o, kind: 'OB' })),
      ...state.computed.fvgs.filter(f => !f.mitigated && (f.score || 0) >= 4).map(f => ({ ...f, kind: 'FVG' })),
    ];
    for(const z of aplus){
      const tag = `aplus-${z.kind}-${z.time}-${z.type}`;
      const side = z.type === 'bullish' ? 'Long' : 'Short';
      const price = ((z.top + z.bottom) / 2).toFixed(5);
      sendNotif(`⭐ Setup A+ ${z.kind}`, `${side} score ${z.score} à ${price} sur ${state.currentTf}`, tag);
    }
  }
  // Liquidity sweeps (les 3 derniers)
  if(state.alerts.types.sweep){
    const recent = state.computed.liquidity.sweeps.slice(-3);
    for(const s of recent){
      const tag = `sweep-${s.time}-${s.dir}`;
      sendNotif('💧 Liquidity Sweep', `${s.dir === 'up' ? 'BSL' : 'SSL'} swept à ${s.level.toFixed(5)}`, tag);
    }
  }
  // Killzones (transition)
  if(state.alerts.types.killzone){
    const now = new Date();
    const h = now.getUTCHours() + now.getUTCMinutes() / 60;
    let currentKz = null;
    if(h >= 7 && h < 10) currentKz = 'London';
    else if(h >= 12 && h < 15) currentKz = 'NY';
    if(currentKz && currentKz !== state.alerts.lastKzStatus){
      const tag = `kz-${currentKz}-${now.toISOString().slice(0,10)}`;
      sendNotif(`🕐 Killzone ${currentKz}`, `La killzone ${currentKz} vient de commencer.`, tag);
    }
    state.alerts.lastKzStatus = currentKz;
  }
}

function wireAlerts(){
  const enabledEl = document.getElementById('alerts-enabled');
  const typesWrap = document.getElementById('alerts-types');
  const statusEl = document.getElementById('alerts-status');

  // Restore state
  enabledEl.checked = state.alerts.enabled;
  typesWrap.style.display = state.alerts.enabled ? 'block' : 'none';
  document.getElementById('alert-aplus').checked = state.alerts.types.aplus;
  document.getElementById('alert-sweep').checked = state.alerts.types.sweep;
  document.getElementById('alert-killzone').checked = state.alerts.types.killzone;

  const updateStatus = () => {
    if(!notifSupported()){ statusEl.innerHTML = '<span style="color:var(--orange)">⚠ Notifications non supportées par ce navigateur.</span>'; return; }
    if(!state.alerts.enabled){ statusEl.textContent = ''; return; }
    if(Notification.permission === 'granted') statusEl.innerHTML = '<span style="color:var(--acc)">✓ Notifications activées</span>';
    else if(Notification.permission === 'denied') statusEl.innerHTML = '<span style="color:var(--red)">✗ Bloquées. Active-les dans les paramètres de ton navigateur.</span>';
    else statusEl.innerHTML = '<span style="color:var(--muted2)">Cliquer activera la demande de permission.</span>';
  };
  updateStatus();

  enabledEl.addEventListener('change', async () => {
    if(enabledEl.checked){
      const ok = await requestNotifPermission();
      if(!ok){ enabledEl.checked = false; updateStatus(); return; }
      state.alerts.enabled = true;
      typesWrap.style.display = 'block';
      // Notif test
      sendNotif('🎉 Alertes activées', 'Tu recevras maintenant les setups importants en temps réel.', 'test-' + Date.now());
    } else {
      state.alerts.enabled = false;
      typesWrap.style.display = 'none';
    }
    localStorage.setItem('alerts_enabled', state.alerts.enabled);
    updateStatus();
  });

  ['aplus', 'sweep', 'killzone'].forEach(k => {
    document.getElementById('alert-' + k).addEventListener('change', e => {
      state.alerts.types[k] = e.target.checked;
      localStorage.setItem('alert_' + k, e.target.checked);
    });
  });
}

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

// ============================================================
// COURS PÉDAGOGIQUES — 5 modules ICT pour débutants
// ============================================================



let currentCourseChapter = '1.1';
const COURSE_READ_KEY = 'course_read_chapters';
let readCourseChapters = new Set(JSON.parse(localStorage.getItem(COURSE_READ_KEY) || '[]'));


function renderCourseQuiz(chapterId){
  const quiz = COURSE_QUIZZES[chapterId];
  if(!quiz) return '';
  return `
    <div class="quiz-block">
      <div class="quiz-header">
        <span class="emoji">🧠</span>
        <h3>${quiz.title}</h3>
      </div>
      <p class="quiz-sub">${quiz.after}</p>
      ${quiz.questions.map((q, qi) => `
        <div class="quiz-question" data-q="${qi}">
          <div class="quiz-q-text">${qi + 1}. ${q.q}</div>
          <div class="quiz-options">
            ${q.options.map((opt, oi) => `
              <div class="quiz-option" data-opt="${oi}" data-correct="${oi === q.correct ? '1' : '0'}">${opt}</div>
            `).join('')}
          </div>
          <div class="quiz-explanation"><strong>Explication :</strong> ${q.explain}</div>
        </div>
      `).join('')}
      <div class="quiz-score" id="course-quiz-score-${chapterId}">
        <div class="score-value">— / ${quiz.questions.length}</div>
        <div class="score-msg"></div>
      </div>
    </div>
  `;
}

function wireCourseQuiz(chapterId){
  const quiz = COURSE_QUIZZES[chapterId];
  if(!quiz) return;
  const block = document.querySelector('.course-content .quiz-block');
  if(!block) return;
  const answered = new Set();
  block.querySelectorAll('.quiz-question').forEach((qEl, qi) => {
    const opts = qEl.querySelectorAll('.quiz-option');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        if(answered.has(qi)) return;
        answered.add(qi);
        const correctIdx = quiz.questions[qi].correct;
        opts.forEach((o, oi) => {
          o.classList.add('locked');
          if(oi === correctIdx) o.classList.add('correct');
          else if(o === opt) o.classList.add('wrong');
        });
        qEl.querySelector('.quiz-explanation').classList.add('visible');
        if(answered.size === quiz.questions.length){
          const correct = [...block.querySelectorAll('.quiz-question')]
            .filter(q => q.querySelector('.quiz-option.correct') && !q.querySelector('.quiz-option.wrong')).length;
          const score = document.getElementById('course-quiz-score-' + chapterId);
          score.classList.add('visible');
          score.querySelector('.score-value').textContent = `${correct} / ${quiz.questions.length}`;
          const pct = correct / quiz.questions.length;
          score.querySelector('.score-msg').textContent =
            pct === 1 ? '🎉 Parfait ! Tu as tout compris.'
            : pct >= 0.66 ? '👍 Bien ! Re-lis les explications.'
            : '📚 Re-lis le module avant de continuer.';
          localStorage.setItem('course_quiz_' + chapterId, correct);
        }
      });
    });
  });
}

function markCourseRead(chapterId){
  if(readCourseChapters.has(chapterId)) return;
  readCourseChapters.add(chapterId);
  localStorage.setItem(COURSE_READ_KEY, JSON.stringify([...readCourseChapters]));
  const a = document.querySelector(`#course-toc .chapter[data-chap="${chapterId}"]`);
  if(a) a.classList.add('read');
  updateCourseProgress();
}

function updateCourseProgress(){
  const all = COURSE_MODULES.flatMap(m => m.chapters.map(c => c.id));
  const read = all.filter(id => readCourseChapters.has(id)).length;
  const fill = document.getElementById('course-progress-fill');
  const text = document.getElementById('course-progress-text');
  if(fill) fill.style.width = (read / all.length * 100) + '%';
  if(text) text.textContent = `${read} / ${all.length} chapitres lus`;
}

function renderCourseTOC(){
  const toc = document.getElementById('course-toc');
  toc.innerHTML = `
    <div class="course-progress">
      <div class="course-progress-label">
        <span>Progression</span>
        <span id="course-progress-text">0 / 27</span>
      </div>
      <div class="course-progress-bar"><div class="course-progress-fill" id="course-progress-fill"></div></div>
    </div>
  ` + COURSE_MODULES.map(m => `
    <details ${m.id === 'M1' ? 'open' : ''}>
      <summary>${m.title}</summary>
      ${m.chapters.map(c => `<a class="chapter ${c.id === currentCourseChapter ? 'active' : ''} ${readCourseChapters.has(c.id) ? 'read' : ''}" data-chap="${c.id}">${c.title}</a>`).join('')}
    </details>
  `).join('');
  toc.querySelectorAll('.chapter').forEach(a => {
    a.addEventListener('click', () => loadCourseChapter(a.dataset.chap));
  });
  updateCourseProgress();
}

function loadCourseChapter(id){
  currentCourseChapter = id;
  const content = COURSES[id] || '<p>Chapitre à venir.</p>';
  const quizHtml = renderCourseQuiz(id);
  const allChapters = COURSE_MODULES.flatMap(m => m.chapters.map(c => c.id));
  const idx = allChapters.indexOf(id);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;
  document.getElementById('course-content').innerHTML = content + quizHtml + `
    <div class="lesson-nav">
      <button ${!prev ? 'disabled' : ''} data-chap="${prev || ''}">← Précédent</button>
      <button ${!next ? 'disabled' : ''} data-chap="${next || ''}">Suivant →</button>
    </div>
  `;
  document.querySelectorAll('#course-toc .chapter').forEach(a => {
    a.classList.toggle('active', a.dataset.chap === id);
  });
  document.querySelectorAll('#course-content .lesson-nav button').forEach(b => {
    if(b.dataset.chap) b.addEventListener('click', () => loadCourseChapter(b.dataset.chap));
  });
  if(quizHtml) wireCourseQuiz(id);
  setTimeout(() => markCourseRead(id), 4000);
  document.getElementById('course-content').scrollTop = 0;
}

function wireCourses(){
  const modal = document.getElementById('modal-courses');
  document.getElementById('open-courses').addEventListener('click', () => openCourse());
  document.getElementById('btn-close-courses').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
}

function openCourse(chapterId){
  const modal = document.getElementById('modal-courses');
  modal.classList.add('open');
  renderCourseTOC();
  loadCourseChapter(chapterId || currentCourseChapter);
}

// ============================================================
// QUICK WIN 1 — Mémoriser les préférences (localStorage)
// ============================================================
const PREFS_KEY = 'eurusd_prefs_v1';

function savePrefs(){
  const prefs = {
    indicators: state.indicators,
    tf: state.currentTf,
    sections: {},
    courseChapter: currentCourseChapter,
  };
  document.querySelectorAll('.panel-section').forEach(s => {
    prefs.sections[s.dataset.section] = !s.classList.contains('collapsed');
  });
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function loadPrefs(){
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if(!raw) return;
    const prefs = JSON.parse(raw);
    // Restore TF
    if(prefs.tf && TF_SECONDS[prefs.tf]){
      state.currentTf = prefs.tf;
      document.querySelectorAll('.tf-pill').forEach(b => b.classList.toggle('active', b.dataset.tf === prefs.tf));
    }
    // Restore indicators
    if(prefs.indicators){
      for(const k of Object.keys(state.indicators)){
        if(typeof prefs.indicators[k] === 'boolean'){
          state.indicators[k] = prefs.indicators[k];
          const input = document.querySelector(`input[data-ind="${k}"]`);
          if(input) input.checked = prefs.indicators[k];
        }
      }
    }
    // Restore section collapsed state
    if(prefs.sections){
      document.querySelectorAll('.panel-section').forEach(s => {
        if(typeof prefs.sections[s.dataset.section] === 'boolean'){
          s.classList.toggle('collapsed', !prefs.sections[s.dataset.section]);
        }
      });
    }
    // Restore course chapter
    if(prefs.courseChapter && COURSES[prefs.courseChapter]) currentCourseChapter = prefs.courseChapter;
  } catch(e){
    console.warn('[Prefs] load failed', e);
  }
}

// Hook savePrefs sur les events
function autoSavePrefs(){
  document.querySelectorAll('input[data-ind]').forEach(i => i.addEventListener('change', savePrefs));
  document.querySelectorAll('.tf-pill').forEach(b => b.addEventListener('click', savePrefs));
  document.querySelectorAll('.panel-section-header').forEach(h => h.addEventListener('click', () => setTimeout(savePrefs, 50)));
}

// ============================================================
// QUICK WIN 2 — Icônes ℹ️ sur chaque toggle
// ============================================================
const TOGGLE_TO_CHAPTER = {
  swings: '2.2', bos: '2.3', liquidity: '2.4', ob: '2.6',
  fvg: '2.7', pd: '2.8', kz: '2.9',
  breaker: '3.1', ifvg: '3.2', ote: '3.3',
  amd: '3.4', pdarrays: '3.5', irlerl: '3.6',
  multitf: '5.1',
};

function injectHelpIcons(){
  document.querySelectorAll('input[data-ind]').forEach(input => {
    const key = input.dataset.ind;
    const chapterId = TOGGLE_TO_CHAPTER[key];
    if(!chapterId) return;
    const row = input.closest('.toggle-row');
    if(!row || row.querySelector('.toggle-help')) return;
    const help = document.createElement('span');
    help.className = 'toggle-help';
    help.textContent = 'i';
    help.title = `Cours : ${chapterId}`;
    help.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openCourse(chapterId);
    });
    row.appendChild(help);
  });
}

// ============================================================
// QUICK WIN 3 — Présets de toggles
// ============================================================
// Presets repensés : 3-5 indicateurs max par préset, focalisés sur un workflow précis
// Chaque preset ne fait QUE ce qu'il dit, pas plus. La lisibilité d'abord.
const PRESETS = {
  reset: {
    name: 'Reset',
    tf: null, // ne change pas le TF
    indicators: { swings: false, bos: false, liquidity: false, ob: false, fvg: false, pd: false, kz: false,
                  breaker: false, ifvg: false, ote: false, amd: false, pdarrays: false, irlerl: false,
                  multitf: false, news: false },
  },
  learn: {
    // "Analyse de contexte" : où on est dans le range, structure, sessions
    name: 'Contexte',
    tf: 'H1',
    indicators: { swings: true, bos: true, liquidity: false, ob: false, fvg: false, pd: true, kz: true,
                  breaker: false, ifvg: false, ote: false, amd: false, pdarrays: false, irlerl: false,
                  multitf: false, news: false },
  },
  swing: {
    // "Recherche de setup" : zones institutionnelles + PD pour swing trader
    name: 'Setup',
    tf: 'H4',
    indicators: { swings: false, bos: false, liquidity: true, ob: true, fvg: false, pd: true, kz: false,
                  breaker: false, ifvg: false, ote: true, amd: false, pdarrays: false, irlerl: false,
                  multitf: true, news: false },
  },
  scalp: {
    // "Entrée précise" : confirmation intraday avec killzones + FVG
    name: 'Entrée',
    tf: 'M15',
    indicators: { swings: false, bos: true, liquidity: true, ob: true, fvg: true, pd: false, kz: true,
                  breaker: false, ifvg: false, ote: false, amd: false, pdarrays: false, irlerl: false,
                  multitf: false, news: true },
  },
};

function applyPreset(name){
  const p = PRESETS[name];
  if(!p) return;
  // Toggle TF (null = pas de changement, ex: Reset)
  if(p.tf && state.currentTf !== p.tf){
    document.querySelectorAll('.tf-pill').forEach(b => b.classList.toggle('active', b.dataset.tf === p.tf));
    state.currentTf = p.tf;
    rebuildCurrentTf();
  }
  // Toggle indicators (multitf nécessite recompute)
  let needsRecompute = false;
  for(const [k, v] of Object.entries(p.indicators)){
    if(!(k in state.indicators)) continue;
    if(k === 'multitf' && state.indicators[k] !== v) needsRecompute = true;
    state.indicators[k] = v;
    const input = document.querySelector(`input[data-ind="${k}"]`);
    if(input) input.checked = v;
  }
  if(needsRecompute) recomputeAll();
  renderAll();
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === name));
  savePrefs();
}

function wirePresets(){
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.addEventListener('click', () => applyPreset(b.dataset.preset));
  });
}

// ============================================================
// QUICK WIN 4 — Quota API affiché
// ============================================================
const QUOTA_KEY = 'eurusd_quota_v1';

function loadQuota(){
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if(!raw) return { date: todayUTC(), count: 0 };
    const q = JSON.parse(raw);
    if(q.date !== todayUTC()) return { date: todayUTC(), count: 0 }; // reset si nouveau jour
    return q;
  } catch { return { date: todayUTC(), count: 0 }; }
}

function todayUTC(){
  return new Date().toISOString().slice(0, 10);
}

function incrementQuota(){
  state.quota = state.quota || loadQuota();
  if(state.quota.date !== todayUTC()){ state.quota = { date: todayUTC(), count: 0 }; }
  state.quota.count++;
  localStorage.setItem(QUOTA_KEY, JSON.stringify(state.quota));
  updateLiveMeta();
}

function updateLiveMeta(){
  const meta = document.getElementById('live-meta');
  const quotaEl = document.getElementById('live-quota');
  const refreshEl = document.getElementById('live-refresh');
  if(!state.liveMode){ meta.style.display = 'none'; return; }
  meta.style.display = 'flex';
  state.quota = state.quota || loadQuota();
  const n = state.quota.count;
  quotaEl.textContent = `${n} / 800`;
  quotaEl.className = 'quota ' + (n > 720 ? 'danger' : n > 600 ? 'warn' : '');
  // last refresh time
  if(state.lastRefreshTs){
    const ago = Math.floor((Date.now() - state.lastRefreshTs) / 1000);
    refreshEl.textContent = ago < 60 ? `il y a ${ago}s` : `il y a ${Math.floor(ago/60)}min`;
  } else {
    refreshEl.textContent = '—';
  }
}

// ============================================================
// QUICK WIN 5 — Indicateur polling (live pulse + last refresh)
// ============================================================
function updateStatusBadgeWithPulse(){
  // Override updateStatusBadge avec un pulse en live
  const badge = document.getElementById('status-badge');
  if(state.liveMode){
    badge.innerHTML = '<span class="live-pulse"></span>LIVE';
    badge.className = 'status-badge live';
  } else {
    badge.textContent = 'MOCK';
    badge.className = 'status-badge mock';
  }
  updateLiveMeta();
}

// Patch updateStatusBadge to use our new version
updateStatusBadge = updateStatusBadgeWithPulse;

// Tick to refresh "il y a Xs" (les incréments quota/lastRefreshTs sont intégrés directement dans fetchTwelveData)
setInterval(() => { if(state.liveMode) updateLiveMeta(); }, 5000);

// ============================================================
// MOBILE BOTTOM NAV (style MT5)
// ============================================================

function wireMobileBottomNav(){
  const buttons = document.querySelectorAll('.mbn-btn');
  const moreSheet = document.getElementById('mbn-more-sheet');

  const setActive = (nav) => {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.nav === nav));
  };

  const closeAll = () => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    document.getElementById('side-panel').classList.remove('open');
    moreSheet.classList.remove('open');
  };

  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const nav = b.dataset.nav;
      const wasActive = b.classList.contains('active');
      closeAll();
      if(nav === 'chart'){
        setActive('chart');
        return;
      }
      if(nav === 'tools'){
        // Toggle drawer
        if(wasActive){ setActive('chart'); return; }
        document.getElementById('side-panel').classList.add('open');
        setActive('tools');
        return;
      }
      if(nav === 'paper'){
        document.getElementById('open-paper-trading').click();
        setActive('paper');
        return;
      }
      if(nav === 'journal'){
        document.getElementById('open-journal').click();
        setActive('journal');
        return;
      }
      if(nav === 'more'){
        if(wasActive){ setActive('chart'); return; }
        moreSheet.classList.add('open');
        setActive('more');
        return;
      }
    });
  });

  // Mini menu "Plus" actions
  moreSheet.querySelectorAll('.mbn-more-item').forEach(item => {
    item.addEventListener('click', e => {
      // Si c'est un link <a>, laisser naviguer normalement
      if(item.tagName === 'A') return;
      e.preventDefault();
      const action = item.dataset.action;
      moreSheet.classList.remove('open');
      const map = {
        'settings': 'open-settings',
        'courses': 'open-courses',
        'glossary': 'open-glossary',
        'position-size': 'open-position-size',
        'backtest': 'open-backtest',
        'rr': 'toggle-rr',
      };
      if(action === 'replay'){
        document.getElementById('toggle-replay').click();
        setActive('chart');
        return;
      }
      const targetId = map[action];
      if(targetId){
        const btn = document.getElementById(targetId);
        if(btn) btn.click();
      }
    });
  });

  // Tap outside the more sheet to close it
  document.addEventListener('click', e => {
    if(!moreSheet.classList.contains('open')) return;
    if(moreSheet.contains(e.target)) return;
    if(e.target.closest('.mbn-btn[data-nav="more"]')) return;
    moreSheet.classList.remove('open');
    setActive('chart');
  });

  // Quand le user ferme une modal manuellement, repasse en "chart"
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', e => {
      if(e.target === modal){
        setTimeout(() => setActive('chart'), 50);
      }
    });
    const closeBtns = modal.querySelectorAll('[id^="btn-close-"], [id^="open-settings"]');
    closeBtns.forEach(b => {
      if(b.id && b.id.startsWith('btn-close-')){
        b.addEventListener('click', () => setTimeout(() => setActive('chart'), 50));
      }
    });
  });
}

// ============================================================
// SYNC GITHUB GIST — annotations + paper + journal multi-device
// ============================================================

state.gistToken = localStorage.getItem('gist_token') || '';
state.gistId = localStorage.getItem('gist_id') || null;
state.gistAutoSync = localStorage.getItem('gist_auto_sync') !== 'false'; // true par défaut
const GIST_FILENAME = 'forex-eurusd-data.json';
const GIST_DESCRIPTION = 'Forex EUR/USD ICT Dashboard - User Data';

async function gistApi(method, path, body){
  if(!state.gistToken) throw new Error('Token GitHub requis');
  const r = await fetch('https://api.github.com/' + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + state.gistToken,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if(!r.ok){
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `Erreur HTTP ${r.status}`);
  }
  return r.json();
}

function gatherSyncData(){
  return {
    annotations: state.annotations || [],
    paper: state.paper || {},
    trades: state.trades || [],
    indicators: state.indicators || {},
    syncedAt: new Date().toISOString(),
    version: 1,
  };
}

function applySyncData(data){
  let restored = [];
  if(Array.isArray(data.annotations)){
    state.annotations = data.annotations;
    saveAnnotations();
    restored.push(`${data.annotations.length} annotations`);
  }
  if(data.paper && typeof data.paper === 'object'){
    // Préserve le spread setting local mais merge le reste
    state.paper = { ...state.paper, ...data.paper, spreadPips: state.paper.spreadPips };
    savePaper();
    restored.push(`compte paper (solde ${state.paper.balance.toFixed(0)}€, ${state.paper.history.length} trades historiques)`);
  }
  if(Array.isArray(data.trades)){
    state.trades = data.trades;
    saveTrades();
    restored.push(`${data.trades.length} entrées journal`);
  }
  return restored;
}

async function syncPush(){
  const data = gatherSyncData();
  const files = { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } };
  if(state.gistId){
    await gistApi('PATCH', `gists/${state.gistId}`, { files });
  } else {
    const result = await gistApi('POST', 'gists', {
      description: GIST_DESCRIPTION,
      public: false,
      files,
    });
    state.gistId = result.id;
    localStorage.setItem('gist_id', state.gistId);
  }
  return data;
}

async function syncPull(){
  if(!state.gistId) throw new Error('Aucun Gist connecté. Clique Connecter pour en trouver un, ou Push pour en créer.');
  const gist = await gistApi('GET', `gists/${state.gistId}`);
  if(!gist.files[GIST_FILENAME]) throw new Error(`Fichier ${GIST_FILENAME} absent du Gist`);
  const data = JSON.parse(gist.files[GIST_FILENAME].content);
  return applySyncData(data);
}

async function syncFindExistingGist(){
  // Cherche le Gist déjà créé par cet utilisateur (au 1er Connect)
  const gists = await gistApi('GET', 'gists?per_page=100');
  const ours = gists.find(g => g.description === GIST_DESCRIPTION);
  if(ours){
    state.gistId = ours.id;
    localStorage.setItem('gist_id', state.gistId);
    return ours;
  }
  return null;
}

function refreshGistStatus(){
  const status = document.getElementById('gist-status');
  if(!status) return;
  if(!state.gistToken){
    status.innerHTML = '<span style="color:var(--muted)">Non connecté. Colle ton token GitHub puis clique Connecter.</span>';
    return;
  }
  if(state.gistId){
    const shortId = state.gistId.slice(0, 8);
    status.innerHTML = `<span style="color:var(--acc)">✓ Connecté — <a href="https://gist.github.com/${state.gistId}" target="_blank" style="color:var(--acc);text-decoration:underline">Gist ${shortId}…</a></span>`;
  } else {
    status.innerHTML = '<span style="color:var(--orange)">Token saisi, mais aucun Gist trouvé. Clique Push pour en créer un, ou Connecter pour chercher un existant.</span>';
  }
}

// ── Cloud indicator topbar ──
function setCloudState(s, msg){
  const btn = document.getElementById('cloud-btn');
  if(!btn) return;
  if(!state.gistToken){ btn.classList.remove('visible'); return; }
  btn.classList.add('visible');
  btn.classList.remove('synced', 'syncing', 'error');
  if(s === 'synced'){
    btn.classList.add('synced');
    btn.title = msg || 'Sync à jour';
  } else if(s === 'syncing'){
    btn.classList.add('syncing');
    btn.title = 'Sync en cours…';
  } else if(s === 'error'){
    btn.classList.add('error');
    btn.title = '⚠ Erreur sync : ' + (msg || 'voir Paramètres');
  }
}

// ── Auto-push debounced ──
let _autoSyncTimer = null;
function scheduleAutoSync(){
  if(!state.gistToken || !state.gistAutoSync) return;
  setCloudState('syncing');
  if(_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer = setTimeout(async () => {
    try {
      const data = await syncPush();
      localStorage.setItem('local_sync_time', new Date(data.syncedAt).getTime());
      setCloudState('synced', '☁️ Synced ' + new Date().toLocaleTimeString('fr-FR'));
    } catch(err){
      setCloudState('error', err.message);
    }
  }, 2500);
}

// ── Auto-pull au boot ──
async function autoPullIfNewer(){
  if(!state.gistToken || !state.gistId) return;
  setCloudState('syncing');
  try {
    const gist = await gistApi('GET', `gists/${state.gistId}`);
    if(!gist.files[GIST_FILENAME]){ setCloudState('synced'); return; }
    const data = JSON.parse(gist.files[GIST_FILENAME].content);
    const remoteTime = new Date(data.syncedAt).getTime();
    const localTime = parseInt(localStorage.getItem('local_sync_time') || '0', 10);
    if(remoteTime > localTime + 5000){ // 5s de marge pour éviter les races
      const restored = applySyncData(data);
      localStorage.setItem('local_sync_time', remoteTime);
      renderAll();
      if(state.paper && document.getElementById('modal-paper').classList.contains('open')) renderPaperTrading();
      showToast('☁️ Données récupérées du Gist (' + restored.length + ' éléments)');
    }
    setCloudState('synced');
  } catch(err){
    console.warn('[autoPull]', err);
    setCloudState('error', err.message);
  }
}

function wireGistSync(){
  const tokenInput = document.getElementById('gist-token-input');
  const status = document.getElementById('gist-status');
  if(!tokenInput) return;

  tokenInput.value = state.gistToken;
  refreshGistStatus();

  // Cloud icon → ouvre Settings sur la section Sync
  const cloudBtn = document.getElementById('cloud-btn');
  if(cloudBtn) cloudBtn.addEventListener('click', () => {
    document.getElementById('modal-settings').classList.add('open');
    setTimeout(() => {
      document.getElementById('gist-token-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  if(state.gistToken) setCloudState('synced');

  // Toggle auto-sync
  const autoToggle = document.getElementById('gist-auto-sync');
  autoToggle.checked = state.gistAutoSync;
  autoToggle.addEventListener('change', e => {
    state.gistAutoSync = e.target.checked;
    localStorage.setItem('gist_auto_sync', state.gistAutoSync);
    if(state.gistAutoSync && state.gistToken){ scheduleAutoSync(); }
  });

  document.getElementById('btn-gist-connect').addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if(!token){ status.innerHTML = '<span style="color:var(--orange)">⚠ Token requis</span>'; return; }
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Vérification du token + recherche du Gist...</span>';
    state.gistToken = token;
    try {
      const existing = await syncFindExistingGist();
      localStorage.setItem('gist_token', token);
      if(existing){
        status.innerHTML = `<span style="color:var(--acc)">✓ Token OK + Gist existant trouvé. Récupération automatique des données...</span>`;
        // Pull auto si Gist existant trouvé
        try { await syncPull(); status.innerHTML = `<span style="color:var(--acc)">✓ Connecté et données récupérées du Gist.</span>`; renderAll(); } catch(e){}
      } else {
        status.innerHTML = '<span style="color:var(--acc)">✓ Token valide. Création automatique du Gist au prochain changement (sync auto activée).</span>';
        if(state.gistAutoSync) scheduleAutoSync();
      }
      setCloudState('synced');
      refreshGistStatus();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
      state.gistToken = '';
      setCloudState('error', err.message);
    }
  });

  document.getElementById('btn-gist-push').addEventListener('click', async () => {
    if(!state.gistToken){ showToast('⚠ Connecte un token d\'abord'); return; }
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Push en cours...</span>';
    try {
      const data = await syncPush();
      const counts = `${data.annotations.length} annotations + ${data.trades.length} trades journal`;
      showToast('☁️ Données envoyées au Gist');
      status.innerHTML = `<span style="color:var(--acc)">✓ Pushed ${counts}. Sync : ${new Date(data.syncedAt).toLocaleTimeString('fr-FR')}</span>`;
      refreshGistStatus();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
    }
  });

  document.getElementById('btn-gist-pull').addEventListener('click', async () => {
    if(!state.gistToken){ showToast('⚠ Connecte un token d\'abord'); return; }
    if(!state.gistId){ showToast('⚠ Pas de Gist connecté. Connecte ou Push pour en créer un.'); return; }
    if(!confirm('Remplacer tes données locales par celles du Gist ?\n(Annotations, paper trading, journal de trades seront écrasés.)')) return;
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Pull en cours...</span>';
    try {
      const restored = await syncPull();
      showToast('📥 Données récupérées du Gist');
      status.innerHTML = `<span style="color:var(--acc)">✓ Restauré : ${restored.join(' + ')}</span>`;
      renderAll();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
    }
  });

  document.getElementById('btn-gist-disconnect').addEventListener('click', () => {
    if(!confirm('Déconnecter du Gist ?\nLe token et l\'ID seront supprimés de ton navigateur (le Gist GitHub reste intact).')) return;
    state.gistToken = '';
    state.gistId = null;
    localStorage.removeItem('gist_token');
    localStorage.removeItem('gist_id');
    tokenInput.value = '';
    refreshGistStatus();
    showToast('🔌 Déconnecté');
  });
}

// ============================================================
// ANNOTATIONS — dessin manuel sur le chart
// ============================================================

const ANNOT_COLORS = {
  acc: '#10b981', red: '#ef4444', blue: '#3b82f6', yellow: '#fbbf24'
};

state.annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
state.annotMode = 'pan';
state.annotColor = 'acc';
state.annotDrawing = null; // { type, time1, price1 } pour les 2-clics
let _annotHoverIdx = -1;

function saveAnnotations(){ localStorage.setItem('annotations', JSON.stringify(state.annotations)); scheduleAutoSync(); }

function setAnnotMode(mode){
  state.annotMode = mode;
  state.annotDrawing = null;
  document.querySelectorAll('.annot-btn[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  // Cursor adapté
  const chartEl = document.getElementById('chart');
  if(mode === 'pan') chartEl.style.cursor = '';
  else if(mode === 'erase') chartEl.style.cursor = 'not-allowed';
  else chartEl.style.cursor = 'crosshair';
}

function setAnnotColor(color){
  state.annotColor = color;
  document.querySelectorAll('.annot-btn.annot-color').forEach(b => {
    b.classList.toggle('active', b.dataset.color === color);
  });
}

function handleChartClick(param){
  if(state.annotMode === 'pan' || !param || !param.time || !param.point) return;
  const price = state.series.coordinateToPrice(param.point.y);
  if(price === null) return;
  const time = param.time;

  if(state.annotMode === 'erase'){
    eraseAnnotationAt(param.point.x, param.point.y);
    return;
  }

  if(state.annotMode === 'hline'){
    state.annotations.push({ id: Date.now(), type: 'hline', color: state.annotColor, price });
    saveAnnotations();
    renderAll();
  } else if(state.annotMode === 'text'){
    const txt = prompt('Texte du label :', '');
    if(!txt) return;
    state.annotations.push({ id: Date.now(), type: 'text', color: state.annotColor, time, price, text: txt });
    saveAnnotations();
    renderAll();
  } else if(state.annotMode === 'trendline' || state.annotMode === 'rect'){
    if(!state.annotDrawing){
      // 1er clic
      state.annotDrawing = { type: state.annotMode, color: state.annotColor, time1: time, price1: price };
      showToast(`📍 ${state.annotMode === 'trendline' ? 'Trendline' : 'Rectangle'} : clique le 2e point`);
    } else {
      // 2e clic, finalise
      state.annotations.push({
        id: Date.now(),
        type: state.annotDrawing.type,
        color: state.annotDrawing.color,
        time1: state.annotDrawing.time1, price1: state.annotDrawing.price1,
        time2: time, price2: price,
      });
      state.annotDrawing = null;
      saveAnnotations();
      renderAll();
    }
  }
}

function eraseAnnotationAt(x, y){
  const timeScale = state.chart.timeScale();
  const t2x = t => timeScale.timeToCoordinate(t);
  const p2y = p => state.series.priceToCoordinate(p);
  // Trouve l'annotation la plus proche (dans un rayon de 10px)
  let bestIdx = -1, bestDist = 12;
  for(let i = 0; i < state.annotations.length; i++){
    const a = state.annotations[i];
    let dist = Infinity;
    if(a.type === 'hline'){
      const ay = p2y(a.price);
      if(ay !== null) dist = Math.abs(y - ay);
    } else if(a.type === 'text'){
      const ax = t2x(a.time), ay = p2y(a.price);
      if(ax !== null && ay !== null) dist = Math.hypot(x - ax, y - ay);
    } else if(a.type === 'trendline'){
      const x1 = t2x(a.time1), y1 = p2y(a.price1), x2 = t2x(a.time2), y2 = p2y(a.price2);
      if(x1 !== null && x2 !== null && y1 !== null && y2 !== null){
        dist = distanceToSegment(x, y, x1, y1, x2, y2);
      }
    } else if(a.type === 'rect'){
      const x1 = t2x(a.time1), y1 = p2y(a.price1), x2 = t2x(a.time2), y2 = p2y(a.price2);
      if(x1 !== null && x2 !== null && y1 !== null && y2 !== null){
        // Distance à un bord du rectangle
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const dxIn = (x >= minX && x <= maxX) ? 0 : Math.min(Math.abs(x - minX), Math.abs(x - maxX));
        const dyIn = (y >= minY && y <= maxY) ? 0 : Math.min(Math.abs(y - minY), Math.abs(y - maxY));
        dist = Math.hypot(dxIn, dyIn);
      }
    }
    if(dist < bestDist){ bestDist = dist; bestIdx = i; }
  }
  if(bestIdx !== -1){
    state.annotations.splice(bestIdx, 1);
    saveAnnotations();
    renderAll();
    showToast('🗑 Annotation supprimée');
  }
}

function distanceToSegment(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if(len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}

function drawAnnotations(ctx, t2x, p2y, w, h){
  ctx.lineWidth = 1.5;
  ctx.font = 'bold 11px Segoe UI, system-ui';
  for(const a of state.annotations){
    const color = ANNOT_COLORS[a.color] || ANNOT_COLORS.acc;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if(a.type === 'hline'){
      const y = p2y(a.price);
      if(y === null) continue;
      ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textBaseline = 'bottom';
      ctx.fillText(a.price.toFixed(5), 6, y - 3);
    } else if(a.type === 'trendline'){
      const x1 = t2x(a.time1), y1 = p2y(a.price1), x2 = t2x(a.time2), y2 = p2y(a.price2);
      if(x1 === null || x2 === null || y1 === null || y2 === null) continue;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI*2); ctx.fill();
    } else if(a.type === 'rect'){
      const x1 = t2x(a.time1), y1 = p2y(a.price1), x2 = t2x(a.time2), y2 = p2y(a.price2);
      if(x1 === null || x2 === null || y1 === null || y2 === null) continue;
      const X = Math.min(x1, x2), Y = Math.min(y1, y2);
      const W = Math.abs(x2 - x1), H = Math.abs(y2 - y1);
      ctx.globalAlpha = 0.12;
      ctx.fillRect(X, Y, W, H);
      ctx.globalAlpha = 1;
      ctx.strokeRect(X, Y, W, H);
    } else if(a.type === 'text'){
      const x = t2x(a.time), y = p2y(a.price);
      if(x === null || y === null) continue;
      // background pour lisibilité
      const m = ctx.measureText(a.text);
      ctx.fillStyle = 'rgba(15,17,23,0.85)';
      ctx.fillRect(x - 2, y - 14, m.width + 8, 18);
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(a.text, x + 2, y - 5);
      // petit pointeur
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
    }
  }
  // Drawing en cours (trendline/rect)
  if(state.annotDrawing){
    const color = ANNOT_COLORS[state.annotDrawing.color];
    const x1 = t2x(state.annotDrawing.time1), y1 = p2y(state.annotDrawing.price1);
    if(x1 !== null && y1 !== null){
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x1, y1, 12, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function wireAnnotations(){
  // Subscribe au click du chart
  state.chart.subscribeClick(param => handleChartClick(param));
  // Boutons mode
  document.querySelectorAll('.annot-btn[data-mode]').forEach(b => {
    b.addEventListener('click', () => setAnnotMode(b.dataset.mode));
  });
  // Boutons couleur
  document.querySelectorAll('.annot-btn.annot-color').forEach(b => {
    b.addEventListener('click', () => setAnnotColor(b.dataset.color));
  });
  setAnnotColor('acc'); // couleur active par défaut
  // Bouton tout effacer
  document.getElementById('annot-clear-all').addEventListener('click', () => {
    if(state.annotations.length === 0){ showToast('Aucune annotation à effacer'); return; }
    if(!confirm(`Effacer toutes les annotations (${state.annotations.length}) ?`)) return;
    state.annotations = [];
    saveAnnotations();
    renderAll();
    showToast('🗑 Toutes les annotations effacées');
  });
  // Escape pour annuler un drawing en cours
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && state.annotDrawing){
      state.annotDrawing = null;
      renderAll();
    }
  });
}

// ============================================================
// ONBOARDING — tour guidé au 1er lancement
// ============================================================


let _onbStep = 0;

function showOnboardingStep(){
  const s = ONBOARDING_STEPS[_onbStep];
  document.getElementById('onb-emoji').textContent = s.emoji;
  document.getElementById('onb-title').textContent = s.title;
  document.getElementById('onb-content').innerHTML = s.html;
  document.getElementById('onb-step-num').textContent = (_onbStep + 1);
  document.getElementById('onb-progress-fill').style.width = ((_onbStep + 1) / ONBOARDING_STEPS.length * 100) + '%';
  document.getElementById('onb-prev').disabled = _onbStep === 0;
  document.getElementById('onb-prev').style.opacity = _onbStep === 0 ? '0.3' : '1';
  document.getElementById('onb-next').textContent = _onbStep === ONBOARDING_STEPS.length - 1 ? '🚀 Commencer' : 'Suivant →';
}

function startOnboarding(){
  _onbStep = 0;
  document.getElementById('modal-onboarding').classList.add('open');
  showOnboardingStep();
}

function endOnboarding(){
  document.getElementById('modal-onboarding').classList.remove('open');
  localStorage.setItem('onboarding_done', 'true');
}

function wireOnboarding(){
  document.getElementById('onb-next').addEventListener('click', () => {
    if(_onbStep < ONBOARDING_STEPS.length - 1){
      _onbStep++;
      showOnboardingStep();
    } else {
      endOnboarding();
    }
  });
  document.getElementById('onb-prev').addEventListener('click', () => {
    if(_onbStep > 0){
      _onbStep--;
      showOnboardingStep();
    }
  });
  document.getElementById('onb-skip').addEventListener('click', endOnboarding);

  // Auto-show si jamais fait
  if(!localStorage.getItem('onboarding_done')){
    // Petit délai pour que l'app se charge d'abord
    setTimeout(() => startOnboarding(), 800);
  }
}

// Expose pour pouvoir relancer le tour depuis Paramètres
window.startOnboarding = startOnboarding;

// ============================================================
// PAPER TRADING — compte fictif avec positions live
// ============================================================
// Approximation : 1 pip × 1 lot ≈ 10€ (vraie valeur ~10$ ≈ 9.3€ mais on simplifie)
const PIP_VALUE_EUR = 10;
const PAPER_SPREAD_DEFAULT = 1; // 1 pip total = 0.5 pip aller + 0.5 pip retour (réaliste EUR/USD)

state.paper = {
  balance: parseFloat(localStorage.getItem('paper_balance') || '10000'),
  positions: JSON.parse(localStorage.getItem('paper_positions') || '[]'),
  history: JSON.parse(localStorage.getItem('paper_history') || '[]'),
  spreadPips: parseFloat(localStorage.getItem('paper_spread') || PAPER_SPREAD_DEFAULT),
  propfirm: JSON.parse(localStorage.getItem('paper_propfirm') || 'null'),
};
let _paperEquityChart = null;
state.paperPriceLines = []; // {posId, kind, line}

function savePaper(){
  localStorage.setItem('paper_balance', state.paper.balance);
  localStorage.setItem('paper_positions', JSON.stringify(state.paper.positions));
  localStorage.setItem('paper_history', JSON.stringify(state.paper.history));
  localStorage.setItem('paper_propfirm', JSON.stringify(state.paper.propfirm));
  scheduleAutoSync();
}

// ============================================================
// PROPFIRM CHALLENGE — simule contraintes FTMO/TFT/Apex/etc.
// ============================================================

function startPropfirmChallenge(accountSize){
  const today = new Date().toISOString().slice(0, 10);
  state.paper.propfirm = {
    active: true,
    accountSize,
    profitTarget: 0.10, // 10%
    dailyLossLimit: 0.05, // 5%
    maxDrawdown: 0.10, // 10%
    startBalance: accountSize,
    dailyStartBalance: accountSize,
    dailyStartDate: today,
    peakBalance: accountSize,
    status: 'in_progress', // 'in_progress' | 'passed' | 'failed_daily' | 'failed_dd'
    startedAt: Date.now(),
  };
  // Met le solde du paper à la taille du challenge
  state.paper.balance = accountSize;
  // Ferme les positions ouvertes (challenge = fresh start)
  state.paper.positions = [];
  savePaper();
  renderPaperTrading();
  showToast(`🏆 Challenge ${accountSize.toLocaleString('fr-FR')}€ démarré ! Objectif : +10% sans casser les règles.`);
}

function endPropfirmChallenge(){
  if(!confirm('Abandonner le challenge en cours ?')) return;
  state.paper.propfirm = null;
  savePaper();
  renderPaperTrading();
  showToast('🏳️ Challenge abandonné');
}

function checkPropfirmRules(){
  const pf = state.paper.propfirm;
  if(!pf || !pf.active || pf.status !== 'in_progress') return;

  // Daily reset si nouvelle journée UTC
  const today = new Date().toISOString().slice(0, 10);
  if(today !== pf.dailyStartDate){
    pf.dailyStartBalance = state.paper.balance;
    pf.dailyStartDate = today;
  }

  // Equity = balance + P&L flottant
  const cp = paperCurrentPrice();
  const floating = state.paper.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + calcPositionPnL(p, cp), 0);
  const equity = state.paper.balance + floating;

  // Update peak
  if(equity > pf.peakBalance) pf.peakBalance = equity;

  // Daily loss
  const dailyLoss = pf.dailyStartBalance - equity;
  if(dailyLoss / pf.accountSize >= pf.dailyLossLimit){
    pf.status = 'failed_daily';
    savePaper();
    sendNotif('🛑 Challenge échoué', `Daily loss dépassé (-${pf.dailyLossLimit*100}%). Compte verrouillé.`, 'pf-failed-daily');
    return;
  }
  // Max drawdown
  const drawdown = pf.peakBalance - equity;
  if(drawdown / pf.accountSize >= pf.maxDrawdown){
    pf.status = 'failed_dd';
    savePaper();
    sendNotif('🛑 Challenge échoué', `Max drawdown dépassé (-${pf.maxDrawdown*100}%). Compte verrouillé.`, 'pf-failed-dd');
    return;
  }
  // Profit target
  const profit = equity - pf.startBalance;
  if(profit / pf.startBalance >= pf.profitTarget){
    pf.status = 'passed';
    savePaper();
    sendNotif('🎉 Challenge réussi !', `Tu as atteint +${(pf.profitTarget*100).toFixed(0)}% sans casser les règles.`, 'pf-passed-' + Date.now());
    return;
  }
}

function canTradePropfirm(){
  const pf = state.paper.propfirm;
  if(!pf || !pf.active) return true;
  return pf.status === 'in_progress';
}

function renderPropfirmCard(){
  const el = document.getElementById('propfirm-card');
  if(!el) return;
  const pf = state.paper.propfirm;
  if(!pf || !pf.active){
    el.classList.remove('passed', 'failed');
    el.innerHTML = `
      <div class="propfirm-empty">Simule les contraintes d'une vraie propfirm (FTMO, TFT, Apex…).</div>
      <div class="propfirm-start-btns">
        <button data-size="10000">10 000€</button>
        <button data-size="25000">25 000€</button>
        <button data-size="50000">50 000€</button>
        <button data-size="100000">100 000€</button>
      </div>
      <p style="font-size:0.68rem;color:var(--muted);margin-top:8px;line-height:1.4">
        Règles : +10% en profit / -5% daily loss / -10% drawdown total. Reset solde à la taille choisie.
      </p>
    `;
    el.querySelectorAll('.propfirm-start-btns button').forEach(b => {
      b.addEventListener('click', () => {
        const size = parseInt(b.dataset.size, 10);
        if(state.paper.balance !== 10000 || state.paper.history.length > 0){
          if(!confirm(`Démarrer un challenge ${size.toLocaleString('fr-FR')}€ ?\nTon solde actuel et tes positions ouvertes seront réinitialisés.`)) return;
        }
        startPropfirmChallenge(size);
      });
    });
    return;
  }

  // Challenge actif
  el.classList.toggle('passed', pf.status === 'passed');
  el.classList.toggle('failed', pf.status === 'failed_daily' || pf.status === 'failed_dd');

  const cp = paperCurrentPrice();
  const floating = state.paper.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + calcPositionPnL(p, cp), 0);
  const equity = state.paper.balance + floating;

  const profit = equity - pf.startBalance;
  const profitPct = profit / pf.startBalance;
  const profitTargetPct = pf.profitTarget;

  const dailyLoss = pf.dailyStartBalance - equity;
  const dailyLossPct = dailyLoss / pf.accountSize;
  const dailyLossLimitPct = pf.dailyLossLimit;

  const drawdown = pf.peakBalance - equity;
  const drawdownPct = drawdown / pf.accountSize;
  const maxDDPct = pf.maxDrawdown;

  const statusLabel = {
    in_progress: { txt: 'EN COURS', cls: 'active' },
    passed: { txt: '✅ RÉUSSI', cls: 'passed' },
    failed_daily: { txt: '🛑 DAILY LOSS', cls: 'failed' },
    failed_dd: { txt: '🛑 MAX DD', cls: 'failed' },
  }[pf.status];

  el.innerHTML = `
    <div class="pf-status">
      <span class="pf-badge ${statusLabel.cls}">${statusLabel.txt}</span>
      <span class="pf-account-size">${pf.accountSize.toLocaleString('fr-FR')}€</span>
    </div>
    <div class="pf-bar-row">
      <div class="pf-bar-label">
        <span>🎯 Profit target ${(profitTargetPct*100).toFixed(0)}%</span>
        <span>${profit >= 0 ? '+' : ''}${(profitPct*100).toFixed(2)}% / ${(profitTargetPct*100).toFixed(0)}%</span>
      </div>
      <div class="pf-bar"><div class="pf-bar-fill profit" style="width:${Math.min(100, Math.max(0, profitPct / profitTargetPct * 100))}%"></div></div>
    </div>
    <div class="pf-bar-row">
      <div class="pf-bar-label">
        <span>📉 Daily loss (limite -${(dailyLossLimitPct*100).toFixed(0)}%)</span>
        <span>${dailyLoss > 0 ? '-' : '+'}${Math.abs(dailyLossPct*100).toFixed(2)}% / -${(dailyLossLimitPct*100).toFixed(0)}%</span>
      </div>
      <div class="pf-bar"><div class="pf-bar-fill ${dailyLossPct >= dailyLossLimitPct * 0.7 ? 'danger' : 'warn'}" style="width:${Math.min(100, Math.max(0, dailyLossPct / dailyLossLimitPct * 100))}%"></div></div>
    </div>
    <div class="pf-bar-row">
      <div class="pf-bar-label">
        <span>📊 Drawdown total (limite -${(maxDDPct*100).toFixed(0)}%)</span>
        <span>-${(drawdownPct*100).toFixed(2)}% / -${(maxDDPct*100).toFixed(0)}%</span>
      </div>
      <div class="pf-bar"><div class="pf-bar-fill ${drawdownPct >= maxDDPct * 0.7 ? 'danger' : 'warn'}" style="width:${Math.min(100, Math.max(0, drawdownPct / maxDDPct * 100))}%"></div></div>
    </div>
    <div class="propfirm-actions">
      ${pf.status === 'in_progress'
        ? '<button class="danger" id="pf-abandon">🏳️ Abandonner</button>'
        : '<button id="pf-restart">🔄 Nouveau challenge</button>'}
    </div>
  `;
  const abandonBtn = document.getElementById('pf-abandon');
  if(abandonBtn) abandonBtn.addEventListener('click', endPropfirmChallenge);
  const restartBtn = document.getElementById('pf-restart');
  if(restartBtn) restartBtn.addEventListener('click', () => {
    state.paper.propfirm = null;
    savePaper();
    renderPaperTrading();
  });
}

function paperCurrentPrice(){
  if(state.candles.length === 0) return null;
  return state.candles[state.candles.length - 1].close;
}

function calcLotsForRisk(balance, riskPct, entry, sl){
  if(!entry || !sl || balance <= 0) return 0;
  const slPips = Math.abs(entry - sl) / PIP;
  if(slPips < 0.1) return 0;
  const riskEur = balance * riskPct / 100;
  return riskEur / (slPips * PIP_VALUE_EUR);
}

function calcPositionPnL(pos, currentPrice){
  if(!currentPrice) return 0;
  const pips = pos.side === 'long'
    ? (currentPrice - pos.entry) / PIP
    : (pos.entry - currentPrice) / PIP;
  return pips * pos.lots * PIP_VALUE_EUR;
}

function placePaperOrder(){
  // Block si propfirm verrouillé
  if(!canTradePropfirm()){
    const pf = state.paper.propfirm;
    const msg = pf.status === 'failed_daily' ? 'Daily loss dépassé. Reviens demain.' :
                pf.status === 'failed_dd' ? 'Max drawdown dépassé. Challenge échoué.' :
                pf.status === 'passed' ? 'Challenge réussi ! Démarre-en un nouveau.' :
                'Compte propfirm verrouillé.';
    showToast('🛑 ' + msg);
    return;
  }
  const side = document.querySelector('input[name="paper-side"]:checked').value;
  const orderType = document.getElementById('paper-order-type').value;
  const entry = parseFloat(document.getElementById('paper-entry').value);
  const sl = parseFloat(document.getElementById('paper-sl').value);
  const tp = parseFloat(document.getElementById('paper-tp').value);
  const riskPct = parseFloat(document.getElementById('paper-risk-pct').value);

  if(isNaN(entry) || isNaN(sl) || isNaN(tp)){ showToast('⚠ Remplis Entry, SL et TP'); return; }
  if(side === 'long' && sl >= entry){ showToast('⚠ Pour un LONG, le SL doit être SOUS l\'entry'); return; }
  if(side === 'long' && tp <= entry){ showToast('⚠ Pour un LONG, le TP doit être AU-DESSUS de l\'entry'); return; }
  if(side === 'short' && sl <= entry){ showToast('⚠ Pour un SHORT, le SL doit être AU-DESSUS de l\'entry'); return; }
  if(side === 'short' && tp >= entry){ showToast('⚠ Pour un SHORT, le TP doit être SOUS l\'entry'); return; }

  const lots = calcLotsForRisk(state.paper.balance, riskPct || 1, entry, sl);
  if(lots <= 0){ showToast('⚠ Taille de position invalide'); return; }
  if(lots > 100){ showToast('⚠ Position trop grosse (>100 lots). Réduis le % risque.'); return; }

  const currentPrice = paperCurrentPrice();
  const status = orderType === 'limit' ? 'pending' : 'open';
  // Spread aller : 0.5 pip défavorable à l'entrée pour un market order
  const halfSpread = (state.paper.spreadPips / 2) * PIP;
  let realEntry;
  if(orderType === 'market'){
    realEntry = side === 'long' ? currentPrice + halfSpread : currentPrice - halfSpread;
  } else {
    realEntry = entry; // limit : entry exact souhaité (spread sera appliqué à l'activation)
  }

  const pos = {
    id: Date.now(),
    side, orderType,
    entry: realEntry,
    sl, tp, lots,
    openTime: Math.floor(Date.now() / 1000),
    openPrice: realEntry,
    status,
    spreadCost: state.paper.spreadPips, // pour info
  };
  state.paper.positions.push(pos);
  savePaper();
  renderPaperTrading();
  renderPaperPositionsOnChart();
  showToast(`✓ ${side === 'long' ? '▲ LONG' : '▼ SHORT'} ${lots.toFixed(2)} lots placé (spread ${state.paper.spreadPips} pip)`);

  // Clear le formulaire
  document.getElementById('paper-entry').value = '';
  document.getElementById('paper-sl').value = '';
  document.getElementById('paper-tp').value = '';
  document.getElementById('paper-preview').classList.remove('visible');
}

function applyExitSpread(price, side){
  // Spread retour : 0.5 pip défavorable à la sortie
  const halfSpread = (state.paper.spreadPips / 2) * PIP;
  return side === 'long' ? price - halfSpread : price + halfSpread;
}

function editPositionLevel(posId, kind){
  const pos = state.paper.positions.find(p => p.id === posId);
  if(!pos) return;
  const currentValue = pos[kind];
  const label = kind === 'sl' ? 'Stop Loss' : 'Take Profit';
  const newValueStr = prompt(`Nouveau ${label} pour ${pos.side === 'long' ? '▲ LONG' : '▼ SHORT'} (actuel : ${currentValue.toFixed(5)}) :`, currentValue.toFixed(5));
  if(newValueStr === null) return;
  const newValue = parseFloat(newValueStr);
  if(isNaN(newValue)){ showToast('⚠ Valeur invalide'); return; }
  // Validation cohérence
  if(kind === 'sl'){
    if(pos.side === 'long' && newValue >= pos.entry){ showToast('⚠ SL doit être SOUS l\'entry pour un long'); return; }
    if(pos.side === 'short' && newValue <= pos.entry){ showToast('⚠ SL doit être AU-DESSUS de l\'entry pour un short'); return; }
  } else {
    if(pos.side === 'long' && newValue <= pos.entry){ showToast('⚠ TP doit être AU-DESSUS de l\'entry pour un long'); return; }
    if(pos.side === 'short' && newValue >= pos.entry){ showToast('⚠ TP doit être SOUS l\'entry pour un short'); return; }
  }
  pos[kind] = newValue;
  savePaper();
  renderPaperTrading();
  renderPaperPositionsOnChart();
  showToast(`✓ ${label} déplacé à ${newValue.toFixed(5)}`);
}

function renderPaperPositionsOnChart(){
  if(!state.series) return;
  // Clean anciennes lignes paper
  state.paperPriceLines.forEach(p => {
    try { state.series.removePriceLine(p.line); } catch(e){}
  });
  state.paperPriceLines = [];
  // Ajoute les positions ouvertes/pending
  for(const pos of state.paper.positions){
    if(pos.status === 'closed') continue;
    const sideColor = pos.side === 'long' ? '#10b981' : '#ef4444';
    const isPending = pos.status === 'pending';
    const sidePrefix = pos.side === 'long' ? '▲L' : '▼S';
    const suffix = isPending ? ' ⏳' : '';
    // Entry
    state.paperPriceLines.push({ posId: pos.id, kind: 'entry', line: state.series.createPriceLine({
      price: pos.entry, color: sideColor, lineWidth: 2,
      lineStyle: isPending ? LightweightCharts.LineStyle.Dotted : LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true, title: `${sidePrefix}${suffix}`,
    })});
    // SL
    state.paperPriceLines.push({ posId: pos.id, kind: 'sl', line: state.series.createPriceLine({
      price: pos.sl, color: '#ef4444', lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true, title: `${sidePrefix} SL`,
    })});
    // TP
    state.paperPriceLines.push({ posId: pos.id, kind: 'tp', line: state.series.createPriceLine({
      price: pos.tp, color: '#3b82f6', lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true, title: `${sidePrefix} TP`,
    })});
  }
}

function checkPaperPositions(){
  // Toujours check les règles propfirm (même sans positions, pour daily reset)
  if(state.paper.propfirm && state.paper.propfirm.active) checkPropfirmRules();
  if(state.paper.positions.length === 0) return;
  if(state.candles.length === 0) return;
  const last = state.candles[state.candles.length - 1];
  let changed = false;

  for(const pos of state.paper.positions){
    if(pos.status === 'pending'){
      // Limit order : check si entry est touché. Appliquer spread à l'activation.
      const halfSpread = (state.paper.spreadPips / 2) * PIP;
      if(pos.side === 'long' && last.low <= pos.entry){
        pos.status = 'open';
        pos.openTime = last.time;
        pos.openPrice = pos.entry + halfSpread; // spread aller
        pos.entry = pos.openPrice;
        changed = true;
      } else if(pos.side === 'short' && last.high >= pos.entry){
        pos.status = 'open';
        pos.openTime = last.time;
        pos.openPrice = pos.entry - halfSpread;
        pos.entry = pos.openPrice;
        changed = true;
      }
    }
    if(pos.status === 'open'){
      // Check SL puis TP. Le spread retour est appliqué au prix d'exit.
      if(pos.side === 'long'){
        if(last.low <= pos.sl){ closePaperPosition(pos.id, applyExitSpread(pos.sl, 'long'), 'sl'); changed = true; }
        else if(last.high >= pos.tp){ closePaperPosition(pos.id, applyExitSpread(pos.tp, 'long'), 'tp'); changed = true; }
      } else {
        if(last.high >= pos.sl){ closePaperPosition(pos.id, applyExitSpread(pos.sl, 'short'), 'sl'); changed = true; }
        else if(last.low <= pos.tp){ closePaperPosition(pos.id, applyExitSpread(pos.tp, 'short'), 'tp'); changed = true; }
      }
    }
  }
  if(changed){
    savePaper();
    renderPaperTrading();
    renderPaperPositionsOnChart();
  }
}

function closePaperPosition(id, exitPrice, reason){
  const idx = state.paper.positions.findIndex(p => p.id === id);
  if(idx === -1) return;
  const pos = state.paper.positions[idx];
  // Si fermeture manuelle, appliquer aussi le spread retour
  if(reason === 'manual') exitPrice = applyExitSpread(exitPrice, pos.side);
  const pnl = calcPositionPnL(pos, exitPrice);
  pos.status = 'closed';
  pos.exitTime = Math.floor(Date.now() / 1000);
  pos.exitPrice = exitPrice;
  pos.exitReason = reason;
  pos.pnl = pnl;
  state.paper.balance += pnl;
  state.paper.history.unshift(pos);
  if(state.paper.history.length > 200) state.paper.history.pop();
  state.paper.positions.splice(idx, 1);
  savePaper();
  const sign = pnl >= 0 ? '+' : '';
  const emoji = reason === 'tp' ? '🎯' : reason === 'sl' ? '🛑' : '✋';
  showToast(`${emoji} Position fermée : ${sign}${pnl.toFixed(2)} €`);
  // Notification browser si alertes activées
  if(reason !== 'manual' && state.alerts && state.alerts.enabled){
    sendNotif(`${emoji} Position ${reason === 'tp' ? 'gagnante' : 'perdante'}`,
      `${pos.side === 'long' ? '▲ LONG' : '▼ SHORT'} fermée par ${reason.toUpperCase()} : ${sign}${pnl.toFixed(2)} €`,
      'paper-close-' + pos.id);
  }
}

function depositFunds(amount){
  if(!amount || amount <= 0) return;
  state.paper.balance += amount;
  savePaper();
  renderPaperTrading();
  showToast(`+${amount.toFixed(0)} € déposés`);
}

function withdrawFunds(amount){
  if(!amount || amount <= 0) return;
  if(amount > state.paper.balance){ showToast('⚠ Solde insuffisant'); return; }
  state.paper.balance -= amount;
  savePaper();
  renderPaperTrading();
  showToast(`-${amount.toFixed(0)} € retirés`);
}

function resetPaperAccount(){
  if(state.paper.positions.length > 0 || state.paper.history.length > 0){
    if(!confirm('Reset le compte ? Toutes tes positions ouvertes et l\'historique seront perdus.')) return;
  }
  state.paper = { balance: 10000, positions: [], history: [] };
  savePaper();
  renderPaperTrading();
  showToast('🔄 Compte réinitialisé à 10 000 €');
}

function updatePaperPreview(){
  const preview = document.getElementById('paper-preview');
  const entry = parseFloat(document.getElementById('paper-entry').value);
  const sl = parseFloat(document.getElementById('paper-sl').value);
  const tp = parseFloat(document.getElementById('paper-tp').value);
  const riskPct = parseFloat(document.getElementById('paper-risk-pct').value) || 1;
  const side = document.querySelector('input[name="paper-side"]:checked').value;
  if(isNaN(entry) || isNaN(sl)){ preview.classList.remove('visible'); return; }

  const lots = calcLotsForRisk(state.paper.balance, riskPct, entry, sl);
  const riskEur = state.paper.balance * riskPct / 100;
  const slPips = Math.abs(entry - sl) / PIP;
  const tpPips = !isNaN(tp) ? Math.abs(tp - entry) / PIP : null;
  const rr = (slPips > 0 && tpPips !== null) ? (tpPips / slPips) : null;
  const potentialGain = (tpPips !== null) ? tpPips * lots * PIP_VALUE_EUR : null;

  preview.innerHTML = `
    <div class="pp-row"><span class="pp-label">Taille</span><span class="pp-val">${lots.toFixed(3)} lots (${(lots*100000).toLocaleString('fr-FR',{maximumFractionDigits:0})} €)</span></div>
    <div class="pp-row"><span class="pp-label">Risque max (si SL)</span><span class="pp-val down">-${riskEur.toFixed(2)} € (${slPips.toFixed(1)} pips)</span></div>
    ${potentialGain !== null ? `<div class="pp-row"><span class="pp-label">Gain max (si TP)</span><span class="pp-val up">+${potentialGain.toFixed(2)} € (${tpPips.toFixed(1)} pips)</span></div>` : ''}
    ${rr !== null ? `<div class="pp-row"><span class="pp-label">R:R</span><span class="pp-val ${rr >= 2 ? 'up' : rr >= 1 ? '' : 'down'}">1 : ${rr.toFixed(2)}</span></div>` : ''}
  `;
  preview.classList.add('visible');
}

function autoCalcTP(){
  const entry = parseFloat(document.getElementById('paper-entry').value);
  const sl = parseFloat(document.getElementById('paper-sl').value);
  const rr = parseFloat(document.getElementById('paper-rr').value);
  const side = document.querySelector('input[name="paper-side"]:checked').value;
  if(isNaN(entry) || isNaN(sl)){ showToast('⚠ Remplis Entry et SL d\'abord'); return; }
  const slDist = Math.abs(entry - sl);
  const tp = side === 'long' ? entry + slDist * rr : entry - slDist * rr;
  document.getElementById('paper-tp').value = tp.toFixed(5);
  updatePaperPreview();
}

function renderPaperTrading(){
  // Propfirm card
  renderPropfirmCard();
  // Capital
  const balance = state.paper.balance;
  const currentPrice = paperCurrentPrice();
  const floatingPnL = state.paper.positions
    .filter(p => p.status === 'open')
    .reduce((sum, p) => sum + calcPositionPnL(p, currentPrice), 0);
  const equity = balance + floatingPnL;
  const totalRealized = state.paper.history.reduce((s, p) => s + (p.pnl || 0), 0);

  document.getElementById('paper-balance').textContent = balance.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';
  const equityEl = document.getElementById('paper-equity');
  equityEl.textContent = equity.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';
  equityEl.className = 'paper-value ' + (equity > balance ? 'up' : equity < balance ? 'down' : '');
  const totalEl = document.getElementById('paper-total-pnl');
  totalEl.textContent = (totalRealized >= 0 ? '+' : '') + totalRealized.toFixed(2) + ' €';
  totalEl.className = 'paper-value ' + (totalRealized > 0 ? 'up' : totalRealized < 0 ? 'down' : '');

  // Positions ouvertes
  const openPositions = state.paper.positions;
  document.getElementById('paper-open-count').textContent = `(${openPositions.length})`;
  const posListEl = document.getElementById('paper-positions');
  if(openPositions.length === 0){
    posListEl.innerHTML = '<div style="font-size:0.78rem;color:var(--muted);text-align:center;padding:14px">Aucune position ouverte. Place ta première position ci-contre.</div>';
  } else {
    posListEl.innerHTML = openPositions.map(p => {
      const pnl = p.status === 'open' ? calcPositionPnL(p, currentPrice) : 0;
      const sign = pnl >= 0 ? '+' : '';
      const pips = currentPrice && p.status === 'open' ? (
        p.side === 'long' ? (currentPrice - p.entry) / PIP : (p.entry - currentPrice) / PIP
      ).toFixed(1) : '—';
      const statusBadge = p.status === 'pending' ? '<span style="font-size:0.6rem;color:var(--orange);background:var(--orange-dim);padding:2px 6px;border-radius:99px">⏳ EN ATTENTE</span>' : '';
      return `
        <div class="paper-position ${p.side}">
          <div class="paper-position-header">
            <span class="side-badge">${p.side === 'long' ? '▲ LONG' : '▼ SHORT'}</span>
            ${statusBadge}
            <span class="pos-time">${new Date(p.openTime * 1000).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <span class="pnl-live ${pnl > 0 ? 'up' : pnl < 0 ? 'down' : ''}" style="margin-left:auto">${p.status === 'open' ? sign + pnl.toFixed(2) + ' €' : '—'}</span>
          </div>
          <div class="paper-position-details">
            <div class="pd-row"><span>Entry</span><span class="pd-val">${p.entry.toFixed(5)}</span></div>
            <div class="pd-row"><span>SL</span><span class="pd-val" style="color:var(--red)">${p.sl.toFixed(5)}</span></div>
            <div class="pd-row"><span>TP</span><span class="pd-val" style="color:var(--blue)">${p.tp.toFixed(5)}</span></div>
            <div class="pd-row"><span>Lots</span><span class="pd-val">${p.lots.toFixed(3)}</span></div>
            <div class="pd-row"><span>Pips</span><span class="pd-val">${pips}</span></div>
            <div class="pd-row"><span>Type</span><span class="pd-val">${p.orderType}</span></div>
          </div>
          <div class="paper-position-actions">
            <button class="btn-edit-pos" data-id="${p.id}" data-kind="sl" title="Modifier le Stop Loss">✏ SL</button>
            <button class="btn-edit-pos" data-id="${p.id}" data-kind="tp" title="Modifier le Take Profit">✏ TP</button>
            <button class="btn-close-pos" data-id="${p.id}">✋ Fermer maintenant</button>
          </div>
        </div>
      `;
    }).join('');
    posListEl.querySelectorAll('.btn-close-pos').forEach(b => {
      b.addEventListener('click', () => {
        if(!currentPrice){ showToast('⚠ Pas de prix actuel'); return; }
        closePaperPosition(parseInt(b.dataset.id), currentPrice, 'manual');
      });
    });
    posListEl.querySelectorAll('.btn-edit-pos').forEach(b => {
      b.addEventListener('click', () => editPositionLevel(parseInt(b.dataset.id), b.dataset.kind));
    });
  }

  // Stats
  const closed = state.paper.history;
  const n = closed.length;
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const winrate = n > 0 ? (wins.length / n) * 100 : 0;
  const totalProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

  document.getElementById('paper-stats').innerHTML = `
    <div class="bt-stat"><div class="label">Trades</div><div class="value">${n}</div><div class="sub">${wins.length}W / ${losses.length}L</div></div>
    <div class="bt-stat"><div class="label">Winrate</div><div class="value ${winrate >= 50 ? 'up' : winrate > 0 ? 'down' : ''}">${n > 0 ? winrate.toFixed(0) + '%' : '—'}</div></div>
    <div class="bt-stat"><div class="label">Profit factor</div><div class="value ${profitFactor >= 1.5 ? 'up' : profitFactor >= 1 ? '' : 'down'}">${n > 0 ? (isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞') : '—'}</div></div>
    <div class="bt-stat"><div class="label">Évolution</div><div class="value ${balance > 10000 ? 'up' : balance < 10000 ? 'down' : ''}">${((balance / 10000 - 1) * 100).toFixed(1)}%</div></div>
  `;

  // Equity curve
  if(closed.length > 1){
    document.getElementById('paper-equity-wrap').style.display = 'block';
    const data = [];
    let acc = 10000;
    for(const t of closed.slice().reverse()){ acc += t.pnl; data.push(acc); }
    if(_paperEquityChart) _paperEquityChart.destroy();
    _paperEquityChart = new Chart(document.getElementById('paper-equity-chart'), {
      type: 'line',
      data: { labels: data.map((_, i) => i + 1), datasets: [{
        data, borderColor: data[data.length-1] >= 10000 ? '#10b981' : '#ef4444',
        backgroundColor: data[data.length-1] >= 10000 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2,
      }]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } }},
      },
    });
  } else {
    document.getElementById('paper-equity-wrap').style.display = 'none';
  }

  // Historique
  document.getElementById('paper-history-count').textContent = `(${closed.length})`;
  const histEl = document.getElementById('paper-history');
  if(closed.length === 0){
    histEl.innerHTML = '<div style="font-size:0.74rem;color:var(--muted);text-align:center;padding:10px">Aucun trade fermé.</div>';
  } else {
    histEl.innerHTML = closed.slice(0, 30).map(t => {
      const sign = t.pnl >= 0 ? '+' : '';
      const date = new Date(t.openTime * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const emoji = t.exitReason === 'tp' ? '🎯' : t.exitReason === 'sl' ? '🛑' : '✋';
      return `<div class="paper-history-item ${t.side}">
        <span class="side-badge">${t.side === 'long' ? '▲' : '▼'} ${t.side}</span>
        <span style="font-size:0.7rem;color:var(--muted2)">${date}</span>
        <span style="font-size:0.7rem;color:var(--muted2)">${emoji} ${t.exitReason}</span>
        <span style="font-size:0.7rem;color:var(--muted2)">${t.lots.toFixed(2)} lots</span>
        <span class="pnl-final ${t.pnl >= 0 ? 'up' : 'down'}">${sign}${t.pnl.toFixed(2)} €</span>
      </div>`;
    }).join('');
  }
}

function wirePaperTrading(){
  const modal = document.getElementById('modal-paper');
  document.getElementById('open-paper-trading').addEventListener('click', () => {
    modal.classList.add('open');
    // Pre-fill entry with current price for market orders
    const cp = paperCurrentPrice();
    if(cp && !document.getElementById('paper-entry').value){
      document.getElementById('paper-entry').value = cp.toFixed(5);
    }
    renderPaperTrading();
  });
  document.getElementById('btn-close-paper').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });

  document.getElementById('btn-place-order').addEventListener('click', placePaperOrder);
  document.getElementById('paper-auto-tp').addEventListener('click', autoCalcTP);
  document.getElementById('btn-paper-reset').addEventListener('click', resetPaperAccount);

  document.getElementById('btn-deposit').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('paper-amount').value);
    if(!isNaN(amount)){ depositFunds(amount); document.getElementById('paper-amount').value = ''; }
  });
  document.getElementById('btn-withdraw').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('paper-amount').value);
    if(!isNaN(amount)){ withdrawFunds(amount); document.getElementById('paper-amount').value = ''; }
  });

  // Preview update
  ['paper-entry', 'paper-sl', 'paper-tp', 'paper-risk-pct'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePaperPreview);
  });

  // Side radio visual
  document.querySelectorAll('input[name="paper-side"]').forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('#paper-side-group label').forEach(l => l.classList.remove('selected'));
      document.querySelector(`label[for="${r.id}"]`).classList.add('selected');
      updatePaperPreview();
    });
  });
}

// ============================================================
// FEATURE #1 — MOCK DATA RÉALISTE (cycles AMD, sweeps, OB)
// ============================================================


// ============================================================
// FEATURE #2 — HOVER TOOLTIP sur les zones OB/FVG
// ============================================================

let _hoverableZones = []; // {x, y, w, h, kind, zone, side}

function rebuildHoverableZones(){
  _hoverableZones = [];
  if(!state.chart || !state.series) return;
  const timeScale = state.chart.timeScale();
  const t2x = t => timeScale.timeToCoordinate(t);
  const p2y = p => state.series.priceToCoordinate(p);
  const canvas = state.overlayCanvas;
  if(!canvas) return;
  const w = parseFloat(canvas.style.width) || canvas.clientWidth;

  const addZones = (zones, kind, mitigatedOk) => {
    const list = mitigatedOk ? zones : zones.filter(z => !z.mitigated);
    for(const z of list){
      const x1 = t2x(z.time);
      if(x1 === null) continue;
      const y1 = p2y(z.top), y2 = p2y(z.bottom);
      if(y1 === null || y2 === null) continue;
      const xEnd = z.mitigated && z.mitigatedTime
        ? (t2x(z.mitigatedTime) || w)
        : w;
      _hoverableZones.push({
        x1, y1: Math.min(y1, y2), x2: xEnd, y2: Math.max(y1, y2),
        kind, zone: z,
      });
    }
  };

  if(state.indicators.ob) addZones(state.computed.orderBlocks, 'OB', true);
  if(state.indicators.fvg) addZones(state.computed.fvgs, 'FVG', true);
  if(state.indicators.breaker) addZones(state.computed.breakers, 'BB', false);
  if(state.indicators.ifvg) addZones(state.computed.ifvgs, 'IFVG', false);
}

function showZoneTooltip(zone, kind, clientX, clientY){
  const tt = document.getElementById('zone-tooltip');
  const d = zone.scoreDetails || {};
  const maxScore = state.indicators.multitf ? (kind === 'OB' ? 5 : 4) : (kind === 'OB' ? 4 : 3);
  const yes = (v) => v ? '<span class="tt-val yes">✓</span>' : '<span class="tt-val no">—</span>';
  const sideLabel = zone.type === 'bullish' ? 'Long ▲' : 'Short ▼';
  const mid = ((zone.top + zone.bottom) / 2).toFixed(5);
  const pipsHeight = ((zone.top - zone.bottom) / PIP).toFixed(1);
  tt.innerHTML = `
    <div class="tt-title">${kind} ${sideLabel} ${zone.mitigated ? '(mitigé)' : ''}</div>
    <div class="tt-row"><span class="tt-label">Mid</span><span class="tt-val">${mid}</span></div>
    <div class="tt-row"><span class="tt-label">Hauteur</span><span class="tt-val">${pipsHeight} pips</span></div>
    <div class="tt-row"><span class="tt-label">Zone PD favorable</span>${yes(d.favorablePD)}</div>
    <div class="tt-row"><span class="tt-label">Formé en killzone</span>${yes(d.killzone)}</div>
    <div class="tt-row"><span class="tt-label">En zone OTE</span>${yes(d.ote)}</div>
    ${kind === 'OB' ? `<div class="tt-row"><span class="tt-label">FVG dans impulsion</span>${yes(d.fvgInImpulse)}</div>` : ''}
    <div class="tt-row"><span class="tt-label">Confirmé HTF</span>${yes(d.htf)}</div>
    <div class="tt-score">Score : ${zone.score || 0} / ${maxScore}</div>
  `;
  const chartRect = document.getElementById('chart').getBoundingClientRect();
  const x = clientX - chartRect.left + 14;
  const y = clientY - chartRect.top + 14;
  tt.style.left = Math.min(x, chartRect.width - 260) + 'px';
  tt.style.top = Math.min(y, chartRect.height - 200) + 'px';
  tt.classList.add('visible');
}

function hideZoneTooltip(){ document.getElementById('zone-tooltip').classList.remove('visible'); }

function setupZoneHover(){
  const chart = document.getElementById('chart');
  chart.addEventListener('mousemove', e => {
    const rect = chart.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let hit = null;
    // Itérer à l'envers : les zones plus récentes (dessinées en dernier) ont priorité
    for(let i = _hoverableZones.length - 1; i >= 0; i--){
      const z = _hoverableZones[i];
      if(mx >= z.x1 && mx <= z.x2 && my >= z.y1 && my <= z.y2){
        hit = z; break;
      }
    }
    if(hit) showZoneTooltip(hit.zone, hit.kind, e.clientX, e.clientY);
    else hideZoneTooltip();
  });
  chart.addEventListener('mouseleave', hideZoneTooltip);
}

// ============================================================
// FEATURE #4 — NEWS EVENTS OVERLAY
// ============================================================
// Calendrier hardcodé des news majeures forex 2026 (récurrents + connus)
// Format : { name, importance, schedule } avec schedule = "weekly|monthly|date"

const NEWS_EVENTS = [
  // Mensuels typiques (US)
  { name: 'NFP', impact: 'high', currency: 'USD', dayOfMonth: 'first-friday', hour: 12.5 }, // 1er vendredi du mois 12h30 GMT
  { name: 'CPI US', impact: 'high', currency: 'USD', dayOfMonth: 12, hour: 12.5 },
  { name: 'FOMC', impact: 'high', currency: 'USD', dayOfMonth: 'fomc-dates', hour: 18 },
  { name: 'BCE', impact: 'high', currency: 'EUR', dayOfMonth: 'ecb-dates', hour: 12.25 },
  // Hebdomadaires
  { name: 'Unemployment Claims', impact: 'medium', currency: 'USD', dayOfWeek: 4, hour: 12.5 }, // Jeudi
  { name: 'Crude Oil Inventories', impact: 'low', currency: 'USD', dayOfWeek: 3, hour: 14.5 }, // Mercredi
];

// FOMC dates 2026 typiques (réunions Fed) — approximatives
const FOMC_DATES_2026 = ['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09'];
const ECB_DATES_2026 = ['2026-01-22', '2026-03-12', '2026-04-30', '2026-06-04', '2026-07-23', '2026-09-10', '2026-10-29', '2026-12-17'];

function firstFridayOfMonth(year, month){
  const d = new Date(Date.UTC(year, month, 1));
  let day = 1;
  while(d.getUTCDay() !== 5){ d.setUTCDate(++day); }
  return d;
}

function getNewsInRange(fromTime, toTime){
  const out = [];
  const fromDate = new Date(fromTime * 1000);
  const toDate = new Date(toTime * 1000);
  const startYear = fromDate.getUTCFullYear();
  const endYear = toDate.getUTCFullYear();
  // Parcours par jour
  const oneDay = 86400 * 1000;
  for(let dms = fromDate.getTime() - oneDay; dms <= toDate.getTime() + oneDay; dms += oneDay){
    const d = new Date(dms);
    const dow = d.getUTCDay();
    const dom = d.getUTCDate();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const dateStr = d.toISOString().slice(0, 10);

    for(const ev of NEWS_EVENTS){
      let match = false;
      if(ev.dayOfWeek === dow) match = true;
      else if(typeof ev.dayOfMonth === 'number' && ev.dayOfMonth === dom) match = true;
      else if(ev.dayOfMonth === 'first-friday'){
        const ff = firstFridayOfMonth(year, month);
        if(ff.getUTCDate() === dom) match = true;
      }
      else if(ev.dayOfMonth === 'fomc-dates' && FOMC_DATES_2026.includes(dateStr)) match = true;
      else if(ev.dayOfMonth === 'ecb-dates' && ECB_DATES_2026.includes(dateStr)) match = true;
      if(match){
        const eventTs = Math.floor(Date.UTC(year, month, dom, Math.floor(ev.hour), (ev.hour % 1) * 60) / 1000);
        if(eventTs >= fromTime && eventTs <= toTime){
          out.push({ ...ev, time: eventTs });
        }
      }
    }
  }
  return out;
}

function drawNewsEvents(ctx, t2x, w, h){
  const vr = state.chart.timeScale().getVisibleRange();
  if(!vr) return;
  const events = getNewsInRange(vr.from, vr.to);
  ctx.font = 'bold 9px Segoe UI, system-ui';
  for(const ev of events){
    const x = t2x(ev.time);
    if(x === null || x < 0 || x > w) continue;
    const color = ev.impact === 'high' ? 'rgba(239,68,68,0.7)' : ev.impact === 'medium' ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.3)';
    const fillColor = ev.impact === 'high' ? 'rgba(239,68,68,0.04)' : ev.impact === 'medium' ? 'rgba(251,191,36,0.03)' : 'rgba(148,163,184,0.02)';
    ctx.fillStyle = fillColor;
    ctx.fillRect(x - 2, 0, 4, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = color.replace('0.7', '1').replace('0.5', '0.95').replace('0.3', '0.7');
    ctx.textBaseline = 'top';
    ctx.save();
    ctx.translate(x + 3, 30);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(ev.name, 0, 0);
    ctx.restore();
  }
}

// ============================================================
// FEATURE #5 — REPLAY MODE
// ============================================================

state.replay = {
  active: false,
  fullCandles: null,
  currentIdx: 0,
  playing: false,
  timer: null,
  speed: 800,
};

function startReplay(){
  if(state.candles.length < 100) return;
  state.replay.active = true;
  state.replay.fullCandles = state.candles.slice();
  // Démarre à 70% des bougies (pour avoir du futur à découvrir)
  state.replay.currentIdx = Math.floor(state.replay.fullCandles.length * 0.7);
  state.replay.playing = false;
  applyReplayCandles();
  document.getElementById('replay-controls').classList.add('active');
  document.getElementById('toggle-replay').classList.add('active');
}

function exitReplay(){
  state.replay.active = false;
  state.replay.playing = false;
  if(state.replay.timer){ clearInterval(state.replay.timer); state.replay.timer = null; }
  if(state.replay.fullCandles){
    state.candles = state.replay.fullCandles;
    state.series.setData(state.candles);
    recomputeAll();
    renderAll();
  }
  state.replay.fullCandles = null;
  document.getElementById('replay-controls').classList.remove('active');
  document.getElementById('toggle-replay').classList.remove('active');
}

function applyReplayCandles(){
  if(!state.replay.active || !state.replay.fullCandles) return;
  const visible = state.replay.fullCandles.slice(0, state.replay.currentIdx + 1);
  state.candles = visible;
  state.series.setData(visible);
  updatePriceDisplay();
  recomputeAll();
  renderAll();
  const info = document.getElementById('replay-info');
  const last = visible[visible.length - 1];
  const date = new Date(last.time * 1000).toISOString().slice(5, 16).replace('T', ' ');
  info.textContent = `${state.replay.currentIdx + 1} / ${state.replay.fullCandles.length} — ${date}`;
}

function replayStep(direction = 1){
  if(!state.replay.active) return;
  const total = state.replay.fullCandles.length;
  state.replay.currentIdx = Math.max(0, Math.min(total - 1, state.replay.currentIdx + direction));
  applyReplayCandles();
}

function replayPlayPause(){
  if(!state.replay.active) return;
  state.replay.playing = !state.replay.playing;
  const btn = document.getElementById('replay-play-pause');
  if(state.replay.playing){
    btn.textContent = '⏸'; btn.classList.add('playing');
    state.replay.timer = setInterval(() => {
      replayStep(1);
      if(state.replay.currentIdx >= state.replay.fullCandles.length - 1){
        replayPlayPause(); // auto-pause à la fin
      }
    }, state.replay.speed);
  } else {
    btn.textContent = '▶'; btn.classList.remove('playing');
    if(state.replay.timer){ clearInterval(state.replay.timer); state.replay.timer = null; }
  }
}

function wireReplay(){
  document.getElementById('toggle-replay').addEventListener('click', () => {
    if(state.replay.active) exitReplay();
    else startReplay();
  });
  document.getElementById('replay-step-back').addEventListener('click', () => replayStep(-1));
  document.getElementById('replay-step').addEventListener('click', () => replayStep(1));
  document.getElementById('replay-play-pause').addEventListener('click', replayPlayPause);
  document.getElementById('replay-exit').addEventListener('click', exitReplay);
  document.getElementById('replay-speed').addEventListener('change', e => {
    state.replay.speed = parseInt(e.target.value, 10);
    if(state.replay.playing){
      replayPlayPause(); // pause
      replayPlayPause(); // replay avec nouvelle vitesse
    }
  });
}

// ============================================================
// FEATURE #12 — GLOSSAIRE ICT
// ============================================================


function renderGlossary(filter = ''){
  const list = document.getElementById('glossary-list');
  const f = filter.toLowerCase().trim();
  list.innerHTML = GLOSSARY.map(g => {
    const matches = !f || g.term.toLowerCase().includes(f) || (g.abbr || '').toLowerCase().includes(f) || g.def.toLowerCase().includes(f);
    return `<div class="glossary-item${matches ? '' : ' hidden'}">
      <div class="glossary-term">${g.term}${g.abbr ? `<span class="glossary-abbr">${g.abbr}</span>` : ''}</div>
      <div class="glossary-def">${g.def}</div>
    </div>`;
  }).join('');
}

function wireGlossary(){
  const modal = document.getElementById('modal-glossary');
  const openGlossary = () => {
    modal.classList.add('open');
    renderGlossary();
    setTimeout(() => document.getElementById('glossary-search').focus(), 100);
  };
  document.getElementById('open-glossary').addEventListener('click', openGlossary);
  // Bouton mobile dans le drawer
  const mobileBtn = document.getElementById('open-glossary-mobile');
  if(mobileBtn) mobileBtn.addEventListener('click', () => {
    document.getElementById('side-panel').classList.remove('open');
    openGlossary();
  });
  document.getElementById('btn-close-glossary').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  document.getElementById('glossary-search').addEventListener('input', e => renderGlossary(e.target.value));
}

// ============================================================
// QUICK WINS (#3 quick log, #7 fvg filter, #8 calc↔rr, #14 validation, #15 undo, #16 log scale)
// ============================================================

state.fvgMinSizePips = parseFloat(localStorage.getItem('fvg_min_size') || '0');
state.lastDeletedTrade = null;
state.toastTimer = null;

function showToast(msg, undoAction = null, duration = 5000){
  const toast = document.getElementById('toast-undo');
  document.getElementById('toast-msg').textContent = msg;
  const btn = document.getElementById('toast-undo-btn');
  if(undoAction){
    btn.style.display = 'inline-block';
    btn.onclick = () => { undoAction(); hideToast(); };
  } else {
    btn.style.display = 'none';
  }
  toast.classList.add('visible');
  if(state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(hideToast, duration);
}
function hideToast(){ document.getElementById('toast-undo').classList.remove('visible'); }

function wireQuickWins(){
  // Quick log R/R → journal (#3)
  document.getElementById('rr-quick-log').addEventListener('click', () => {
    const e = parseFloat(document.getElementById('rr-entry').value);
    const s = parseFloat(document.getElementById('rr-sl').value);
    const t = parseFloat(document.getElementById('rr-tp').value);
    if(isNaN(e) || isNaN(s) || isNaN(t)){ showToast('⚠ Remplis entry/SL/TP avant de logger'); return; }
    document.getElementById('open-journal').click();
    setTimeout(() => {
      document.getElementById('jr-entry').value = e.toFixed(5);
      document.getElementById('jr-sl').value = s.toFixed(5);
      document.getElementById('jr-tp').value = t.toFixed(5);
      // Auto-détecte le sens : si TP > entry → long, sinon short
      const isLong = t > e;
      document.getElementById('jr-side-' + (isLong ? 'long' : 'short')).checked = true;
      document.querySelectorAll('#jr-side-group label').forEach(l => l.classList.remove('selected'));
      document.querySelector(`label[for="jr-side-${isLong ? 'long' : 'short'}"]`).classList.add('selected');
    }, 100);
  });

  // R/R → Position size calc (#8)
  document.getElementById('rr-to-calc').addEventListener('click', () => {
    const e = parseFloat(document.getElementById('rr-entry').value);
    const s = parseFloat(document.getElementById('rr-sl').value);
    if(isNaN(e) || isNaN(s)){ showToast('⚠ Remplis entry/SL avant'); return; }
    document.getElementById('open-position-size').click();
    setTimeout(() => {
      document.getElementById('ps-entry').value = e.toFixed(5);
      document.getElementById('ps-sl').value = s.toFixed(5);
      if(document.getElementById('ps-capital').value && document.getElementById('ps-risk').value){
        calcPositionSize();
      }
    }, 100);
  });

  // FVG min size filter (#7)
  const fvgInput = document.getElementById('setting-fvg-min-size');
  fvgInput.value = state.fvgMinSizePips;
  fvgInput.addEventListener('change', e => {
    state.fvgMinSizePips = Math.max(0, parseFloat(e.target.value) || 0);
    localStorage.setItem('fvg_min_size', state.fvgMinSizePips);
    recomputeAll();
    renderAll();
  });

  // Log scale (#16)
  const logToggle = document.getElementById('setting-log-scale');
  logToggle.checked = localStorage.getItem('log_scale') === 'true';
  if(logToggle.checked){
    state.chart.applyOptions({
      rightPriceScale: { mode: LightweightCharts.PriceScaleMode.Logarithmic },
    });
  }
  logToggle.addEventListener('change', e => {
    const log = e.target.checked;
    localStorage.setItem('log_scale', log);
    state.chart.applyOptions({
      rightPriceScale: { mode: log ? LightweightCharts.PriceScaleMode.Logarithmic : LightweightCharts.PriceScaleMode.Normal },
    });
  });

  // (Undo journal intégré directement dans deleteTrade, plus de wrapper)

  // Mock mode setting
  const mockMode = document.getElementById('mock-mode');
  mockMode.value = localStorage.getItem('mock_mode') || 'realistic';
  mockMode.addEventListener('change', e => localStorage.setItem('mock_mode', e.target.value));

  // Paper spread setting
  const spreadInput = document.getElementById('setting-paper-spread');
  spreadInput.value = state.paper.spreadPips;
  spreadInput.addEventListener('change', e => {
    state.paper.spreadPips = Math.max(0, parseFloat(e.target.value) || 0);
    localStorage.setItem('paper_spread', state.paper.spreadPips);
  });

  // Polling interval setting
  const pollInput = document.getElementById('setting-poll-interval');
  pollInput.value = state.pollIntervalMs;
  pollInput.addEventListener('change', e => {
    state.pollIntervalMs = parseInt(e.target.value, 10);
    localStorage.setItem('poll_interval_ms', state.pollIntervalMs);
    if(state.liveMode){
      startLivePolling(); // hot reload
      showToast(`🔄 Polling : ${state.pollIntervalMs/1000}s`);
    }
  });
}

// (regenerateData intégré directement, plus de wrappers)

// ============================================================
// Générateur M1 réaliste pour scalping (cycles AMD plus courts)
// ============================================================

// Patch detectFVG to respect fvgMinSizePips (#7)
const _origDetectFVG = detectFVG;
detectFVG = function(candles){
  const all = _origDetectFVG(candles);
  if(!state.fvgMinSizePips || state.fvgMinSizePips <= 0) return all;
  return all.filter(f => (f.top - f.bottom) / PIP >= state.fvgMinSizePips);
};

// Patch drawCanvasOverlays to also draw news + rebuild hoverable zones
const _origDrawCanvasOverlays = drawCanvasOverlays;
drawCanvasOverlays = function(){
  _origDrawCanvasOverlays();
  if(state.indicators.news && state.chart && state.series){
    const ctx = state.overlayCtx;
    const w = parseFloat(state.overlayCanvas.style.width) || state.overlayCanvas.clientWidth;
    const h = parseFloat(state.overlayCanvas.style.height) || state.overlayCanvas.clientHeight;
    const t2x = t => state.chart.timeScale().timeToCoordinate(t);
    drawNewsEvents(ctx, t2x, w, h);
  }
  rebuildHoverableZones();
};

// ============================================================
// LAZY COMPUTE CACHE (#13)
// ============================================================
const _computeCache = new Map();

function candlesHash(){
  if(state.candles.length === 0) return '0';
  const first = state.candles[0];
  const last = state.candles[state.candles.length - 1];
  return `${state.currentTf}-${state.candles.length}-${first.time}-${last.time}-${last.close.toFixed(5)}-${state.fvgMinSizePips}-${state.indicators.multitf}`;
}

const _origRecomputeAll = recomputeAll;
recomputeAll = function(){
  const hash = candlesHash();
  if(_computeCache.has(hash)){
    const cached = _computeCache.get(hash);
    state.computed = JSON.parse(JSON.stringify(cached));
    return;
  }
  _origRecomputeAll();
  // Limit cache size
  if(_computeCache.size > 12){
    const firstKey = _computeCache.keys().next().value;
    _computeCache.delete(firstKey);
  }
  _computeCache.set(hash, JSON.parse(JSON.stringify(state.computed)));
};

// (Cache cleared dans regenerateData directement)

// ============================================================
// VALIDATION INPUTS (#14)
// ============================================================
const _origAddTrade = addTrade;
addTrade = function(){
  const result = parseFloat(document.getElementById('jr-result').value);
  if(isNaN(result)){ showToast('⚠ Résultat (R) requis'); return; }
  if(Math.abs(result) > 100){ showToast('⚠ R suspect (>100). Vérifie ta saisie.'); return; }
  _origAddTrade();
};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  wireTimeframePills();
  wireSectionToggles();
  wireSettingsModal();
  wireDrawerToggle();
  wireIndicatorToggles();
  wirePositionSize();
  wireRR();
  wireJournal();
  wireBacktest();
  wireApiKey();
  wireAlerts();
  wireCourses();
  wirePresets();
  wirePwaInstall();
  registerServiceWorker();
  wireGlossary();
  wireReplay();
  wireQuickWins();
  wirePaperTrading();
  wireOnboarding();
  wireAnnotations();
  wireGistSync();
  wireMobileBottomNav();
  setupZoneHover();
  // Auto-pull au boot si Gist connecté et auto-sync activé (background, non-bloquant)
  if(state.gistToken && state.gistId && state.gistAutoSync){
    setTimeout(() => autoPullIfNewer(), 1500);
  }
  injectHelpIcons();
  loadPrefs();       // applique state + DOM avant que regenerateData ne render
  regenerateData(); // utilise state.currentTf + state.indicators restaurés
  autoSavePrefs();
  state.quota = loadQuota();
  updateStatusBadge();
  document.getElementById('close-pdarrays').addEventListener('click', () => {
    state.indicators.pdarrays = false;
    document.querySelector('input[data-ind="pdarrays"]').checked = false;
    renderPDArraysPanel();
    savePrefs();
  });
});
