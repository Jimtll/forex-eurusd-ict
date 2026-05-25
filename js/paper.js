// ============================================================
// PAPER TRADING + PROPFIRM CHALLENGE — compte fictif
// Extracted from app.js (refonte modulaire)
// ============================================================

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

