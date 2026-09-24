const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ---- Edit here ----------------------------------------------------------
// One Meta Pixel ID for the whole site. Get this from Meta Events Manager.
const META_PIXEL_ID = '1850705885913736';

// Each key becomes a route: /Comm1, /Comm2, ...
// Add more communities by adding more entries here — no other code changes needed.
const COMMUNITIES = {
  Comm1: 'https://chat.whatsapp.com/By6BErqhio69mmrPuVWtTJ',
  Comm2: 'https://chat.whatsapp.com/JEAu6hZbDuj6P2pvOU9tgq',
};

// The old lead-form-first page (explore.html) and the old single-screen
// WhatsApp-unlock page (index.html). /Explore1/Explore2 and /Comm1/Comm2
// used to serve these, but all four now point at the 5-screen onboarding
// flow below instead. Left empty — and the templates/render functions
// further down left in place — in case a future variant wants either style
// of page again; nothing routes here right now.
const EXPLORE_PAGES = {
};
 
// Each key becomes a route: /Explore1, /Explore2, /Explore3, /Explore4,
// /Comm1, /Comm2. All six render the exact same 5-screen onboarding
// template (qualifying question → 3 explainer screens → a final screen
// that completes the flow). `mode` controls how that final screen behaves:
//   'direct' — no form at all, one tap completes it
//   'form'   — reveals a one-page form (name, phone, orders, categories)
//              first, then completes on submit
// `waLink` controls WHERE completing the flow sends people:
//   omitted    — redirects to qrate.shopdeck.com (filtered to the category
//                selected in form mode; the plain browse page in direct mode)
//   a WA link  — shows a real "Join WA Community" button to tap instead of
//                an auto-redirect (no category filtering, since the
//                destination isn't qrate.shopdeck.com)
//
// Explore1/Explore2 and Comm1/Comm2 are the four live/primary links.
// Explore3 and Explore4 are kept as aliases of Explore2/Explore1 (not
// redirects — served directly, so no extra hop or duplicate PageView)
// purely so any links already shared or running in ads under those older
// names keep working.
const EXPLORE_ONBOARDING_PAGES = {
  Explore1: { mode: 'form' },
  Explore2: { mode: 'direct' },
  Explore3: { mode: 'direct' }, // alias of Explore2
  Explore4: { mode: 'form' },   // alias of Explore1
  Comm1: { mode: 'form', waLink: COMMUNITIES.Comm1 },
  Comm2: { mode: 'direct', waLink: COMMUNITIES.Comm1 }, // both onboarding routes go to Community 1 for now — Join2 below is the only route using Community 2's real link
};
 
// Each key becomes a route: /Join1, ... A minimal page (no onboarding
// screens, no form) that shows briefly then auto-redirects to a WhatsApp
// group almost immediately. For sharing through channels — like a Gupshup
// HSM template — that won't let you send a chat.whatsapp.com link directly.
const WA_REDIRECT_PAGES = {
  Join1: { waLink: COMMUNITIES.Comm1 },
  Join2: { waLink: COMMUNITIES.Comm2 },
};
 
// The site the "Submit & Explore" button sends people to.
const QRATE_BASE_URL = 'https://qrate.shopdeck.com/';
 
// Which sub_category filter(s) each pill maps to on qrate.shopdeck.com.
// `null` means that pill has no specific filter — it just goes to the plain
// browse page. When someone selects more than one category, the filters
// from every category that HAS one are merged into a single sub_category
// list (categories with `null` contribute nothing and are otherwise
// ignored, per your instruction to open the specific category's link when
// one selected category has a filter and another doesn't). If nothing
// selected has a filter, the plain browse page is used.
const CATEGORY_SUBCATEGORIES = {
  'Kurtis/Ethnic Wear': [
    'chikankari_kurta_sets', 'chikankari_kurtis', 'kurta_pant_and_dupatta_sets',
    'kurta_sets_general', 'kurtis_general_other', 'unstitched_suit_fabric',
    'printed_kurtis', 'womens_clothing__womens_ethnic_wear',
  ],
  Sarees: [
    'banarasi_sarees', 'cotton_sarees', 'handloom_sarees', 'linen_sarees',
    'printed_sarees', 'sarees_general_other', 'silk_sarees',
  ],
  Jewellery: [
    'anklets', 'bangles_and_bracelets', 'chains', 'earrings', 'hair_accessories',
    'jewellery_combo_sets', 'kamarbands', 'mangalsutra_sets', 'mangalsutras',
    'necklace_sets', 'necklaces', 'pendant_sets', 'other_jewellery_and_novelty',
    'pendants', 'rakhis', 'rings',
  ],
  "Women's Bags/Accessories": [
    'clutches', 'handbags', 'other_bags', 'potli_bags', 'sling_bags', 'tote_bags',
  ],
  'Home & Kitchen': null,
  "Men's Fashion": null,
  "Kid's Fashion": null,
  Other: null,
};
// --------------------------------------------------------------------------
 
// Where leads are stored. Defaults to a folder inside the project so
// `npm start` works locally with no setup. On Railway, mount a Volume at
// the resolved path (see README "Persisting leads across redeploys") so
// leads survive redeploys — without a volume this still works, but a
// redeploy wipes it.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.csv');
const CSV_HEADER = 'Timestamp,Community,Name,Phone,Kahan Bechte Ho,Daily Orders,Categories,Qualifies\r\n';
 
function ensureLeadsFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) {
    // Leading BOM so Excel opens UTF-8 (Hindi text, ₹, etc.) correctly.
    fs.writeFileSync(LEADS_FILE, '\uFEFF' + CSV_HEADER, 'utf8');
  }
}
ensureLeadsFile();
 
function csvEscape(value) {
  var str = String(value === undefined || value === null ? '' : value);
  if (/["\n\r,]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
 
function toCsvRow(fields) {
  return fields.map(csvEscape).join(',') + '\r\n';
}
 
const templatePath = path.join(__dirname, 'public', 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');
 
const exploreTemplatePath = path.join(__dirname, 'public', 'explore.html');
const exploreTemplate = fs.readFileSync(exploreTemplatePath, 'utf8');
 
const onboardingTemplatePath = path.join(__dirname, 'public', 'explore-onboarding.html');
const onboardingTemplate = fs.readFileSync(onboardingTemplatePath, 'utf8');
 
const waRedirectTemplatePath = path.join(__dirname, 'public', 'wa-redirect.html');
const waRedirectTemplate = fs.readFileSync(waRedirectTemplatePath, 'utf8');
 
function renderPage(waLink, slug) {
  return template
    .split('__WA_LINK__').join(waLink)
    .split('__COMMUNITY_SLUG__').join(slug)
    .split('__PIXEL_ID__').join(META_PIXEL_ID);
}
 
function renderExplorePage(slug) {
  // Escape "<" so these JSON blobs can't break out of their <script> tag.
  var subcatsJson = JSON.stringify(CATEGORY_SUBCATEGORIES).replace(/</g, '\\u003c');
  return exploreTemplate
    .split('__CATEGORY_SUBCATEGORIES_JSON__').join(subcatsJson)
    .split('__QRATE_BASE_URL__').join(QRATE_BASE_URL)
    .split('__COMMUNITY_SLUG__').join(slug)
    .split('__PIXEL_ID__').join(META_PIXEL_ID);
}
 
function renderOnboardingPage(slug, mode, waLink) {
  var subcatsJson = JSON.stringify(CATEGORY_SUBCATEGORIES).replace(/</g, '\\u003c');
  return onboardingTemplate
    .split('__CATEGORY_SUBCATEGORIES_JSON__').join(subcatsJson)
    .split('__QRATE_BASE_URL__').join(QRATE_BASE_URL)
    .split('__FLOW_MODE__').join(mode)
    .split('__DEST_TYPE__').join(waLink ? 'whatsapp' : 'qrate')
    .split('__WA_LINK__').join(waLink || '')
    .split('__COMMUNITY_SLUG__').join(slug)
    .split('__PIXEL_ID__').join(META_PIXEL_ID);
}
 
function renderWaRedirectPage(slug, waLink) {
  return waRedirectTemplate
    .split('__WA_LINK__').join(waLink)
    .split('__COMMUNITY_SLUG__').join(slug)
    .split('__PIXEL_ID__').join(META_PIXEL_ID);
}
 
// Serve logo/image assets (the page itself embeds its logo inline, but
// these stay here as editable source files for future use).
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
 
Object.keys(EXPLORE_PAGES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.send(renderExplorePage(slug));
  });
});
 
Object.keys(EXPLORE_ONBOARDING_PAGES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    var cfg = EXPLORE_ONBOARDING_PAGES[slug];
    res.send(renderOnboardingPage(slug, cfg.mode, cfg.waLink));
  });
});
 
Object.keys(WA_REDIRECT_PAGES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.send(renderWaRedirectPage(slug, WA_REDIRECT_PAGES[slug].waLink));
  });
});
 
// Root redirects to the first community page.
app.get('/', (req, res) => {
  res.redirect('/Comm1');
});
 
// Called by the form on every valid submission. Appends one row per lead.
app.post('/api/leads', (req, res) => {
  var d = req.body || {};
  var name = String(d.name || '').trim().slice(0, 200);
  var phone = String(d.phone || '').trim().slice(0, 40);
 
  if (!name || !phone) {
    return res.status(400).json({ status: 'error', message: 'name and phone are required' });
  }
 
  try {
    ensureLeadsFile();
    var row = toCsvRow([
      new Date().toISOString(),
      String(d.community || '').slice(0, 60),
      name,
      phone,
      String(d.kahan_bechte_ho || '').slice(0, 100),
      String(d.daily_orders || '').slice(0, 40),
      String(d.categories || '').slice(0, 300),
      d.qualifies ? 'Yes' : 'No'
    ]);
    fs.appendFileSync(LEADS_FILE, row, 'utf8');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Failed to append lead:', err.message);
    res.status(500).json({ status: 'error' });
  }
});
 
// Visit /leads?password=... in a browser to download every lead as a CSV.
// Set LEADS_PASSWORD as a Railway environment variable (Variables tab).
app.get('/leads', (req, res) => {
  var password = process.env.LEADS_PASSWORD;
 
  if (!password) {
    return res.status(500).send('LEADS_PASSWORD is not set. Add it in Railway → Variables, then reload.');
  }
  if (req.query.password !== password) {
    return res.status(401).send('Wrong or missing password. Use /leads?password=your-password');
  }
 
  ensureLeadsFile();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="qrate-leads.csv"');
  res.sendFile(LEADS_FILE, (err) => {
    if (err && !res.headersSent) {
      res.status(500).send('Could not read the leads file.');
    }
  });
});
 
app.listen(PORT, () => {
  console.log(`QRate landing running on port ${PORT}`);
  console.log('Onboarding routes:', Object.keys(EXPLORE_ONBOARDING_PAGES).map((s) => `/${s}`).join(', '));
  if (Object.keys(EXPLORE_PAGES).length) {
    console.log('Legacy explore routes:', Object.keys(EXPLORE_PAGES).map((s) => `/${s}`).join(', '));
  }
  console.log('WA redirect routes:', Object.keys(WA_REDIRECT_PAGES).map((s) => `/${s}`).join(', '));
  console.log('Leads file:', LEADS_FILE);
});
