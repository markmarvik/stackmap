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
import {
  layoutAll,
  buildAllGroups,
  nodeLabelBox,
  ALL_MIN_GAP,
  ALL_LABEL_GAP,
  ALL_TITLE_GAP
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

function circleHitsBox(cx, cy, r, box) {
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
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
  const groups = buildAllGroups(allNodes());
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
        assert.equal(boxesOverlap(a.box, b.box), false, `${a.id} label ${b.id}`);
      }
      if (b.labelW > 0 && b.labelH > 0) {
        assert.equal(circleHitsBox(a.x, a.y, a.r, b.box), false, `${a.id} circle ${b.id} label`);
      }
      if (a.labelW > 0 && a.labelH > 0) {
        assert.equal(circleHitsBox(b.x, b.y, b.r, a.box), false, `${b.id} circle ${a.id} label`);
      }
    }
  }

  for (let i = 0; i < layout.titles.length; i++) {
    const title = layout.titles[i];
    assert.equal(Number.isFinite(title.x + title.y + title.w + title.h), true);
    assert.ok(title.w > 0 && title.h > 0);
    for (let n = 0; n < placed.length; n++) {
      const node = placed[n];
      assert.equal(circleHitsBox(node.x, node.y, node.r, title), false, `${title.key} ${node.id}`);
      if (node.labelW > 0 && node.labelH > 0) {
        assert.equal(boxesOverlap(title, node.box), false, `${title.key} label ${node.id}`);
      }
    }
    for (let j = i + 1; j < layout.titles.length; j++) {
      assert.equal(boxesOverlap(title, layout.titles[j]), false, `${title.key} ${layout.titles[j].key}`);
    }
  }

  assert.ok(layout.bounds.maxX > layout.bounds.minX);
  assert.ok(layout.bounds.maxY > layout.bounds.minY);
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
