import test from 'node:test';
import assert from 'node:assert/strict';
import { supplements } from '../src/data/supplements.js';
import { habits } from '../src/data/habits.js';
import { exercises } from '../src/data/exercises.js';
import { foods } from '../src/data/foods.js';
import { environment } from '../src/data/environment.js';
import { biomarkers, computeBiomarkerScore } from '../src/data/biomarkers.js';
import { buildUniverse } from '../src/data/universe.js';
import { calcVitality } from '../src/core/ScoringEngine.js';
import { labelFontPx } from '../src/core/LabelSize.js';
import {
  layoutAll,
  buildAllGroups,
  allLabelMetrics,
  nodeLabelBox,
  estimateTitleBox,
  titleFontPx,
  S_REF,
  ALL_NODE_RADIUS,
  ALL_MIN_GAP,
  ALL_LABEL_GAP,
  ALL_TITLE_GAP,
  LABEL_MIN_GAP
} from '../src/core/AllLayout.js';
import { stackOrganLabels, ORGAN_LABEL_TEXT } from '../src/core/OrganLabels.js';
import { SLOT } from '../src/components/BodyStage.js';
import { SupplementTree } from '../src/trees/SupplementTree.js';

function bodyEdgeRadius(angle) {
  const rx = SupplementTree.BODY_RX * SupplementTree.BODY_MARGIN;
  const ry = SupplementTree.BODY_RY * SupplementTree.BODY_MARGIN;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return (rx * ry) / Math.sqrt((ry * c) ** 2 + (rx * sn) ** 2);
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function boxDistance(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gapX < 0 && gapY < 0) return Math.max(gapX, gapY);
  if (gapX < 0) return gapY;
  if (gapY < 0) return gapX;
  return Math.hypot(gapX, gapY);
}

function circleBoxDistance(cx, cy, r, box) {
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  return Math.hypot(cx - nx, cy - ny) - r;
}

function uppercaseFloor(text, fontPx) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch >= 'A' && ch <= 'Z') count += 1;
  }
  return count * fontPx * 0.7;
}

function allNodes() {
  const universe = buildUniverse([
    ['supplements', supplements],
    ['habits', habits],
    ['exercises', exercises],
    ['foods', foods],
    ['environment', environment],
    ['biomarkers', biomarkers]
  ]);
  return universe.map((node) => {
    const isLab = node._constellation === 'biomarkers';
    const vitality = isLab ? computeBiomarkerScore(node) : calcVitality(node);
    return {
      ...node,
      vitality,
      longevity: node.longevity ?? vitality,
      qol: node.qol ?? vitality
    };
  });
}

test('all-node layout keeps circles, labels, and titles apart', () => {
  assert.ok(labelFontPx(12, S_REF) * S_REF >= 10.5);
  assert.ok(titleFontPx(S_REF) * S_REF >= 13);
  assert.ok(titleFontPx(S_REF) * S_REF <= 18);

  const catalog = allNodes();
  const groups = buildAllGroups(catalog, S_REF);
  const byId = new Map();
  for (let i = 0; i < catalog.length; i++) {
    const node = catalog[i];
    if (node.id != null) byId.set(node.id, node);
  }
  for (let g = 0; g < groups.length; g++) {
    const specs = groups[g].nodes;
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const src = byId.get(spec.id);
      const metrics = allLabelMetrics(src.short || src.name || '', spec.r, S_REF);
      assert.equal(spec.r, ALL_NODE_RADIUS);
      assert.equal(metrics.fontPx, labelFontPx(12, S_REF));
      assert.equal(spec.labelW, metrics.labelW);
      assert.equal(spec.labelH, metrics.labelH);
      assert.equal(spec.labelH, metrics.fontPx);
    }
  }

  const opts = {
    bodyEdgeRadius,
    minGap: ALL_MIN_GAP,
    labelGap: ALL_LABEL_GAP,
    titleGap: ALL_TITLE_GAP
  };
  const layout = layoutAll(groups, opts);
  const again = layoutAll(groups, opts);
  assert.deepEqual([...layout.positions.entries()], [...again.positions.entries()]);
  assert.deepEqual(layout.titles, again.titles);
  assert.deepEqual(layout.bounds, again.bounds);

  const seen = new Set();
  const placed = [];
  for (const group of groups) {
    assert.equal(typeof group.key, 'string');
    assert.equal(typeof group.label, 'string');
    for (const node of group.nodes) {
      assert.equal(seen.has(node.id), false);
      seen.add(node.id);
      const pos = layout.positions.get(node.id);
      assert.ok(pos);
      assert.equal(Number.isFinite(pos.x), true);
      assert.equal(Number.isFinite(pos.y), true);
      placed.push({
        id: node.id,
        r: node.r,
        labelW: node.labelW,
        labelH: node.labelH,
        x: pos.x,
        y: pos.y,
        box: nodeLabelBox(pos.x, pos.y, node.r, node.labelW, node.labelH)
      });
    }
  }
  assert.ok(placed.length > 100);
  assert.equal(layout.positions.size, placed.length);
  assert.equal(layout.titles.length, groups.length);

  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const minD = a.r + b.r + ALL_MIN_GAP;
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) >= minD - 1e-6,
        `${a.id} overlaps ${b.id}`
      );
      if (a.labelW > 0 && a.labelH > 0 && b.labelW > 0 && b.labelH > 0) {
        assert.ok(
          boxDistance(a.box, b.box) >= LABEL_MIN_GAP - 1e-4,
          `${a.id} label ${b.id}`
        );
      }
      if (b.labelW > 0 && b.labelH > 0) {
        assert.ok(
          circleBoxDistance(a.x, a.y, a.r, b.box) >= LABEL_MIN_GAP - 1e-4,
          `${a.id} circle ${b.id} label`
        );
      }
      if (a.labelW > 0 && a.labelH > 0) {
        assert.ok(
          circleBoxDistance(b.x, b.y, b.r, a.box) >= LABEL_MIN_GAP - 1e-4,
          `${b.id} circle ${a.id} label`
        );
      }
    }
  }

  for (let i = 0; i < layout.titles.length; i++) {
    const title = layout.titles[i];
    const reserved = estimateTitleBox(title.label, titleFontPx(S_REF));
    assert.equal(title.w, Math.max(reserved.w, 1));
    assert.equal(title.h, Math.max(reserved.h, 1));
    assert.equal(Number.isFinite(title.x + title.y + title.w + title.h), true);
    assert.ok(title.w > 0 && title.h > 0);
    assert.ok(title.x >= layout.bounds.minX - 1e-6, `${title.key} minX`);
    assert.ok(title.y >= layout.bounds.minY - 1e-6, `${title.key} minY`);
    assert.ok(title.x + title.w <= layout.bounds.maxX + 1e-6, `${title.key} maxX`);
    assert.ok(title.y + title.h <= layout.bounds.maxY + 1e-6, `${title.key} maxY`);
    for (let n = 0; n < placed.length; n++) {
      const node = placed[n];
      assert.ok(
        circleBoxDistance(node.x, node.y, node.r, title) >= ALL_TITLE_GAP - 1e-4,
        `${title.key} ${node.id}`
      );
      if (node.labelW > 0 && node.labelH > 0) {
        assert.ok(
          boxDistance(title, node.box) >= ALL_TITLE_GAP - 1e-4,
          `${title.key} label ${node.id}`
        );
      }
    }
    for (let j = i + 1; j < layout.titles.length; j++) {
      assert.equal(boxesOverlap(title, layout.titles[j]), false, `${title.key} ${layout.titles[j].key}`);
    }
  }

  assert.ok(layout.bounds.maxX > layout.bounds.minX);
  assert.ok(layout.bounds.maxY > layout.bounds.minY);
});

test('label width estimate covers uppercase Inter samples', () => {
  const fontPx = labelFontPx(12, S_REF);
  const samples = ['ST JOHNS WORT', 'WALK MEET', 'TUDCA'];
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const floor = uppercaseFloor(sample, fontPx);
    const metrics = allLabelMetrics(sample, ALL_NODE_RADIUS, S_REF);
    const title = estimateTitleBox(sample, fontPx);
    assert.equal(metrics.text, sample);
    assert.ok(metrics.labelW >= floor, `${sample} ${metrics.labelW} < ${floor}`);
    assert.ok(title.w >= floor, `${sample} title ${title.w} < ${floor}`);
    assert.equal(title.w, metrics.labelW);
  }
});

test('exploded organ labels do not overlap', () => {
  const items = Object.entries(SLOT).map(([key, pos]) => ({
    key,
    label: ORGAN_LABEL_TEXT[key],
    x: pos.x,
    y: pos.y,
    above: key === 'brain' || key === 'eyes' || key === 'teeth'
  })).filter((item) => item.label);
  assert.ok(items.some((item) => item.key === 'thyroid'));
  assert.ok(items.some((item) => item.key === 'nerves'));
  const opts = { minGap: 4, fontPx: 13 };
  const placed = stackOrganLabels(items, opts);
  const again = stackOrganLabels(items, opts);
  assert.deepEqual(placed, again);
  assert.equal(placed.length, items.length);
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      assert.equal(
        boxesOverlap(placed[i], placed[j]),
        false,
        `${placed[i].key} overlaps ${placed[j].key}`
      );
    }
  }
});
