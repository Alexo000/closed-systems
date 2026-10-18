// Updates the payment links that already exist, without making new ones: where people land after paying
// (config.json "returnTo") and the text above the pay button. Prices and choices stay as they are.
// Run it from the Actions tab (stripe-update), or: STRIPE_SECRET_KEY=rk_... node scripts/stripe-update.js
const C = require('../lib/core.js');
const S = require('../lib/stripe.js');

(async () => {
  const cfg = C.loadConfig();
  const back = cfg.returnTo || cfg.site;
  for (const l of cfg.links) {
    await S.call('POST', `payment_links/${l.id}`, {
      after_completion: { type: 'redirect', redirect: { url: back + '?paid=1' } },
      custom_text: { submit: { message: S.consentText } },
    });
  }
  console.log(`${cfg.links.length} ampoule links now return to ${back}?paid=1`);
  if (cfg.reviveLink) {
    await S.call('POST', `payment_links/${cfg.reviveLink.id}`, {
      after_completion: { type: 'redirect', redirect: { url: back + '?gave=1' } },
      custom_text: { submit: { message: S.giftText } },
    });
    console.log(`The gift link now returns to ${back}?gave=1`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
