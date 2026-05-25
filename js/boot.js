// ============================================================
// BOOT — initialisation au DOMContentLoaded
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
