import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const [src, out, x, y, w, h, scale = 4] = process.argv.slice(2);
const data = (await readFile(src)).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(async ({ data, x, y, w, h, scale }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const ink = c.getContext('2d'); ink.imageSmoothingEnabled = false;
  ink.drawImage(img, x, y, w, h, 0, 0, w * scale, h * scale);
  return c.toDataURL('image/png').split(',')[1];
}, { data, x: +x, y: +y, w: +w, h: +h, scale: +scale });
await writeFile(out, Buffer.from(png, 'base64'));
await browser.close();
