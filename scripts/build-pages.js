// Builds the pages GitHub Pages serves from docs/: the urn, the simulator in English and the simulator in Spanish.
const fs = require('fs');
const path = require('path');
const C = require('../lib/core.js');
// everything before the first <style> (title, description, sharing tags, fonts) goes in <head>, so link previews can read it
const wrap = (html, lang) => {
  const i = html.indexOf('<style>');
  const head = i > 0 ? html.slice(0, i).trim() + '\n' : '';
  const body = i > 0 ? html.slice(i) : html;
  return `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}</head>\n<body>\n${body}\n</body>\n</html>\n`;
};
const src = f => fs.readFileSync(path.join(C.ROOT, 'src', f), 'utf8');
// a link to the other language, at the end of the header
const withLang = (html, href, label, lang) => html.replace('</header>', `  <p class="lang"><a href="${href}" hreflang="${lang}" lang="${lang}">${label}</a></p>\n  </header>`);
const out = (rel, html) => { const p = path.join(C.ROOT, 'docs', rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); };
const glyphs = src('glyphs.js');
out('index.html', wrap(src('page.html').replace('/*GLYPHS*/', () => glyphs), 'en'));
out('simulator/index.html', wrap(withLang(src('simulator.html'), 'es/', 'Español', 'es'), 'en'));
out('simulator/es/index.html', wrap(withLang(src('simulator-es.html'), '../', 'English', 'en'), 'es'));
out('.nojekyll', '');
// the custom address (urna.ramos-saavedra.com) comes from config.site; on github.io there is no CNAME
const host = new URL(C.loadConfig().site).hostname;
if (!host.endsWith('github.io')) out('CNAME', host + '\n');
console.log('Built docs/index.html, docs/simulator/ and docs/simulator/es/.');
