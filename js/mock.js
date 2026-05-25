// ============================================================
// MOCK DATA GENERATORS — bougies EUR/USD réalistes
// Généré par extraction depuis index.html (refonte modulaire)
// ============================================================

// ============================================================

const PIP = 0.0001;
const BASE_PRICE = 1.0850;

// Volatilité par heure GMT (en pips, σ d'une bougie M15)
// Asia faible, London/NY fortes, overlap pic.
function sigmaPipsAt(hourGMT){
  // hourGMT ∈ [0, 24[
  if(hourGMT < 7)            return 4 + Math.random()*1.5;   // Asia
  if(hourGMT < 8)            return 6 + Math.random()*2;     // Pre-London
  if(hourGMT < 12)           return 11 + Math.random()*3;    // London
  if(hourGMT < 15)           return 13 + Math.random()*4;    // Overlap LDN/NY
  if(hourGMT < 19)           return 10 + Math.random()*2.5;  // NY
  if(hourGMT < 22)           return 7 + Math.random()*2;     // Late NY
  return 4 + Math.random()*1.5;                              // Asia early
}

// Gaussian sample via Box-Muller
function gauss(mu, sigma){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mu + z * sigma;
}

// Retourne true si le timestamp tombe pendant la fermeture du forex
// (vendredi 22h GMT → dimanche 22h GMT)
function isForexClosed(date){
  const dow = date.getUTCDay(); // 0=dim, 1=lun, ..., 5=ven, 6=sam
  const h = date.getUTCHours();
  if(dow === 6) return true; // samedi
  if(dow === 5 && h >= 22) return true; // vendredi après 22h
  if(dow === 0 && h < 22) return true; // dimanche avant 22h
  return false;
}

function generateM15Candles(numCandles){
  const out = [];
  // On part de "maintenant arrondi au M15" et on remonte
  const now = Math.floor(Date.now() / 1000);
  const M15 = 15 * 60;
  const endTs = now - (now % M15); // dernier M15 fermé
  let ts = endTs - (numCandles - 1) * M15;

  let price = BASE_PRICE;
  // Trend global léger (drift macro sur tout le dataset)
  const macroDrift = (Math.random() - 0.5) * 0.0008 / numCandles; // ±8 pips total

  for(let i = 0; i < numCandles; i++){
    const date = new Date(ts * 1000);

    if(isForexClosed(date)){
      ts += M15;
      continue;
    }

    const hourGMT = date.getUTCHours() + date.getUTCMinutes()/60;
    const sigmaPips = sigmaPipsAt(hourGMT);
    const sigma = sigmaPips * PIP;

    // Détecte si on vient juste de rouvrir (gap weekend possible)
    const prevDate = new Date((ts - M15) * 1000);
    const justReopened = isForexClosed(prevDate);
    let open = price;
    if(justReopened && i > 0){
      // Gap weekend : ±5 à 20 pips dans une direction aléatoire
      const gap = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random()*15) * PIP;
      open = price + gap;
    }

    // Body : tirage gaussien avec un léger biais mean-reversion + drift macro
    const reversion = (BASE_PRICE - open) * 0.002; // ramène doucement vers la base
    const delta = gauss(macroDrift + reversion, sigma);
    const close = open + delta;

    // Wicks : tirage half-normal sur σ/2
    const upperWick = Math.abs(gauss(0, sigma * 0.55));
    const lowerWick = Math.abs(gauss(0, sigma * 0.55));
    const high = Math.max(open, close) + upperWick;
    const low = Math.min(open, close) - lowerWick;

    out.push({ time: ts, open, high, low, close });
    price = close;
    ts += M15;
  }

  return out;
}

// Aggrège des bougies M15 vers un timeframe supérieur (H1, H4, D1)
function aggregate(m15, tfSeconds){
  const out = [];
  let bucket = null;
  for(const c of m15){
    const bucketTs = c.time - (c.time % tfSeconds);
    if(!bucket || bucket.time !== bucketTs){
      if(bucket) out.push(bucket);
      bucket = { time: bucketTs, open: c.open, high: c.high, low: c.low, close: c.close };
    } else {
      bucket.high = Math.max(bucket.high, c.high);
      bucket.low = Math.min(bucket.low, c.low);
      bucket.close = c.close;
    }
  }
  if(bucket) out.push(bucket);
  return out;
}

// ============================================================
// Générateur M15 réaliste (cycles AMD, sweeps, OB)
// ============================================================
function generateRealisticM15(numCandles){
  // Construit des bougies M15 avec délibérément des patterns ICT
  const out = [];
  const M15 = 15 * 60;
  const now = Math.floor(Date.now() / 1000);
  const endTs = now - (now % M15);
  let ts = endTs - (numCandles - 1) * M15;
  let price = BASE_PRICE;

  // On va construire des "macro cycles" de ~5 jours = ~480 bougies M15 (480 = 5j × 96 candles)
  // Chaque cycle : accumulation range (Asia-like) → manipulation sweep → impulsion + FVG → distribution → reversal
  const cycleLen = 480;
  let cycleIdx = 0;
  let cycleStart = 0;
  let macroDir = Math.random() < 0.5 ? 1 : -1; // direction du cycle
  let rangeAnchor = price;

  for(let i = 0; i < numCandles; i++){
    const date = new Date(ts * 1000);
    if(isForexClosed(date)){ ts += M15; continue; }
    const hourGMT = date.getUTCHours() + date.getUTCMinutes()/60;
    const sigmaPips = sigmaPipsAt(hourGMT);
    const sigma = sigmaPips * PIP;

    // Position dans le cycle (0..1)
    const t = (cycleIdx - cycleStart) / cycleLen;
    let bias = 0; // drift moyen par bougie

    if(t < 0.3){
      // Phase 1 (accumulation) : range serré autour de rangeAnchor
      bias = (rangeAnchor - price) * 0.05; // mean-revert vers rangeAnchor
    } else if(t < 0.4){
      // Phase 2 (manipulation / sweep) : fake move dans la direction OPPOSÉE au macro
      bias = -macroDir * sigma * 0.4; // push contre la direction
    } else if(t < 0.45){
      // Phase 3 (reversal post-sweep) : retour brutal dans la direction macro
      bias = macroDir * sigma * 0.6;
    } else if(t < 0.85){
      // Phase 4 (distribution / impulsion) : trend prononcé
      bias = macroDir * sigma * 0.35;
    } else {
      // Phase 5 (consolidation fin de cycle) : range
      bias = 0;
    }

    // Volatilité boostée pendant les killzones
    const inKz = (hourGMT >= 7 && hourGMT < 10) || (hourGMT >= 12 && hourGMT < 15);
    const localSigma = sigma * (inKz ? 1.3 : 0.85);

    // Détecte un gap weekend
    const prevDate = new Date((ts - M15) * 1000);
    const justReopened = isForexClosed(prevDate);
    let open = price;
    if(justReopened && i > 0){
      const gap = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random()*15) * PIP;
      open = price + gap;
    }

    const delta = gauss(bias, localSigma);
    let close = open + delta;

    // Wicks : pendant la phase 2 (sweep), wicks longs dans la direction de la manipulation
    let upperWickMag = Math.abs(gauss(0, localSigma * 0.5));
    let lowerWickMag = Math.abs(gauss(0, localSigma * 0.5));
    if(t > 0.3 && t < 0.4){
      // Pendant la manipulation : wicks plus longs dans la direction du fake move
      if(macroDir === 1) lowerWickMag *= 2.5; // sweep des lows pour piéger les shorts
      else upperWickMag *= 2.5;
    }
    if(t > 0.4 && t < 0.5){
      // Reversal après sweep : grosse bougie d'impulsion (corps allongé)
      const impulsionBoost = sigma * 0.4;
      if(macroDir === 1) close += impulsionBoost;
      else close -= impulsionBoost;
    }

    const high = Math.max(open, close) + upperWickMag;
    const low = Math.min(open, close) - lowerWickMag;

    out.push({ time: ts, open, high, low, close });
    price = close;
    ts += M15;
    cycleIdx++;

    // Nouveau cycle
    if(cycleIdx - cycleStart >= cycleLen){
      cycleStart = cycleIdx;
      // Flip de direction avec 70% de proba, sinon continue
      if(Math.random() < 0.7) macroDir *= -1;
      rangeAnchor = price + (Math.random() - 0.5) * 50 * PIP;
    }
  }

  return out;
}

// ============================================================
// Générateur M1 réaliste pour scalping
// ============================================================
function generateRealisticM1(numCandles){
  const out = [];
  const M1 = 60;
  const now = Math.floor(Date.now() / 1000);
  const endTs = now - (now % M1);
  let ts = endTs - (numCandles - 1) * M1;
  let price = BASE_PRICE;

  // Cycles AMD courts : 8h par cycle = 480 minutes (vs 5 jours pour M15)
  const cycleLen = 480;
  let cycleStart = 0;
  let macroDir = Math.random() < 0.5 ? 1 : -1;
  let rangeAnchor = price;

  for(let i = 0; i < numCandles; i++){
    const date = new Date(ts * 1000);
    if(isForexClosed(date)){ ts += M1; continue; }
    const hourGMT = date.getUTCHours() + date.getUTCMinutes()/60;
    // Sigma M1 ≈ sigma M15 / sqrt(15) ≈ /3.9 (mais en pratique /3 marche mieux visuellement)
    const sigmaPips = sigmaPipsAt(hourGMT) / 3;
    const sigma = sigmaPips * PIP;

    const t = (i - cycleStart) / cycleLen;
    let bias = 0;
    if(t < 0.3)        bias = (rangeAnchor - price) * 0.03;
    else if(t < 0.4)   bias = -macroDir * sigma * 0.4;
    else if(t < 0.45)  bias = macroDir * sigma * 0.6;
    else if(t < 0.85)  bias = macroDir * sigma * 0.25;

    const inKz = (hourGMT >= 7 && hourGMT < 10) || (hourGMT >= 12 && hourGMT < 15);
    const localSigma = sigma * (inKz ? 1.4 : 0.8);

    const prevDate = new Date((ts - M1) * 1000);
    const justReopened = isForexClosed(prevDate);
    let open = price;
    if(justReopened && i > 0){
      const gap = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random()*15) * PIP;
      open = price + gap;
    }

    const delta = gauss(bias, localSigma);
    let close = open + delta;

    let upperWickMag = Math.abs(gauss(0, localSigma * 0.55));
    let lowerWickMag = Math.abs(gauss(0, localSigma * 0.55));
    if(t > 0.3 && t < 0.4){
      if(macroDir === 1) lowerWickMag *= 2.5;
      else upperWickMag *= 2.5;
    }
    if(t > 0.4 && t < 0.5){
      const impulsionBoost = sigma * 0.35;
      if(macroDir === 1) close += impulsionBoost;
      else close -= impulsionBoost;
    }

    const high = Math.max(open, close) + upperWickMag;
    const low = Math.min(open, close) - lowerWickMag;

    out.push({ time: ts, open, high, low, close });
    price = close;
    ts += M1;

    if(i - cycleStart >= cycleLen){
      cycleStart = i;
      if(Math.random() < 0.7) macroDir *= -1;
      rangeAnchor = price + (Math.random() - 0.5) * 50 * PIP;
    }
  }
  return out;
}
