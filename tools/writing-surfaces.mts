import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import { JSDOM } from 'jsdom';

/** A named declaration owns its copy, including strings inside its callbacks. */
export function copyGroups(source: string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const human = (s: string) => /[A-Za-z]/.test(s) && (/\s/.test(s) || /^[A-Z]/.test(s))
    && !/^[.#]|__|--|data:image|^https?:|\.png$|\.svg$|^translate\(|^rgb|^ L /.test(s);
  function collect(node: any, values: string[]) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'StringLiteral' && human(node.value)) values.push(node.value);
    if (node.type === 'TemplateLiteral') {
      const text = node.quasis.map((q: any, i: number) => q.value.cooked + (i < node.expressions.length ? '${…}' : '')).join('');
      if (human(text)) values.push(text);
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(v => collect(v, values));
      else if (value && typeof value === 'object') collect(value, values);
    }
  }
  for (const statement of ast.program.body) {
    const declaration: any = 'declaration' in statement ? statement.declaration : statement;
    if (!declaration) continue;
    const nodes = declaration.type === 'VariableDeclaration' ? declaration.declarations : [declaration];
    for (const node of nodes) {
      const name = node.id?.name;
      if (!name) continue;
      const values: string[] = [];
      collect(node, values);
      if (values.length) groups.set(name, values);
    }
  }
  return groups;
}

export function menuSources(): string[] {
  return [...readdirSync('src/ui').filter(f => f.endsWith('.ts')).map(f => `src/ui/${f}`),
    'src/crafting.ts', 'src/professions.ts', 'src/ladder.ts', 'src/economy.ts', 'src/web.ts',
    ...readdirSync('src/game').filter(f => f.endsWith('.ts')).map(f => `src/game/${f}`)];
}

/** DOM IDs identify static labels; markup structure and bindings stay in HTML. */
export function htmlGroups(source: string): Map<string, string[]> {
  const dom = new JSDOM(source);
  const doc = dom.window.document;
  const groups = new Map<string, string[]>();
  function add(id: string, text: string) {
    const values = groups.get(id) ?? [];
    values.push(text.trim());
    groups.set(id, values);
  }
  const walker = doc.createTreeWalker(doc.body, dom.window.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement!;
    const id = parent.closest('[id]')?.id;
    if (id && node.textContent?.trim() && !parent.closest('script,style')) add(id, node.textContent);
  }
  for (const element of doc.querySelectorAll('[title],[placeholder],[aria-label]')) {
    const id = element.closest('[id]')?.id;
    if (!id) throw new Error('Copy attribute needs a stable DOM ID');
    for (const attr of ['title', 'placeholder', 'aria-label']) {
      if (element.hasAttribute(attr)) add(`${id}.${attr}`, element.getAttribute(attr)!);
    }
  }
  dom.window.close();
  return groups;
}

export const readCopyGroups = (path: string) => copyGroups(readFileSync(path, 'utf8'));
