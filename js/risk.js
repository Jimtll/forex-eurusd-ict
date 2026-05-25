// ============================================================
// RISK — Position size + R/R Visualizer + Journal de trades
// Extracted from app.js (refonte modulaire)
// ============================================================

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
  // Validation intégrée (était un wrapper externe)
  if(isNaN(result)){ showToast('⚠ Résultat (R) requis'); return; }
  if(Math.abs(result) > 100){ showToast('⚠ R suspect (>100). Vérifie ta saisie.'); return; }
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

