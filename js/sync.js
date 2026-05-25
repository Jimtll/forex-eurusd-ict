// ============================================================
// SYNC GIST — sauvegarde multi-device via GitHub Gist
// Extracted from app.js (refonte modulaire)
// ============================================================

// ============================================================
// SYNC GITHUB GIST — annotations + paper + journal multi-device
// ============================================================

state.gistToken = localStorage.getItem('gist_token') || '';
state.gistId = localStorage.getItem('gist_id') || null;
state.gistAutoSync = localStorage.getItem('gist_auto_sync') !== 'false'; // true par défaut
const GIST_FILENAME = 'forex-eurusd-data.json';
const GIST_DESCRIPTION = 'Forex EUR/USD ICT Dashboard - User Data';

async function gistApi(method, path, body){
  if(!state.gistToken) throw new Error('Token GitHub requis');
  const r = await fetch('https://api.github.com/' + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + state.gistToken,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if(!r.ok){
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `Erreur HTTP ${r.status}`);
  }
  return r.json();
}

function gatherSyncData(){
  return {
    annotations: state.annotations || [],
    paper: state.paper || {},
    trades: state.trades || [],
    indicators: state.indicators || {},
    syncedAt: new Date().toISOString(),
    version: 1,
  };
}

function applySyncData(data){
  let restored = [];
  if(Array.isArray(data.annotations)){
    state.annotations = data.annotations;
    saveAnnotations();
    restored.push(`${data.annotations.length} annotations`);
  }
  if(data.paper && typeof data.paper === 'object'){
    // Préserve le spread setting local mais merge le reste
    state.paper = { ...state.paper, ...data.paper, spreadPips: state.paper.spreadPips };
    savePaper();
    restored.push(`compte paper (solde ${state.paper.balance.toFixed(0)}€, ${state.paper.history.length} trades historiques)`);
  }
  if(Array.isArray(data.trades)){
    state.trades = data.trades;
    saveTrades();
    restored.push(`${data.trades.length} entrées journal`);
  }
  return restored;
}

async function syncPush(){
  const data = gatherSyncData();
  const files = { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } };
  if(state.gistId){
    await gistApi('PATCH', `gists/${state.gistId}`, { files });
  } else {
    const result = await gistApi('POST', 'gists', {
      description: GIST_DESCRIPTION,
      public: false,
      files,
    });
    state.gistId = result.id;
    localStorage.setItem('gist_id', state.gistId);
  }
  return data;
}

async function syncPull(){
  if(!state.gistId) throw new Error('Aucun Gist connecté. Clique Connecter pour en trouver un, ou Push pour en créer.');
  const gist = await gistApi('GET', `gists/${state.gistId}`);
  if(!gist.files[GIST_FILENAME]) throw new Error(`Fichier ${GIST_FILENAME} absent du Gist`);
  const data = JSON.parse(gist.files[GIST_FILENAME].content);
  return applySyncData(data);
}

async function syncFindExistingGist(){
  // Cherche le Gist déjà créé par cet utilisateur (au 1er Connect)
  const gists = await gistApi('GET', 'gists?per_page=100');
  const ours = gists.find(g => g.description === GIST_DESCRIPTION);
  if(ours){
    state.gistId = ours.id;
    localStorage.setItem('gist_id', state.gistId);
    return ours;
  }
  return null;
}

function refreshGistStatus(){
  const status = document.getElementById('gist-status');
  if(!status) return;
  if(!state.gistToken){
    status.innerHTML = '<span style="color:var(--muted)">Non connecté. Colle ton token GitHub puis clique Connecter.</span>';
    return;
  }
  if(state.gistId){
    const shortId = state.gistId.slice(0, 8);
    status.innerHTML = `<span style="color:var(--acc)">✓ Connecté — <a href="https://gist.github.com/${state.gistId}" target="_blank" style="color:var(--acc);text-decoration:underline">Gist ${shortId}…</a></span>`;
  } else {
    status.innerHTML = '<span style="color:var(--orange)">Token saisi, mais aucun Gist trouvé. Clique Push pour en créer un, ou Connecter pour chercher un existant.</span>';
  }
}

// ── Cloud indicator topbar ──
function setCloudState(s, msg){
  const btn = document.getElementById('cloud-btn');
  if(!btn) return;
  if(!state.gistToken){ btn.classList.remove('visible'); return; }
  btn.classList.add('visible');
  btn.classList.remove('synced', 'syncing', 'error');
  if(s === 'synced'){
    btn.classList.add('synced');
    btn.title = msg || 'Sync à jour';
  } else if(s === 'syncing'){
    btn.classList.add('syncing');
    btn.title = 'Sync en cours…';
  } else if(s === 'error'){
    btn.classList.add('error');
    btn.title = '⚠ Erreur sync : ' + (msg || 'voir Paramètres');
  }
}

// ── Auto-push debounced ──
let _autoSyncTimer = null;
function scheduleAutoSync(){
  if(!state.gistToken || !state.gistAutoSync) return;
  setCloudState('syncing');
  if(_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer = setTimeout(async () => {
    try {
      const data = await syncPush();
      localStorage.setItem('local_sync_time', new Date(data.syncedAt).getTime());
      setCloudState('synced', '☁️ Synced ' + new Date().toLocaleTimeString('fr-FR'));
    } catch(err){
      setCloudState('error', err.message);
    }
  }, 2500);
}

// ── Auto-pull au boot ──
async function autoPullIfNewer(){
  if(!state.gistToken || !state.gistId) return;
  setCloudState('syncing');
  try {
    const gist = await gistApi('GET', `gists/${state.gistId}`);
    if(!gist.files[GIST_FILENAME]){ setCloudState('synced'); return; }
    const data = JSON.parse(gist.files[GIST_FILENAME].content);
    const remoteTime = new Date(data.syncedAt).getTime();
    const localTime = parseInt(localStorage.getItem('local_sync_time') || '0', 10);
    if(remoteTime > localTime + 5000){ // 5s de marge pour éviter les races
      const restored = applySyncData(data);
      localStorage.setItem('local_sync_time', remoteTime);
      renderAll();
      if(state.paper && document.getElementById('modal-paper').classList.contains('open')) renderPaperTrading();
      showToast('☁️ Données récupérées du Gist (' + restored.length + ' éléments)');
    }
    setCloudState('synced');
  } catch(err){
    console.warn('[autoPull]', err);
    setCloudState('error', err.message);
  }
}

function wireGistSync(){
  const tokenInput = document.getElementById('gist-token-input');
  const status = document.getElementById('gist-status');
  if(!tokenInput) return;

  tokenInput.value = state.gistToken;
  refreshGistStatus();

  // Cloud icon → ouvre Settings sur la section Sync
  const cloudBtn = document.getElementById('cloud-btn');
  if(cloudBtn) cloudBtn.addEventListener('click', () => {
    document.getElementById('modal-settings').classList.add('open');
    setTimeout(() => {
      document.getElementById('gist-token-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  if(state.gistToken) setCloudState('synced');

  // Toggle auto-sync
  const autoToggle = document.getElementById('gist-auto-sync');
  autoToggle.checked = state.gistAutoSync;
  autoToggle.addEventListener('change', e => {
    state.gistAutoSync = e.target.checked;
    localStorage.setItem('gist_auto_sync', state.gistAutoSync);
    if(state.gistAutoSync && state.gistToken){ scheduleAutoSync(); }
  });

  document.getElementById('btn-gist-connect').addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if(!token){ status.innerHTML = '<span style="color:var(--orange)">⚠ Token requis</span>'; return; }
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Vérification du token + recherche du Gist...</span>';
    state.gistToken = token;
    try {
      const existing = await syncFindExistingGist();
      localStorage.setItem('gist_token', token);
      if(existing){
        status.innerHTML = `<span style="color:var(--acc)">✓ Token OK + Gist existant trouvé. Récupération automatique des données...</span>`;
        // Pull auto si Gist existant trouvé
        try { await syncPull(); status.innerHTML = `<span style="color:var(--acc)">✓ Connecté et données récupérées du Gist.</span>`; renderAll(); } catch(e){}
      } else {
        status.innerHTML = '<span style="color:var(--acc)">✓ Token valide. Création automatique du Gist au prochain changement (sync auto activée).</span>';
        if(state.gistAutoSync) scheduleAutoSync();
      }
      setCloudState('synced');
      refreshGistStatus();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
      state.gistToken = '';
      setCloudState('error', err.message);
    }
  });

  document.getElementById('btn-gist-push').addEventListener('click', async () => {
    if(!state.gistToken){ showToast('⚠ Connecte un token d\'abord'); return; }
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Push en cours...</span>';
    try {
      const data = await syncPush();
      const counts = `${data.annotations.length} annotations + ${data.trades.length} trades journal`;
      showToast('☁️ Données envoyées au Gist');
      status.innerHTML = `<span style="color:var(--acc)">✓ Pushed ${counts}. Sync : ${new Date(data.syncedAt).toLocaleTimeString('fr-FR')}</span>`;
      refreshGistStatus();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
    }
  });

  document.getElementById('btn-gist-pull').addEventListener('click', async () => {
    if(!state.gistToken){ showToast('⚠ Connecte un token d\'abord'); return; }
    if(!state.gistId){ showToast('⚠ Pas de Gist connecté. Connecte ou Push pour en créer un.'); return; }
    if(!confirm('Remplacer tes données locales par celles du Gist ?\n(Annotations, paper trading, journal de trades seront écrasés.)')) return;
    status.innerHTML = '<span style="color:var(--muted2)">⏳ Pull en cours...</span>';
    try {
      const restored = await syncPull();
      showToast('📥 Données récupérées du Gist');
      status.innerHTML = `<span style="color:var(--acc)">✓ Restauré : ${restored.join(' + ')}</span>`;
      renderAll();
    } catch(err){
      status.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
    }
  });

  document.getElementById('btn-gist-disconnect').addEventListener('click', () => {
    if(!confirm('Déconnecter du Gist ?\nLe token et l\'ID seront supprimés de ton navigateur (le Gist GitHub reste intact).')) return;
    state.gistToken = '';
    state.gistId = null;
    localStorage.removeItem('gist_token');
    localStorage.removeItem('gist_id');
    tokenInput.value = '';
    refreshGistStatus();
    showToast('🔌 Déconnecté');
  });
}

