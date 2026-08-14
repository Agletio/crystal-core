/** Magnifies the four sheets into one contact sheet. */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const names = ['pro_ragged', 'pro_sloped', 'round_enhanced', 'standard_deep'];
const data = {};
for (const n of names) data[n] = (await readFile(`tools/art/cache/zones/${n}.png`)).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(async ({ data, names, scale }) => {
  const imgs = {};
  for (const n of names) {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data[n];
    await img.decode();
    imgs[n] = img;
  }
  const w = Math.max(...names.map((n) => imgs[n].width));
  const h = Math.max(...names.map((n) => imgs[n].height));
  const pad = 12;
  const c = document.createElement('canvas');
  c.width = (w * scale + pad) * names.length + pad;
  c.height = h * scale + pad * 3;
  const ink = c.getContext('2d');
  ink.imageSmoothingEnabled = false;
  ink.fillStyle = '#101014';
  ink.fillRect(0, 0, c.width, c.height);
  ink.fillStyle = '#cfc7d8';
  ink.font = '14px monospace';
  names.forEach((n, i) => {
    const x = pad + i * (w * scale + pad);
    ink.fillText(`${n} ${imgs[n].width}x${imgs[n].height}`, x, 16);
    ink.drawImage(imgs[n], 0, 0, imgs[n].width, imgs[n].height, x, pad * 2, imgs[n].width * scale, imgs[n].height * scale);
  });
  return c.toDataURL('image/png').split(',')[1];
}, { data, names, scale: 3 });
await writeFile(process.argv[2] ?? '/tmp/sheets.png', Buffer.from(png, 'base64'));
await browser.close();
console.log('ok');
