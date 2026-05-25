# Leçons apprises sur Forex EUR/USD Dashboard

Format : `[date] | ce qui a mal tourné | règle pour l'éviter`

- 2026-05-23 | L'utilisateur a précisé qu'il veut `git push` à **chaque fin de message** (pas seulement quand on m'y demande). | À chaque fin de tour, si des fichiers du repo ont été modifiés : `git add -A && git commit && git push`. Sans demander. Si pas de modifs, rien à faire.
- 2026-05-23 | Le Service Worker (sw.js) servait les anciennes versions de l'app après chaque update, créant des bugs apparents (toggles manquants, fonctions absentes). | À chaque session qui modifie le HTML/CSS/JS, bumper `const CACHE = 'eurusd-ict-vN'` dans sw.js pour forcer la purge chez les utilisateurs PWA installés.
- 2026-05-23 | Activer 13 indicateurs ICT en même temps rend le chart illisible. Le débutant ne sait pas par où commencer. | Designer des **présets** ciblés (3-5 indicateurs max par préset, alignés sur un workflow ICT : Contexte / Setup / Entrée), pas des "active tout".
- 2026-05-25 | Le fichier `index.html` avait grossi à ~7830 lignes (HTML + CSS + JS inline), devenant difficile à maintenir. Beaucoup de wrappers `_orig*` qui surchargeaient des fonctions existantes. | Refonte modulaire : extraire CSS dans `css/style.css`, JS dans 4 fichiers thématiques (`content.js`/`mock.js`/`ict.js`/`app.js`). Garder TOUT en variables globales (pas d'ES modules) pour éviter d'avoir à gérer imports/exports — l'ordre des `<script src>` suffit. Procéder par étapes avec test après chaque extraction, jamais en une seule passe.
- 2026-05-25 | iOS Safari zoome automatiquement sur les inputs quand leur font-size est <16px. Bug UX gênant au focus de champ. | Sur mobile (≤900px), force `input,textarea,select{font-size:16px !important}`. Sur desktop, garder les tailles custom.
