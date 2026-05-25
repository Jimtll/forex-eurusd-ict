// ============================================================
// LIVE — TwelveData API, polling, PWA, status badge
// ============================================================
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
  // Parse datetime — gère les 2 formats TwelveData :
  //  - intraday : "2026-05-23 13:45:00" (avec heure)
  //  - daily/weekly : "2026-05-23" (date seule)
  const parseTwelveTs = (dt) => {
    if(!dt) return NaN;
    let iso;
    if(dt.length === 10){
      // Format date seule → ajouter 00:00:00 UTC
      iso = dt + 'T00:00:00Z';
    } else {
      iso = dt.replace(' ', 'T') + 'Z';
    }
    const t = new Date(iso).getTime();
    return isNaN(t) ? NaN : Math.floor(t / 1000);
  };
  const candles = j.values.reverse().map(v => ({
    time: parseTwelveTs(v.datetime),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
  })).filter(c => !isNaN(c.open) && !isNaN(c.time));
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

