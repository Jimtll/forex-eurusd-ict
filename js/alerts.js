// ============================================================
// ALERTS — notifications navigateur
// ============================================================
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

