import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, ringTone, whenLabel } from './leave-visuals';

describe('leave visuals', () => {
  it('counts whole days between two dates, also across a month end', () => {
    assert.equal(daysBetween('2026-11-13', '2026-11-16'), 3);
    assert.equal(daysBetween('2026-11-30', '2026-12-02'), 2);
    assert.equal(daysBetween('2026-11-13', '2026-11-12'), -1);
  });

  it('says when a leave starts or ended', () => {
    const today = '2026-11-13';
    assert.equal(whenLabel('2026-11-13', '2026-11-15', today), 'On leave now');
    assert.equal(whenLabel('2026-11-10', '2026-11-14', today), 'On leave now');
    assert.equal(whenLabel('2026-11-14', '2026-11-14', today), 'Starts tomorrow');
    assert.equal(whenLabel('2026-11-18', '2026-11-19', today), 'Starts in 5 days');
    assert.equal(whenLabel('2026-11-10', '2026-11-12', today), 'Ended yesterday');
    assert.equal(whenLabel('2026-11-01', '2026-11-03', today), 'Ended 10 days ago');
  });

  it('gives a ring colour for a leave type code, with a safe default', () => {
    assert.equal(ringTone('emerald'), 'text-emerald-500');
    assert.equal(ringTone('BLUE'), 'text-blue-500');
    assert.equal(ringTone('unknown'), 'text-slate-400');
    assert.equal(ringTone(null), 'text-slate-400');
  });
});
