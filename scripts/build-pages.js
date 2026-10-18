// Builds the pages GitHub Pages serves from docs/: the urn, the simulator in English and the simulator in Spanish.
const fs = require('fs');
const path = require('path');
const C = require('../lib/core.js');
const wrap = (body, lang) => `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
const src = f => fs.readFileSync(path.join(C.ROOT, 'src', f), 'utf8');
// a link to the other language, at the end of the header
const withLang = (html, href, label, lang) => html.replace('</header>', `  <p class="lang"><a href="${href}" hreflang="${lang}" lang="${lang}">${label}</a></p>\n  </header>`);
const out = (rel, html) => { const p = path.join(C.ROOT, 'docs', rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const glyphs = src('glyphs.js');
out('index.html', wrap(src('page.html').replace('/*GLYPHS*/', () => glyphs), 'en'));
out('simulator/index.html', wrap(withLang(src('simulator.html'), 'es/', 'Español', 'es'), 'en'));
out('simulator/es/index.html', wrap(withLang(src('simulator-es.html'), '../', 'English', 'en'), 'es'));
out('.nojekyll', '');
console.log('Built docs/index.html, docs/simulator/ and docs/simulator/es/.');
