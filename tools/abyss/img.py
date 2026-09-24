"""THE ABYSS'S IMAGE STEPS, called by pack.mts and tex.mts with files on disk.

  resize  <in> <out> <px> [quality] [png]   longest side to px, JPEG unless png
  glow    <in> <out> <px> <hue>             an emissive map: only what is PAINTED as light
  same    <a> <b>                           mean difference at 64px, 0 identical, 1 opposite
  seamless <in> <out> <px>                  offset-and-blend so the edges meet
  normal  <in> <out> <px> <strength>        a tangent-space normal map off the height the albedo implies
  rough   <in> <out> <px> <base> <spread>   a roughness map: darker crevices rougher
  alpha   <in> <out> <px> <mode>            a decal: black background out, colour kept
  unwhite <in> <out> <px>                   a white backdrop flooded to black from the corners
  icon    <in> <out> <px> <l,t,r,b|none>    a HUD icon, cropped to a share of the source

A GLOW is a hue window over bright, saturated pixels — runes, magma, coals —
because the albedo already paints exactly where the light comes from.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFile, ImageFilter

ImageFile.MAXBLOCK = 1 << 25  # optimize=True on a large JPEG overflows the default buffer

HUES = {  # hue centre in degrees, half-width, least saturation, least value, least lift over its surround
    'cyan': (190, 32, 0.35, 0.55, 0),
    'magma': (12, 22, 0.5, 0.42, -1),
    'ember': (14, 24, 0.5, 0.26, -1),
    'coal': (14, 26, 0.45, 0.5, 0),
}


def load(p):
    return Image.open(p).convert('RGB')


def fit(im, px):
    w, h = im.size
    s = px / max(w, h)
    return im if s >= 1 else im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)


def save(im, out, quality=86, png=False):
    if png:
        im.save(out, 'PNG', optimize=True)
    else:
        im.save(out, 'JPEG', quality=quality, subsampling=0 if quality >= 90 else 2, optimize=True)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def glow(src, out, px, hue):
    im = fit(load(src), px)
    a = np.asarray(im).astype(np.float32) / 255
    mx, mn = a.max(axis=2), a.min(axis=2)
    v, s = mx, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    centre, half, s0, v0, lift = HUES[hue]
    dh = np.abs(((h - centre + 180) % 360) - 180)
    mask = smooth(half, half * 0.45, dh) * smooth(s0, s0 + 0.2, s) * smooth(v0, v0 + 0.25, v)
    if lift < 0:  # DE-LIT MAGMA: the veins went dim with the bake, so it is the warm light-red skin that smoulders
        mask = smooth(0.30, 0.56, r) * smooth(0.10, 0.26, r - np.maximum(g * 0.6, b))
    elif lift:  # a vein on skin the same red: what makes it LIGHT is being brighter than round it
        grey = Image.fromarray((v * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, im.width // 160)))
        mask *= smooth(lift, lift * 2.2, v - np.asarray(grey).astype(np.float32) / 255)
    lit = a * mask[..., None]
    img = Image.fromarray((np.clip(lit, 0, 1) * 255).astype(np.uint8))
    img = Image.blend(img, img.filter(ImageFilter.GaussianBlur(1.2)), 0.35)
    save(img, out, 88)
    print(f'glow {hue}: {float(mask.mean()) * 100:.2f}% of the texture')


def unwhite(src, out, px):
    im = fit(load(src), px)
    for corner in [(0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)]:
        ImageDraw.floodfill(im, corner, (0, 0, 0), thresh=42)
    save(im, out, 90)


def icon(src, out, px, crop):
    im = load(src)
    if crop != 'none':
        l, t, r, b = [float(v) for v in crop.split(',')]
        im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
    save(im.resize((px, px), Image.LANCZOS), out, 90)


def same(pa, pb):
    a = np.asarray(load(pa).resize((64, 64), Image.BILINEAR)).astype(np.float32) / 255
    b = np.asarray(load(pb).resize((64, 64), Image.BILINEAR)).astype(np.float32) / 255
    print(f'{float(np.abs(a - b).mean()):.4f}')


def seamless(src, out, px):
    im = load(src).resize((px, px), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    shifted = np.roll(np.roll(a, px // 2, axis=0), px // 2, axis=1)
    y, x = np.mgrid[0:px, 0:px].astype(np.float32) / (px - 1)
    edge = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y))  # 0 at the border, 0.5 in the middle
    w = smooth(0.0, 0.22, edge)[..., None]  # the original in the middle, the shifted copy at the seams
    blended = a * w + shifted * (1 - w)
    save(Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8)), out, 92)


def height_of(im):
    a = np.asarray(im.convert('L')).astype(np.float32) / 255
    broad = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    return np.clip(a * 0.55 + broad * 0.45, 0, 1)


def normal(src, out, px, strength):
    im = load(src).resize((px, px), Image.LANCZOS)
    hgt = height_of(im)
    dx = (np.roll(hgt, -1, axis=1) - np.roll(hgt, 1, axis=1)) * strength
    dy = (np.roll(hgt, -1, axis=0) - np.roll(hgt, 1, axis=0)) * strength
    n = np.dstack([-dx, dy, np.ones_like(hgt)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    save(Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)), out, 86)


def rough(src, out, px, base, spread):
    im = load(src).resize((px, px), Image.LANCZOS)
    hgt = height_of(im)
    r = np.clip(base + (0.5 - hgt) * spread, 0.05, 1)
    g = (r * 255).astype(np.uint8)
    rgb = np.dstack([np.zeros_like(g), g, np.zeros_like(g)])  # glTF: roughness in G, metalness in B
    save(Image.fromarray(rgb), out, 90)


def alpha(src, out, px, mode):
    im = fit(load(src), px)
    a = np.asarray(im).astype(np.float32) / 255
    if mode != 'red':  # light on black: drawn ADDITIVE, so black already means nothing
        save(Image.fromarray((a * smooth(0.06, 0.4, a.max(axis=2))[..., None] * 255).astype(np.uint8)), out, 88)
        return
    k = smooth(0.06, 0.22, a[..., 0] - np.maximum(a[..., 1], a[..., 2]))  # what is redder than it is grey
    rgba = np.dstack([a, k]) * 255
    Image.fromarray(rgba.astype(np.uint8), 'RGBA').save(out, 'PNG', optimize=True)


if __name__ == '__main__':
    verb, *args = sys.argv[1:]
    if verb == 'resize':
        save(fit(load(args[0]), int(args[2])), args[1], int(args[3]) if len(args) > 3 else 86, len(args) > 4 and args[4] == 'png')
    elif verb == 'glow':
        glow(args[0], args[1], int(args[2]), args[3])
    elif verb == 'same':
        same(args[0], args[1])
    elif verb == 'seamless':
        seamless(args[0], args[1], int(args[2]))
    elif verb == 'normal':
        normal(args[0], args[1], int(args[2]), float(args[3]))
    elif verb == 'rough':
        rough(args[0], args[1], int(args[2]), float(args[3]), float(args[4]))
    elif verb == 'unwhite':
        unwhite(args[0], args[1], int(args[2]))
    elif verb == 'icon':
        icon(args[0], args[1], int(args[2]), args[3])
    elif verb == 'alpha':
        alpha(args[0], args[1], int(args[2]), args[3])
    else:
        sys.exit(f'img.py: no verb {verb}')
