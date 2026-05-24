# Plan — Forex EUR/USD Dashboard (ICT / SMC) ✅ COMPLET

**État final** : toutes les phases (1-6) + cours pédagogiques livrés. Voir [index.html](../index.html).

---


## 🎯 Objectif
Dashboard visuel HTML pour analyser EUR/USD avec la méthodologie **ICT / Smart Money Concepts** (issue de la formation HugoFX).
Mode **pédagogique** : l'app dessine les zones (OB, FVG, liquidity, killzones…) sur le graphe, l'utilisateur décide.

## 📐 Choix techniques validés
- **Single file** `index.html` (style du repo : tout CSS/JS inline, cohérent avec sport/ et travail/)
- **Charts** : TradingView Lightweight Charts (CDN, MIT, gratuit, optimisé chandeliers + overlays)
- **Data live** : TwelveData (800 req/jour gratuit, clé API saisie par l'user et stockée en localStorage)
- **Data mock** : générateur de bougies réalistes (random walk avec volatilité forex ~50-100 pips/jour) pour dev + fallback
- **Timeframes** : M15, H1, H4, D1 (swing trading classique ICT)
- **Détection** : juste afficher les zones, pas d'alertes auto (mode apprentissage)
- **Stockage** : localStorage pour clé API, settings, journal de trades

## 🗂 Architecture du fichier `index.html`
```
<head>
  - CSS dark theme (cohérent avec /Users/tollu/Claude/index.html, accent vert finance #10b981)
  - TradingView Lightweight Charts CDN
</head>
<body>
  <topbar>           statut live/mock, timeframe selector, settings
  <main>
    <chart>          chandeliers + overlays ICT
    <side-panel>     toggles indicateurs (groupés Essentiels / Avancés / Risk)
  <modal-settings>   clé API TwelveData, capital, % risque
  <modal-journal>    trades passés, stats
  <script>
    DATA          → mockGen + twelveDataAPI
    ICT/STRUCT    → swings, BOS, MSS
    ICT/LIQ       → BSL, SSL
    ICT/OB        → order blocks
    ICT/FVG       → fair value gaps + IFVG
    ICT/PD        → premium/discount + fib
    ICT/KZ        → killzones London/NY
    ICT/ADV       → breaker, OTE, AMD, PD arrays, IRL→ERL
    RISK          → position size, R/R, journal
    UI            → toggles, render, settings
```

---

## 📋 Phases d'implémentation

### Phase 1 — Squelette & Mock data
- [ ] HTML/CSS dark theme cohérent (`#0f1117` bg, accent `#10b981` finance)
- [ ] Topbar : logo "EUR/USD ICT" + statut (mock/live badge) + timeframe pills (M15 H1 H4 D1) + ⚙ settings
- [ ] Side panel droit avec toggles ICT (collapsable par section)
- [ ] TradingView Lightweight Charts setup
- [ ] Générateur mock : 2000 bougies EUR/USD réalistes
  - Prix de base ~1.0850, volatilité journalière 60-100 pips
  - Sessions identifiables (volatilité ↑ pendant London/NY)
  - Gaps weekend (vendredi 22h → dimanche 22h GMT)
- [ ] Switch timeframes regénère/resample les bougies

### Phase 2 — ICT essentiels ✅ TERMINÉE
- [x] **Swing H/L** : fractal n=2 (configurable via `SWING_N`). Rendu : markers natifs ▲ low / ▼ high.
- [x] **BOS** : continuation du trend, ligne pointillée verte (up) / rouge (down) avec label.
- [x] **MSS** : Market Structure Shift, ligne dash-dot jaune.
- [x] **Liquidity** :
  - BSL (lignes bleues dashed) sur swings highs non swept
  - SSL (lignes oranges dashed) sur swings lows non swept
  - Sweep markers : dots jaunes là où prix wick au-delà puis close en deçà
- [x] **Order Blocks** :
  - Bullish OB = dernière bougie bearish avant BOS up
  - Bearish OB = dernière bougie bullish avant BOS down
  - Mitigation : prix doit s'être éloigné puis retoucher la zone
  - Rendu : rectangle semi-transparent étendu jusqu'à mitigation, label "OB"
- [x] **Fair Value Gap (FVG)** :
  - Bullish : low[i+1] > high[i-1]
  - Bearish : high[i+1] < low[i-1]
  - Rendu : rectangle pointillé étendu jusqu'à mitigation
- [x] **Premium/Discount** :
  - Range = dernier swing low ↔ dernier swing high
  - 3 priceLines natives : Range High (bleu), Equilibrium 50% (gris pointillé), Range Low (rouge)
- [x] **Killzones** :
  - Asia 20-00 GMT (violet), London 07-10 GMT (bleu), NY 12-15 GMT (orange)
  - Overlay vertical sur tout le chart, labels en haut

**Implémentation** : canvas overlay HTML (`#overlay-canvas`) par-dessus le chart, synchronisé via `timeScale().subscribeVisibleLogicalRangeChange`. Convert time→x via `timeScale.timeToCoordinate`, price→y via `series.priceToCoordinate`. Recalcul auto à chaque switch de TF ou régénération mock.

### Phase 3 — ICT avancés ✅ TERMINÉE
- [x] **Breaker Block** : OB mitigé → polarité flippée, dessiné en violet/rose
- [x] **Inverted FVG (IFVG)** : FVG comblé → polarité flippée, dessiné en bleu/rose pâle
- [x] **OTE** : zone fib 62-79% sur la dernière jambe, 3 lignes pointillées + zone colorée
- [x] **AMD cycle** : labels A/M/D sur les sessions Asia/London/NY avec bandeaux subtils
- [x] **PD Arrays** : panel latéral flottant listant tous les arrays classés Premium / Discount
- [x] **IRL → ERL** : flèche violette du dernier array interne vers le swing externe cible

### Phase 4 — Gestion de risque ✅ TERMINÉE
- [x] **Position size calculator** (modal) : capital + risque% + entrée + SL → lots, unités EUR, valeur pip
- [x] **R/R Visualizer** (panel flottant) : 3 inputs Entry/SL/TP → 3 priceLines natives + ratio live (vert ≥2, rouge <1)
- [x] **Journal de trades** (modal large) : enregistrement complet (sens, prix, R, setup, notes) + localStorage
- [x] **Stats journal** : winrate, R moyen, profit factor, total R, equity curve (Chart.js)

### Phase 5 — TwelveData live ✅ TERMINÉE
- [x] Modal settings élargie : input clé API + bouton "Activer mode Live"
- [x] Wrapper `fetchTwelveData(tfKey, size)` : convert TwelveData → format candle interne
- [x] Polling auto (60s sur M15, 120s sinon)
- [x] Cache localStorage de la clé API
- [x] Fallback auto vers mock si erreur API
- [x] Badge LIVE vert vs MOCK orange dans la topbar
- [x] Switch TF en mode live re-fetch automatiquement

### Phase 6 — Intégration repo ✅ TERMINÉE
- [x] `projects.json` : projet "EUR/USD · ICT Dashboard" ajouté à finance
- [x] `index.html` racine : card finance remplie, compteur passé à "1 projet"

### Cours pédagogiques ✅ LIVRÉ EN BONUS
Modal "📚 Cours" accessible depuis la topbar. **5 modules / 27 chapitres** :
- Module 1 : Bases (forex, bougies, pips, timeframes)
- Module 2 : ICT essentiels (Smart Money, swings, BOS/MSS, liquidity, sweeps, OB, FVG, PD, killzones) — 9 chapitres
- Module 3 : ICT avancés (BB, IFVG, OTE, AMD, PD Arrays, IRL→ERL) — 6 chapitres
- Module 4 : Risk management (1-2% risk, position size, SL/TP, R:R, psychologie) — 5 chapitres
- Module 5 : Mise en pratique (top-down analysis, routine, journal) — 3 chapitres

Navigation Précédent/Suivant entre chapitres, sommaire collapsable, contenu pédagogique français accessible débutant.

---

## ⏱ Estimation
- Phase 1 : socle visuel — court (1 itération)
- Phase 2 : ICT essentiels — gros morceau (probablement 2-3 itérations, c'est le cœur)
- Phase 3 : ICT avancés — moyen (1-2 itérations)
- Phase 4 : risk management — court (1 itération)
- Phase 5 : API live — court (1 itération)
- Phase 6 : intégration — très court (1 itération)

## ⚠️ Notes / points d'attention
- **Pas un signal de trading garanti** : l'app montre des zones, pas des prédictions. À utiliser pour apprendre et tester sa lecture du marché.
- **Détection algorithmique ≠ détection manuelle d'un trader expérimenté** : un OB détecté par l'algo n'est pas forcément un OB de qualité. On documentera les règles utilisées.
- **Backtester séparément** la stratégie avant tout trade réel.
- **TwelveData free** = données différées de quelques secondes, OK pour swing trading H1/H4/D1, limite pour scalping M1.
