// Demo without Stripe: invents a public for some days and runs the daily step as if it were today.
// Writes to demo/ (leaves docs/ and private/ alone).
// Usage: node scripts/demo.js [days] [--revive]
// With --revive the rent is set high enough for the box to close; then people give towards the next box,
// and once the gifts reach the target a second box starts.
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const C = require('../lib/core.js');

const days = +(process.argv.find(a => /^\d+$/.test(a)) || 600);
const revive = process.argv.includes('--revive');
const cfg = C.loadConfig();
if (revive) cfg.fund.rent = 150;
const OUT = path.join(C.ROOT, 'demo');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'config.json'), JSON.stringify(cfg, null, 1));
let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
// invented public: who wants what
const WANT = [['seeds', 0.36], ['salt', 0.28], ['water', 0.12], ['resin', 0.08], ['hormone', 0.08], ['ink', 0.08]];
const pick = () => { let r = rnd(); for (const [k, w] of WANT) { if ((r -= w) <= 0) return k; } return 'water'; };
const sessions = [];
const t0 = new Date(cfg.start).getTime();
let boxStart = t0, boxFund = cfg.fund.start, stock = Object.fromEntries(cfg.kinds.map(k => [k.key, k.stock])), purchases = [], closed = false, gifts = 0;
const at = d => Math.floor((t0 + d * C.DAY + (6 + rnd() * 16) * 3600000) / 1000);
for (let d = 0; d < days; d++) {
  const bday = Math.floor((t0 + d * C.DAY - boxStart) / C.DAY);
  const bcfg = Object.assign({}, cfg, { start: new Date(boxStart).toISOString(), fund: Object.assign({}, cfg.fund, { start: boxFund }) });
  if (!closed && C.fundTimeline(bcfg, purchases.map(p => ({ day: p.day, amount: p.amount })), bday).closedDay != null) closed = true;
  if (closed) {
    // a few people give towards the next box
    if (rnd() < 0.25) {
      const amount = Math.max(1, Math.round(3 * Math.exp(0.8 * gauss())));
      sessions.push({ id: `cs_demo_${sessions.length + 1}`, created: at(d), amount, link: 'revive', alias: `Giver ${sessions.length + 1}` });
      gifts += C.net(cfg, amount);
      if (gifts >= ((cfg.revive && cfg.revive.target) || cfg.fund.start)) {
        boxStart = Math.floor((t0 + d * C.DAY) / C.DAY) * C.DAY + C.DAY; boxFund = C.round2(gifts);
        closed = false; gifts = 0; purchases = []; stock = Object.fromEntries(cfg.kinds.map(k => [k.key, k.stock]));
      }
    }
    continue;
  }
  if (bday < 0) continue;
  const price = C.priceTimeline(bcfg, purchases, bday)[bday];
  const visitors = 3 + Math.floor(rnd() * 3);
  for (let v = 0; v < visitors; v++) {
    const wtp = 2.5 * Math.exp(1.4 * gauss());
    if (wtp < price) continue;
    const kind = pick(); if (stock[kind] <= 0) continue;
    stock[kind]--;
    const n = sessions.length + 1;
    sessions.push({ id: `cs_demo_${n}`, created: at(d), amount: price, kind, alias: `Visitor ${n}` });
    purchases.push({ day: bday, amount: price });
  }
}
sessions.sort((a, b) => a.created - b.created);
fs.writeFileSync(path.join(OUT, 'sessions.json'), JSON.stringify(sessions));
const env = Object.assign({}, process.env, {
  URNA_CONFIG: path.join(OUT, 'config.json'), URNA_DEMO_SESSIONS: path.join(OUT, 'sessions.json'), URNA_DOCS: OUT, URNA_PRIV: path.join(OUT, 'private', 'ledger.enc.json'),
  URNA_KEY: process.env.URNA_KEY || '0'.repeat(64), URNA_NOW: new Date(t0 + days * C.DAY + 5 * 3600000).toISOString(),
});
execFileSync(process.execPath, [path.join(C.ROOT, 'scripts', 'tick.js')], { env, stdio: 'inherit' });
console.log(`Demo ready in ${OUT}: ${sessions.length} invented payments over ${days} days.`);
