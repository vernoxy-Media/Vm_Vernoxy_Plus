import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampOffset, coverScale, offsetAfterZoom } from './cover-photo-crop';

describe('cover photo zoom/pan', () => {
  it('cover scale fills a tall viewport from a wide image', () => {
    assert.equal(coverScale(2000, 1000, 260, 500), 0.5);
  });

  it('keeps the image covering the viewport at zoom 1', () => {
    const o = clampOffset(40, 40, 2000, 1000, 260, 500, 1);
    assert.equal(o.x, 0);
    assert.ok(o.y <= 0);
    assert.ok(o.y + 1000 * 0.5 >= 500);
  });

  it('zooms toward the viewport center without exposing edges', () => {
    const after = offsetAfterZoom(1, 2, { x: 0, y: -250 }, 2000, 1000, 260, 500, 130, 250);
    assert.ok(after.x <= 0);
    assert.ok(after.y <= 0);
    assert.ok(after.x + 2000 * 1 >= 260);
    assert.ok(after.y + 1000 * 1 >= 500);
  });
});

describe('cover photo zoomed out below 100%', () => {
  it('keeps a smaller photo inside the box instead of covering it', () => {
    // cover scale 0.5 × zoom 0.5 → photo 500 × 250 inside a 260 × 500 box: wider than the box, shorter.
    const o = clampOffset(-400, 400, 2000, 1000, 260, 500, 0.5);
    assert.equal(o.x, 260 - 500);
    assert.equal(o.y, 500 - 250);
    const inside = clampOffset(0, -50, 2000, 1000, 260, 500, 0.5);
    assert.equal(inside.y, 0);
  });
});
