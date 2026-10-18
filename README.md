# Closed Systems

Live pieces from Closed Systems, a series of sealed boxes where what happens inside depends on rules set from outside. Published at https://alexo000.github.io/closed-systems/.

- **Urna** (`/`): a sealed box that lives or dies by what strangers pay.
- **The Cycle** (`/simulator/`, in Spanish at `/simulator/es/`): the simulator the box runs on, to test your own designs.

## Urna

Anyone can pay to break an ampoule inside the box. The payer chooses what it holds; nobody else knows until the urn opens. Each ampoule is an operation from the [Actionary](https://operations.ramos-saavedra.com/all/).

### How it works

- **Time.** One real day is one week in the box. Forty years of box take almost six real years.
- **The box.** It runs the same engine as the simulator for The Cycle, version 3.7, with what the simulations showed works: grooved Bath limestone, 3 mm holes, a fig and Robinia seed mix, 21 °C, LED light and 0.13 g of salt per ampoule. The lamp is on from 07:00 to 21:00 London time, and the page shows the box asleep at night.
- **Ampoules.** Seeds (Seed And Leave), salt (Ratchet), water (Rehearse), resin (Freeze The Joint), hormone (Exaggerate) and ink (Conceal). There are 30 of seeds, 20 of salt, 20 of water and 10 of each of the others. When a type runs out, it leaves the payment menu.
- **Price.** It starts at £1. It doubles with each ampoule broken and halves after 52 days with none. Everyone who pays on the same day pays that day's posted price.
- **Secret and seals.** The alias and the price go in the public log the next day. The choice is stored encrypted, and its seal is published the same day: the SHA-256 of `number:choice:secret`.
- **A secret break day.** Each ampoule breaks between 1 and 45 days after it is bought. The day comes from its secret, so the seal already fixes it and anyone can check it at the opening. This way a change in the box can't be pinned on whoever paid that day.
- **Salt in bands.** The page shows the salt in the water as fresh, salty, very salty or poisoned, never as a number, and the published state has no exact figure either.
- **Openings.** Every 261 days, which is 5 years in the box, the urn opens: the choice, the secret and the break day of every ampoule that has already broken are published. Anyone can check them against the seals, and the page does it for you. Ampoules still waiting to break stay sealed until the next opening.
- **Rent.** What is paid, minus the Stripe fee, goes into a fund. Every 30 days the fund pays the rent. It keeps 6 months of rent; the rest goes to building the physical box. If a month can't be paid, the urn closes, opens one last time and the box stays frozen.
- **Donations.** If someone pays less than the day's price, through an old link, it counts as a donation and breaks no ampoule.
- **Before the start date.** The daily step publishes the sealed box at day 0 and needs no key. The page says when it starts and the payment button stays off.
- **Payments after closing.** If a payment is dated after the closing day (for example, if the daily step failed for a few days), it breaks no ampoule: it goes in the log as waiting for a refund, and the daily step prints which Stripe session to refund.

Everything is worked out from the ledger, so anyone can redo the sums.

### The page

The public page is one file, `src/page.html`, in the same family as Shubyrinth: ink on white, VT323, IBM Plex Mono and Inter, hard shadows on what you can press.

- **A box that is alive.** The box is redrawn a few times a second: leaves sway, the water drifts, grains fall from the cracks, and at night the lamp goes off and the leaves droop. With "reduce motion" switched on, it stays still.
- **Vital signs.** Plants, salt (in bands), ampoules left on the rail and months of rent, as segmented bars. A bar blinks when that sign is in danger.
- **Mood.** One word for how the box is: Sealed, Growing, Dormant, Salty, Poisoned, Hungry, Empty, Asleep or Closed.
- **Since your last visit.** The page remembers, in your browser only, what the box looked like when you last came, and tells you what changed.
- **It refreshes itself** a few minutes after each daily step if the page is left open.
- **Glyphs.** Each ampoule shows its operation's glyph from the Actionary (`src/glyphs.js`).

### Files

| File | What it is |
|---|---|
| `config.json` | Start date, the box's seed, ampoules, price, openings, rent, Stripe links |
| `engine/engine.js` | The engine from The Cycle (its comments are in Spanish) |
| `lib/core.js` | Price, fund, seals, encryption, rebuilding the box |
| `lib/stripe.js` | The little of the Stripe API the urn needs, with no dependencies |
| `scripts/tick.js` | The daily step |
| `scripts/stripe-setup.js` | Creates the product and one payment link per price step (£1, £2, £4 … £4,096) |
| `scripts/demo.js` | A demo without Stripe, with an invented public |
| `scripts/verify.js` | Checks the seals in any `ledger.json` |
| `scripts/new-key.js` | Makes the key that encrypts the choices |
| `scripts/build-pages.js` | Builds `docs/index.html` (the urn), `docs/simulator/` (in English) and `docs/simulator/es/` (in Spanish) |
| `src/page.html` | The public page |
| `src/glyphs.js` | The operation glyphs |
| `src/simulator.html`, `src/simulator-es.html` | The simulator for The Cycle, in English and Spanish |
| `docs/` | What GitHub Pages serves. The daily step writes `ledger.json` and `state.json` |
| `private/ledger.enc.json` | The choices, encrypted. It is in the public repository, but can't be read without the key |
| `.github/workflows/tick.yml` | Runs the daily step at 05:07 UTC |

Nothing to install: only Node 18 or newer.

### Setting it up

1. **Repository.** This one, `alexo000/closed-systems`, public.
2. **Key.** Run `node scripts/new-key.js` and keep the result in two places: as the `URNA_KEY` secret on GitHub (Settings → Secrets and variables → Actions) and in your password manager. If it is lost, nobody can open the urn.
3. **Stripe, in test mode.** Create a restricted key with these permissions: Products (write), Prices (write), Payment Links (write) and Checkout Sessions (read). Save it as the `STRIPE_SECRET_KEY` secret on GitHub.
4. **Payment links.** On your computer, run `STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js`. It writes the 13 links into `config.json`. Commit it.
5. **Settings.** In `config.json`, check the start date (`start`), the starting fund (`fund.start`), the rent (`fund.rent`) and the public address (`site`). Stripe sends people back there after paying.
6. **Pages.** Run `node scripts/build-pages.js` and commit `docs/`. On GitHub, go to Settings → Pages → Deploy from a branch → `main` → `/docs`.
7. **First step.** In the Actions tab, run "urna-daily-step" by hand. From then on it runs by itself every morning.
8. **Test.** Pay with the test card 4242 4242 4242 4242. The next day, or when you run the step by hand, the payment shows in the log.
9. **Live.** Repeat step 4 with the live key (`sk_live_...`) and change the secret on GitHub. Delete the test files in `docs/` and `private/` before opening.

### For the site

On ramos-saavedra.com, the page `/urna` embeds https://alexo000.github.io/closed-systems/ in an iframe, as with Shubyrinth, and the home page lists it under *try*:

> **Live systems.** Things that keep running and remember what people do.
>
> **Shubyrinth.** A labyrinth that builds itself as you walk through it.
>
> **Urna.** A sealed box that lives or dies by what strangers pay. Break an ampoule for a pound or two. Nobody knows what you chose until the urn opens.

For an address of its own, such as `urna.ramos-saavedra.com`, add a `docs/CNAME` file with that name and a CNAME record in your DNS pointing to GitHub Pages.

### Trying it without Stripe

```
node scripts/demo.js 600
```

It invents some days of public and leaves the ledger and the box in `demo/`. To look at it, copy `docs/index.html`, `demo/ledger.json` and `demo/state.json` into one folder and serve it with any local server (`npx serve folder`).

### Checking the seals

```
node scripts/verify.js https://alexo000.github.io/closed-systems/ledger.json
```

### Still open

- **The real rent.** £5 a month is a guess: domain and margin. GitHub Pages and Actions are free on a public repository.
- **Terms.** The payment page already says the ampoule breaks straight away and there is no refund. I am not a lawyer: get it checked and, if Stripe asks, link to terms.
- **Calibration.** The salt, the stock and the price come from simulations with an invented public. Worth checking after a few months with real people.
- **What still shows.** When a type sells out it leaves the menu, so people learn that every one of that type was bought. Ink darkens the glass when it breaks; with the secret break day, it can't be pinned on a buyer unless very few people paid in the previous six weeks.
- **Waiting for the price to drop.** Halving on a known day invites people to wait for it and pay together. A gradual weekly drop is the proposed fix.
