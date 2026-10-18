// The urn's daily step. GitHub Actions runs it once a day.
// 1. Fetches new Stripe payments and records them: alias and price in public, the choice and the day it breaks encrypted.
// 2. Opens the urn when it is due: publishes what each person chose and the secret that checks their seal.
// 3. Pays the month's rent; if there isn't enough, closes the urn.
// 4. Rebuilds the box from day 0 to today and publishes how it looks.
// Before the start date it publishes the sealed box at day 0, and needs no key.
// The repository is public, and so are the Actions logs: never print a choice, a break day or the exact salt.
const path = require('path');
const C = require('../lib/core.js');

const DOCS = process.env.URNA_DOCS || path.join(C.ROOT, 'docs');
const PUB = path.join(DOCS, 'ledger.json');
const STATE = path.join(DOCS, 'state.json');

function cleanAlias(s) {
  s = String(s || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return s || 'Anonymous';
}

async function getSessions(cfg, since) {
  if (process.env.URNA_DEMO_SESSIONS) {
    const all = C.readJSON(process.env.URNA_DEMO_SESSIONS, []);
    return all.filter(s => s.created > since).sort((a, b) => a.created - b.created);
  }
  const stripe = require('../lib/stripe.js');
  return stripe.fetchPaidSessions(since, cfg.links.map(l => l.id));
}

async function main() {
  const cfg = C.loadConfig();
  const hex = process.env.URNA_KEY;
  const now = process.env.URNA_NOW ? new Date(process.env.URNA_NOW) : new Date();
  const started = C.dayIndex(cfg, now) >= 0, today = Math.max(0, C.dayIndex(cfg, now));
  if (!started) console.log(`The urn starts on ${cfg.start.slice(0, 10)}. Publishing the sealed box.`);

  const pub = C.readJSON(PUB, null) || { purchases: [], donations: [], openings: [], closedDay: null };
  const priv = C.loadPrivate(hex);
  const seen = new Set(priv.seen);
  const used = k => priv.entries.filter(e => e.kind === k).length;
  const kindOf = key => cfg.kinds.find(k => k.key === key);

  // ---- 1. new payments ----
  if (started && pub.closedDay == null) {
    const sessions = await getSessions(cfg, priv.lastCreated || 0);
    for (const s of sessions) {
      if (seen.has(s.id)) continue;
      seen.add(s.id); priv.lastCreated = Math.max(priv.lastCreated || 0, s.created);
      const day = Math.min(today, C.dayIndex(cfg, s.created * 1000));
      const posted = C.priceTimeline(cfg, pub.purchases, day)[day];
      const alias = cleanAlias(s.alias);
      const k = kindOf(s.kind);
      if (!k || s.amount + 1e-9 < posted) {
        // paid less than that day's price (an old link) or chose nothing: it counts as a donation, with no ampoule
        pub.donations.push({ day, date: C.dateOfDay(cfg, day), alias, amount: s.amount });
        continue;
      }
      let kind = k.key, note = null;
      if (used(kind) >= k.stock) { note = `asked for ${kind}, sold out`; kind = 'water'; }
      const n = pub.purchases.length + 1, nonce = C.newNonce();
      priv.entries.push({ n, day, kind, nonce, breakDay: day + C.delayOf(cfg, nonce), session: s.id, note });
      pub.purchases.push({ n, day, date: C.dateOfDay(cfg, day), alias, price: s.amount, seal: C.seal(n, kind, nonce) });
      console.log(`Day ${day}: ${alias} pays £${s.amount}.`);
    }
  }
  priv.seen = [...seen];

  // ---- 3. rent (before opening the urn, to know which day it runs to) ----
  const money = C.fundTimeline(cfg, pub.purchases.map(p => ({ day: p.day, amount: p.price })).concat(pub.donations), today);
  if (pub.closedDay == null && money.closedDay != null) {
    pub.closedDay = money.closedDay;
    console.log(`Day ${money.closedDay}: not enough for the rent. The urn closes.`);
    if (!process.env.URNA_DEMO_SESSIONS) {
      const stripe = require('../lib/stripe.js');
      for (const l of cfg.links) await stripe.deactivate(l).catch(e => console.log('Could not deactivate', l.id, e.message));
    }
  }
  // anything paid from the closing day on (if the daily step missed some days) breaks no ampoule: it is refunded
  if (pub.closedDay != null) {
    pub.late = pub.late || [];
    while (pub.purchases.length && pub.purchases[pub.purchases.length - 1].day >= pub.closedDay) {
      const p = pub.purchases.pop();
      const i = priv.entries.findIndex(e => e.n === p.n);
      const e = i >= 0 ? priv.entries.splice(i, 1)[0] : null;
      pub.late.push({ day: p.day, date: p.date, alias: p.alias, amount: p.price, note: 'after the urn closed: to be refunded' });
      console.log(`Payment after closing, refund it in Stripe: ${p.alias}, £${p.price}${e ? ' (' + e.session + ')' : ''}.`);
    }
  }
  const lastDay = pub.closedDay != null ? pub.closedDay : today;

  // ---- 2. openings: they show the ampoules that have already broken; the rest wait for the next one ----
  for (let k = pub.openings.length + 1; k * cfg.openEveryDays <= lastDay; k++) {
    const day = k * cfg.openEveryDays, counts = {};
    let n = 0;
    for (const e of priv.entries) {
      if (e.breakDay >= day) continue;
      const p = pub.purchases[e.n - 1];
      if (p.reveal) continue;
      p.reveal = { kind: e.kind, nonce: e.nonce, breakDay: e.breakDay };
      counts[e.kind] = (counts[e.kind] || 0) + 1; n++;
    }
    pub.openings.push({ k, day, date: C.dateOfDay(cfg, day), count: n, counts });
    console.log(`Day ${day}: the urn opens (${n} ampoules).`);
  }
  // if the urn closes, it opens one last time on the closing day and shows everything, broken or not
  if (pub.closedDay != null && !pub.openings.some(o => o.final)) {
    const counts = {}; let n = 0;
    for (const e of priv.entries) { const p = pub.purchases[e.n - 1]; if (p.reveal) continue; p.reveal = { kind: e.kind, nonce: e.nonce, breakDay: e.breakDay }; counts[e.kind] = (counts[e.kind] || 0) + 1; n++; }
    pub.openings.push({ k: pub.openings.length + 1, day: pub.closedDay, date: C.dateOfDay(cfg, pub.closedDay), count: n, counts, final: true });
  }

  // ---- Stripe menu: remove the ampoules that have run out ----
  const available = cfg.kinds.filter(k => used(k.key) < k.stock).map(k => k.key);
  if (started && pub.closedDay == null && JSON.stringify(available) !== JSON.stringify(pub.available || cfg.kinds.map(k => k.key)) && !process.env.URNA_DEMO_SESSIONS && cfg.links.length) {
    const stripe = require('../lib/stripe.js');
    for (const l of cfg.links) await stripe.setLinkKinds(l, cfg.kinds.filter(k => available.includes(k.key))).catch(e => console.log('Could not change the menu of', l.id, e.message));
  }
  pub.available = available;

  // ---- 4. the box ----
  const sim = C.replay(cfg, priv.entries.filter(e => (e.breakDay != null ? e.breakDay : e.day) < lastDay), lastDay);
  const state = Object.assign({ day: lastDay, date: C.dateOfDay(cfg, lastDay), updated: now.toISOString(), closed: pub.closedDay != null, started }, C.snapshot(cfg, sim));

  const prices = C.priceTimeline(cfg, pub.purchases, lastDay);
  const price = prices[lastDay];
  const link = cfg.links.find(l => l.price === price);
  const left = cfg.kinds.reduce((a, k) => a + Math.max(0, k.stock - used(k.key)), 0);
  const nextOpen = (pub.openings.length + 1) * cfg.openEveryDays;
  Object.assign(pub, {
    name: cfg.name, start: cfg.start, started, updated: now.toISOString(), today: lastDay, date: C.dateOfDay(cfg, lastDay),
    price, link: started && link ? link.url : null,
    kinds: cfg.kinds.map(k => ({ key: k.key, name: k.name, op: k.op, does: k.does, stock: k.stock, available: available.includes(k.key) })),
    left, actionary: cfg.actionary,
    nextOpening: { day: nextOpen, date: C.dateOfDay(cfg, nextOpen) },
    rules: { start: cfg.price.start, halveAfterDays: cfg.price.halveAfterDays, openEveryDays: cfg.openEveryDays, breakWithinDays: cfg.breakWithinDays, rent: cfg.fund.rent, monthDays: cfg.fund.monthDays, reserveMonths: cfg.fund.reserveMonths },
    fund: { balance: money.balance, toBox: money.toBox, rentPaid: money.rentPaid, monthsLeft: money.monthsLeft },
    priceHistory: prices,
  });
  C.writeJSON(PUB, pub);
  C.writeJSON(STATE, state);
  if (started || priv.entries.length) C.savePrivate(priv, hex);
  console.log(`Day ${lastDay}: ${state.alive} plants alive, salt band ${state.saltBand}, price £${price}, fund £${money.balance}, to the box £${money.toBox}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
