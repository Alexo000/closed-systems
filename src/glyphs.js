// Operation glyphs from the Actionary (operations.ramos-saavedra.com), drawn in currentColor.
// Compact form: first line is the viewBox, then one shape per line.
// r rect · c circle · l line · pg polygon · py polyline · ph path; f fill, s stroke, sw stroke-width, fo fill-opacity, da dash, p points; "c" means currentColor.
const GLYPH_SRC = {
'Seed And Leave': `-1 -1 44 82
r x=2.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=8.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=14.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=20.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=26.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=32.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=38.05 y=14.05 w=1.89 h=1.89 f=c fo=0.4
r x=2.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=8.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=14.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=20.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=26.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=32.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
r x=38.05 y=24.05 w=1.89 h=1.89 f=c fo=0.4
c cx=21 cy=5 r=2.3 f=c
pg p=21,17.66,23.57,22.11,18.43,22.11 f=c
l x1=21 y1=32 x2=21 y2=37.4 s=c sw=0.6
pg p=21,38.6,19.8,36.52,22.2,36.52 f=c
r x=2.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=8.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=14.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=20.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=26.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=32.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=38.05 y=44.05 w=1.89 h=1.89 f=c fo=0.4
r x=2.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=8.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=14.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=20.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=26.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=32.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
r x=38.05 y=54.05 w=1.89 h=1.89 f=c fo=0.4
pg p=21,47.66,23.57,52.11,18.43,52.11 f=c
c cx=3 cy=75 r=2.3 f=c
l x1=21 y1=68 x2=21 y2=62.6 s=c sw=0.6
pg p=21,61.4,19.8,63.48,22.2,63.48 f=c
l x1=25.4 y1=63.4 x2=28.6 y2=66.6 s=c sw=0.8
l x1=25.4 y1=66.6 x2=28.6 y2=63.4 s=c sw=0.8`,
'Ratchet': `-1 -1 62 62
r x=1.5 y=1.4 w=3 h=7.2 f=c
r x=7.5 y=1.4 w=3 h=7.2 f=c
r x=13.5 y=1.4 w=3 h=7.2 f=c
r x=19.5 y=1.4 w=3 h=7.2 f=c
r x=25.5 y=1.4 w=3 h=7.2 f=c
r x=1.5 y=11.4 w=3 h=7.2 f=c
r x=7.5 y=11.4 w=3 h=7.2 f=c
r x=13.5 y=11.4 w=3 h=7.2 f=c
r x=19.5 y=11.4 w=3 h=7.2 f=c
l x1=45 y1=12.6 x2=45 y2=18 s=c sw=0.6
pg p=45,11.4,46.2,13.48,43.8,13.48 f=c
l x1=55 y1=13 x2=59 y2=17 s=c sw=0.8
l x1=55 y1=17 x2=59 y2=13 s=c sw=0.8
r x=1.5 y=21.4 w=3 h=7.2 f=c
r x=7.5 y=21.4 w=3 h=7.2 f=c
r x=13.5 y=21.4 w=3 h=7.2 f=c
r x=1.5 y=31.4 w=3 h=7.2 f=c
r x=7.5 y=31.4 w=3 h=7.2 f=c
r x=1.5 y=41.4 w=3 h=7.2 f=c
l x1=0 y1=54.1 x2=6 y2=54.1 s=c sw=0.6
l x1=0 y1=55.9 x2=6 y2=55.9 s=c sw=0.6
l x1=6 y1=54.1 x2=12 y2=54.1 s=c sw=0.6
l x1=6 y1=55.9 x2=12 y2=55.9 s=c sw=0.6
l x1=12 y1=54.1 x2=18 y2=54.1 s=c sw=0.6
l x1=12 y1=55.9 x2=18 y2=55.9 s=c sw=0.6
l x1=18 y1=54.1 x2=24 y2=54.1 s=c sw=0.6
l x1=18 y1=55.9 x2=24 y2=55.9 s=c sw=0.6
l x1=24 y1=54.1 x2=30 y2=54.1 s=c sw=0.6
l x1=24 y1=55.9 x2=30 y2=55.9 s=c sw=0.6`,
'Rehearse': `-1 -1 44 52
ph d=M6.00,5.00 Q3.00,5.00 3.00,10.00 f=none s=c sw=0.6
l x1=6 y1=5 x2=12 y2=5 s=c sw=0.6 da=1,1
l x1=12 y1=5 x2=18 y2=5 s=c sw=0.6 da=1,1
l x1=18 y1=5 x2=24 y2=5 s=c sw=0.6 da=1,1
l x1=24 y1=5 x2=30 y2=5 s=c sw=0.6 da=1,1
l x1=30 y1=5 x2=36 y2=5 s=c sw=0.6 da=1,1
ph d=M36.00,5.00 Q39.00,5.00 39.00,10.00 f=none s=c sw=0.6
l x1=3 y1=10 x2=3 y2=20 s=c sw=0.6 da=1.2,1.3
r x=12.9 y=12.9 w=4.2 h=4.2 f=c
r x=18.9 y=12.9 w=4.2 h=4.2 f=c
r x=24.9 y=12.9 w=4.2 h=4.2 f=c
l x1=39 y1=10 x2=39 y2=20 s=c sw=0.6 da=1.2,1.3
ph d=M3.00,20.00 Q3.00,25.00 6.00,25.00 f=none s=c sw=0.6
l x1=6 y1=25 x2=12 y2=25 s=c sw=0.6 da=1,1
l x1=12 y1=25 x2=18 y2=25 s=c sw=0.6 da=1,1
l x1=18 y1=25 x2=24 y2=25 s=c sw=0.6 da=1,1
l x1=24 y1=25 x2=30 y2=25 s=c sw=0.6 da=1,1
l x1=30 y1=25 x2=36 y2=25 s=c sw=0.6 da=1,1
ph d=M39.00,20.00 Q39.00,25.00 36.00,25.00 f=none s=c sw=0.6
l x1=21 y1=32 x2=21 y2=37.4 s=c sw=0.6
pg p=21,38.6,19.8,36.52,22.2,36.52 f=c
r x=12.9 y=42.9 w=4.2 h=4.2 f=c
r x=18.9 y=42.9 w=4.2 h=4.2 f=c
r x=24.9 y=42.9 w=4.2 h=4.2 f=c`,
'Deprive': `-1 -1 44 72
c cx=3 cy=5 r=2.3 f=c
c cx=15 cy=5 r=2.3 f=c
c cx=27 cy=5 r=2.3 f=c
c cx=39 cy=5 r=2.3 f=c
pg p=3,13,0.7,17,5.3,17 f=c
pg p=15,13,12.7,17,17.3,17 f=c
pg p=27,13,24.7,17,29.3,17 f=c
pg p=39,13,36.7,17,41.3,17 f=c
r x=0.9 y=22.9 w=4.2 h=4.2 f=c
r x=12.9 y=22.9 w=4.2 h=4.2 f=c
r x=24.9 y=22.9 w=4.2 h=4.2 f=c
r x=36.9 y=22.9 w=4.2 h=4.2 f=c
l x1=21 y1=32 x2=21 y2=37.4 s=c sw=0.6
pg p=21,38.6,19.8,36.52,22.2,36.52 f=c
c cx=3 cy=45 r=2.3 f=c
c cx=15 cy=45 r=2.3 f=c
c cx=27 cy=45 r=2.3 f=c
c cx=39 cy=45 r=2.3 f=c
r x=0.9 y=62.9 w=4.2 h=4.2 f=c
r x=12.9 y=62.9 w=4.2 h=4.2 f=c
r x=24.9 y=62.9 w=4.2 h=4.2 f=c
r x=36.9 y=62.9 w=4.2 h=4.2 f=c`,
'Conceal': `-1 -1 44 32
c cx=3 cy=5 r=2.3 f=c
pg p=15,3,12.7,7,17.3,7 f=c
r x=24.9 y=2.9 w=4.2 h=4.2 f=c
l x1=15 y1=12 x2=15 y2=17.4 s=c sw=0.6
pg p=15,18.6,13.8,16.52,16.2,16.52 f=c
c cx=3 cy=25 r=2.3 f=c
r x=11.97 y=19.97 w=18.06 h=10.06 f=c fo=1
r x=36.9 y=22.9 w=4.2 h=4.2 f=c`,
'Freeze The Joint': `-1 -1 44 72
pg p=3,3,0.7,7,5.3,7 f=c
c cx=15 cy=5 r=2.3 f=c
r x=24.9 y=2.9 w=4.2 h=4.2 f=c
pg p=39,2.4,41.6,5,39,7.6,36.4,5 f=c
l x1=6 y1=10 x2=12 y2=20 s=c sw=0.6
l x1=30 y1=20 x2=36 y2=10 s=c sw=0.6
l x1=12 y1=20 x2=18 y2=30 s=c sw=0.6
l x1=24 y1=30 x2=30 y2=20 s=c sw=0.6
r x=18.8 y=32.8 w=4.4 h=4.4 f=none s=c sw=0.6
r x=19.8 y=33.8 w=2.4 h=2.4 f=c
l x1=12 y1=50 x2=18 y2=40 s=c sw=0.6
l x1=24 y1=40 x2=30 y2=50 s=c sw=0.6
l x1=6 y1=60 x2=12 y2=50 s=c sw=0.6
l x1=30 y1=50 x2=36 y2=60 s=c sw=0.6
pg p=3,62.4,5.6,65,3,67.6,0.4,65 f=c
c cx=15 cy=65 r=2 f=none s=c sw=0.6
r x=25 y=63 w=4 h=4 f=none s=c sw=0.6
pg p=39,63,36.7,67,41.3,67 f=c`,
'Exaggerate': `-1 -1 44 82
r x=7.11 y=3.11 w=3.78 h=3.78 f=c
pg p=24,2.4,26.86,7.34,21.14,7.34 f=c
c cx=39 cy=5 r=1.61 f=c
r x=7.11 y=26.11 w=3.78 h=3.78 f=c
pg p=24,23.84,28.58,31.74,19.42,31.74 f=c
c cx=39 cy=28 r=1.61 f=c
r x=7.11 y=53.11 w=3.78 h=3.78 f=c
pg p=24,49.02,30.58,60.38,17.42,60.38 f=c
c cx=39 cy=55 r=1.61 f=c
l x1=24 y1=13.5 x2=24 y2=18.9 s=c sw=0.6
pg p=24,20.1,22.8,18.02,25.2,18.02 f=c
l x1=24 y1=38 x2=24 y2=43.4 s=c sw=0.6
pg p=24,44.6,22.8,42.52,25.2,42.52 f=c
l x1=0 y1=69.1 x2=42 y2=69.1 s=c sw=0.6
l x1=0 y1=70.9 x2=42 y2=70.9 s=c sw=0.6`,
'Run On Leftovers': `-1 -1 38 52
py p=5.7,1,3.3,1,3.3,9,5.7,9 f=none s=c sw=0.6
c cx=9 cy=5 r=2.3 f=c
py p=12.3,1,14.7,1,14.7,9,12.3,9 f=none s=c sw=0.6
l x1=18 y1=5 x2=22.4 y2=5 s=c sw=0.6
pg p=24,5,21.92,6.2,21.92,3.8 f=c
r x=24.9 y=2.9 w=4.2 h=4.2 f=c
l x1=9 y1=12 x2=9 y2=17.4 s=c sw=0.6
pg p=9,18.6,7.8,16.52,10.2,16.52 f=c
c cx=9 cy=25 r=0.75 f=c
c cx=21 cy=25 r=0.75 f=c
c cx=33 cy=25 r=0.75 f=c
l x1=9 y1=32 x2=9 y2=37.4 s=c sw=0.6
pg p=9,38.6,7.8,36.52,10.2,36.52 f=c
py p=5.7,41,3.3,41,3.3,49,5.7,49 f=none s=c sw=0.6
c cx=9 cy=45 r=2 f=none s=c sw=0.6
py p=12.3,41,14.7,41,14.7,49,12.3,49 f=none s=c sw=0.6
l x1=18 y1=45 x2=22.4 y2=45 s=c sw=0.6
pg p=24,45,21.92,46.2,21.92,43.8 f=c
pg p=27,43,24.7,47,29.3,47 f=c`,
};
// Saturate and Dissolve And Rebuild repeat a few motifs, so they are built in code.
(function () {
  const L = [];
  const frame = (x0, x1, y0, y1, step, out) => {
    for (let x = x0; x <= x1; x += step) { out.push(`r x=${x - 0.3} y=${y0 - 0.3} w=0.6 h=0.6 f=c`, `r x=${x - 0.3} y=${y1 - 0.3} w=0.6 h=0.6 f=c`); }
    out.push(`l x1=${x0} y1=${y0} x2=${x1} y2=${y0} s=c sw=0.6`, `l x1=${x0} y1=${y1} x2=${x1} y2=${y1} s=c sw=0.6`, `l x1=${x0} y1=${y0} x2=${x0} y2=${y1} s=c sw=0.6`, `l x1=${x1} y1=${y0} x2=${x1} y2=${y1} s=c sw=0.6`);
    for (let y = y0 + 10; y < y1; y += 10) out.push(`r x=${x0 - 0.3} y=${y - 0.3} w=0.6 h=0.6 f=c`, `r x=${x1 - 0.3} y=${y - 0.3} w=0.6 h=0.6 f=c`);
  };
  const quad = (cx, cy, out) => { for (const [dx, dy] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) out.push(`c cx=${(cx + dx).toFixed(1)} cy=${(cy + dy).toFixed(1)} r=0.7 f=c`); };
  const sat = ['-1 -1 56 52']; frame(3, 39, 5, 35, 6, sat);
  for (const y of [15, 25]) for (const x of [9, 15, 21, 27, 33]) quad(x, y, sat);
  for (const x of [45, 51]) quad(x, 35, sat);
  for (const x of [39, 45, 51]) quad(x, 45, sat);
  GLYPH_SRC['Saturate'] = sat.join('\n');
  const dis = ['-1 -1 32 92']; frame(3, 27, 5, 25, 6, dis);
  for (const x of [6.9, 12.9, 18.9]) dis.push(`r x=${x} y=12.9 w=4.2 h=4.2 f=c`);
  dis.push('l x1=15 y1=32 x2=15 y2=37.4 s=c sw=0.6', 'pg p=15,38.6,13.8,36.52,16.2,36.52 f=c');
  for (const [cx, up] of [[3, 1], [9, 0], [15, 1], [21, 0]]) { const p = up ? [[0, 43.6], [-1.4, 46.2], [1.4, 46.2]] : [[0, 46.4], [-1.4, 43.8], [1.4, 43.8]]; for (const [dx, y] of p) dis.push(`c cx=${cx + dx} cy=${y} r=0.7 f=c`); }
  dis.push('l x1=15 y1=52 x2=15 y2=57.4 s=c sw=0.6', 'pg p=15,58.6,13.8,56.52,16.2,56.52 f=c');
  for (const [cx, cy] of [[15, 65], [9, 75], [21, 75], [3, 85], [15, 85], [27, 85]]) dis.push(`c cx=${cx} cy=${cy} r=0.75 f=c`);
  GLYPH_SRC['Dissolve And Rebuild'] = dis.join('\n');
})();
const GLYPH_TAG = { r: 'rect', c: 'circle', l: 'line', pg: 'polygon', py: 'polyline', ph: 'path' };
const GLYPH_ATTR = { w: 'width', h: 'height', f: 'fill', s: 'stroke', sw: 'stroke-width', fo: 'fill-opacity', da: 'stroke-dasharray', p: 'points' };
// k thickens the strokes when the glyph is drawn small
function glyphSVG(op, cls, k) {
  const src = GLYPH_SRC[op]; if (!src) return '';
  const [vb, ...rows] = src.split('\n');
  const body = rows.map(row => {
    const toks = row.split(' '), tag = GLYPH_TAG[toks.shift()], attrs = [];
    for (const t of toks) { if (t.includes('=')) attrs.push(t.split('=')); else attrs[attrs.length - 1][1] += ' ' + t; }
    return `<${tag} ${attrs.map(([a, v]) => `${GLYPH_ATTR[a] || a}="${v === 'c' ? 'currentColor' : a === 'sw' && k ? +v * k : v}"`).join(' ')}/>`;
  }).join('');
  return `<svg class="${cls || 'glyph'}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
}
