// ============================================================
// CONTENU PÉDAGOGIQUE (cours, glossaire, quiz, onboarding)
// Généré par extraction depuis index.html (refonte modulaire)
// ============================================================

const COURSE_MODULES = [
  { id: 'M1', title: '1. Les bases du trading forex', chapters: [
    { id: '1.1', title: 'Qu\'est-ce que le forex ?' },
    { id: '1.2', title: 'Lire un graphique en bougies' },
    { id: '1.3', title: 'Les pips et la taille de position' },
    { id: '1.4', title: 'Les timeframes' },
  ]},
  { id: 'M2', title: '2. ICT essentiels — Smart Money Concepts', chapters: [
    { id: '2.1', title: 'Le principe Smart Money vs Retail' },
    { id: '2.2', title: 'Swing Points : repérer highs & lows' },
    { id: '2.3', title: 'Structure : BOS vs MSS' },
    { id: '2.4', title: 'Liquidity — où sont les stops' },
    { id: '2.5', title: 'Liquidity Sweep — la manipulation' },
    { id: '2.6', title: 'Order Blocks (OB)' },
    { id: '2.7', title: 'Fair Value Gap (FVG)' },
    { id: '2.8', title: 'Premium / Discount' },
    { id: '2.9', title: 'Killzones — les heures qui comptent' },
  ]},
  { id: 'M3', title: '3. ICT avancés', chapters: [
    { id: '3.1', title: 'Breaker Block — l\'OB inversé' },
    { id: '3.2', title: 'Inverted FVG (IFVG)' },
    { id: '3.3', title: 'OTE — Optimal Trade Entry' },
    { id: '3.4', title: 'AMD — Accumulation / Manipulation / Distribution' },
    { id: '3.5', title: 'PD Arrays — la hiérarchie' },
    { id: '3.6', title: 'IRL → ERL' },
  ]},
  { id: 'M4', title: '4. Gestion de risque', chapters: [
    { id: '4.1', title: 'Le risque par trade (1-2%)' },
    { id: '4.2', title: 'Calculer sa taille de position' },
    { id: '4.3', title: 'Stop Loss & Take Profit' },
    { id: '4.4', title: 'Risk / Reward minimum' },
    { id: '4.5', title: 'Psychologie du trader' },
  ]},
  { id: 'M5', title: '5. Mettre tout ensemble', chapters: [
    { id: '5.1', title: 'Top-down analysis (D1 → M15)' },
    { id: '5.2', title: 'Routine de trading' },
    { id: '5.3', title: 'Tenir un journal' },
  ]},
];

const COURSES = {
  '1.1': `
    <span class="lesson-tag">Module 1 · Bases</span>
    <h1>Qu'est-ce que le forex ?</h1>
    <p>Le <strong>forex</strong> (FOReign EXchange) est le marché des devises. C'est le plus gros marché financier au monde : ~7 000 milliards de dollars échangés <em>par jour</em>. À côté, la bourse des actions est minuscule.</p>
    <h2>Ce qu'on trade vraiment</h2>
    <p>On trade des <strong>paires</strong> de devises : <em>EUR/USD</em>, <em>GBP/USD</em>, <em>USD/JPY</em>… Acheter EUR/USD = parier que l'euro va monter face au dollar. Vendre EUR/USD = parier l'inverse.</p>
    <p>Si EUR/USD passe de 1.0850 à 1.0900, ça veut dire qu'il faut maintenant 1.0900$ pour acheter 1€ (l'euro s'est apprécié).</p>
    <h2>Pourquoi EUR/USD ?</h2>
    <ul>
      <li><strong>Le plus liquide</strong> — spreads minuscules, exécution instantanée</li>
      <li><strong>Le plus prévisible</strong> — actif aux heures de Londres et New York</li>
      <li><strong>Le moins manipulé</strong> — gros volumes = moins d'aberrations</li>
    </ul>
    <div class="callout">
      <strong>À retenir.</strong> Le forex est un marché OTC (over-the-counter, de gré à gré). Pas de bourse centrale — ce sont les banques qui se font le marché entre elles. Personne ne le "contrôle", mais les grosses banques font les prix.
    </div>
  `,
  '1.2': `
    <span class="lesson-tag">Module 1 · Bases</span>
    <h1>Lire un graphique en bougies</h1>
    <p>Une <strong>bougie japonaise</strong> résume 4 informations sur une période donnée (1 minute, 1 heure, 1 jour…).</p>
    <h2>Les 4 prix d'une bougie</h2>
    <ul>
      <li><strong>Open (O)</strong> — prix d'ouverture de la période</li>
      <li><strong>High (H)</strong> — plus haut atteint</li>
      <li><strong>Low (L)</strong> — plus bas atteint</li>
      <li><strong>Close (C)</strong> — prix de clôture</li>
    </ul>
    <h2>Anatomie</h2>
    <p>La <strong>partie pleine</strong> (le corps) va de l'Open au Close. Les <strong>traits fins</strong> (les mèches / wicks) montent jusqu'au High et descendent jusqu'au Low.</p>
    <ul>
      <li>🟢 <strong>Verte</strong> : Close &gt; Open → la bougie a monté</li>
      <li>🔴 <strong>Rouge</strong> : Close &lt; Open → la bougie a baissé</li>
    </ul>
    <h2>Ce que ça veut dire</h2>
    <p>Une grosse mèche en bas avec un petit corps = le prix a été poussé bas puis racheté agressivement (acheteurs forts). C'est ce qu'on appelle un <em>rejection wick</em>, signe que des gros acteurs ont absorbé l'offre.</p>
    <div class="callout">
      <strong>Tip pratique.</strong> Sur le dashboard, le crosshair (la croix qui suit ta souris) affiche les 4 valeurs en haut à gauche. Survole les bougies pour t'habituer à lire OHLC.
    </div>
  `,
  '1.3': `
    <span class="lesson-tag">Module 1 · Bases</span>
    <h1>Les pips et la taille de position</h1>
    <h2>Le pip</h2>
    <p>Un <strong>pip</strong> = la 4ème décimale du prix. Sur EUR/USD à 1.08<u>5</u>0, le 5 est le pip. Si on passe à 1.0851, c'est <em>+1 pip</em>. De 1.0850 à 1.0900, c'est <em>+50 pips</em>.</p>
    <h2>La taille de position : "lot"</h2>
    <table>
      <tr><th>Type</th><th>Unités EUR</th><th>Valeur d'un pip ≈</th></tr>
      <tr><td>1 lot standard</td><td>100 000</td><td>10 $</td></tr>
      <tr><td>0.1 lot (mini)</td><td>10 000</td><td>1 $</td></tr>
      <tr><td>0.01 lot (micro)</td><td>1 000</td><td>0.10 $</td></tr>
    </table>
    <h2>Combien tu gagnes / perds ?</h2>
    <p>Tu achètes EUR/USD à 1.0850 avec <strong>0.5 lot</strong>. Le prix monte à 1.0900 (+50 pips). Tu fermes la position.</p>
    <p>Gain = 50 pips × 0.5 lot × 10$/pip/lot = <strong>250 $</strong>.</p>
    <div class="callout warn">
      <strong>Important.</strong> Si le marché va contre toi, tu perds la même chose. C'est pour ça qu'il faut <em>toujours</em> calculer sa taille de position en fonction de son risque maximum autorisé. Voir le module 4.
    </div>
  `,
  '1.4': `
    <span class="lesson-tag">Module 1 · Bases</span>
    <h1>Les timeframes</h1>
    <p>Un timeframe = la durée que représente <strong>une bougie</strong>. Sur le dashboard tu as M15, H1, H4, D1.</p>
    <table>
      <tr><th>TF</th><th>1 bougie =</th><th>Usage typique</th></tr>
      <tr><td>M15</td><td>15 min</td><td>Scalping, entrées précises</td></tr>
      <tr><td>H1</td><td>1 heure</td><td>Day trading, entrée swing</td></tr>
      <tr><td>H4</td><td>4 heures</td><td>Structure du jour, biais</td></tr>
      <tr><td>D1</td><td>1 jour</td><td>Tendance générale, niveaux majeurs</td></tr>
    </table>
    <h2>Le principe top-down</h2>
    <p>Les traders ICT analysent <strong>du grand au petit</strong> :</p>
    <ol>
      <li><strong>D1 / H4</strong> → quelle est la tendance majeure ? Suis-je en Premium ou Discount ?</li>
      <li><strong>H1</strong> → où sont les zones d'intérêt (OB, FVG, liquidité) ?</li>
      <li><strong>M15</strong> → quand est-ce que je rentre, précisément ?</li>
    </ol>
    <div class="callout">
      <strong>Règle d'or.</strong> N'entre jamais sur M15 contre la tendance H4. Les "petits TF" servent à <em>raffiner l'entrée</em>, pas à inventer une stratégie qui contredit le grand cadre.
    </div>
  `,
  '2.1': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Smart Money vs Retail</h1>
    <p>Le concept central de l'ICT (<em>Inner Circle Trader</em>) c'est : <strong>les gros acteurs (banques, hedge funds) ne tradent pas comme les particuliers</strong>.</p>
    <h2>Ce que fait le retail</h2>
    <ul>
      <li>Achète quand ça monte, vend quand ça baisse (FOMO)</li>
      <li>Met son stop loss "juste en dessous du dernier low" — donc à un endroit prévisible</li>
      <li>Suit les indicateurs classiques (RSI, MACD, moyennes mobiles)</li>
    </ul>
    <h2>Ce que fait le Smart Money</h2>
    <ul>
      <li><strong>Accumule</strong> ses positions là où personne ne regarde (zones plates, range Asia)</li>
      <li><strong>Manipule</strong> le prix au-delà des niveaux évidents pour <em>déclencher les stops du retail</em> et récupérer leur liquidité</li>
      <li><strong>Distribue</strong> ensuite, dans la direction réelle qu'il avait planifiée depuis le début</li>
    </ul>
    <div class="callout">
      <strong>L'intuition clé.</strong> Quand tu vois "le prix casse un support puis remonte instantanément" (= sweep), ce n'est pas un faux signal — c'est une <em>manipulation institutionnelle</em>. Toute la méthodologie ICT consiste à repérer ces patterns pour <em>trader avec le Smart Money</em>, pas contre.
    </div>
  `,
  '2.2': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Swing Points</h1>
    <p>Un <strong>swing high</strong> = un sommet local : une bougie qui a un high plus élevé que les voisines.<br>Un <strong>swing low</strong> = un creux local.</p>
    <h2>Détection algorithmique</h2>
    <p>Sur ce dashboard, on utilise des <strong>fractals n=2</strong> : une bougie est swing high si son high dépasse les 2 bougies à gauche ET les 2 bougies à droite. Symétrique pour le low.</p>
    <p>Active <em>Swing Points</em> dans le panel. Les ▼ marquent les highs, les ▲ marquent les lows.</p>
    <h2>Pourquoi c'est utile</h2>
    <ul>
      <li>Les swings <strong>structurent le marché</strong> — ils définissent les niveaux clés</li>
      <li>Au-dessus de chaque swing high, il y a de la <strong>liquidité</strong> (les stop-buys du retail short)</li>
      <li>Les <strong>cassures de swings</strong> donnent les signaux BOS/MSS</li>
    </ul>
    <div class="callout">
      <strong>Variante.</strong> Plus n est grand (n=3, n=5…), moins on a de swings mais ils sont plus "significatifs". n=2 donne beaucoup de swings — utile pour le micro-structurel sur petits TF.
    </div>
  `,
  '2.3': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Structure : BOS vs MSS</h1>
    <p>La <strong>structure</strong>, c'est la séquence des swings. Elle te dit si le marché monte, baisse, ou hésite.</p>
    <h2>Tendance haussière</h2>
    <p>Higher Highs (HH) + Higher Lows (HL). Chaque pic est plus haut que le précédent, chaque creux aussi.</p>
    <h2>Tendance baissière</h2>
    <p>Lower Highs (LH) + Lower Lows (LL).</p>
    <h2>BOS — Break of Structure</h2>
    <p>Cassure d'un swing <strong>dans le sens du trend</strong> = continuation. En tendance haussière, un BOS = nouveau HH. <em>Bonne nouvelle pour les longs.</em></p>
    <h2>MSS — Market Structure Shift</h2>
    <p>Cassure d'un swing <strong>contre le trend</strong> = changement potentiel de direction. Aussi appelé <em>CHoCH</em> (Change of Character). En tendance haussière, un MSS = cassure d'un swing low récent.</p>
    <p>Sur le dashboard : BOS = ligne pointillée verte (up) ou rouge (down), MSS = ligne dash-dot jaune.</p>
    <div class="callout warn">
      <strong>Un MSS seul ne suffit pas.</strong> C'est un <em>premier indice</em> de retournement. Attends qu'un nouveau swing se forme dans la nouvelle direction (par exemple : MSS down → puis un LH → puis BOS down) pour confirmer.
    </div>
  `,
  '2.4': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Liquidity — où sont les stops</h1>
    <p>La <strong>liquidité</strong>, c'est où le retail a placé ses ordres. C'est ce que le Smart Money va chercher.</p>
    <h2>BSL — Buy Side Liquidity</h2>
    <p>Au-dessus d'un swing high, il y a deux types d'ordres :</p>
    <ul>
      <li>Les <strong>stop loss</strong> des vendeurs (qui sont short) — ce sont des buy stops</li>
      <li>Les <strong>buy stops</strong> de breakout traders qui veulent "acheter la cassure"</li>
    </ul>
    <p>Tous ces ordres = de la liquidité pour les institutions. Si elles veulent vendre gros, elles ont besoin d'acheteurs en face. Donc elles <strong>poussent le prix au-dessus du high</strong> pour activer ces ordres → puis vendent dans cette liquidité.</p>
    <h2>SSL — Sell Side Liquidity</h2>
    <p>Inverse : sous un swing low, il y a les stops des acheteurs + les sell stops des breakout traders. C'est la liquidité côté vente.</p>
    <h2>Equal highs / Equal lows</h2>
    <p>Quand plusieurs swings sont au même niveau, la liquidité est <strong>concentrée</strong> = cible privilégiée des institutions.</p>
    <div class="callout">
      <strong>Sur le dashboard.</strong> Active <em>Liquidity</em> : les lignes bleues = BSL, les lignes oranges = SSL. Une fois "swept" (prises), elles disparaissent.
    </div>
  `,
  '2.5': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Liquidity Sweep — la manipulation</h1>
    <p>Un <strong>sweep</strong> = quand le prix dépasse brièvement un niveau de liquidité (BSL ou SSL) puis revient immédiatement. La fameuse "mèche" sur la bougie.</p>
    <h2>Mécanique</h2>
    <ol>
      <li>Le prix monte au-dessus du swing high (les buy stops s'activent)</li>
      <li>Les institutions vendent dans cette demande artificielle</li>
      <li>Le prix retombe sous le swing high → close de l'autre côté</li>
      <li>Tous les traders qui ont acheté la cassure sont coincés en perte</li>
    </ol>
    <h2>Comment le repérer</h2>
    <ul>
      <li>Bougie avec une <strong>longue mèche</strong> au-dessus d'un swing high récent</li>
      <li>Close de la bougie <strong>en dessous</strong> du swing high (signe de rejet)</li>
      <li>Idéalement pendant une <em>killzone</em> (London Open ou NY Open)</li>
    </ul>
    <p>Sur le dashboard, les sweeps sont marqués par des <strong>points jaunes</strong> quand tu actives Liquidity.</p>
    <div class="callout">
      <strong>Setup gagnant.</strong> Sweep d'un BSL → confirmation MSS down sur LTF → entrée short avec SL au-dessus du high du sweep → TP sur le prochain SSL. C'est le pattern A+ de l'ICT.
    </div>
  `,
  '2.6': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Order Blocks (OB)</h1>
    <p>Un <strong>Order Block</strong> = la dernière bougie de couleur opposée juste avant un mouvement impulsif qui casse la structure. C'est là où les institutions ont placé leurs ordres.</p>
    <h2>OB bullish</h2>
    <p>Dernière bougie <strong>rouge</strong> avant une impulsion haussière qui produit un BOS up. La zone (du low au high de cette bougie) devient un support institutionnel.</p>
    <h2>OB bearish</h2>
    <p>Dernière bougie <strong>verte</strong> avant une impulsion baissière qui produit un BOS down. Résistance institutionnelle.</p>
    <h2>Mitigation</h2>
    <p>Tant que le prix n'est pas revenu toucher la zone, l'OB est "actif". Quand le prix revient le toucher après s'être éloigné, on dit qu'il est <strong>mitigé</strong>. C'est souvent un point de rejet (= bonne entrée).</p>
    <div class="callout warn">
      <strong>Tous les OBs ne se valent pas.</strong> Les meilleurs sont ceux qui :
      <ol>
        <li>Sont à l'origine d'un mouvement impulsif fort (gros déplacement après)</li>
        <li>Contiennent un FVG dans l'impulsion qui suit</li>
        <li>Sont en zone <em>Discount</em> (pour les bullish) ou <em>Premium</em> (pour les bearish)</li>
      </ol>
    </div>
  `,
  '2.7': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Fair Value Gap (FVG)</h1>
    <p>Un <strong>FVG</strong> = un "déséquilibre" de prix : un trou entre 3 bougies consécutives qui montre qu'il n'y a pas eu d'échanges à certains niveaux.</p>
    <h2>FVG bullish</h2>
    <p>Quand <code>low[i+1] &gt; high[i-1]</code>. La bougie du milieu a fait un grand saut haussier sans que le prix ne revienne combler entre le high de la bougie n-1 et le low de la bougie n+1.</p>
    <h2>FVG bearish</h2>
    <p>Inverse : <code>high[i+1] &lt; low[i-1]</code>.</p>
    <h2>Pourquoi c'est utile</h2>
    <p>Le marché "aime" combler ces gaps. Le prix tend à revenir tester la zone du FVG. Ça donne deux usages :</p>
    <ul>
      <li><strong>Point d'entrée</strong> : prix revient dans le FVG → entrée dans le sens du trend</li>
      <li><strong>Cible</strong> : un FVG non comblé en haut/bas est une cible naturelle</li>
    </ul>
    <div class="callout">
      <strong>Confluence puissante.</strong> Un FVG <em>à l'intérieur</em> d'un Order Block est ce qu'ICT appelle un "Sweet Spot" — c'est l'endroit le plus précis pour entrer.
    </div>
  `,
  '2.8': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Premium / Discount</h1>
    <p>Le concept est simple : <strong>acheter en discount, vendre en premium</strong>. Comme dans n'importe quel marché : tu veux acheter pas cher et vendre cher.</p>
    <h2>Définir le range</h2>
    <p>Range = du dernier <strong>swing low</strong> au dernier <strong>swing high</strong> significatifs.</p>
    <ul>
      <li>Au-dessus du milieu (50%) = <strong>Premium</strong> → zone de vente</li>
      <li>En dessous du milieu = <strong>Discount</strong> → zone d'achat</li>
      <li>À 50% = <strong>Equilibrium</strong> → ni acheter ni vendre, attendre</li>
    </ul>
    <h2>Sur le dashboard</h2>
    <p>Active <em>Premium/Discount</em>. Tu vois 3 lignes : Range High (bleu), Equilibrium 50% (gris pointillé), Range Low (rouge). N'achète <strong>jamais</strong> au-dessus de la ligne grise. Ne vends <strong>jamais</strong> en dessous.</p>
    <div class="callout">
      <strong>Application.</strong> Tu vois un OB bullish. Avant d'acheter, regarde : est-ce qu'il est sous l'Equilibrium (Discount) ? Si oui = bonne entrée. Si non = laisse passer, ce n'est pas un Smart Money trade.
    </div>
  `,
  '2.9': `
    <span class="lesson-tag">Module 2 · ICT</span>
    <h1>Killzones — les heures qui comptent</h1>
    <p>Le marché ne bouge pas pareil toute la journée. 80% des mouvements significatifs se font pendant 3 fenêtres horaires précises (en heure GMT).</p>
    <table>
      <tr><th>Killzone</th><th>Heure GMT</th><th>Caractère</th></tr>
      <tr><td>🌙 Asia</td><td>20:00 → 00:00</td><td>Range, accumulation</td></tr>
      <tr><td>🇬🇧 London Open</td><td>07:00 → 10:00</td><td>Manipulation, faux moves</td></tr>
      <tr><td>🇺🇸 NY Open</td><td>12:00 → 15:00</td><td>Vrai mouvement, distribution</td></tr>
    </table>
    <h2>Pourquoi c'est crucial</h2>
    <ul>
      <li>En dehors des killzones : <strong>spreads larges</strong>, mouvements aléatoires, pièges</li>
      <li>Pendant les killzones : <strong>volume institutionnel</strong>, setups propres</li>
    </ul>
    <h2>Sur le dashboard</h2>
    <p>Active <em>Killzones</em> pour voir les bandes verticales colorées. Trade <strong>uniquement</strong> pendant ces fenêtres en tant que débutant.</p>
    <div class="callout danger">
      <strong>Règle stricte.</strong> Si ton setup arrive entre 03:00 et 06:00 GMT (hors killzone), <em>passe ton tour</em>. C'est mieux de manquer un trade que de prendre un mauvais signal.
    </div>
  `,
  '3.1': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>Breaker Block (BB)</h1>
    <p>Un <strong>Breaker Block</strong> = un Order Block qui a été <em>cassé</em> (mitigé) et qui change de polarité.</p>
    <h2>Le mécanisme</h2>
    <ol>
      <li>Tu as un OB bullish (support institutionnel)</li>
      <li>Le prix revient dans la zone (mitigation)</li>
      <li>Le prix <strong>casse au-delà</strong> de l'OB — il ne tient pas</li>
      <li>L'OB devient maintenant une <strong>résistance</strong> : c'est un Breaker Block bearish</li>
    </ol>
    <h2>Pourquoi c'est utile</h2>
    <p>Une zone qui a échoué dans son rôle initial montre que la dynamique a changé. Si elle a échoué comme support, elle a de bonnes chances d'agir comme résistance ensuite (les buyers qui s'y étaient placés veulent maintenant sortir au break-even).</p>
    <div class="callout">
      <strong>Sur le dashboard.</strong> Active <em>Breaker Block</em>. Tu verras des rectangles violets/roses (couleurs neutres, ni vert ni rouge, car la polarité a changé). Le BB est dessiné à partir du moment où l'OB a été mitigé.
    </div>
  `,
  '3.2': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>Inverted FVG (IFVG)</h1>
    <p>Même logique que le Breaker Block, mais sur un FVG.</p>
    <p>Un FVG bullish qui se fait <strong>combler entièrement</strong> (le prix le traverse) devient un FVG <em>inversé</em> — il agit maintenant comme résistance.</p>
    <h2>Application</h2>
    <ul>
      <li>FVG bullish → comblé puis cassé → devient zone de vente</li>
      <li>FVG bearish → comblé puis cassé → devient zone d'achat</li>
    </ul>
    <p>Sur le dashboard, IFVG est en couleurs bleu/rose pâles pour les distinguer des FVG actifs.</p>
    <div class="callout warn">
      <strong>Subtilité.</strong> Un FVG <em>partiellement</em> rempli n'est pas un IFVG, c'est juste un FVG mitigé. Il faut que le prix le traverse <em>entièrement</em> (touche le bord opposé) pour vraiment "flipper".
    </div>
  `,
  '3.3': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>OTE — Optimal Trade Entry</h1>
    <p>L'<strong>OTE</strong> c'est la zone idéale de retracement pour entrer dans le sens du trend. Elle se base sur les niveaux de Fibonacci.</p>
    <h2>Comment ça marche</h2>
    <p>Sur la dernière jambe impulsive (du swing low au swing high pour un trend up), on dessine 3 niveaux Fib :</p>
    <ul>
      <li><strong>62%</strong> — retracement minimum acceptable</li>
      <li><strong>70.5%</strong> — sweet spot</li>
      <li><strong>79%</strong> — retracement maximum (au-delà, le trend est probablement cassé)</li>
    </ul>
    <p>La zone entre 62% et 79% est l'<strong>OTE</strong>.</p>
    <h2>Combiner avec ce qu'on sait déjà</h2>
    <p>Un OB ou un FVG situé dans la zone OTE = setup A+. Tu as :</p>
    <ul>
      <li>Retracement profond (62-79%) → bon prix</li>
      <li>Zone institutionnelle (OB/FVG) → vraie réaction probable</li>
      <li>Trend toujours en place → vent dans le dos</li>
    </ul>
    <div class="callout">
      <strong>Sur le dashboard.</strong> Active <em>OTE</em>. La zone fib est calculée automatiquement sur la dernière jambe détectée.
    </div>
  `,
  '3.4': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>AMD — Accumulation / Manipulation / Distribution</h1>
    <p>L'<strong>AMD</strong> c'est le cycle journalier des institutions. Trois phases qui se répètent.</p>
    <h2>A — Accumulation (Asia)</h2>
    <p>00h-07h GMT. Le marché est calme, range serré. Les institutions <strong>accumulent</strong> discrètement leur position dans cette range.</p>
    <h2>M — Manipulation (London Open)</h2>
    <p>07h-12h GMT. Le marché fait un <em>faux move</em> dans la direction opposée à celle que les institutions veulent. Objectif : piéger le retail (qui suit le breakout) et <strong>collecter la liquidité</strong> de l'autre côté.</p>
    <h2>D — Distribution (NY)</h2>
    <p>12h-22h GMT. Le marché part dans la <strong>vraie direction</strong>. Les institutions distribuent (= vendent ce qu'elles ont accumulé en bénéfice).</p>
    <div class="callout">
      <strong>Setup typique.</strong> Asia range défini → London "sweep" un côté du range (manipulation) → NY explose dans l'autre direction. Si tu comprends ce cycle, tu sais qu'il ne faut <em>pas</em> trader le breakout de London.
    </div>
  `,
  '3.5': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>PD Arrays — la hiérarchie</h1>
    <p>Un <strong>PD Array</strong> (Premium/Discount Array) c'est juste un terme générique pour <em>toute zone</em> Smart Money : OB, FVG, BB, IFVG.</p>
    <h2>La classification</h2>
    <p>Une fois qu'on a défini un range (Premium/Discount), on classe <strong>tous</strong> les arrays selon leur position :</p>
    <ul>
      <li>Arrays en <strong>Premium</strong> (au-dessus de l'équilibre) → cibles de vente</li>
      <li>Arrays en <strong>Discount</strong> (en dessous) → cibles d'achat</li>
    </ul>
    <h2>L'ordre d'engagement</h2>
    <p>ICT a aussi une "hiérarchie" interne :</p>
    <ol>
      <li>Order Block (le plus fort)</li>
      <li>Breaker Block</li>
      <li>FVG</li>
      <li>Inverted FVG</li>
    </ol>
    <p>Dans une zone OTE en Discount, si tu vois un OB bullish, il a priorité sur un FVG bullish du même secteur.</p>
    <div class="callout">
      <strong>Sur le dashboard.</strong> Active <em>PD Arrays</em>. Un panneau s'ouvre à droite du chart, listant tous les arrays actifs classés Premium / Discount. Ça permet d'avoir une vue d'ensemble sans regarder chaque zone une par une.
    </div>
  `,
  '3.6': `
    <span class="lesson-tag">Module 3 · Avancé</span>
    <h1>IRL → ERL</h1>
    <p><strong>IRL</strong> = Internal Range Liquidity (liquidité interne au range = les FVG / OB entre les swings).<br><strong>ERL</strong> = External Range Liquidity (liquidité externe = les swing highs/lows eux-mêmes).</p>
    <h2>Le principe</h2>
    <p>Le marché alterne entre deux comportements :</p>
    <ul>
      <li>Quand on est en IRL → on cherche à aller chercher l'ERL (les extrêmes du range)</li>
      <li>Quand on est en ERL (ex: après un sweep d'un swing high) → on cherche à revenir vers l'IRL (un FVG/OB intérieur)</li>
    </ul>
    <h2>Application pratique</h2>
    <p>Tu vois le prix dans un FVG bullish au milieu du range. Si tu rentres long, ta <strong>première cible</strong> ce n'est <em>pas</em> +100 pips au pif — c'est le prochain <strong>swing high externe</strong> (= ERL côté buy).</p>
    <div class="callout">
      <strong>Sur le dashboard.</strong> Active <em>IRL → ERL</em>. Une flèche violette part du dernier FVG/OB interne actif vers le swing externe cible (le Range High si bullish, le Range Low si bearish). C'est ta destination logique.
    </div>
  `,
  '4.1': `
    <span class="lesson-tag">Module 4 · Risk</span>
    <h1>Le risque par trade (1-2%)</h1>
    <p>La <strong>seule règle non-négociable</strong> du trading : ne risque jamais plus de <strong>1 à 2% de ton capital</strong> sur un seul trade.</p>
    <h2>Pourquoi ?</h2>
    <p>Imagine que tu risques 10% par trade. 5 trades perdants d'affilée → tu as perdu 41% de ton capital. Et 5 trades perdants d'affilée, ça arrive à tout le monde.</p>
    <p>Avec 1% par trade : 5 pertes = -4.9%. Tu te relèves. 10 pertes = -9.6%. Toujours là.</p>
    <h2>Le calcul</h2>
    <p>Capital = 10 000 €. Risque par trade = 1% = <strong>100 €</strong>. Tu places ta taille de position de manière à ce que <em>si ton SL est touché, tu perdes exactement 100 €</em>. Ni plus, ni moins.</p>
    <div class="callout danger">
      <strong>Erreur classique du débutant.</strong> "J'ai vu un super setup, je mise gros." Non. Le marché ne te récompense <em>jamais</em> pour avoir misé plus que ton plan. Un super setup avec 1% de risque te rapportera autant en % qu'un setup moyen avec la même taille. La discipline > la conviction.
    </div>
  `,
  '4.2': `
    <span class="lesson-tag">Module 4 · Risk</span>
    <h1>Calculer sa taille de position</h1>
    <p>Une formule simple :</p>
    <p><strong>Taille (lots) = (Capital × Risque%) / (Distance SL en pips × 10€/pip)</strong></p>
    <h2>Exemple</h2>
    <ul>
      <li>Capital : 5 000 €</li>
      <li>Risque : 1% = 50 €</li>
      <li>Entrée : 1.0850</li>
      <li>SL : 1.0830 (= 20 pips)</li>
    </ul>
    <p>Taille = 50 / (20 × 10) = <strong>0.25 lot</strong>.</p>
    <p>Si SL est touché → tu perds 20 pips × 0.25 lot × 10$/pip = 50 € ✓</p>
    <h2>Sur le dashboard</h2>
    <p>Ouvre <em>📐 Calculateur de position</em> (panel Gestion de risque). Saisis ton capital, ton risque, ton entrée, ton SL → il calcule la taille automatiquement.</p>
    <div class="callout">
      <strong>Astuce.</strong> Le bouton "🎯 Prix actuel" remplit l'entrée avec le prix actuel et place un SL par défaut 50 pips plus bas. Ajuste ensuite à ton setup réel.
    </div>
  `,
  '4.3': `
    <span class="lesson-tag">Module 4 · Risk</span>
    <h1>Stop Loss & Take Profit</h1>
    <h2>Où placer le SL ?</h2>
    <p>Pas "à 20 pips" — <strong>à un endroit logique</strong> où ton setup est invalidé.</p>
    <ul>
      <li>Long sur OB bullish → SL <strong>juste en dessous</strong> de l'OB (low de l'OB - quelques pips)</li>
      <li>Long après sweep d'un SSL → SL sous le low du sweep</li>
      <li>Short sur OB bearish → SL au-dessus du high de l'OB</li>
    </ul>
    <h2>Où placer le TP ?</h2>
    <p>Sur des <strong>cibles logiques</strong>, pas des chiffres ronds :</p>
    <ul>
      <li>Prochaine liquidité (BSL si long, SSL si short)</li>
      <li>FVG non comblé en chemin (TP partiel)</li>
      <li>Swing high/low externe (ERL)</li>
    </ul>
    <div class="callout warn">
      <strong>Ne déplace JAMAIS ton SL contre toi.</strong> Si ton SL est touché, c'est que ton setup est invalidé. Encaisse la perte et passe au suivant. Déplacer le SL "juste un peu plus loin" = la mort lente du compte.
    </div>
  `,
  '4.4': `
    <span class="lesson-tag">Module 4 · Risk</span>
    <h1>Risk / Reward minimum</h1>
    <p>Le <strong>R:R</strong> = ratio entre ce que tu risques et ce que tu peux gagner.</p>
    <h2>Le minimum acceptable</h2>
    <p><strong>1:2 minimum.</strong> Si tu risques 100€, ton TP doit te rapporter au moins 200€.</p>
    <h2>Pourquoi ?</h2>
    <p>Même avec un winrate de 40% (= tu perds 6 trades sur 10), tu es rentable :</p>
    <ul>
      <li>4 wins × 2R = +8R</li>
      <li>6 losses × 1R = -6R</li>
      <li><strong>Total = +2R</strong></li>
    </ul>
    <p>Avec un R:R 1:3, même un winrate de 33% suffit. C'est ce qui rend l'ICT efficace : peu de trades, mais avec un R:R élevé.</p>
    <h2>Sur le dashboard</h2>
    <p>Active le <em>🎯 R/R Visualizer</em> dans le panel risque. Saisis Entry / SL / TP, le ratio s'affiche en haut du chart. Couleur :</p>
    <ul>
      <li>🟢 Vert si R:R ≥ 2 (trade OK)</li>
      <li>⚪ Neutre si entre 1 et 2 (limite)</li>
      <li>🔴 Rouge si &lt; 1 (à refuser)</li>
    </ul>
    <div class="callout">
      <strong>Aussi.</strong> Si tu ne peux pas viser au moins 1:2, ne prends pas le trade. Mieux vaut rater une opportunité qu'attaquer une opportunité médiocre.
    </div>
  `,
  '4.5': `
    <span class="lesson-tag">Module 4 · Risk</span>
    <h1>Psychologie du trader</h1>
    <p>Le trading est <strong>80% mental</strong>, 20% technique. Les pièges psychologiques courants :</p>
    <h2>Le revenge trade</h2>
    <p>Tu prends une perte. Frustré, tu prends un trade <em>juste après</em>, plus gros, pour "te refaire". Résultat : tu doubles la perte. <strong>Règle : après une perte, ferme la plateforme pendant 1h.</strong></p>
    <h2>Le FOMO</h2>
    <p>Le marché part sans toi. Tu rentres en panique <em>après</em> le move. Tu prends l'entrée au plus mauvais prix. <strong>Règle : si tu n'étais pas prêt avec un setup avant le move, tu ne rentres pas.</strong></p>
    <h2>L'overconfidence</h2>
    <p>Tu enchaînes 3 wins. Tu te sens invincible. Tu augmentes la taille. Tu perds tout. <strong>Règle : ta taille de position ne dépend QUE du calculateur, jamais de ton état d'esprit.</strong></p>
    <h2>L'analysis paralysis</h2>
    <p>Tu analyses pendant 2h. Tu ne rentres jamais. Le setup passe. <strong>Règle : un plan simple exécuté bat un plan parfait jamais exécuté.</strong></p>
    <div class="callout">
      <strong>Outil.</strong> Le journal de trades (📝 Journal) te force à <em>écrire</em> ce que tu fais et pourquoi. C'est le meilleur antidote aux biais. Relis tes notes une fois par semaine.
    </div>
  `,
  '5.1': `
    <span class="lesson-tag">Module 5 · Mise en pratique</span>
    <h1>Top-down analysis (D1 → M15)</h1>
    <p>L'analyse <strong>top-down</strong> = on part du grand cadre et on zoome.</p>
    <h2>Étape 1 — D1</h2>
    <ul>
      <li>Tendance générale : haussière, baissière, range ?</li>
      <li>Quel est le range actuel (Premium ou Discount) ?</li>
      <li>Y a-t-il un OB / FVG D1 non mitigé ?</li>
    </ul>
    <p>→ <em>Conclusion D1</em> : "Je cherche des longs (ou shorts) en priorité."</p>
    <h2>Étape 2 — H4</h2>
    <ul>
      <li>Structure cohérente avec D1 ?</li>
      <li>Où sont les zones OB / FVG H4 dans le sens du biais D1 ?</li>
      <li>Y a-t-il de la liquidité non prise (BSL/SSL) ?</li>
    </ul>
    <h2>Étape 3 — H1</h2>
    <ul>
      <li>Quelle killzone arrive ?</li>
      <li>Le prix est-il en train de set up un sweep ?</li>
      <li>OB / FVG H1 qui converge avec H4 ?</li>
    </ul>
    <h2>Étape 4 — M15</h2>
    <ul>
      <li>Confirmation MSS dans le sens du biais</li>
      <li>Entrée précise sur un FVG / OB M15</li>
      <li>SL serré, TP sur la liquidité H1/H4</li>
    </ul>
    <div class="callout">
      <strong>Règle d'or.</strong> Le M15 sert <em>uniquement</em> à raffiner l'entrée. Le biais (long ou short) vient toujours du H4 et au-dessus.
    </div>
  `,
  '5.2': `
    <span class="lesson-tag">Module 5 · Mise en pratique</span>
    <h1>Routine de trading quotidienne</h1>
    <h2>Avant la session (15 min)</h2>
    <ol>
      <li>Check D1 & H4 : tendance, niveaux clés, zones non mitigées</li>
      <li>Identifier les killzones de la journée</li>
      <li>Définir 1-2 setups potentiels avec entrée / SL / TP planifiés</li>
      <li>Calculer la taille de position pour chaque setup</li>
    </ol>
    <h2>Pendant la killzone (3h max)</h2>
    <ol>
      <li>Surveiller M15 / H1 pour la confirmation</li>
      <li>Exécuter uniquement les setups planifiés (pas d'improvisation)</li>
      <li>Notes mentales : "ce que je vois", "ce que ça veut dire"</li>
    </ol>
    <h2>Après la session (10 min)</h2>
    <ol>
      <li>Logger chaque trade dans le journal (gagné ou perdu)</li>
      <li>Screenshot du setup + commentaire</li>
      <li>Une phrase : "ce que j'ai bien fait", "ce que je peux améliorer"</li>
    </ol>
    <div class="callout warn">
      <strong>Limite quotidienne.</strong> 2 trades max par jour. Si tu perds 2 fois → arrêt. Tu reviens demain. C'est la règle qui sauve les comptes.
    </div>
  `,
  '5.3': `
    <span class="lesson-tag">Module 5 · Mise en pratique</span>
    <h1>Tenir un journal</h1>
    <p>Un trader sans journal = un athlète sans entraînement. Tu ne peux pas <strong>progresser</strong> sans relire ce que tu as fait.</p>
    <h2>Ce qu'il faut noter</h2>
    <ul>
      <li><strong>Date</strong> et heure du trade</li>
      <li><strong>Sens</strong> (long / short)</li>
      <li><strong>Entry / SL / TP</strong> exacts</li>
      <li><strong>Setup type</strong> (OB, FVG, OTE, sweep…)</li>
      <li><strong>Résultat en R</strong> (1R = ce que tu risquais)</li>
      <li><strong>Notes</strong> : confluence utilisée, killzone, état d'esprit</li>
    </ul>
    <h2>Que regarder dans les stats</h2>
    <ul>
      <li><strong>Winrate</strong> — pas si critique en lui-même</li>
      <li><strong>R moyen</strong> — combien tu gagnes en moyenne par trade (en R)</li>
      <li><strong>Profit factor</strong> — gain total / perte totale. &gt; 1.5 = bon</li>
      <li><strong>Equity curve</strong> — courbe ascendante = bon ; en dents de scie = problème de discipline</li>
    </ul>
    <h2>Sur le dashboard</h2>
    <p>Ouvre <em>📝 Journal de trades</em>. Logger un trade prend 30s. Tes stats se calculent automatiquement. Tout est stocké en local sur ton navigateur (rien n'est envoyé en ligne).</p>
    <div class="callout">
      <strong>Conseil final.</strong> Relis ton journal <em>une fois par semaine</em>. Cherche les patterns. Tu trouveras rapidement que certains setups marchent mieux que d'autres pour toi. Spécialise-toi sur ceux-là.
    </div>
  `,
};

const COURSE_QUIZZES = {
  '1.4': {
    title: 'Quiz — Module 1 : Bases du trading forex',
    after: 'Avant d\'attaquer le ICT, vérifions les bases :',
    questions: [
      {
        q: 'Une bougie verte signifie :',
        options: ['Le high est plus haut que la précédente', 'Close > Open : la période s\'est terminée plus haut qu\'elle n\'a ouvert', 'Le marché est haussier'],
        correct: 1,
        explain: 'Vert = bullish (close > open). Le corps va de l\'open au close, les mèches indiquent les extrêmes touchés pendant la période.',
      },
      {
        q: 'Le timeframe H1 sert principalement à :',
        options: ['Définir le contexte général (biais)', 'Trouver les zones intermédiaires + entrées swing', 'Faire du scalping ultra-rapide'],
        correct: 1,
        explain: 'D1/H4 = biais général. H1 = zones intermédiaires + entrée swing. M15/M5 = raffinage de l\'entrée. M1 = scalping (à éviter pour débutant).',
      },
      {
        q: 'L\'approche top-down ICT consiste à :',
        options: ['Trader uniquement sur D1 pour éviter le bruit', 'Analyser du grand TF (D1/H4) vers le petit (M15)', 'Mélanger toutes les TF en même temps'],
        correct: 1,
        explain: 'Top-down = top (grand TF) → down (petit TF). On part du biais D1/H4, on identifie les zones H1, on raffine l\'entrée M15. Jamais l\'inverse.',
      },
    ],
  },
  '3.6': {
    title: 'Quiz — Module 3 : ICT avancés',
    after: 'Tu maîtrises les concepts avancés ? Test :',
    questions: [
      {
        q: 'Un Breaker Block, c\'est :',
        options: ['Un OB plus fort que les autres', 'Un OB qui s\'est fait mitigé puis cassé → flip de polarité', 'Un OB en zone Premium'],
        correct: 1,
        explain: 'BB = un OB qui n\'a pas tenu son rôle initial. Il a été mitigé puis cassé. Il devient alors une zone de polarité INVERSE (un OB bullish cassé → devient résistance bearish).',
      },
      {
        q: 'La zone OTE (Optimal Trade Entry) se situe :',
        options: ['Entre 0 et 50% de retracement Fibonacci', 'Entre 62% et 79% de retracement Fibonacci', 'Au-delà de 100% (extension)'],
        correct: 1,
        explain: 'OTE = zone fib 62-79%. C\'est un retracement profond mais pas trop. Au-delà de 79%, le trend est probablement cassé. La zone idéale pour entrer dans le sens du trend après un pullback.',
      },
      {
        q: 'Dans le cycle AMD (Accumulation/Manipulation/Distribution) :',
        options: ['Asia = vrai move, London = consolidation, NY = manipulation', 'Asia = accumulation, London = manipulation (faux move), NY = vrai move', 'Tous les marchés se valent, peu importe la session'],
        correct: 1,
        explain: 'AMD ICT classique : Asia accumulate (range), London manipulate (faux move pour piéger le retail), NY distribute (vrai move dans la direction macro). Si tu comprends ça, tu sais qu\'il ne faut PAS trader le breakout London.',
      },
      {
        q: 'IRL → ERL signifie :',
        options: ['Le marché va toujours vers la liquidité externe (swing highs/lows)', 'Internal Range Lows → External Range Lows', 'Pas de signification ICT'],
        correct: 0,
        explain: 'IRL (Internal Range Liquidity = FVG/OB intérieurs au range) attire le marché vers ERL (External Range Liquidity = swing highs/lows externes). Quand tu rentres sur un IRL, ta cible logique c\'est l\'ERL le plus proche.',
      },
    ],
  },
  '5.3': {
    title: 'Quiz — Module 5 : Mettre tout ensemble',
    after: 'Le test final — appliquer en pratique :',
    questions: [
      {
        q: 'Setup idéal A+ pour un long :',
        options: ['OB bullish + zone Premium + killzone Asia', 'OB bullish + zone Discount + killzone London/NY + FVG dans impulsion', 'N\'importe quel OB bullish suffit'],
        correct: 1,
        explain: 'A+ = max de confluences. OB bullish (zone institutionnelle), Discount (acheter pas cher), killzone (volume), FVG dans l\'impulsion (signe de displacement). Score 4-5/5 dans le dashboard.',
      },
      {
        q: 'Tu vois un setup A+ mais en dehors des killzones (à 4h GMT) :',
        options: ['Tu trades quand même, c\'est un A+', 'Tu passes ton tour. Spreads larges + manque de volume', 'Tu attends que ça vienne dans la killzone'],
        correct: 1,
        explain: 'Hors killzone = spreads x2-3, moves aléatoires, pas de smart money. Même un setup "parfait" sur le papier rate souvent. Mieux vaut rater un trade que prendre un mauvais moment.',
      },
      {
        q: 'Combien de trades par semaine en moyenne pour un trader ICT discipliné ?',
        options: ['20+ pour multiplier les chances', '5-10 trades A+ seulement', '50+ pour vivre du trading'],
        correct: 1,
        explain: 'Qualité > quantité. 5-10 trades A+ par semaine donnent souvent de meilleurs résultats que 50 trades médiocres. Les pros sélectionnent — ils sont payés pour ATTENDRE, pas pour cliquer.',
      },
    ],
  },
  '2.9': {
    title: 'Quiz — Module 2 : ICT essentiels',
    after: 'Tu maîtrises les essentiels ? Vérifions :',
    questions: [
      {
        q: 'Un Order Block bullish, c\'est :',
        options: ['La dernière bougie bullish avant un move haussier', 'La dernière bougie bearish avant un move haussier qui casse structure', 'N\'importe quelle grosse bougie verte'],
        correct: 1,
        explain: 'Un OB bullish = la dernière bougie BEARISH (rouge) avant l\'impulsion haussière qui casse structure. C\'est là où les institutions ont placé leurs ordres d\'achat avant de pousser le prix.',
      },
      {
        q: 'Quand le prix wick au-dessus d\'un swing high puis close en dessous, c\'est :',
        options: ['Un breakout réussi → on achète la cassure', 'Un liquidity sweep → les institutions ont collecté la liquidité', 'Une erreur de cotation'],
        correct: 1,
        explain: 'C\'est LE pattern ICT le plus puissant. Le wick au-dessus active les buy stops du retail, les institutions vendent dans cette liquidité, puis le prix retombe. À fade, pas à trader dans le sens du wick.',
      },
      {
        q: 'En zone Premium (au-dessus de l\'équilibre 50%), tu cherches à :',
        options: ['Acheter (prix bas)', 'Vendre (prix élevé)', 'Ne rien faire'],
        correct: 1,
        explain: '"Acheter en Discount, vendre en Premium". En zone Premium, le prix est cher → tu cherches des setups SHORT. En Discount → LONG. La ligne grise pointillée du dashboard te dit où tu en es.',
      },
      {
        q: 'Quelles sont les heures GMT de la killzone London ?',
        options: ['00h-07h', '07h-10h', '12h-15h'],
        correct: 1,
        explain: 'London Open : 07-10h GMT. C\'est la phase de "manipulation" — gros volume et souvent faux moves avant le vrai. NY Open : 12-15h GMT. Asia : 20-00h GMT.',
      },
    ],
  },
  '4.5': {
    title: 'Quiz — Module 4 : Gestion de risque',
    after: 'La gestion de risque, c\'est 80% du succès. Test :',
    questions: [
      {
        q: 'Tu as 10 000€. Quel risque par trade vises-tu ?',
        options: ['10% pour gagner vite', '1-2% maximum', '5% pour équilibrer'],
        correct: 1,
        explain: 'TOUJOURS 1-2% max. Avec 10% par trade, 7 pertes consécutives = -52% du compte. Avec 1%, 7 pertes = -7%. La survie passe avant tout.',
      },
      {
        q: 'Ton R:R minimum acceptable, c\'est :',
        options: ['1:1 (récupère ce que tu risques)', '1:2 minimum (tu gagnes 2× ce que tu risques)', '1:5 sinon ça vaut pas le coup'],
        correct: 1,
        explain: 'Avec 1:2 minimum, même un winrate de 40% est rentable (4×2R - 6×1R = +2R sur 10 trades). Sous 1:2, tu as besoin d\'un winrate impossible à maintenir.',
      },
      {
        q: 'Tu enchaînes 2 pertes dans la journée. Tu fais quoi ?',
        options: ['Tu continues, c\'est la loi des stats', 'Tu arrêtes pour aujourd\'hui, tu reviens demain', 'Tu doubles la taille pour te refaire'],
        correct: 1,
        explain: 'Règle stricte : 2 pertes max par jour. Au-delà, c\'est probablement que ton mental est compromis (revenge, FOMO). Le marché sera encore là demain.',
      },
    ],
  },
};

const ONBOARDING_STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenue !',
    html: `
      <p>Salut ! Je vais te montrer ton dashboard <strong>EUR/USD ICT</strong> en <strong>8 étapes rapides</strong>.</p>
      <p>L'app combine :</p>
      <ul>
        <li>📊 Chart EUR/USD avec 14 indicateurs ICT</li>
        <li>🛠 Outils de gestion de risque + backtester</li>
        <li>💼 Compte fictif pour s'entraîner</li>
        <li>📚 Cours ICT 27 chapitres + tuto débutant 24 chapitres</li>
      </ul>
      <p style="color:var(--muted2);font-size:0.84rem">Tu peux passer ce tour à tout moment.</p>
    `,
  },
  {
    emoji: '🎯',
    title: 'Présets — clic et c\'est prêt',
    html: `
      <p>En haut du panel de droite, tu as <strong>4 boutons préset</strong> :</p>
      <ul>
        <li><span class="onb-key">🔄 Reset</span> — désactive tout pour repartir clean</li>
        <li><span class="onb-key">🔍 Contexte</span> (H1) — analyse top-down</li>
        <li><span class="onb-key">📊 Setup</span> (H4) — recherche de zones de trade</li>
        <li><span class="onb-key">🎯 Entrée</span> (M15) — confirmation intraday</li>
      </ul>
      <p>Chaque preset active 3-5 indicateurs ciblés. <strong>N'active jamais tout en même temps</strong> — c'est illisible.</p>
    `,
  },
  {
    emoji: '🧠',
    title: 'Indicateurs ICT',
    html: `
      <p>Dans le panel : 3 sections <strong>Essentiels / Avancés / Risk</strong>.</p>
      <p>Active un toggle pour voir l'indicateur sur le chart (Order Blocks, FVG, Liquidity, Killzones…).</p>
      <p>À côté de chaque toggle, l'icône <span class="onb-key">ℹ</span> ouvre <strong>directement le chapitre cours</strong> qui explique cet indicateur.</p>
    `,
  },
  {
    emoji: '🛠',
    title: 'Outils de risk',
    html: `
      <p>Dans la section <strong>Gestion de risque</strong> :</p>
      <ul>
        <li><span class="onb-key">📐 Calculateur</span> — taille de position selon ton % risque</li>
        <li><span class="onb-key">🎯 R/R Visualizer</span> — drag SL/TP sur le chart</li>
        <li><span class="onb-key">📝 Journal</span> — enregistre tes trades + stats</li>
        <li><span class="onb-key">🔬 Backtester</span> — teste ta stratégie sur l'historique</li>
        <li><span class="onb-key">🎬 Replay</span> — rejoue l'historique bougie par bougie</li>
      </ul>
    `,
  },
  {
    emoji: '💼',
    title: 'Paper Trading',
    html: `
      <p>Le bouton vert <span class="onb-key">💼 Paper Trading</span> ouvre un <strong>compte fictif 10 000 €</strong>.</p>
      <p>Tu places des trades <strong>Long</strong> (acheter) ou <strong>Short</strong> (vendre) avec SL/TP. L'app les exécute en temps réel quand le prix touche tes niveaux.</p>
      <p>C'est le meilleur moyen de t'entraîner <strong>sans risquer un centime</strong> avant de passer en compte réel.</p>
    `,
  },
  {
    emoji: '📚',
    title: 'Apprends',
    html: `
      <p>Dans la topbar (en haut à droite) :</p>
      <ul>
        <li><span class="onb-key">🎓</span> — Tuto débutant (les bases : broker, levier, ordres, pièges)</li>
        <li><span class="onb-key">📖</span> — Glossaire ICT (25 termes définis)</li>
        <li><span class="onb-key">📚</span> — Cours ICT (27 chapitres + quiz)</li>
      </ul>
      <p><strong>Pour débuter : commence par le tuto 🎓</strong>, surtout si tu n'as jamais ouvert de plateforme de trading.</p>
    `,
  },
  {
    emoji: '🌐',
    title: 'Données réelles (optionnel)',
    html: `
      <p>Par défaut, tu es en mode <strong>MOCK</strong> (données simulées réalistes avec cycles AMD).</p>
      <p>Pour voir le vrai prix EUR/USD :</p>
      <ol>
        <li>Crée un compte gratuit sur <strong>twelvedata.com</strong> (2 min)</li>
        <li><span class="onb-key">⚙</span> Paramètres → colle ta clé API</li>
        <li>"Activer mode Live"</li>
      </ol>
      <p style="color:var(--muted2);font-size:0.84rem">800 requêtes/jour gratuit, largement suffisant pour l'usage normal.</p>
    `,
  },
  {
    emoji: '🚀',
    title: 'C\'est parti !',
    html: `
      <p>Tu as tout vu. <strong>Mon conseil pour démarrer :</strong></p>
      <ol>
        <li>Lis le <strong>tuto débutant 🎓</strong> entièrement (1-2 heures bien dépensées)</li>
        <li>Reviens et active le preset <strong>🔍 Contexte</strong></li>
        <li>Ouvre <strong>💼 Paper Trading</strong> et place ton premier trade fictif</li>
        <li>Logge tes trades dans <strong>📝 Journal</strong> pour suivre tes stats</li>
      </ol>
      <p style="font-size:0.84rem;color:var(--muted2)">Tu peux revoir ce tour à tout moment depuis ⚙ Paramètres.</p>
      <p style="text-align:center;margin-top:14px;color:var(--acc);font-weight:600">Bon trading 🎯</p>
    `,
  },
];

const GLOSSARY = [
  { term: 'OB', abbr: 'Order Block', def: 'Dernière bougie de couleur opposée juste avant une impulsion qui casse structure. Zone où les institutions ont placé leurs ordres.' },
  { term: 'FVG', abbr: 'Fair Value Gap', def: 'Gap de prix entre 3 bougies consécutives (low[i+1] > high[i-1] pour bullish). Déséquilibre que le marché tend à combler.' },
  { term: 'BOS', abbr: 'Break of Structure', def: 'Cassure d\'un swing high/low dans le sens du trend → continuation confirmée.' },
  { term: 'MSS / CHoCH', abbr: 'Market Structure Shift / Change of Character', def: 'Cassure d\'un swing contre le trend → premier indice de changement de direction.' },
  { term: 'BSL / SSL', abbr: 'Buy/Sell Side Liquidity', def: 'Liquidité au-dessus des swing highs (buy stops) ou sous les swing lows (sell stops). Cibles des institutions.' },
  { term: 'Sweep', abbr: 'Liquidity sweep', def: 'Wick au-delà d\'un niveau de liquidité puis close de l\'autre côté = manipulation pour collecter la liquidité.' },
  { term: 'Premium / Discount', abbr: '', def: 'Au-dessus du milieu d\'un range = Premium (zone de vente). En dessous = Discount (zone d\'achat).' },
  { term: 'Equilibrium', abbr: '50% fib', def: 'Milieu du range courant. Sépare Premium et Discount.' },
  { term: 'OTE', abbr: 'Optimal Trade Entry', def: 'Zone de retracement Fibonacci 62-79% sur la dernière jambe. Sweet spot pour entrer dans le sens du trend.' },
  { term: 'BB', abbr: 'Breaker Block', def: 'OB qui s\'est fait mitigé puis cassé → flip de polarité (devient résistance s\'il était support).' },
  { term: 'IFVG', abbr: 'Inverted FVG', def: 'FVG comblé entièrement puis traversé → flip de polarité.' },
  { term: 'AMD', abbr: 'Accumulation / Manipulation / Distribution', def: 'Cycle journalier ICT : Asia = accumulation, London = manipulation (faux move), NY = distribution (vrai move).' },
  { term: 'Killzone', abbr: '', def: 'Fenêtre horaire où le marché bouge le plus. London 07-10h GMT, NY 12-15h GMT, Asia 20-00h GMT.' },
  { term: 'PD Array', abbr: 'Premium/Discount Array', def: 'Terme générique pour toute zone Smart Money (OB, FVG, BB, IFVG).' },
  { term: 'IRL / ERL', abbr: 'Internal / External Range Liquidity', def: 'IRL = liquidité interne au range (FVG, OB). ERL = liquidité externe (swing highs/lows). Le marché alterne entre les deux.' },
  { term: 'Displacement', abbr: '', def: 'Mouvement impulsif et large (grandes bougies) qui casse structure. Crée souvent un FVG.' },
  { term: 'Mitigation', abbr: '', def: 'Quand le prix revient toucher une zone (OB, FVG) après s\'en être éloigné. Souvent un bon point d\'entrée.' },
  { term: 'Pip', abbr: '', def: '4ème décimale sur EUR/USD (1.0850 → 1.0851 = +1 pip). Unité standard de mesure des mouvements.' },
  { term: 'Spread', abbr: '', def: 'Différence entre bid (achat marché) et ask (vente marché). Commission cachée du broker.' },
  { term: 'Levier', abbr: '', def: 'Permet d\'ouvrir une position plus grosse que ton capital (broker prête la différence). Max 30:1 en EU.' },
  { term: 'Lot', abbr: '', def: '1 lot standard = 100 000 unités de la devise de base. Sur EUR/USD : 1 pip = 10$ par lot.' },
  { term: 'SL / TP', abbr: 'Stop Loss / Take Profit', def: 'Ordres automatiques qui ferment la position à un prix défini, pour limiter la perte (SL) ou sécuriser le gain (TP).' },
  { term: 'R / R:R', abbr: 'Risk / Risk:Reward', def: '1R = ce que tu risques sur le trade. R:R 1:2 = tu vises 2× ce que tu risques. Minimum 1:2 en ICT.' },
  { term: 'Smart Money', abbr: '', def: 'Banques, hedge funds, gros acteurs. ICT consiste à tracer leur empreinte sur les graphiques pour les suivre.' },
  { term: 'Retail', abbr: '', def: 'Traders particuliers (toi, moi). 70-85% perdent en trading CFD selon les régulateurs.' },
];
