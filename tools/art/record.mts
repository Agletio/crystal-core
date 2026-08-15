/**
 * What came BACK, read off the server.   `record.mts [sprite ...]`
 *
 * `generated.json` decides what ships, and its group ids used to be copied
 * across by HAND — the step that pointed a whole roster at another character's
 * groups, which the server refuses and no file checks. They are read off
 * `get_character` now, matched by the `<sprite>_<state>` name the queue gives.
 *
 * What a human decides is KEPT: `grid`, `inks`, `stride`, `luma` and the
 * `from`/`to` window. Only the ids are the server's to say.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { callTool } from './mcp.mts';

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
type State = { group: string; frames: number; from?: number; to?: number };
type Row = { sprite: string; character?: string; states: Record<string, State> } & Record<string, unknown>;

const asks = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as {
  face: string;
  bodies: { sprite: string; character?: string; states: Record<string, unknown> }[];
};
const made = JSON.parse(readFileSync(here('generated.json'), 'utf8')) as {
  hero: Row;
  bodies: Row[];
  [key: string]: unknown;
};

const want = new Set(process.argv.slice(2));
const rows = [made.hero, ...made.bodies];

for (const ask of asks.bodies) {
  if (!ask.character || (want.size && !want.has(ask.sprite))) continue;
  const row = rows.find((r) => r.sprite === ask.sprite);
  if (!row) {
    console.log(`${ask.sprite}: no row in generated.json — add one first`);
    continue;
  }
  const text = await callTool('get_character', { character_id: ask.character });
  const found = new Map<string, State>();
  for (const line of text.split('\n')) {
    const m = /^ {2}(\S+) — \d+ dir \([^)]*\), (\d+)f .*\[group: ([0-9a-f-]{36})\]/.exec(line);
    if (!m) continue;
    const state = m[1].startsWith(`${ask.sprite}_`) ? m[1].slice(ask.sprite.length + 1) : m[1];
    if (state in ask.states) found.set(state, { group: m[3], frames: Number(m[2]) });
  }

  const states: Record<string, State> = {};
  for (const name of Object.keys(ask.states)) {
    const got = found.get(name);
    if (!got) {
      console.log(`  ${ask.sprite}/${name}: NOTHING on the character`);
      continue;
    }
    const held = row.states?.[name];
    states[name] = {
      group: got.group,
      frames: held?.frames ?? got.frames,
      ...(held?.from === undefined ? {} : { from: held.from }),
      ...(held?.to === undefined ? {} : { to: held.to }),
    };
  }
  row.character = ask.character;
  row.dirs = [asks.face];
  row.states = states;
  console.log(
    `${ask.sprite}: ${Object.keys(states).length}/${Object.keys(ask.states).length} states` +
      ` — ${Object.entries(states).map(([n, s]) => `${n} ${s.frames}f`).join(', ')}`
  );
}

writeFileSync(here('generated.json'), `${JSON.stringify(made, null, 1)}\n`);
console.log('generated.json written');
