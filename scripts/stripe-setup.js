// Creates the Stripe product, one price per step of the ladder (£1, £1.10, £1.20 … up to the maximum) and one payment link per step.
// Each link asks for the ampoule from a menu and an optional alias. Writes the links into config.json.
// It also makes the gift link for the next box (pay what you like), switched off until a box closes.
// Run it first with the test key (sk_test_…) and then again with the live one.
// Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
const path = require('path');
const C = require('../lib/core.js');
const S = require('../lib/stripe.js');

(async () => {
  const cfg = C.loadConfig();
  const ladder = C.priceLadder(cfg);
  const product = await S.call('POST', 'products', { name: 'Urna: one ampoule', description: 'Breaks one ampoule over the box on a secret day within 45 days. Part of Closed Systems.' });
  const links = [];
  for (const price of ladder) {
    const pr = await S.call('POST', 'prices', { product: product.id, currency: cfg.stripe.currency, unit_amount: Math.round(price * 100) });
    const link = await S.call('POST', 'payment_links', {
      line_items: [{ price: pr.id, quantity: 1 }],
      custom_fields: [S.ampouleField(cfg.kinds), S.aliasField],
      custom_text: { submit: { message: S.consentText } },
      after_completion: { type: 'redirect', redirect: { url: (cfg.returnTo || cfg.site) + '?paid=1' } },
      submit_type: 'pay',
      metadata: { urna_price: String(price) },
    });
    links.push({ price, id: link.id, url: link.url });
    console.log(`£${price}: ${link.url}`);
  }
  cfg.links = links;
  const gift = await S.call('POST', 'products', { name: 'Urna: a gift for the next box', description: 'Counts towards the fund that starts the next box. Part of Closed Systems.' });
  const gp = await S.call('POST', 'prices', { product: gift.id, currency: cfg.stripe.currency, custom_unit_amount: { enabled: true, minimum: 100, preset: 500 } });
  const gl = await S.call('POST', 'payment_links', {
    line_items: [{ price: gp.id, quantity: 1 }],
    custom_fields: [S.aliasField],
    custom_text: { submit: { message: S.giftText } },
    after_completion: { type: 'redirect', redirect: { url: (cfg.returnTo || cfg.site) + '?gave=1' } },
    submit_type: 'donate',
  });
  await S.setActive({ id: gl.id }, false);
  cfg.reviveLink = { id: gl.id, url: gl.url };
  console.log(`Gift link (off until a box closes): ${gl.url}`);
  C.writeJSON(path.join(C.ROOT, 'config.json'), cfg);
  console.log(`Done: ${links.length} links saved in config.json. Commit config.json.`);
})().catch(e => { console.error(e.message); process.exit(1); });
