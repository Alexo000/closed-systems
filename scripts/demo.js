// Demo without Stripe: invents a public for some days and runs the daily step as if it were today.
// Writes to demo/ (leaves docs/ and private/ alone). Usage: node scripts/demo.js [days]
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const C = require('../lib/core.js');

const days = +(process.argv[2] || 600);
const cfg = C.loadConfig();
const OUT = path.join(C.ROOT, 'demo');
fs.mkdirSync(OUT, { recursive: true });
let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
// invented public: who wants what
const WANT = [['seeds', 0.36], ['salt', 0.28], ['water', 0.12], ['resin', 0.08], ['hormone', 0.08], ['ink', 0.08]];
const pick = () => { let r = rnd(); for (const [k, w] of WANT) { if ((r -= w) <= 0) return k; } return 'water'; };
const stock = Object.fromEntries(cfg.kinds.map(k => [k.key, k.stock]));
const sessions = [], purchases = [];
const t0 = new Date(cfg.start).getTime();
for (let d = 0; d < days; d++) {
  const price = C.priceTimeline(cfg, purchases, d)[d];
  const visitors = 3 + Math.floor(rnd() * 3);
  for (let v = 0; v < visitors; v++) {
    const wtp = 2.5 * Math.exp(1.4 * gauss());
    if (wtp < price) continue;
    let kind = pick(); if (stock[kind] <= 0) continue;
    stock[kind]--;
    const n = sessions.length + 1;
    sessions.push({ id: `cs_demo_${n}`, created: Math.floor((t0 + d * C.DAY + (6 + rnd() * 16) * 3600000) / 1000), amount: price, kind, alias: `Visitor ${n}` });
    purchases.push({ day: d });
  }
}
fs.writeFileSync(path.join(OUT, 'sessions.json'), JSON.stringify(sessions));
const env = Object.assign({}, process.env, {
  URNA_DEMO_SESSIONS: path.join(OUT, 'sessions.json'), URNA_DOCS: OUT, URNA_PRIV: path.join(OUT, 'ledger.enc.json'),
  URNA_KEY: process.env.URNA_KEY || '0'.repeat(64), URNA_NOW: new Date(t0 + days * C.DAY + 5 * 3600000).toISOString(),
});
try { fs.unlinkSync(path.join(OUT, 'ledger.json')); fs.unlinkSync(path.join(OUT, 'ledger.enc.json')); } catch (e) {}
execFileSync(process.execPath, [path.join(C.ROOT, 'scripts', 'tick.js')], { env, stdio: 'inherit' });
console.log(`Demo ready in ${OUT}: ${sessions.length} invented payments over ${days} days.`);
