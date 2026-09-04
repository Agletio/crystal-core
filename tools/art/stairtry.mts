/** FOUR WAYS DOWN, asked as the real thing so the sample is honest: a
 *  `create_map_object` at the prop's own size and view. Nothing is imported —
 *  the pictures are written out to be LOOKED at and one of them picked. */
import { writeFileSync } from 'node:fs';
import { callTool, download, urlsIn } from './mcp.mts';

const RIM = 'A narrow rim of broken uneven pale grey rock round the opening, a thin band of shadow just inside it. Pale warm grey stone #8E8279 on the rim, #5A5249 in its shadow, #14120F in the dark below. Worn, chipped, dusty, ancient. NOT bright, NOT colourful, NOT green, NOT blue.';
const HOLE = 'A SQUARE opening cut straight down into a pale stone cave floor, seen from DIRECTLY ABOVE looking straight down: the opening is a ragged-edged square of NEAR-BLACK and the dark of it fills most of the frame.';
const NOT = 'NOT a spiral, NOT a wheel, NOT spokes, NOT a turbine, NOT a gear, NOT a well, NOT round, NOT a circle, NOT a funnel, NOT a barrel.';

const TRIES = [
  ['cut', `${HOLE} Along ONE side of the opening a run of FIVE flat rectangular slabs of the same pale stone descends into the dark, each slab set a little lower and a little darker than the one above it, the lowest almost lost in black; they are plain worn blocks with chipped edges, no rail and nothing else inside the dark. ${RIM} ${NOT}`],
  ['rope', `${HOLE} Over ONE edge of the opening a ROPE LADDER hangs down into the dark — two pale frayed ropes with short dark wooden planks between them, the top three planks lit and the rest swallowed by black — and a loose coil of the same rope lies on the stone beside the lip. ${RIM} ${NOT} NOT a net, NOT a web.`],
  ['fallen', `${HOLE} The stone floor has COLLAPSED inward on one side: a slope of broken rubble — angular pale grey rock, slabs and gravel of every size, tumbled and uneven — spills down from the lip into the black, a rough natural way down. ${RIM} ${NOT} NOT tidy, NOT stacked, NOT a wall.`],
  ['ramp', `${HOLE} Along ONE side a smooth worn RAMP of the same pale stone runs down into the dark, a plain sloping tongue of rock, lighter where it meets the floor and fading to near-black as it goes under; a low kerb of broken stone edges it. ${RIM} ${NOT} NOT steps, NOT treads.`],
] as const;

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

for (const [name, say] of TRIES) {
  const out = await callTool('create_map_object', {
    description: say, width: 128, height: 128,
    view: 'high top-down', outline: 'single color outline',
    shading: 'medium shading', detail: 'high detail',
  });
  const id = /([0-9a-f-]{36})/.exec(out)?.[1];
  console.log(`${name}: ${id ?? out.slice(0, 120)}`);
  if (!id) continue;
  let png: Buffer | null = null;
  for (let go = 0; go < 30 && !png; go++) {
    if (go > 0) await wait(10_000);
    const text = await callTool('get_map_object', { object_id: id });
    const url = urlsIn(text).find((u) => /\.png/.test(u));
    if (url) png = await download(url).catch(() => null);
  }
  if (png) {
    writeFileSync(`${process.argv[2]}/${name}.png`, png);
    console.log(`  wrote ${name}.png`);
  } else console.log(`  ${name}: never arrived`);
}
