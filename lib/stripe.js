// The little of the Stripe API the urn uses, with no dependencies (Node 18+ has fetch).
const API = 'https://api.stripe.com/v1/';

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error('STRIPE_SECRET_KEY is missing.');
  return k;
}
// Turns nested objects into the form encoding Stripe uses: a[b][0][c]=value
function form(obj, prefix, out) {
  out = out || new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => { if (typeof item === 'object') form(item, `${name}[${i}]`, out); else out.append(`${name}[${i}]`, String(item)); });
    else if (typeof v === 'object') form(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}
async function call(method, path, params) {
  const opts = { method, headers: { Authorization: 'Bearer ' + key(), 'Stripe-Version': '2024-06-20' } };
  let url = API + path;
  if (method === 'GET' && params) url += '?' + form(params).toString();
  else if (params) { opts.body = form(params); opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
  const r = await fetch(url, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j.error ? j.error.message : JSON.stringify(j)}`);
  return j;
}

// Complete, paid sessions from our links, created after `since` (seconds). Oldest first.
async function fetchPaidSessions(since, linkIds) {
  const out = [];
  let after = null;
  do {
    const params = { limit: 100, created: { gt: since || 0 }, status: 'complete' };
    if (after) params.starting_after = after;
    const res = await call('GET', 'checkout/sessions', params);
    for (const s of res.data) {
      if (s.payment_status !== 'paid' || !linkIds.includes(s.payment_link)) continue;
      const field = k => (s.custom_fields || []).find(f => f.key === k);
      const amp = field('ampoule'), alias = field('alias');
      out.push({ id: s.id, created: s.created, link: s.payment_link, amount: s.amount_total / 100, currency: s.currency, kind: amp && amp.dropdown ? amp.dropdown.value : null, alias: alias && alias.text ? alias.text.value : '' });
    }
    after = res.has_more && res.data.length ? res.data[res.data.length - 1].id : null;
  } while (after);
  return out.sort((a, b) => a.created - b.created);
}

// The ampoule menu the payer sees.
const ampouleField = (kinds) => ({
  key: 'ampoule', type: 'dropdown',
  label: { type: 'custom', custom: 'Which ampoule? (sealed until the urn opens)' },
  dropdown: { options: kinds.map(k => ({ label: `${k.name} · ${k.op}`, value: k.key })) },
});
const aliasField = { key: 'alias', type: 'text', optional: true, label: { type: 'custom', custom: 'Name or alias for the public log' }, text: { maximum_length: 40 } };
const consentText = 'Your ampoule goes on the rail at the next daily step and breaks on a secret day within the next 45 days. You are asking for this to start straight away, so this payment cannot be cancelled or refunded. Your alias and the price go in the public log; your choice stays sealed until the first opening after it breaks.';

async function setLinkKinds(link, kinds) {
  return call('POST', `payment_links/${link.id}`, { custom_fields: [ampouleField(kinds), aliasField] });
}
async function setActive(link, active) { return call('POST', `payment_links/${link.id}`, { active: !!active }); }
const deactivate = link => setActive(link, false);
const giftText = 'This is a gift towards the next box. It breaks no ampoule. If the gifts reach the target, the next box starts the following morning; if they never do, the money goes to building the real box.';

module.exports = { call, fetchPaidSessions, ampouleField, aliasField, consentText, giftText, setLinkKinds, setActive, deactivate };
