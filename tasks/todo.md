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

## Session 4 — Backtester automatique ✅

### Feature 12 — Backtester ICT
Modal `🔬 Backtester` (panel Risk). Logique :
- **Inputs** : type de setup (OB / FVG / OB+FVG / BB / IFVG), direction, score min, R:R cible, time stop (bougies max), SL buffer (pips)
- **Simulation** : pour chaque zone, trouve l'index de mitigation (entry trigger), calcule entry/SL/TP, itère sur les bougies suivantes pour voir si SL ou TP touché en premier. Time stop = close au prix de fin avec R calculé.
- **Stats** : trades, winrate, R moyen, total R, profit factor, max drawdown, expectancy €/100€, verdict (✓ Rentable si PF≥1.5)
- **Equity curve** Chart.js
- **Liste des trades** (limité à 100 affichés) avec side, date, prices, score, R
- **Toggle "Afficher sur le chart"** : markers ▲▼ verts/rouges avec label "+2.0R" / "-1.0R" sur chaque entrée simulée

**Conservateur** : si SL et TP touchés dans la même bougie → on considère SL touché en premier (worst case).
**Réaliste** : ne prend PAS en compte spread/slippage/commissions. Les résultats sont donc optimistes vs réel. À déduire ~1-2 pips par trade pour estimer net.

---

## Session 5 — Alertes + PWA + Cours interactifs ✅

### Feature 13 — Alertes push browser ✅
Section "🔔 Alertes" dans la modal Paramètres :
- Toggle global "Activer les notifications" → demande permission via `Notification.requestPermission()`
- 3 sub-toggles : ⭐ Setups A+ (score≥4), 💧 Liquidity sweeps, 🕐 Début killzone London/NY
- Anti-spam : `state.alerts.sentIds = Set` track les notifs déjà envoyées (par tag unique)
- Hook : `checkAlerts()` appelé à la fin de `renderAll()` (donc à chaque recompute)
- Notif test envoyée au moment de l'activation pour confirmer que ça marche

### Feature 15 — PWA offline + service worker ✅
3 nouveaux fichiers :
- `manifest.json` : nom, scope, theme color, icon, shortcuts
- `sw.js` : cache-first pour app-shell + cache à la volée des CDN (Lightweight Charts, Chart.js), pas de cache des appels TwelveData
- `icon.svg` : design simple avec bougies stylisées (vert/rouge) + label "ICT"

Index.html étendu : `<link rel="manifest">`, meta apple-touch-icon, register SW au boot, bouton 📲 dans la topbar (visible quand `beforeinstallprompt` est dispo).

### Feature 16 — Cours interactifs (progress + quiz) ✅
**Progress tracker** :
- Tuto débutant : barre de progression dans le sommaire (N/24 chapitres lus), ✓ vert à côté des chapitres lus
- Cours ICT : barre de progression (N/27 chapitres), idem
- Chapitre marqué lu 4s après l'avoir ouvert
- Stockage localStorage : `tuto_read_chapters` et `course_read_chapters`

**Quiz** :
- 3 quiz dans le tuto débutant (chapitres 0.4, 2.5, 4.4)
- 2 quiz dans les cours ICT (chapitres 2.9, 4.5)
- 3-4 questions QCM chacun, feedback immédiat (vert/rouge), explication détaillée
- Score affiché à la fin avec message adapté ("Parfait", "Bien", "Re-lis")
- Scores stockés en localStorage

**Total** : 5 quiz, 17 questions de qualité avec explications pédagogiques.

---

## 🎯 État après session 5
**Toutes les features prévues (1-16) sont livrées.** Voir [GitHub](https://github.com/Jimtll/forex-eurusd-ict).

---

## Session 6 — Améliorations post-analyse (15 features) ✅

### Quick UX wins
- **#3 Quick log R/R → Journal** : bouton 📝 dans la barre R/R qui pré-remplit le journal (entry/SL/TP, side auto-détecté)
- **#8 R/R → Calculateur** : bouton 📐 qui pré-remplit le calculateur de position
- **#14 Validation inputs** : protections contre valeurs aberrantes (NaN, R > 100)
- **#15 Undo journal** : toast avec bouton "Annuler" pendant 6s après suppression
- **#7 Filtre FVG par taille min** : input dans Paramètres (skip les FVG < N pips = bruit)
- **#16 Échelle log** : toggle dans Paramètres → priceScale logarithmique

### Feature 2 — Hover tooltip ICT
Au survol d'un OB/FVG/BB/IFVG, mini-bulle qui affiche :
- Type + sens + mitigation status
- Prix médian + hauteur en pips
- ✓/— pour chaque critère du score (PD favorable, killzone, OTE, FVG dans impulsion, HTF)
- Score final N/maxScore

Détection des zones via `_hoverableZones[]` rebuild à chaque redraw du canvas.

### Feature 13 — Lazy compute cache
`_computeCache` Map indexée par hash des candles + TF + indicateurs. Switch TF / re-render instantané sans recompute si même état. Max 12 entrées (LRU).

### Feature 1 — Mock data réaliste
Nouveau générateur `generateRealisticM15()` qui construit délibérément des **cycles AMD** :
- Phase 1 (30%) : accumulation range
- Phase 2 (10%) : manipulation sweep (faux move + wicks longs)
- Phase 3 (5%) : reversal post-sweep (impulsion vive)
- Phase 4 (40%) : distribution / trend prononcé
- Phase 5 (15%) : consolidation fin de cycle

Cycles de ~5 jours avec direction macro qui flip 70% du temps. Volatilité boostée pendant killzones. Toggle "Réaliste / Random walk pur" dans Paramètres.

### Feature 4 — News events overlay
Bandeaux verticaux sur le chart aux heures des news majeures :
- NFP (1er vendredi du mois, 12h30 GMT)
- CPI US (12 du mois, 12h30 GMT)
- FOMC (8 dates 2026 hardcodées, 18h GMT)
- BCE (8 dates 2026 hardcodées, 12h15 GMT)
- Unemployment Claims (jeudi 12h30 GMT)
- Crude Oil Inventories (mercredi 14h30 GMT)

Couleur selon importance (rouge high, jaune medium, gris low). Labels rotated.

### Feature 5 — Replay mode
Mode "entraînement" : bouton 🎬 dans Risk → coupe le chart à 70% des bougies → contrôles ⏮ ▶ ⏭ 1×/2×/5× + info bougie actuelle.
- Step manuel ou play auto
- Recompute + render à chaque step (tu vois les indicateurs apparaître progressivement)
- Sortie restore l'historique complet

### Feature 12 — Glossaire ICT
Bouton 📖 dans la topbar → modal avec **25 termes ICT** définis (OB, FVG, BOS, MSS, BSL/SSL, Sweep, Premium/Discount, OTE, BB, IFVG, AMD, Killzone, PD Array, IRL/ERL, Displacement, Mitigation, Pip, Spread, Levier, Lot, SL/TP, R:R, Smart Money, Retail, Equilibrium).
Recherche en temps réel (filtre par terme/abbr/définition).

### Feature 11 — Quiz additionnels
+6 quiz couvrant tous les modules :
- Tuto : modules 1, 3, 5
- Cours ICT : modules 1, 3, 5

Total final : **11 quiz / 33+ questions** avec explications pédagogiques détaillées.

### Service Worker v2
Bump `CACHE = eurusd-ict-v2` pour purger automatiquement l'ancienne version chez les utilisateurs ayant installé la PWA.

---

## 🎯 État final
Toutes les améliorations identifiées dans l'analyse post-mortem sont livrées. Le projet est à un niveau de maturité comparable à une vraie app de trading retail.

**Skipped intentionnellement** (trop nichés ou disproportionnés) : #6 annotations dessinables (= TradingView mini), #9 tool de mesure, #10 MSS strict, #17 multi-source, #18 WebSocket, #19-22 concepts ICT très avancés (NWOG/SMT/Silver Bullet).

---

## Session 7 — Paper Trading ✅

### Feature — Paper Trading (compte fictif)
Bouton **💼 Paper Trading** dans le panel Risk (highlighted en vert).

**Compte fictif** :
- Balance initiale 10 000 € (configurable via reset)
- Dépôt / retrait de fonds à la volée
- Equity = balance + P&L flottant des positions ouvertes
- Persistance localStorage (`paper_balance`, `paper_positions`, `paper_history`)

**Placement de positions** :
- Long (acheter pour vendre plus haut) ou Short (vendre pour racheter plus bas)
- Ordre Market (entry au prix actuel) ou Limit (entry à un prix futur, statut "pending" jusqu'à ce que le prix touche le niveau)
- SL + TP avec validation cohérence (SL > entry pour short, etc.)
- Auto-TP selon R:R cible (1:1, 1:2 défaut, 1:3, 1:5)
- Calcul auto du nombre de lots selon `% risque du compte`
- Preview détaillée avant placement : taille, risque max, gain max, R:R

**Live tracking** :
- À chaque update de prix (renderAll), `checkPaperPositions()` :
  - Pour les pending : check si entry est touché → bascule en open
  - Pour les open : check si SL ou TP touché (conservateur : SL d'abord si les deux dans la même bougie)
- Fermeture manuelle disponible au prix actuel
- P&L flottant calculé en temps réel : pips × lots × 10€/pip

**Stats** :
- Trades total, winrate, profit factor, % évolution du compte
- Equity curve Chart.js (visible dès 2 trades fermés)
- Historique des 30 derniers trades avec emoji (🎯 TP / 🛑 SL / ✋ manuel)

**Approximation** : 1 pip × 1 lot = 10 € (réel ≈ 10$ ≈ 9.3€ mais on simplifie pour paper).

SW bump v4 pour propager.

---

## Session 8 — Refonte dessin annotations (v1.0.3) ✅

### Feature — Drag-to-draw + handles + crosshair
Refonte complète du système d'annotations (`js/annot.js`) pour un workflow plus naturel "à la Windows / TradingView".

**Drag-to-draw** :
- Avant : 2 clics (clic1=début, clic2=fin) — peu intuitif, pas de preview pendant l'attente entre les 2 clics
- Maintenant : `mousedown` → drag → `mouseup` comme une sélection bureau Windows
- Pour rectangle et trendline (hline reste 1-clic, text demande prompt)
- Annule si trop petit (<4px) → considère comme un clic accidentel

**Crosshair magnétique** :
- Quand un outil de dessin est actif (pas en mode pan/erase), affichage d'une croix en pointillés blancs
- Label prix `#10b981` à droite (5 décimales)
- Label datetime `#10b981` en bas (`MM-DD HH:MM`)
- Couleur d'accent verte (couleur app)

**Sélection + édition** :
- Clic sur une annotation → la sélectionne (bordure plus épaisse + poignées blanches aux coins)
- Drag du corps → déplace toute l'annotation (préserve la forme)
- Drag d'une poignée → redimensionne
  - Rectangle : 4 poignées (tl/tr/bl/br) avec curseur `nwse-resize`/`nesw-resize`
  - Trendline : 2 poignées endpoints avec curseur `crosshair`
  - hline / text : 1 poignée move
- Clic ailleurs → désélectionne
- Auto-sélection après création pour édition immédiate

**Pan/zoom du chart** :
- Désactivé (`handleScroll: false, handleScale: false`) quand outil de dessin actif
- Désactivé pendant un drag actif d'annotation (sinon le chart pan en même temps)
- Réactivé au retour en mode pan
- Captureurs `mousedown` en capture phase pour intercepter avant Lightweight Charts

**Clavier** :
- `Escape` → annule draft / désélectionne / retour mode pan (en cascade)
- `Delete` ou `Backspace` → supprime l'annotation sélectionnée (sauf si focus dans input/textarea)

**Touch (mobile)** :
- Support `touchstart` / `touchmove` / `touchend` avec `passive: false`
- Conversion event → coordonnées via `e.touches[0]` ou `e.changedTouches[0]`

**Mode erase** :
- Curseur `not-allowed`
- Clic sur une annotation → suppression directe avec toast

**Persistance** :
- `saveAnnotations()` appelé à chaque fin de drag / fin de draft / suppression
- Inclut `scheduleAutoSync()` pour push Gist
- localStorage `annotations` (JSON array)

SW bump v1.0.2 → **v1.0.3** pour propager.

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
