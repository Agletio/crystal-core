/**
 * Little item icons, as inline SVG so they scale with font size and cost nothing
 * to re-render. Procedural placeholders: a shape that reads at a glance, not
 * art, and swappable for a real asset one function at a time.
 */
import { monsterArt } from '../render/sprites';
import { portraitOf } from '../render/portraits';
import { readPalette } from '../render/renderer';
import { GENERATED_ICONS } from '../render/generated-icons';
import type { CurrencyDef, Item } from '../types';
import { MATERIAL_BY_ID } from '../data';

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

/** The passive: a spark caught mid-burst. Never a weapon — it swings nothing. */
const SURGE = [
  '.....oo.....',
  '....owwo....',
  '.o..owwo..o.',
  '.oo.oyyo.oo.',
  '..oooyyooo..',
  '...oyyyyo...',
  '.ooyywwyyoo.',
  '...oyyyyo...',
  '..oooyyooo..',
  '.oo.oyyo.oo.',
  '.o..owwo..o.',
  '....oooo....',
];

/** The movement skill: a figure and where it just was. */
const BLINK = [
  '..o......o..',
  '.osso...ohho',
  '.osso...ohho',
  '..oo.....oo.',
  '.osso...ohho',
  'ossso..ohhho',
  '.osso...ohho',
  '..oo.....oo.',
  '.osso...ohho',
  '.osso...ohho',
  '..o......o..',
  '............',
];


/** The two silhouettes the SKILL shelf still falls back to for an id nobody
 *  has drawn. Gear draws none of these any more. */
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


const STEEL = { o: INK, s: '#B9C2CC', d: '#7A8492', g: 'var(--citrine)', h: '#6B4526' };
const STORM = { o: INK, y: 'var(--citrine)', w: '#FFF7CC', d: '#7A8492', h: '#6B4526' };
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

export function crystalIcon(level: number, size = 26, family = 'normal'): SVGSVGElement {
  const t = Math.max(1, Math.min(GEMS.length, level));
  const art = drawn(`crys_${family}_t${Math.min(4, t)}`, size);
  if (art) return art;
  const colour = CRYSTAL_COLOURS[t - 1] ?? 'var(--amethyst)';
  return sprite(GEMS[t - 1], { o: INK, c: colour, w: 'var(--chalk)', l: '#00000066' }, size, `crystal-t${t}`);
}

/**
 * One silhouette per slot, as pixels. Deliberately generic — the job is telling
 * a helm from a boot at a glance, not looking good.
 */




const FORKED = [
  '.......oo...',
  '......oywo..',
  '.....oyywo..',
  '....oyywo...',
  '...oyywo....',
  '..oyyyyyo...',
  '...oyywwo...',
  '....oyywo...',
  '.....oywo...',
  '......oyo...',
  '.......oo...',
];

const ARROW = [
  '........ooo.',
  '.......oywo.',
  '......oyywo.',
  '.....oyyoo..',
  '....oyyo....',
  '...oyyo.....',
  '..oyyo......',
  '.ohyo.......',
  'odho........',
  'oddo........',
  'ooo.........',
];








/**
 * THE GEAR ICON, and there is NO fallback: every one of the 59 `GearBase.art`
 * keys is a generated row and the demo holds that. The hand-drawn silhouettes
 * that used to stand behind this are gone — *"delete all of that old self made
 * crap and use the new icons"* — and with them the drift that let the floor
 * draw one picture while the bag drew another.
 */
export function gearIcon(art: string, size = 26): SVGSVGElement {
  return drawn(`gear_${art}`, size) ?? sprite(['.'], { '.': INK }, size, art);
}

/** Whether a base's art has been drawn. Pure, so the demo can hold the line. */
export const hasGearArt = (art: string): boolean => !!GENERATED_ICONS[`gear_${art}`];

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
  const own = drawn(`cur_${currency.id}`, size); // generated wins, as everywhere
  if (own) return own;
  const colour = CLASS_COLOURS[currency.class] ?? 'var(--dust)';
  // An unknown currency still gets a shape rather than nothing, so adding one
  // to the table is a visual to-do rather than an invisible bug.
  const rows = SIGILS[currency.id] ?? SIGILS.gold;
  return sprite(rows, { o: INK, c: colour, w: 'var(--chalk)' }, size, currency.id);
}

/** Skill icons, for the middle of a tree. */
/** A generated icon carries its OWN colours, where a hand-drawn one looks every
 *  character up in the palette — so `sprite` is handed the key directly. */
export function drawn(id: string, size: number): SVGSVGElement | null {
  const art = GENERATED_ICONS[id];
  return art ? sprite(art.rows, art.key, size, id) : null;
}

export function skillIcon(skillId: string, size = 44): SVGSVGElement {
  // Generated WINS, and generated is the ONLY way a new one arrives: the grids
  // below predate the pipeline and are the fallback for an id nobody has drawn.
  // A new skill is a row in `tools/art/icons.json`, never a grid typed here.
  const own = drawn(`sk_${skillId}`, size);
  if (own) return own;
  switch (skillId) {
    case 'fireball':
    case 'bolt':
      return sprite(FIREBALL, FIRE_PALETTE, size, 'fireball');
    case 'blight':
      return sprite(BLIGHT, ROT, size, 'blight');
    case 'arc_lightning':
    case 'arc':
      return sprite(FORKED, STORM, size, 'arc_lightning');
    case 'lightning_arrow':
      return sprite(ARROW, STORM, size, 'lightning_arrow');
    case 'surge':
      return sprite(SURGE, STEEL, size, 'surge');
    case 'blink':
      return sprite(BLINK, STEEL, size, 'blink');
    default:
      return sprite(BLADE, STEEL, size, 'strike');
  }
}

/** The glyph on a shelf of skills. Generated wins, same as a skill's own. */
export function categoryIcon(id: string, size = 22): SVGSVGElement {
  const own = drawn(`cat_${id}`, size);
  if (own) return own;
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
/**
 * A creature — or a person — out of the bestiary, as an SVG rather than as a
 * canvas. The same grids and the same inks the map draws, so a portrait beside
 * some words is unmistakably the thing you are standing in front of.
 *
 * The palette is read at CALL time off the live document, which is what keeps
 * the colours out of this file: the art is characters, and what a character
 * means is a CSS custom property.
 */
export function beastIcon(id: string, size = 34): SVGSVGElement | null {
  const art = monsterArt(readPalette(document.body), id, 0, 'common');
  return art ? sprite(art.rows, art.key, size, `beast-${id}`) : null;
}

/**
 * The face of whoever is speaking, at its own grid rather than the map's. Falls
 * back to the map sprite, so a speaker with no portrait drawn yet is a small
 * picture rather than an empty box.
 */
/** How big a face is drawn, in the two places one appears. A bubble is 300px
 *  of 13px prose and a head reads against it at 52; a FRAMED panel puts the
 *  same head beside a display-face title and it read as an afterthought. */
export const FACE = { bubble: 52, panel: 78 };

export function portraitIcon(id: string, size = 96): SVGSVGElement | null {
  const art = portraitOf(id);
  if (!art) return beastIcon(id, size);
  return sprite(art.rows, art.ink(readPalette(document.body)), size, `face-${id}`);
}

/**
 * A relic is one silhouette each. A skull with the jaw on is the shape that
 * reads as "a body" at twelve pixels; the dust is grains, all the same shape,
 * which is the whole of what the man who wants it says about it.
 */
const SPECIMEN = [
  '...oooooo...',
  '..obbbbbbo..',
  '.obbbbbbbbo.',
  'obbbbbbbbbbo',
  'obbllbbllbbo',
  'oblLLbbLLlbo',
  'obbllbbllbbo',
  'obbbbwwbbbbo',
  '.obbbwwbbbo.',
  '..obbbbbbo..',
  '..oblllllo..',
  '...oooooo...',
];

const DUST = [
  '............',
  '...o..o.....',
  '..occo..o...',
  '..occo.occo.',
  '...oo..occo.',
  '.o..o...oo..',
  'occo...o....',
  'occo..occo..',
  '.oo...occo..',
  '...o...oo...',
  '..occo......',
  '..occo...o..',
];

const RELIC_ART: Record<string, string[]> = {
  pristine_specimen: SPECIMEN,
  prismatic_dust: DUST,
};

export const relicIcon = (id: string, size = 26): SVGSVGElement =>
  sprite(
    RELIC_ART[id] ?? SPECIMEN,
    {
      o: INK,
      b: 'var(--chalk)',
      l: 'var(--dust)',
      L: 'var(--void)',
      w: 'var(--rust)',
      c: 'var(--pearl)',
    },
    size,
    `relic-${id}`
  );

export function itemIcon(item: Item, size = 26): SVGSVGElement {
  if (item.kind === 'crystal') {
    return crystalIcon((item.meta.level as number) ?? 1, size, (item.meta.family as string) ?? 'normal');
  }
  if (item.kind === 'relic') return relicIcon(item.base, size);
  if (item.kind === 'material') {
    const own = drawn(MATERIAL_BY_ID[item.base]?.icon ?? '', size);
    if (own) return own;
  }
  return gearIcon((item.meta.art as string) ?? 'body', size);
}
