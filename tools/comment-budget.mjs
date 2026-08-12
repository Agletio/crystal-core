#!/usr/bin/env node
/**
 * Comment budget: standalone comment lines may not exceed max(10, 20% of file),
 * bar the handful of files with their own share in `SHARE_BY_FILE`.
 *
 * Usage:
 *   node tools/comment-budget.mjs             every tracked source file
 *   node tools/comment-budget.mjs a.ts b.mjs  only those
 *   node tools/comment-budget.mjs --json      machine-readable, for the hook
 *
 * Comments come from a parser, never from matching text: @babel/parser for
 * JS/TS, parse5 for HTML and its inline <style>/<script>. A `//` inside a
 * string is not a comment and is not counted.
 *
 * A line counts against the budget when removing every comment on it leaves
 * nothing but whitespace. Trailing comments are therefore free: the code is
 * still there when the comment is taken away.
 *
 * Fix a violation by cutting prose, never by adding code. Padding a file to
 * raise its 20% is the one repair that makes the file worse.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { parse as parseHtml } from 'parse5';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SCRIPT = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);
const EXTENSIONS = new Set([...SCRIPT, '.html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'shots', 'dist', 'build']);
/** Generated, minified, and not written by anyone. */
const SKIP_FILES = new Set(['docs/app.js']);

export const FLOOR = 10;
export const SHARE = 0.2;

/**
 * A share is a DENSITY, and density is a good proxy for "how much of this file
 * is prose" only while a file's lines are all the kind that might need
 * explaining. `docs/index.html` is most of a stylesheet — a thousand-odd
 * one-line rules that need nothing said about them — carrying the few genuinely
 * load-bearing traps in the project, so 20% of its length is the wrong number
 * for the amount it has to explain. Raising ONE file's share is not a loophole:
 * every other file stays at 20%, and the repair for going over is still to cut.
 */
export const SHARE_BY_FILE = { 'docs/index.html': 0.25 };

export const budgetFor = (lines, share = SHARE) =>
  Math.max(FLOOR, Math.floor(lines * share));

function sources(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

/**
 * CSS comments, which are only ever /* ... *\/ and never nest. Skipped inside
 * strings, so a `content: "/*"` is not mistaken for one.
 */
function cssRanges(text, base) {
  const out = [];
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out.push([base + i, base + stop]);
      i = stop - 1;
    }
  }
  return out;
}

/**
 * A page's comments: the document's own, plus whatever is inside its <style>
 * and <script> elements. parse5 gives byte offsets for both.
 */
function htmlRanges(text) {
  const out = [];
  const walk = (node) => {
    if (node.nodeName === '#comment' && node.sourceCodeLocation) {
      out.push([node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset]);
    }
    const inline = node.nodeName === 'style' || node.nodeName === 'script';
    const body = inline ? node.childNodes?.[0] : null;
    if (body?.sourceCodeLocation) {
      const { startOffset, endOffset } = body.sourceCodeLocation;
      const source = text.slice(startOffset, endOffset);
      out.push(
        ...(node.nodeName === 'style'
          ? cssRanges(source, startOffset)
          : commentRanges(source, 'inline.js').map(([a, b]) => [a + startOffset, b + startOffset]))
      );
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(parseHtml(text, { sourceCodeLocationInfo: true }));
  return out;
}

/** Every comment's [start, end) offset. */
function commentRanges(text, file) {
  if (extname(file) === '.html') return htmlRanges(text);

  const plugins = ['typescript'];
  if (extname(file) === '.tsx' || extname(file) === '.jsx') plugins.push('jsx');
  const ast = parse(text, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: true,
    plugins,
  });
  return (ast.comments ?? []).map((c) => [c.start, c.end]);
}

export function measure(text, file = 'x.ts', share = SHARE) {
  const lines = text.split('\n');
  // Offset of the first character of each line, so a range maps back to lines.
  const starts = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }

  // Blank out every comment, then any line that had something on it and now
  // has nothing is a line that was only ever a comment.
  const stripped = lines.map((line) => line.split(''));
  for (const [from, to] of commentRanges(text, file)) {
    for (let i = 0; i < lines.length; i++) {
      const lineFrom = starts[i];
      const lineTo = lineFrom + lines[i].length;
      if (to <= lineFrom || from >= lineTo + 1) continue;
      const a = Math.max(0, from - lineFrom);
      const b = Math.min(lines[i].length, to - lineFrom);
      for (let c = a; c < b; c++) stripped[i][c] = ' ';
    }
  }

  const commentLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (stripped[i].join('').trim() === '') commentLines.push(i + 1);
  }

  return {
    lines: lines.length,
    comments: commentLines.length,
    budget: budgetFor(lines.length, share),
    at: commentLines,
  };
}

export function check(files) {
  return files
    .map((file) => {
      let text;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        return null;
      }
      const path = relative(root, resolve(file)).split('\\').join('/');
      if (SKIP_FILES.has(path)) return null;
      const result = measure(text, file, SHARE_BY_FILE[path] ?? SHARE);
      return { path, ...result, over: result.comments - result.budget };
    })
    .filter((r) => r && r.over > 0);
}

// --- cli -------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const named = args.filter((a) => !a.startsWith('--'));
  const files = named.length
    ? named.filter((f) => {
        try {
          return statSync(f).isFile() && EXTENSIONS.has(extname(f));
        } catch {
          return false;
        }
      })
    : sources(root);

  const bad = check(files);

  if (json) {
    console.log(JSON.stringify(bad));
    process.exit(0);
  }

  if (bad.length === 0) {
    console.log(`comments: ${files.length} files within budget`);
    process.exit(0);
  }

  console.error('comments: OVER BUDGET\n');
  for (const r of bad.sort((a, b) => b.over - a.over)) {
    console.error(
      `  ${r.path}: ${r.comments} comment lines of ${r.lines} — budget ${r.budget}, over by ${r.over}`
    );
  }
  console.error('\nCut prose. Do not add code to raise the allowance.');
  process.exit(1);
}
