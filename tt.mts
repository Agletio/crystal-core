import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './tools/art/png.mts';
const files = process.argv.slice(3);
const out = process.argv[2];
const zoom = 5;
const imgs = files.map((f) => decodePng(readFileSync(f)));
const w = Math.max(...imgs.map((i) => i.width));
const h = Math.max(...imgs.map((i) => i.height));
const across = w * imgs.length * zoom, down = h * zoom;
const px = new Uint8Array(across * down * 4);
for (let i = 0; i < across * down; i++) px.set([24, 22, 28, 255], i * 4);
imgs.forEach((img, n) => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const from = (y * img.width + x) * 4;
    if (img.rgba[from + 3] < 128) continue;
    for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
      const to = ((y * zoom + dy) * across + (n * w + x) * zoom + dx) * 4;
      for (let k = 0; k < 4; k++) px[to + k] = img.rgba[from + k];
    }
  }
});
writeFileSync(out, encodePng(across, down, px));
