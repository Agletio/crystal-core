/**
 * ONE MESH, MANY CLIPS — the step between what Meshy hands back and what a
 * body is in the game. Every animated GLB it returns carries the whole mesh
 * and its texture again, so five clips is five copies of one skeleton; this
 * keeps the FIRST file's scene, takes every other file's `AnimationClip`, and
 * writes one GLB carrying them all, named for the file each came from.
 *
 *   node tools/3d/clips.mjs <in.glb> [more.glb...] <out.glb>
 *
 * EVERY MAP COMES BACK AS JPEG, because GLTFExporter re-encodes as PNG and
 * that is strictly worse — measured on this pair, PNG 9.23 MB against JPEG
 * 1.99 MB off the same two 7.6 MB inputs. TEX=<px> additionally caps a map's
 * longest side, which took the same body to 1.24 MB at 1024 with nothing
 * visible lost at camera distance. The downloaded game wants neither; the
 * browser harness wants both.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, extname, basename } from 'node:path';
import { chromium } from 'playwright';

const root = '/home/user/crystal-core';
const three = join(root, 'node_modules', 'three');
const inputs = process.argv.slice(2, -1);
const out = process.argv[process.argv.length - 1];

const html = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const FILES=${JSON.stringify(inputs.map((f, i) => ({ url: `/in${i}.glb`, name: basename(f, '.glb') })))};
const load=(u)=>new Promise((ok,no)=>new GLTFLoader().load(u,ok,undefined,no));
(async()=>{
 try{
  let scene=null; const clips=[]; const names=[];
  for(const f of FILES){
    const g=await load(f.url);
    if(!scene) scene=g.scene;
    for(const c of g.animations){
      // name the clip for what it IS, so the page can ask for it by name
      const plain=f.name.replace(/^.*?-/,'');
      c.name=plain; clips.push(c); names.push(plain+':'+c.duration.toFixed(2)+'s');
    }
  }
  // JPEG always, TEX only when asked: see the header.
  const TEX=${Number(process.env.TEX ?? 0)} || Infinity;
  const seen=new Map();
  scene.traverse((o)=>{
    if(!o.isMesh&&!o.isSkinnedMesh) return;
    for(const m of [].concat(o.material)){
      if(!m) continue;
      for(const k of ['map','emissiveMap','normalMap','roughnessMap','metalnessMap']){
        const t=m[k]; if(!t||!t.image) continue;
        if(seen.has(t)){ m[k]=seen.get(t); continue; }
        const iw=t.image.width||TEX, ih=t.image.height||TEX;
        const sc=Math.min(1,TEX/Math.max(iw,ih));
        const c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(iw*sc)); c.height=Math.max(1,Math.round(ih*sc));
        const g2=c.getContext('2d'); g2.drawImage(t.image,0,0,c.width,c.height);
        const nt=new THREE.Texture(c);
        nt.flipY=t.flipY; nt.colorSpace=t.colorSpace; nt.wrapS=t.wrapS; nt.wrapT=t.wrapT;
        nt.userData.mimeType='image/jpeg';
        nt.needsUpdate=true;
        seen.set(t,nt); m[k]=nt;
      }
      m.needsUpdate=true;
    }
  });
  const exporter=new GLTFExporter();
  const bin=await exporter.parseAsync(scene,{binary:true,animations:clips});
  const bytes=new Uint8Array(bin);
  let str=''; for(let i=0;i<bytes.length;i+=0x8000) str+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
  globalThis.__m={ glb:btoa(str), clips:names };
 }catch(e){ globalThis.__m={error:String(e&&e.stack||e)}; }
})();
</script></body></html>`;

const server=createServer(async(req,res)=>{
  const url=(req.url??'/').split('?')[0];
  try{
    if(url==='/'){res.writeHead(200,{'content-type':'text/html'}).end(html);return;}
    const m=/^\/in(\d+)\.glb$/.exec(url);
    const p = m ? resolve(root, inputs[Number(m[1])]) : join(three, url.replace(/^\/three\//,''));
    res.writeHead(200,{'content-type': extname(p)==='.js'?'text/javascript':'application/octet-stream'});
    res.end(await readFile(p));
  }catch{res.writeHead(404).end();}
});
await new Promise(go=>server.listen(0,'127.0.0.1',go));
const browser=await chromium.launch();
const page=await browser.newPage();
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(()=>!!globalThis.__m,null,{timeout:180000}).catch(()=>{});
const got=await page.evaluate(()=>globalThis.__m??null);
if(!got||got.error){ console.error('merge failed:',got?.error??'no result'); await browser.close(); server.close(); process.exit(1); }
const buf=Buffer.from(got.glb,'base64');
await writeFile(join(root,out),buf);
console.log(`  ${inputs.length} files -> ${out}`);
console.log(`  clips: ${got.clips.join(', ')}`);
console.log(`  ${(buf.length/1048576).toFixed(2)} MB`);
await browser.close(); server.close();
