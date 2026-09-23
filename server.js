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

// Each key becomes a route too: /Explore1, /Explore2, ... These pages show
// the lead form, then a "Submit & Explore" button that sends people straight
// to their category (or categories) on qrate.shopdeck.com. Add more variants
// (e.g. for different ad campaigns) by adding more keys — they all share the
// same QRATE_BASE_URL / CATEGORY_SUBCATEGORIES below.
const EXPLORE_PAGES = {
  Explore1: {},
  Explore2: {},
};

// Each key becomes a route too: /Explore3, /Explore4, ... These are the
// newer 5-screen, one-at-a-time onboarding pages (qualifying question →
// 3 explainer screens → "Start Earning"). `mode` controls what "Start
// Earning" does:
//   'direct' — no form at all, taps straight through to qrate.shopdeck.com
//   'form'   — reveals a one-page form (name, phone, orders, categories)
//              first, then redirects to that category's filtered page
// Both share the same QRATE_BASE_URL / CATEGORY_SUBCATEGORIES below.
const EXPLORE_ONBOARDING_PAGES = {
  Explore3: { mode: 'direct' },
  Explore4: { mode: 'form' },
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

function renderOnboardingPage(slug, mode) {
  var subcatsJson = JSON.stringify(CATEGORY_SUBCATEGORIES).replace(/</g, '\\u003c');
  return onboardingTemplate
    .split('__CATEGORY_SUBCATEGORIES_JSON__').join(subcatsJson)
    .split('__QRATE_BASE_URL__').join(QRATE_BASE_URL)
    .split('__FLOW_MODE__').join(mode)
    .split('__COMMUNITY_SLUG__').join(slug)
    .split('__PIXEL_ID__').join(META_PIXEL_ID);
}

// Serve logo/image assets (the page itself embeds its logo inline, but
// these stay here as editable source files for future use).
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

Object.keys(COMMUNITIES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.send(renderPage(COMMUNITIES[slug], slug));
  });
});

Object.keys(EXPLORE_PAGES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.send(renderExplorePage(slug));
  });
});

Object.keys(EXPLORE_ONBOARDING_PAGES).forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.send(renderOnboardingPage(slug, EXPLORE_ONBOARDING_PAGES[slug].mode));
  });
});

// Root redirects to the first community page.
app.get('/', (req, res) => {
  res.redirect(`/${Object.keys(COMMUNITIES)[0]}`);
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
  console.log('Community routes:', Object.keys(COMMUNITIES).map((s) => `/${s}`).join(', '));
  console.log('Explore routes:', Object.keys(EXPLORE_PAGES).map((s) => `/${s}`).join(', '));
  console.log('Onboarding routes:', Object.keys(EXPLORE_ONBOARDING_PAGES).map((s) => `/${s}`).join(', '));
  console.log('Leads file:', LEADS_FILE);
});
