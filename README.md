# QRate by ShopDeck — Landing Page

One codebase, one Railway deploy, three kinds of landing page:

- **`/Comm1`, `/Comm2`** — the WhatsApp-community-join flow. They only differ
  by which WhatsApp group the CTA joins. `public/index.html` is the shared
  template.
- **`/Explore1`, `/Explore2`** — a single-screen page with a plain-language
  explainer of the model (Explore Products → Set Your Price → Share with
  Customers → Place Orders → Earn Money, plus the catalog/shipping/quality
  bullets) and a reseller/WhatsApp-Instagram qualifier line, then one lead
  form with a single **"Submit & Explore My Category Products"** button.
  Submitting the form saves the lead and redirects straight to that
  category's page on your own site. `public/explore.html` is the shared
  template.
- **`/Explore3`, `/Explore4`** — the newer light-theme, mobile-first
  **onboarding flow**: one screen at a time (a Yes/No qualifying question,
  three explainer screens, then a final "Start Earning" screen), rather than
  one long scrolling page. `/Explore3` and `/Explore4` share the exact same
  screens — they only differ in what "Start Earning" does (see below).
  `public/explore-onboarding.html` is the shared template. See "The
  onboarding flow" below for details.

`server.js` fills in the per-route details at request time for all three.

## Before you deploy

Open **`server.js`** and fill in the config at the top of the file:

```js
const META_PIXEL_ID = 'REPLACE_WITH_YOUR_PIXEL_ID';

const COMMUNITIES = {
  Comm1: 'https://chat.whatsapp.com/By6BErqhio69mmrPuVWtTJ',   // already set
  Comm2: 'https://chat.whatsapp.com/REPLACE_WITH_COMM2_GROUP_LINK',
};

const EXPLORE_PAGES = {
  Explore1: {},
  Explore2: {},
};

const EXPLORE_ONBOARDING_PAGES = {
  Explore3: { mode: 'direct' },   // Start Earning -> straight to qrate.shopdeck.com
  Explore4: { mode: 'form' },     // Start Earning -> form -> category page
};

const QRATE_BASE_URL = 'https://qrate.shopdeck.com/';

const CATEGORY_SUBCATEGORIES = {
  'Kurtis/Ethnic Wear': ['chikankari_kurta_sets', 'chikankari_kurtis', /* ...already set */],
  Sarees: ['banarasi_sarees', 'cotton_sarees', /* ...already set */],
  Jewellery: ['anklets', 'bangles_and_bracelets', /* ...already set */],
  "Women's Bags/Accessories": ['clutches', 'handbags', /* ...already set */],
  'Home & Kitchen': null,
  "Men's Fashion": null,
  "Kid's Fashion": null,
  Other: null,
};
```

- **META_PIXEL_ID** — your Meta Pixel ID from Events Manager. It's injected
  into both the pixel init script and the `<noscript>` fallback automatically,
  on every page.
- **Comm2's link** — swap in the real WhatsApp group link.
- **QRATE_BASE_URL / CATEGORY_SUBCATEGORIES** — the "Submit & Explore" button
  always sends people to `QRATE_BASE_URL` on your own site
  (`https://qrate.shopdeck.com/`), with a `sub_category` filter built from
  whichever category pill(s) the person selected, plus `&utm_source=LP`.
  `CATEGORY_SUBCATEGORIES` maps each pill to the list of `sub_category` slugs
  it should add to that URL — 4 of the 8 pills (Kurtis/Ethnic Wear, Sarees,
  Jewellery, Women's Bags/Accessories) are already filled in from the real
  category links you gave; Home & Kitchen, Men's Fashion, Kid's Fashion, and
  Other are set to `null`, meaning they have no specific filter and just send
  people to the plain browse page (`QRATE_BASE_URL + '?utm_source=LP'`) — fill
  in a slug list for any of them the same way once you have one.
  **If someone selects more than one category:** the slugs from every
  selected category that has a list are merged into one combined
  `sub_category` filter (deduped), so e.g. selecting both Jewellery and
  Sarees sends them to a single page filtered to both categories' products.
  A `null` category selected alongside a category that has a list is simply
  ignored — the person still goes to that other category's filtered page,
  never to the plain browse page, as long as at least one selected category
  has a list. Only when **none** of the selected categories have a list does
  the plain browse page get used. This all happens client-side in
  `explore.html`'s submit handler (`buildDestinationUrl`), since it depends
  on the full set of categories the person checked, not just the first one.
- **More communities / Explore variants** — add another `slug: {...}` entry
  to `COMMUNITIES` or `EXPLORE_PAGES` and a new route (`/Comm3`, `/Explore5`,
  ...) appears automatically. No other file needs to change. The `{}` value
  in `EXPLORE_PAGES` is a placeholder for future per-route overrides — it
  doesn't need anything in it today. For `EXPLORE_ONBOARDING_PAGES`, each
  entry needs `{ mode: 'direct' }` or `{ mode: 'form' }` (see below).

Visiting `/` redirects to whichever community is listed first in `COMMUNITIES`.

Separately, in **Railway → your service → Variables**, add:

```
LEADS_PASSWORD = <a password you choose>
```

This gates the CSV download (see below). There's no code to edit for this —
just the Railway variable.

## Leads: how they're stored, and how to download them

Every valid form submission is appended as a row to a CSV file that lives on
the server itself — no Google account, no external service. The columns
are: Timestamp · Community · Name · Phone · Kahan Bechte Ho · Daily Orders ·
Categories · Qualifies (Yes/No).

**To download all leads so far:** visit this URL in a browser —

```
https://<your-railway-domain>/leads?password=<your LEADS_PASSWORD>
```

— and it downloads as `qrate-leads.csv`, openable directly in Excel/Sheets.
Wrong or missing password gets a 401; if `LEADS_PASSWORD` isn't set in
Railway at all, it tells you that instead of the file.

### Persisting leads across redeploys

By default the CSV lives in the container's own filesystem, which Railway
wipes on every redeploy — fine for trying things out, but you'll lose leads
the next time you push a change. To make them durable:

1. In Railway, open your service → **Volumes** → **Add Volume**.
2. Set the **mount path** to `/app/data` — that's where Railway places this
   app's files (confirmed from your earlier deploy logs), so this lines up
   with the default `DATA_DIR` in `server.js` with no code change needed.
3. Redeploy once. From then on, leads persist across every future deploy.

## The form (`/Comm*`, `/Explore1`, `/Explore2`)

These page types validate the same fields on submit: name, a valid 10-digit
number, one answer each for "kahan bechte ho" / "daily orders", and at
least one category.

- On **`/Comm*`**, a valid submit unlocks a separate WhatsApp-join button
  (greyed out until then) — the lead is saved, then the person taps the
  button themselves to join.
- On **`/Explore1`/`/Explore2`**, there's just the one button — **"Submit &
  Explore My Category Products"**. Clicking it validates the form, saves
  the lead, fires the pixel events (below), and redirects to
  `qrate.shopdeck.com` filtered to every category the person selected
  (merged into one link — see CATEGORY_SUBCATEGORIES above) — no separate
  unlock step, no click-through.

`/Explore3` and `/Explore4` work differently — see "The onboarding flow" below.

## The onboarding flow (`/Explore3`, `/Explore4`)

Both routes render the exact same five screens, one at a time, with a
progress-dot indicator at the top (mobile-first — the page never scrolls
past one screen's worth of content):

1. **Qualifying question** — "Kya aap ek reseller ho jo apne customers ko
   WhatsApp pe products sell karte ho?" with a small animated illustration
   and **Yes** / **No** buttons.
   - **No** → a polite dead-end screen ("QRate abhi sirf WhatsApp/Insta
     resellers ke liye hai…") with no further CTA, just a small "wrong tap?
     go back" link. Nothing is saved, no pixel fires.
   - **Yes** → continues to screen 2.
2. **"1L+ Products across categories"** explainer, with an animated
   illustration and a **Next** button.
3. **"Share with customers, get orders"** explainer + animation + **Next**.
4. **"Easy order placement, no-questions returns"** explainer + animation + **Next**.
5. **"1L+ top-selling products, quality guarantee, earnings"** explainer +
   animation + a **"Start Earning"** button.

What "Start Earning" does depends on the route's `mode` in
`EXPLORE_ONBOARDING_PAGES`:

- **`/Explore3` (`mode: 'direct'`)** — taps straight through: fires the
  pixel events, shows a brief "taiyar ho raha hai…" loading screen, and
  redirects to `qrate.shopdeck.com` (no form, no category filter, since
  nothing was collected).
- **`/Explore4` (`mode: 'form'`)** — reveals a one-page form (Name, Mobile
  Number, expected monthly orders, and categories — select all that apply),
  each on its own field with big tap-friendly pills. Its own **"Start
  Earning"** button validates, saves the lead, fires the pixel events, and
  redirects to `qrate.shopdeck.com` filtered to every category selected
  (same merge logic as `/Explore1`/`/Explore2` — see CATEGORY_SUBCATEGORIES
  above).

Screens 2, 3, and 4 play your real QRate app screen recordings
(`public/assets/videos/screen2.*`, `screen3.*`, `screen4.*` — catalog
browsing, sharing on WhatsApp, and placing an order respectively), muted,
autoplaying, looping. Each is encoded twice — an `.mp4` (H.264, plays on
iOS Safari and Chrome) as the primary source and a `.webm` (VP9) as a
fallback for browsers that lack an H.264 decoder — the `<video>` element
picks whichever it can play.

Screen 5 (the earnings screen) shows a real screenshot of the QRate "My
Orders" dashboard (`public/assets/images/screen5.jpg`, with a
`screen5.webp` version served first to browsers that support it), cropped
into the phone frame the same way the videos are.

Screen 1 (the reseller question) is the only one still using a small
original CSS/emoji animation, since no footage was provided for it yet.
Swap it in the same way once you have one: edit
`public/explore-onboarding.html`, replace that screen's `.phone-mock`
inner markup with a `<video autoplay muted loop playsinline>` (for a video)
or a `<picture>`/`<img>` (for a still) pointing at a new file in
`public/assets/videos/` or `public/assets/images/`, matching the pattern
used for screens 2–5. Everything else (progress dots, buttons, redirect
logic) is unaffected.

## What's tracked

- **Page view** — fires automatically on load via the Meta Pixel base code (`fbq('track', 'PageView')`).
- **Lead** (standard event) — on `/Comm*`, fires when the (now-unlocked) WhatsApp button is clicked. On `/Explore*` and `/Explore3`/`/Explore4`, fires at the moment of a valid submit (form submit, or "Start Earning" on the direct-mode page), right before the redirect. Kept as the standard event on every page type so "Leads" campaign objectives and Meta's own optimisation still pick it up — but since every page type reuses this same standard event, it's not a reliable way to tell funnels apart in reporting.
- **Good Reseller** (custom event, every page type) — fires at that same moment, under a qualifying rule: on `/Comm*`/`/Explore1`/`/Explore2` it's "kahan bechte ho" and "daily orders" both not "New to reselling" plus a qualifying category; on `/Explore3` (direct) it fires whenever someone completes the flow (they already confirmed "Yes, I'm a reseller" on screen 1 — that's the qualifier, and there's no further data to check); on `/Explore4` (form) it's "orders" not "New to reselling" plus a qualifying category, same as the other forms. Deliberately the *same* event name and parameter shape (`content_category`, `categories`) everywhere — on purpose, so Meta pools every qualifying submit, from any funnel, into one shared conversion history for optimisation rather than splitting the signal up.
- **QRate Explore Submit** (custom event, `/Explore1`/`/Explore2` only) — fires on every valid submit there, alongside Lead and (when qualifying) Good Reseller, uniquely named so you can build a custom conversion or audience specifically off that funnel. Carries `content_category` and `categories`.
- **QRate Onboarding Start Earning** (custom event, `/Explore3`/`/Explore4` only) — fires on every "Start Earning" tap that completes the onboarding flow, alongside Lead and (when qualifying) Good Reseller, uniquely named for the same reason. Carries `content_category` and `flow_mode` (`direct` or `form`), so you can split direct-redirect traffic from form-fill traffic in reporting even though they share this one event name.

On `/Explore*`/`/Explore3`/`/Explore4`, the redirect is delayed (~350–600ms) after the lead POST and pixel calls fire, so the browser has a moment to actually send them before navigating away — without that, some fraction would get cancelled mid-flight. Every tracking call is wrapped in a check so nothing breaks if a browser blocks the pixel script, and the CSV write happens independently of the pixel, so a lead is captured even if `fbq` is blocked entirely.

## Logo

`index.html` and `explore.html` embed the QRate wordmark directly as a base64 image (the dark-background version), so it always renders even in previews that don't have access to the rest of the project folder. `explore-onboarding.html` (the light-theme onboarding flow) instead just references `/assets/qrate-logo.png` (the dark-on-light version) directly, since that page is served with `public/` already mounted — no base64 needed there. `public/assets/` keeps both source PNGs as editable originals: `qrate-logo.png` (dark logo, for light backgrounds) and `qrate-logo-dark.png` (light logo, for dark backgrounds — yes, the naming is a little confusing, it's named for the background it suits).

## Run locally

```bash
npm install
npm start
```

Visit http://localhost:3000/Comm1, http://localhost:3000/Comm2,
http://localhost:3000/Explore1, http://localhost:3000/Explore2,
http://localhost:3000/Explore3, http://localhost:3000/Explore4

## Push to GitHub

```bash
git init
git add .
git commit -m "QRate landing pages"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## Deploy on Railway

1. railway.app → **New Project** → **Deploy from GitHub repo** → select this repo.
2. Railway auto-detects Node via Nixpacks, runs `npm install` then `npm start`. No config needed.
3. Service → **Settings** → **Networking** → **Generate Domain** for a public URL, or attach your own domain (e.g. `abc.com`) there.
4. Your pages are then live at `abc.com/Comm1`, `abc.com/Comm2`,
   `abc.com/Explore1`, `abc.com/Explore2`, `abc.com/Explore3`, and
   `abc.com/Explore4`.
5. Every push to `main` auto-redeploys.
