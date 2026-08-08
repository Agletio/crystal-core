#!/usr/bin/env node
/**
 * Runs the comment budget as soon as a file stops being edited.
 *
 * Wired as a PostToolUse hook on the editing tools plus a Stop hook. A file is
 * only checked once the agent moves to a different file — a run of edits on one
 * file is one change, and reporting on the half of it that exists so far would
 * be noise the agent has to argue with.
 *
 * Reads the hook payload on stdin. Exits 2 with the complaint on stderr, which
 * is what puts it back in front of the model.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const checker = join(here, 'comment-budget.mjs');

const payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
const stateDir = join(tmpdir(), 'crystal-comment-budget');
const stateFile = join(stateDir, `${payload.session_id ?? 'anon'}.json`);

const load = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return { open: null };
  }
};
const save = (state) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state));
};

/** The file this hook event is about, if any. */
function edited() {
  const path = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;
  return typeof path === 'string' ? resolve(path) : null;
}

function report(file) {
  if (!file || !existsSync(file)) return null;
  let out;
  try {
    out = execFileSync(process.execPath, [checker, '--json', file], {
      encoding: 'utf8',
      cwd: payload.cwd ?? process.cwd(),
    });
  } catch {
    return null;
  }
  const bad = JSON.parse(out || '[]');
  if (bad.length === 0) return null;
  const r = bad[0];
  return (
    `${r.path} is over its comment budget: ${r.comments} standalone comment lines ` +
    `of ${r.lines}, allowed ${r.budget}. Cut ${r.over} or more lines of prose — ` +
    `delete what the code already says, and never add code to raise the allowance.`
  );
}

const state = load();
const now = edited();
const isStop = !now;

// On Stop, whatever is still open gets checked. Otherwise the previously open
// file is finished exactly when a different one is touched.
const finished = isStop ? state.open : now !== state.open ? state.open : null;
save({ open: isStop ? null : now });

const complaint = report(finished);
if (complaint) {
  console.error(complaint);
  process.exit(2);
}
