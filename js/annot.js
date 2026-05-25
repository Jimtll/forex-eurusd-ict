// ============================================================
// ANNOTATIONS + HOVER TOOLTIP + NEWS EVENTS
// Extracted from app.js (refonte modulaire)
// ============================================================

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

