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
  'open-trials': [
    '..........',
    '....##....',
    '...#++#...',
    '..#+##+#..',
    '.##.##.##.',
    '#+#.##.#+#',
    '.#..##..#.',
    '....##....',
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
  'open-settings': [
    '..........',
    '....##....',
    '.#.####.#.',
    '.########.',
    '..##++##..',
    '..##++##..',
    '.########.',
    '.#.####.#.',
    '....##....',
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
  'open-dev': [
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

const NS = 'http://www.w3.org/2000/svg';

/** Any grid of `#` ink and `+` accent as an SVG. The flasks draw through this
 *  too, on their own grid — the builder does not care how wide the art is. */
export function gridIcon(rows: string[], size: number, extra?: string): SVGSVGElement {
  const span = rows[0]?.length ?? GRID;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${span} ${rows.length}`);
  // `size` is the WIDTH and the height follows the grid, or a mark that is not
  // square is squashed into one. Every rail icon is 10x10, so this is a no-op
  // for them and the whole of what lets the title's mark be wider than it is
  // tall.
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round((size * rows.length) / span)));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('sicon');
  if (extra) svg.classList.add(extra);

  // One path per colour rather than a rect per pixel: a rail of thirteen icons
  // is 1300 cells, and most of them are nothing.
  const runs: Record<string, string[]> = { '#': [], '+': [], o: [] };
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#' || c === '+' || c === 'o') runs[c].push(`M${x} ${y}h1v1h-1z`);
    }
  });

  for (const [mark, cls] of [
    ['#', 'sicon__ink'],
    ['+', 'sicon__lit'],
    ['o', 'sicon__fill'],
  ] as const) {
    if (runs[mark].length === 0) continue;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', runs[mark].join(''));
    path.setAttribute('class', cls);
    svg.append(path);
  }
  return svg;
}

export function screenIcon(id: string, size = 18): SVGSVGElement | null {
  const rows = ICONS[id];
  return rows ? gridIcon(rows, size) : null;
}
