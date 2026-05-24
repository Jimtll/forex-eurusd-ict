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

## Session 2 — Quick wins + tuto débutant ✅

### Tuto débutant (page séparée `tuto-debutant.html`) ✅
24 chapitres en 6 modules pour vrais débutants :
- M0 : Le marché c'est quoi vraiment ? (acteurs, forex vs bourse vs crypto, d'où viennent les prix)
- M1 : Démarrer concrètement (broker, démo vs réel, combien pour commencer)
- M2 : Mécanique d'un trade (long/short, spread, levier, marge, frais)
- M3 : Types d'ordres (market, limit, stop, SL/TP)
- M4 : Vrais chiffres et pièges (90% perdent, 5 pièges, démo vs réel, vrais revenus)
- M5 : Vers le dashboard (pourquoi ICT, comment l'utiliser, plan 6 mois)
Accessible via bouton 🎓 dans la topbar.

### Quick wins (5/5) ✅
- **QW1** Préférences persistées (toggles + TF + sections collapsed + chapitre cours) en localStorage
- **QW2** Icônes ℹ️ à côté de chaque toggle ICT → ouvre direct le chapitre correspondant
- **QW3** Présets 📚 Apprentissage / 📊 Swing / 🎯 Scalping → un clic active les bons indicateurs + TF
- **QW4** Compteur quota API affiché dans la topbar (N/800, couleur warn/danger)
- **QW5** Pulse vert + "il y a Xs" pour le polling live

---

## Session 3 — Features avancées (7-11) ✅

### Feature 11 — Score qualité OB/FVG ✅
Score 1-5 calculé sur 5 critères de confluence ICT :
- favorablePD (Discount pour bullish, Premium pour bearish)
- killzone (formé entre 7-10 ou 12-15 GMT)
- ote (dans la zone fib 62-79% de la jambe courante)
- fvgInImpulse (OB seulement — contient un FVG dans l'impulsion qui suit)
- htf (confirmé sur TF supérieur — lié feature 7)

Visuel : badge `N/5` à droite du rectangle + opacity/glow modulés selon le score (A+ en vert vif glow, faible en grisé).

### Feature 7 — Multi-TF confluence ✅
Toggle "Multi-TF confluence" dans Avancés. Quand activé :
- Calcule les OB/FVG non-mitigés sur TF supérieurs (H1→H4+D1, H4→D1)
- Pour chaque zone du TF courant : check overlap > 30% avec une zone HTF
- Si oui → +1 au score + badge violet "HTF" affiché à gauche du badge score

Limitation actuelle : marche en mode mock uniquement (utilise state.m15 pour aggréger). En live, faudrait des fetch API supplémentaires (quota).

### Feature 9 — Export CSV + filtres journal ✅
Dans modal Journal :
- 2 dropdowns : filtre par setup type (OB/FVG/BB/...) + sens (long/short)
- Bouton 📥 CSV qui télécharge un fichier `eurusd-trades-YYYY-MM-DD.csv` avec les trades filtrés
- Format CSV propre (échappement des virgules/quotes/newlines)

### Feature 10 — Polish mobile ✅
- PD Arrays panel → bottom sheet (slide up) sur mobile
- R/R floating → barre en bas, ratio affiché sur ligne complète
- Modal Journal → grid 1 colonne empilée, scroll
- Topbar compactée : OHLC overlay caché < 520px, live-meta caché, icon-btn réduits
- Très petits écrans (< 380px) : logo réduit, gap minimal

### Feature 8 — Drag SL/TP/Entry ✅
- 3 poignées HTML (E vert, SL rouge, TP bleu) positionnées par-dessus le chart
- Drag mousedown/touchstart → mousemove convertit Y → prix via `series.coordinateToPrice`
- Update live : input + priceLine + ratio R/R
- Suivent automatiquement le pan/zoom du chart (hooké à drawCanvasOverlays)
- Curseur ns-resize, scale au hover, glow pendant le drag
- Compatible souris + touch (mobile)

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
