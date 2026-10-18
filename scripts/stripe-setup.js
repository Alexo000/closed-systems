// Creates the Stripe product, one price per step (£1, £2, £4 … up to the maximum) and one payment link per step.
// Each link asks for the ampoule from a menu and an optional alias. Writes the links into config.json.
// Run it first with the test key (sk_test_…) and then again with the live one.
// Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
const path = require('path');
const C = require('../lib/core.js');
const S = require('../lib/stripe.js');

(async () => {
  const cfg = C.loadConfig();
  const ladder = []; for (let p = cfg.price.start; p <= cfg.price.max; p *= 2) ladder.push(p);
  const product = await S.call('POST', 'products', { name: 'Urna: one ampoule', description: 'Breaks one ampoule over the box at the next daily step. Part of Closed Systems.' });
  const links = [];
  for (const price of ladder) {
    const pr = await S.call('POST', 'prices', { product: product.id, currency: cfg.stripe.currency, unit_amount: Math.round(price * 100) });
    const link = await S.call('POST', 'payment_links', {
      line_items: [{ price: pr.id, quantity: 1 }],
      custom_fields: [S.ampouleField(cfg.kinds), S.aliasField],
      custom_text: { submit: { message: S.consentText } },
      after_completion: { type: 'redirect', redirect: { url: cfg.site + '?paid=1' } },
      submit_type: 'pay',
      metadata: { urna_price: String(price) },
    });
    links.push({ price, id: link.id, url: link.url });
    console.log(`£${price}: ${link.url}`);
  }
  cfg.links = links;
  C.writeJSON(path.join(C.ROOT, 'config.json'), cfg);
  console.log(`Done: ${links.length} links saved in config.json. Commit config.json.`);
})().catch(e => { console.error(e.message); process.exit(1); });
