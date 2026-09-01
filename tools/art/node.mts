/**
 * THE GATHERING NODES: four objects and the same four worked out.
 *
 * Asked exactly the way a lock is — `create_1_direction_object` takes
 * `top-down` as a real enum where `create_image_pixflux` came back isometric
 * every time, and it returns a GRID of candidates in one job. Four families
 * with four candidates apiece is one ask rather than four.
 *
 * ONE PICTURE PER FAMILY, EVERY WORLD — worded to read in any of the four.
 * Per-world nodes are twenty-four objects and a decision nobody has asked for.
 *
 *   ask          — the sixteen
 *   get <id>     — poll, and write every candidate out
 *   pick <id> <indices>
 *   spent <id>   — the same four, worked out
 */
import { writeFileSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { encodePng } from './png.mts';
import { PROP_ART } from '../../src/render/generated-props.ts';

function styleImage(id: string): { base64: string; format: 'png' } {
  const art = PROP_ART[id];
  if (!art) throw new Error(`no prop ${id}`);
  if (art.grid > 85) throw new Error(`${id} is ${art.grid}px — over 85 it costs 12 candidates`);
  const n = art.grid;
  const rgba = new Uint8Array(n * n * 4);
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length && x < n; x++) {
      const hex = art.key[row[x]];
      if (!hex) continue;
      const at = (y * n + x) * 4;
      rgba[at] = parseInt(hex.slice(1, 3), 16);
      rgba[at + 1] = parseInt(hex.slice(3, 5), 16);
      rgba[at + 2] = parseInt(hex.slice(5, 7), 16);
      rgba[at + 3] = 255;
    }
  });
  return { base64: encodePng(n, n, rgba).toString('base64'), format: 'png' };
}

const STYLE = ['cairn', 'gore', 'geode_amber', 'cocoon'];

/** In capitals for the reason every prop's is: `view` does not carry it. It
 *  must read as UNWORKED, or the spent state has nothing to be the after of. */
const COMMON =
  'seen from DIRECTLY ABOVE looking straight down, filling most of the picture, ' +
  'standing alone on nothing. It is plainly UNTOUCHED and WHOLE — nothing has ' +
  'been taken out of it yet. Near-black shadows, cold desaturated colour, wet ' +
  'and old. NOT bright, NOT cheerful, NOT golden, NOT shiny, NOT cartoon, ' +
  'NOT isometric, NOT three-quarter, NOT seen from the side, NOT a chest, ' +
  'NOT a box, NOT a container. No ground, no floor, no shadow cast on the ' +
  'ground, no base, no platform, no tools, no people, no other objects.';

/** Four apiece, so a family is a choice rather than whatever came back. */
const ASKS: string[] = [
  // metal — ORE, and it is the rock: it has to read in a crystal cavern too.
  'a knuckle of dark rock broken up out of the floor with a bright metallic vein running through it, dull grey-blue metal showing in the split',
  'a low shelf of near-black stone shot through with three seams of raw pale metal, the seams catching what light there is',
  'a squat boulder of dark rock with one whole face sheared away to show a thick band of rusted orange-brown ore inside',
  'a cluster of angular dark stones fused together, streaked all over with thin bright threads of grey metal',
  // hide — a CARCASS, not a stain: it has to be worth walking to.
  'the whole carcass of a large four-legged beast lying dead on its side, hide still on it, dark matted fur, head turned away, unopened',
  'a big dead animal lying curled on its side, thick dark hide unbroken, ribs showing under it, legs folded in',
  'the body of a heavy beast lying flat and dead, its dark scaled hide whole, tail curled round beside it',
  'a large dead creature lying on its side with a shaggy dark pelt, limbs slack, entirely intact',
  // wood — a STANDING GROWTH with a grain, sawable, not a stone stump.
  'a thick trunk of dark dead wood standing broken off waist high out of the floor, bark black and split, the top a ragged break',
  'a stout stump of near-black timber with three cut logs stacked leaning against it, the wood grain visible on the ends',
  'a dead tree bole standing snapped off short, its dark bark peeling away in strips to show pale wood underneath',
  'a heavy fallen log of dark wood lying across the floor, one end broken open showing the pale grain inside',
  // cloth — PLANT FIBRE. It is what the herb became: something you cut that
  // grows down there, and it has to read as a growth rather than as grass.
  'a dense clump of tall stiff fibrous stalks growing straight up out of the floor, dry and stringy, pale straw against the dark',
  'a tight tussock of long reed-like stems bunched together, their tops frayed open into loose pale fibre',
  'a low bush of coarse grey-green fibrous stems, each one splitting along its length into strands',
  'a spray of stiff pale stalks growing in one clump out of the rock, ragged and uneven, the tallest gone to seed',
  // fish — a POOL, and it must read as WATER at 40 pixels.
  'a small still pool of dark water in a rough basin of near-black rock, the surface flat and reflective, one pale shape moving under it',
  'a low round pool of black water rimmed with wet dark stone, its surface glassy, faint pale ripples across the middle',
  'a shallow pool of dark water held in a bowl of cracked rock, two pale fish just visible below the surface',
  'an oval pool of near-black water set into wet stone, the surface mirror-flat with a single pale fin breaking it',
];

const [verb, arg, extra] = process.argv.slice(2);

/** WHICH FOUR. The tool caps at 16 candidates, so a fifth family cannot ride
 *  the same call — `ask <family>` sends that family's four alone. */
const FOUR: Record<string, number> = { metal: 0, hide: 4, wood: 8, cloth: 12, fish: 16 };

if (verb === 'ask') {
  const at = FOUR[arg ?? ''];
  const want = at === undefined ? ASKS : ASKS.slice(at, at + 4);
  if (at === undefined && ASKS.length > 16) {
    throw new Error(`${ASKS.length} asks is over the 16 the tool returns — name a family`);
  }
  const out = await callTool('create_1_direction_object', {
    description: `a thing on the floor of a cave worth stopping for. ${COMMON}`,
    view: 'top-down',
    style_images: STYLE.map(styleImage),
    item_descriptions: want.map((a) => `${a}. ${COMMON}`),
  });
  console.log(out);
} else if (verb === 'get') {
  const out = await callTool('get_object', { object_id: arg, include_preview: false });
  console.log(fields(out));
  for (const [i, url] of urlsIn(out).entries()) {
    if (!/frame_|\.png/.test(url)) continue;
    const file = `tools/art/cache/node_${extra ?? 'x'}_${i}.png`;
    writeFileSync(file, await download(url));
    console.log(`wrote ${file}`);
  }
} else if (verb === 'pick') {
  console.log(
    await callTool('select_object_frames', {
      object_id: arg,
      indices: (extra ?? '').split(',').map(Number),
    })
  );
} else if (verb === 'spent') {
  // `select_object_frames` returns FOUR objects, one a frame, so the after is
  // asked per family — which is what lets each say what "worked out" means.
  const KEEP =
    ' Nothing else changes: the same place, the same size, the same palette, ' +
    'still seen from DIRECTLY ABOVE looking straight down, standing alone on ' +
    'nothing. NOT a different object, no glow, no light, no tools, no people, ' +
    'no ground, no floor, no shadow cast on the ground.';
  const AFTER: Record<string, string> = {
    metal:
      'THE SAME ROCK AFTER IT HAS BEEN MINED OUT. The metal is entirely gone: ' +
      'the vein is now an empty hollow trench cut through the stone, and loose ' +
      'broken chips of dull grey rock lie around the cut. NO metal anywhere.' + KEEP,
    hide:
      'THE SAME ANIMAL AFTER IT HAS BEEN SKINNED. The hide and fur are entirely ' +
      'gone: what is left is a bare stripped carcass of dark red meat and pale ' +
      'exposed rib bone in the same pose. NO fur, NO pelt, NO hide.' + KEEP,
    wood:
      'THE SAME STUMP AFTER IT HAS BEEN CUT UP AND CARRIED OFF. The logs are ' +
      'entirely gone: what is left is the low sawn stump alone with a pale flat ' +
      'cut face on top and scattered wood chips around it. NO logs, NO stacked ' +
      'timber.' + KEEP,
    // The gem node is `geode_amber`, which was drawn for the Cavern long before
    // this — `geode_split` is a DIFFERENT geode and reads as one.
    gem:
      'THE SAME GEODE AFTER ITS CRYSTALS HAVE BEEN PRISED OUT. The glowing ' +
      'amber crystal points are entirely gone: what is left is the empty rough ' +
      'rock shell, its hollow dark and bare, with a few dull broken stubs where ' +
      'the crystal was snapped off. NO glow, NO light inside it, NO whole ' +
      'crystals.' + KEEP,
    fish:
      'THE SAME POOL AFTER IT HAS BEEN FISHED OUT AND DRAINED. The water is ' +
      'entirely gone: what is left is the empty stone basin, its floor wet dark ' +
      'silt and bare rock. NO water, NO fish, NO reflection.' + KEEP,
  };
  const said = AFTER[extra ?? ''];
  if (!said) throw new Error(`node.mts spent <id> <${Object.keys(AFTER).join('|')}>`);
  console.log(
    await callTool('create_object_state', { object_id: arg, edit_description: said, state_name: 'Spent' })
  );
} else {
  console.log('node.mts ask | get <id> [tag] | pick <id> <i,i,i,i> | spent <id> <family>');
}
