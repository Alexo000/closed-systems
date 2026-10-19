function makeSim(opt) {
  // Una caja de vidrio en corte. 1 celda = 1 mm. 1 paso = 1 semana.
  const W = 160, H = 200, N = W * H;
  const AIR = 0, GLASS = 1, SUP = 2, STONE = 3, ROOT = 4, DROOT = 5, PLANT = 6, SEED = 7, CAP = 8;
  // sig: resistencia a la tensión ya mojada, en MPa (estimada en el reporte "Piedra y planta para El ciclo")
  const MAT = [
    { name: 'caliza de Bath', sig: 1.4, hard: 0.35, pore: 0.05 },
    { name: 'caliza tipo Caen', sig: 0.9, hard: 0.25, pore: 0.07 },
    { name: 'caliza Portland', sig: 3.4, hard: 0.55, pore: 0.03 },
    { name: 'arenisca St Bees', sig: 4.2, hard: 0.6, pore: 0.03 },
    { name: 'mármol de Carrara', sig: 7.0, hard: 0.85, pore: 0.0 },
    { name: 'alabastro', sig: 0.8, hard: 0.3, pore: 0.01 },
  ];
  // dmax: diámetro máximo de raíz (mm). tmin/topt/thot: temperaturas (°C) para el vigor.
  // El resto son los valores de cada especie cuando no es la planta elegida (por ejemplo, en una cápsula mixta).
  // seedHalf: años hasta perder la mitad de la germinación, seca y sellada, a 20 °C (reporte "Semilla sellada para El ciclo").
  const SPECIES = {
    ficus: { lightGerm: true, dmax: 12, tmin: 13, topt: 21, thot: 32, pSust: 0.3, thickRate: 1, longevity: 12, seedHalf: 8, germ: 0.4 },
    robinia: { dmax: 12, tmin: 6, topt: 16, thot: 28, pSust: 0.35, thickRate: 1, longevity: 15, seedHalf: 25, germ: 0.25 },
    chicharo: { dmax: 1.6, tmin: 4, topt: 15, thot: 24, pSust: 0.5, thickRate: 4, longevity: 0.5, seedHalf: 20, germ: 0.85 },
  };
  const o = Object.assign({
    layout: 'pisos', material: 0, plant: 'ficus', prep: 'ranuras', holeD: 5, bridge: 1.5, joint: 0.12,
    pSust: 0.3, thickRate: 1, temp: 21, seedHalf: 8, seedsPerCap: 16, germ: 0.4, capFrag: 0.5, capMix: 'misma', lightFrom: 'arriba', lightMode: 'led',
    r1t: 'ninguna', r1f: 0, r2t: 'ninguna', r2f: 0, r3t: 'ninguna', r3f: 0,
    longevity: 12, selfSeed: 0, rust: 0, seed: 1,
    // la urna: cualquiera paga para romper una ampolleta y elige en secreto
    outside: 'reglas', uVisitors: 40, uWtp: 4, uTail: 1.8, uSiga: 0.45, uMuera: 0.35, uLie: 0.15, uSilent: 0.3,
    uP0: 20, uQuiet: 12, uReveal: 5, uPerType: 20, saltG: 0.18, waterMl: 500,
    rent: 0, fund0: 1200, uSeeds: null, uSalt: null, uWater: null, uOps: 10,   // ampolletas de cada tipo; si no se dan, uPerType   // la urna paga su propia renta (libras al mes) con lo que reúne; si el fondo se acaba, la quitan
  }, opt || {});
  const MAIN = SPECIES[o.plant] ? o.plant : 'ficus';
  const PARTNER = MAIN === 'robinia' ? 'ficus' : 'robinia';
  // valor de una especie: los ajustes si es la planta elegida, los de la tabla si no
  const par = (sp, k) => (sp === MAIN && o[k] != null) ? o[k] : SPECIES[sp][k];
  const fTOf = sp => {
    const S = SPECIES[sp];
    let f = (o.temp - S.tmin) / (S.topt - S.tmin);
    if (o.temp > S.thot) f *= Math.max(0.3, 1 - (o.temp - S.thot) / 8);
    return Math.max(0.15, Math.min(1, f));
  };
  const FT = { ficus: fTOf('ficus'), robinia: fTOf('robinia'), chicharo: fTOf('chicharo') };
  const fT = FT[MAIN];
  // Curva de Ellis y Roberts: la semilla casi no muere durante una meseta y luego cae rápido.
  // Lote que empieza con 95 % vivo; "vida media" = años hasta perder la mitad de esa germinación.
  // Temperatura con las constantes universales de Dickie et al. (1990).
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const PHI = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const tempF = Math.pow(10, -0.0329 * (o.temp - 20) - 0.000478 * (o.temp * o.temp - 400));
  const viabSp = (sp, weeks) => Math.min(1, PHI(1.645 - 1.708 * (weeks / 52) / (par(sp, 'seedHalf') * tempF)) / 0.95);
  const viab = weeks => viabSp(MAIN, weeks);
  // Luz natural de Londres (ventana al norte), respecto a una lámpara LED de 12 horas = 1.
  // La caja empieza el 1 de abril; el solsticio de invierno cae unas 37.6 semanas después.
  const seasonAt = w => o.lightMode !== 'londres' ? 1 : 0.12 + 0.98 * Math.pow((1 - Math.cos(2 * Math.PI * (w - 37.6) / 52.18)) / 2, 1.3);
  let SEASON = seasonAt(0), boostUntil = -1;
  // Ampolletas de afuera: un riel bajo la tapa con 15 ampolletas por regla.
  // Cada regla se dispara al azar con la frecuencia dada (veces al año) y rompe una ampolleta de su tipo.
  const RACK = [24, 136, 52, 108, 80, 38, 122, 66, 94];
  const rules = [1, 2, 3].map(k => ({ k, t: o['r' + k + 't'] || 'ninguna', f: +o['r' + k + 'f'] || 0, left: 15 }));
  const salt = [];
  let rackI = 0;
  // En una caja cerrada la sal no se va nunca: escurre al agua y se acumula.
  let saltG = 0, waterTop0 = 0, extraMl = 0, risenMm = 0;   // extraMl: agua que trajeron las ampolletas (ampMl cada una)
  const waterVol = () => (o.waterMl + extraMl) * Math.max(1, H - 1 - waterTop) / Math.max(1, H - 1 - waterTop0);   // ml: cambia si sube o baja el agua
  const salinity = () => saltG / (waterVol() / 1000);                     // gramos por litro
  // tinta en el vidrio: cuánta luz deja pasar cada columna (1 = toda)
  const shade = new Float32Array(160).fill(1);
  const saltStress = () => Math.max(0, Math.min(1, (salinity() - 1.5) / 4.5)); // nada bajo 1.5 g/L, letal hacia 6 g/L
  // La urna: el precio se duplica con cada compra y baja a la mitad tras cada periodo sin compras.
  // Se sabe quién pagó; lo que eligió se sabe cuando se abre la urna, cada cierto número de años.
  const URNA = o.outside === 'urna';
  const KINDS = ['semillas', 'sal', 'agua'];
  // las ampolletas que vienen de las operaciones del compendio
  const OPS = ['acido', 'inundar', 'secante', 'tinta', 'resina', 'hormona', 'composta'];
  const ALLK = KINDS.concat(OPS);
  const QUIET = Math.round(o.uQuiet * 52.18 / 12);
  const ust = { price: o.uP0, lastChange: 0, money: 0, n: 0, maxPrice: o.uP0, stock: Object.assign({ semillas: o.uSeeds != null ? o.uSeeds : o.uPerType, sal: o.uSalt != null ? o.uSalt : o.uPerType, agua: o.uWater != null ? o.uWater : o.uPerType }, Object.fromEntries(OPS.map(k => [k, o.uOps]))), nextReveal: Math.round(o.uReveal * 52.18), revealedUpTo: 0, reveals: 0, fund: o.fund0, rentPaid: 0 };
  const RENTW = o.rent * 12 / 52.18;   // renta por semana
  const monthsLeft = () => o.rent > 0 ? ust.fund / o.rent : Infinity;
  const buys = [], priceLog = [[0, o.uP0]], uLog = [], fundLog = [[0, o.fund0]];
  const SIGW = 0.02, LINE = 150, EDGE = 1; // peso propio (MPa), largo de la línea de orificios y orilla (mm)
  const grooveF = o.prep === 'ranuras' ? 0.5 : 1;
  const sigEff = () => o.prep === 'junta' ? o.joint : MAT[o.material].sig;

  let s = (o.seed >>> 0) || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const poisson = l => { if (l <= 0) return 0; if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * gauss())); let L = Math.exp(-l), k = 0, q = 1; do { k++; q *= rnd(); } while (q > L); return k - 1; };

  const type = new Uint8Array(N), body = new Int32Array(N).fill(-1), str = new Float32Array(N), dmg = new Float32Array(N);
  const mat = new Uint8Array(N), owner = new Int32Array(N).fill(-1), thick = new Float32Array(N), capOf = new Int16Array(N).fill(-1);
  const holeOf = new Int32Array(N).fill(-1), life = new Float32Array(N), stamp = new Int32Array(N);
  let stampN = 0;
  let waterTop = H - 17;
  const bodies = [], holes = [], caps = [], plants = [], landed = [], events = [], supCells = [];
  let week = 0, changed = false;
  const tot = { drowned: 0, crushed: 0, seedsOut: 0, capsBroken: 0, capsFell: 0, falls: 0, holesBroken: 0, germinated: 0, maxGen: 1, plantsEver: 0, maxDepth: 0, plantsWet: 0, plantsBroke: 0, dud: 0, germBy: {}, dormant: 0, darkDud: 0, ext: 0, extBy: {}, germExt: 0, chem: 0, saltKilled: 0 };
  // cuánto empuja una raíz llena contra lo que resiste un puente: arriba de 1, dos orificios vecinos con raíz bastan
  const designRatio = () => par(MAIN, 'pSust') * Math.max(1, Math.round(o.holeD)) / (sigEff() * grooveF * Math.max(0.3, o.bridge));
  let lastCause = 0;
  let ending = null, endWeek = 0;
  const hist = [];

  // ---------- resistencia de la piedra: ruido suave + vetas ----------
  const G = 10, gw = Math.ceil(W / G) + 2, gh = Math.ceil(H / G) + 2, grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const veinA = rnd() * 6.28, veinB = rnd() * 6.28;
  function noise(x, y) {
    const gx = x / G, gy = y / G, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function strengthAt(x, y) {
    let v = 0.75 + 0.35 * (noise(x, y) - 0.5) + 0.12 * (rnd() - 0.5);
    const vein = Math.sin(x * 0.11 + y * 0.07 + 2.5 * Math.sin(y * 0.05 + veinA) + veinB);
    if (Math.abs(vein) < 0.05) v *= 0.55;
    return Math.max(0.25, Math.min(1.2, v));
  }

  // ---------- construcción ----------
  const at = (x, y) => y * W + x;
  for (let x = 0; x < W; x++) { type[at(x, 0)] = GLASS; type[at(x, H - 1)] = GLASS; }
  for (let y = 0; y < H; y++) { type[at(0, y)] = GLASS; type[at(W - 1, y)] = GLASS; }

  function newBody() { const b = { id: bodies.length, cells: [], holes: [], cause: 0, dirty: false, alive: true, maxY: 0, comX: 0 }; bodies.push(b); return b; }
  function setStone(i, b, m) {
    type[i] = STONE; body[i] = b.id; mat[i] = m; str[i] = strengthAt(i % W, (i / W) | 0); dmg[i] = 0; b.cells.push(i);
  }
  function finishBody(b) { b.cells = b.cells.filter(i => type[i] === STONE && body[i] === b.id); }
  function newHole(b) { const h = { id: holes.length, body: b.id, cells: [], intact: true, dmg: 0, rows: 1, caps: [] }; holes.push(h); b.holes.push(h.id); return h; }
  function carve(h, x, y) {
    const i = at(x, y);
    if (type[i] === STONE && body[i] === h.body) { type[i] = AIR; body[i] = -1; holeOf[i] = h.id; h.cells.push(i); }
    else if (type[i] === AIR && holeOf[i] < 0 && x > 0 && x < W - 1) { holeOf[i] = h.id; h.cells.push(i); }
  }
  function finishHole(h) { const ys = new Set(h.cells.map(i => (i / W) | 0)); h.rows = Math.max(1, ys.size); }
  // Cada orificio del corte es una línea de orificios que entra 15 cm en la caja.
  // Entre orificio y orificio queda un puente de piedra (o de junta de cal) que la raíz tiene que romper.
  function makeLine(hx, hy) {
    const d = Math.max(1, Math.round(o.holeD)), b = Math.max(0.3, o.bridge), s = d + b;
    const n = Math.max(1, Math.floor((LINE - 2 * EDGE - d) / s) + 1);
    const joint = o.prep === 'junta';
    let lf = 1;
    if (!joint) {
      let v = 0.75 + 0.35 * (noise(hx, hy) - 0.5);
      const vein = Math.sin(hx * 0.11 + hy * 0.07 + 2.5 * Math.sin(hy * 0.05 + veinA) + veinB);
      if (Math.abs(vein) < 0.12) v *= 0.75;
      lf = Math.max(0.55, Math.min(1.35, v / 0.75));
    }
    const R = new Float32Array(n + 1);
    for (let j = 0; j <= n; j++) {
      const w = (j === 0 || j === n) ? EDGE : b;
      const vr = joint ? 0.8 + 0.4 * rnd() : 0.75 + 0.5 * rnd();
      R[j] = sigEff() * lf * vr * grooveF * w;
    }
    return { n, d, s, R, y: hy, ok: new Uint8Array(n + 1).fill(1), D: new Float32Array(n), own: new Int32Array(n).fill(-1),
      i0: Math.max(0, Math.min(n - 1, Math.floor(n / 4 + rnd() * n / 2))), first: -1, broken: 0,
      load: new Float32Array(n + 1), F: new Float32Array(n) };
  }
  function hole(b, hx, y0, y1) {
    const h = newHole(b), d = Math.max(1, Math.round(o.holeD)), xa = hx - Math.floor((d - 1) / 2);
    for (let y = y0; y <= y1; y++) for (let x = xa; x < xa + d; x++) {
      const i = at(x, y);
      // solo dentro de la piedra (no en el aire de alrededor)
      if (type[i] === STONE && body[i] === b.id) carve(h, x, y);
      else if (type[i] === AIR) { const l = type[at(xa - 1, y)] === STONE, r = type[at(xa + d, y)] === STONE; if (l && r) carve(h, x, y); }
    }
    finishHole(h); h.line = makeLine(hx, (y0 + y1) >> 1); return h;
  }
  function slab(x0, y0, w, h, holeXs) {
    const b = newBody(), m = o.material, M = MAT[m];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const ex = Math.min(x - x0, x0 + w - 1 - x), ey = Math.min(y - y0, y0 + h - 1 - y);
      if (ex + ey < 2 + (rnd() < 0.5 ? 1 : 0)) continue;
      if (ey === 0 && rnd() < 0.12) continue;
      if (ey > 0 && rnd() < M.pore) continue;
      setStone(at(x, y), b, m);
    }
    for (const hx of holeXs) hole(b, hx, y0, y0 + h - 1);
    finishBody(b); return b;
  }
  function blob(cx, cy, rx, ry, holeXs) {
    const b = newBody(), m = o.material, M = MAT[m];
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28;
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx);
      const r = 1 + 0.08 * Math.sin(3 * a + p1) + 0.05 * Math.sin(5 * a + p2);
      if (dx * dx + dy * dy > r * r || dy > 0.8) continue;
      if (rnd() < M.pore) continue;
      setStone(at(x, y), b, m);
    }
    for (const hx of holeXs) hole(b, hx, cy - ry - 2, cy + ry + 2);
    finishBody(b); return b;
  }
  function supRect(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = at(x, y); type[i] = SUP; supCells.push(i);
      life[i] = o.rust > 0 ? o.rust * 52 * (0.55 + 0.9 * rnd()) : 1e12;
    }
  }
  function capsule(cx, cy, r, n, h) {
    const id = caps.length, c = { id, cells: [], cx, cy, r, intact: true, hole: h ? h.id : -1, mix: [MAIN] };
    // cápsula mixta: 3 de cada 10 semillas son de la otra especie (Robinia, o higuera si la planta es Robinia)
    if (o.capMix === 'mezcla' && n >= 2) {
      const nP = Math.max(1, Math.round(n * 0.3)); c.mix = [];
      for (let k = 0; k < n; k++) c.mix.push(k < nP ? PARTNER : MAIN);
      for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = c.mix[k]; c.mix[k] = c.mix[j]; c.mix[j] = t; }
    }
    if (h) {
      for (let y = cy - r - 3; y <= cy + r + 3; y++) for (let x = cx - r - 3; x <= cx + r + 3; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= (r + 2.4) ** 2) carve(h, x, y);
      h.caps.push(id); finishHole(h);
    }
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx, y - cy), i = at(x, y);
      if (d >= r - 0.5 && d <= r + 0.5) { type[i] = CAP; capOf[i] = id; dmg[i] = 0; c.cells.push(i); }
    }
    let placed = 0;
    for (let y = cy + r - 1; y > cy - r && placed < n; y--) for (let x = cx - r + 1; x < cx + r && placed < n; x += 2) {
      const i = at(x, y);
      if (Math.hypot(x - cx, y - cy) < r - 1 && type[i] === AIR) { type[i] = SEED; capOf[i] = id; placed++; }
    }
    caps.push(c); return c;
  }

  function build() {
    const nSeeds = Math.round(o.seedsPerCap);
    if (o.layout === 'pisos') {
      waterTop = H - 17;
      const tiers = [
        { y: 34, holes: [44, 80, 116] },
        { y: 92, holes: [28, 70, 98, 134], caps: [42, 58, 84, 112, 124] },
        { y: 148, holes: [22, 50, 86, 120, 142], caps: [36, 66, 100, 132] },
      ];
      const mode = o.capMode || 'debajo';
      tiers.forEach((t, k) => {
        slab(5, t.y, 150, 14, t.holes);
        supRect(1, t.y + 14, 13, t.y + 15); supRect(W - 14, t.y + 14, W - 2, t.y + 15);
        // 'debajo': sobre el piso que recibe la caída. 'encima': sobre el piso que va a caer.
        const xs = mode === 'encima' ? (tiers[k + 1] && tiers[k + 1].caps) : t.caps;
        if (xs) for (const x of xs) capsule(x, t.y - 6, 5, nSeeds, null);
      });
      for (const x of tiers[0].holes) newPlant(at(x, 33), 1);
    } else if (o.layout === 'linea') {
      // Como en el reporte: una sola línea por losa, cerca de un apoyo. Al partirse cae solo la franja corta,
      // con sus cápsulas encima; el resto de la losa se queda sobre una repisa ancha.
      // Cada línea va donde caen las semillas de la generación anterior.
      waterTop = H - 17;
      const th = 12, tiers = [
        { y: 34, x: 58, strip: 'L', caps: [22, 40] },
        { y: 92, x: 62, strip: 'R', caps: [102, 126] },
        { y: 148, x: 100, strip: 'R', caps: [] },
      ];
      tiers.forEach(t => {
        slab(5, t.y, 150, th, [t.x]);
        // sello en las orillas: la línea es el único camino de la raíz hacia el agua
        supRect(1, t.y, 4, t.y + th - 1); supRect(W - 5, t.y, W - 2, t.y + th - 1);
        if (t.strip === 'L') { supRect(1, t.y + th, 13, t.y + th + 1); supRect(Math.round((t.x + 154) / 2) - 14, t.y + th, W - 2, t.y + th + 1); }
        else { supRect(W - 14, t.y + th, W - 2, t.y + th + 1); supRect(1, t.y + th, Math.round((5 + t.x) / 2) + 14, t.y + th + 1); }
        for (const x of t.caps) capsule(x, t.y - 6, 5, nSeeds, null);
      });
      newPlant(at(58, 33), 1); newPlant(at(72, 33), 1);
    } else if (o.layout === 'pisos2') {
      // pisos generales: n losas, m orificios por losa, cápsulas sobre la losa que va a caer
      waterTop = H - 17;
      const n = Math.max(2, Math.min(5, Math.round(o.tiers || 3))), th = Math.round(o.th || 14), m = Math.max(1, Math.round(o.holesN || 4));
      const gap = Math.floor((waterTop - 34 - 20) / (n - 1) + 0.5);
      const ys = []; for (let k = 0; k < n; k++) ys.push(30 + k * gap);
      const holeXs = k => { const out = []; for (let j = 0; j < m; j++) out.push(Math.round(5 + 150 * (j + 0.5 + (k % 2 ? 0.25 : -0.25) + 0.0) / m)); return out.map(x => Math.max(18, Math.min(142, x))); };
      ys.forEach((y, k) => {
        const hx = holeXs(k);
        slab(5, y, 150, th, hx);
        supRect(1, y + th, 13, y + th + 1); supRect(W - 14, y + th, W - 2, y + th + 1);
        const riding = (o.capMode || 'encima') === 'encima';
        if ((riding && k < n - 1) || (!riding && k > 0)) {
          const src = riding ? hx : holeXs(k - 1);
          const xs = []; for (let j = 0; j + 1 < src.length; j++) xs.push(Math.round((src[j] + src[j + 1]) / 2));
          if (xs.length < 2) xs.push(Math.round((src[0] + 5) / 2), Math.round((src[src.length - 1] + 155) / 2));
          for (const x of xs) capsule(x, y - 6, 5, nSeeds, null);
        }
      });
      for (const x of holeXs(0)) newPlant(at(x, 29), 1);
    } else if (o.layout === 'escalera') {
      waterTop = H - 17;
      const n = Math.max(3, Math.min(5, Math.round(o.levels || 4)));
      const gap = Math.floor((waterTop - 30) / n), th = n >= 5 ? 10 : 12;
      const shelves = [];
      for (let k = 0; k < n; k++) {
        const y = 26 + k * gap, left = k % 2 === 0;
        const x0 = left ? 5 : 48, x1 = left ? 112 : 155, hx = left ? 90 : 70;
        slab(x0, y, x1 - x0 + 1, th, [hx]);
        if (left) supRect(1, y + th, 62, y + th + 1); else supRect(98, y + th, W - 2, y + th + 1);
        shelves.push({ y, left, x0, x1, hx, tip: left ? [hx + 2, x1] : [x0, hx - 2] });
      }
      const mode = o.capMode || 'debajo';
      for (let k = 0; k < n; k++) {
        const sh = shelves[k];
        if (mode === 'encima') {
          if (k < n - 1) { const [a, b] = sh.tip; for (const x of [a + 4, b - 6]) capsule(x, sh.y - 5, 4, nSeeds, null); }
        } else if (k > 0) {
          const ab = shelves[k - 1], [a, b] = ab.tip;
          const xs = mode === 'borde' ? (ab.left ? [b - 3, b + 9] : [a + 3, a - 9]) : [Math.round((a + b) / 2) - 6, Math.round((a + b) / 2) + 6];
          for (const x of xs) capsule(x, sh.y - 6, 5, nSeeds, null);
        }
      }
      newPlant(at(shelves[0].hx, shelves[0].y - 1), 1);
      newPlant(at(shelves[0].hx - 16, shelves[0].y - 1), 1);
    } else if (o.layout === 'ciclo') {
      waterTop = H - 28;
      const gy = 150;
      for (let x = 1; x < W - 1; x++) if (x % 9 > 1) supRect(x, gy, x, gy + 1);
      for (let k = 0; k < 9; k++) capsule(16 + k * 16, gy - 7, 6, nSeeds, null);
      const stones = [{ cx: 52, cy: 74, rx: 26, ry: 13, holes: [44, 60], pins: [38, 66] }, { cx: 110, cy: 70, rx: 23, ry: 15, holes: [102, 118], pins: [96, 124] }];
      for (const st of stones) {
        const b = blob(st.cx, st.cy, st.rx, st.ry, st.holes);
        for (const px of st.pins) {
          let top = 0; for (const i of b.cells) { const x = i % W; if (x === px || x === px + 1) top = Math.max(top, (i / W) | 0); }
          supRect(px, top + 1, px + 1, gy - 1);
        }
        for (const hx of st.holes) {
          let top = H; for (const i of b.cells) { if (Math.abs((i % W) - hx) <= 3) top = Math.min(top, (i / W) | 0); }
          newPlant(at(hx, top - 1), 1);
        }
      }
    } else { // columna
      waterTop = H - 17;
      const ys = [26, 66, 106, 146], x0 = 52, w = 56, h = 24;
      for (const y of ys) {
        const b = slab(x0, y, w, h, []);
        const hl = hole(b, 80, y, y + h - 1);
        capsule(80, y + 12, 4, 1, hl);
        b.cells = b.cells.filter(i => type[i] === STONE && body[i] === b.id);
        supRect(1, y + h, x0 + 4, y + h + 1); supRect(x0 + w - 5, y + h, W - 2, y + h + 1);
      }
      newPlant(at(80, 25), 1);
    }
    for (const b of bodies) updBox(b);
  }

  // ---------- agua: distancia por el aire, para que las raíces la busquen ----------
  const isWater = i => ((i / W) | 0) >= waterTop;
  const wdist = new Int32Array(N), queue = new Int32Array(N);
  let wdirty = true;
  const passable = t => t === AIR || t === ROOT || t === DROOT || t === PLANT || t === SEED;
  function waterField() {
    wdist.fill(1 << 29); let qh = 0, qt = 0;
    for (let i = waterTop * W; i < (H - 1) * W; i++) if (passable(type[i])) { wdist[i] = 0; queue[qt++] = i; }
    while (qh < qt) {
      const c = queue[qh++], d = wdist[c] + 1;
      const n1 = c + 1, n2 = c - 1, n3 = c + W, n4 = c - W;
      if (wdist[n1] > d && passable(type[n1])) { wdist[n1] = d; queue[qt++] = n1; }
      if (wdist[n2] > d && passable(type[n2])) { wdist[n2] = d; queue[qt++] = n2; }
      if (wdist[n3] > d && passable(type[n3])) { wdist[n3] = d; queue[qt++] = n3; }
      if (wdist[n4] > d && passable(type[n4])) { wdist[n4] = d; queue[qt++] = n4; }
    }
    wdirty = false;
  }

  // ---------- plantas ----------
  function newPlant(i, gen, sp, ext) {
    if (type[i] !== AIR && type[i] !== SEED) return null;
    if (type[i - W] !== AIR) return null;
    type[i] = AIR;
    const p = { id: plants.length, sp: sp || MAIN, base: i, x: i % W, alive: true, age: 0, energy: 1.5, gen, roots: [], contact: [], tips: [i],
      waterRoots: 0, height: 0, stem: [], light: 1, top: i - W, lv: rnd(), born: week, died: -1 };
    if (ext) { p.ext = true; tot.germExt++; }
    plants.push(p); tot.plantsEver++; tot.germinated++; tot.germBy[p.sp] = (tot.germBy[p.sp] || 0) + 1;
    if (gen > tot.maxGen) tot.maxGen = gen;
    { const yy = (i / W) | 0; if (yy > tot.maxDepth) tot.maxDepth = yy; }
    placeRoot(i, p);
    return p;
  }
  function nearSolid(i) {
    for (const d of [1, -1, W, -W]) for (let k = 1; k <= 3; k++) {
      const t = type[i + d * k];
      if (t === STONE || t === CAP) return true;
      if (t === GLASS || t === SUP) break;
    }
    return false;
  }
  function placeRoot(i, p) {
    type[i] = ROOT; owner[i] = p.id; thick[i] = 0.2; p.roots.push(i);
    if (nearSolid(i)) p.contact.push(i);
    if (isWater(i)) { p.waterRoots++; if (!p.wet) { p.wet = true; tot.plantsWet++; } }
  }
  const canRoot = t => t === AIR || t === DROOT;
  const soft = t => t === AIR || t === DROOT || t === ROOT || t === PLANT || t === SEED;
  function chooseNext(c) {
    const x = c % W, y = (c / W) | 0;
    let hanging = true;
    for (let dy = -1; dy <= 1 && hanging; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = type[c + dy * W + dx]; if (t === STONE || t === CAP || t === SUP || t === GLASS) { hanging = false; break; }
    }
    const cand = [], wts = []; let tw = 0;
    const d0 = wdist[c];
    const tryAdd = (dx, dy, w) => {
      const nx = x + dx, ny = y + dy; if (nx < 1 || nx > W - 2 || ny < 1 || ny > H - 2) return;
      const n = ny * W + nx; const tn = type[n];
      if (!canRoot(tn) && tn !== ROOT) return;
      if (dx !== 0 && dy !== 0 && !soft(type[c + dx]) && !soft(type[c + dy * W])) return;
      if (tn === ROOT) w *= 0.4; // puede abrirse paso entre otras raíces
      if (d0 < (1 << 28)) { const dd = wdist[n] - d0; w *= dd < 0 ? 6 : dd > 0 ? 0.15 : 1; }
      cand.push(n); wts.push(w); tw += w;
    };
    if (hanging) { tryAdd(0, 1, 10); tryAdd(-1, 1, 0.6); tryAdd(1, 1, 0.6); }
    else { tryAdd(0, 1, 6); tryAdd(-1, 1, 3); tryAdd(1, 1, 3); tryAdd(-1, 0, 1.4); tryAdd(1, 0, 1.4); tryAdd(-1, -1, 0.2); tryAdd(1, -1, 0.2); tryAdd(0, -1, 0.1); }
    if (!cand.length) return -1;
    let r = rnd() * tw; for (let k = 0; k < cand.length; k++) { r -= wts[k]; if (r <= 0) return cand[k]; }
    return cand[cand.length - 1];
  }
  const hardOf = i => type[i] === STONE ? MAT[mat[i]].hard : 0.6;
  // Con presiones de 0.2 a 1 MPa una raíz no agrieta piedra sana ni vidrio: solo rompe los puentes
  // de las líneas de orificios (lineTick). Aquí solo queda el vigor, que decide qué tan rápido engrosa.
  function vigor(p) { return Math.min(1, p.energy / 1.5) * (0.4 + 0.6 * Math.min(1, p.light * SEASON)) * FT[p.sp] * (week < boostUntil ? 1.4 : 1) * (saltG > 0 ? 1 - 0.7 * saltStress() : 1); }
  function frontRoot(p) {
    let best = -1, bd = 1 << 30;
    for (let k = 0; k < 6; k++) {
      const c = p.roots[Math.floor(rnd() * p.roots.length)];
      if (c == null || type[c] !== ROOT || owner[c] !== p.id) continue;
      const d = wdist[c] + (rnd() * 6 | 0);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function growTips(p, steps) {
    if (p.roots.length > 2000) return;
    for (let k = 0; k < p.tips.length; k++) {
      let tip = p.tips[k];
      if (type[tip] !== ROOT) { tip = frontRoot(p); if (tip < 0) continue; }
      for (let st = 0; st < steps; st++) {
        if (isWater(tip) && rnd() < 0.7) break;
        const n = chooseNext(tip);
        if (n < 0) {
          // una punta atorada a veces rebrota desde otra parte de la raíz
          if (rnd() < 0.3) { const c = frontRoot(p); if (c >= 0) tip = c; }
          break;
        }
        if (type[n] === ROOT) { tip = n; continue; }
        placeRoot(n, p); tip = n;
      }
      p.tips[k] = tip;
    }
    const maxTips = p.waterRoots > 0 ? 2 : 3;
    if (p.tips.length < maxTips && rnd() < (p.waterRoots > 0 ? 0.08 : 0.25)) {
      const c = frontRoot(p);
      if (c >= 0) p.tips.push(c);
    }
  }
  function press(p) {
    // solo el engrosamiento que se ve en el dibujo
    if (p.waterRoots <= 0) return;
    const vig = vigor(p), by = (p.base / W) | 0;
    for (const c of p.contact) {
      if (type[c] !== ROOT || owner[c] !== p.id) continue;
      const near = Math.max(0.1, 1 - Math.abs(((c / W) | 0) - by) / 60);
      thick[c] = Math.min(3.5 * near + 0.3, thick[c] + 0.077 * par(p.sp, 'thickRate') * vig * near * (week < (p.hormUntil || 0) ? 2.5 : 1));
    }
  }
  // ---------- líneas de orificios: la raíz engrosa, aprieta y rompe puentes ----------
  function lineTick() {
    const dt = 4 / 52;
    for (const h of holes) {
      if (!h.intact || !h.line) continue;
      const L = h.line;
      // de las plantas con raíz en el orificio, cuenta la más cercana (la que puede engrosar ahí)
      const depth = p => L.y - ((p.base / W) | 0);
      let q = null;
      for (const c of h.cells) if (type[c] === ROOT) { const pl = plants[owner[c]]; if (pl && pl.alive && (!q || depth(pl) < depth(q))) q = pl; }
      if (q) {
        // la misma planta manda raíces por los orificios vecinos de la línea, cada vez más lejos
        if (L.first < 0 || L.firstBy !== q.id) { L.first = week; L.firstBy = q.id; }
        const hw = Math.floor(Math.min(60, 15 + 15 * (week - L.first) / 52) / L.s), vg = vigor(q);
        for (let i = Math.max(0, L.i0 - hw); i <= Math.min(L.n - 1, L.i0 + hw); i++) {
          const ow = L.own[i] >= 0 ? plants[L.own[i]] : null;
          if (ow === q || (ow && ow.alive && depth(ow) <= depth(q) + 3)) continue;
          if (i === L.i0 || rnd() < 0.15 * Math.max(0.2, vg)) { L.own[i] = q.id; L.D[i] = 0.8; }
        }
      }
      let active = false, gen = 0;
      for (let i = 0; i < L.n; i++) {
        const ow = L.own[i] >= 0 ? plants[L.own[i]] : null;
        if (!ow) { L.F[i] = 0; continue; }
        if (!ow.alive) { L.F[i] = 0; L.own[i] = -1; L.D[i] = 0; continue; }
        // la raíz engrosa más cerca del tronco: a 6 cm de la base casi no engrosa
        const taper = Math.max(0.1, 1 - (L.y - ((ow.base / W) | 0)) / 60);
        if (ow.waterRoots > 0) L.D[i] = Math.min(SPECIES[ow.sp].dmax * taper, L.D[i] + par(ow.sp, 'thickRate') * vigor(ow) * dt * (week < (ow.hormUntil || 0) ? 2.5 : 1));
        // presión: crece cuando la raíz ya llenó el orificio, con tope en la presión sostenida
        const pr = par(ow.sp, 'pSust') * Math.max(0, Math.min(1, (L.D[i] - L.d) / 0.5));
        L.F[i] = pr * L.d;
        if (pr > 0) { active = true; if (ow.gen > gen) gen = ow.gen; }
      }
      if (q) { const tv = Math.min(3.5, L.D[L.i0]); for (const c of h.cells) if (type[c] === ROOT && thick[c] < tv) thick[c] = tv; }
      if (active || L.broken > 0 || L.weak || week < 8) { lineFail(h, gen); L.weak = false; }
    }
  }
  function lineFail(h, gen) {
    const L = h.line, n = L.n;
    for (let it = 0; it <= n + 1; it++) {
      let nInt = 0; for (let j = 0; j <= n; j++) if (L.ok[j]) nInt++;
      if (!nInt) break;
      // el peso propio de la losa se reparte entre los puentes que quedan
      const sw = SIGW * LINE / nInt;
      L.load.fill(0);
      let last = -1, acc = 0;
      for (let j = 0; j <= n; j++) {
        if (L.ok[j]) {
          if (last < 0) L.load[j] += acc; else { L.load[last] += 0.5 * acc; L.load[j] += 0.5 * acc; }
          last = j; acc = 0;
        }
        if (j < n) acc += L.F[j];
      }
      if (last >= 0) L.load[last] += acc;
      let any = false;
      for (let j = 0; j <= n; j++) if (L.ok[j] && L.load[j] + sw >= L.R[j]) { L.ok[j] = 0; L.broken++; any = true; }
      if (!any) break;
    }
    if (L.broken >= n + 1) {
      for (let i = 0; i < n; i++) { const ow = L.own[i] >= 0 ? plants[L.own[i]] : null; if (ow && ow.alive && L.F[i] > 0 && !ow.broke) { ow.broke = true; tot.plantsBroke++; } }
      breakHole(h, gen || null);
    }
  }
  function lightAt(p) { return lightCell(p.top, p); }
  // luz en una celda: rayo hacia arriba (55 %) y hacia los lados (45 %); las hojas de otras plantas dan sombra
  function lightCell(i0, p) {
    const x = i0 % W, y = (i0 / W) | 0;
    const tr = t => (t === STONE || t === SUP) ? 0 : t === PLANT ? 0.8 : (t === CAP || t === ROOT || t === DROOT) ? 0.85 : 1;
    let up = 1; for (let yy = y - 1; yy > 0 && up > 0.01; yy--) { const i = yy * W + x; up *= holeOf[i] >= 0 && holes[holeOf[i]].intact ? 0.5 : tr(type[i]); }
    for (const q of plants) if (q.alive && q !== p && q.height > 6 && ((q.top / W) | 0) < y - 2 && Math.abs(q.x - x) <= 6) up *= 0.65;
    let lf = 1; for (let xx = x - 1; xx > 0 && lf > 0.01; xx--) lf *= tr(type[y * W + xx]);
    let rt = 1; for (let xx = x + 1; xx < W - 1 && rt > 0.01; xx++) rt *= tr(type[y * W + xx]);
    return (o.lightFrom === 'lados' ? 0.2 + 0.8 * (0.2 * up + 0.4 * lf + 0.4 * rt) : 0.2 + 0.8 * (0.55 * up + 0.225 * lf + 0.225 * rt)) * shade[x];
  }
  function growStem(p) {
    const n = p.base - W * (p.height + 1);
    if (n < W || type[n] !== AIR) return;
    type[n] = PLANT; owner[n] = p.id; p.stem.push(n); p.height++; p.top = n; p.energy -= 0.02;
  }
  function kill(p, why) {
    if (!p.alive) return;
    p.alive = false; p.died = week; p.why = why || '?';
    for (const c of p.roots) if (type[c] === ROOT && owner[c] === p.id) type[c] = DROOT;
    for (const c of p.stem) if (type[c] === PLANT && owner[c] === p.id) { type[c] = AIR; owner[c] = -1; }
    p.contact = []; p.tips = [];
  }
  function plantStep(p) {
    p.age++;
    if (p.age > par(p.sp, 'longevity') * 52 * (0.75 + 0.5 * p.lv)) { kill(p, 'vejez'); return; }
    if (type[p.base] !== ROOT || owner[p.base] !== p.id) { kill(p, 'base'); return; }
    if (p.waterRoots <= 0) {
      p.energy -= 0.025;
      growTips(p, 8);
      if (p.energy <= 0) kill(p, 'sed');
      return;
    }
    p.energy += 0.1 * Math.min(1.1, p.light * SEASON) * FT[p.sp] * (week < boostUntil ? 1.5 : 1) - 0.016 - 0.00002 * p.roots.length;
    const ss = saltG > 0 ? saltStress() : 0;
    if (ss > 0) p.energy -= 0.1 * ss;   // el agua salada quema las raíces que la beben
    if (p.energy > 3) p.energy = 3;
    if (p.energy <= 0) { kill(p, ss > 0.3 ? 'sal' : 'hambre'); if (ss > 0.3) tot.saltKilled++; return; }
    if (p.energy > 0.6 && p.height < 45 && (week & 1) === 0) growStem(p);
    if ((week & 1) === 0) growTips(p, 1);
    if ((week & 3) === 0) press(p);
    if (week % 26 === 0) {
      p.roots = p.roots.filter(c => type[c] === ROOT && owner[c] === p.id);
      p.contact = p.roots.filter(nearSolid);
    }
    if (o.selfSeed > 0 && p.age > 52 && p.energy > 1.8 && rnd() < 0.01 * o.selfSeed) {
      const x = Math.max(2, Math.min(W - 3, p.x + Math.round((rnd() - 0.5) * 18)));
      releaseSeed(x, (p.top / W) | 0, p.gen, false, week, p.sp);
    }
  }

  // ---------- grietas, orificios que ceden, cápsulas, semillas ----------
  function markCause(b, gen) { if (b && gen != null && gen > b.cause) b.cause = gen; }
  function crackCell(n, gen) {
    const b = bodies[body[n]];
    type[n] = AIR; body[n] = -1; dmg[n] = 0; changed = true;
    if (b) { b.dirty = true; markCause(b, gen); }
  }
  function crack(n, src, gen) {
    if (type[n] !== STONE) return;
    const hard = hardOf(n);
    let dx = Math.sign((n % W) - (src % W)), dy = Math.sign(((n / W) | 0) - ((src / W) | 0));
    if (!dx && !dy) dx = rnd() < 0.5 ? -1 : 1;
    crackCell(n, gen);
    let e = 4 * (1 - hard), cur = n;
    for (let k = 0; k < 60 && e > 0.05; k++) {
      let tw = 0; const ws = [];
      for (const [a, b] of [[dx, dy], [dx - dy, dy + dx], [dx + dy, dy - dx]]) {
        const j = cur + Math.sign(b) * W + Math.sign(a); const w = type[j] === STONE ? Math.pow(1.3 - str[j], 2) : 0; ws.push([j, w]); tw += w;
      }
      if (tw <= 0) break;
      let best = -1, r = rnd() * tw; for (const [j, w] of ws) { r -= w; if (r <= 0) { best = j; break; } }
      if (best < 0) break;
      dmg[best] += e;
      if (dmg[best] >= 1) { crackCell(best, gen); cur = best; e *= 0.9; } else break;
    }
  }
  function breakHole(h, gen) {
    if (!h.intact) return;
    h.intact = false; tot.holesBroken++; changed = true; wake();
    for (const i of h.cells) if (holeOf[i] === h.id) holeOf[i] = -1;
    const b = bodies[h.body]; if (b) { b.dirty = true; markCause(b, gen); }
    // la grieta que parte la piedra a lo largo del orificio
    for (const i of h.cells) for (const d of [1, -1]) { const n = i + d; if (type[n] === STONE && rnd() < 0.15) crackCell(n, gen); }
    const c0 = h.cells[0] || 0;
    events.push({ k: 'hole', x: c0 % W, y: (c0 / W) | 0, w: week });
  }
  function breakCap(id, causeGen, byRoot) {
    const c = caps[id]; if (!c || !c.intact) return;
    c.intact = false; tot.capsBroken++; changed = true;
    for (const i of c.cells) if (type[i] === CAP && capOf[i] === id) { type[i] = AIR; capOf[i] = -1; }
    const seeds = [];
    for (let y = c.cy - c.r; y <= c.cy + c.r; y++) for (let x = c.cx - c.r; x <= c.cx + c.r; x++) {
      const i = at(x, y); if (type[i] === SEED && capOf[i] === id) { type[i] = AIR; capOf[i] = -1; seeds.push([x, y]); }
    }
    tot.seedsOut += seeds.length;
    // las semillas de cápsula se sellaron en la semana 0
    seeds.forEach(([x, y], k) => releaseSeed(x, y, Math.max(1, causeGen) + 1, !byRoot, 0, c.mix[k % c.mix.length]));
    events.push({ k: 'cap', x: c.cx, y: c.cy, w: week });
  }
  const blocksSeed = t => t === GLASS || t === SUP || t === STONE || t === CAP;
  function releaseSeed(x, y, gen, burst, born, sp, ext) {
    let vx = burst ? (rnd() * 6 - 3) : 0;
    for (let k = 0; k < H; k++) {
      if (Math.abs(vx) > 0.3) { const nx = x + Math.sign(vx); if (nx > 0 && nx < W - 1 && !blocksSeed(type[at(nx, y)])) x = nx; else vx = 0; vx *= 0.8; }
      else if (rnd() < 0.12) { const nx = x + (rnd() < 0.5 ? -1 : 1); if (nx > 0 && nx < W - 1 && !blocksSeed(type[at(nx, y)])) x = nx; }
      if (y + 1 >= waterTop) { tot.drowned++; return; }
      if (blocksSeed(type[at(x, y + 1)])) {
        const i = at(x, y);
        if (type[i] === AIR || type[i] === DROOT) { type[i] = SEED; capOf[i] = -1; landed.push({ i, wait: 2 + Math.floor(rnd() * 8), gen, born: born || 0, sp: sp || MAIN, ext: !!ext }); }
        return;
      }
      y++;
    }
  }
  function germinate() {
    for (let k = landed.length - 1; k >= 0; k--) {
      const L = landed[k];
      if (type[L.i] !== SEED) { landed.splice(k, 1); tot.crushed++; continue; }
      if (--L.wait > 0) continue;
      // la semilla pierde viabilidad con los años que esperó (más rápido con calor)
      const v = par(L.sp, 'germ') * viabSp(L.sp, week - L.born);
      if (SPECIES[L.sp].lightGerm) {
        // la higuera no germina a oscuras ni bajo hojas: queda latente, sigue envejeciendo, y vuelve a probar
        const lf = Math.min(1, Math.max(0, (lightCell(L.i, null) - 0.2) / 0.8) * SEASON / 0.5);
        if (rnd() > lf) {
          if (v < 0.005) { landed.splice(k, 1); type[L.i] = AIR; tot.dud++; tot.darkDud++; continue; }
          L.wait = 13; if (!L.dormant) { L.dormant = true; tot.dormant++; } continue;
        }
      }
      landed.splice(k, 1);
      type[L.i] = AIR;
      let vs = v; const lx = L.i % W, ly = (L.i / W) | 0;
      for (const sl of salt) if (sl.until > week && Math.abs(sl.x - lx) <= 18 && Math.abs(sl.y - ly) <= 18) vs *= 0.2; // la sal casi no deja germinar
      if (saltG > 0) vs *= Math.max(0, 1 - Math.max(0, salinity() - 1) / 4);    // y con el agua salada, menos aún: nada desde 5 g/L
      if (rnd() < vs) newPlant(L.i, L.gen, L.sp, L.ext); else tot.dud++;
    }
  }

  // ---------- cuerpos de piedra: partirse, apoyarse, caer ----------
  function updBox(b) { let my = 0, sx = 0; for (const i of b.cells) { const y = (i / W) | 0; if (y > my) my = y; sx += i % W; } b.maxY = my; b.comX = sx / Math.max(1, b.cells.length); }
  const liveHole = (i) => holeOf[i] >= 0 && holes[holeOf[i]].intact;
  function member(n, b) { return (type[n] === STONE && body[n] === b.id) || (liveHole(n) && holes[holeOf[n]].body === b.id); }
  function splitBody(b) {
    b.dirty = false;
    b.cells = b.cells.filter(i => type[i] === STONE && body[i] === b.id);
    const hs = b.holes.filter(id => holes[id].intact && holes[id].body === b.id);
    if (!b.cells.length) { b.alive = false; for (const id of hs) breakHole(holes[id], null); b.holes = []; return; }
    stampN++;
    const comps = [];
    const seeds0 = b.cells;
    for (const c0 of seeds0) {
      if (stamp[c0] === stampN) continue;
      const comp = { cells: [], holes: new Set() }, q = [c0]; stamp[c0] = stampN;
      for (let h = 0; h < q.length; h++) {
        const c = q[h];
        if (type[c] === STONE) comp.cells.push(c); else comp.holes.add(holeOf[c]);
        for (let dd = 0; dd < 4; dd++) {
          const n = c + (dd === 0 ? 1 : dd === 1 ? -1 : dd === 2 ? W : -W);
          if (stamp[n] !== stampN && member(n, b)) { stamp[n] = stampN; q.push(n); }
        }
      }
      comps.push(comp);
    }
    comps.sort((a, c) => c.cells.length - a.cells.length);
    b.cells = comps[0].cells; b.holes = [...comps[0].holes]; updBox(b);
    for (let k = 1; k < comps.length; k++) {
      // las migajas de menos de 6 mm² se vuelven polvo, para que no traben a las piezas grandes
      if (comps[k].cells.length < 6 && !comps[k].holes.size) { for (const i of comps[k].cells) { type[i] = AIR; body[i] = -1; } continue; }
      const nb = newBody(); nb.cause = b.cause; nb.cells = comps[k].cells; nb.holes = [...comps[k].holes];
      for (const i of nb.cells) body[i] = nb.id;
      for (const id of nb.holes) holes[id].body = nb.id;
      updBox(nb);
    }
  }
  const blocking = t => t === GLASS || t === SUP || t === CAP || t === STONE;
  function crush(j) {
    const t = type[j];
    if (t === ROOT || t === PLANT) {
      const q = plants[owner[j]];
      if (q && q.alive) {
        if (t === ROOT) { if (isWater(j)) q.waterRoots--; if (j === q.base) kill(q, 'aplastada'); }
        else kill(q, 'aplastada');
      }
      owner[j] = -1;
    }
  }
  function ownCap(n, b) { if (type[n] !== CAP) return false; const c = caps[capOf[n]]; return c && c.hole >= 0 && holes[c.hole].intact && holes[c.hole].body === b.id; }
  function canMove(b, off) {
    const ok = (n) => {
      if (member(n, b) || ownCap(n, b)) return true;
      if (blocking(type[n])) return false;
      if (liveHole(n)) return false; // el orificio de otra piedra cuenta como piedra
      return true;
    };
    for (const i of b.cells) if (!ok(i + off)) return false;
    for (const id of b.holes) { const h = holes[id]; if (!h.intact) continue; for (const i of h.cells) if (!ok(i + off)) return false; for (const cid of h.caps) { const c = caps[cid]; if (c.intact) for (const i of c.cells) if (!ok(i + off)) return false; } }
    return true;
  }
  const tmpS = [], tmpD = [], tmpM = [];
  function moveBody(b, off) {
    const dy = Math.round(off / W), dx = off - dy * W;
    const cs = b.cells, n = cs.length;
    const hs = b.holes.map(id => holes[id]).filter(h => h.intact);
    const cps = []; for (const h of hs) for (const cid of h.caps) if (caps[cid].intact) cps.push(caps[cid]);
    // 1. levantar todo
    for (let k = 0; k < n; k++) { const i = cs[k]; tmpS[k] = str[i]; tmpD[k] = dmg[i]; tmpM[k] = mat[i]; type[i] = AIR; body[i] = -1; }
    for (const h of hs) for (const i of h.cells) { const t = type[i]; if (t !== AIR && t !== CAP && t !== SEED) { crush(i); type[i] = AIR; } holeOf[i] = -1; }
    const capSeeds = [];
    for (const c of cps) {
      const sd = [];
      for (let y = c.cy - c.r; y <= c.cy + c.r; y++) for (let x = c.cx - c.r; x <= c.cx + c.r; x++) { const i = at(x, y); if (type[i] === SEED && capOf[i] === c.id) { sd.push(i); type[i] = AIR; capOf[i] = -1; } }
      for (const i of c.cells) { type[i] = AIR; capOf[i] = -1; }
      capSeeds.push(sd);
    }
    for (const h of hs) for (const i of h.cells) if (type[i] === SEED) { type[i] = AIR; }
    // 2. dejar todo en su nuevo lugar
    for (let k = 0; k < n; k++) { const j = cs[k] + off; crush(j); type[j] = STONE; body[j] = b.id; str[j] = tmpS[k]; dmg[j] = tmpD[k]; mat[j] = tmpM[k]; cs[k] = j; }
    for (const h of hs) for (let k = 0; k < h.cells.length; k++) { const j = h.cells[k] + off; if (type[j] !== STONE) { crush(j); type[j] = AIR; } holeOf[j] = h.id; h.cells[k] = j; }
    cps.forEach((c, ci) => {
      for (let k = 0; k < c.cells.length; k++) { const j = c.cells[k] + off; type[j] = CAP; capOf[j] = c.id; c.cells[k] = j; }
      for (const i of capSeeds[ci]) { const j = i + off; type[j] = SEED; capOf[j] = c.id; }
      c.cx += dx; c.cy += dy;
    });
  }
  // ---------- volcarse: girar sobre el borde del apoyo ----------
  const srcKind = new Int8Array(N), srcRef = new Int32Array(N);
  function comY(b) { let sy = 0; for (const i of b.cells) sy += (i / W) | 0; return sy / Math.max(1, b.cells.length); }
  function rotateBody(b, px, py, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const src = [];
    const add = (i, k, ref) => { if (srcKind[i]) return; srcKind[i] = k; srcRef[i] = ref; src.push(i); };
    const hs = b.holes.map(id => holes[id]).filter(h => h.intact);
    const cps = []; for (const h of hs) for (const cid of h.caps) if (caps[cid].intact) cps.push(caps[cid]);
    for (const c of cps) {
      for (const i of c.cells) add(i, 3, c.id);
      for (let y = c.cy - c.r; y <= c.cy + c.r; y++) for (let x = c.cx - c.r; x <= c.cx + c.r; x++) { const i = at(x, y); if (type[i] === SEED && capOf[i] === c.id) add(i, 4, c.id); }
    }
    for (let k = 0; k < b.cells.length; k++) add(b.cells[k], 1, k);
    for (const h of hs) for (const i of h.cells) add(i, 2, h.id);
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (const i of src) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    let tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;
    for (const [cx, cy] of [[x0, y0], [x1 + 1, y0], [x0, y1 + 1], [x1 + 1, y1 + 1]]) {
      const rx = px + (cx - px) * ca - (cy - py) * sa, ry = py + (cx - px) * sa + (cy - py) * ca;
      tx0 = Math.min(tx0, rx); tx1 = Math.max(tx1, rx); ty0 = Math.min(ty0, ry); ty1 = Math.max(ty1, ry);
    }
    const tg = [], tk = [], ts = [];
    let fail = false;
    for (let ty = Math.floor(ty0) - 1; ty <= Math.ceil(ty1) + 1 && !fail; ty++) for (let tx = Math.floor(tx0) - 1; tx <= Math.ceil(tx1) + 1; tx++) {
      const sx = Math.round(px + (tx + 0.5 - px) * ca + (ty + 0.5 - py) * sa - 0.5);
      const sy = Math.round(py - (tx + 0.5 - px) * sa + (ty + 0.5 - py) * ca - 0.5);
      if (sx < 1 || sx > W - 2 || sy < 1 || sy > H - 2) continue;
      const si = sy * W + sx, k = srcKind[si]; if (!k) continue;
      if (tx < 1 || tx > W - 2 || ty < 1 || ty > H - 2) { fail = true; break; }
      const ti = ty * W + tx;
      if (!srcKind[ti] && (k === 1 || k === 3) && (blocking(type[ti]) || liveHole(ti))) { fail = true; break; }
      tg.push(ti); tk.push(k); ts.push(si);
    }
    if (fail || !tg.length) { for (const i of src) srcKind[i] = 0; return false; }
    const pS = [], pD = [], pM = [], pR = [];
    for (let j = 0; j < tg.length; j++) { const si = ts[j]; pS[j] = str[si]; pD[j] = dmg[si]; pM[j] = mat[si]; pR[j] = srcRef[si]; }
    for (const i of src) {
      const k = srcKind[i];
      if (k === 1) { type[i] = AIR; body[i] = -1; }
      else if (k === 2) { const t = type[i]; if (t === ROOT || t === DROOT || t === PLANT) crush(i); if (t !== STONE && t !== CAP) type[i] = AIR; holeOf[i] = -1; }
      else { type[i] = AIR; capOf[i] = -1; holeOf[i] = -1; }
    }
    for (const i of src) srcKind[i] = 0;
    b.cells = []; for (const h of hs) h.cells = []; for (const c of cps) c.cells = [];
    for (let j = 0; j < tg.length; j++) if (tk[j] === 2) { const ti = tg[j]; if (type[ti] !== STONE && type[ti] !== CAP) { crush(ti); type[ti] = AIR; } holeOf[ti] = pR[j]; holes[pR[j]].cells.push(ti); }
    for (let j = 0; j < tg.length; j++) {
      const ti = tg[j], k = tk[j];
      if (k === 1) { crush(ti); type[ti] = STONE; body[ti] = b.id; str[ti] = pS[j]; dmg[ti] = pD[j]; mat[ti] = pM[j]; holeOf[ti] = -1; b.cells.push(ti); }
      else if (k === 3) { crush(ti); type[ti] = CAP; capOf[ti] = pR[j]; holeOf[ti] = caps[pR[j]].hole; caps[pR[j]].cells.push(ti); }
      else if (k === 4) { type[ti] = SEED; capOf[ti] = pR[j]; }
    }
    for (const c of cps) { const rx = px + (c.cx + 0.5 - px) * ca - (c.cy + 0.5 - py) * sa - 0.5, ry = py + (c.cx + 0.5 - px) * sa + (c.cy + 0.5 - py) * ca - 0.5; c.cx = Math.round(rx); c.cy = Math.round(ry); }
    for (const h of hs) h.cells = [...new Set(h.cells)];
    updBox(b); b.dirty = true;
    return true;
  }
  function impact(b, d) {
    updBox(b);
    if (b.cause > lastCause) lastCause = b.cause;
    if (d < 3) return;
    const mass = b.cells.length, E = mass * d;
    if (mass >= 15) { tot.falls++; events.push({ k: 'fall', x: Math.round(b.comX), y: b.maxY, w: week, m: mass, d }); }
    const capHit = new Set(), stoneHit = [];
    for (const i of b.cells) { const n = i + W; if (type[n] === CAP && !ownCap(n, b)) capHit.add(capOf[n]); else if (type[n] === STONE && body[n] !== b.id) stoneHit.push(n); }
    const thr = 200 * Math.pow(10, 3 * (1 - o.capFrag));
    for (const id of capHit) if (E / capHit.size >= thr * (0.7 + 0.6 * rnd())) breakCap(id, b.cause, false);
    // embedded capsules feel the shock too
    for (const id of b.holes) for (const cid of holes[id].caps) if (caps[cid].intact && E * 0.25 >= thr * (0.7 + 0.6 * rnd())) breakCap(cid, b.cause, false);
    let hard = 0; const sN = Math.min(30, mass); for (let k = 0; k < sN; k++) hard += hardOf(b.cells[Math.floor(rnd() * mass)]); hard /= sN;
    if (mass > 12 && rnd() < 1 - Math.exp(-d * (1 - hard) / 30)) {
      const c = b.cells[Math.floor(rnd() * mass)];
      const dirs = [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1];
      const dd = dirs[Math.floor(rnd() * dirs.length)];
      crack(c, c - dd, null); crack(c + dd, c, null);
      for (const id of b.holes) if (rnd() < 0.5) breakHole(holes[id], null);
    }
    // el golpe puede romper algunos puentes de las líneas de la losa que recibe la caída
    for (const bid of new Set(stoneHit.map(n => body[n]))) {
      const hb = bodies[bid]; if (!hb) continue;
      for (const id of hb.holes) {
        const L = holes[id].intact ? holes[id].line : null; if (!L) continue;
        for (let j = 0; j <= L.n; j++) if (L.ok[j] && rnd() < Math.min(0.3, E * 2e-6 / L.R[j])) { L.ok[j] = 0; L.broken++; }
      }
    }
    for (let k = 0; k < Math.min(8, stoneHit.length); k++) {
      const n = stoneHit[Math.floor(rnd() * stoneHit.length)];
      dmg[n] += 0.00004 * E * (1 - hardOf(n)) / str[n];
      if (dmg[n] >= 1) crack(n, n - W, null);
    }
    changed = true;
  }
  // una pieza que se mueve muchas veces sin bajar (se mece en su lugar) se queda quieta
  function stabilize(b) {
    const y0b = comY(b), r = stabilize1(b);
    if (r) { const y1 = comY(b); if (y1 > (b.bestY == null ? y0b : b.bestY) + 0.3) { b.bestY = y1; b.stall = 0; } else b.stall = (b.stall || 0) + 1; }
    return r;
  }
  function wake() { for (const b of bodies) { b.stall = 0; b.bestY = null; } }
  function stabilize1(b) {
    let contacts = 0, minX = 1e9, maxX = -1, sx = 0;
    for (const i of b.cells) {
      const x = i % W; sx += x;
      const n = i + W, t = type[n];
      const sup = t === GLASS || t === SUP || (t === CAP && !ownCap(n, b)) || (t === STONE && body[n] !== b.id) || (liveHole(n) && holes[holeOf[n]].body !== b.id);
      if (sup) { contacts++; if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
    const com = sx / b.cells.length;
    if (!contacts) {
      let d = 0; while (d < H && canMove(b, W)) { moveBody(b, W); d++; }
      if (d > 0) { impact(b, d + Math.round(b.tipDrop || 0)); b.tipDrop = 0; b.tilt = 0; return true; }
      return false;
    }
    if ((b.stall || 0) <= 40 && (com < minX - 0.5 || com > maxX + 0.5)) {
      const dir = com > maxX ? 1 : -1, px = dir > 0 ? maxX + 1 : minX;
      let py = 0; for (const i of b.cells) { const x = i % W; if (x === (dir > 0 ? maxX : minX)) py = Math.max(py, ((i / W) | 0) + 1); }
      const y0 = comY(b);
      if ((b.tilt || 0) > 0.55) {
        // demasiado inclinada: resbala del borde
        if (canMove(b, dir + W)) { moveBody(b, dir + W); updBox(b); b.tipDrop = (b.tipDrop || 0) + 1; return true; }
        if (canMove(b, dir)) { moveBody(b, dir); updBox(b); return true; }
      }
      if (rotateBody(b, px, py, dir * 0.12) || rotateBody(b, px, py, dir * 0.05)) { b.tipDrop = (b.tipDrop || 0) + comY(b) - y0; b.tilt = (b.tilt || 0) + 0.1; return true; }
    }
    if ((b.tipDrop || 0) > 2) { impact(b, Math.round(b.tipDrop)); }
    b.tipDrop = 0; b.tilt = 0;
    // una pieza que queda apoyada sobre una cápsula suelta la carga con su peso: puede romperla
    let broke = false;
    if (b.cells.length >= 40) for (const i of b.cells) for (const n of [i + W, i + W - 1, i + W + 1, i + 1, i - 1]) {
      if (type[n] !== CAP || ownCap(n, b)) continue;
      const c = caps[capOf[n]]; if (!c || !c.intact || c.loadBy === b.id) continue;
      c.loadBy = b.id;
      if (rnd() < 1 - Math.exp(-b.cells.length / (400 * (1.2 - o.capFrag)))) { breakCap(c.id, b.cause, false); broke = true; }
    }
    return broke;
  }
  function capSupported(c) {
    for (const i of c.cells) {
      const n = i + W; if (capOf[n] === c.id && type[n] === CAP) continue;
      const t = type[n];
      if (t === GLASS || t === SUP || t === STONE || liveHole(n)) return true;
      if (t === CAP && capOf[n] !== c.id) { const o2 = caps[capOf[n]]; if (o2 && (o2.cy > c.cy || o2.hole >= 0)) return true; }
    }
    return false;
  }
  function capFree(c, off) {
    for (const i of c.cells) { const n = i + off; if (type[n] === CAP && capOf[n] === c.id) continue; const t = type[n]; if (t === GLASS || t === SUP || t === STONE || t === CAP || liveHole(n)) return false; }
    return true;
  }
  function shiftCap(c, off) {
    const sd = [];
    for (let y = c.cy - c.r; y <= c.cy + c.r; y++) for (let x = c.cx - c.r; x <= c.cx + c.r; x++) { const i = at(x, y); if (type[i] === SEED && capOf[i] === c.id) { sd.push(i); type[i] = AIR; capOf[i] = -1; } }
    for (const i of c.cells) { type[i] = AIR; capOf[i] = -1; }
    for (let k = 0; k < c.cells.length; k++) { const j = c.cells[k] + off; crush(j); type[j] = CAP; capOf[j] = c.id; c.cells[k] = j; }
    for (const i of sd) { const j = i + off; type[j] = SEED; capOf[j] = c.id; }
    c.cy += Math.round(off / W); c.cx += off - Math.round(off / W) * W;
  }
  function dropCaps() {
    let moved = false;
    for (const c of caps) {
      if (!c.intact || c.hole >= 0) continue;
      let d = 0;
      for (let g = 0; g < 2 * H; g++) {
        // cae si nada la sostiene; si está sobre una pendiente, rueda
        let off = 0;
        if (!capSupported(c) && capFree(c, W)) off = W;
        else { const a = capFree(c, W + 1), b2 = capFree(c, W - 1); if (a || b2) off = a && b2 ? (rnd() < 0.5 ? W + 1 : W - 1) : a ? W + 1 : W - 1; }
        // en una pendiente suave (desde unos 25°) también rueda
        for (const k of [2, 3]) {
          if (off) break;
          const a = capFree(c, 1) && capFree(c, W + k), b2 = capFree(c, -1) && capFree(c, W - k);
          if (a || b2) off = a && b2 ? (rnd() < 0.5 ? W + k : W - k) : a ? W + k : W - k;
        }
        if (!off) break;
        shiftCap(c, off); d++;
      }
      // la caída se suma hasta que la cápsula queda quieta; entonces se decide si se rompió
      if (d > 0) { moved = true; c.fallAcc = (c.fallAcc || 0) + d; }
    }
    return moved;
  }
  function settle() {
    for (let k = 0; k < bodies.length; k++) if (bodies[k].alive && bodies[k].dirty) splitBody(bodies[k]);
    let moved = false;
    for (let pass = 0; pass < 60; pass++) {
      moved = false;
      const order = bodies.filter(b => b.alive && b.cells.length).sort((a, b) => b.maxY - a.maxY);
      for (const b of order) if (stabilize(b)) moved = true;
      for (let k = 0; k < bodies.length; k++) if (bodies[k].alive && bodies[k].dirty) { splitBody(bodies[k]); moved = true; }
      if (dropCaps()) moved = true;
      if (!moved) break;
    }
    // si algo seguía resbalando o girando, sigue la semana que entra
    changed = moved;
    if (!moved) for (const c of caps) if (c.intact && c.fallAcc) {
      const d = c.fallAcc; c.fallAcc = 0; tot.capsFell++;
      if (d >= 4 && rnd() < 1 - Math.exp(-d * o.capFrag / 20)) breakCap(c.id, lastCause, false);
    }
  }

  // ---------- ampolletas de afuera ----------
  function landPoint(x) {
    for (let y = 6; y < H - 2; y++) {
      if (y + 1 >= waterTop) return { x, y, water: true };
      const t = type[at(x, y + 1)];
      if (t === STONE || t === SUP || t === GLASS || t === CAP) return { x, y, water: false };
    }
    return { x, y: H - 2, water: true };
  }
  function hurtRoots(lp, r, dmgE) {
    for (const p of plants) {
      if (!p.alive) continue;
      let near = false;
      for (const c of p.roots) { if (type[c] !== ROOT) continue; const dx = (c % W) - lp.x, dy = ((c / W) | 0) - lp.y; if (dx * dx + dy * dy <= r * r) { near = true; break; } }
      if (!near && lp.water) near = p.waterRoots > 0 && dmgE > 1; // la sal en el agua alcanza a las raíces sumergidas
      if (near) { p.energy -= lp.water ? dmgE * 0.4 : dmgE; tot.chem++; if (p.energy <= 0) kill(p, 'químico'); }
    }
  }
  function fireAmpoule(kind, n) {
    // Una ampolleta con número (la urna) tiene su propio lugar en el riel y su propio azar:
    // así lo que hace es solo suyo, y no mueve a las que vienen después.
    let rr = rnd;
    if (n != null) { let sa = (((o.seed >>> 0) ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0) || 1; rr = () => { sa = (sa + 0x6D2B79F5) | 0; let t = Math.imul(sa ^ (sa >>> 15), 1 | sa); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const x = Math.max(4, Math.min(W - 5, RACK[(n != null ? n : rackI++) % RACK.length] + Math.round((rr() - 0.5) * 6)));
    const lp = landPoint(x);
    tot.ext++; tot.extBy[kind] = (tot.extBy[kind] || 0) + 1;
    events.push({ k: 'ext', t: kind, x, y: lp.y, w: week });
    if (kind === 'semillas') {
      const n = Math.max(1, Math.round(o.seedsPerCap));
      let g = 1; for (const p of plants) if (p.alive && p.gen > g) g = p.gen;
      const nP = o.capMix === 'mezcla' && n >= 2 ? Math.max(1, Math.round(n * 0.3)) : 0;
      for (let k = 0; k < n; k++) releaseSeed(x + Math.round((rr() - 0.5) * 4), 7, g, true, week, k < nP ? PARTNER : MAIN, true);
    } else if (kind === 'nutrientes') {
      boostUntil = week + 26; // medio año con más vigor
    } else if (kind === 'acido') {
      if (!lp.water) {
        // el ácido disuelve la caliza donde cae y debilita los puentes de las líneas cercanas
        for (let dy = 1; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const i = at(lp.x + dx, lp.y + dy); if (type[i] === STONE && Math.abs(dx) + dy <= 4 && rr() < 0.7) crackCell(i, null); }
        for (const h of holes) {
          if (!h.intact || !h.line || !h.cells.length) continue;
          const c0 = h.cells[0], hx = c0 % W, hy = (c0 / W) | 0;
          if (Math.abs(hx - lp.x) <= 25 && hy >= lp.y - 2 && hy <= lp.y + 20) { const L = h.line; for (let j = 0; j <= L.n; j++) L.R[j] *= 0.7; L.weak = true; }
        }
      }
      hurtRoots(lp, 15, 0.6);
    } else if (kind === 'inundar') {
      // Saturar: agua de más. Sube el nivel para siempre: las raíces llegan antes, la sal se diluye, lo bajo se ahoga
      setWater(Math.max(waterTop0 - 24, waterTop - 6));
    } else if (kind === 'secante') {
      // Privar: un polímero que atrapa agua. Baja el nivel: raíces en seco y la sal más concentrada
      setWater(Math.min(H - 4, waterTop + 6));
    } else if (kind === 'tinta') {
      // Ocultar: tinta en el vidrio. Una franja queda en sombra para siempre, para las plantas y para quien mira
      for (let xx = Math.max(1, lp.x - 18); xx <= Math.min(W - 2, lp.x + 18); xx++) shade[xx] = Math.min(shade[xx], 0.35);
    } else if (kind === 'resina') {
      // Fijar la junta: resina en las líneas cercanas. Esa losa ya casi no se parte
      for (const h of holes) {
        if (!h.intact || !h.line || !h.cells.length) continue;
        const c0 = h.cells[0], hx = c0 % W, hy = (c0 / W) | 0;
        if (Math.abs(hx - lp.x) <= 25 && hy >= lp.y - 2 && hy <= lp.y + 20) { const L = h.line; for (let j = 0; j <= L.n; j++) L.R[j] *= 3; }
      }
    } else if (kind === 'hormona') {
      // Exagerar: hormona de enraizamiento. La planta más cercana engrosa sus raíces 2.5 veces durante un año
      let best = null, bd = 1e9;
      for (const p of plants) { if (!p.alive) continue; const d = Math.abs(p.x - lp.x) + Math.abs(((p.base / W) | 0) - lp.y); if (d < bd) { bd = d; best = p; } }
      if (best) best.hormUntil = week + 52;
    } else if (kind === 'composta') {
      // Correr con lo que sobra: composta de las raíces muertas. Más muertas, más semanas de vigor para todas
      let dead = 0; for (let i = 0; i < N; i++) if (type[i] === DROOT) dead++;
      boostUntil = Math.max(boostUntil, week) + Math.min(52, 6 + Math.round(dead / 30));
    } else if (kind === 'agua' && o.ampMl > 0) {
      // Ensayar, como en la vida real: un mililitro más en el agua. Diluye un poco la sal; el nivel sube solo cuando suman un milímetro
      extraMl += o.ampMl;
      const mm = Math.floor(extraMl / (o.waterMl / Math.max(1, H - 1 - waterTop0)));
      if (mm > risenMm) { setWater(Math.max(waterTop0 - 24, waterTop - (mm - risenMm))); risenMm = mm; }
    } else if (kind === 'sal') {
      saltG += o.saltG;
      hurtRoots(lp, 22, 1.3);
      salt.push({ x: lp.x, y: lp.y, until: week + 104 });
      for (let k = landed.length - 1; k >= 0; k--) { const L = landed[k], lx = L.i % W, ly = (L.i / W) | 0; if (Math.abs(lx - lp.x) <= 22 && Math.abs(ly - lp.y) <= 22) { type[L.i] = AIR; landed.splice(k, 1); tot.dud++; } }
    }
  }
  function setWater(nt) {
    if (nt === waterTop) return;
    waterTop = nt; wdirty = true; changed = true;
    for (const p of plants) {
      if (!p.alive) continue;
      let n = 0; for (const c of p.roots) if (type[c] === ROOT && isWater(c)) n++;
      p.waterRoots = n;
      if (((p.base / W) | 0) >= waterTop) kill(p, 'ahogada');
    }
    for (let k = landed.length - 1; k >= 0; k--) if (((landed[k].i / W) | 0) >= waterTop) { type[landed[k].i] = AIR; landed.splice(k, 1); tot.drowned++; }
  }
  function urnaBuy(kind, human) {
    if (!URNA || !ALLK.includes(kind) || ust.stock[kind] <= 0 || ending === 'apaga' || ending === 'quitada') return null;
    const price = ust.price, id = ++ust.n;
    ust.money += price; ust.fund += price; ust.stock[kind]--;
    let claim = null;
    if (!human) { const r = rnd(); if (r >= o.uSilent) claim = r < o.uSilent + o.uLie ? KINDS.filter(t => t !== kind)[Math.floor(rnd() * 2)] : kind; }
    const rec = { id, w: week, price, kind, claim, who: human ? 'Tú' : `Persona ${id}`, human: !!human };
    buys.push(rec);
    fireAmpoule(kind);
    events[events.length - 1].buy = id;
    ust.price = price * 2; ust.lastChange = week; if (ust.price > ust.maxPrice) ust.maxPrice = ust.price;
    priceLog.push([week, ust.price]);
    return rec;
  }
  function urnaReveal() {
    const fresh = buys.filter(b => b.w > ust.revealedUpTo || (ust.revealedUpTo === 0 && b.w === 0));
    ust.revealedUpTo = week; ust.reveals++; ust.nextReveal = week + Math.round(o.uReveal * 52.18);
    const c = { semillas: 0, sal: 0, agua: 0 }; let said = 0, lies = 0;
    for (const b of fresh) { b.open = true; c[b.kind] = (c[b.kind] || 0) + 1; if (b.claim != null) { said++; if (b.claim !== b.kind) lies++; } }
    uLog.push({ w: week, k: 'urna', n: fresh.length, c, said, lies });
  }
  function urnaTick() {
    if (ending === 'apaga' || ending === 'quitada') return;
    // la renta: si el fondo no alcanza, quitan la urna y con ella la caja
    if (RENTW > 0) {
      ust.fund -= RENTW; ust.rentPaid += RENTW;
      if (ust.fund < 0) { ust.fund = 0; ending = 'quitada'; endWeek = week; uLog.push({ w: week, k: 'quitada' }); fundLog.push([week, 0]); return; }
      if (week % 4 === 0) fundLog.push([week, ust.fund]);
    }
    let A = 0; for (const p of plants) if (p.alive) A++;
    const danger = A === 0 ? 1 : A <= 2 ? 0.5 : 0;
    const evict = Math.max(0, Math.min(1, (3 - monthsLeft()) / 3));   // quien quiere que siga también paga para que no la quiten
    const n = poisson(o.uVisitors);
    for (let i = 0; i < n; i++) {
      const r = rnd();
      const side = r < o.uSiga ? 'S' : r < o.uSiga + o.uMuera ? 'M' : 'G';
      // quien quiere que siga paga más cuando la ve morir; quien quiere que muera, cuando la ve llena
      const urg = side === 'S' ? (1 + 2 * danger) * (1 + evict) : side === 'M' ? 1 + 0.5 * Math.min(1, A / 8) : 0.5;
      if (o.uWtp * Math.exp(o.uTail * gauss()) * urg < ust.price) continue;
      const kind = side === 'S' ? 'semillas' : side === 'M' ? 'sal' : 'agua';
      if (ust.stock[kind] > 0) urnaBuy(kind, false);
    }
    if (week - ust.lastChange >= QUIET && ust.price > o.uP0) { ust.price = Math.max(o.uP0, ust.price / 2); ust.lastChange = week; priceLog.push([week, ust.price]); }
    if (week >= ust.nextReveal) urnaReveal();
  }
  function externalTick() {
    if (URNA) { urnaTick(); return; }
    for (const r of rules) {
      if (r.t === 'ninguna' || r.f <= 0 || r.left <= 0) continue;
      if (rnd() < r.f / 52.18) { r.left--; fireAmpoule(r.t); }
    }
  }
  const seedsComing = () => URNA ? (ust.stock.semillas > 0 && salinity() < 5) : rules.some(r => r.t === 'semillas' && r.f > 0 && r.left > 0);

  // ---------- una semana ----------
  function step() {
    if (ending === 'quitada') return;
    week++;
    SEASON = seasonAt(week);
    externalTick();
    if (o.rust > 0 && (week & 3) === 0) for (const i of supCells) if (type[i] === SUP && life[i] < week) { type[i] = AIR; changed = true; }
    if ((week & 3) === 1) for (const p of plants) if (p.alive) p.light = lightAt(p);
    for (let k = 0; k < plants.length; k++) if (plants[k].alive) plantStep(plants[k]);
    if ((week & 3) === 2) lineTick();
    germinate();
    if (!changed) for (const b of bodies) if (b.alive && b.dirty) { changed = true; break; }
    if (changed) { settle(); wdirty = true; }
    if (wdirty || week % 13 === 0) waterField();
    if (week % 52 === 0) for (let k = 0; k < 60; k++) { const i = Math.floor(rnd() * N); if (type[i] === DROOT && rnd() < 0.3) type[i] = AIR; }
    let alive = 0; for (const p of plants) if (p.alive) alive++;
    if (week % 4 === 0) hist.push(alive);
    if (!ending) {
      if (ending === 'quitada') { /* la quitaron */ }
      else if (alive === 0 && landed.length === 0 && !seedsComing()) { ending = 'apaga'; endWeek = week; }
      else if (alive >= 30) { ending = 'llena'; endWeek = week; }
    }
  }
  function stats() {
    let alive = 0, gen = 0; for (const p of plants) if (p.alive) { alive++; if (p.gen > gen) gen = p.gen; }
    let lineMax = 0; for (const h of holes) if (h.intact && h.line) lineMax = Math.max(lineMax, h.line.broken / (h.line.n + 1));
    return { week, years: week / 52, alive, waiting: landed.length, capsLeft: caps.filter(c => c.intact).length, caps: caps.length,
      gens: tot.maxGen, genNow: gen, pieces: bodies.filter(b => b.alive && b.cells.length).length, ...tot, ending, endWeek,
      lineMax, season: SEASON, boost: week < boostUntil, rules: rules.map(r => ({ t: r.t, f: r.f, left: r.left })), seedV: viab(week), seedV2: o.capMix === 'mezcla' ? viabSp(PARTNER, week) : null, partner: PARTNER, ratio: designRatio(), fT,
      salinity: salinity(), saltStress: saltStress(), waterDelta: waterTop0 - waterTop, ink: shade.reduce((a, v) => a + (v < 1 ? 1 : 0), 0) / W, urna: URNA ? { price: ust.price, money: ust.money, n: ust.n, stock: Object.assign({}, ust.stock), nextReveal: ust.nextReveal, reveals: ust.reveals, maxPrice: ust.maxPrice, fund: ust.fund, rent: o.rent, monthsLeft: monthsLeft(), rentPaid: ust.rentPaid } : null };
  }

  build();
  waterTop0 = waterTop;
  waterField();
  return { RACK, W, H, N, AIR, GLASS, SUP, STONE, ROOT, DROOT, PLANT, SEED, CAP, type, mat, dmg, str, thick, owner, life, holeOf, capOf, holes, plants, caps, events, bodies, hist,
    get waterTop() { return waterTop; }, get week() { return week; }, step, stats, MAT, opt: o,
    buys, priceLog, uLog, fundLog, urnaBuy, shade, OPS, fire: fireAmpoule, get salinity() { return salinity(); } };
}
if (typeof module !== 'undefined') module.exports = makeSim;
