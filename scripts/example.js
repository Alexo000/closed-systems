// An example box for the loops on the page: the real engine, another seed and an invented public.
// It never touches the real urn. Writes a list of snapshots (one every few weeks of box time) as JSON.
// Usage: node scripts/example.js <out.json> [--seed N] [--years 20] [--every 16] [--extra kind@day]
//   --extra adds one more ampoule of that kind, broken on that day, for "what one ampoule does".
//   --scan tries seeds 1..200 and prints how eventful each one is, to choose a good example.
const fs = require('fs');
const C = require('../lib/core.js');
const makeSim = require('../engine/engine.js');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const cfg = C.loadConfig();
const years = +arg('--years', 20), every = +arg('--every', 16), weeks = Math.round(years * 52.18);

// an invented public that pays when the price suits it, like scripts/demo.js
function publicFor(seed) {
  let s = seed * 7 + 12345; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const WANT = [['seeds', 0.36], ['salt', 0.28], ['water', 0.12], ['resin', 0.08], ['hormone', 0.08], ['ink', 0.08]];
  const stock = Object.fromEntries(cfg.kinds.map(k => [k.key, k.stock]));
  const pick = () => { let r = rnd(); for (const [k, w] of WANT) if ((r -= w) <= 0) return k; return 'water'; };
  const buys = [], entries = [];
  for (let d = 0; d < weeks; d++) {
    const price = C.priceTimeline(cfg, buys, d)[d];
    for (let v = 0; v < 3; v++) {
      if (2.5 * Math.exp(1.4 * gauss()) < price) continue;
      const kind = pick(); if (stock[kind] <= 0) continue;
      stock[kind]--; buys.push({ day: d, amount: price });
      entries.push({ n: entries.length + 1, kind, day: d, breakDay: d + 1 + Math.floor(rnd() * cfg.breakWithinDays) });
    }
  }
  return entries;
}

function run(seed, extra) {
  const c = Object.assign({}, cfg, { seed });
  const entries = publicFor(seed);
  if (extra) entries.push({ n: 1e6, kind: extra.kind, day: extra.day, breakDay: extra.day });
  const sim = makeSim(C.engineOptions(c));
  const byDay = new Map(); for (const e of entries) { if (!byDay.has(e.breakDay)) byDay.set(e.breakDay, []); byDay.get(e.breakDay).push(e); }
  const total = cfg.kinds.reduce((a, k) => a + k.stock, 0), frames = [];
  for (let w = 1; w <= weeks; w++) {
    for (const e of (byDay.get(w - 1) || [])) sim.fire(C.engineKind(c, e.kind), e.n);
    sim.step();
    if (w % every === 0 || w === weeks) frames.push({ week: w, left: total - entries.filter(e => e.day < w && e.n < 1e6).length, state: Object.assign(C.snapshot(c, sim), { started: true, closed: false, day: w }) });
  }
  return { seed, entries: entries.length, frames };
}

if (process.argv.includes('--scan')) {
  for (let seed = +arg('--from', 1); seed <= +arg('--to', 200); seed++) {
    const r = run(seed); const f = r.frames[r.frames.length - 1].state;
    console.log([seed, 'gen', f.generation, 'alive', f.alive, 'lines', f.lines, 'caps', f.capsBroken + '/' + f.caps, 'salt', f.saltBand, 'ink', f.shade.length, 'bought', r.entries].join(' '));
  }
} else {
  const ex = arg('--extra', null), [k, d] = ex ? ex.split('@') : [];
  const out = run(+arg('--seed', 4242), ex ? { kind: k, day: +d } : null);
  fs.writeFileSync(process.argv[2], JSON.stringify(out));
  const f = out.frames[out.frames.length - 1].state;
  console.log(`seed ${out.seed}: ${out.frames.length} frames, ${out.entries} ampoules bought, generation ${f.generation}, ${f.alive} alive, ${f.lines} lines split, ${f.capsBroken} of ${f.caps} capsules cracked`);
}
