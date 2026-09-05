/**
 * THE LOCK, three per world: two ordinary and one RARE, made of the world.
 *
 * Asked as an OBJECT rather than as a still. `create_image_pixflux` came back
 * 3/4-isometric on all eight tries even with DIRECTLY ABOVE in capitals;
 * `create_1_direction_object` takes `top-down` as a real enum. It also returns
 * a GRID of candidates in one job — sixteen at a size of 85 or under — so a
 * spread to choose between costs 25 generations rather than sixteen asks.
 *
 * **The LARGEST style image sets that size**, and past 85 the pack drops from
 * sixteen to four, so every reference is a prop of 85 or under. Style is forced
 * with the world's OWN props: the default style is cheerful beside near-black
 * wet rock, and words alone never moved it.
 *
 *   ask <zone>   — queue the sixteen for one world
 *   get <id>     — poll, and write every candidate out
 *   open <id>    — the same object with its lid thrown back, which is the only
 *                  way the open frame is that chest rather than one like it
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

/** In capitals for the same reason a prop's is: `view` does not carry it. And
 *  it must read as a BOX WITH A LID whatever it is made of, or the open state
 *  has nothing to hinge. */
const COMMON =
  'seen from DIRECTLY ABOVE looking straight down, the closed LID facing the ' +
  'camera and filling most of the picture. It is plainly a CONTAINER: a box ' +
  'with a lid that shuts along a visible seam. Standing alone on nothing. ' +
  'NOT bright, NOT cheerful, NOT golden, NOT shiny, NOT cartoon, NOT isometric, ' +
  'NOT three-quarter, NOT seen from the side. No ground, no floor, no shadow ' +
  'cast on the ground, no base, no platform, no other objects, nothing spilling out.';

interface ZoneAsk {
  /** Props whose look it has to sit beside. The largest sets the pack size. */
  style: string[];
  /** The world in one clause, and its colours by name AND by exclusion. */
  of: string;
  /** Sixteen, each its own container. The first twelve are ordinary and the
   *  last four are what a RARE one might be — richer, never merely bigger. */
  asks: string[];
}

const ZONES: Record<string, ZoneAsk> = {
  // THE FISSURE — "A working somebody gave up on."
  fissure: {
    style: ['cart', 'brazier', 'plinth', 'bench'],
    of: 'Near-black shadows, cold desaturated colour, wet and old, dull grey and rust brown',
    asks: [
      'a small square strongbox of near-black rotted timber banded with black rusted iron straps, a heavy hasp on the front',
      'a long low chest of dark warped planks, the lid domed, three wide iron bands across it, corners capped in pitted iron',
      'a plain deep box of near-black wood with no ornament at all, one plain iron lock plate at the middle of the front edge',
      'a chest whose lid is a single sheet of black pitted iron riveted to dark timber sides, a slot rather than a keyhole',
      'an ore box of riveted iron plate with a hinged lid and two carrying handles, paint long gone, streaked with rust',
      'a heavy chest of black wet timber sunk slightly into itself, swollen and split, iron bands rusted through in places',
      'a broad chest of dark planks with a heavy iron hoop on the lid to lift it by, the hoop dull and pitted',
      'a squat coffer of dark timber with iron corner brackets and a row of black studs along the lid',
      'a miner\'s tool chest of scarred grey boards with a flat lid and two iron latches side by side',
      'a low crate of split dark boards bound with wire, the lid held down by one bent iron clasp',
      'a deep box of near-black timber with a sunken iron ring set flush into the lid',
      'a chest of dark planks with one wide iron band down the middle of the lid and a keyhole in it',
      'a squat iron-bound coffer with a huge round padlock hanging off the hasp, the wood almost gone to black',
      'a strongbox of black iron plate with a heavy barred grille riveted over the lid',
      'a chest of dark timber with a bank of THREE separate iron locks in a row along the front edge',
      'a banker\'s coffer of near-black wood sheathed in dull grey lead, its lid edged with a beaded iron rim',
    ],
  },
  // THE ROT — "The rock has given way to something that grew here after it."
  // The container is OF the meat: a box of wood standing in a gullet reads as
  // furniture somebody carried in.
  demonic: {
    style: ['gore', 'cocoon', 'bones', 'chains'],
    of:
      'Made of MEAT and BONE, not wood and not stone. Dark blackened red, ' +
      'clotted purple-brown, bone the colour of old ivory. Wet. ' +
      'NOT wood, NOT timber, NOT planks, NOT grey stone, NOT bright red, NOT pink',
    asks: [
      'a chest-sized box of dark clotted meat, its lid a slab of the same meat, bound shut with pale sinew like rope',
      'a low box grown of dark red muscle, ribbed across the lid with curved bone like iron bands',
      'a squat container of hardened black-red flesh, the seam of its lid puckered shut like a closed wound',
      'a box whose walls are grown bone and whose lid is a stretched drum of dark hide, laced down at the corners',
      'a chest of dark meat wrapped tight in filthy grey webbing, the lid seam still showing under it',
      'a box of blackened gristle with four short bone legs, the lid held down by a knot of sinew',
      'a low coffer of dried dark hide stretched over a frame of bone, stitched along every edge',
      'a container of clotted meat with a lid of overlapping bone plates like a shell',
      'a squat box of dark red flesh crusted over with pale dry membrane, the lid seam a pale line across it',
      'a chest of blackened meat bound with three loops of dark twisted gut',
      'a box of dark muscle with a rib cage folded shut over the lid like a lid clasp',
      'a low container of hardened black flesh with a puckered slit across the lid, closed tight',
      'a chest of dark meat with a full bleached SKULL set into the middle of its lid, jaws shut',
      'a coffer of black-red flesh caged inside a lattice of long bones bound at every crossing',
      'a box of dark clotted meat crowned with a ring of pale horns curving up from its lid',
      'a chest of dark muscle whose lid is one thick plate of ivory bone carved with worn grooves',
    ],
  },
  // THE CAVERN — "Crystal to the ceiling, and every surface holding light."
  prismatic: {
    style: ['gems_shards', 'geode_rose', 'geode_teal', 'geode_amber'],
    of:
      'Made of CRYSTAL and dark rock, not wood and not meat. Pale rose-white ' +
      'and cool violet, faceted, glassy, lit faintly from inside. ' +
      'NOT wood, NOT timber, NOT planks, NOT meat, NOT red, NOT warm, NOT golden',
    asks: [
      'a box hewn from one block of dark rock with a lid of pale rose crystal grown flat across it',
      'a low chest of near-black stone banded with seams of violet crystal running over the lid',
      'a squat coffer whose walls are dull grey rock and whose lid is a single flat faceted crystal pane',
      'a chest-sized geode split level, the upper half sitting closed on the lower like a lid',
      'a box of dark rock crusted all over with small pale crystal points, a plain seam where the lid shuts',
      'a low container of grey stone with four blunt violet crystal spikes at its corners and a flat lid',
      'a chest of dark rock whose lid is a raft of thin pale crystal blades laid flat side by side',
      'a squat box of near-black stone, the lid inlaid with a flat disc of milky crystal',
      'a coffer of grey rock with a crystal seam running right through it, halves fitted shut',
      'a low chest of dark stone with a ridge of small rose crystal teeth along the lid seam',
      'a box of near-black rock with a pale crystal lid worn smooth and cloudy',
      'a squat stone coffer with a shallow bowl of crystal grit set into the closed lid',
      'a chest grown ENTIRELY of faceted pale rose crystal, walls and lid alike, glowing faintly from within',
      'a coffer of dark rock encased in a shell of long violet crystal blades that meet closed over the lid',
      'a box of pale luminous crystal caged in a lattice of dark stone ribs, light leaking at the lid seam',
      'a chest of near-black stone with a great single violet crystal set flush into the middle of its lid',
    ],
  },
  // THE SEAM — "Two worlds fused at a join that should not exist." Both
  // materials in ONE object, meeting at a hard edge rather than blended.
  seam: {
    style: ['gore', 'gems_shards', 'bones', 'geode_rose'],
    of:
      'Made of BOTH dark clotted meat AND violet crystal, meeting at a hard ' +
      'JOIN across the object rather than blended together — one part is wet ' +
      'blackened red flesh, the other is faceted violet crystal breaking out ' +
      'through it. NOT wood, NOT timber, NOT planks, NOT grey stone, NOT pink',
    asks: [
      'a chest of dark clotted meat with violet crystal erupting through one whole side and over the lid',
      'a low box half grown of black-red flesh and half of faceted violet crystal, split down the middle',
      'a squat coffer of dark muscle with crystal shards driven through it like nails around the lid seam',
      'a container of blackened meat whose lid is a slab of violet crystal grown into it',
      'a box of dark flesh with a crust of small crystal points spreading over one corner of the lid',
      'a chest of clotted meat bound with sinew, crystal blades breaking out between the bindings',
      'a low box of black-red muscle with a bone frame, crystal filling the gaps between the bones',
      'a coffer of dark meat with a violet crystal seam running right across the closed lid',
      'a squat container of blackened flesh, its four corners each capped in rough violet crystal',
      'a chest of dark muscle whose lid seam has grown shut with a fused ridge of crystal',
      'a box of clotted meat with pale crystal grit crusted into the folds of its lid',
      'a low coffer of black-red flesh with one long crystal spike lying flat across the lid',
      'a chest half meat and half crystal with a crown of tall violet blades rising from the lid',
      'a coffer of dark flesh completely caged in a lattice of violet crystal blades meeting over the lid',
      'a box of blackened meat with a great faceted crystal heart set into the middle of the lid, glowing faintly',
      'a chest of dark muscle sheathed in overlapping plates of violet crystal like scales, shut tight',
    ],
  },
};

const [verb, arg, extra] = process.argv.slice(2);

if (verb === 'ask') {
  const zone = ZONES[arg];
  if (!zone) throw new Error(`chest.mts ask <${Object.keys(ZONES).join('|')}>`);
  const said = `${zone.of}. ${COMMON}`;
  const out = await callTool('create_1_direction_object', {
    description: `a closed chest. ${said}`,
    view: 'top-down',
    style_images: zone.style.map(styleImage),
    item_descriptions: zone.asks.map((a) => `${a}. ${said}`),
  });
  console.log(`${arg}:\n${out}`);
} else if (verb === 'get') {
  const out = await callTool('get_object', { object_id: arg, include_preview: false });
  console.log(out);
  for (const [i, url] of urlsIn(out).entries()) {
    if (!/frame_|\.png/.test(url)) continue;
    const file = `tools/art/cache/lock_${extra ?? 'x'}_${i}.png`;
    writeFileSync(file, await download(url));
    console.log(`wrote ${file}`);
  }
} else if (verb === 'pick') {
  // A review pack is not an object yet: only a promoted frame can have a state
  // made of it, so the open lid waits on this.
  console.log(
    await callTool('select_object_frames', {
      object_id: arg,
      indices: (extra ?? '').split(',').map(Number),
    })
  );
} else if (verb === 'open') {
  console.log(
    await callTool('create_object_state', {
      object_id: arg,
      edit_description:
        'THE SAME CONTAINER WITH ITS LID THROWN WIDE OPEN, hinged back and ' +
        'standing up behind the box, the inside now visible and EMPTY and dark. ' +
        'Nothing else changes: the same material, the same colours, the same ' +
        'size, still seen from DIRECTLY ABOVE looking straight down. ' +
        'NOT a different container, nothing inside it, no coins, no treasure, ' +
        'no glow, no light coming out.',
      state_name: extra ?? 'Open',
    })
  );
} else {
  console.log(`chest.mts ask <${Object.keys(ZONES).join('|')}> | get <id> [tag] | open <id> [name]`);
}
