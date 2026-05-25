// ============================================================
// ICT DETECTION + RENDERING
// Généré par extraction depuis index.html (refonte modulaire)
// ============================================================

// ============================================================
// ICT DETECTION — fonctions pures sur state.candles
// ============================================================

const SWING_N = 2; // fractal : 2 bougies de chaque côté

function detectSwings(candles, n = SWING_N){
  const swings = [];
  for(let i = n; i < candles.length - n; i++){
    let isHigh = true, isLow = true;
    for(let j = 1; j <= n; j++){
      if(candles[i].high <= candles[i-j].high || candles[i].high <= candles[i+j].high) isHigh = false;
      if(candles[i].low >= candles[i-j].low || candles[i].low >= candles[i+j].low) isLow = false;
    }
    if(isHigh) swings.push({ type: 'high', idx: i, time: candles[i].time, price: candles[i].high });
    if(isLow) swings.push({ type: 'low', idx: i, time: candles[i].time, price: candles[i].low });
  }
  return swings;
}

function detectStructure(candles, swings){
  // Pour chaque bougie, maintient liste des swings actifs (non encore cassés).
  // À la close d'une bougie, si elle dépasse un swing actif → BOS (sens trend) ou MSS (contre trend).
  const sorted = [...swings].sort((a, b) => a.idx - b.idx);
  const events = [];
  const active = []; // swings non encore consommés
  let trend = null;
  let nextSwing = 0;

  for(let i = 0; i < candles.length; i++){
    // Active tous les swings dont idx <= i
    while(nextSwing < sorted.length && sorted[nextSwing].idx <= i){
      active.push(sorted[nextSwing]);
      nextSwing++;
    }
    const c = candles[i];

    for(let k = active.length - 1; k >= 0; k--){
      const sw = active[k];
      if(sw.idx === i) continue;

      if(sw.type === 'high' && c.close > sw.price){
        const type = trend === 'up' ? 'BOS' : 'MSS';
        events.push({
          type, dir: 'up',
          breakIdx: i, breakTime: c.time, breakPrice: c.close,
          swingIdx: sw.idx, swingTime: sw.time, swingPrice: sw.price,
        });
        trend = 'up';
        active.splice(k, 1);
      } else if(sw.type === 'low' && c.close < sw.price){
        const type = trend === 'down' ? 'BOS' : 'MSS';
        events.push({
          type, dir: 'down',
          breakIdx: i, breakTime: c.time, breakPrice: c.close,
          swingIdx: sw.idx, swingTime: sw.time, swingPrice: sw.price,
        });
        trend = 'down';
        active.splice(k, 1);
      }
    }
  }

  return { trend, events };
}

function detectLiquidity(candles, swings){
  // BSL = swings highs, SSL = swings lows. Marqués "swept" si dépassés ensuite.
  // Sweep = wick au-delà + close en deçà (manipulation de liquidité).
  const bsl = [], ssl = [], sweeps = [];
  for(const sw of swings){
    if(sw.type === 'high'){
      let sweptAt = null;
      for(let i = sw.idx + 1; i < candles.length; i++){
        if(candles[i].high > sw.price){
          sweptAt = { idx: i, time: candles[i].time };
          if(candles[i].close < sw.price){
            sweeps.push({ idx: i, time: candles[i].time, level: sw.price, dir: 'up' });
          }
          break;
        }
      }
      bsl.push({ ...sw, swept: !!sweptAt, sweptAt });
    } else {
      let sweptAt = null;
      for(let i = sw.idx + 1; i < candles.length; i++){
        if(candles[i].low < sw.price){
          sweptAt = { idx: i, time: candles[i].time };
          if(candles[i].close > sw.price){
            sweeps.push({ idx: i, time: candles[i].time, level: sw.price, dir: 'down' });
          }
          break;
        }
      }
      ssl.push({ ...sw, swept: !!sweptAt, sweptAt });
    }
  }
  return { bsl, ssl, sweeps };
}

function detectOrderBlocks(candles, structure, sweeps = []){
  // ICT — un VRAI Order Block est précédé d'une prise de liquidité (sweep).
  // OB bullish (bougie bearish avant move up qui casse structure) doit être précédé
  //   d'un SSL sweep (wick sous un swing low + close au-dessus) = SSL pris.
  // OB bearish doit être précédé d'un BSL sweep.
  const obs = [];
  for(const ev of structure.events){
    if(ev.type !== 'BOS') continue;
    const isBullish = ev.dir === 'up';
    const start = Math.max(0, ev.breakIdx - 30);
    for(let i = ev.breakIdx - 1; i >= start; i--){
      const c = candles[i];
      const bearishCandle = c.close < c.open;
      const bullishCandle = c.close > c.open;
      if(isBullish && bearishCandle){
        // Cherche un SSL sweep dans une fenêtre [ob-3, ob+5] (avant ou pendant le move)
        const requiredDir = 'down';
        const hasSweep = sweeps.some(sw =>
          sw.dir === requiredDir && sw.idx >= i - 3 && sw.idx <= i + 5
        );
        if(!hasSweep) break; // pas de prise de liquidité → pas un VRAI OB ICT
        obs.push({
          type: 'bullish', idx: i, time: c.time,
          top: Math.max(c.open, c.close), bottom: c.low,
          mitigated: false,
        });
        break;
      }
      if(!isBullish && bullishCandle){
        const requiredDir = 'up';
        const hasSweep = sweeps.some(sw =>
          sw.dir === requiredDir && sw.idx >= i - 3 && sw.idx <= i + 5
        );
        if(!hasSweep) break;
        obs.push({
          type: 'bearish', idx: i, time: c.time,
          top: c.high, bottom: Math.min(c.open, c.close),
          mitigated: false,
        });
        break;
      }
    }
  }
  // Calcule mitigation : prix s'éloigne, PUIS retouche la zone
  for(const ob of obs){
    let departed = false;
    for(let i = ob.idx + 1; i < candles.length; i++){
      const c = candles[i];
      if(ob.type === 'bullish'){
        if(!departed){ if(c.low > ob.top) departed = true; }
        else if(c.low <= ob.top){
          ob.mitigated = true;
          ob.mitigatedTime = c.time;
          break;
        }
      } else {
        if(!departed){ if(c.high < ob.bottom) departed = true; }
        else if(c.high >= ob.bottom){
          ob.mitigated = true;
          ob.mitigatedTime = c.time;
          break;
        }
      }
    }
  }
  return obs;
}

function detectFVG(candles){
  // Filtre intégré : ignore les FVG < state.fvgMinSizePips (était un wrapper externe)
  const minSize = ((state && state.fvgMinSizePips) || 0) * PIP;
  const fvgs = [];
  for(let i = 1; i < candles.length - 1; i++){
    if(candles[i+1].low > candles[i-1].high){
      const gap = candles[i+1].low - candles[i-1].high;
      if(gap < minSize) continue;
      fvgs.push({
        type: 'bullish', idx: i, time: candles[i].time,
        top: candles[i+1].low, bottom: candles[i-1].high,
        mitigated: false,
      });
    }
    if(candles[i+1].high < candles[i-1].low){
      const gap = candles[i-1].low - candles[i+1].high;
      if(gap < minSize) continue;
      fvgs.push({
        type: 'bearish', idx: i, time: candles[i].time,
        top: candles[i-1].low, bottom: candles[i+1].high,
        mitigated: false,
      });
    }
  }
  for(const fvg of fvgs){
    for(let i = fvg.idx + 2; i < candles.length; i++){
      const c = candles[i];
      if(fvg.type === 'bullish' && c.low <= fvg.top){
        fvg.mitigated = true;
        fvg.mitigatedTime = c.time;
        break;
      }
      if(fvg.type === 'bearish' && c.high >= fvg.bottom){
        fvg.mitigated = true;
        fvg.mitigatedTime = c.time;
        break;
      }
    }
  }
  return fvgs;
}

function detectPremiumDiscount(swings){
  if(swings.length < 2) return null;
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');
  if(highs.length === 0 || lows.length === 0) return null;
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  return {
    rangeHigh: lastHigh.price,
    rangeLow: lastLow.price,
    equilibrium: (lastHigh.price + lastLow.price) / 2,
  };
}

const KILLZONES = [
  { name: 'Asia',   startH: 20, endH: 24, color: 'rgba(168,139,250,0.07)', label: 'rgba(168,139,250,0.55)' },
  { name: 'London', startH: 7,  endH: 10, color: 'rgba(59,130,246,0.10)',  label: 'rgba(59,130,246,0.65)' },
  { name: 'NY',     startH: 12, endH: 15, color: 'rgba(249,115,22,0.10)',  label: 'rgba(249,115,22,0.65)' },
];

function getKillzonesInRange(fromTime, toTime){
  const out = [];
  const oneDay = 86400;
  const startDay = Math.floor(fromTime / oneDay) * oneDay - oneDay;
  for(let day = startDay; day <= toTime + oneDay; day += oneDay){
    for(const z of KILLZONES){
      const start = day + z.startH * 3600;
      const end = day + z.endH * 3600;
      if(end >= fromTime && start <= toTime){
        out.push({ name: z.name, color: z.color, label: z.label, start, end });
      }
    }
  }
  return out;
}

// ============================================================
// ICT AVANCÉS — OTE, AMD, PD Arrays, IRL→ERL
// (Breaker Block + Inverted FVG retirés en v1.0.5 — peu de valeur ajoutée)
// ============================================================

function detectOTE(swings){
  if(swings.length < 2) return null;
  const sorted = [...swings].sort((a, b) => a.idx - b.idx);
  const last = sorted[sorted.length - 1];
  let prev = null;
  for(let i = sorted.length - 2; i >= 0; i--){
    if(sorted[i].type !== last.type){ prev = sorted[i]; break; }
  }
  if(!prev) return null;
  const isBullishLeg = last.type === 'high';
  const low = isBullishLeg ? prev.price : last.price;
  const high = isBullishLeg ? last.price : prev.price;
  const range = high - low;
  if(range <= 0) return null;
  return {
    legStart: Math.min(prev.time, last.time),
    legEnd: Math.max(prev.time, last.time),
    direction: isBullishLeg ? 'up' : 'down',
    fib62: isBullishLeg ? high - range * 0.62 : low + range * 0.62,
    fib70: isBullishLeg ? high - range * 0.705 : low + range * 0.705,
    fib79: isBullishLeg ? high - range * 0.79 : low + range * 0.79,
    high, low,
  };
}

// ============================================================
// SCORE QUALITÉ — confluences ICT pour OB/FVG
// ============================================================

function isInKillzoneTime(time){
  const date = new Date(time * 1000);
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  return (h >= 7 && h < 10) || (h >= 12 && h < 15);
}

function inFavorablePD(zone, pd){
  if(!pd) return false;
  if(zone.type === 'bullish') return (zone.top + zone.bottom) / 2 < pd.equilibrium;
  return (zone.top + zone.bottom) / 2 > pd.equilibrium;
}

function inOteZone(zone, ote){
  if(!ote) return false;
  const mid = (zone.top + zone.bottom) / 2;
  const lo = Math.min(ote.fib62, ote.fib79);
  const hi = Math.max(ote.fib62, ote.fib79);
  return mid >= lo && mid <= hi
    && ((zone.type === 'bullish' && ote.direction === 'up') || (zone.type === 'bearish' && ote.direction === 'down'));
}

function obContainsFvgInImpulse(ob, fvgs, structureEvents){
  // Trouve l'event BOS qui a créé cet OB (le premier après ob.idx avec dir correspondante)
  const ev = structureEvents.find(e =>
    e.type === 'BOS' && e.breakIdx > ob.idx &&
    ((ob.type === 'bullish' && e.dir === 'up') || (ob.type === 'bearish' && e.dir === 'down'))
  );
  if(!ev) return false;
  return fvgs.some(f =>
    f.idx > ob.idx && f.idx <= ev.breakIdx &&
    ((ob.type === 'bullish' && f.type === 'bullish') || (ob.type === 'bearish' && f.type === 'bearish'))
  );
}

function zoneOverlapsHtf(zone, htfZones){
  // overlap = chevauchement vertical > 30%
  for(const htf of htfZones){
    const overlapTop = Math.min(zone.top, htf.top);
    const overlapBottom = Math.max(zone.bottom, htf.bottom);
    if(overlapTop > overlapBottom){
      const overlap = overlapTop - overlapBottom;
      const zoneHeight = zone.top - zone.bottom;
      if(overlap / zoneHeight > 0.3) return true;
    }
  }
  return false;
}

function computeScore(zone, kind, ctx){
  // ctx = { pd, ote, fvgs, structureEvents, htfZones }
  const details = {};
  details.killzone = isInKillzoneTime(zone.time);
  details.favorablePD = inFavorablePD(zone, ctx.pd);
  details.ote = inOteZone(zone, ctx.ote);
  details.htf = ctx.htfZones ? zoneOverlapsHtf(zone, ctx.htfZones) : false;
  if(kind === 'OB'){
    details.fvgInImpulse = obContainsFvgInImpulse(zone, ctx.fvgs, ctx.structureEvents);
  }
  const score = Object.values(details).filter(Boolean).length;
  return { score, details };
}

function annotateZones(zones, kind, ctx){
  for(const z of zones){
    const s = computeScore(z, kind, ctx);
    z.score = s.score;
    z.scoreDetails = s.details;
  }
}

// ============================================================
// MULTI-TF — Calcul des zones sur les TF supérieurs
// ============================================================
const HTF_FOR = { M15: ['H1', 'H4'], H1: ['H4', 'D1'], H4: ['D1'], D1: [] };

function computeHtfZones(){
  // Retourne toutes les zones (OB+FVG non mitigées) des TF supérieurs au TF courant
  const htfs = HTF_FOR[state.currentTf] || [];
  const all = [];
  for(const tf of htfs){
    const tfCandles = aggregate(state.m15, TF_SECONDS[tf]);
    if(tfCandles.length < 10) continue;
    const swings = detectSwings(tfCandles);
    const structure = detectStructure(tfCandles, swings);
    const obs = detectOrderBlocks(tfCandles, structure).filter(o => !o.mitigated);
    const fvgs = detectFVG(tfCandles).filter(f => !f.mitigated);
    all.push(...obs.map(o => ({ ...o, tf })), ...fvgs.map(f => ({ ...f, tf })));
  }
  return all;
}

// Cache LRU des résultats de recomputeAll (était un wrapper externe)
const _computeCache = new Map();
function _candlesHash(){
  if(state.candles.length === 0) return '0';
  const first = state.candles[0];
  const last = state.candles[state.candles.length - 1];
  return `${state.currentTf}-${state.candles.length}-${first.time}-${last.time}-${last.close.toFixed(5)}-${state.fvgMinSizePips || 0}-${state.indicators.multitf}`;
}

function _recomputeRaw(){
  state.computed.swings = detectSwings(state.candles);
  state.computed.structure = detectStructure(state.candles, state.computed.swings);
  state.computed.liquidity = detectLiquidity(state.candles, state.computed.swings);
  // OB nécessite les sweeps déjà calculés (prise de liquidité = condition ICT)
  state.computed.orderBlocks = detectOrderBlocks(state.candles, state.computed.structure, state.computed.liquidity.sweeps);
  state.computed.fvgs = detectFVG(state.candles);
  state.computed.pd = detectPremiumDiscount(state.computed.swings);
  state.computed.ote = detectOTE(state.computed.swings);
  // Multi-TF (en mode mock uniquement — le live API ne fournit pas la base M15 pour aggréger)
  state.computed.htfZones = (!state.liveMode && state.indicators.multitf) ? computeHtfZones() : [];
  // Annotate scores
  const ctx = {
    pd: state.computed.pd,
    ote: state.computed.ote,
    fvgs: state.computed.fvgs,
    structureEvents: state.computed.structure.events,
    htfZones: state.indicators.multitf ? state.computed.htfZones : null,
  };
  annotateZones(state.computed.orderBlocks, 'OB', ctx);
  annotateZones(state.computed.fvgs, 'FVG', ctx);
}

function recomputeAll(){
  if(state.candles.length === 0) return;
  const hash = _candlesHash();
  if(_computeCache.has(hash)){
    state.computed = JSON.parse(JSON.stringify(_computeCache.get(hash)));
    return;
  }
  _recomputeRaw();
  // Limite LRU : 12 entrées max
  if(_computeCache.size > 12){
    _computeCache.delete(_computeCache.keys().next().value);
  }
  _computeCache.set(hash, JSON.parse(JSON.stringify(state.computed)));
}

function clearComputeCache(){ _computeCache.clear(); }

// ============================================================
// ICT RENDERING — Lightweight Charts natifs + canvas overlay
// ============================================================

function clearPriceLines(kind){
  state.priceLines = state.priceLines.filter(p => {
    if(p.kind === kind){ state.series.removePriceLine(p.line); return false; }
    return true;
  });
}

function renderSwings(){
  if(!state.indicators.swings){
    state.series.setMarkers([]);
    return;
  }
  // v1.0.5 — Limite à 40 derniers swings (au lieu de 80) pour rester lisible
  const last = state.computed.swings.slice(-40);
  const markers = last.map(s => ({
    time: s.time,
    position: s.type === 'high' ? 'aboveBar' : 'belowBar',
    color: s.type === 'high' ? '#94a3b8' : '#94a3b8',
    shape: s.type === 'high' ? 'arrowDown' : 'arrowUp',
    size: 0.7,
  })).sort((a, b) => a.time - b.time);
  state.series.setMarkers(markers);
}

function renderLiquidity(){
  // v1.0.5 — Lignes de liquidité dessinées en canvas (drawLiquidityLines) au lieu
  // de createPriceLine() qui s'étendait sur toute la largeur. Ici on nettoie juste.
  clearPriceLines('liquidity');
}

function renderPremiumDiscount(){
  clearPriceLines('pd');
  if(!state.indicators.pd || !state.computed.pd) return;
  const { rangeHigh, rangeLow, equilibrium } = state.computed.pd;
  const lines = [
    { price: rangeHigh, color: '#3b82f6', title: 'Range High', style: LightweightCharts.LineStyle.Solid },
    { price: equilibrium, color: '#94a3b8', title: 'Equilibrium 50%', style: LightweightCharts.LineStyle.Dotted },
    { price: rangeLow, color: '#ef4444', title: 'Range Low', style: LightweightCharts.LineStyle.Solid },
  ];
  for(const l of lines){
    const line = state.series.createPriceLine({
      price: l.price, color: l.color, lineWidth: 1,
      lineStyle: l.style, axisLabelVisible: true, title: l.title,
    });
    state.priceLines.push({ kind: 'pd', line });
  }
}

function setupOverlayCanvas(){
  const canvas = document.getElementById('overlay-canvas');
  const ctx = canvas.getContext('2d');
  state.overlayCanvas = canvas;
  state.overlayCtx = ctx;
  sizeOverlay();
}

function sizeOverlay(){
  const canvas = state.overlayCanvas;
  if(!canvas) return;
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = state.overlayCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function drawCanvasOverlays(){
  if(!state.overlayCtx || !state.chart || !state.series) return;
  const ctx = state.overlayCtx;
  const canvas = state.overlayCanvas;
  const w = parseFloat(canvas.style.width) || canvas.clientWidth;
  const h = parseFloat(canvas.style.height) || canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  const timeScale = state.chart.timeScale();
  const vr = timeScale.getVisibleRange();
  if(!vr) return;

  const t2x = t => timeScale.timeToCoordinate(t);
  const p2y = p => state.series.priceToCoordinate(p);

  if(state.indicators.amd)       drawAMD(ctx, t2x, p2y, w, h, vr);
  if(state.indicators.kz)        drawKillzones(ctx, t2x, p2y, w, h, vr);
  if(state.indicators.fvg)       drawFVGs(ctx, t2x, p2y, w, h);
  if(state.indicators.ob)        drawOrderBlocks(ctx, t2x, p2y, w, h);
  if(state.indicators.ote)       drawOTE(ctx, t2x, p2y, w, h);
  if(state.indicators.bos)       drawBosMss(ctx, t2x, p2y, w, h);
  if(state.indicators.liquidity){ drawSweeps(ctx, t2x, p2y, w, h); drawLiquidityLines(ctx, t2x, p2y, w, h); }
  if(state.indicators.irlerl)    drawIRLERL(ctx, t2x, p2y, w, h);
  // News events overlay (était un wrapper externe)
  if(state.indicators.news && typeof drawNewsEvents === 'function') drawNewsEvents(ctx, t2x, w, h);
  // Annotations utilisateur (toujours dessinées)
  if(state.annotations && typeof drawAnnotations === 'function') drawAnnotations(ctx, t2x, p2y, w, h);
  // Rebuild zones hoverable (pour tooltip)
  if(typeof rebuildHoverableZones === 'function') rebuildHoverableZones();
  // RR handles suivent le pan/zoom
  if(state.rrTrade && state.rrTrade.active && typeof updateRRHandlesPosition === 'function') updateRRHandlesPosition();
}

function drawAMD(ctx, t2x, p2y, w, h, vr){
  const oneDay = 86400;
  const startDay = Math.floor(vr.from / oneDay) * oneDay - oneDay;
  const phases = [
    { label: 'A', startH: 0,  endH: 7,  color: 'rgba(168,139,250,0.06)', lc: 'rgba(168,139,250,0.85)' },
    { label: 'M', startH: 7,  endH: 12, color: 'rgba(251,191,36,0.07)',  lc: 'rgba(251,191,36,0.95)' },
    { label: 'D', startH: 12, endH: 22, color: 'rgba(16,185,129,0.05)',  lc: 'rgba(16,185,129,0.85)' },
  ];
  ctx.font = 'bold 11px Segoe UI, system-ui';
  ctx.textBaseline = 'bottom';
  for(let day = startDay; day <= vr.to + oneDay; day += oneDay){
    for(const p of phases){
      const start = day + p.startH * 3600;
      const end = day + p.endH * 3600;
      if(end < vr.from || start > vr.to) continue;
      const x1raw = t2x(Math.max(start, vr.from));
      const x2raw = t2x(Math.min(end, vr.to));
      if(x1raw === null || x2raw === null) continue;
      const x1 = Math.max(0, x1raw), x2 = Math.min(w, x2raw);
      if(x2 - x1 <= 2) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(x1, 0, x2 - x1, h);
      if(x2 - x1 > 22){
        ctx.fillStyle = p.lc;
        ctx.fillText(p.label, x1 + (x2 - x1) / 2 - 3, h - 6);
      }
    }
  }
}

function drawOTE(ctx, t2x, p2y, w, h){
  const ote = state.computed.ote;
  if(!ote) return;
  const xs = t2x(ote.legStart), xe = t2x(ote.legEnd);
  const yFib62 = p2y(ote.fib62), yFib79 = p2y(ote.fib79), yFib70 = p2y(ote.fib70);
  if(yFib62 === null || yFib79 === null) return;
  const xStart = (xs !== null) ? Math.max(0, xs) : 0;
  // Zone OTE entre fib 62 et fib 79 — étendue jusqu'à la droite
  ctx.fillStyle = ote.direction === 'up' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)';
  ctx.fillRect(xStart, Math.min(yFib62, yFib79), w - xStart, Math.abs(yFib79 - yFib62));
  ctx.strokeStyle = ote.direction === 'up' ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 3]);
  ctx.beginPath(); ctx.moveTo(xStart, yFib62); ctx.lineTo(w, yFib62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xStart, yFib79); ctx.lineTo(w, yFib79); ctx.stroke();
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(xStart, yFib70); ctx.lineTo(w, yFib70); ctx.stroke();
  ctx.setLineDash([]);
  // Labels
  ctx.font = 'bold 9px Segoe UI, system-ui';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ote.direction === 'up' ? '#10b981' : '#ef4444';
  ctx.fillText('OTE 62%', xStart + 4, yFib62);
  ctx.fillText('OTE 70.5%', xStart + 4, yFib70);
  ctx.fillText('OTE 79%', xStart + 4, yFib79);
}

function drawIRLERL(ctx, t2x, p2y, w, h){
  if(!state.computed.pd) return;
  const { rangeHigh, rangeLow } = state.computed.pd;
  // Trouve le plus récent array interne non-mitigé
  const internal = [
    ...state.computed.fvgs.filter(f => !f.mitigated && f.top <= rangeHigh && f.bottom >= rangeLow).map(f => ({ ...f, kind: 'FVG' })),
    ...state.computed.orderBlocks.filter(o => !o.mitigated && o.top <= rangeHigh && o.bottom >= rangeLow).map(o => ({ ...o, kind: 'OB' })),
  ].sort((a, b) => b.time - a.time);
  if(internal.length === 0) return;
  const irl = internal[0];
  const target = irl.type === 'bullish' ? rangeHigh : rangeLow;
  const x1 = t2x(irl.time);
  const y1 = p2y((irl.top + irl.bottom) / 2);
  const y2 = p2y(target);
  if(x1 === null || y1 === null || y2 === null) return;
  ctx.strokeStyle = '#a78bfa';
  ctx.fillStyle = '#a78bfa';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(x1 + 6, y1);
  ctx.lineTo(x1 + 80, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Tête de flèche
  const angle = Math.atan2(y2 - y1, 74);
  const arrowSize = 7;
  ctx.beginPath();
  ctx.moveTo(x1 + 80, y2);
  ctx.lineTo(x1 + 80 - arrowSize * Math.cos(angle - Math.PI/6), y2 - arrowSize * Math.sin(angle - Math.PI/6));
  ctx.lineTo(x1 + 80 - arrowSize * Math.cos(angle + Math.PI/6), y2 - arrowSize * Math.sin(angle + Math.PI/6));
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 10px Segoe UI';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRL→ERL', x1 + 86, y2);
}

function renderPDArraysPanel(){
  const panel = document.getElementById('pd-arrays-panel');
  if(!state.indicators.pdarrays){ panel.classList.remove('open'); return; }
  panel.classList.add('open');
  const list = document.getElementById('pd-arrays-list');
  const eq = state.computed.pd ? state.computed.pd.equilibrium : null;
  if(!eq){ list.innerHTML = '<div style="padding:14px;font-size:0.78rem;color:var(--muted)">Active Premium/Discount pour voir la classification.</div>'; return; }
  const arrays = [];
  for(const ob of state.computed.orderBlocks.filter(o => !o.mitigated)) arrays.push({ kind: 'OB ' + (ob.type === 'bullish' ? '▲' : '▼'), price: (ob.top + ob.bottom) / 2 });
  for(const fvg of state.computed.fvgs.filter(f => !f.mitigated)) arrays.push({ kind: 'FVG ' + (fvg.type === 'bullish' ? '▲' : '▼'), price: (fvg.top + fvg.bottom) / 2 });
  const premium = arrays.filter(a => a.price > eq).sort((a, b) => b.price - a.price);
  const discount = arrays.filter(a => a.price <= eq).sort((a, b) => b.price - a.price);
  const renderItems = items => items.length === 0
    ? '<div style="font-size:0.7rem;color:var(--muted);padding:4px 8px">aucun array</div>'
    : items.map(a => `<div class="pd-array-item"><span class="kind">${a.kind}</span><span class="price">${a.price.toFixed(5)}</span></div>`).join('');
  list.innerHTML =
    `<div class="pd-section"><div class="pd-section-label premium">⬆ Premium (vente)</div>${renderItems(premium)}</div>` +
    `<div class="pd-section"><div class="pd-section-label discount">⬇ Discount (achat)</div>${renderItems(discount)}</div>`;
}

function drawKillzones(ctx, t2x, p2y, w, h, vr){
  const zones = getKillzonesInRange(vr.from, vr.to);
  ctx.font = 'bold 9px Segoe UI, system-ui';
  ctx.textBaseline = 'top';
  for(const z of zones){
    const x1 = t2x(z.start);
    const x2 = t2x(z.end);
    const x = x1 !== null ? Math.max(0, x1) : (z.start < vr.from ? 0 : null);
    const xEnd = x2 !== null ? Math.min(w, x2) : (z.end > vr.to ? w : null);
    if(x === null || xEnd === null || xEnd <= x) continue;
    ctx.fillStyle = z.color;
    ctx.fillRect(x, 0, xEnd - x, h);
    ctx.fillStyle = z.label;
    ctx.fillText(z.name, x + 4, 4);
  }
}

// Score → style modulator (fillAlpha, strokeAlpha multipliers)
function scoreStyle(score, maxScore){
  const ratio = maxScore > 0 ? score / maxScore : 0;
  // ratio 0   : 0.3x (très transparent)
  // ratio 0.5 : 1.0x (normal)
  // ratio 1.0 : 1.4x (boost) + glow
  if(ratio >= 0.8) return { mult: 1.4, glow: true,  badgeBg: 'rgba(16,185,129,0.95)', badgeFg: '#0f1117' };
  if(ratio >= 0.6) return { mult: 1.15, glow: false, badgeBg: 'rgba(16,185,129,0.7)',  badgeFg: '#0f1117' };
  if(ratio >= 0.4) return { mult: 0.85, glow: false, badgeBg: 'rgba(148,163,184,0.6)', badgeFg: '#0f1117' };
  if(ratio >= 0.2) return { mult: 0.55, glow: false, badgeBg: 'rgba(148,163,184,0.4)', badgeFg: '#0f1117' };
  return                  { mult: 0.35, glow: false, badgeBg: 'rgba(148,163,184,0.25)', badgeFg: '#475569' };
}

function drawScoreBadge(ctx, x, y, score, maxScore, hasHtf){
  const style = scoreStyle(score, maxScore);
  // Badge "N/5" en haut-droit
  const text = score + '/' + maxScore;
  ctx.font = 'bold 9px Segoe UI, system-ui';
  const m = ctx.measureText(text);
  const padX = 4, padY = 2;
  const bw = m.width + padX * 2, bh = 11 + padY * 2;
  // background
  ctx.fillStyle = style.badgeBg;
  ctx.beginPath();
  ctx.roundRect(x - bw - 3, y + 2, bw, bh, 4);
  ctx.fill();
  // text
  ctx.fillStyle = style.badgeFg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x - bw - 3 + padX, y + 2 + bh / 2);
  // HTF badge (à côté)
  if(hasHtf){
    const htfText = 'HTF';
    const m2 = ctx.measureText(htfText);
    const hw = m2.width + padX * 2;
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    ctx.beginPath();
    ctx.roundRect(x - bw - 3 - hw - 3, y + 2, hw, bh, 4);
    ctx.fill();
    ctx.fillStyle = '#0f1117';
    ctx.fillText(htfText, x - bw - 3 - hw - 3 + padX, y + 2 + bh / 2);
  }
}

function drawFVGs(ctx, t2x, p2y, w, h){
  ctx.lineWidth = 1;
  // v1.0.5 — Afficher uniquement les FVG ACTUELS (non mitigés). Les anciens sont obsolètes
  // car déjà comblés par le prix → aucune valeur opérationnelle.
  const list = state.computed.fvgs.filter(f => !f.mitigated).slice(-10);
  const maxScore = state.indicators.multitf ? 4 : 3;
  for(const fvg of list){
    const x1 = t2x(fvg.time);
    if(x1 === null) continue;
    const y1 = p2y(fvg.top);
    const y2 = p2y(fvg.bottom);
    if(y1 === null || y2 === null) continue;
    const xEnd = w; // toujours jusqu'au bord droit (non mitigé)
    if(xEnd <= x1) continue;
    const isBull = fvg.type === 'bullish';
    const style = scoreStyle(fvg.score || 0, maxScore);
    const fillBase = isBull ? [16,185,129] : [239,68,68];
    // v1.0.5 — Rouge plus foncé : alpha de fill x1.8 + alpha de stroke x1.5 pour bearish
    const fillMult = isBull ? 0.10 : 0.22;
    const strokeMult = isBull ? 0.35 : 0.75;
    const fillCap = isBull ? 0.25 : 0.45;
    const strokeCap = isBull ? 0.85 : 1.0;
    ctx.fillStyle = `rgba(${fillBase.join(',')},${Math.min(fillMult * style.mult, fillCap)})`;
    ctx.fillRect(x1, y1, xEnd - x1, y2 - y1);
    ctx.strokeStyle = `rgba(${fillBase.join(',')},${Math.min(strokeMult * style.mult, strokeCap)})`;
    ctx.setLineDash([2, 2]);
    if(style.glow){
      ctx.shadowColor = `rgba(${fillBase.join(',')},0.5)`;
      ctx.shadowBlur = 8;
    }
    ctx.strokeRect(x1, y1, xEnd - x1, y2 - y1);
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    if(fvg.score !== undefined){
      drawScoreBadge(ctx, Math.min(xEnd, w - 2), y1, fvg.score, maxScore, fvg.scoreDetails && fvg.scoreDetails.htf);
    }
  }
}

function drawOrderBlocks(ctx, t2x, p2y, w, h){
  ctx.lineWidth = 1;
  // Limite : 10 OBs non-mitigés (les plus récents = les plus pertinents) + 10 mitigated
  const unmitigated = state.computed.orderBlocks.filter(o => !o.mitigated).slice(-10);
  const recentMitigated = state.computed.orderBlocks.filter(o => o.mitigated).slice(-10);
  const list = [...recentMitigated, ...unmitigated];
  const maxScore = state.indicators.multitf ? 5 : 4; // killzone + PD + OTE + FVG-in-impulse (+HTF si multi)
  for(const ob of list){
    const x1 = t2x(ob.time);
    if(x1 === null) continue;
    const y1 = p2y(ob.top);
    const y2 = p2y(ob.bottom);
    if(y1 === null || y2 === null) continue;
    let xEnd;
    if(ob.mitigated && ob.mitigatedTime){
      const xm = t2x(ob.mitigatedTime);
      xEnd = xm !== null ? xm : w;
    } else {
      xEnd = w;
    }
    if(xEnd <= x1) continue;
    const isBull = ob.type === 'bullish';
    const style = scoreStyle(ob.score || 0, maxScore);
    const fillBase = isBull ? [16,185,129] : [239,68,68];
    ctx.fillStyle = `rgba(${fillBase.join(',')},${Math.min(0.18 * style.mult, 0.35)})`;
    ctx.fillRect(x1, y1, xEnd - x1, y2 - y1);
    ctx.strokeStyle = `rgba(${fillBase.join(',')},${Math.min(0.55 * style.mult, 1)})`;
    if(style.glow){
      ctx.shadowColor = `rgba(${fillBase.join(',')},0.6)`;
      ctx.shadowBlur = 10;
    }
    ctx.strokeRect(x1, y1, xEnd - x1, y2 - y1);
    ctx.shadowBlur = 0;
    // Label "OB" en haut-gauche
    ctx.font = 'bold 9px Segoe UI, system-ui';
    ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(${fillBase.join(',')},0.95)`;
    ctx.fillText('OB', x1 + 3, y1 + 2);
    // Score badge en haut-droit (uniquement non-mitigés)
    if(!ob.mitigated && ob.score !== undefined){
      drawScoreBadge(ctx, Math.min(xEnd, w - 2), y1, ob.score, maxScore, ob.scoreDetails && ob.scoreDetails.htf);
    }
  }
}

function drawBosMss(ctx, t2x, p2y, w, h){
  ctx.lineWidth = 1;
  ctx.font = 'bold 9px Segoe UI, system-ui';
  ctx.textBaseline = 'bottom';
  // v1.0.5 — Seulement MSS (changements de structure marquants). Les BOS sont retirés
  // car trop nombreux et bruyants dans un swing trend.
  const recent = state.computed.structure.events.filter(e => e.type === 'MSS').slice(-15);
  for(const ev of recent){
    const xS = t2x(ev.swingTime);
    const xB = t2x(ev.breakTime);
    const y = p2y(ev.swingPrice);
    if(y === null) continue;
    const X1 = xS !== null ? xS : 0;
    const X2 = xB !== null ? xB : w;
    if(X2 <= X1) continue;
    const isUp = ev.dir === 'up';
    const color = isUp ? '#fbbf24' : '#fb923c'; // MSS jaune/orange selon direction
    ctx.strokeStyle = color;
    ctx.setLineDash([6, 3, 2, 3]);
    ctx.beginPath();
    ctx.moveTo(X1, y);
    ctx.lineTo(X2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillText('MSS', X2 + 4, y - 2);
  }
}

function drawSweeps(ctx, t2x, p2y, w, h){
  for(const sw of state.computed.liquidity.sweeps){
    const x = t2x(sw.time);
    const y = p2y(sw.level);
    if(x === null || y === null) continue;
    const yMarker = sw.dir === 'up' ? y - 10 : y + 10;
    ctx.fillStyle = 'rgba(251,191,36,0.95)';
    ctx.beginPath();
    ctx.arc(x, yMarker, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,17,23,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// v1.0.5 — Lignes de liquidité (BSL/SSL) en canvas : partent du swing jusqu'au bord droit
function drawLiquidityLines(ctx, t2x, p2y, w, h){
  ctx.lineWidth = 1;
  ctx.font = 'bold 9px Segoe UI, system-ui';
  ctx.textBaseline = 'middle';
  const drawSet = (levels, color, label) => {
    // Garde les ~10 plus récents non encore swept
    const list = levels.filter(l => !l.swept).slice(-10);
    for(const l of list){
      const x = t2x(l.time);
      const y = p2y(l.price);
      if(y === null) continue;
      const xStart = (x === null || x < 0) ? 0 : x;
      // Trait dashed de xStart à w (bord droit)
      ctx.strokeStyle = color;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Badge label à droite
      const m = ctx.measureText(label);
      const bw = m.width + 8, bh = 14;
      ctx.fillStyle = color;
      ctx.fillRect(w - bw - 2, y - bh/2, bw, bh);
      ctx.fillStyle = '#0f1117';
      ctx.fillText(label, w - bw + 2, y);
    }
  };
  drawSet(state.computed.liquidity.bsl, 'rgba(59,130,246,0.85)', 'BSL');
  drawSet(state.computed.liquidity.ssl, 'rgba(249,115,22,0.85)', 'SSL');
}

function renderAll(){
  renderSwings();
  renderLiquidity();
  renderPremiumDiscount();
  renderPDArraysPanel();
  drawCanvasOverlays();
  if(state.alerts && state.alerts.enabled) checkAlerts();
  if(state.paper){
    checkPaperPositions();
    renderPaperPositionsOnChart();
  }
}

