// ============================================================
// STATE — global state + constants + data orchestration
// ============================================================


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

