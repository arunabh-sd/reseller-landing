# QRate by ShopDeck — Landing Page

One codebase, one Railway deploy, two (or more) community landing pages —
`/Comm1` and `/Comm2` — that only differ by which WhatsApp group the CTA
joins. `public/index.html` is a shared template; `server.js` fills in the
per-route details at request time.

## Before you deploy

Open **`server.js`** and fill in two things at the top of the file:

```js
const META_PIXEL_ID = 'REPLACE_WITH_YOUR_PIXEL_ID';

const COMMUNITIES = {
  Comm1: 'https://chat.whatsapp.com/By6BErqhio69mmrPuVWtTJ',   // already set
  Comm2: 'https://chat.whatsapp.com/REPLACE_WITH_COMM2_GROUP_LINK',
};
```

- **META_PIXEL_ID** — your Meta Pixel ID from Events Manager. It's injected
  into both the pixel init script and the `<noscript>` fallback automatically.
- **Comm2's link** — swap in the real WhatsApp group link.
- **More communities** — add another `slug: link` line here and a new route
  (`/Comm3`, ...) appears automatically. No other file needs to change.

Visiting `/` redirects to whichever community is listed first.

## What's tracked

- **Page view** — fires automatically on load via the Meta Pixel base code (`fbq('track', 'PageView')`).
- **Join button clicked** — fires `fbq('track', 'Lead', ...)` on click of the WhatsApp CTA, tagged with which community page it happened on (`Comm1` / `Comm2`) so you can compare conversion across groups in Events Manager. The click still opens WhatsApp normally either way — tracking never blocks the redirect, and it's wrapped in a check so nothing breaks if a browser blocks the pixel script.

## Logo

The QRate wordmark is embedded directly in `index.html` as a base64 image, so it always renders — including in previews that don't have access to the rest of the project folder (this is the fix for it not showing up before). `public/assets/` still keeps the two source PNGs (light-on-transparent and dark-on-transparent) as editable originals if you need them elsewhere.

## Run locally

```bash
npm install
npm start
```

Visit http://localhost:3000/Comm1 and http://localhost:3000/Comm2

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
4. Your two pages are then live at `abc.com/Comm1` and `abc.com/Comm2`.
5. Every push to `main` auto-redeploys.
