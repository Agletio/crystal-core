/**
 * The bestiary. Same shape as the armour families: a creature declares its own
 * inks and its own frames, so nine of them share one alphabet in the source and
 * none of them share a colour on screen.
 *
 * `x` is the RANK accent — dull on a common one, lit on a magic, blazing on a
 * rare. The rank also grows the body and puts a halo round it; see `haloed`.
 */
import { mix, rows } from './gear-art';
import type { Palette } from './renderer';

export interface BeastTone {
  mass: (p: Palette) => string;
  lit: (p: Palette) => string;
  shade: (p: Palette) => string;
  eye: (p: Palette) => string;
}

export interface BeastArt {
  tone: BeastTone;
  frames: [string[], string[]];
}

export const BEASTIARY: Record<string, BeastArt> = {
  /** Low, wide and segmented. Almost no vertical presence: the thing you walk over. */
  grub: {
    tone: {
      mass: (p) => mix(p.verdite, p.rockDeep, 0.42),
    lit: (p) => mix(p.verdite, p.chalk, 0.22),
    shade: (p) => mix(p.verdite, p.void, 0.55),
    eye: (p) => p.citrine,
    },
    frames: [
      rows({
        4: '.....######.....',
        5: '...##mmmmmm##...',
        6: '..#mMsMMsMMsm#..',
        7: '.#mMMsMMsMMsMe#.',
        8: '.#MMsMMsMMsMMx#.',
        9: '.#mMMsMMsMMsMe#.',
        10: '..#mMsMMsMMsm#..',
        11: '...##m##m##m#...',
        12: '....#..#..#.....',
      }),
      rows({
        4: '.....######.....',
        5: '...##mmmmmm##...',
        6: '..#mMsMMsMMsm#..',
        7: '.#mMMsMMsMMsMe#.',
        8: '.#MMsMMsMMsMMx#.',
        9: '.#mMMsMMsMMsMe#.',
        10: '..#mMsMMsMMsm#..',
        11: '...#m##m##m##...',
        12: '.....#..#..#....',
      }),
    ],
  },
  /** A person, badly. Sunken eyes, a rib showing, arms too long for it. */
  husk: {
    tone: {
      mass: (p) => mix(p.bone, p.rockDeep, 0.5),
    lit: (p) => mix(p.bone, p.chalk, 0.3),
    shade: (p) => mix(p.bone, p.void, 0.62),
    eye: (p) => mix(p.venom, p.chalk, 0.2),
    },
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#eMem#.....',
        5: '.....#mMMm#.....',
        6: '......#ss#......',
        7: '....##mMMm##....',
        8: '...#MsMxxMsM#...',
        9: '...#M#MsMM#M#...',
        10: '...#M#MMsM#M#...',
        11: '....##MMMM##....',
        12: '.....#M##M#.....',
        13: '.....#M##M#.....',
        14: '.....#M##M#.....',
        15: '.....##..##.....',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#eMem#.....',
        5: '.....#mMMm#.....',
        6: '......#ss#......',
        7: '....##mMMm##....',
        8: '...#MsMxxMsM#...',
        9: '...#M#MsMM#M#...',
        10: '...#M#MMsM#M#...',
        11: '....##MMMM##....',
        12: '.....#MM#M#.....',
        13: '....#M#..#M#....',
        14: '....#M#..#M#....',
        15: '....##....##....',
      }),
    ],
  },
  /** A wedge on long legs. Nothing on it is vertical; it always looks mid-stride. */
  stalker: {
    tone: {
      mass: (p) => mix(p.citrine, p.rockDeep, 0.48),
    lit: (p) => mix(p.citrine, p.chalk, 0.25),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.ember,
    },
    frames: [
      rows({
        3: '............##..',
        4: '...#######mMe#..',
        5: '..#mMsMMsMMMx#..',
        6: '.#MMsMMsMMMM##..',
        7: '..#MsMMsMMM#....',
        8: '..#m#MM#Mm#.....',
        9: '.#M#.#M#.#M#....',
        10: '.#M#.#M#..#M#...',
        11: '.##..##....##...',
      }),
      rows({
        3: '............##..',
        4: '...#######mMe#..',
        5: '..#mMsMMsMMMx#..',
        6: '.#MMsMMsMMMM##..',
        7: '..#MsMMsMMM#....',
        8: '..#m#MM#Mm#.....',
        9: '..#M#M#M#M#.....',
        10: '.#M#..#M#.#M#...',
        11: '.##....##..##...',
      }),
    ],
  },
  /** A slab with a head sunk into it. Shoulders wider than anything else down here. */
  brute: {
    tone: {
      mass: (p) => mix(p.ember, p.rockDeep, 0.45),
    lit: (p) => mix(p.ember, p.citrine, 0.3),
    shade: (p) => mix(p.ember, p.void, 0.62),
    eye: (p) => p.flame,
    },
    frames: [
      rows({
        1: '....########....',
        2: '...#mMMMMMMm#...',
        3: '...#seMMMMes#...',
        4: '...##mMxxMm##...',
        5: '.###MMMMMMMM###.',
        6: '#mMMMMsxxsMMMMm#',
        7: '#MMMMMsxxsMMMMM#',
        8: '#mMMMMssssMMMMm#',
        9: '.#MMMMMMMMMMMM#.',
        10: '..#MM##..##MM#..',
        11: '..##m#....#m##..',
        12: '...#M#....#M#...',
        13: '...#M#....#M#...',
        14: '...#M#....#M#...',
        15: '...###....###...',
      }),
      rows({
        1: '....########....',
        2: '...#mMMMMMMm#...',
        3: '...#seMMMMes#...',
        4: '...##mMxxMm##...',
        5: '.###MMMMMMMM###.',
        6: '#mMMMMsxxsMMMMm#',
        7: '#MMMMMsxxsMMMMM#',
        8: '#mMMMMssssMMMMm#',
        9: '.#MMMMMMMMMMMM#.',
        10: '..#MM##..##MM#..',
        11: '..##m#....#m##..',
        12: '...#M#....#MM#..',
        13: '...#M#.....#M#..',
        14: '..#M#......#M#..',
        15: '..###......###..',
      }),
    ],
  },
  /** Four legs, no fur left. What is under the crust of ash is still burning. */
  cinder_hound: {
    tone: {
      mass: (p) => mix(p.flame, p.rockDeep, 0.55),
    lit: (p) => mix(p.flame, p.citrine, 0.25),
    shade: (p) => mix(p.rockDeep, p.void, 0.3),
    eye: (p) => p.flameCore,
    },
    frames: [
      rows({
        4: '..........####..',
        5: '.........#mMMe#.',
        6: '.##....##mMxxM#.',
        7: '#sm###mMMMMMM##.',
        8: '.#MmsxxsMMMM#...',
        9: '.#msxxsMMMm#....',
        10: '.#m#MM#MMm#.....',
        11: '.#M#.#M#.#M#....',
        12: '.##..##...##....',
      }),
      rows({
        4: '..........####..',
        5: '.........#mMMe#.',
        6: '.##....##mMxxM#.',
        7: '#sm###mMMMMMM##.',
        8: '.#MmsxxsMMMM#...',
        9: '.#msxxsMMMm#....',
        10: '.#m#MM#MMm#.....',
        11: '..#M#M#.#M#.....',
        12: '..##.##...##....',
      }),
    ],
  },
  /** Plated in broken rock. It does not hide; it simply looks like the floor. */
  shale_crawler: {
    tone: {
      mass: (p) => mix(p.rock, p.rockDeep, 0.35),
    lit: (p) => mix(p.rock, p.chalk, 0.3),
    shade: (p) => mix(p.rockDeep, p.void, 0.35),
    eye: (p) => p.quartz,
    },
    frames: [
      rows({
        3: '.....####.......',
        4: '...##mMMm##.....',
        5: '..#mMsxxsMm##...',
        6: '.#mMMsxxsMMMm#..',
        7: '.#MMsxxsMMMMMe#.',
        8: '.#mMMsMMsMMMMx#.',
        9: '..#mMsMMsMMMm#..',
        10: '..#m##m##m##m#..',
        11: '..#..#..#..#....',
      }),
      rows({
        3: '.....####.......',
        4: '...##mMMm##.....',
        5: '..#mMsxxsMm##...',
        6: '.#mMMsxxsMMMm#..',
        7: '.#MMsxxsMMMMMe#.',
        8: '.#mMMsMMsMMMMx#.',
        9: '..#mMsMMsMMMm#..',
        10: '...#m##m##m##m#.',
        11: '...#..#..#..#...',
      }),
    ],
  },
  /** Nothing solid at all. A knot of moving air with something bright at the centre. */
  gale_wisp: {
    tone: {
      mass: (p) => mix(p.quartz, p.rockDeep, 0.5),
    lit: (p) => mix(p.quartz, p.chalk, 0.3),
    shade: (p) => mix(p.quartz, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        2: '........####....',
        3: '.......#mMMm#...',
        4: '..##..#mMsxsM#..',
        5: '.#sm#.#Msxeexs#.',
        6: '..#ms##mMsxxsM#.',
        7: '...#mMMMsMMMm#..',
        8: '....#mMsMMMm#...',
        9: '.....##mMMm#....',
        10: '.......####.....',
      }),
      rows({
        2: '........####....',
        3: '.......#mMMm#...',
        4: '.##...#mMsxsM#..',
        5: '#sm#..#Msxeexs#.',
        6: '.#ms###mMsxxsM#.',
        7: '...#mMMMsMMMm#..',
        8: '....#mMsMMMm#...',
        9: '.....##mMMm#....',
        10: '.......####.....',
      }),
    ],
  },
  /** Low and armoured, with one claw far too big for it. Everything it touches frosts. */
  rime_crab: {
    tone: {
      mass: (p) => mix(p.quartz, p.void, 0.4),
    lit: (p) => mix(p.quartz, p.chalk, 0.45),
    shade: (p) => mix(p.quartz, p.void, 0.65),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '..........##....',
        5: '.........#xM#...',
        6: '..##.....#MM#...',
        7: '.#xM#....#MM#...',
        8: '.#MM######MM##..',
        9: '..#mMMsMMsMMMe#.',
        10: '..#MMsMMsMMMMx#.',
        11: '..#mMMsMMsMMMe#.',
        12: '...#m##m##m##...',
        13: '...#..#..#......',
      }),
      rows({
        4: '..........##....',
        5: '.........#xM#...',
        6: '..##.....#MM#...',
        7: '.#xM#....#MM#...',
        8: '.#MM######MM##..',
        9: '..#mMMsMMsMMMe#.',
        10: '..#MMsMMsMMMMx#.',
        11: '..#mMMsMMsMMMe#.',
        12: '....#m##m##m#...',
        13: '....#..#..#.....',
      }),
    ],
  },
  /** Small, and never where it was. The arc between its horns is the only warning. */
  sparkmite: {
    tone: {
      mass: (p) => mix(p.citrine, p.void, 0.35),
    lit: (p) => mix(p.citrine, p.chalk, 0.35),
    shade: (p) => mix(p.citrine, p.void, 0.6),
    eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '...#x#..#x#.....',
        5: '....#x##x#......',
        6: '...##mMMm##.....',
        7: '..#mMsxxsMm#....',
        8: '..#MseeesMM#....',
        9: '..#mMsxxsMm#....',
        10: '...##mMMm##.....',
        11: '....#m##m#......',
        12: '....##..##......',
      }),
      rows({
        4: '...#x#..#x#.....',
        5: '....#x##x#......',
        6: '...##mMMm##.....',
        7: '..#mMsxxsMm#....',
        8: '..#MseeesMM#....',
        9: '..#mMsxxsMm#....',
        10: '...##mMMm##.....',
        11: '...#m#..#m#.....',
        12: '...##....##.....',
      }),
    ],
  },

  // --- demonic --------------------------------------------------------
  //
  // Rot and ember. The family reads as heavy even on the small ones: thick
  // outlines, weight low in the frame, and a lit core showing through.

  /** Small, horned and hunched, arms nearly to the floor. The one that arrives first. */
  imp: {
    tone: {
      mass: (p) => mix(p.venom, p.rockDeep, 0.5),
      lit: (p) => mix(p.venom, p.citrine, 0.3),
      shade: (p) => mix(p.venom, p.void, 0.6),
      eye: (p) => p.ember,
    },
    frames: [
      rows({
        3: '...#x#....#x#...',
        4: '....#mMMMMm#....',
        5: '...#mMseesMm#...',
        6: '...#MMsxxsMM#...',
        7: '..##mMMMMMMm##..',
        8: '.#Ms#MMMMMM#sM#.',
        9: '.#M#.#MMMM#.#M#.',
        10: '.##..#mMMm#..##.',
        11: '.....#M##M#.....',
        12: '.....##..##.....',
      }),
      rows({
        3: '...#x#....#x#...',
        4: '....#mMMMMm#....',
        5: '...#mMseesMm#...',
        6: '...#MMsxxsMM#...',
        7: '.##mMMMMMMMMm##.',
        8: '#sM#MMMMMMMM#Ms#',
        9: '.#M#.#MMMM#.#M#.',
        10: '.##..#mMMm#..##.',
        11: '....#M#..#M#....',
        12: '....##....##....',
      }),
    ],
  },
  /** Tall and thin, with an arm on each side that is mostly edge. */
  flenser: {
    tone: {
      mass: (p) => mix(p.rust, p.void, 0.45),
      lit: (p) => mix(p.rust, p.chalk, 0.3),
      shade: (p) => mix(p.rust, p.void, 0.7),
      eye: (p) => p.flame,
    },
    frames: [
      rows({
        2: '.....####.......',
        3: '....#mMMm#......',
        4: '....#eMMe#......',
        5: '....##sx##......',
        6: '..###MMMM###....',
        7: '.#xsMMssMMsx#...',
        8: '.#x#MMMMMM#x#...',
        9: '.##.#MMMM#.##...',
        10: '.....#MM#.......',
        11: '....#M##M#......',
        12: '....#M##M#......',
        13: '....##..##......',
      }),
      rows({
        2: '.....####.......',
        3: '....#mMMm#......',
        4: '....#eMMe#......',
        5: '....##sx##......',
        6: '.###.MMMM.###...',
        7: '#xsM#MssM#Msx#..',
        8: '.#x##MMMM##x#...',
        9: '..##.#MM#.##....',
        10: '.....#MM#.......',
        11: '.....#MM#.......',
        12: '....#M##M#......',
        13: '...##....##.....',
      }),
    ],
  },
  /** A sack that got too full. Slow, wide, and lit from the inside. */
  bloat: {
    tone: {
      mass: (p) => mix(p.venom, p.ember, 0.4),
      lit: (p) => mix(p.venom, p.chalk, 0.28),
      shade: (p) => mix(p.venom, p.void, 0.68),
      eye: (p) => p.citrine,
    },
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '....##sMMs##....',
        5: '..###MMMMMM###..',
        6: '.#mMMMsxxsMMMm#.',
        7: '#mMMMsxeexsMMMm#',
        8: '#MMMMsxxxxsMMMM#',
        9: '#mMMMMsxxsMMMMm#',
        10: '.#mMMMMMMMMMMm#.',
        11: '..##MMMMMMMM##..',
        12: '....#M#..#M#....',
        13: '....##....##....',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '....##sMMs##....',
        5: '..###MMMMMM###..',
        6: '.#mMMMsxxsMMMm#.',
        7: '#mMMMsxeexsMMMm#',
        8: '#MMMMsxxxxsMMMM#',
        9: '#mMMMMsxxsMMMMm#',
        10: '.#mMMMMMMMMMMm#.',
        11: '..##MMMMMMMM##..',
        12: '...#M#....#M#...',
        13: '...##......##...',
      }),
    ],
  },
  /** The biggest thing in the family, and the horns arrive before it does. */
  hornfiend: {
    tone: {
      mass: (p) => mix(p.ember, p.void, 0.45),
      lit: (p) => mix(p.ember, p.flame, 0.45),
      shade: (p) => mix(p.ember, p.void, 0.72),
      eye: (p) => p.flameCore,
    },
    frames: [
      rows({
        1: '.#x#........#x#.',
        2: '.#M##########M#.',
        3: '..#mMMMMMMMMm#..',
        4: '..#MseMMMMesM#..',
        5: '..##MMMxxMMM##..',
        6: '.###MMMMMMMM###.',
        7: '#mMMMMsxxsMMMMm#',
        8: '#MMMMMsxxsMMMMM#',
        9: '#mMMMMssssMMMMm#',
        10: '.#MMMMMMMMMMMM#.',
        11: '..#MM##..##MM#..',
        12: '..##M#....#M##..',
        13: '...#M#....#M#...',
        14: '...#M#....#M#...',
        15: '...###....###...',
      }),
      rows({
        1: '.#x#........#x#.',
        2: '.#M##########M#.',
        3: '..#mMMMMMMMMm#..',
        4: '..#MseMMMMesM#..',
        5: '..##MMMxxMMM##..',
        6: '.###MMMMMMMM###.',
        7: '#mMMMMsxxsMMMMm#',
        8: '#MMMMMsxxsMMMMM#',
        9: '#mMMMMssssMMMMm#',
        10: '.#MMMMMMMMMMMM#.',
        11: '..#MM##..##MM#..',
        12: '..##M#....#MM#..',
        13: '...#M#.....#M#..',
        14: '..#M#......#M#..',
        15: '..###......###..',
      }),
    ],
  },
  /** Teeth on legs. There is no head to speak of — the whole front is the bite. */
  maw: {
    tone: {
      mass: (p) => mix(p.rust, p.ember, 0.35),
      lit: (p) => mix(p.rust, p.citrine, 0.35),
      shade: (p) => mix(p.rust, p.void, 0.6),
      eye: (p) => p.flame,
    },
    frames: [
      rows({
        4: '..############..',
        5: '.#mMMMMMMMMMMm#.',
        6: '#MsxsxsxsxsxsxM#',
        7: '#MeMMMMMMMMMMeM#',
        8: '#MsxsxsxsxsxsxM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '..#M#MM##MM#M#..',
        11: '..##.##..##.##..',
      }),
      rows({
        4: '..############..',
        5: '.#mMMMMMMMMMMm#.',
        6: '#MsxsxsxsxsxsxM#',
        7: '#MeMMMMMMMMMMeM#',
        8: '#Ms##########sM#',
        9: '.#mxsxsxsxsxsm#.',
        10: '..#MM#MM##MM#M#.',
        11: '..##..##..##.##.',
      }),
    ],
  },
  /** Robed and hooded, arms held out. Whatever it is saying is not for you. */
  chanter: {
    tone: {
      mass: (p) => mix(p.amethyst, p.void, 0.45),
      lit: (p) => mix(p.amethyst, p.chalk, 0.3),
      shade: (p) => mix(p.amethyst, p.void, 0.68),
      eye: (p) => p.venom,
    },
    frames: [
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#seem#.....',
        5: '.....##xx##.....',
        6: '...###MMMM###...',
        7: '..#xsMMMMMMsx#..',
        8: '..##MMsxxsMM##..',
        9: '...#MMMMMMMM#...',
        10: '...#mMMMMMMm#...',
        11: '...#MMMMMMMM#...',
        12: '...#mMMMMMMm#...',
        13: '...##########...',
      }),
      rows({
        2: '......####......',
        3: '.....#mMMm#.....',
        4: '.....#seem#.....',
        5: '.....##xx##.....',
        6: '.###.#MMMM#.###.',
        7: '#xs###MMMM###sx#',
        8: '..##MMsxxsMM##..',
        9: '...#MMMMMMMM#...',
        10: '...#mMMMMMMm#...',
        11: '...#MMMMMMMM#...',
        12: '..#mMMMMMMMMm#..',
        13: '..############..',
      }),
    ],
  },

  // --- crystal --------------------------------------------------------
  //
  // Bone-light and facets. Nothing in the family has a body in the way the
  // other two do: these are shapes held together, and they read as hollow.

  /** A splinter that has not decided which way is down. */
  shardling: {
    tone: {
      mass: (p) => mix(p.bone, p.quartz, 0.45),
      lit: (p) => mix(p.bone, p.chalk, 0.35),
      shade: (p) => mix(p.bone, p.void, 0.6),
      eye: (p) => p.quartz,
    },
    frames: [
      rows({
        4: '.......##.......',
        5: '......#Mx#......',
        6: '.....#MMeM#.....',
        7: '....#MsxxsM#....',
        8: '....#MseesM#....',
        9: '.....#MsxM#.....',
        10: '......#Mm#......',
        11: '.......##.......',
      }),
      rows({
        3: '.......##.......',
        4: '......#Mm#......',
        5: '.....#MsxM#.....',
        6: '....#MseesM#....',
        7: '....#MsxxsM#....',
        8: '.....#MMeM#.....',
        9: '......#Mx#......',
        10: '.......##.......',
      }),
    ],
  },
  /** Grown sideways across the floor on far too many legs. */
  lattice: {
    tone: {
      mass: (p) => mix(p.quartz, p.verdite, 0.35),
      lit: (p) => mix(p.quartz, p.chalk, 0.4),
      shade: (p) => mix(p.quartz, p.void, 0.62),
      eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '...####...####..',
        5: '..#mMM#..#MMm#..',
        6: '.##MsxM##MxsM##.',
        7: '#mMMseMMMMesMMm#',
        8: '#MMsxMMMMMMxsMM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '..#M##M##M##M#..',
        11: '..#..#..#..#....',
      }),
      rows({
        4: '...####...####..',
        5: '..#mMM#..#MMm#..',
        6: '.##MsxM##MxsM##.',
        7: '#mMMseMMMMesMMm#',
        8: '#MMsxMMMMMMxsMM#',
        9: '.#mMMMMMMMMMMm#.',
        10: '...#M##M##M##M#.',
        11: '...#..#..#..#...',
      }),
    ],
  },
  /** A rock that is hollow, and the hollow is looking back. */
  geode: {
    tone: {
      mass: (p) => mix(p.amethyst, p.rockDeep, 0.45),
      lit: (p) => mix(p.amethyst, p.chalk, 0.35),
      shade: (p) => mix(p.amethyst, p.void, 0.65),
      eye: (p) => p.quartz,
    },
    frames: [
      rows({
        3: '....######......',
        4: '..##mMMMMm##....',
        5: '.#mMsxxxxsMm#...',
        6: '#mMsxeeeexsMMm#.',
        7: '#MMsxeMMexsMMM#.',
        8: '#mMMsxxxxsMMMm#.',
        9: '.#mMMMMMMMMMm#..',
        10: '..##MM##MM##....',
        11: '...#M#..#M#.....',
        12: '...##....##.....',
      }),
      rows({
        3: '....######......',
        4: '..##mMMMMm##....',
        5: '.#mMsxxxxsMm#...',
        6: '#mMsxeeeexsMMm#.',
        7: '#MMsxeMMexsMMM#.',
        8: '#mMMsxxxxsMMMm#.',
        9: '.#mMMMMMMMMMm#..',
        10: '..##MM##MM##....',
        11: '..#M#....#M#....',
        12: '..##......##....',
      }),
    ],
  },
  /** A wedge held a hand above the floor, bright where it should be hollow. */
  prism: {
    tone: {
      mass: (p) => mix(p.quartz, p.amethyst, 0.5),
      lit: (p) => mix(p.chalk, p.quartz, 0.3),
      shade: (p) => mix(p.amethyst, p.void, 0.7),
      eye: (p) => p.chalk,
    },
    frames: [
      rows({
        3: '.......##.......',
        4: '......#MM#......',
        5: '.....#MsxM#.....',
        6: '....#MsxexM#....',
        7: '...#MsxeeexM#...',
        8: '..#MsxxeexxsM#..',
        9: '.#mMMsxxxxsMMm#.',
        10: '.##############.',
        11: '..############..',
      }),
      rows({
        2: '.......##.......',
        3: '......#MM#......',
        4: '.....#MsxM#.....',
        5: '....#MsxexM#....',
        6: '...#MsxeeexM#...',
        7: '..#MsxeeeexsM#..',
        8: '.#mMMsxxxxsMMm#.',
        9: '.##############.',
        10: '..############..',
      }),
    ],
  },
  /** A column taller than the hero, walking on the point it stands on. */
  spire: {
    tone: {
      mass: (p) => mix(p.bone, p.amethyst, 0.4),
      lit: (p) => mix(p.bone, p.chalk, 0.45),
      shade: (p) => mix(p.bone, p.void, 0.66),
      eye: (p) => p.citrine,
    },
    frames: [
      rows({
        1: '.......##.......',
        2: '......#Mx#......',
        3: '......#MM#......',
        4: '.....#MsxM#.....',
        5: '.....#MeeM#.....',
        6: '....#MMsxMM#....',
        7: '....#MsxxsM#....',
        8: '...#mMMxxMMm#...',
        9: '...#MMsxxsMM#...',
        10: '..#mMMMxxMMMm#..',
        11: '..#MMsxxxxsMM#..',
        12: '.#mMMMMMMMMMMm#.',
        13: '.##############.',
      }),
      rows({
        1: '......#..#......',
        2: '......#Mx#......',
        3: '.....#MMMM#.....',
        4: '.....#MsxM#.....',
        5: '.....#MeeM#.....',
        6: '....#MMsxMM#....',
        7: '....#MsxxsM#....',
        8: '...#mMMxxMMm#...',
        9: '...#MMsxxsMM#...',
        10: '..#mMMMxxMMMm#..',
        11: '..#MMsxxxxsMM#..',
        12: '.#mMMMMMMMMMMm#.',
        13: '..############..',
      }),
    ],
  },
  /** A ring of shards around a core, turning. You hear it before you see it. */
  chime: {
    tone: {
      mass: (p) => mix(p.citrine, p.quartz, 0.5),
      lit: (p) => mix(p.citrine, p.chalk, 0.4),
      shade: (p) => mix(p.citrine, p.void, 0.58),
      eye: (p) => p.chalk,
    },
    frames: [
      rows({
        4: '....#x#..#x#....',
        5: '....#MM##MM#....',
        6: '...##mMMMMm##...',
        7: '..#mMsxeexsMm#..',
        8: '..#MMsxeexsMM#..',
        9: '...##mMMMMm##...',
        10: '....#MM##MM#....',
        11: '....#m#..#m#....',
      }),
      rows({
        4: '.....##..##.....',
        5: '...#xMM##MMx#...',
        6: '...#mMMMMMMm#...',
        7: '..##MsxeexsM##..',
        8: '..##MsxeexsM##..',
        9: '...#mMMMMMMm#...',
        10: '...#xMM##MMx#...',
        11: '.....##..##.....',
      }),
    ],
  },
};

/** The frames alone, for the harness that only asks whether they are well formed. */
export const MONSTER_FRAMES: Record<string, string[][]> = Object.fromEntries(
  Object.entries(BEASTIARY).map(([id, art]) => [id, art.frames])
);

/** Common, magic, rare. The accent ink and the halo both key off this. */
export type MonsterRank = 'common' | 'magic' | 'rare';

export const HALO: Record<MonsterRank, string | null> = {
  common: null,
  magic: 'b',
  rare: 'o',
};

/**
 * A one-pixel ring around whatever the creature already is, so the border
 * follows its silhouette rather than boxing it. Grown outward only: a halo
 * that ate a pixel of the body would thin every leg it touched.
 */
export function haloed(frame: string[], ink: string | null): string[] {
  if (!ink) return frame;
  const lit = (x: number, y: number) => (frame[y]?.[x] ?? '.') !== '.';
  return frame.map((row, y) =>
    row
      .split('')
      .map((ch, x) => {
        if (ch !== '.') return ch;
        const near =
          lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1);
        return near ? ink : ch;
      })
      .join('')
  );
}
