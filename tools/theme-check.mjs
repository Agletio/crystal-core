#!/usr/bin/env node
/**
 * One art direction, proven. Two ways a screen keeps the old look while
 * everything round it moves, both invisible to a shot of some OTHER screen: a
 * rule writing a COLOUR by hand, which the palette then moves without; and a
 * rule naming a token nobody DEFINED, which is invalid at computed-value time
 * — not an error, the property silently inherits and a border comes out the
 * colour of the text. A translucent overlay is a TREATMENT, and is left.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = 'docs/index.html';
const text = readFileSync(resolve(root, file), 'utf8');

/** Set by JS at runtime, so declared where they are computed. */
const RUNTIME = new Set(['--cols', '--dock-h', '--sx', '--sy', '--wx', '--wy']);

const open = text.indexOf(':root {');
const close = text.indexOf('\n  }', open);
if (open < 0 || close < 0) {
  console.error(`theme: no :root block in ${file}`);
  process.exit(1);
}
const declarations = text.slice(open, close);
const rest = text.slice(close);

const problems = [];

const defined = new Set([...declarations.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
for (const [, name] of rest.matchAll(/var\((--[a-z0-9-]+)/g)) {
  if (!defined.has(name) && !RUNTIME.has(name)) problems.push(`${name} is used but never defined`);
}

const before = text.slice(0, close).split('\n').length; // a hex 'somewhere' is a hunt
rest.split('\n').forEach((line, i) => {
  const hex = line.match(/#[0-9a-fA-F]{3,8}\b/);
  if (hex) problems.push(`${file}:${before + i} writes ${hex[0]} instead of naming a token`);
});

if (problems.length) {
  console.error('theme: OVER THE LINE\n');
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  console.error('\nEvery colour belongs in :root. Name it there and use var().');
  process.exit(1);
}
console.log(`theme: ${defined.size} tokens, every colour named and every one defined`);
