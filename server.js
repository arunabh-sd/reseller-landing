const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Edit here ----------------------------------------------------------
// One Meta Pixel ID for the whole site. Get this from Meta Events Manager.
const META_PIXEL_ID = 'REPLACE_WITH_YOUR_PIXEL_ID';

// Each key becomes a route: /Comm1, /Comm2, ...
// Add more communities by adding more entries here — no other code changes needed.
const COMMUNITIES = {
  Comm1: 'https://chat.whatsapp.com/By6BErqhio69mmrPuVWtTJ',
  Comm2: 'https://chat.whatsapp.com/REPLACE_WITH_COMM2_GROUP_LINK',
};
// --------------------------------------------------------------------------

const templatePath = path.join(__dirname, 'public', 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');

function renderPage(waLink, slug) {
  return template
    .split('__WA_LINK__').join(waLink)
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

// Root redirects to the first community page.
app.get('/', (req, res) => {
  res.redirect(`/${Object.keys(COMMUNITIES)[0]}`);
});

app.listen(PORT, () => {
  console.log(`QRate landing running on port ${PORT}`);
  console.log('Routes:', Object.keys(COMMUNITIES).map((s) => `/${s}`).join(', '));
});
