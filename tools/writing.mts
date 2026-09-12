import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';
import { BUILT_TREES, faceOf } from '../src/skills-tree';
import { TRADES } from '../src/trades';
import { PLAYER_SKILLS } from '../src/data';
import { KEYWORDS } from '../src/keywords';
import { GRANT_BY_ID } from '../src/sim/grants';

export type Status = 'pending' | 'reviewed' | 'stale' | 'blocked';
type Entry = {
  id: string; location: { file: string; selector: string }; text: unknown;
  implementation: string[]; mechanicsRevision: string; textRevision: string;
  status: Status; reviewedMechanicsRevision: string | null;
  reviewedTextRevision: string | null; reviewedAtCommit: string | null; notes: string;
};
const file = 'writing/entries.json';
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const copyKeys = new Set(['name', 'description', 'text', 'lore', 'blurb', 'becomes', 'what', 'say', 'means', 'short', 'says']);
export function mechanical(v: any): any {
  if (Array.isArray(v)) return v.map(mechanical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v)
    .filter(([k]) => !copyKeys.has(k)).map(([k, x]) => [k, mechanical(x)]));
  return v;
}
const fingerprints = new Map<string, string>();
export function sourceRevision(path: string): string {
  const held = fingerprints.get(path);
  if (held) return held;
  const ast = parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['typescript'] });
  function clean(v: any): any {
    if (Array.isArray(v)) return v.map(clean);
    if (!v || typeof v !== 'object') return v;
    if (v.type === 'ObjectProperty' && copyKeys.has(v.key?.name ?? v.key?.value)) {
      return { type: 'CopyProperty', key: v.key?.name ?? v.key?.value };
    }
    return Object.fromEntries(Object.entries(v).filter(([k]) =>
      !['start', 'end', 'loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(k)
    ).map(([k, x]) => [k, clean(x)]));
  }
  const result = hash(clean(ast));
  fingerprints.set(path, result);
  return result;
}
export function reconcile(current: Entry[], previous: Entry[]): Entry[] {
  const old = new Map(previous.map(e => [e.id, e]));
  return current.map(e => {
    const before = old.get(e.id);
    if (!before) return e;
    const changed = before.reviewedMechanicsRevision !== e.mechanicsRevision || before.reviewedTextRevision !== e.textRevision;
    return { ...e, status: before.status === 'blocked' ? 'blocked' :
      before.status === 'pending' ? 'pending' : changed ? 'stale' : before.status,
      reviewedMechanicsRevision: before.reviewedMechanicsRevision,
      reviewedTextRevision: before.reviewedTextRevision, reviewedAtCommit: before.reviewedAtCommit,
      notes: before.notes };
  });
}
export function inventory(): Entry[] {
  const out: Entry[] = [];
  const common = ['src/data.ts', 'src/sim/stats.ts', 'src/sim/grants.ts', 'src/sim/run.ts',
    'src/sim/skills.ts', 'src/sim/movers.ts', 'src/mods.ts', 'src/skills-tree.ts', 'src/trades.ts',
    'src/trees/layout.ts', 'src/trades/layout.ts', 'src/webgraph.ts', 'src/sim/character.ts'];
  function add(id: string, path: string, selector: string, text: unknown, rules: unknown) {
    const implementation = [...new Set([path, ...common])];
    out.push({ id, location: { file: path, selector }, text, implementation,
      mechanicsRevision: hash([mechanical(rules), implementation.map(p => [p, sourceRevision(p)])]),
      textRevision: hash(text), status: 'pending', reviewedMechanicsRevision: null,
      reviewedTextRevision: null, reviewedAtCommit: null, notes: '' });
  }
  function nodeEntries(prefix: string, path: string, node: any) {
    const id = `${prefix}.${node.id}`;
    add(id, path, `node:${node.id}`, { name: node.name, description: node.description, ...(node.becomes ? { becomes: node.becomes } : {}) }, node);
    for (const c of node.choices ?? []) add(`${id}.choice.${c.id}`, path, `node:${node.id}/choice:${c.id}`, { name: c.name, description: c.description }, c);
    for (const [mode, face] of Object.entries(node.under ?? {})) add(`${id}.under.${mode}`, path, `node:${node.id}/under:${mode}`, { description: (face as any).description }, face);
    if (prefix.startsWith('talent.')) {
      for (const [grant, value] of Object.entries(node.grants ?? {})) {
        const said = GRANT_BY_ID[grant]?.say?.(value);
        if (said) add(`${id}.grant.${grant}`, 'src/sim/grants.ts', `grant:${grant}/node:${node.id}`, said, { grant, value });
      }
    }
  }
  for (const tree of BUILT_TREES) {
    const id = tree.spec.skillId;
    const dir = ['blink', 'leap', 'gale'].includes(id) ? 'moves' : 'trees';
    const path = `src/${dir}/${id}.ts`;
    for (const node of tree.nodes) {
      nodeEntries(`skill.${id}`, path, node);
      for (const mode of tree.nodes.filter(n => n.keystone && !node.keystone && !node.under?.[n.id])) {
        const face = faceOf(id, node, [mode.id]);
        add(`skill.${id}.${node.id}.under.${mode.id}`, path, `node:${node.id}/converted:${mode.id}`,
          { description: face.description }, face);
      }
    }
  }
  for (const trade of TRADES) {
    const path = `src/trades/${trade.spec.id}.ts`;
    add(`character.${trade.spec.id}`, path, `trade:${trade.spec.id}`, {
      name: trade.spec.name, lore: trade.spec.lore, blurb: trade.spec.blurb,
      short: trade.spec.baseline.short, says: trade.spec.baseline.says,
    }, trade.spec);
    for (const node of trade.nodes) nodeEntries(`talent.${trade.spec.id}`, path, node);
  }
  for (const skill of PLAYER_SKILLS) add(`skill.${skill.id}.card`, 'src/data.ts', `skill:${skill.id}`, { name: skill.name, description: skill.description }, skill);
  for (const k of KEYWORDS) add(`keyword.${k.id}`, 'src/keywords.ts', `keyword:${k.id}`, { name: k.name, means: k.means }, k);
  if (new Set(out.map(e => e.id)).size !== out.length) throw new Error('Duplicate writing identifier');
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
function main() {
  const [command = 'check', ...args] = process.argv.slice(2);
  let previous: Entry[] = [];
  try { previous = JSON.parse(readFileSync(file, 'utf8')); } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
  const entries = reconcile(inventory(), previous);
  if (command === 'review' || command === 'block') {
    const [prefix, ...note] = args;
    if (!prefix || !note.length) throw new Error('Supply an exact ID or prefix and a review note.');
    const selected = entries.filter(e => e.id === prefix || e.id.startsWith(`${prefix}.`));
    if (!selected.length) throw new Error(`No entries match ${prefix}`);
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    for (const e of selected) {
      if (command === 'review' && e.status === 'blocked') throw new Error(`Resolve ${e.id} explicitly before review.`);
      e.status = command === 'review' ? 'reviewed' : 'blocked';
      e.notes = note.join(' ');
      if (command === 'review') {
        e.reviewedMechanicsRevision = e.mechanicsRevision;
        e.reviewedTextRevision = e.textRevision;
        e.reviewedAtCommit = commit;
      }
    }
  } else if (!['sync', 'check', 'report'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const counts = Object.fromEntries(['pending', 'reviewed', 'stale', 'blocked'].map(s => [s, entries.filter(e => e.status === s).length]));
  console.log(JSON.stringify(counts));
  const deleted = previous.filter(e => !entries.some(n => n.id === e.id));
  if (deleted.length) console.log(`Removed from source: ${deleted.map(e => e.id).join(', ')}`);
  if (command === 'check') {
    if (JSON.stringify(entries) !== JSON.stringify(previous)) throw new Error('Writing inventory changed. Run writing:sync; reviewed copy may be stale.');
    if (counts.stale) throw new Error(`${counts.stale} stale entries need review or an explicit blocker.`);
  } else if (command !== 'report') {
    mkdirSync('writing', { recursive: true });
    writeFileSync(file, JSON.stringify(entries, null, 2) + '\n');
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/writing.mts')) main();
