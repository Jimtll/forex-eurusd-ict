# EUR/USD · ICT Dashboard

Dashboard de trading **EUR/USD** avec analyse **Smart Money Concepts** (méthodologie ICT) et cours pédagogiques intégrés pour débutants.

## 🚀 Démo en ligne

- 📊 **Dashboard** : https://jimtll.github.io/forex-eurusd-ict/
- 🎓 **Tuto débutant** : https://jimtll.github.io/forex-eurusd-ict/tuto-debutant.html

Aucune installation requise — tout tourne dans le navigateur.

## ✨ Fonctionnalités

### 📊 Dashboard ([`index.html`](index.html))

- **Chart temps réel** EUR/USD via TwelveData API (clé gratuite, 800 req/jour)
- **Mode mock** : générateur de bougies réalistes pour apprendre sans clé
- **Timeframes** : M15 / H1 / H4 / D1

### 🎯 13 indicateurs ICT activables

| Catégorie | Indicateurs |
|---|---|
| **Essentiels** | Swing Points · BOS/MSS · Liquidity (BSL/SSL + sweeps) · Order Blocks · FVG · Premium/Discount · Killzones |
| **Avancés** | Breaker Block · Inverted FVG · OTE · AMD Cycle · PD Arrays · IRL→ERL |

### 🛠 Outils de gestion de risque

- 📐 **Calculateur de position** : taille en lots selon capital + % risque + entrée + SL
- 🎯 **R/R Visualizer** : entrée / SL / TP avec ratio live
- 📝 **Journal de trades** : enregistrement + stats (winrate, R moyen, profit factor) + equity curve

### 📚 Pédagogie

- **Tuto débutant** ([`tuto-debutant.html`](tuto-debutant.html)) — 24 chapitres pour comprendre le marché de zéro (broker, levier, spread, ordres, pièges classiques)
- **Cours ICT** intégré au dashboard — 27 chapitres sur les Smart Money Concepts
- **Présets** : Apprentissage / Swing / Scalping (un clic active les bons indicateurs)
- **Icônes ℹ️** à côté de chaque indicateur → ouvre direct le chapitre concerné

## 🚀 Utilisation

**Option 1 — En ligne** : ouvre https://jimtll.github.io/forex-eurusd-ict/

**Option 2 — En local** :
1. Clone le repo : `git clone https://github.com/Jimtll/forex-eurusd-ict.git`
2. Ouvre `index.html` dans un navigateur moderne (ou sers avec `python3 -m http.server`)

**Pour les données live** : ⚙ Paramètres → coller ta [clé TwelveData gratuite](https://twelvedata.com/) → "Activer mode Live"

## 🧠 Stack technique

- HTML/CSS/JS vanilla (single-file, sans framework)
- [Lightweight Charts](https://github.com/tradingview/lightweight-charts) (rendu chandeliers + axes)
- [Chart.js](https://www.chartjs.org/) (equity curve du journal)
- [TwelveData API](https://twelvedata.com/) (données EUR/USD temps réel, optionnel)
- localStorage pour persistance (préférences, journal, clé API)

## 📁 Structure

```
forex-eurusd/
├── index.html           # Dashboard principal
├── tuto-debutant.html   # Tuto pour vraiment débuter (broker, levier, etc.)
├── README.md
└── tasks/
    ├── lessons.md       # Leçons apprises au fil des bugs
    └── todo.md          # Plan des phases (toutes complétées)
```

## ⚠️ Disclaimer

Ce projet est un **outil pédagogique**. Il ne fournit pas de signaux de trading garantis. Aucun indicateur algorithmique ne remplace un trader humain expérimenté. **Risque de perte totale** : 70-85% des particuliers perdent de l'argent en tradant des CFD. Ne risque jamais plus que ce que tu peux te permettre de perdre.

## 📝 Status

🚧 En cours — toutes les phases prévues (1-6 + cours + tuto débutant + quick wins UX) sont livrées. Voir [`tasks/todo.md`](tasks/todo.md) pour le détail.
