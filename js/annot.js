// ============================================================
// ANNOTATIONS + HOVER TOOLTIP + NEWS EVENTS
// Extracted from app.js (refonte modulaire)
// ============================================================

// ============================================================
// ANNOTATIONS — dessin manuel sur le chart (drag-to-draw + handles)
// ============================================================

const ANNOT_COLORS = {
  acc: '#10b981', red: '#ef4444', blue: '#3b82f6', yellow: '#fbbf24'
};

state.annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
state.annotMode = 'pan';
state.annotColor = 'acc';
state.annotDraft = null;          // annotation en cours de création
state.annotDrag = null;           // { id, kind, startX/Y, startTime/Price, startData }
state.selectedAnnotId = null;     // id de l'annotation sélectionnée
let _annotCrosshair = null;       // { x, y, time, price } pour la croix magnétique

function saveAnnotations(){ localStorage.setItem('annotations', JSON.stringify(state.annotations)); scheduleAutoSync(); }

function setAnnotMode(mode){
  state.annotMode = mode;
  state.annotDraft = null;
  state.selectedAnnotId = null;
  document.querySelectorAll('.annot-btn[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  // Désactive le pan/zoom du chart quand un outil de dessin est actif
  if(state.chart){
    const allowPan = (mode === 'pan');
    state.chart.applyOptions({ handleScroll: allowPan, handleScale: allowPan });
  }
  // Cursor adapté
  const chartEl = document.getElementById('chart');
  if(mode === 'pan') chartEl.style.cursor = '';
  else if(mode === 'erase') chartEl.style.cursor = 'not-allowed';
  else chartEl.style.cursor = 'crosshair';
  _annotCrosshair = null;
  renderAll();
}

function setAnnotColor(color){
  state.annotColor = color;
  document.querySelectorAll('.annot-btn.annot-color').forEach(b => {
    b.classList.toggle('active', b.dataset.color === color);
  });
}

// ── Conversion event → coords (time/price) ──
function eventToTimePrice(e){
  const chartEl = document.getElementById('chart');
  const rect = chartEl.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  const clientX = t.clientX, clientY = t.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if(x < 0 || x > rect.width || y < 0 || y > rect.height) return null;
  const time = state.chart.timeScale().coordinateToTime(x);
  const price = state.series.coordinateToPrice(y);
  if(time === null || price === null) return null;
  return { x, y, time, price };
}

// ── Hit-test : trouve ce qui se trouve sous (x,y) ──
function getAnnotHandles(a){
  const timeScale = state.chart.timeScale();
  const t2x = t => timeScale.timeToCoordinate(t);
  const p2y = p => state.series.priceToCoordinate(p);
  const handles = [];
  if(a.type === 'hline'){
    const y = p2y(a.price);
    if(y !== null) handles.push({ kind: 'move', x: 60, y, cursor: 'ns-resize' });
  } else if(a.type === 'text'){
    const x = t2x(a.time), y = p2y(a.price);
    if(x !== null && y !== null) handles.push({ kind: 'move', x, y, cursor: 'move' });
  } else if(a.type === 'trendline'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 !== null && y1 !== null) handles.push({ kind: 'end1', x: x1, y: y1, cursor: 'crosshair' });
    if(x2 !== null && y2 !== null) handles.push({ kind: 'end2', x: x2, y: y2, cursor: 'crosshair' });
  } else if(a.type === 'rect'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 !== null && y1 !== null && x2 !== null && y2 !== null){
      const minX = Math.min(x1,x2), maxX = Math.max(x1,x2);
      const minY = Math.min(y1,y2), maxY = Math.max(y1,y2);
      handles.push(
        { kind: 'tl', x: minX, y: minY, cursor: 'nwse-resize' },
        { kind: 'tr', x: maxX, y: minY, cursor: 'nesw-resize' },
        { kind: 'bl', x: minX, y: maxY, cursor: 'nesw-resize' },
        { kind: 'br', x: maxX, y: maxY, cursor: 'nwse-resize' },
      );
    }
  }
  return handles;
}

function distanceToSegment(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if(len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}

function distanceToAnnot(x, y, a){
  const timeScale = state.chart.timeScale();
  const t2x = t => timeScale.timeToCoordinate(t);
  const p2y = p => state.series.priceToCoordinate(p);
  if(a.type === 'hline'){
    const ay = p2y(a.price);
    return ay !== null ? Math.abs(y - ay) : Infinity;
  }
  if(a.type === 'text'){
    const ax = t2x(a.time), ay = p2y(a.price);
    return (ax !== null && ay !== null) ? Math.hypot(x - ax, y - ay) : Infinity;
  }
  if(a.type === 'trendline'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 === null || y1 === null || x2 === null || y2 === null) return Infinity;
    return distanceToSegment(x, y, x1, y1, x2, y2);
  }
  if(a.type === 'rect'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 === null || y1 === null || x2 === null || y2 === null) return Infinity;
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const dxIn = (x >= minX && x <= maxX) ? 0 : Math.min(Math.abs(x - minX), Math.abs(x - maxX));
    const dyIn = (y >= minY && y <= maxY) ? 0 : Math.min(Math.abs(y - minY), Math.abs(y - maxY));
    return Math.hypot(dxIn, dyIn);
  }
  return Infinity;
}

function hitTest(x, y){
  // Priorité 1 : handles de l'annotation sélectionnée
  if(state.selectedAnnotId){
    const a = state.annotations.find(a => a.id === state.selectedAnnotId);
    if(a){
      const handles = getAnnotHandles(a);
      for(const h of handles){
        if(Math.hypot(x - h.x, y - h.y) < 14){
          return { type: 'handle', id: a.id, handle: h.kind, cursor: h.cursor };
        }
      }
    }
  }
  // Priorité 2 : corps des annotations (de la plus récente à la plus ancienne)
  for(let i = state.annotations.length - 1; i >= 0; i--){
    const a = state.annotations[i];
    if(distanceToAnnot(x, y, a) < 8){
      return { type: 'body', id: a.id };
    }
  }
  return null;
}

function eraseAnnotationAt(x, y){
  const hit = hitTest(x, y);
  if(!hit) return;
  state.annotations = state.annotations.filter(a => a.id !== hit.id);
  saveAnnotations();
  renderAll();
  showToast('🗑 Annotation supprimée');
}

// ── Apply drag (resize/move) ──
function applyDrag(pos){
  const drag = state.annotDrag;
  const a = state.annotations.find(a => a.id === drag.id);
  if(!a) return;
  const dTime = pos.time - drag.startTime;
  const dPrice = pos.price - drag.startPrice;
  const orig = drag.startData;

  if(drag.kind === 'move'){
    if(a.type === 'hline'){
      a.price = orig.price + dPrice;
    } else if(a.type === 'text'){
      a.time = orig.time + dTime;
      a.price = orig.price + dPrice;
    } else {
      a.time1 = orig.time1 + dTime;
      a.price1 = orig.price1 + dPrice;
      a.time2 = orig.time2 + dTime;
      a.price2 = orig.price2 + dPrice;
    }
  } else if(drag.kind === 'resize:end1'){
    a.time1 = pos.time;
    a.price1 = pos.price;
  } else if(drag.kind === 'resize:end2'){
    a.time2 = pos.time;
    a.price2 = pos.price;
  } else if(drag.kind.startsWith('resize:')){
    // tl / tr / bl / br pour rectangle
    const corner = drag.kind.slice(7);
    // On manipule la paire (time1,price1)-(time2,price2) — la normalisation visuelle est faite au render
    // Stratégie : modifier les bons côtés selon la corner
    const t1Was1 = orig.time1 < orig.time2;
    const p1WasMin = orig.price1 < orig.price2;
    if(corner === 'tl'){
      if(t1Was1){ a.time1 = pos.time; } else { a.time2 = pos.time; }
      if(p1WasMin){ a.price2 = pos.price; } else { a.price1 = pos.price; }
    } else if(corner === 'tr'){
      if(t1Was1){ a.time2 = pos.time; } else { a.time1 = pos.time; }
      if(p1WasMin){ a.price2 = pos.price; } else { a.price1 = pos.price; }
    } else if(corner === 'bl'){
      if(t1Was1){ a.time1 = pos.time; } else { a.time2 = pos.time; }
      if(p1WasMin){ a.price1 = pos.price; } else { a.price2 = pos.price; }
    } else if(corner === 'br'){
      if(t1Was1){ a.time2 = pos.time; } else { a.time1 = pos.time; }
      if(p1WasMin){ a.price1 = pos.price; } else { a.price2 = pos.price; }
    }
  }
}

// ── Events handlers ──
function onChartMouseDown(e){
  const pos = eventToTimePrice(e);
  if(!pos) return;

  // Mode pan : sélection / drag d'annotation existante
  if(state.annotMode === 'pan'){
    const hit = hitTest(pos.x, pos.y);
    if(!hit){
      // Clic ailleurs : désélectionne et laisse le chart pan normalement
      if(state.selectedAnnotId){
        state.selectedAnnotId = null;
        renderAll();
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    state.selectedAnnotId = hit.id;
    const a = state.annotations.find(a => a.id === hit.id);
    state.annotDrag = {
      id: hit.id,
      kind: hit.type === 'handle' ? 'resize:' + hit.handle : 'move',
      startX: pos.x, startY: pos.y,
      startTime: pos.time, startPrice: pos.price,
      startData: JSON.parse(JSON.stringify(a)),
    };
    // Désactive scroll/scale pendant le drag
    state.chart.applyOptions({ handleScroll: false, handleScale: false });
    renderAll();
    return;
  }

  // Mode erase : supprime sous le curseur
  if(state.annotMode === 'erase'){
    e.preventDefault();
    eraseAnnotationAt(pos.x, pos.y);
    return;
  }

  // Mode dessin : commence un draft
  e.preventDefault();
  if(state.annotMode === 'hline'){
    state.annotations.push({ id: Date.now(), type: 'hline', color: state.annotColor, price: pos.price });
    state.selectedAnnotId = state.annotations[state.annotations.length - 1].id;
    saveAnnotations();
    setAnnotMode('pan');
  } else if(state.annotMode === 'text'){
    const txt = prompt('Texte du label :', '');
    if(!txt){ setAnnotMode('pan'); return; }
    state.annotations.push({ id: Date.now(), type: 'text', color: state.annotColor, time: pos.time, price: pos.price, text: txt });
    state.selectedAnnotId = state.annotations[state.annotations.length - 1].id;
    saveAnnotations();
    setAnnotMode('pan');
  } else if(state.annotMode === 'trendline' || state.annotMode === 'rect'){
    state.annotDraft = {
      type: state.annotMode, color: state.annotColor,
      time1: pos.time, price1: pos.price,
      time2: pos.time, price2: pos.price,
    };
    renderAll();
  }
}

function onChartMouseMove(e){
  const pos = eventToTimePrice(e);

  // Update crosshair (uniquement quand outil de dessin actif)
  if(pos && state.annotMode !== 'pan' && state.annotMode !== 'erase'){
    _annotCrosshair = pos;
    renderAll();
  } else if(_annotCrosshair){
    _annotCrosshair = null;
    renderAll();
  }

  // Drag d'annotation en cours
  if(state.annotDrag && pos){
    e.preventDefault();
    applyDrag(pos);
    renderAll();
    return;
  }

  // Draft en cours
  if(state.annotDraft && pos){
    e.preventDefault();
    state.annotDraft.time2 = pos.time;
    state.annotDraft.price2 = pos.price;
    renderAll();
    return;
  }

  // Hover en mode pan : update cursor
  if(state.annotMode === 'pan' && pos){
    const hit = hitTest(pos.x, pos.y);
    const chartEl = document.getElementById('chart');
    if(hit){
      chartEl.style.cursor = hit.cursor || 'move';
    } else {
      chartEl.style.cursor = '';
    }
  }
}

function onChartMouseUp(e){
  // Fin de drag
  if(state.annotDrag){
    state.annotDrag = null;
    saveAnnotations();
    // Réactive scroll/scale en mode pan
    if(state.annotMode === 'pan'){
      state.chart.applyOptions({ handleScroll: true, handleScale: true });
    }
    renderAll();
    return;
  }
  // Fin de draft (drag-to-draw)
  if(state.annotDraft){
    const draft = state.annotDraft;
    const t2x = t => state.chart.timeScale().timeToCoordinate(t);
    const x1 = t2x(draft.time1), x2 = t2x(draft.time2);
    // Annule si trop petit (clic accidentel)
    if(x1 !== null && x2 !== null && Math.abs(x2 - x1) < 4){
      state.annotDraft = null;
      renderAll();
      return;
    }
    const newAnnot = {
      id: Date.now(),
      type: draft.type,
      color: draft.color,
      time1: draft.time1, price1: draft.price1,
      time2: draft.time2, price2: draft.price2,
    };
    state.annotations.push(newAnnot);
    state.selectedAnnotId = newAnnot.id;
    state.annotDraft = null;
    saveAnnotations();
    setAnnotMode('pan');  // retour pan + sélection auto pour édition
  }
}

function onChartMouseLeave(){
  if(_annotCrosshair){
    _annotCrosshair = null;
    renderAll();
  }
}

// ── Rendu ──
function drawCrosshair(ctx, w, h){
  if(!_annotCrosshair || state.annotMode === 'pan' || state.annotMode === 'erase') return;
  const { x, y, price, time } = _annotCrosshair;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, y); ctx.lineTo(w, y);
  ctx.moveTo(x, 0); ctx.lineTo(x, h);
  ctx.stroke();
  ctx.setLineDash([]);
  // Label prix à droite
  ctx.font = 'bold 10px Segoe UI';
  const priceTxt = price.toFixed(5);
  const mPrice = ctx.measureText(priceTxt);
  ctx.fillStyle = 'rgba(15,17,23,0.92)';
  ctx.fillRect(w - mPrice.width - 14, y - 9, mPrice.width + 10, 18);
  ctx.fillStyle = '#10b981';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceTxt, w - mPrice.width - 9, y);
  // Label time en bas
  if(time){
    const ts = typeof time === 'number' ? time : (time.timestamp || 0);
    if(ts > 0){
      const dt = new Date(ts * 1000);
      const timeTxt = dt.toISOString().slice(5, 16).replace('T', ' ');
      const mTime = ctx.measureText(timeTxt);
      ctx.fillStyle = 'rgba(15,17,23,0.92)';
      ctx.fillRect(x - mTime.width/2 - 5, h - 22, mTime.width + 10, 18);
      ctx.fillStyle = '#10b981';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeTxt, x - mTime.width/2, h - 13);
    }
  }
}

function drawSingleAnnotation(ctx, t2x, p2y, w, h, a, selected, isDraft){
  const color = ANNOT_COLORS[a.color] || ANNOT_COLORS.acc;
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if(a.type === 'hline'){
    const y = p2y(a.price);
    if(y === null) return;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 11px Segoe UI, system-ui';
    ctx.textBaseline = 'bottom';
    ctx.fillText(a.price.toFixed(5), 6, y - 3);
  } else if(a.type === 'trendline'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 === null || y1 === null || x2 === null || y2 === null) return;
    if(isDraft) ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  } else if(a.type === 'rect'){
    const x1 = t2x(a.time1), y1 = p2y(a.price1);
    const x2 = t2x(a.time2), y2 = p2y(a.price2);
    if(x1 === null || y1 === null || x2 === null || y2 === null) return;
    const X = Math.min(x1, x2), Y = Math.min(y1, y2);
    const W = Math.abs(x2 - x1), H = Math.abs(y2 - y1);
    ctx.globalAlpha = 0.12;
    ctx.fillRect(X, Y, W, H);
    ctx.globalAlpha = 1;
    if(isDraft) ctx.setLineDash([4, 3]);
    ctx.strokeRect(X, Y, W, H);
    ctx.setLineDash([]);
  } else if(a.type === 'text'){
    const x = t2x(a.time), y = p2y(a.price);
    if(x === null || y === null) return;
    ctx.font = 'bold 11px Segoe UI, system-ui';
    const m = ctx.measureText(a.text);
    ctx.fillStyle = 'rgba(15,17,23,0.85)';
    ctx.fillRect(x - 2, y - 14, m.width + 8, 18);
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(a.text, x + 2, y - 5);
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
  }

  // Handles si sélectionné (pas pour le draft)
  if(selected && !isDraft){
    const handles = getAnnotHandles(a);
    for(const hnd of handles){
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hnd.x, hnd.y, 6, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
  }
}

function drawAnnotations(ctx, t2x, p2y, w, h){
  // Crosshair derrière
  drawCrosshair(ctx, w, h);
  // Annotations
  for(const a of state.annotations){
    const selected = a.id === state.selectedAnnotId;
    drawSingleAnnotation(ctx, t2x, p2y, w, h, a, selected, false);
  }
  // Draft en cours
  if(state.annotDraft){
    drawSingleAnnotation(ctx, t2x, p2y, w, h, state.annotDraft, false, true);
  }
}

function wireAnnotations(){
  const chartEl = document.getElementById('chart');
  // Capture phase pour intercepter avant Lightweight Charts en mode dessin
  chartEl.addEventListener('mousedown', onChartMouseDown, true);
  document.addEventListener('mousemove', onChartMouseMove);
  document.addEventListener('mouseup', onChartMouseUp);
  chartEl.addEventListener('mouseleave', onChartMouseLeave);
  // Touch (mobile)
  chartEl.addEventListener('touchstart', onChartMouseDown, { passive: false, capture: true });
  document.addEventListener('touchmove', onChartMouseMove, { passive: false });
  document.addEventListener('touchend', onChartMouseUp);

  // Boutons mode
  document.querySelectorAll('.annot-btn[data-mode]').forEach(b => {
    b.addEventListener('click', () => setAnnotMode(b.dataset.mode));
  });
  // Boutons couleur
  document.querySelectorAll('.annot-btn.annot-color').forEach(b => {
    b.addEventListener('click', () => setAnnotColor(b.dataset.color));
  });
  setAnnotColor('acc');
  // Tout effacer
  document.getElementById('annot-clear-all').addEventListener('click', () => {
    if(state.annotations.length === 0){ showToast('Aucune annotation à effacer'); return; }
    if(!confirm(`Effacer toutes les annotations (${state.annotations.length}) ?`)) return;
    state.annotations = [];
    state.selectedAnnotId = null;
    saveAnnotations();
    renderAll();
    showToast('🗑 Toutes les annotations effacées');
  });
  // Clavier : Escape (annule), Delete/Backspace (supprime sélection)
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if(state.annotDraft){ state.annotDraft = null; renderAll(); }
      else if(state.selectedAnnotId){ state.selectedAnnotId = null; renderAll(); }
      else if(state.annotMode !== 'pan'){ setAnnotMode('pan'); }
    } else if((e.key === 'Delete' || e.key === 'Backspace') && state.selectedAnnotId){
      // Pas dans un input
      const ae = document.activeElement;
      if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      state.annotations = state.annotations.filter(a => a.id !== state.selectedAnnotId);
      state.selectedAnnotId = null;
      saveAnnotations();
      renderAll();
      showToast('🗑 Annotation supprimée');
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

