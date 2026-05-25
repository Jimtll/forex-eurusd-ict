// ============================================================
// CHART — Lightweight Charts init + render OHLC + price display
// ============================================================
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

