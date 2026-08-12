/**
 * A glyph per screen, for the rail that replaced a row of words.
 *
 * Grid art like everything else the game draws: `#` is ink, `+` is the accent,
 * `.` is nothing. Ten by ten, because a rail icon is read at a glance and a
 * finer grid only buys detail nobody looks at. Inline SVG rather than a canvas
 * cell — these sit in buttons, and `CELL` does not bind them.
 */
const ICONS: Record<string, string[]> = {
  'open-inventory': [
    '..........',
    '..#....#..',
    '.########.',
    '.#+#..#+#.',
    '.########.',
    '.#+#..#+#.',
    '.########.',
    '..........',
    '..........',
    '..........',
  ],
  'open-craft': [
    '..........',
    '..######..',
    '.########.',
    '..######..',
    '....##....',
    '....##....',
    '..######..',
    '.########.',
    '##########',
    '..........',
  ],
  'open-shop': [
    '..........',
    '..######..',
    '.##++++##.',
    '.#+####+#.',
    '.#+#..#+#.',
    '.#+#..#+#.',
    '.#+####+#.',
    '.##++++##.',
    '..######..',
    '..........',
  ],
  'open-haul': [
    '..........',
    '.########.',
    '.#+....+#.',
    '.#.####.#.',
    '.#.#++#.#.',
    '.#.####.#.',
    '.#+....+#.',
    '.########.',
    '..........',
    '..........',
  ],
  'open-crystals': [
    '..........',
    '...####...',
    '..#++++#..',
    '.#++##++#.',
    '.#+####+#.',
    '..#++++#..',
    '...#++#...',
    '....##....',
    '..........',
    '..........',
  ],
  'open-stash': [
    '..........',
    '..######..',
    '.########.',
    '.#+####+#.',
    '.########.',
    '.#..##..#.',
    '.#..##..#.',
    '.########.',
    '..........',
    '..........',
  ],
  'open-character': [
    '..........',
    '....##....',
    '...####...',
    '....##....',
    '..######..',
    '.########.',
    '...####...',
    '...#..#...',
    '..##..##..',
    '..........',
  ],
  'open-skills': [
    '..........',
    '.##....##.',
    '.##....##.',
    '..#.##.#..',
    '...####...',
    '....##....',
    '...####...',
    '..##..##..',
    '..##..##..',
    '..........',
  ],
  'open-trade': [
    '..........',
    '...####...',
    '...#..#...',
    '...#..#...',
    '..#....#..',
    '..#++++#..',
    '.#++++++#.',
    '.#++++++#.',
    '..######..',
    '..........',
  ],
  'open-history': [
    '..........',
    '.########.',
    '.#......#.',
    '.#.####.#.',
    '.#......#.',
    '.#.####.#.',
    '.#......#.',
    '.########.',
    '..........',
    '..........',
  ],
  'open-save': [
    '..........',
    '.########.',
    '.#.####.#.',
    '.#.#..#.#.',
    '.#.####.#.',
    '.#......#.',
    '.#.####.#.',
    '.########.',
    '..........',
    '..........',
  ],
  'ui-hide': [
    '..........',
    '..........',
    '..........',
    '.##....##.',
    '..##..##..',
    '...####...',
    '....##....',
    '..........',
    '..........',
    '..........',
  ],
  'ui-full': [
    '..........',
    '.###..###.',
    '.#......#.',
    '.#......#.',
    '..........',
    '..........',
    '.#......#.',
    '.#......#.',
    '.###..###.',
    '..........',
  ],
  'dev-kit': [
    '..........',
    '..#....#..',
    '..######..',
    '....##....',
    '....##....',
    '....##....',
    '...####...',
    '...####...',
    '..........',
    '..........',
  ],
};

export const GRID = 10;

/** Every id that has one, so a rail cannot list a button with no glyph. */
export const hasIcon = (id: string): boolean => id in ICONS;

const NS = 'http://www.w3.org/2000/svg';

export function screenIcon(id: string, size = 18): SVGSVGElement | null {
  const rows = ICONS[id];
  if (!rows) return null;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${GRID} ${GRID}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('sicon');

  // One path per colour rather than a rect per pixel: a rail of thirteen icons
  // is 1300 cells, and most of them are nothing.
  const runs: Record<string, string[]> = { '#': [], '+': [] };
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#' || c === '+') runs[c].push(`M${x} ${y}h1v1h-1z`);
    }
  });

  for (const [mark, cls] of [
    ['#', 'sicon__ink'],
    ['+', 'sicon__lit'],
  ] as const) {
    if (runs[mark].length === 0) continue;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', runs[mark].join(''));
    path.setAttribute('class', cls);
    svg.append(path);
  }
  return svg;
}
