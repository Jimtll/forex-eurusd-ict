// ============================================================
// REPLAY MODE — rejoue l'historique bougie par bougie
// Extracted from app.js (refonte modulaire)
// ============================================================

// ============================================================
// FEATURE #5 — REPLAY MODE
// ============================================================

state.replay = {
  active: false,
  fullCandles: null,
  currentIdx: 0,
  playing: false,
  timer: null,
  speed: 800,
};

function startReplay(){
  if(state.candles.length < 100) return;
  state.replay.active = true;
  state.replay.fullCandles = state.candles.slice();
  // Démarre à 70% des bougies (pour avoir du futur à découvrir)
  state.replay.currentIdx = Math.floor(state.replay.fullCandles.length * 0.7);
  state.replay.playing = false;
  applyReplayCandles();
  document.getElementById('replay-controls').classList.add('active');
  document.getElementById('toggle-replay').classList.add('active');
}

function exitReplay(){
  state.replay.active = false;
  state.replay.playing = false;
  if(state.replay.timer){ clearInterval(state.replay.timer); state.replay.timer = null; }
  if(state.replay.fullCandles){
    state.candles = state.replay.fullCandles;
    state.series.setData(state.candles);
    recomputeAll();
    renderAll();
  }
  state.replay.fullCandles = null;
  document.getElementById('replay-controls').classList.remove('active');
  document.getElementById('toggle-replay').classList.remove('active');
}

function applyReplayCandles(){
  if(!state.replay.active || !state.replay.fullCandles) return;
  const visible = state.replay.fullCandles.slice(0, state.replay.currentIdx + 1);
  state.candles = visible;
  state.series.setData(visible);
  updatePriceDisplay();
  recomputeAll();
  renderAll();
  const info = document.getElementById('replay-info');
  const last = visible[visible.length - 1];
  const date = new Date(last.time * 1000).toISOString().slice(5, 16).replace('T', ' ');
  info.textContent = `${state.replay.currentIdx + 1} / ${state.replay.fullCandles.length} — ${date}`;
}

function replayStep(direction = 1){
  if(!state.replay.active) return;
  const total = state.replay.fullCandles.length;
  state.replay.currentIdx = Math.max(0, Math.min(total - 1, state.replay.currentIdx + direction));
  applyReplayCandles();
}

function replayPlayPause(){
  if(!state.replay.active) return;
  state.replay.playing = !state.replay.playing;
  const btn = document.getElementById('replay-play-pause');
  if(state.replay.playing){
    btn.textContent = '⏸'; btn.classList.add('playing');
    state.replay.timer = setInterval(() => {
      replayStep(1);
      if(state.replay.currentIdx >= state.replay.fullCandles.length - 1){
        replayPlayPause(); // auto-pause à la fin
      }
    }, state.replay.speed);
  } else {
    btn.textContent = '▶'; btn.classList.remove('playing');
    if(state.replay.timer){ clearInterval(state.replay.timer); state.replay.timer = null; }
  }
}

function wireReplay(){
  document.getElementById('toggle-replay').addEventListener('click', () => {
    if(state.replay.active) exitReplay();
    else startReplay();
  });
  document.getElementById('replay-step-back').addEventListener('click', () => replayStep(-1));
  document.getElementById('replay-step').addEventListener('click', () => replayStep(1));
  document.getElementById('replay-play-pause').addEventListener('click', replayPlayPause);
  document.getElementById('replay-exit').addEventListener('click', exitReplay);
  document.getElementById('replay-speed').addEventListener('change', e => {
    state.replay.speed = parseInt(e.target.value, 10);
    if(state.replay.playing){
      replayPlayPause(); // pause
      replayPlayPause(); // replay avec nouvelle vitesse
    }
  });
}

// ============================================================
