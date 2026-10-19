// Draws the frames of an example box (from scripts/example.js) with the page's own drawing code.
// Needs Playwright and a page served locally: (cd docs && python3 -m http.server 8766)
// Usage: node scripts/example-frames.js <frames.json> <out-dir> [light|dark] [width]
// Then scripts/example-gif.py turns the frames into the loops on the page.
const fs = require('fs');
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Needs Playwright: npm i playwright'); process.exit(1); }

(async () => {
  const [src, out, scheme = 'light', width = '320'] = process.argv.slice(2);
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme });
  // no labels, no animation loop of its own: we draw each frame ourselves
  await p.addInitScript(() => { try { localStorage.setItem('urna.labels', 'off'); } catch (e) {} window.requestAnimationFrame = () => 0; });
  await p.goto(process.env.URNA_LOCAL || 'http://localhost:8766/');
  await p.waitForFunction(() => typeof S !== 'undefined' && S && typeof prepareBox === 'function', null, { timeout: 120000 });
  for (let i = 0; i < data.frames.length; i++) {
    const f = data.frames[i];
    const url = await p.evaluate(([f, i, w]) => {
      box.style.width = w + 'px';
      S = Object.assign({}, f.state); L.left = f.left;
      prepareBox();
      const noon = new Date(); noon.setUTCHours(12, 0, 0, 0);
      drawBox(i * 0.45, noon);
      return box.toDataURL('image/png');
    }, [f, i, +width]);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  fs.writeFileSync(path.join(out, 'weeks.json'), JSON.stringify(data.frames.map(f => f.week)));
  await b.close();
  console.log(`${data.frames.length} frames in ${out}`);
})();
