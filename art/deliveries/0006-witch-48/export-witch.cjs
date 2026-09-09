const fs = require('fs');
const path = require('path');
const sharp = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/sharp');
const {spawnSync} = require('child_process');
const out = process.argv[2] || __dirname;
const source = path.join(out,'source','witch-isolated.png');
const floorSource = path.join(out,'source','game-floor-reference.png');
async function run() {
  fs.mkdirSync(out, {recursive:true});
  let {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let bbox = [info.width,info.height,0,0];
  for (let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    let i=(y*info.width+x)*4;
    data[i+3] = data[i+3]>=128 ? 255:0;
    if(data[i+3]) {bbox[0]=Math.min(bbox[0],x);bbox[1]=Math.min(bbox[1],y);bbox[2]=Math.max(bbox[2],x);bbox[3]=Math.max(bbox[3],y);}
    else data.fill(0,i,i+4);
  }
  const crop={left:bbox[0],top:bbox[1],width:bbox[2]-bbox[0]+1,height:bbox[3]-bbox[1]+1};
  const width=Math.round(crop.width*40/crop.height), height=40;
  const left=Math.floor((48-width)/2), top=4;
  const small=await sharp(data,{raw:info}).extract(crop).resize(width,height,{kernel:'nearest'}).extend({left,right:48-width-left,top,bottom:48-height-top,background:{r:0,g:0,b:0,alpha:0}}).png({palette:true,colours:25,dither:0,effort:10}).toBuffer();
  let q=await sharp(small).ensureAlpha().raw().toBuffer();
  for(let i=3;i<q.length;i+=4)q[i]=q[i]>=128?255:0;
  const positions=[];const packed=[];
  for(let i=0;i<q.length;i+=4)if(q[i+3]){positions.push(i);packed.push(q[i],q[i+1],q[i+2]);}
  const inkStrip=await sharp(Buffer.from(packed),{raw:{width:positions.length,height:1,channels:3}}).png().toBuffer();
  const quant=spawnSync('convert',['png:-','+dither','-colors','24','png24:-'],{input:inkStrip,maxBuffer:1024*1024});
  if(quant.status!==0)throw new Error(quant.stderr.toString());
  const ink24=await sharp(quant.stdout).removeAlpha().raw().toBuffer();
  positions.forEach((i,j)=>{q[i]=ink24[j*3];q[i+1]=ink24[j*3+1];q[i+2]=ink24[j*3+2];});
  const write=(name,buf,w=48,h=48)=>sharp(buf,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(out,name));
  await write('witch-cast-composite-48.png',q);
  const body=Buffer.from(q),vfx=Buffer.from(q);
  // Cut detached spell from body; preserve a common canvas, palette and origin.
  const splitX=left+Math.ceil((950-crop.left)*width/crop.width);
  for(let y=0;y<48;y++)for(let x=0;x<48;x++) {
    let i=(y*48+x)*4;
    (x>=splitX?body:vfx).fill(0,i,i+4);
  }
  await write('witch-body-48.png',body);
  await write('witch-spell-48.png',vfx);
  const small27=await sharp(q,{raw:{width:48,height:48,channels:4}}).resize(27,27,{kernel:'nearest'}).raw().toBuffer();
  await write('witch-cast-composite-27.png',small27,27,27);
  const luma=p=>.2126*p[0]+.7152*p[1]+.0722*p[2];
  function stats(buf,w,h) {
    let colors=new Set(),ls=[],xs=[],ys=[],alphas=new Set();
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {let i=(y*w+x)*4;alphas.add(buf[i+3]);if(!buf[i+3])continue;colors.add(buf.slice(i,i+3).toString('hex'));ls.push(luma(buf.slice(i,i+3)));xs.push(x);ys.push(y);}
    ls.sort((a,b)=>a-b);
    let interior=[];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++) {let i=(y*w+x)*4;if([i,i-4,i+4,i-w*4,i+w*4].every(j=>buf[j+3]))interior.push(luma(buf.slice(i,i+3)));}
    interior.sort((a,b)=>a-b);
    return {canvas:[w,h],opaquePixels:ls.length,opaqueColors:colors.size,alphaValues:[...alphas].sort((a,b)=>a-b),inkBounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],medianLuma:ls[Math.floor(ls.length/2)],interiorMedianLuma:interior[Math.floor(interior.length/2)],minLuma:ls[0],maxLuma:ls.at(-1)};
  }
  const metrics={source,sourceCrop:crop,sourceBodySpellSplitX:950,exportBodySpellSplitX:splitX,conversion:'alpha >=128; uniform fit to 40 px ink height; nearest-neighbor; shared palette of at most 24 opaque colors; no dithering',composite:stats(q,48,48),body:stats(body,48,48),display27:stats(small27,27,27)};
  fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(metrics,null,2)+'\n');
  // Use a character-free patch of the supplied game-floor screenshot, resized
  // once to undo the screenshot enlargement. It is a context swatch, not a live render.
  const floor=await sharp(floorSource).extract({left:1510,top:290,width:480,height:360}).resize(120,90,{kernel:'nearest'}).png().toBuffer();
  const floor48=await sharp(floor).composite([{input:await sharp(q,{raw:{width:48,height:48,channels:4}}).png().toBuffer(),left:36,top:21}]).png().toBuffer();
  const floor27=await sharp(floor).composite([{input:await sharp(small27,{raw:{width:27,height:27,channels:4}}).png().toBuffer(),left:46,top:31}]).png().toBuffer();
  // Build an exact comparison sheet using only exported pixels and source floor.
  const layers=[];
  const add=async(buf,left,top,scale=1)=>layers.push({input:scale===1?buf:await sharp(buf).resize({width:(await sharp(buf).metadata()).width*scale,kernel:'nearest'}).png().toBuffer(),left,top});
  const svg=Buffer.from(`<svg width="1100" height="640"><rect width="1100" height="640" fill="#19191e"/><g fill="#eee8dc" font-family="DejaVu Sans, sans-serif"><text x="30" y="42" font-size="24">CRYSTAL CORE · Witch size test</text><text x="30" y="72" font-size="14" fill="#aaa6a0">Exact exported pixels. Floor sampled from your supplied screenshot; not a live game render.</text><text x="30" y="118" font-size="17">48 × 48 export · 8× enlargement</text><text x="468" y="118" font-size="17">27 × 27 display · 8× enlargement</text><text x="790" y="118" font-size="17">Actual pixel sizes</text><text x="790" y="154" font-size="14">48 × 48</text><text x="790" y="310" font-size="14">27 × 27</text><text x="30" y="580" font-size="16">40px figure height · ${metrics.body.opaqueColors} body colors · binary alpha · body median luma ${metrics.body.medianLuma.toFixed(1)}</text><text x="30" y="610" font-size="14" fill="#aaa6a0">Still-frame test only. Body and detached spell also supplied separately on aligned 48 × 48 canvases.</text></g></svg>`);
  layers.push({input:svg,left:0,top:0});
  const patch48=await sharp(floor48).extract({left:36,top:21,width:48,height:48}).png().toBuffer();
  const patch27=await sharp(floor27).extract({left:46,top:31,width:27,height:27}).png().toBuffer();
  await add(patch48,30,140,8);await add(patch27,468,140,8);await add(floor48,790,170);await add(floor27,790,326);
  await sharp({create:{width:1100,height:640,channels:4,background:'#19191e'}}).composite(layers).png().toFile(path.join(out,'witch-size-comparison.png'));
  console.log(JSON.stringify(metrics,null,2));
}
run().catch(e=>{console.error(e);process.exit(1)});
