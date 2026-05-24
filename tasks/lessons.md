# Leçons apprises sur Forex EUR/USD Dashboard

Format : `[date] | ce qui a mal tourné | règle pour l'éviter`

- 2026-05-23 | L'utilisateur a précisé qu'il veut `git push` à **chaque fin de message** (pas seulement quand on m'y demande). | À chaque fin de tour, si des fichiers du repo ont été modifiés : `git add -A && git commit && git push`. Sans demander. Si pas de modifs, rien à faire.
- 2026-05-23 | Le Service Worker (sw.js) servait les anciennes versions de l'app après chaque update, créant des bugs apparents (toggles manquants, fonctions absentes). | À chaque session qui modifie le HTML/CSS/JS, bumper `const CACHE = 'eurusd-ict-vN'` dans sw.js pour forcer la purge chez les utilisateurs PWA installés.
- 2026-05-23 | Activer 13 indicateurs ICT en même temps rend le chart illisible. Le débutant ne sait pas par où commencer. | Designer des **présets** ciblés (3-5 indicateurs max par préset, alignés sur un workflow ICT : Contexte / Setup / Entrée), pas des "active tout".
