// Anyone can run this: it checks that each revealed choice matches the seal published on the day of purchase,
// and that the day it broke is the one its secret sets.
// Usage: node scripts/verify.js [path or URL of ledger.json]
const crypto = require('crypto');
const fs = require('fs');
(async () => {
  const src = process.argv[2] || 'docs/ledger.json';
  const pub = src.startsWith('http') ? await (await fetch(src)).json() : JSON.parse(fs.readFileSync(src, 'utf8'));
  let ok = 0, bad = 0, sealed = 0;
  for (const p of pub.purchases) {
    if (!p.reveal) { sealed++; continue; }
    const h = crypto.createHash('sha256').update(`${p.n}:${p.reveal.kind}:${p.reveal.nonce}`).digest('hex');
    const within = (pub.rules && pub.rules.breakWithinDays) || 45, bd = p.day + 1 + parseInt(p.reveal.nonce.slice(0, 8), 16) % within;
    if (h === p.seal && (p.reveal.breakDay == null || p.reveal.breakDay === bd)) ok++; else { bad++; console.log(`No match: ampoule ${p.n} (${p.alias}, ${p.date})`); }
  }
  console.log(`${ok} seals checked, ${bad} that don't match, ${sealed} still sealed.`);
  process.exit(bad ? 1 : 0);
})();
