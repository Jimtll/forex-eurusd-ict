// ============================================================
// UI — wiring (topbar, drawer, modals, presets, prefs, mobile nav, quick wins)
// ============================================================
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

