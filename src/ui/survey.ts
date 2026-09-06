/**
 * THE SURVEY. A zone's own map, laid out by hand: drag a node where it should
 * stand, join two of them, and shape the line between. What comes out is the
 * `sides:` and `links:` blocks for `LADDER.zones[z]`, so a zone is DRAWN
 * rather than read off a screenshot by eye.
 *
 * A LINK IS WALKED BY DEFAULT and hand-shaped only where the cave disagrees:
 * `src/cavepath.ts` is the same routing the authoring tools run, reading the
 * picture out of a canvas instead of a PNG, so a line here and a line there
 * cannot come apart.
 */
import { LADDER, PROVING, THEME_BY_ID } from '../data';
import { courseOf, mainId, depthOfId } from '../ladder';
import { SCENE_ART } from '../render/generated-scene';
import { readCave, thin, walkFrom } from '../cavepath';
import type { Cave } from '../cavepath';
import type { LinkDef, SideRoomDef } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const KEEP = 'crystal-core:survey';
const TOL = 1.3;

interface Plan {
  path: [number, number][];
  sides: SideRoomDef[];
  links: LinkDef[];
}

let zone = 0;
let plans: Record<number, Plan> = {};
/** What is picked: a node id, a link, or the main line's own waypoint. */
let held: { kind: 'node'; id: string } | { kind: 'link'; at: number }
  | { kind: 'way'; at: number } | null = null;
/** The node a link is being drawn FROM, if any. */
let joining: string | null = null;
let caves: Record<string, Cave> = {};
/** Whether the zone's picture has been read since it was swapped. */
let drawn = false;

const zoneArt = (z: number) => LADDER.zones[z]?.art ?? '';

/** THE PLAN AS IT SHIPS, which is where an edit starts. */
function shipped(z: number): Plan {
  const def = LADDER.zones[z];
  return {
    path: (def.path ?? []).map(([x, y]) => [x, y] as [number, number]),
    sides: (def.sides ?? []).map((s) => ({ ...s })),
    links: (def.links ?? []).map((l) => ({ ...l, path: l.path?.map(([x, y]) => [x, y] as [number, number]) })),
  };
}

const plan = (): Plan => (plans[zone] ??= shipped(zone));

function save(): void {
  try {
    globalThis.localStorage?.setItem(KEEP, JSON.stringify(plans));
  } catch { /* a private window is not a reason to stop drawing */ }
}

function load(): void {
  try {
    const had = globalThis.localStorage?.getItem(KEEP);
    if (had) plans = JSON.parse(had);
  } catch { plans = {}; }
}

/** WHERE A NODE STANDS. A depth is spread along the plan's own course, so
 *  dragging the line moves every depth on it at once. */
function spotOf(id: string): { x: number; y: number } | null {
  const p = plan();
  const depth = depthOfId(id);
  if (depth === null) {
    const room = p.sides.find((s) => s.id === id);
    return room ? { x: room.x, y: room.y } : null;
  }
  const rungs = LADDER.zones[zone].rungs;
  if (depth < 1 || depth > rungs) return null;
  return courseOf(p.path).at(rungs === 1 ? 0 : (depth - 1) / (rungs - 1));
}

/** THE PICTURE'S OWN PIXELS, read once a zone: the same cost grid the tools
 *  route over, so `Walk it` here and a traced link there agree. */
function caveFor(art: string): Cave | null {
  if (caves[art]) return caves[art];
  const shot = SCENE_ART[art];
  if (!shot || typeof document.createElement('canvas').getContext !== 'function') return null;
  const cv = document.createElement('canvas');
  cv.width = shot.w; cv.height = shot.h;
  const ctx = cv.getContext('2d');
  const img = $('survey-art') as HTMLImageElement;
  if (!ctx || !img.complete || img.naturalWidth === 0) return null;
  ctx.drawImage(img, 0, 0, shot.w, shot.h);
  try {
    caves[art] = readCave(ctx.getImageData(0, 0, shot.w, shot.h).data, shot.w, shot.h);
  } catch { return null; }
  return caves[art];
}

/** The route between two nodes, walked. Null where the picture joins nothing. */
function walkLink(link: LinkDef): [number, number][] | null {
  const a = spotOf(link.from), b = spotOf(link.to);
  const cave = a && b ? caveFor(zoneArt(zone)) : null;
  if (!a || !b || !cave) return null;
  const { route } = walkFrom(cave, [a.x, a.y]).routeTo([b.x, b.y]);
  return route.length ? thin(route, TOL).map(([x, y]) => [Math.round(x), Math.round(y)]) : null;
}

/** A line, rounded only at its corners — the climb's own drawing. */
function linePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  const BEND = 2.4;
  const at = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const run = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const k = Math.min(BEND, run / 2) / run;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const say = (p: { x: number; y: number }) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = `M ${say(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    d += ` L ${say(at(pts[i], pts[i - 1]))} Q ${say(pts[i])} ${say(at(pts[i], pts[i + 1]))}`;
  }
  return `${d} L ${say(pts[pts.length - 1])}`;
}

const linkPoints = (link: LinkDef): { x: number; y: number }[] => {
  const a = spotOf(link.from), b = spotOf(link.to);
  if (!a || !b) return [];
  return link.path ? link.path.map(([x, y]) => ({ x, y })) : [a, b];
};

/** WHAT THE BLOCKS SAY, ready to paste into `src/data.ts`. */
function blocks(): string {
  const p = plan();
  const say = (n: number) => Math.round(n);
  const rows = p.sides.map((s) =>
    `        { id: '${s.id}', name: '${s.name}', bonus: '${s.bonus}', ` +
    `x: ${say(s.x)}, y: ${say(s.y)} },`).join('\n');
  const ways = p.links.map((l) =>
    `        { from: '${l.from}', to: '${l.to}'` +
    (l.path ? `, path: ${JSON.stringify(l.path.map(([x, y]) => [say(x), say(y)]))}` : '') +
    ` },`).join('\n');
  return [
    `      path: ${JSON.stringify(p.path.map(([x, y]) => [say(x), say(y)]))},`,
    `      sides: [`, rows, `      ],`,
    `      links: [`, ways, `      ],`,
  ].join('\n');
}

/** A NEW ROOM gets an id nobody is using; the NAME and the BONUS are filled in
 *  when the plan lands in the table, which is what a template is for. */
function freeId(): string {
  const taken = new Set(plan().sides.map((s) => s.id));
  for (let n = 1; ; n++) if (!taken.has(`room${n}`)) return `room${n}`;
}

let dragging: { kind: 'node'; id: string } | { kind: 'way'; at: number }
  | { kind: 'bend'; link: number; at: number } | null = null;

function atPointer(e: PointerEvent): { x: number; y: number } {
  const box = $('survey-over').getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, (e.clientX - box.left) / box.width * 100)),
    y: Math.max(0, Math.min(100, (e.clientY - box.top) / box.height * 100)),
  };
}

function render(): void {
  const def = LADDER.zones[zone];
  const p = plan();
  // THE PICTURE IS BUILT ONCE and the overlay redrawn over it: rebuilding the
  // image every draw reloads it, and an `onload` that redraws never stops.
  const art = SCENE_ART[zoneArt(zone)];
  const img = $('survey-art') as HTMLImageElement;
  if (art && !img.src.endsWith(art.png.slice(-24))) {
    img.onload = () => { if (!drawn) { drawn = true; render(); } };
    img.src = art.png;
    drawn = false;
  }
  const stage = $('survey-over');
  stage.replaceChildren();

  const svg = svgEl('svg', { class: 'survey__lines', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
  stage.append(svg);

  // THE MAIN LINE, and its own waypoints: dragging one moves every depth.
  svg.append(svgEl('path', {
    class: 'survey__trunk', d: linePath(p.path.map(([x, y]) => ({ x, y }))),
  }));
  p.links.forEach((link, i) => {
    const pts = linkPoints(link);
    if (pts.length < 2) return;
    const line = svgEl('path', {
      class: `survey__link${held?.kind === 'link' && held.at === i ? ' survey__link--on' : ''}`,
      d: linePath(pts),
    });
    (line as unknown as HTMLElement).onclick = () => { held = { kind: 'link', at: i }; render(); };
    svg.append(line);
  });

  const put = (node: HTMLElement, x: number, y: number) => {
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    stage.append(node);
  };

  // A WAYPOINT of the main line, and of whichever link is picked.
  p.path.forEach(([x, y], i) => {
    const dot = el('button', 'survey__way') as HTMLButtonElement;
    dot.id = `survey-way-${i}`;
    dot.onpointerdown = (e) => { dragging = { kind: 'way', at: i }; held = { kind: 'way', at: i }; e.preventDefault(); };
    put(dot, x, y);
  });
  if (held?.kind === 'link') {
    const which = held.at;
    const link = p.links[which];
    (link?.path ?? []).forEach(([x, y], i) => {
      const dot = el('button', 'survey__way survey__way--bend') as HTMLButtonElement;
      dot.id = `survey-bend-${i}`;
      dot.onpointerdown = (e) => { dragging = { kind: 'bend', link: which, at: i }; e.preventDefault(); };
      put(dot, x, y);
    });
  }

  for (let d = 1; d <= def.rungs; d++) {
    const spot = spotOf(mainId(d));
    if (!spot) continue;
    const pip = el('button', 'survey__pip survey__pip--depth', String(d)) as HTMLButtonElement;
    pip.id = `survey-node-${mainId(d)}`;
    pip.onclick = () => pick(mainId(d));
    put(pip, spot.x, spot.y);
  }
  for (const room of p.sides) {
    const on = held?.kind === 'node' && held.id === room.id;
    const pip = el('button', `survey__pip${on ? ' survey__pip--on' : ''}` +
      (joining === room.id ? ' survey__pip--from' : ''), room.id.replace('room', 'R')) as HTMLButtonElement;
    pip.id = `survey-node-${room.id}`;
    pip.onpointerdown = (e) => { dragging = { kind: 'node', id: room.id }; e.preventDefault(); };
    pip.onclick = () => pick(room.id);
    put(pip, room.x, room.y);
  }

  ($('survey-out') as HTMLTextAreaElement).value = blocks();
  $('survey-said').textContent = joining
    ? `Joining from ${joining} — click the other end, or Join again to stop.`
    : held?.kind === 'link'
      ? `${p.links[held.at]?.from} to ${p.links[held.at]?.to}`
      : held?.kind === 'node' ? held.id : `${p.sides.length} rooms, ${p.links.length} links`;
}

function pick(id: string): void {
  const p = plan();
  if (joining && joining !== id) {
    const had = p.links.some((l) => (l.from === joining && l.to === id) || (l.from === id && l.to === joining));
    if (!had) p.links.push({ from: joining, to: id });
    joining = null;
    save();
  } else {
    held = { kind: 'node', id };
  }
  render();
}

function bar(): void {
  const row = $('survey-bar');
  row.replaceChildren();
  LADDER.zones.forEach((z, i) => {
    const tab = el('button', `mini${i === zone ? ' climbtab--on' : ''}`, z.name) as HTMLButtonElement;
    tab.id = `survey-zone-${i}`;
    tab.onclick = () => { zone = i; held = null; joining = null; render(); bar(); };
    row.append(tab);
  });
}

function tools(): void {
  const row = $('survey-tools');
  row.replaceChildren();
  const add = (id: string, name: string, go: () => void) => {
    const b = el('button', 'mini', name) as HTMLButtonElement;
    b.id = id;
    b.onclick = () => { go(); save(); render(); };
    row.append(b);
  };
  add('survey-add', 'Add room', () => {
    plan().sides.push({ id: freeId(), name: 'A room', bonus: 'coinfall', x: 50, y: 50 });
  });
  add('survey-join', 'Join', () => {
    joining = joining ? null : (held?.kind === 'node' ? held.id : null);
  });
  add('survey-drop', 'Delete', () => {
    const p = plan();
    if (held?.kind === 'link') { p.links.splice(held.at, 1); held = null; return; }
    if (held?.kind === 'node' && depthOfId(held.id) === null) {
      const gone = held.id;
      p.sides = p.sides.filter((s) => s.id !== gone);
      p.links = p.links.filter((l) => l.from !== gone && l.to !== gone);
      held = null;
    }
  });
  add('survey-walk', 'Walk it', () => {
    const p = plan();
    if (held?.kind !== 'link') return;
    const route = walkLink(p.links[held.at]);
    if (route) p.links[held.at] = { ...p.links[held.at], path: route };
  });
  add('survey-straight', 'Straighten', () => {
    const p = plan();
    if (held?.kind === 'link') delete p.links[held.at].path;
  });
  add('survey-bend', 'Add bend', () => {
    const p = plan();
    if (held?.kind !== 'link') return;
    const link = p.links[held.at];
    const pts = linkPoints(link);
    const mid = Math.max(1, Math.floor(pts.length / 2));
    const a = pts[mid - 1], b = pts[mid] ?? pts[mid - 1];
    const put: [number, number] = [Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2)];
    const was = link.path ?? pts.map((q) => [q.x, q.y] as [number, number]);
    link.path = [...was.slice(0, mid), put, ...was.slice(mid)];
  });
  add('survey-reset', 'Back to shipped', () => { plans[zone] = shipped(zone); held = null; });
  add('survey-copy', 'Copy the blocks', () => {
    const box = $('survey-out') as HTMLTextAreaElement;
    box.select();
    globalThis.navigator?.clipboard?.writeText(box.value).catch(() => { /* select it and copy */ });
  });
}

export function initSurvey(): void {
  load();
  $('survey-close').onclick = closeSurvey;
  globalThis.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const at = atPointer(e as PointerEvent);
    const p = plan();
    if (dragging.kind === 'node') {
      const room = p.sides.find((s) => s.id === (dragging as { id: string }).id);
      if (room) { room.x = Math.round(at.x); room.y = Math.round(at.y); }
    } else if (dragging.kind === 'way') {
      p.path[dragging.at] = [Math.round(at.x), Math.round(at.y)];
    } else {
      const link = p.links[dragging.link];
      if (link?.path) link.path[dragging.at] = [Math.round(at.x), Math.round(at.y)];
    }
    render();
  });
  globalThis.addEventListener('pointerup', () => {
    if (dragging) { dragging = null; save(); }
  });
}

export function openSurvey(): void {
  $('survey').hidden = false;
  bar();
  tools();
  render();
}

export const closeSurvey = (): void => { $('survey').hidden = true; };
export const isSurveyOpen = (): boolean => $('survey').hidden === false;
