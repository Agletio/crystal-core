// A minimal animated GIF writer: one global palette, LZW, looping. Enough to
// judge whether a run of frames reads as motion, which a sheet cannot show.
export interface GifFrame { indices: Uint8Array; delayCs: number }

function lzw(indices: Uint8Array, minCode: number): Uint8Array {
  const CLEAR = 1 << minCode, EOI = CLEAR + 1;
  const out: number[] = [];
  let bitBuf = 0, bitLen = 0;
  const emit = (code: number, size: number) => {
    bitBuf |= code << bitLen; bitLen += size;
    while (bitLen >= 8) { out.push(bitBuf & 255); bitBuf >>>= 8; bitLen -= 8; }
  };
  let dict = new Map<string, number>(), next = EOI + 1, size = minCode + 1;
  const reset = () => { dict = new Map(); next = EOI + 1; size = minCode + 1; };
  emit(CLEAR, size);
  let w = '';
  for (const k of indices) {
    const wk = w ? `${w},${k}` : `${k}`;
    if (w === '' || dict.has(wk)) { w = wk; continue; }
    emit(w.includes(',') ? dict.get(w)! : Number(w), size);
    if (next < 4096) { dict.set(wk, next++); if (next === 1 << size && size < 12) size++; }
    else { emit(CLEAR, size); reset(); }
    w = `${k}`;
  }
  if (w) emit(w.includes(',') ? dict.get(w)! : Number(w), size);
  emit(EOI, size);
  if (bitLen > 0) out.push(bitBuf & 255);
  return Uint8Array.from(out);
}

export function encodeGif(width: number, height: number, palette: number[][], frames: GifFrame[], transparent?: number): Uint8Array {
  const bytes: number[] = [];
  const u16 = (n: number) => { bytes.push(n & 255, (n >> 8) & 255); };
  const str = (s: string) => { for (const c of s) bytes.push(c.charCodeAt(0)); };
  str('GIF89a'); u16(width); u16(height);
  bytes.push(0xf7, 0, 0); // global table 256, 8 bits
  for (let i = 0; i < 256; i++) { const p = palette[i] ?? [0, 0, 0]; bytes.push(p[0], p[1], p[2]); }
  bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1); u16(0); bytes.push(0);
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, transparent === undefined ? 0x08 : 0x09, f.delayCs & 255, (f.delayCs >> 8) & 255, transparent ?? 0, 0);
    bytes.push(0x2c); u16(0); u16(0); u16(width); u16(height); bytes.push(0);
    bytes.push(8);
    const data = lzw(f.indices, 8);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); bytes.push(n); for (let j = 0; j < n; j++) bytes.push(data[i + j]); }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}
