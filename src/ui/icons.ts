/**
 * Little item icons, as inline SVG so they scale with font size and cost nothing
 * to re-render. Procedural placeholders: a shape that reads at a glance, not
 * art, and swappable for a real asset one function at a time.
 */
import type { CurrencyDef, Item } from '../types';

const NS = 'http://www.w3.org/2000/svg';

function shape(
  parent: SVGSVGElement,
  tag: string,
  attrs: Record<string, string | number>
): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent.append(node);
  return node;
}

const CRYSTAL_COLOURS = [
  'var(--dust)',
  'var(--quartz)',
  'var(--verdite)',
  'var(--amethyst)',
  'var(--citrine)',
  'var(--ember)',
];

// --- pixel art -------------------------------------------------------------

/**
 * A sprite, written as rows of characters and drawn as whole cells.
 *
 * One rect per horizontal run rather than per cell, so a 12x12 sprite is a
 * dozen elements. A dot is transparent; every other character is a key into
 * the palette. Rows need not be the same length.
 */
function sprite(
  rows: string[],
  palette: Record<string, string>,
  size: number,
  name: string
): SVGSVGElement {
  const width = Math.max(...rows.map((r) => r.length));
  // A square box whatever the sprite's own shape, so a short sprite reads as a
  // SMALL thing rather than being stretched up to fill the slot.
  const box = Math.max(width, rows.length);
  const offX = (box - width) / 2;
  const offY = (box - rows.length) / 2;
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('viewBox', `0 0 ${box} ${box}`);
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('shape-rendering', 'crispEdges');
  // Which silhouette this is, so a test can tell two icons apart without
  // reading their geometry back.
  node.setAttribute('data-sprite', name);
  node.classList.add('icon');

  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      shape(node as SVGSVGElement, 'rect', {
        x: x + offX, y: y + offY, width: run, height: 1,
        fill: palette[ch] ?? 'var(--dust)',
      });
      x += run;
    }
  });
  return node;
}

const INK = '#0A0810';

const FIRE_PALETTE = {
  o: INK,
  f: 'var(--flame)',
  r: '#9E2C15',
  y: '#F3A63E',
  w: 'var(--flame-core)',
};

const FIREBALL = [
  '....oo......',
  '...offo.....',
  '..offrfo....',
  '..ofrryfo...',
  '.ofrryywfo..',
  '.ofryywwwfo.',
  '.ofryywwwfo.',
  '.ofrryywwfo.',
  '..ofrryyfo..',
  '..offrrrfo..',
  '...offrfo...',
  '....oooo....',
];

const BLIGHT = [
  '.....oo.....',
  '....ovvo....',
  '...ovvvvo...',
  '..ovvggvvo..',
  '.ovvggwgvvo.',
  '.ovvgggggvo.',
  '.ovvvgggvvo.',
  '..ovvvvvvo..',
  '...oovvoo...',
  '.....oo.....',
  '....o..o....',
  '.....oo.....',
];

const BLADE = [
  '.....oo.....',
  '....osdo....',
  '....osdo....',
  '....osdo....',
  '....osdo....',
  '....osdo....',
  '..ogggggo...',
  '.ogggggggo..',
  '....ohho....',
  '....ohho....',
  '...ohhhho...',
  '....oooo....',
];

const ORB = [
  '.y........y.',
  '....oooo....',
  '...obbbbo...',
  '..obccbbbo..',
  '..obcwcbbbo.',
  '..obbcccbbo.',
  '...obbbbbo..',
  '....oooo....',
  '.y........y.',
];

const SHARD = [
  '.....oo.....',
  '....ocqo....',
  '...ocqqqo...',
  '..ocqqqqqo..',
  '..oqqqwqqo..',
  '..oqqqqqqo..',
  '...oqqqqo...',
  '....oqqo....',
  '.....oo.....',
];

const BOOT = [
  '...oo.......',
  '..obbo......',
  '..obbo......',
  '..obbo......',
  '..obbbooo...',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '.oddddddddo.',
  '.oooooooooo.',
];

const STEEL = { o: INK, s: '#B9C2CC', d: '#7A8492', g: 'var(--citrine)', h: '#6B4526' };
const ROT = { o: INK, v: '#4E8C33', g: 'var(--venom)', w: '#EAFFC0' };
const ARCANE = { o: INK, b: '#5C3A96', c: 'var(--amethyst)', w: '#EBD9FF', y: 'var(--citrine)' };
const CRYSTAL = { o: INK, c: '#3E7F99', q: 'var(--quartz)', w: '#EAF9FF' };
const LEATHER = { o: INK, b: '#7A5A34', d: '#4A3A22' };

/**
 * A gem that grows with level on three axes — size, facets and a halo of loose
 * shards — so adjacent levels differ in SILHOUETTE, which colour alone cannot do
 * unless they are side by side.
 */
const GEMS: string[][] = [
  [
    '....oooo....',
    '...occcco...',
    '...occcco...',
    '....oooo....',
  ],
  [
    '....oooo....',
    '...occcco...',
    '..occcccco..',
    '..occcccco..',
    '...occcco...',
    '....oooo....',
  ],
  [
    '....oooo....',
    '...owccco...',
    '..owccccco..',
    '..occcccco..',
    '..occcccco..',
    '...occcco...',
    '....oooo....',
  ],
  [
    '...oooooo...',
    '..owwccclo..',
    '.owwccccclo.',
    '.owcccccclo.',
    '.occccccclo.',
    '..occccclo..',
    '...oooooo...',
  ],
  [
    'c..........c',
    '...oooooo...',
    '..owwccclo..',
    '.owwccccclo.',
    '.owcccccclo.',
    '.occccccclo.',
    '..occccclo..',
    '...oooooo...',
  ],
  [
    'c..........c',
    '..oooooooo..',
    '.owwccccclо.',
    'owwccccccclo',
    'owwccccccclo',
    'owcccccccclo',
    'occccccccclо',
    '.occccccclо.',
    '..oooooooo..',
    '.....c......',
  ],
];

export function crystalIcon(level: number, size = 26): SVGSVGElement {
  const t = Math.max(1, Math.min(GEMS.length, level));
  const colour = CRYSTAL_COLOURS[t - 1] ?? 'var(--amethyst)';
  return sprite(GEMS[t - 1], { o: INK, c: colour, w: 'var(--chalk)', l: '#00000066' }, size, `crystal-t${t}`);
}

/**
 * One silhouette per slot, as pixels. Deliberately generic — the job is telling
 * a helm from a boot at a glance, not looking good.
 */
const GEAR = {
  o: INK,
  s: '#B9C2CC',
  d: '#7A8492',
  w: '#EAF2FF',
  g: 'var(--citrine)',
  h: '#6B4526',
  p: 'var(--amethyst)',
  r: 'var(--ember)',
};

const WAND = [
  '....oooo....',
  '...opppo....',
  '..oppwppo...',
  '...opppo....',
  '....oso.....',
  '....oso.....',
  '.....oso....',
  '.....oso....',
  '.....oho....',
  '.....oho....',
  '.....ooo....',
];

const DAGGER = [
  '.......oo...',
  '......osdo..',
  '.....osdo...',
  '....osdo....',
  '...osdo.....',
  '..ogo.......',
  '.ogggo......',
  '..ohho......',
  '..ohho......',
  '..oooo......',
];

const MACE = [
  '...oooo.....',
  '..orrrro....',
  '.orrwrrro...',
  '..orrrro....',
  '...oooo.....',
  '....oho.....',
  '.....oho....',
  '.....oho....',
  '.....oho....',
  '.....ooo....',
];

const HELMET = [
  '...oooooo...',
  '..osssssso..',
  '.osssssssso.',
  '.ossoooosso.',
  '.ossoooosso.',
  '.osssssssso.',
  '..oss..sso..',
  '..ooo..ooo..',
];

const GLOVE = [
  '...oo.oo....',
  '..ossossoo..',
  '..osssssso..',
  '..osssssso..',
  '..osswssso..',
  '...oossoo...',
  '....oooo....',
];

const AMULET = [
  '..o......o..',
  '..do....od..',
  '...do..od...',
  '....oooo....',
  '...ogggo....',
  '..oggwggo...',
  '...ogggo....',
  '....ooo.....',
];

const RING = [
  '.....gg.....',
  '....oggo....',
  '...oooooo...',
  '..ossddsso..',
  '..oss..sso..',
  '..oss..sso..',
  '..ossddsso..',
  '...oooooo...',
];

const BODY = [
  '..oo....oo..',
  '.oossoossoo.',
  '.osssssssso.',
  '.ossswdssso.',
  '.osssssssso.',
  '..osssssso..',
  '...oossoo...',
  '....oooo....',
];

/**
 * Armour art: a silhouette set per archetype pairing, a palette per family.
 *
 * Both axes are needed. Shape alone would leave the two families of a pairing
 * identical, and colour alone would leave a helm and a boot the same picture.
 * Every sprite uses the same five keys, so any palette fits any silhouette.
 */
const ARMOUR_SHAPES: Record<string, Record<string, string[]>> = {
  // Melee. Riveted and closed, with a crest and a central seam.
  plate: {
    helmet: [
      '....oooo....',
      '...occcco...',
      '..oaaaaaao..',
      '.oaawaaawao.',
      '.oaaaaaaaao.',
      '.obbbbbbbbo.',
      '.oaaaaaaaao.',
      '..oaaaaaao..',
      '..oo....oo..',
    ],
    body: [
      '.oo......oo.',
      'oaaoooooaaao',
      'oaaaaaaaaaao',
      '.oaaawwaaao.',
      '.oaaaccaaao.',
      '.oaaaccaaao.',
      '.oaaaccaaao.',
      '..oaaaaaao..',
      '...oooooo...',
    ],
    gloves: [
      '..oo..oo....',
      '.oaaooaaoo..',
      '.oaaaaaaao..',
      '.obbbbbbbo..',
      '.oaawwaaao..',
      '.oaaaaaaao..',
      '..ooooooo...',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.oaaaao.....',
      '.obbbbo.....',
      '.oaaaao.....',
      '.oaaaaoooo..',
      '.oaaaaaaaoo.',
      '.oaawwwwaao.',
      '..oooooooo..',
    ],
  },
  // Spell. Soft and pointed, with a stole down the front.
  weave: {
    helmet: [
      '.....oo.....',
      '....oaao....',
      '...oaaaao...',
      '..oaaaaaao..',
      '.oaabbbbaao.',
      '.oaabbbbaao.',
      '.oaaaaaaaao.',
      '..occcccco..',
      '...oooooo...',
    ],
    body: [
      '...oo..oo...',
      '..oaaooaao..',
      '..oaaaaaao..',
      '.oaaaccaaao.',
      '.oaaaccaaao.',
      'oaaaaccaaaao',
      'oaaaaccaaaao',
      'oaaaaaaaaaao',
      '.oooooooooo.',
    ],
    gloves: [
      '...oo.oo....',
      '..oaaoaaoo..',
      '..oaaaaaao..',
      '..occcccco..',
      '..oaaaaaao..',
      '..occcccco..',
      '...oaaaao...',
      '....oooo....',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.oaaaao.....',
      '.occcco.....',
      '.oaaaao.....',
      '.oaaaaoo....',
      '.oaaaaaaoo..',
      '.oaaaaaaaao.',
      '..oooooooo..',
    ],
  },
  // Rogue. Strapped, eye slits, a low sole made for running.
  hide: {
    helmet: [
      '....oooo....',
      '...oaaaao...',
      '..oaaaaaao..',
      '.oaaaaaaaao.',
      '.oabboobbao.',
      '.oaaaaaaaao.',
      '.occcccccco.',
      '..oaaaaaao..',
      '...oo..oo...',
    ],
    body: [
      '..oo....oo..',
      '.oaaooooaao.',
      '.oaaaaaaaao.',
      '.oaaaaaaaao.',
      '.occcccccco.',
      '.oaaaaaaaao.',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '...oo..oo...',
    ],
    gloves: [
      '..o.o.o.....',
      '.oaoaoaoo...',
      '.oaaaaaaao..',
      '.oaaaaaaao..',
      '.occccccco..',
      '.oaaaaaaao..',
      '..oaaaaao...',
      '...ooooo....',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.oaaaao.....',
      '.occcco.....',
      '.oaaaao.....',
      '.oaaaaoo....',
      '.oaaaaaaoo..',
      '.obbbbbbbbo.',
      '..oooooooo..',
    ],
  },
  // Melee and spell. Plate wearing a crown and a sigil.
  sanctum: {
    helmet: [
      '...c.cc.c...',
      '..occcccco..',
      '.oaaaaaaaao.',
      '.oaaaaaaaao.',
      '.oaaccccaao.',
      '.obbbbbbbbo.',
      '.oaaaaaaaao.',
      '..oaaaaaao..',
      '..oo....oo..',
    ],
    body: [
      '.oo......oo.',
      'oaaoooooaaao',
      'oaaaaccaaaao',
      '.oaacccaaao.',
      '.oaaaccaaao.',
      '.oaaaccaaao.',
      '..oaaccaao..',
      '..oaaaaaao..',
      '...oooooo...',
    ],
    gloves: [
      '..oo..oo....',
      '.oaaooaaoo..',
      '.oaaaaaaao..',
      '.oacccccao..',
      '.oaaaaaaao..',
      '.oaawwaaao..',
      '..ooooooo...',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.oaaaao.....',
      '.oaccao.....',
      '.oaaaao.....',
      '.oaaaaoooo..',
      '.oaaaaaccoo.',
      '.oaaaaaaaao.',
      '..oooooooo..',
    ],
  },
  // Spell and rogue. Hanging cloth, a masked face, a cloak drawn across.
  veil: {
    helmet: [
      '....oooo....',
      '...oaaaao...',
      '..oaaaaaao..',
      '.oaaaaaaaao.',
      '.oabbbbbbao.',
      '.oaccccccao.',
      '.oaaaaaaaao.',
      '..oa.aa.ao..',
      '..oo.oo.oo..',
    ],
    body: [
      '...oo..oo...',
      '..oaaooaao..',
      '.oaaaaaaaao.',
      '.occaaaaaao.',
      '.oaccaaaaao.',
      '.oaaccaaaao.',
      'oaaaccaaaaao',
      'oaaaaaaaaaao',
      '.oooooooooo.',
    ],
    gloves: [
      '...oo.oo....',
      '..oaaoaaoo..',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '..occcccco..',
      '..oaaaaaao..',
      '..oaaaaaao..',
      '...oo..oo...',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.oaaaao.....',
      '.oaaaao.....',
      '.occcco.....',
      '.oaaaaoo....',
      '.oaaaaaaoo..',
      '.oaaaaaaaao.',
      '..oo.oo.oo..',
    ],
  },
  // Melee and rogue. Open-faced and buckled, straps crossed at the chest.
  harness: {
    helmet: [
      '...oooooo...',
      '..oaaaaaao..',
      '.oaaaaaaaao.',
      '.occcccccco.',
      '.oaabbbbaao.',
      '.oaabaabaao.',
      '..oaaaaaao..',
      '...oooooo...',
    ],
    body: [
      '..oo....oo..',
      '.oaaooooaao.',
      '.oaccaaccao.',
      '.oaaccccaao.',
      '.oaaaccaaao.',
      '.oaaaccaaao.',
      '..oaaccaao..',
      '..oaaaaaao..',
      '...oooooo...',
    ],
    gloves: [
      '..oo..oo....',
      '.oaaooaaoo..',
      '.oaaaaaaao..',
      '.occccccco..',
      '.oaaaaaaao..',
      '.occccccco..',
      '..oaaaaao...',
      '...ooooo....',
    ],
    boots: [
      '..oooo......',
      '.oaaaao.....',
      '.occcco.....',
      '.oaaaao.....',
      '.occcco.....',
      '.oaaaaoo....',
      '.oaaaaaaoo..',
      '.oaawwwwaoo.',
      '..oooooooo..',
    ],
  },
};

/**
 * Which silhouette a family wears, and what it is dyed. Colour carries the
 * theme: the mundane world is steel and rust, the occult is amethyst and
 * venom, and a hybrid wears both.
 */
const ARMOUR_ART: Record<string, { shape: string; palette: Record<string, string> }> = {
  // Steel, and only steel — nothing on it that is not there to stop a hit.
  bulwark: { shape: 'plate', palette: { o: INK, a: '#B9C2CC', b: '#4E5866', c: '#7A8492', w: '#EAF2FF' } },
  // The same plate, heated: an ember crest and a bloodied edge.
  vanguard: { shape: 'plate', palette: { o: INK, a: '#A8A093', b: '#57503F', c: 'var(--ember)', w: 'var(--flame-core)' } },

  arcanist: { shape: 'weave', palette: { o: INK, a: 'var(--amethyst)', b: '#33194F', c: '#D9C4F5', w: '#EBD9FF' } },
  oracle: { shape: 'weave', palette: { o: INK, a: 'var(--bone)', b: '#6E6552', c: 'var(--citrine)', w: '#FFF3D0' } },

  shadow: { shape: 'hide', palette: { o: INK, a: '#2F2C3B', b: '#17151F', c: 'var(--venom)', w: '#8A85A0' } },
  skirmisher: { shape: 'hide', palette: { o: INK, a: '#8A6236', b: '#4A3320', c: 'var(--ember)', w: '#C79A63' } },

  templar: { shape: 'sanctum', palette: { o: INK, a: '#AEB6C4', b: '#414A5C', c: 'var(--amethyst)', w: '#EBD9FF' } },
  runeguard: { shape: 'sanctum', palette: { o: INK, a: '#9AA2AE', b: '#3D434E', c: 'var(--citrine)', w: '#FFF3D0' } },

  nightweave: { shape: 'veil', palette: { o: INK, a: 'var(--gloom)', b: '#1C1128', c: 'var(--venom)', w: '#B79BE0' } },
  whisper: { shape: 'veil', palette: { o: INK, a: '#5E6B72', b: '#2B3237', c: 'var(--quartz)', w: '#D6EEF7' } },

  raider: { shape: 'harness', palette: { o: INK, a: '#6E5334', b: '#3A2B1B', c: '#9AA2AE', w: '#C79A63' } },
  duelist: { shape: 'harness', palette: { o: INK, a: '#59606B', b: '#2A2E36', c: 'var(--venom)', w: '#C2CAD6' } },
};

/** Whether a family has art for a slot. Pure, so the demo can hold the line. */
export const hasArmourArt = (family: string, slot: string): boolean =>
  ARMOUR_SHAPES[ARMOUR_ART[family]?.shape]?.[slot] !== undefined;

function armourIcon(family: string, slot: string, size: number): SVGSVGElement | null {
  const art = ARMOUR_ART[family];
  const rows = art && ARMOUR_SHAPES[art.shape]?.[slot];
  if (!art || !rows) return null;
  return sprite(rows, art.palette, size, `${family}-${slot}`);
}

export function gearIcon(art: string, size = 26): SVGSVGElement {
  // Armour keys are `family_slot`; every other base names one silhouette.
  const cut = art.lastIndexOf('_');
  if (cut > 0) {
    const worn = armourIcon(art.slice(0, cut), art.slice(cut + 1), size);
    if (worn) return worn;
  }
  // Weapon bases carry their FAMILY as their art key, not the word "weapon",
  // so every family needs its own case or it falls through to body armour.
  switch (art) {
    case 'wand':
      return sprite(WAND, GEAR, size, 'wand');
    case 'sword':
    case 'weapon':
      return sprite(BLADE, GEAR, size, 'weapon');
    case 'dagger':
      return sprite(DAGGER, GEAR, size, 'dagger');
    case 'mace':
      return sprite(MACE, GEAR, size, 'mace');
    case 'helmet':
      return sprite(HELMET, GEAR, size, 'helmet');
    case 'gloves':
      return sprite(GLOVE, GEAR, size, 'gloves');
    case 'boots':
      return sprite(BOOT, LEATHER, size, 'boots');
    case 'amulet':
      return sprite(AMULET, GEAR, size, 'amulet');
    case 'ring':
      return sprite(RING, GEAR, size, 'ring');
    default:
      return sprite(BODY, GEAR, size, 'body');
  }
}

const CLASS_COLOURS: Record<string, string> = {
  basic: 'var(--dust)',
  uncommon: 'var(--verdite)',
  rare: 'var(--quartz)',
  exotic: 'var(--citrine)',
};

/**
 * Silhouette per currency, colour per class. The shape says what the thing DOES,
 * because that is what you choose between: a shard that grows for the one that
 * adds, a cleft one for the one that removes, a ring for a re-roll. Class drives
 * colour, so rarity reads at a glance and function reads up close.
 *
 * `c` is the class colour, `w` its highlight, `o` the outline.
 */
const SIGILS: Record<string, string[]> = {
  shard_of_seaming: [
    '...oo...oo..',
    '..occo.occo.',
    '..occo.occo.',
    '..occo.occo.',
    '..occo.occo.',
    '..occo.occo.',
    '...oo...oo..',
  ],
  shard_of_making: [
    '.....oo.....',
    '....occo....',
    '...occcco...',
    '...occwco...',
    '...occcco...',
    '...occcco...',
    '....occo....',
    '.....oo.....',
  ],
  shard_of_turning: [
    '...cccc..c..',
    '..cc..cc.cc.',
    '.cc....cccc.',
    '.cc.....cc..',
    '.cc.....c...',
    '.cc....cc...',
    '..cc..cc....',
    '...cccc.....',
  ],
  shard_of_cleaving: [
    '.o...oo...o.',
    'occ.occo.cco',
    'occ.occo.cco',
    'occ.occo.cco',
    'occ.occo.cco',
    '.o..occo..o.',
    '.....oo.....',
  ],
  sigil_of_ascent: [
    '.........cc.',
    '.........cc.',
    '......cccc..',
    '......cc.cc.',
    '...cccc..cc.',
    '...cc.cc.cc.',
    'cccc..cc.cc.',
    'cc.cc.cc.cc.',
  ],
  sigil_of_brilliance: [
    '.....cc.....',
    '.....cc.....',
    '..c..cc..c..',
    '...c.cc.c...',
    'ccccccwccccc',
    'ccccccwccccc',
    '...c.cc.c...',
    '..c..cc..c..',
    '.....cc.....',
    '.....cc.....',
  ],
  shard_of_unmaking: [
    '.....oo.....',
    '....occo....',
    '...occcco...',
    '...occ..o...',
    '...occ..o...',
    '...occcco...',
    '....occo....',
    '.....oo.....',
  ],
  shard_of_change: [
    '...cccccc...',
    '..cc....cc..',
    '.cc......cc.',
    '.cc......cc.',
    '.cc......cc.',
    '.cc......cc.',
    '..cc....cc..',
    '...cccccc...',
  ],
  shard_of_awakening: [
    '.....cc.....',
    '.....cc.....',
    '....cccc....',
    'cccccwwccccc',
    'cccccwwccccc',
    '....cccc....',
    '.....cc.....',
    '.....cc.....',
  ],
  shard_of_chaos: [
    '....cc......',
    '..c.cc..cc..',
    '..cccccccc..',
    '.ccccwwcccc.',
    '..cccccccc..',
    '.cc..cc..cc.',
    'cc...cc...c.',
    '.....c......',
  ],
  essence_of_the_swarm: [
    '..ccc.......',
    '.ccccc.ccc..',
    '.ccccc.ccc..',
    '..ccc..ccc..',
    '....ccccc...',
    '...ccwccc...',
    '...ccccccc..',
    '....ccccc...',
  ],
  essence_of_greed: [
    '..cccccccc..',
    '.cwccccccccc',
    '..cccccccc..',
    '.cccccccccc.',
    '..cccccccc..',
    '.cccccccccc.',
    '..cccccccc..',
    '...cccccc...',
  ],
  whetstone_of_might: [
    '........cc..',
    '.......cccc.',
    '......ccccc.',
    '.....ccccc..',
    '....ccccc...',
    '...ccccc....',
    '..ccccc.....',
    '..cccc......',
    '..cc........',
  ],
  oil_of_swiftness: [
    '.........cc.',
    '........ccc.',
    '.......ccc..',
    '.....cccc...',
    '...cccccc...',
    '..cccwcccc..',
    '..cccccccc..',
    '...cccccc...',
    '....cccc....',
  ],
  sigil_of_refinement: [
    '.....cc.....',
    '....cccc....',
    '...cccccc...',
    '..cccccccc..',
    '.cccccccccc.',
    '....cccc....',
    '....cccc....',
    '....cccc....',
  ],
  sigil_of_excess: [
    '...cccc..cc.',
    '..cccccc.cc.',
    '.cccccccc...',
    '.cccwccccc..',
    '.cccccccccc.',
    '.cccccccc...',
    '..cccccc....',
    '...cccc.....',
  ],
  sigil_of_finality: [
    '...cccccc...',
    '..cccc.ooo..',
    '.cccc...ooo.',
    '.cccc...ooo.',
    '.cccc...ooo.',
    '.cccc...ooo.',
    '..cccc.ooo..',
    '...cccooo...',
  ],
  shard_of_ruin: [
    '.o.......o..',
    'occ.....ccc.',
    'occ....cccc.',
    '.occ..ccc...',
    '..cc.ccc....',
    '..cc..cc....',
    '...o...oo...',
  ],
  gold: [
    '....cccc....',
    '...cccccc...',
    '..cccwwccc..',
    '..cccwwccc..',
    '...cccccc...',
    '....cccc....',
  ],
};

export function currencyIcon(currency: CurrencyDef, size = 22): SVGSVGElement {
  const colour = CLASS_COLOURS[currency.class] ?? 'var(--dust)';
  // An unknown currency still gets a shape rather than nothing, so adding one
  // to the table is a visual to-do rather than an invisible bug.
  const rows = SIGILS[currency.id] ?? SIGILS.gold;
  return sprite(rows, { o: INK, c: colour, w: 'var(--chalk)' }, size, currency.id);
}

/** Skill icons, for the middle of a tree. */
export function skillIcon(skillId: string, size = 44): SVGSVGElement {
  switch (skillId) {
    case 'fireball':
    case 'bolt':
      return sprite(FIREBALL, FIRE_PALETTE, size, 'fireball');
    case 'blight':
      return sprite(BLIGHT, ROT, size, 'blight');
    default:
      return sprite(BLADE, STEEL, size, 'strike');
  }
}

/** The glyph on a shelf of skills. */
export function categoryIcon(id: string, size = 22): SVGSVGElement {
  switch (id) {
    case 'spell':
      return sprite(ORB, ARCANE, size, 'spell');
    case 'attack':
      return sprite(BLADE, STEEL, size, 'attack');
    case 'movement':
      return sprite(BOOT, LEATHER, size, 'movement');
    default:
      return sprite(SHARD, CRYSTAL, size, 'passive');
  }
}

/** Whatever this item is, give me something to put next to its name. */
export function itemIcon(item: Item, size = 26): SVGSVGElement {
  if (item.kind === 'crystal') {
    return crystalIcon((item.meta.level as number) ?? 1, size);
  }
  return gearIcon((item.meta.art as string) ?? 'body', size);
}

/** Quality → the CSS colour a slot border and a name should take. */
export const QUALITY_COLOUR: Record<string, string> = {
  rough: 'var(--dust)',
  seamed: 'var(--quartz)',
  faceted: 'var(--citrine)',
  brilliant: 'var(--ember)',
};
