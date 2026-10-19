# Closed Systems

Live pieces from Closed Systems, a series of sealed boxes where what happens inside depends on rules set from outside. Published at https://urna.ramos-saavedra.com/ (the old address, https://alexo000.github.io/closed-systems/, forwards there).

- **Urna** (`/`): a sealed box that lives or dies by what strangers pay.
- **The Cycle** (`/simulator/`, in Spanish at `/simulator/es/`): the simulator the box runs on, to test your own designs.

## Urna

Anyone can pay to break an ampoule inside the box. The payer chooses what it holds; nobody else knows until the urn opens. Each ampoule is an operation from the [Actionary](https://operations.ramos-saavedra.com/all/).

### How it works

- **Time.** One real day is one week in the box. Forty years of box take almost six real years.
- **The box.** It runs the same engine as the simulator for The Cycle, version 3.7, with what the simulations showed works: grooved Bath limestone, 3 mm holes, a fig and Robinia seed mix, 21 °C, LED light and 0.13 g of salt per ampoule. The lamp is on from 07:00 to 21:00 London time, and the page shows the box asleep at night.
- **Ampoules.** Seeds (Seed And Leave), salt (Ratchet), water (Rehearse), resin (Freeze The Joint), hormone (Exaggerate) and ink (Conceal). There are 30 of seeds, 20 of salt, 20 of water and 10 of each of the others. When a type runs out, it leaves the payment menu.
- **Price.** It starts at £1 and moves on a ladder of plain amounts (£1, £1.10, £1.20 … £4,100). Each ampoule broken climbs seven steps, which doubles it. Each week with none, it comes down one step, about 9%, so it halves in about seven weeks. There is no single day worth waiting for: every week of waiting saves a little and lets the other side go first. Everyone who pays on the same day pays that day's posted price.
- **Secret and seals.** The alias and the price go in the public log the next day. The choice is stored encrypted, and its seal is published the same day: the SHA-256 of `number:choice:secret`.
- **A secret break day.** Each ampoule breaks between 1 and 45 days after it is bought. The day comes from its secret, so the seal already fixes it and anyone can check it at the opening. This way a change in the box can't be pinned on whoever paid that day.
- **Salt in bands.** The page shows the salt in the water as fresh, salty, very salty or poisoned, never as a number, and the published state has no exact figure either.
- **Openings.** Every 261 days, which is 5 years in the box, the urn opens: the choice, the secret and the break day of every ampoule that has already broken are published. Anyone can check them against the seals, and the page does it for you. Ampoules still waiting to break stay sealed until the next opening.
- **Rent.** What is paid, minus the Stripe fee, goes into a fund. Every 30 days the fund pays the rent. It keeps 6 months of rent; the rest goes to building the physical box. If a month can't be paid, the urn closes, opens one last time and the box stays frozen.
- **The next box.** Once a box closes, its page takes gifts (pay what you like, from £1) for the next one. When the gifts reach £30 after fees, the next box starts the following morning with another stone and another seed, and that money as its fund. The closed box is archived and can still be seen at `?box=1`, `?box=2` and so on. If the gifts never get there, Urna ends with that box.
- **Donations.** If someone pays less than the day's price, through an old link, it counts as a donation and breaks no ampoule.
- **Before the start date.** The daily step publishes the sealed box at day 0 and needs no key. The page says when it starts and the payment button stays off.
- **Payments while closed.** If an ampoule payment comes in while a box is closed (for example, if the daily step failed for a few days), it breaks no ampoule: it goes in the log as waiting for a refund, and the daily step prints which Stripe session to refund.

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
| `scripts/stripe-setup.js` | Creates the product, one payment link per step of the price ladder (85 links, £1 to £4,100) and the gift link for the next box |
| `scripts/stripe-update.js` | Updates the existing links (where people land after paying, the text above the pay button) without making new ones. Also a button in the Actions tab |
| `scripts/demo.js` | A demo without Stripe, with an invented public. `--revive` makes the rent high enough for boxes to close and come back |
| `scripts/verify.js` | Checks the seals in any `ledger.json` |
| `scripts/new-key.js` | Makes the key that encrypts the choices |
| `scripts/build-pages.js` | Builds `docs/index.html` (the urn), `docs/simulator/` (in English) and `docs/simulator/es/` (in Spanish) |
| `src/page.html` | The public page |
| `src/glyphs.js` | The operation glyphs |
| `src/simulator.html`, `src/simulator-es.html` | The simulator for The Cycle, in English and Spanish |
| `docs/` | What GitHub Pages serves. The daily step writes `ledger.json`, `state.json`, `series.json` (every box so far) and `boxes/N/` for each closed box |
| `private/ledger.enc.json` | The choices, encrypted. It is in the public repository, but can't be read without the key. Closed boxes keep theirs as `private/box-N.enc.json` |
| `.github/workflows/tick.yml` | Runs the daily step at 05:07 UTC |

Nothing to install: only Node 18 or newer.

### Where things stand (19 October 2026)

- **Repository and Pages.** `Alexo000/closed-systems`, public. GitHub Pages serves `docs/` from `main` at https://urna.ramos-saavedra.com/, with "Enforce HTTPS" on. The address comes from `site` in `config.json`: `build-pages.js` writes it to `docs/CNAME`. In Squarespace (Domains → ramos-saavedra.com → DNS), a custom record `CNAME urna → alexo000.github.io`, like the ones for operations, mmm, tasks and toolkit.
- **Secrets** (Settings → Secrets and variables → Actions):
  - `URNA_KEY`: 64 hex characters made with `openssl rand -hex 32`. It encrypts the choices. Also kept in the password manager as "Urna · URNA_KEY". It can't be recovered or changed: without it the urn can't be opened.
  - `STRIPE_SECRET_KEY`: a **live** restricted key (`rk_live_…`) with only Products (write), Prices (write), Payment Links (write) and Checkout Sessions (read). Also in the password manager. If it is lost or leaked, make a new one in Stripe (dashboard.stripe.com/apikeys) and replace the secret.
- **Stripe.** 85 live payment links, one per step of the price ladder, and one gift link, all in `config.json`. The daily step switched them on the morning of 19 October 2026. After paying, people land on `returnTo` (https://urna.ramos-saavedra.com/) with `?paid=1`, or `?gave=1` after a gift.
- **The box** started on 19 October 2026, 00:00 UTC (`start`).

### Buttons in the Actions tab

| Workflow | What it does | When |
|---|---|---|
| `urna-daily-step` | The daily step (`scripts/tick.js`), then commits `docs/` and `private/` | By itself at 05:07 UTC every day; by hand any time, it is safe to run twice |
| `stripe-setup` | Creates a new set of payment links and the gift link with `STRIPE_SECRET_KEY`, and commits `config.json` | Only once per Stripe mode (test or live). Running it again makes a second set and the page switches to it |
| `stripe-update` | Updates the existing links: where people land after paying (`returnTo`) and the text above the pay button | After changing `returnTo` or the texts in `lib/stripe.js` |

### Changing things safely

The page only reads `docs/ledger.json` and `docs/state.json`. Payments live in Stripe and in the daily step. So:

- **Safe at any time:** the page (`src/page.html`, then `node scripts/build-pages.js`), its texts, design and motion; the simulator; the Squarespace page; `returnTo` and the payment texts (then run `stripe-update`); the rent and the gift target for the future (they apply from the next daily step).
- **Ask before changing, once the box has started:**
  - `engine/engine.js` and the box settings in `config.json` (`engine`, `seed`, `start`, `breakWithinDays`): the box is rebuilt from day 0 every morning, so these rewrite its past.
  - The price ladder (`price.start`, `price.max`, `price.stepsPerDouble`): each Stripe link is tied to an exact amount, so new links are needed.
  - The ampoule keys (`seeds`, `salt`…): the Stripe menu and the seals use them. Names, operations and descriptions can change.
  - `URNA_KEY`: never.

### Setting it up from scratch

1. **Repository.** A public repository with these files. On GitHub: Settings → Pages → Deploy from a branch → `main` → `/docs`.
2. **Key.** `openssl rand -hex 32` (or `node scripts/new-key.js`). Save it as the `URNA_KEY` secret and in a password manager.
3. **Stripe.** Create a restricted key (Developers → API keys → Create secret key → Custom permissions) with Products (write), Prices (write), Payment Links (write) and Checkout Sessions (read); in the permission list, search `/v1/prices` if Prices is hard to find. Save it as the `STRIPE_SECRET_KEY` secret. Then run `stripe-setup` from the Actions tab. To test first, use a test-mode key (`rk_test_…`) and the card 4242 4242 4242 4242, then repeat with the live key.
4. **Settings.** In `config.json`, check `start`, `fund.start`, `fund.rent`, `revive.target`, `site` and `returnTo`.
5. **First step.** Run `urna-daily-step` by hand. From then on it runs every morning.

### For the site

On ramos-saavedra.com (Squarespace):

- **`/urna`** stays in the *try* folder so the menu and old links keep working. A script in its page settings (Advanced → Page header code injection) sends visitors straight to https://urna.ramos-saavedra.com/, keeping `?paid=1` or `?gave=1`; it does nothing inside the Squarespace editor. The same box holds `og:image` and `twitter:image` pointing to `card.png`. The old iframe code block is still on the page but nobody sees it.
- **The page's own tags.** Title, description, sharing image and canonical address are at the top of `src/page.html`; `build-pages.js` puts them in the `<head>`.
- **Home page:** the Transmogrificadora code block under "Try something" holds two cards, Transmogrificadora and Urna ("Live"), side by side. The Urna card links to https://urna.ramos-saavedra.com/ and uses its `card.png`.

### Trying it without Stripe

```
node scripts/demo.js 600
```

It invents some days of public and leaves the ledger and the box in `demo/`. To look at it, copy `docs/index.html`, `demo/ledger.json` and `demo/state.json` into one folder and serve it with any local server (`npx serve folder`).

### Checking the seals

```
node scripts/verify.js https://urna.ramos-saavedra.com/ledger.json
```

### Still open

- **The real rent.** £5 a month is a guess: domain and margin. GitHub Pages and Actions are free on a public repository.
- **Terms.** The payment page already says the payment can't be cancelled or refunded once the ampoule is on the rail. I am not a lawyer: get it checked and, if Stripe asks, link to terms.
- **Calibration.** The salt, the stock and the price come from simulations with an invented public. Worth checking after a few months with real people.
- **What still shows.** When a type sells out it leaves the menu, so people learn that every one of that type was bought. Ink darkens the glass when it breaks; with the secret break day, it can't be pinned on a buyer unless very few people paid in the previous six weeks.
