# EUR/USD · ICT Dashboard <span align="right">`v1.0`</span>

Dashboard de trading **EUR/USD** avec analyse **Smart Money Concepts** (méthodologie ICT) et cours pédagogiques intégrés pour débutants.

100% vanilla JS/CSS/HTML — aucun framework, aucun bundler, aucun backend. Hébergé gratuitement sur GitHub Pages.

## 🚀 Démo en ligne

- 📊 **Dashboard** : https://jimtll.github.io/forex-eurusd-ict/
- 🎓 **Tuto débutant** : https://jimtll.github.io/forex-eurusd-ict/tuto-debutant.html
- 🧪 **Tests** : https://jimtll.github.io/forex-eurusd-ict/tests/test.html

## ✨ Fonctionnalités

### 📈 Analyse ICT (14 indicateurs)

**Essentiels** : Swing Points · BOS/MSS · Liquidity (BSL/SSL + sweeps) · Order Blocks · Fair Value Gaps · Premium/Discount · Killzones (London/NY/Asia) · News events

**Avancés** : Breaker Block · Inverted FVG · OTE (fib 62-79%) · AMD Cycle · PD Arrays panel · IRL→ERL · Multi-TF confluence

**Score de qualité** par zone (1-5 selon confluences : PD favorable, killzone, OTE, FVG dans impulsion, HTF) avec badge subtil.

### 🛠 Outils de gestion de risque

- 📐 **Calculateur de position** : taille en lots selon capital + % risque + entrée + SL
- 🎯 **R/R Visualizer** : 3 poignées draggables (Entry/SL/TP) directement sur le chart, ratio live
- 📝 **Journal de trades** : enregistrement + stats (winrate, R moyen, profit factor) + equity curve Chart.js + export CSV
- 🔬 **Backtester** : simule ta stratégie sur l'historique, sort stats + equity + markers sur le chart
- 🎬 **Mode Replay** : rejoue l'historique bougie par bougie pour t'entraîner

### 💼 Paper Trading

Compte fictif **10 000 €** pour s'entraîner sans risque :
- Long / Short, ordre Market ou Limit, SL/TP avec auto-R:R
- **Spread simulé** configurable (réaliste vs EUR/USD)
- Positions affichées sur le chart (priceLines Entry/SL/TP)
- Édition SL/TP en clic après ouverture
- P&L flottant en temps réel
- Fermeture auto sur SL/TP touché + notification browser
- Stats : winrate, profit factor, equity curve

### 🏆 Propfirm Challenge

Mode "FTMO simulé" :
- Tailles 10k / 25k / 50k / 100k €
- 🎯 Profit target +10%
- 📉 Daily loss limit -5% (reset à minuit UTC)
- 📊 Max drawdown -10%
- Barres de progression visuelles + lock automatique si règle cassée

### 🌐 Données live

- API **TwelveData** gratuite (800 req/jour)
- Polling configurable : 10s / 30s / 60s / 120s
- Compteur de quota visible
- Indicateur "polling actif" + dernière refresh

### ☁️ Sync multi-device (GitHub Gist)

- Token PAT GitHub (scope `gist` uniquement)
- Sync auto : push debouncé 2.5s après chaque modif (annotations + paper + journal)
- Pull au boot si Gist plus récent
- Nuage indicateur dans la topbar (vert/jaune/rouge selon état)

### ✏ Annotations manuelles

Toolbar dessin : ligne horizontale · trendline · rectangle · label texte · 4 couleurs · gomme · effacer tout. Persistance localStorage.

### 📚 Pédagogie complète

- **Tuto débutant** (24 chapitres / 6 modules) — bases du marché, broker, levier, ordres, pièges, plan parcours
- **Cours ICT** (27 chapitres / 5 modules) — méthodologie complète Smart Money
- **11 quiz interactifs** (33+ questions) avec feedback + explications
- **Glossaire ICT** : 25 termes définis + recherche
- **Onboarding** : tour guidé au 1er lancement (8 étapes)
- **Présets workflow** : Reset / Contexte (H1) / Setup (H4) / Entrée (M15)
- Icônes ℹ sur chaque indicateur → ouvre direct le chapitre concerné

### 📱 Mobile UX (style MT5)

- **Bottom navigation** : 📈 Chart / 🛠 Outils / 💼 Trade / 📝 Journal / ⋯ Plus
- **PWA installable** (iOS / Android / Desktop)
- **Anti-zoom iOS** sur les inputs (font-size:16px forcé)
- **Safe-area-inset** pour notch iPhone
- **Swipe gesture** depuis bord droit → ouvre le drawer
- **Polish responsive** : modals, drag handles, R/R floating, PD Arrays adaptés

## 🚀 Utilisation

**En ligne** : ouvre https://jimtll.github.io/forex-eurusd-ict/

**En local** :
```bash
git clone https://github.com/Jimtll/forex-eurusd-ict.git
cd forex-eurusd-ict
python3 -m http.server 8000
# Ouvrir http://localhost:8000
```

**Pour les données live** :
1. Crée un compte gratuit sur [twelvedata.com](https://twelvedata.com)
2. Copie ta clé API
3. ⚙ Paramètres → coller la clé → "Activer mode Live"

## 🧠 Stack technique

- HTML/CSS/JS **vanilla** (zéro framework)
- [Lightweight Charts](https://github.com/tradingview/lightweight-charts) (chandeliers + axes)
- [Chart.js](https://www.chartjs.org/) (equity curve)
- [TwelveData API](https://twelvedata.com/) (données EUR/USD temps réel)
- **PWA** : Service Worker + Manifest
- **Persistance** : localStorage
- **Sync** : GitHub Gist API

## 📁 Architecture

```
forex-eurusd/
├── index.html         (798)  ← HTML pur + 15 <script src defer>
├── manifest.json             ← PWA
├── sw.js                     ← Service Worker
├── icon.svg                  ← Icône PWA
├── css/
│   └── style.css      (1543) ← Styling complet
├── tests/
│   └── test.html      (314)  ← 28/28 ✓ (fonctions pures)
├── tuto-debutant.html (1387) ← Page tuto autonome
└── js/                       ← 16 modules thématiques
    ├── content.js     (855)  ← data cours/glossaire/quiz/onboarding
    ├── mock.js        (287)  ← generators bougies + helpers
    ├── state.js       (100)  ← state global + constants
    ├── chart.js       (118)  ← init chart Lightweight + render OHLC
    ├── ict.js         (954)  ← détection + render ICT + cache compute
    ├── live.js        (173)  ← TwelveData API + polling + PWA + status
    ├── alerts.js      (120)  ← notifications navigateur
    ├── risk.js        (376)  ← calc position + R/R Visualizer + journal
    ├── backtest.js    (281)  ← backtester auto ICT
    ├── paper.js       (676)  ← paper trading + propfirm challenge
    ├── sync.js        (270)  ← sync GitHub Gist
    ├── annot.js       (405)  ← annotations + hover tooltip + news
    ├── replay.js      (103)  ← mode replay
    ├── courses.js     (257)  ← UI cours + glossaire + onboarding
    ├── ui.js          (539)  ← UI wiring + prefs + presets + mobile nav
    └── boot.js        (48)   ← DOMContentLoaded handler
```

## 🧪 Tests

```bash
# Ouvrir tests/test.html dans le navigateur
# 28/28 tests passent : detect ICT, mock, paper trading, backtester, risk
```

## 📐 Choix d'archi

- **Pas de framework** : projet simple, vanilla suffit, démo immédiate
- **Pas de bundler** : tout sert directement, GitHub Pages OK
- **Pas d'ES modules** : `<script src defer>` séquentiel + globals — simple à débugger
- **Persistance localStorage** : pas de backend, pas de comptes utilisateurs
- **Sync via Gist** : utilise GitHub comme backend gratuit
- **PWA installable** : marche offline (sauf data live), expérience native

## ⚠️ Disclaimer

Ce projet est un **outil pédagogique**. Il ne fournit pas de signaux de trading garantis. **70-85% des particuliers perdent en CFD** (statistique régulateur). Ne risque jamais plus que ce que tu peux te permettre de perdre.

L'auteur n'est pas conseiller en investissements. Tout trade est sous ta seule responsabilité.

## 📝 Status

✅ **v1.0 — Stable et complet** (mai 2026)

Toutes les features prévues sont livrées et testées. Le projet est entré en mode maintenance — utilisation quotidienne plutôt qu'ajout de features.

Voir [`tasks/todo.md`](tasks/todo.md) pour l'historique complet des sessions de développement (~20 commits sur main, 64 tâches résolues).
