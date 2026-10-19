# Turns frames from scripts/example-frames.js into an animated GIF with a year counter, plus a still.
# Needs Pillow. Usage: python3 scripts/example-gif.py <frames-dir> <out.gif> <out-still.png> [light|dark] [caption]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src, out_gif, out_still = sys.argv[1:4]
scheme = sys.argv[4] if len(sys.argv) > 4 else 'light'
caption = sys.argv[5] if len(sys.argv) > 5 else ''
weeks = json.load(open(os.path.join(src, 'weeks.json')))
ink, paper = ((17, 17, 17), (255, 255, 255)) if scheme == 'light' else ((236, 236, 236), (17, 17, 17))
font = None
for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc']:
    if os.path.exists(f):
        font = ImageFont.truetype(f, 12); break
font = font or ImageFont.load_default()

frames = []
for i, wk in enumerate(weeks):
    im = Image.open(os.path.join(src, f'f{i:03d}.png')).convert('RGB')
    d = ImageDraw.Draw(im)
    label = f'year {wk / 52.18:.0f}' + (f'  {caption}' if caption else '')
    x0, y0, x1, y1 = d.textbbox((0, 0), label, font=font)
    w, h = x1 - x0, y1 - y0
    bx, by = 8, im.height - h - 14
    d.rectangle([bx - 4, by - 4, bx + w + 4, by + h + 5], fill=paper)
    d.text((bx - x0, by - y0), label, font=font, fill=ink)
    frames.append(im)

pal = [f.convert('P', palette=Image.ADAPTIVE, colors=128, dither=Image.NONE) for f in frames]
durations = [140] * (len(pal) - 1) + [2200]
pal[0].save(out_gif, save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True, disposal=1)
frames[-1].save(out_still, optimize=True)
print(out_gif, os.path.getsize(out_gif) // 1024, 'KB;', out_still, os.path.getsize(out_still) // 1024, 'KB')
