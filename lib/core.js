// Urna online: what the daily step, the demo and the checks share.
// One real day is one week in the box. Price, rent and openings are always worked out
// from the ledger, so anyone can redo the sums.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DAY = 86400000;
const makeSim = require('../engine/engine.js');

const readJSON = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } };
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 1) + '\n'); };
const round2 = v => Math.round(v * 100) / 100;

function loadConfig() { return readJSON(process.env.URNA_CONFIG || path.join(ROOT, 'config.json')); }
function dayIndex(cfg, t) { return Math.floor((new Date(t).getTime() - new Date(cfg.start).getTime()) / DAY); }
function dateOfDay(cfg, d) { return new Date(new Date(cfg.start).getTime() + d * DAY).toISOString().slice(0, 10); }

// ---------- price ----------
// Prices sit on a ladder: stepsPerDouble steps make the price double, rounded to plain amounts.
// Each ampoule broken climbs a whole doubling; each dropEveryDays days with none, it comes down one step.
// There is no single day worth waiting for: every week of waiting saves a little and risks someone else going first.
function priceLadder(cfg) {
  const P = cfg.price, out = [], n = Math.round(Math.log2(P.max / P.start) * P.stepsPerDouble);
  const nice = x => x < 10 ? Math.round(x * 10) / 10 : x < 100 ? Math.round(x) : x < 1000 ? Math.round(x / 5) * 5 : Math.round(x / 50) * 50;
  for (let i = 0; i <= n; i++) out.push(nice(P.start * Math.pow(2, i / P.stepsPerDouble)));
  return out;
}
// out[d] is the price posted at the start of day d.
function priceTimeline(cfg, purchases, upToDay) {
  const L = priceLadder(cfg), top = L.length - 1, byDay = new Map();
  for (const p of purchases) byDay.set(p.day, (byDay.get(p.day) || 0) + 1);
  let i = 0, quiet = 0;
  const out = [L[0]];
  for (let d = 0; d < upToDay; d++) {
    const k = byDay.get(d) || 0;
    if (k > 0) { i = Math.min(top, i + k * cfg.price.stepsPerDouble); quiet = 0; }
    else if (++quiet >= cfg.price.dropEveryDays) { i = Math.max(0, i - 1); quiet = 0; }
    out.push(L[i]);
  }
  return out;
}

// ---------- money ----------
const net = (cfg, amount) => amount - (amount * cfg.stripe.feePct + cfg.stripe.feeFixed);
// The urn pays its rent every monthDays days. It keeps reserveMonths of rent; the rest goes to the physical box.
// If a month can't be paid, the urn closes that day.
function fundTimeline(cfg, entries, upToDay) {
  const inc = new Map();
  for (const e of entries) inc.set(e.day, (inc.get(e.day) || 0) + net(cfg, e.amount));
  const F = cfg.fund;
  let fund = F.start, box = 0, rentPaid = 0, closedDay = null;
  for (let d = 0; d <= upToDay; d++) {
    fund += inc.get(d) || 0;
    if (F.rent > 0 && d > 0 && d % F.monthDays === 0) {
      if (fund < F.rent) { closedDay = d; break; }
      fund -= F.rent; rentPaid += F.rent;
      const keep = F.reserveMonths * F.rent;
      if (fund > keep) { box += fund - keep; fund = keep; }
    }
  }
  return { balance: round2(fund), toBox: round2(box), rentPaid: round2(rentPaid), closedDay, monthsLeft: F.rent > 0 ? round2(fund / F.rent) : null };
}

// ---------- seals ----------
const seal = (n, kind, nonce) => crypto.createHash('sha256').update(`${n}:${kind}:${nonce}`).digest('hex');
// Each ampoule breaks on a secret day: 1 to breakWithinDays days after it is bought, taken from its secret,
// so the seal already commits to it and anyone can check it when the urn opens.
const delayOf = (cfg, nonce) => 1 + parseInt(nonce.slice(0, 8), 16) % cfg.breakWithinDays;
// The page only shows salt in bands, so a single ampoule can't be read off the water.
const saltBand = g => g < 1.5 ? 0 : g < 3 ? 1 : g < 5 ? 2 : 3;
const newNonce = () => crypto.randomBytes(16).toString('hex');

// ---------- private ledger, encrypted ----------
function keyFrom(hex) {
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) throw new Error('URNA_KEY is missing: 64 hex characters. Make one with "npm run key".');
  return Buffer.from(hex, 'hex');
}
function encrypt(obj, hex) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyFrom(hex), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function decrypt(box, hex) {
  const d = crypto.createDecipheriv('aes-256-gcm', keyFrom(hex), Buffer.from(box.iv, 'base64'));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8'));
}
const PRIV = process.env.URNA_PRIV || path.join(ROOT, 'private', 'ledger.enc.json');
function loadPrivate(hex) { const box = readJSON(PRIV, null); return box ? decrypt(box, hex) : { entries: [], seen: [], lastCreated: 0 }; }
function savePrivate(priv, hex, p) { writeJSON(p || PRIV, encrypt(priv, hex)); }

// ---------- the box ----------
function engineOptions(cfg) {
  return Object.assign({ layout: 'pisos', capMode: 'encima', material: 0, prep: 'ranuras', holeD: 3, bridge: 1, plant: 'ficus', capMix: 'mezcla', saltG: 0.13 }, cfg.engine, { outside: 'ninguno', seed: cfg.seed });
}
// Kind keys are English in the ledger and the seals; the engine uses its own (Spanish) keys.
const engineKind = (cfg, key) => { const k = cfg.kinds.find(x => x.key === key); return k && k.engine ? k.engine : key; };
// Rebuilds the box from day 0. An ampoule that breaks on day d falls at the start of week d + 1.
function replay(cfg, entries, upToWeek) {
  const sim = makeSim(engineOptions(cfg));
  const byDay = new Map();
  for (const e of entries) { const d = e.breakDay != null ? e.breakDay : e.day; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(e); }
  for (let w = 1; w <= upToWeek; w++) {
    for (const e of (byDay.get(w - 1) || []).sort((a, b) => a.n - b.n)) sim.fire(engineKind(cfg, e.kind));
    sim.step();
  }
  return sim;
}
// The box at one byte per cell: the browser chooses the colours.
function snapshot(cfg, sim) {
  const { W, H, type, dmg, str, thick, holeOf, holes, life } = sim;
  const wt = sim.waterTop, wk = sim.week, cells = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const t = type[i], y = (i / W) | 0;
    let c = 0;
    if (t === 0) { const h = holeOf[i] >= 0 ? holes[holeOf[i]] : null; if (h && h.intact) { const f = h.line ? h.line.broken / (h.line.n + 1) : 0; c = 14 + Math.min(3, Math.floor(f * 4)); } else c = y >= wt ? 1 : 0; }
    else if (t === 1) c = 2;
    else if (t === 2) { const f = life[i] > 1e11 ? 0 : Math.min(1, wk / life[i]); c = 3 + Math.min(3, Math.floor(f * 4)); }
    else if (t === 3) { const k = (1 - 0.45 * Math.min(1, dmg[i])) * (0.9 + 0.1 * Math.min(1.2, str[i]) / 1.2); c = 10 + Math.max(0, Math.min(3, Math.floor((1 - k) / 0.12))); }
    else if (t === 4) c = 20 + Math.min(3, Math.floor(Math.min(1, thick[i] / 3) * 4));
    else if (t === 5) c = 24; else if (t === 6) c = 25; else if (t === 7) c = 26; else if (t === 8) c = 27;
    cells[i] = c;
  }
  const s = sim.stats();
  const shade = []; for (let x = 0; x < W; x++) if (sim.shade[x] < 1) shade.push(x);
  return {
    week: wk, years: round2(wk / 52.18), W, H, material: cfg.engine.material || 0,
    cells: Buffer.from(cells).toString('base64'),
    plants: sim.plants.filter(p => p.alive && p.height >= 3).map(p => ({ x: p.x, y: (p.top / W) | 0, v: round2(Math.min(1, p.energy / 2.2)), sp: p.sp, id: p.id })),
    shade, waterTop: wt, waterDelta: s.waterDelta, saltBand: saltBand(s.salinity),
    alive: s.alive, waiting: s.waiting, generation: s.gens, lines: s.holesBroken, capsBroken: s.capsBroken, caps: s.caps,
    planted: s.plantsEver, hist: sim.hist.slice(),
  };
}

module.exports = { ROOT, DAY, readJSON, writeJSON, round2, loadConfig, dayIndex, dateOfDay, priceLadder, priceTimeline, fundTimeline, net, seal, delayOf, saltBand, newNonce, encrypt, decrypt, loadPrivate, savePrivate, engineOptions, replay, snapshot };
