# Puts two runs of the example box side by side (without and with one ampoule) as an animated GIF, plus a still.
# Needs Pillow. Usage: python3 scripts/example-pair.py <frames-a> <frames-b> <out.gif> <out-still.png> <light|dark> <label-a> <label-b>
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

fa, fb, out_gif, out_still, scheme, la, lb = sys.argv[1:8]
weeks = json.load(open(os.path.join(fa, 'weeks.json')))
ink, paper, muted = ((17, 17, 17), (255, 255, 255), (86, 86, 86)) if scheme == 'light' else ((236, 236, 236), (17, 17, 17), (170, 170, 170))
font = None
for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc']:
    if os.path.exists(f):
        font = ImageFont.truetype(f, 11); break
font = font or ImageFont.load_default()

frames = []
for i, wk in enumerate(weeks):
    a = Image.open(os.path.join(fa, f'f{i:03d}.png')).convert('RGB')
    b = Image.open(os.path.join(fb, f'f{i:03d}.png')).convert('RGB')
    gap, top, bot = 12, 20, 22
    im = Image.new('RGB', (a.width * 2 + gap, a.height + top + bot), paper)
    im.paste(a, (0, top)); im.paste(b, (a.width + gap, top))
    d = ImageDraw.Draw(im)
    d.text((0, 3), la, font=font, fill=ink)
    d.text((a.width + gap, 3), lb, font=font, fill=ink)
    yr = f'year {wk / 52.18:.0f}'
    x0, y0, x1, y1 = d.textbbox((0, 0), yr, font=font)
    d.text(((im.width - (x1 - x0)) // 2, im.height - bot + 5), yr, font=font, fill=muted)
    frames.append(im)

pal = [f.convert('P', palette=Image.ADAPTIVE, colors=128, dither=Image.NONE) for f in frames]
durations = [140] * (len(pal) - 1) + [2200]
pal[0].save(out_gif, save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True, disposal=1)
frames[-1].save(out_still, optimize=True)
print(out_gif, os.path.getsize(out_gif) // 1024, 'KB;', out_still, os.path.getsize(out_still) // 1024, 'KB')
