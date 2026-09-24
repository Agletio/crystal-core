/**
 * EVERY MODEL AT ONCE, lit the way a dungeon lights it: one cell each, a warm
 * key, a cold rim, three-quarter view from above — the camera the game uses.
 *
 *   node tools/abyss/look.mjs out.png a.glb b.glb …      (CELL=<px> COLS=<n>)
 *
 * Judging a conversion means seeing it at the angle it will be seen at.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, extname, basename } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(new URL('../..', import.meta.url).pathname);
const three = join(root, 'node_modules', 'three');
const [out, ...files] = process.argv.slice(2);
const CELL = Number(process.env.CELL ?? 320);
const COLS = Number(process.env.COLS ?? Math.min(6, files.length));
const ROWS = Math.ceil(files.length / COLS);

const html = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
</head><body style="margin:0;background:#0b0b0e"><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const CELL=${CELL}, COLS=${COLS}, ROWS=${ROWS};
const FILES=${JSON.stringify(files.map((f, i) => ({ url: `/m${i}.glb`, name: basename(f, '.glb') })))};
const sheet=document.createElement('canvas'); sheet.width=CELL*COLS; sheet.height=CELL*ROWS;
const paper=sheet.getContext('2d'); paper.fillStyle='#0b0b0e'; paper.fillRect(0,0,sheet.width,sheet.height);
const canvas=document.createElement('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(CELL,CELL,false); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
const load=(u)=>new Promise((ok,no)=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(u,ok,undefined,no));
const POSE=${JSON.stringify(process.env.POSE ?? '')};
const facts=[];
(async()=>{ try {
 for(let i=0;i<FILES.length;i++){
  const g=await load(FILES[i].url);
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x16161b);
  scene.add(new THREE.HemisphereLight(0x8090b0,0x201810,0.6));
  const key=new THREE.DirectionalLight(0xffd8a8,2.6); key.position.set(-3,5,4); scene.add(key);
  const rim=new THREE.DirectionalLight(0x88aaff,1.8); rim.position.set(4,3,-5); scene.add(rim);
  const obj=g.scene; scene.add(obj);
  if(POSE&&g.animations.length){ const [name,at]=POSE.split('@'); const clip=g.animations.find(c=>c.name===name)||g.animations[0]; const mixer=new THREE.AnimationMixer(obj); mixer.clipAction(clip).play(); mixer.update(Number(at||0.5)*clip.duration); obj.updateMatrixWorld(true); }
  const box=new THREE.Box3().setFromObject(obj); const size=box.getSize(new THREE.Vector3()); const mid=box.getCenter(new THREE.Vector3());
  let tris=0; obj.traverse(o=>{ if(o.isMesh){ const ix=o.geometry.index; tris+=(ix?ix.count:o.geometry.attributes.position.count)/3; }});
  const span=Math.max(size.x,size.y,size.z);
  const cam=new THREE.PerspectiveCamera(30,1,0.01,100);
  const d=span*2.1; cam.position.set(mid.x+d*0.55,mid.y+d*0.62,mid.z+d*0.55); cam.lookAt(mid);
  renderer.render(scene,cam);
  const x=(i%COLS)*CELL, y=Math.floor(i/COLS)*CELL;
  paper.drawImage(canvas,x,y);
  paper.fillStyle='#e8d59a'; paper.font='14px sans-serif';
  paper.fillText(FILES[i].name+'  '+size.x.toFixed(2)+'x'+size.y.toFixed(2)+'x'+size.z.toFixed(2)+'m  '+Math.round(tris/1000)+'k tris',x+6,y+18);
  facts.push({name:FILES[i].name,size:[size.x,size.y,size.z],min:[box.min.x,box.min.y,box.min.z],tris:Math.round(tris),clips:g.animations.map(a=>a.name+':'+a.duration.toFixed(2))});
 }
 globalThis.__out={png:sheet.toDataURL('image/png'),facts};
} catch(e){ globalThis.__out={error:String(e&&e.stack||e)}; } })();
</script></body></html>`;

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    if (url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(html);
    const m = /^\/m(\d+)\.glb$/.exec(url);
    const p = m ? resolve(files[Number(m[1])]) : join(three, url.replace(/^\/three\//, ''));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': extname(p) === '.js' ? 'text/javascript' : 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!globalThis.__out, null, { timeout: 600000 });
const got = await page.evaluate(() => globalThis.__out);
await browser.close();
server.close();
if (got.error) {
  console.error(got.error);
  process.exit(1);
}
await writeFile(out, Buffer.from(got.png.split(',')[1], 'base64'));
for (const f of got.facts) console.log(JSON.stringify(f));
