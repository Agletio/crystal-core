/**
 * The LOCK, asked as an OBJECT rather than as a still.
 *
 * `create_image_pixflux` came back 3/4-isometric on all eight tries even with
 * DIRECTLY ABOVE in capitals; `create_1_direction_object` takes `top-down` as a
 * real enum. It also returns a GRID of candidates in one job — sixteen at a
 * size of 85 or under — so a spread of designs to choose between costs one ask.
 *
 * Style is forced with the game's OWN props: the generator's default style is
 * cheerful beside near-black wet rock, and words alone never moved it.
 *
 *   ask   — queue the sixteen, print the object id
 *   get   — poll, and write every candidate out
 *   open  — a state OF a chosen candidate, which is the only way the open frame
 *           is that chest rather than one resembling it
 */
import { writeFileSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { encodePng } from './png.mts';
import { PROP_ART } from '../../src/render/generated-props.ts';

/** Whose look the lock has to sit beside: wet black iron, rotted timber and
 *  cut grey stone. **The LARGEST of these sets the output size**, and past 85
 *  the job returns 4 candidates instead of 16 — so every one of them is a prop
 *  whose grid is 85 or under, and a bigger one is a wrong answer rather than a
 *  richer reference. */
const STYLE = ['cart', 'brazier', 'plinth', 'bench'];

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

/** In capitals for the same reason a prop's is: `view` does not carry it. */
const COMMON =
  'seen from DIRECTLY ABOVE looking straight down, the closed LID facing the ' +
  'camera and filling most of the picture. Standing alone on nothing. ' +
  'Near-black shadows, cold desaturated colour, wet and old. ' +
  'NOT bright, NOT cheerful, NOT golden, NOT shiny, NOT cartoon, NOT isometric, ' +
  'NOT three-quarter, NOT seen from the side. No ground, no floor, no shadow ' +
  'cast on the ground, no base, no platform, no other objects, no coins spilling out.';

const ASKS = [
  'a small square strongbox of near-black rotted timber banded with black rusted iron straps, a heavy hasp on the front',
  'a long low chest of dark warped planks, the lid domed, three wide iron bands across it, corners capped in pitted iron',
  'a squat iron-bound coffer with a huge round padlock hanging off the hasp, the wood almost gone to black',
  'a chest cut from one block of grey stone, the lid a slab, a seam of dull violet crystal growing through one corner',
  'a battered travelling trunk of dark hide stretched over a timber frame, studded with black nails, one strap snapped',
  'a plain deep box of near-black wood with no ornament at all, one plain iron lock plate at the middle of the front edge',
  'a chest whose lid is a single sheet of black pitted iron riveted to dark timber sides, a slot rather than a keyhole',
  'a wide flat crate of split grey boards, the lid pegged shut, a rusted chain wrapped twice around it',
  'a chest of near-black timber with a bone-white ribcage bound flat across the lid as a decoration',
  'a small reliquary casket of tarnished dark metal with a domed lid and a keyhole shaped like a narrow slit',
  'a heavy chest of black wet timber sunk slightly into itself, swollen and split, iron bands rusted through in places',
  'an ore box of riveted iron plate with a hinged lid and two carrying handles, paint long gone, streaked with rust',
  'a chest whose black timber lid is crusted over with pale sickly growth, the iron beneath barely showing',
  'a low strongbox of dark grey stone with a lid of black iron, worn carving around its rim',
  'a narrow deep casket of near-black wood, taller than it is wide, banded top and bottom, standing closed',
  'a broad chest of dark planks with a heavy iron hoop on the lid to lift it by, the hoop dull and pitted',
];

const [verb, arg, extra] = process.argv.slice(2);

if (verb === 'ask') {
  const out = await callTool('create_1_direction_object', {
    description: `a closed treasure chest, ${COMMON}`,
    view: 'top-down',
    style_images: STYLE.map(styleImage),
    item_descriptions: ASKS.map((a) => `${a}, ${COMMON}`),
  });
  console.log(out);
} else if (verb === 'get') {
  const out = await callTool('get_object', { object_id: arg, include_preview: false });
  console.log(out);
  const urls = urlsIn(out);
  for (const [i, url] of urls.entries()) {
    if (!/\.png|image|download|frame/.test(url)) continue;
    const file = `tools/art/cache/lock_${i}.png`;
    writeFileSync(file, await download(url));
    console.log(`wrote ${file}`);
  }
} else if (verb === 'open') {
  console.log(
    await callTool('create_object_state', {
      object_id: arg,
      edit_description:
        'THE SAME CHEST WITH ITS LID THROWN WIDE OPEN, hinged back and standing up ' +
        'behind the box, the inside of the box now visible and EMPTY and dark. ' +
        'Nothing else changes: the same timber, the same iron, the same colours, ' +
        'the same size, still seen from DIRECTLY ABOVE looking straight down. ' +
        'NOT a different chest, no coins, no treasure, no glow, no light coming out.',
      state_name: extra ?? 'Open',
    })
  );
} else {
  console.log('chest.mts ask | get <object_id> | open <object_id> [name]');
}
