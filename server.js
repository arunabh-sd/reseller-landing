const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
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
