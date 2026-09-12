import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, mechanical, sourceRevision } from './writing.mts';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';

const entry = (changes: any = {}) => ({ id: 'skill.example.node', status: 'pending',
  textRevision: 'copy-1', mechanicsRevision: 'rules-1', reviewedTextRevision: null,
  reviewedMechanicsRevision: null, reviewedAtCommit: null, notes: '', ...changes });
const reviewed = entry({ status: 'reviewed', reviewedTextRevision: 'copy-1',
  reviewedMechanicsRevision: 'rules-1', reviewedAtCommit: 'commit-1', notes: 'Read implementation; kept copy.' });

test('new text is pending and unchanged reviewed text stays reviewed', () => {
  assert.equal(reconcile([entry()], [])[0].status, 'pending');
  assert.equal(reconcile([entry()], [reviewed])[0].status, 'reviewed');
});
test('mechanics and copy changes independently make a review stale', () => {
  for (const changes of [{ mechanicsRevision: 'rules-2' }, { textRevision: 'copy-2' }]) {
    const result = reconcile([entry(changes)], [reviewed])[0];
    assert.equal(result.status, 'stale');
    assert.equal(result.reviewedTextRevision, 'copy-1');
    assert.equal(result.reviewedMechanicsRevision, 'rules-1');
  }
});
test('sync never promotes pending or clears a blocker', () => {
  for (const status of ['pending', 'blocked']) {
    assert.equal(reconcile([entry({ mechanicsRevision: 'rules-2' })], [entry({ status })])[0].status, status);
  }
});
test('mechanical snapshots ignore prose but retain values, conditions and alternate modes', () => {
  const rules = { name: 'Node', description: 'Old copy', grants: { more: 0.2 }, under: { mode: { grants: { more: 0.3 } } } };
  assert.deepEqual(mechanical(rules), mechanical({ ...rules, description: 'New copy' }));
  assert.notDeepEqual(mechanical(rules), mechanical({ ...rules, grants: { more: 0.4 } }));
  assert.notDeepEqual(mechanical(rules), mechanical({ ...rules, under: { mode: { grants: { more: 0.5 } } } }));
});
test('dependency fingerprints ignore formatting and copy, but detect executable changes', () => {
  mkdirSync('.scratch', { recursive: true });
  const paths = ['.scratch/writing-a.tmp.ts', '.scratch/writing-b.tmp.ts', '.scratch/writing-c.tmp.ts'];
  try {
    writeFileSync(paths[0], 'export const node = { description: "Old", grants: { more: 1.2 } };');
    writeFileSync(paths[1], '// revised copy\nexport const node={description:"New",grants:{more:1.2}};');
    writeFileSync(paths[2], 'export const node={description:"New",grants:{more:1.3}};');
    assert.equal(sourceRevision(paths[0]), sourceRevision(paths[1]));
    assert.notEqual(sourceRevision(paths[0]), sourceRevision(paths[2]));
  } finally { paths.forEach(path => unlinkSync(path)); }
});
