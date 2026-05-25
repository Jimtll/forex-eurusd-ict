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
  if(typeof clearComputeCache === 'function') clearComputeCache();
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
// FEATURE #1 — MOCK DATA RÉALISTE (cycles AMD, sweeps, OB)
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

// detectFVG (filtre minSize), drawCanvasOverlays (news + hover), recomputeAll (cache)
// → tous intégrés directement dans ict.js. Plus de wrappers _orig*.
// Validation des trades intégrée directement dans addTrade.

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
