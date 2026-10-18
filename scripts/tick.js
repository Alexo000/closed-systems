// The urn's daily step. GitHub Actions runs it once a day.
// 1. Fetches new Stripe payments and records them: alias and price in public, the choice and the day it breaks encrypted.
// 2. Opens the urn when it is due: publishes what each person chose and the secret that checks their seal.
// 3. Pays the month's rent; if there isn't enough, closes the urn.
// 4. Rebuilds the box from day 0 to today and publishes how it looks.
// When a box closes, the urn takes gifts for the next one. Once they reach the target,
// the next box starts the following morning with another stone and another seed, and the closed one is archived.
// Before the first start date it publishes the sealed box at day 0, and needs no key.
// The repository is public, and so are the Actions logs: never print a choice, a break day or the exact salt.
const path = require('path');
const C = require('../lib/core.js');

const DOCS = process.env.URNA_DOCS || path.join(C.ROOT, 'docs');
const PRIVDIR = path.dirname(process.env.URNA_PRIV || path.join(C.ROOT, 'private', 'ledger.enc.json'));
const PUB = path.join(DOCS, 'ledger.json');
const STATE = path.join(DOCS, 'state.json');
const SERIES = path.join(DOCS, 'series.json');
const DEMO = !!process.env.URNA_DEMO_SESSIONS;

function cleanAlias(s) {
  s = String(s || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return s || 'Anonymous';
}
async function getSessions(base, since) {
  if (DEMO) {
    const all = C.readJSON(process.env.URNA_DEMO_SESSIONS, []);
    return all.filter(s => s.created > since).sort((a, b) => a.created - b.created);
  }
  const stripe = require('../lib/stripe.js');
  const ids = base.links.map(l => l.id).concat(base.reviveLink ? [base.reviveLink.id] : []);
  return stripe.fetchPaidSessions(since, ids);
}
const emptyPub = () => ({ purchases: [], donations: [], openings: [], closedDay: null });

async function main() {
  const base = C.loadConfig();
  const hex = process.env.URNA_KEY;
  const now = process.env.URNA_NOW ? new Date(process.env.URNA_NOW) : new Date();
  const series = C.readJSON(SERIES, null) || { boxes: [{ n: 1, start: base.start, seed: base.seed, fundStart: base.fund.start }] };
  const target = (base.revive && base.revive.target) || base.fund.start;
  const cfgOf = b => Object.assign({}, base, { start: b.start, seed: b.seed, fund: Object.assign({}, base.fund, { start: b.fundStart }) });
  let box = series.boxes[series.boxes.length - 1], cfg = cfgOf(box);
  let pub = C.readJSON(PUB, null) || emptyPub();
  let priv = C.loadPrivate(hex);
  const seen = new Set(priv.seen || []);
  const used = k => priv.entries.filter(e => e.kind === k).length;
  const kindOf = key => cfg.kinds.find(k => k.key === key);
  const firstStarted = C.dayIndex(cfgOf(series.boxes[0]), now) >= 0;
  if (!firstStarted) console.log(`The urn starts on ${series.boxes[0].start.slice(0, 10)}. Publishing the sealed box.`);

  // ---- openings: they show the ampoules that have already broken; the rest wait for the next one ----
  function openUpTo(lastDay) {
    for (let k = pub.openings.filter(o => !o.final).length + 1; k * cfg.openEveryDays <= lastDay; k++) {
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
      console.log(`Box ${box.n}, day ${day}: the urn opens (${n} ampoules).`);
    }
  }
  // ---- rent: if a month can't be paid, the box closes that day, opens one last time and shows everything ----
  function checkClosure(uptoDay) {
    if (pub.closedDay != null) return;
    const money = C.fundTimeline(cfg, pub.purchases.map(p => ({ day: p.day, amount: p.price })).concat(pub.donations), uptoDay);
    if (money.closedDay == null) return;
    pub.closedDay = money.closedDay;
    console.log(`Box ${box.n}, day ${money.closedDay}: not enough for the rent. The urn closes.`);
    openUpTo(pub.closedDay);
    const counts = {}; let n = 0;
    for (const e of priv.entries) { const p = pub.purchases[e.n - 1]; if (p.reveal) continue; p.reveal = { kind: e.kind, nonce: e.nonce, breakDay: e.breakDay }; counts[e.kind] = (counts[e.kind] || 0) + 1; n++; }
    pub.openings.push({ k: pub.openings.length + 1, day: pub.closedDay, date: C.dateOfDay(cfg, pub.closedDay), count: n, counts, final: true });
    pub.revive = { target, raised: 0, gifts: [] };
  }
  // ---- the published state of a box, up to the day it stops ----
  function finish(lastDay, started) {
    const sim = C.replay(cfg, priv.entries.filter(e => (e.breakDay != null ? e.breakDay : e.day) < lastDay), lastDay);
    const state = Object.assign({ box: box.n, day: lastDay, date: C.dateOfDay(cfg, lastDay), updated: now.toISOString(), closed: pub.closedDay != null, started }, C.snapshot(cfg, sim));
    const money = C.fundTimeline(cfg, pub.purchases.map(p => ({ day: p.day, amount: p.price })).concat(pub.donations), lastDay);
    const prices = C.priceTimeline(cfg, pub.purchases, lastDay);
    const price = prices[lastDay];
    const link = cfg.links.find(l => l.price === price);
    const available = cfg.kinds.filter(k => used(k.key) < k.stock).map(k => k.key);
    const left = cfg.kinds.reduce((a, k) => a + Math.max(0, k.stock - used(k.key)), 0);
    const nextOpen = (pub.openings.filter(o => !o.final).length + 1) * cfg.openEveryDays;
    Object.assign(pub, {
      name: cfg.name, box: box.n, start: cfg.start, started, updated: now.toISOString(), today: lastDay, date: C.dateOfDay(cfg, lastDay),
      price, link: started && pub.closedDay == null && link ? link.url : null,
      reviveLink: pub.closedDay != null && base.reviveLink ? base.reviveLink.url : null,
      kinds: cfg.kinds.map(k => ({ key: k.key, name: k.name, op: k.op, does: k.does, stock: k.stock, available: available.includes(k.key) })),
      available, left, actionary: cfg.actionary,
      nextOpening: { day: nextOpen, date: C.dateOfDay(cfg, nextOpen) },
      rules: { start: cfg.price.start, stepsPerDouble: cfg.price.stepsPerDouble, dropEveryDays: cfg.price.dropEveryDays, ladder: C.priceLadder(cfg), openEveryDays: cfg.openEveryDays, breakWithinDays: cfg.breakWithinDays, rent: cfg.fund.rent, monthDays: cfg.fund.monthDays, reserveMonths: cfg.fund.reserveMonths, reviveTarget: target },
      fund: { start: cfg.fund.start, balance: money.balance, toBox: money.toBox, rentPaid: money.rentPaid, monthsLeft: money.monthsLeft },
      priceHistory: prices,
    });
    return state;
  }

  // ---- 1. new payments, in the order they came, across boxes ----
  const sessions = firstStarted ? await getSessions(base, priv.lastCreated || 0) : [];
  for (const s of sessions) {
    if (seen.has(s.id)) continue;
    seen.add(s.id); priv.lastCreated = Math.max(priv.lastCreated || 0, s.created);
    const t = s.created * 1000, alias = cleanAlias(s.alias);
    const isGift = s.link === 'revive' || (base.reviveLink && s.link === base.reviveLink.id);
    const day = Math.max(0, C.dayIndex(cfg, t));
    checkClosure(day);
    if (isGift && pub.closedDay != null) {
      // a gift towards the next box
      const net = Math.max(0, C.net(cfg, s.amount));
      pub.revive.gifts.push({ day, date: C.dateOfDay(cfg, day), alias, amount: s.amount });
      pub.revive.raised = C.round2(pub.revive.raised + net);
      console.log(`Box ${box.n} closed: ${alias} gives £${s.amount} towards the next box (£${pub.revive.raised} of £${target}).`);
      if (pub.revive.raised >= target) {
        // archive this box as it was on its last day, and start the next one tomorrow
        const state = finish(pub.closedDay, true);
        const dir = path.join(DOCS, 'boxes', String(box.n));
        C.writeJSON(path.join(dir, 'ledger.json'), pub); C.writeJSON(path.join(dir, 'state.json'), state);
        C.savePrivate(priv, hex, path.join(PRIVDIR, `box-${box.n}.enc.json`));
        box.closedDay = pub.closedDay; box.archive = `boxes/${box.n}/`;
        const start = new Date(Math.floor(t / C.DAY) * C.DAY + C.DAY).toISOString();
        const next = { n: box.n + 1, start, seed: base.seed + box.n * 7919, fundStart: pub.revive.raised };
        series.boxes.push(next);
        console.log(`Box ${next.n} starts on ${start.slice(0, 10)} with a fund of £${next.fundStart}.`);
        box = next; cfg = cfgOf(box); pub = emptyPub(); priv = { entries: [], seen: [], lastCreated: priv.lastCreated };
      }
      continue;
    }
    if (isGift && C.dayIndex(cfg, t) < 0) {
      // a gift after the target was reached but before the next box starts: it joins the new box's fund on day 0
      pub.donations.push({ day: 0, date: C.dateOfDay(cfg, 0), alias, amount: s.amount });
      continue;
    }
    if (pub.closedDay != null || C.dayIndex(cfg, t) < 0) {
      // the box is closed (or the next one hasn't started yet): this breaks no ampoule, it is refunded
      pub.late = pub.late || [];
      pub.late.push({ day, date: C.dateOfDay(cfg, day), alias, amount: s.amount, note: 'while the urn was closed: to be refunded' });
      console.log(`Payment while closed, refund it in Stripe: ${alias}, £${s.amount} (${s.id}).`);
      continue;
    }
    const posted = C.priceTimeline(cfg, pub.purchases, day)[day];
    const k = kindOf(s.kind);
    if (isGift || !k || s.amount + 1e-9 < posted) {
      // less than that day's price (an old link), no choice, or a gift while the box is open: it goes to the fund, with no ampoule
      pub.donations.push({ day, date: C.dateOfDay(cfg, day), alias, amount: s.amount });
      continue;
    }
    let kind = k.key, note = null;
    if (used(kind) >= k.stock) { note = `asked for ${kind}, sold out`; kind = 'water'; }
    const n = pub.purchases.length + 1, nonce = C.newNonce();
    priv.entries.push({ n, day, kind, nonce, breakDay: day + C.delayOf(cfg, nonce), session: s.id, note });
    pub.purchases.push({ n, day, date: C.dateOfDay(cfg, day), alias, price: s.amount, seal: C.seal(n, kind, nonce) });
    console.log(`Box ${box.n}, day ${day}: ${alias} pays £${s.amount}.`);
  }
  priv.seen = [...seen];

  // ---- 2 and 3. rent and openings up to today ----
  const started = C.dayIndex(cfg, now) >= 0, today = Math.max(0, C.dayIndex(cfg, now));
  if (started) checkClosure(today);
  const lastDay = pub.closedDay != null ? pub.closedDay : today;
  if (started) openUpTo(lastDay);

  // ---- Stripe: the ampoule menu follows the stock; links are on while a box runs, the gift link while it is closed ----
  const state = finish(lastDay, started);
  if (!DEMO && base.links.length) {
    const stripe = require('../lib/stripe.js');
    const open = started && pub.closedDay == null;
    const want = { open, kinds: pub.available.join(','), gifts: pub.closedDay != null };
    // stripe-setup leaves the ampoule links on and the gift link off
    const had = series.stripe || { open: true, kinds: base.kinds.map(k => k.key).join(','), gifts: false };
    if (open && want.kinds !== had.kinds) for (const l of base.links) await stripe.setLinkKinds(l, cfg.kinds.filter(k => pub.available.includes(k.key))).catch(e => console.log('Could not change the menu of', l.id, e.message));
    if (want.open !== had.open) for (const l of base.links) await stripe.setActive(l, open).catch(e => console.log('Could not switch', l.id, e.message));
    if (base.reviveLink && want.gifts !== had.gifts) await stripe.setActive(base.reviveLink, want.gifts).catch(e => console.log('Could not switch the gift link', e.message));
    series.stripe = want;
  }

  // ---- 4. publish ----
  series.current = box.n;
  C.writeJSON(PUB, pub);
  C.writeJSON(STATE, state);
  C.writeJSON(SERIES, series);
  if (firstStarted || priv.entries.length) C.savePrivate(priv, hex);
  console.log(`Box ${box.n}, day ${lastDay}: ${state.alive} plants alive, salt band ${state.saltBand}, price £${pub.price}, fund £${pub.fund.balance}, to the box £${pub.fund.toBox}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
