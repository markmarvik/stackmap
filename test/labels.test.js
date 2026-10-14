import test from 'node:test';
import assert from 'node:assert/strict';
import { labelFontPx, fitLabel, createLabelCollider } from '../src/core/LabelSize.js';

function naturalLabelPx(r) {
  return Math.round(Math.max(8, Math.min(11, r * 0.38)));
}

test('labelFontPx holds the minimum on-screen size when zoomed out', () => {
  const scale = 0.15;
  const px = labelFontPx(18, scale);
  assert.ok(naturalLabelPx(18) * scale < 10.5);
  assert.ok(Math.abs(px * scale - 10.5) < 1e-9);
  const custom = labelFontPx(12, 0.2, { minScreen: 12, maxScreen: 14 });
  assert.ok(Math.abs(custom * 0.2 - 12) < 1e-9);
});

test('labelFontPx uses the natural size at scale 1 when it is already readable', () => {
  const r = 40;
  const natural = naturalLabelPx(r);
  assert.equal(natural, 11);
  assert.equal(labelFontPx(r, 1), natural);
  const mid = labelFontPx(26, 1.1);
  assert.equal(mid, naturalLabelPx(26));
  assert.ok(mid * 1.1 >= 10.5 && mid * 1.1 <= 13);
});

test('labelFontPx caps on-screen size when zoomed in', () => {
  const scale = 4;
  const r = 40;
  const natural = naturalLabelPx(r);
  assert.ok(natural * scale > 13);
  const px = labelFontPx(r, scale);
  assert.ok(Math.abs(px * scale - 13) < 1e-9);
  assert.ok(px < natural);
  const capped = labelFontPx(30, 3, { minScreen: 9, maxScreen: 12 });
  assert.ok(Math.abs(capped * 3 - 12) < 1e-9);
});

test('fitLabel returns text unchanged when it fits', () => {
  const text = 'Magnesium';
  const measure = (s) => s.length * 8;
  assert.equal(fitLabel(text, 80, measure), text);
  assert.equal(fitLabel(text, measure(text), measure), text);
  assert.equal(fitLabel('', 10, measure), '');
  assert.equal(fitLabel('A', 10, (s) => s.length), 'A');
});

test('fitLabel truncates with an ellipsis inside the max width', () => {
  const measure = (s) => s.length * 10;
  const out = fitLabel('Magnesium', 50, measure);
  assert.equal(out, 'Magn…');
  assert.ok(out.endsWith('…'));
  assert.ok(measure(out) <= 50);
  assert.ok(out.length < 'Magnesium'.length);
  assert.equal(fitLabel('ABCDEFGH', 6, (s) => s.length), 'ABCDE…');
});

test('fitLabel never returns empty for non-empty input', () => {
  const out = fitLabel('Zinc', 1, () => 1000);
  assert.equal(out, 'Z…');
  assert.ok(out.length > 0);
  assert.equal(fitLabel('A', 0, () => 5), 'A…');
});

test('label collision alternates above and below and does not drop labels', () => {
  const collider = createLabelCollider(32);
  assert.equal(collider.place(0, 0, 40, 12, 16), 0);
  assert.equal(collider.place(0, 0, 40, 12, 16), 16);
  assert.equal(collider.place(0, 0, 40, 12, 16), -16);
  assert.equal(collider.place(0, 0, 40, 12, 16), 32);
  for (let i = 0; i < 12; i++) {
    assert.equal(Number.isFinite(collider.place(0, 0, 40, 12, 16)), true);
  }
});

test('label collision ignores separated labels, catches cell edges, and resets', () => {
  const collider = createLabelCollider(40);
  assert.equal(collider.place(0, 0, 20, 10, 15), 0);
  assert.equal(collider.place(200, 80, 20, 10, 15), 0);
  assert.equal(collider.place(0, 0, 30, 12, 20), 20);
  assert.equal(collider.place(25, 40, 30, 12, 20), 0);
  const across = createLabelCollider(40);
  assert.equal(across.place(0, 0, 30, 12, 20), 0);
  assert.equal(across.place(25, 0, 30, 12, 20), 20);
  across.reset();
  assert.equal(across.place(0, 0, 30, 12, 20), 0);
  assert.equal(across.place(25, 0, 30, 12, 20), 20);
});
