import { labelFontPx } from './LabelSize.js';

export const ALL_NODE_RADIUS = 12;
export const ALL_LABEL_SCALE = 0.48;
export const ALL_MIN_GAP = 6;
export const ALL_LABEL_GAP = 8;
export const ALL_TITLE_GAP = 16;
export const LABEL_ANCHOR_GAP = 8;
export const TITLE_FONT_PX = 14;

const GROUP_ORDER = ['supplements', 'habits', 'exercises', 'foods', 'environment', 'biomarkers'];
const GROUP_LABELS = {
  supplements: 'Supplements',
  habits: 'Habits',
  exercises: 'Training',
  foods: 'Food',
  environment: 'Environment',
  biomarkers: 'Labs'
};

function cmpStr(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) return -1;
  if (sb < sa) return 1;
  return 0;
}

function num(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function allLabelMetrics(text, r = ALL_NODE_RADIUS, scale = ALL_LABEL_SCALE) {
  const fontPx = labelFontPx(r, scale);
  const s = text == null ? '' : String(text);
  return {
    fontPx,
    labelW: s.length * fontPx * 0.6,
    labelH: fontPx
  };
}

export function estimateTitleBox(text, fontPx = TITLE_FONT_PX) {
  const s = text == null ? '' : String(text);
  return {
    w: s.length * fontPx * 0.6,
    h: fontPx
  };
}

export function nodeLabelBox(x, y, r, labelW, labelH) {
  const w = Math.max(0, labelW || 0);
  const h = Math.max(0, labelH || 0);
  const bottom = y - r - LABEL_ANCHOR_GAP;
  return {
    x: x - w / 2,
    y: bottom - h,
    w,
    h
  };
}

export function buildAllGroups(nodes) {
  const buckets = new Map(GROUP_ORDER.map((key) => [key, []]));
  const rest = [];
  for (const node of nodes || []) {
    if (node && node.cat && buckets.has(node.cat)) buckets.get(node.cat).push(node);
    else if (node) rest.push(node);
  }
  const groups = [];
  const push = (key, label, list) => {
    if (!list.length) return;
    const ranked = list.slice().sort((a, b) => (b.vitality || 0) - (a.vitality || 0) || cmpStr(a.id, b.id));
    groups.push({
      key,
      label,
      nodes: ranked.filter((n) => n.id != null).map((n) => {
        const metrics = allLabelMetrics(n.short || n.name || '');
        return {
          id: n.id,
          r: ALL_NODE_RADIUS,
          labelW: metrics.labelW,
          labelH: metrics.labelH
        };
      })
    });
  };
  for (const key of GROUP_ORDER) push(key, GROUP_LABELS[key], buckets.get(key));
  if (rest.length) push('more', 'More', rest);
  return groups;
}

function resolveBodyEdge(options) {
  const raw = options.bodyEdgeRadius;
  if (typeof raw === 'function') {
    return (angle) => {
      const value = raw(angle);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
  }
  const constant = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  return () => constant;
}

function slotWidth(node) {
  return Math.max(2 * node.r, node.labelW);
}

function pairArc(a, b, minGap) {
  return (slotWidth(a) + slotWidth(b)) / 2 + minGap;
}

function arcTotal(batch, minGap) {
  let total = 0;
  for (let i = 1; i < batch.length; i++) total += pairArc(batch[i - 1], batch[i], minGap);
  return total;
}

function radialStepFor(nodes, labelGap, minGap) {
  let step = 0;
  for (const node of nodes) step = Math.max(step, 2 * node.r + node.labelH + labelGap + minGap);
  return step;
}

function pointAt(angle, dist) {
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

function boxesOverlap(a, b) {
  if (!(a.w > 0) || !(a.h > 0) || !(b.w > 0) || !(b.h > 0)) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHitsBox(cx, cy, r, box) {
  if (!(r > 0) || !(box.w > 0) || !(box.h > 0)) return false;
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function circlesClear(ax, ay, ar, bx, by, br, minGap) {
  const dx = ax - bx;
  const dy = ay - by;
  const minD = ar + br + minGap;
  return dx * dx + dy * dy >= minD * minD - 1e-8;
}

function boxGap(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gapX < 0 && gapY < 0) return Math.max(gapX, gapY);
  if (gapX < 0) return gapY;
  if (gapY < 0) return gapX;
  return Math.hypot(gapX, gapY);
}

function pointOutsideBody(edgeAt, x, y, margin) {
  const dist = Math.hypot(x, y);
  if (dist <= 1e-8) return margin <= 0 && edgeAt(0) <= 0;
  return dist >= edgeAt(Math.atan2(y, x)) + margin - 1e-6;
}

function labelRel(node) {
  return {
    l: -node.labelW / 2,
    r: node.labelW / 2,
    t: -(node.r + LABEL_ANCHOR_GAP + node.labelH),
    b: -(node.r + LABEL_ANCHOR_GAP)
  };
}

function bodyClear(edgeAt, node, dist, minGap) {
  if (dist < edgeAt(node.angle) + node.r + minGap - 1e-6) return false;
  const p = pointAt(node.angle, dist);
  if (!pointOutsideBody(edgeAt, p.x, p.y, node.r + minGap)) return false;
  if (!(node.labelW > 0) || !(node.labelH > 0)) return true;
  const box = nodeLabelBox(p.x, p.y, node.r, node.labelW, node.labelH);
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h]
  ];
  for (let i = 0; i < corners.length; i++) {
    if (!pointOutsideBody(edgeAt, corners[i][0], corners[i][1], 0)) return false;
  }
  return true;
}

function bodyMinDist(edgeAt, node, minGap) {
  let dist = edgeAt(node.angle) + node.r + minGap;
  if (bodyClear(edgeAt, node, dist, minGap)) return dist;
  for (let i = 0; i < 80 && !bodyClear(edgeAt, node, dist, minGap); i++) dist += 6;
  return dist;
}

function clipInterval(lo, hi, coeff, plus, op, limit) {
  if (lo > hi) return [lo, hi];
  if (Math.abs(coeff) < 1e-12) {
    const value = plus;
    const ok = op === '<' ? value < limit : value > limit;
    return ok ? [lo, hi] : [Infinity, -Infinity];
  }
  const bound = (limit - plus) / coeff;
  if (op === '<') {
    if (coeff > 0) return [lo, Math.min(hi, bound)];
    return [Math.max(lo, bound), hi];
  }
  if (coeff > 0) return [Math.max(lo, bound), hi];
  return [lo, Math.min(hi, bound)];
}

function movingRectInterval(dirX, dirY, rel, fixed) {
  let lo = -Infinity;
  let hi = Infinity;
  [lo, hi] = clipInterval(lo, hi, dirX, rel.l, '<', fixed.x + fixed.w);
  [lo, hi] = clipInterval(lo, hi, dirX, rel.r, '>', fixed.x);
  [lo, hi] = clipInterval(lo, hi, dirY, rel.t, '<', fixed.y + fixed.h);
  [lo, hi] = clipInterval(lo, hi, dirY, rel.b, '>', fixed.y);
  if (!(lo <= hi) || !Number.isFinite(lo) && !Number.isFinite(hi)) return null;
  if (!Number.isFinite(lo)) lo = -1e9;
  if (!Number.isFinite(hi)) hi = 1e9;
  return [lo, hi];
}

function circleInterval(dirX, dirY, ox, oy, minD) {
  const dot = ox * dirX + oy * dirY;
  const c = ox * ox + oy * oy - minD * minD;
  const disc = dot * dot - c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  return [dot - root, dot + root];
}

function pushInterval(intervals, interval) {
  if (!interval) return;
  const lo = interval[0];
  const hi = interval[1];
  if (!(hi > lo)) return;
  intervals.push([lo - 0.05, hi + 0.05]);
}

function collectNodeIntervals(node, other, dirX, dirY, minGap, intervals) {
  pushInterval(
    intervals,
    circleInterval(dirX, dirY, other.x, other.y, node.r + other.r + minGap)
  );
  const hasLabel = node.labelW > 0 && node.labelH > 0;
  const otherHas = other.labelW > 0 && other.labelH > 0;
  if (hasLabel && otherHas) {
    const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
    pushInterval(intervals, movingRectInterval(dirX, dirY, labelRel(node), {
      x: otherBox.x - 0.05,
      y: otherBox.y - 0.05,
      w: otherBox.w + 0.1,
      h: otherBox.h + 0.1
    }));
  }
  if (otherHas) {
    const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
    const pad = node.r;
    pushInterval(intervals, movingRectInterval(dirX, dirY, { l: 0, r: 0, t: 0, b: 0 }, {
      x: otherBox.x - pad,
      y: otherBox.y - pad,
      w: otherBox.w + pad * 2,
      h: otherBox.h + pad * 2
    }));
  }
  if (hasLabel) {
    const rel = labelRel(node);
    const pad = other.r;
    pushInterval(intervals, movingRectInterval(dirX, dirY, {
      l: rel.l - pad,
      r: rel.r + pad,
      t: rel.t - pad,
      b: rel.b + pad
    }, { x: other.x, y: other.y, w: 0, h: 0 }));
  }
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);
    else merged.push([sorted[i][0], sorted[i][1]]);
  }
  return merged;
}

function jumpPast(t, intervals) {
  const merged = mergeIntervals(intervals);
  let cursor = t;
  for (let i = 0; i < merged.length; i++) {
    const lo = merged[i][0];
    const hi = merged[i][1];
    if (cursor < lo) break;
    if (cursor <= hi) cursor = hi + 0.05;
  }
  return cursor;
}

function positioned(node, dist) {
  const p = pointAt(node.angle, dist);
  return {
    x: p.x,
    y: p.y,
    box: nodeLabelBox(p.x, p.y, node.r, node.labelW, node.labelH)
  };
}

function pairClearAt(node, dist, other, minGap) {
  const here = positioned(node, dist);
  if (!circlesClear(here.x, here.y, node.r, other.x, other.y, other.r, minGap)) return false;
  const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
  if (boxesOverlap(here.box, otherBox)) return false;
  if (circleHitsBox(here.x, here.y, node.r, otherBox)) return false;
  if (circleHitsBox(other.x, other.y, other.r, here.box)) return false;
  return true;
}

function clearAt(edgeAt, node, dist, others, minGap) {
  if (!bodyClear(edgeAt, node, dist, minGap)) return false;
  for (let i = 0; i < others.length; i++) {
    if (!pairClearAt(node, dist, others[i], minGap)) return false;
  }
  return true;
}

function overlapDepth(node, dist, other, minGap) {
  const here = positioned(node, dist);
  let depth = 0;
  const dx = here.x - other.x;
  const dy = here.y - other.y;
  const distC = Math.hypot(dx, dy);
  const minD = node.r + other.r + minGap;
  if (distC < minD) depth = Math.max(depth, minD - distC);
  const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
  if (boxesOverlap(here.box, otherBox)) {
    const ox = Math.min(here.box.x + here.box.w, otherBox.x + otherBox.w) - Math.max(here.box.x, otherBox.x);
    const oy = Math.min(here.box.y + here.box.h, otherBox.y + otherBox.h) - Math.max(here.box.y, otherBox.y);
    depth = Math.max(depth, Math.min(ox, oy));
  }
  if (circleHitsBox(here.x, here.y, node.r, otherBox)) depth = Math.max(depth, node.r);
  if (circleHitsBox(other.x, other.y, other.r, here.box)) depth = Math.max(depth, other.r);
  return depth;
}

function solveDist(edgeAt, node, floor, others, minGap) {
  let dist = Math.max(node.dist, floor);
  const dirX = Math.cos(node.angle);
  const dirY = Math.sin(node.angle);
  for (let guard = 0; guard < 64; guard++) {
    const intervals = [];
    for (let i = 0; i < others.length; i++) {
      collectNodeIntervals(node, others[i], dirX, dirY, minGap, intervals);
    }
    const jumped = jumpPast(dist, intervals);
    if (jumped > dist) dist = jumped;
    if (dist < floor) dist = floor;
    if (clearAt(edgeAt, node, dist, others, minGap)) return dist;
    let push = 1;
    for (let i = 0; i < others.length; i++) {
      push = Math.max(push, overlapDepth(node, dist, others[i], minGap));
    }
    if (!bodyClear(edgeAt, node, dist, minGap)) push = Math.max(push, 6);
    dist += Math.max(1, push);
  }
  let safety = 0;
  while (!clearAt(edgeAt, node, dist, others, minGap) && safety < 120) {
    let push = 6;
    for (let i = 0; i < others.length; i++) {
      push = Math.max(push, overlapDepth(node, dist, others[i], minGap));
    }
    dist += push;
    safety += 1;
  }
  return dist;
}

function setDist(node, dist) {
  node.dist = dist;
  const p = pointAt(node.angle, dist);
  node.x = p.x;
  node.y = p.y;
}

function resolveNodes(edgeAt, nodes, minGap) {
  const ordered = nodes.slice().sort((a, b) => a.dist - b.dist || a.angle - b.angle || cmpStr(a.id, b.id));
  const fixed = [];
  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i];
    const floor = Math.max(node.dist, bodyMinDist(edgeAt, node, minGap));
    const dist = solveDist(edgeAt, node, floor, fixed, minGap);
    setDist(node, dist);
    fixed.push(node);
  }
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < ordered.length; i++) {
      const node = ordered[i];
      const others = [];
      for (let j = 0; j < ordered.length; j++) if (j !== i) others.push(ordered[j]);
      if (clearAt(edgeAt, node, node.dist, others, minGap)) continue;
      const dist = solveDist(edgeAt, node, node.dist, others, minGap);
      if (dist > node.dist + 1e-6) {
        setDist(node, dist);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function shapeRadius(node) {
  const box = nodeLabelBox(node.x, node.y, node.r, node.labelW, node.labelH);
  const pts = [
    [node.x - node.r, node.y],
    [node.x + node.r, node.y],
    [node.x, node.y - node.r],
    [node.x, node.y + node.r],
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h]
  ];
  let max = 0;
  for (let i = 0; i < pts.length; i++) max = Math.max(max, Math.hypot(pts[i][0], pts[i][1]));
  return max;
}

function titleHitsNode(box, node, titleGap) {
  if (circleHitsBox(node.x, node.y, node.r + titleGap, box)) return true;
  const label = nodeLabelBox(node.x, node.y, node.r, node.labelW, node.labelH);
  if (label.w > 0 && label.h > 0 && boxGap(box, label) < titleGap) return true;
  return false;
}

function titleBoxAt(angle, dist, w, h) {
  const p = pointAt(angle, dist);
  return { x: p.x - w / 2, y: p.y - h / 2, w, h };
}

function titleClear(angle, dist, w, h, nodes, titles, titleGap) {
  const box = titleBoxAt(angle, dist, w, h);
  for (let i = 0; i < nodes.length; i++) {
    if (titleHitsNode(box, nodes[i], titleGap)) return false;
  }
  for (let i = 0; i < titles.length; i++) {
    if (boxGap(box, titles[i]) < titleGap) return false;
  }
  return true;
}

function collectTitleIntervals(angleDirX, angleDirY, w, h, node, titleGap, intervals) {
  const rel = { l: -w / 2, r: w / 2, t: -h / 2, b: h / 2 };
  const pad = node.r + titleGap;
  pushInterval(intervals, movingRectInterval(angleDirX, angleDirY, {
    l: rel.l - pad,
    r: rel.r + pad,
    t: rel.t - pad,
    b: rel.b + pad
  }, { x: node.x, y: node.y, w: 0, h: 0 }));
  if (node.labelW > 0 && node.labelH > 0) {
    const label = nodeLabelBox(node.x, node.y, node.r, node.labelW, node.labelH);
    pushInterval(intervals, movingRectInterval(angleDirX, angleDirY, rel, {
      x: label.x - titleGap,
      y: label.y - titleGap,
      w: label.w + titleGap * 2,
      h: label.h + titleGap * 2
    }));
  }
}

function solveTitleDist(angle, start, w, h, nodes, titles, titleGap) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  let dist = start;
  for (let guard = 0; guard < 48; guard++) {
    const intervals = [];
    for (let i = 0; i < nodes.length; i++) {
      collectTitleIntervals(dirX, dirY, w, h, nodes[i], titleGap, intervals);
    }
    for (let i = 0; i < titles.length; i++) {
      const other = titles[i];
      pushInterval(intervals, movingRectInterval(dirX, dirY, {
        l: -w / 2,
        r: w / 2,
        t: -h / 2,
        b: h / 2
      }, {
        x: other.x - titleGap,
        y: other.y - titleGap,
        w: other.w + titleGap * 2,
        h: other.h + titleGap * 2
      }));
    }
    const jumped = jumpPast(dist, intervals);
    if (jumped > dist) dist = jumped;
    if (titleClear(angle, dist, w, h, nodes, titles, titleGap)) return dist;
    dist += 8;
  }
  let safety = 0;
  while (!titleClear(angle, dist, w, h, nodes, titles, titleGap) && safety < 80) {
    dist += 12;
    safety += 1;
  }
  return dist;
}

function placeTitles(wedges, nodes, titleGap) {
  const titles = [];
  for (let i = 0; i < wedges.length; i++) {
    const wedge = wedges[i];
    const size = estimateTitleBox(wedge.label);
    const w = Math.max(size.w, 1);
    const h = Math.max(size.h, 1);
    let extent = 0;
    for (let n = 0; n < wedge.placed.length; n++) {
      extent = Math.max(extent, shapeRadius(wedge.placed[n]));
    }
    const start = extent + titleGap + Math.hypot(w, h) / 2;
    const dist = solveTitleDist(wedge.mid, start, w, h, nodes, titles, titleGap);
    const box = titleBoxAt(wedge.mid, dist, w, h);
    titles.push({
      key: wedge.key,
      label: wedge.label,
      x: box.x,
      y: box.y,
      w,
      h
    });
  }
  return titles;
}

function emptyBounds(edgeAt) {
  const ex = edgeAt(0);
  const ey = edgeAt(Math.PI / 2);
  return { minX: -ex, minY: -ey, maxX: ex, maxY: ey };
}

function computeBounds(nodes, titles, edgeAt) {
  if (!nodes.length && !titles.length) return emptyBounds(edgeAt);
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (x, y, w, h) => {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x + w);
    bounds.maxY = Math.max(bounds.maxY, y + h);
  };
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    add(node.x - node.r, node.y - node.r, node.r * 2, node.r * 2);
    const box = nodeLabelBox(node.x, node.y, node.r, node.labelW, node.labelH);
    if (box.w > 0 && box.h > 0) add(box.x, box.y, box.w, box.h);
  }
  for (let i = 0; i < titles.length; i++) add(titles[i].x, titles[i].y, titles[i].w, titles[i].h);
  return bounds;
}

function normalizeNode(raw) {
  return {
    id: raw.id,
    r: Math.max(0, num(raw.r, 0)),
    labelW: Math.max(0, num(raw.labelW, 0)),
    labelH: Math.max(0, num(raw.labelH, 0))
  };
}

export function layoutAll(groups, opts) {
  const options = opts || {};
  const minGap = num(options.minGap, ALL_MIN_GAP);
  const labelGap = num(options.labelGap, ALL_LABEL_GAP);
  const titleGap = num(options.titleGap, ALL_TITLE_GAP);
  const edgeAt = resolveBodyEdge(options);
  const prepared = [];
  for (const group of groups || []) {
    if (!group) continue;
    const nodes = [];
    for (const raw of group.nodes || []) {
      if (!raw || raw.id == null) continue;
      nodes.push(normalizeNode(raw));
    }
    if (!nodes.length) continue;
    prepared.push({
      key: group.key,
      label: group.label == null ? '' : String(group.label),
      nodes
    });
  }
  if (!prepared.length) {
    return { positions: new Map(), titles: [], bounds: emptyBounds(edgeAt) };
  }

  const weights = prepared.map((group) => Math.sqrt(group.nodes.length));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = -Math.PI / 2;
  const wedges = [];
  const placed = [];

  for (let gi = 0; gi < prepared.length; gi++) {
    const group = prepared[gi];
    const span = Math.PI * 2 * (weights[gi] / weightSum);
    const start = cursor;
    const mid = start + span / 2;
    cursor += span;
    const radialStep = radialStepFor(group.nodes, labelGap, minGap);
    let basePad = 0;
    let widest = 0;
    for (let i = 0; i < group.nodes.length; i++) {
      basePad = Math.max(basePad, group.nodes[i].r + minGap);
      widest = Math.max(widest, slotWidth(group.nodes[i]));
    }
    const wedge = {
      key: group.key,
      label: group.label,
      start,
      mid,
      span,
      radialStep,
      basePad,
      widest,
      placed: []
    };
    let index = 0;
    let ring = 0;
    while (index < group.nodes.length && ring < 96) {
      const orbit = edgeAt(mid) + basePad + ring * radialStep;
      const gutter = Math.min(span * 0.49, (widest / 2 + minGap / 2) / Math.max(orbit, 1));
      const usable = Math.max(0, span - gutter * 2);
      const budget = usable * Math.max(orbit, 1);
      const batch = [group.nodes[index]];
      while (index + batch.length < group.nodes.length) {
        const trial = batch.concat([group.nodes[index + batch.length]]);
        if (arcTotal(trial, minGap) <= budget + 1e-6) batch.push(group.nodes[index + batch.length]);
        else break;
      }
      const total = arcTotal(batch, minGap);
      const radius = Math.max(orbit, 1);
      let acc = -total / 2;
      for (let k = 0; k < batch.length; k++) {
        const node = batch[k];
        const angle = batch.length === 1 ? mid : mid + acc / radius;
        const dist = edgeAt(angle) + basePad + ring * radialStep;
        const rec = {
          id: node.id,
          r: node.r,
          labelW: node.labelW,
          labelH: node.labelH,
          angle,
          dist,
          x: 0,
          y: 0,
          ring,
          key: group.key
        };
        setDist(rec, dist);
        wedge.placed.push(rec);
        placed.push(rec);
        if (k < batch.length - 1) acc += pairArc(batch[k], batch[k + 1], minGap);
      }
      index += batch.length;
      ring += 1;
    }
    wedges.push(wedge);
  }

  resolveNodes(edgeAt, placed, minGap);
  const titles = placeTitles(wedges, placed, titleGap);
  const positions = new Map();
  for (let i = 0; i < placed.length; i++) {
    positions.set(placed[i].id, { x: placed[i].x, y: placed[i].y });
  }
  return {
    positions,
    titles,
    bounds: computeBounds(placed, titles, edgeAt)
  };
}
