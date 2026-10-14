import { fitLabel, labelFontPx } from './LabelSize.js';

export const ALL_NODE_RADIUS = 12;
export const S_REF = 0.5;
export const ALL_MIN_GAP = 6;
export const ALL_LABEL_GAP = 8;
export const ALL_TITLE_GAP = 16;
export const LABEL_MIN_GAP = 10;
export const LABEL_ANCHOR_GAP = 8;
export const TITLE_FONT_PX = 14;
export const TITLE_MIN_SCREEN = 13;
export const TITLE_MAX_SCREEN = 18;
const LABEL_PAD_EM = 0.5;
const CHAR_EM = {
  ' ': 0.3,
  i: 0.3,
  j: 0.3,
  l: 0.3,
  I: 0.32,
  '`': 0.38,
  t: 0.38,
  '\u00b4': 0.38,
  '!': 0.4,
  "'": 0.4,
  '(': 0.4,
  ')': 0.4,
  ',': 0.4,
  '.': 0.4,
  '/': 0.4,
  ':': 0.4,
  ';': 0.4,
  '[': 0.4,
  '\\': 0.4,
  ']': 0.4,
  '|': 0.4,
  '\u00b7': 0.4,
  f: 0.42,
  r: 0.42,
  '-': 0.48,
  '{': 0.48,
  '}': 0.48,
  '^': 0.5,
  _: 0.5,
  '\u2022': 0.5,
  '\u2013': 0.52,
  '"': 0.58,
  '*': 0.58,
  '?': 0.58,
  L: 0.58,
  s: 0.58,
  F: 0.6,
  J: 0.6,
  a: 0.6,
  c: 0.6,
  k: 0.6,
  x: 0.6,
  z: 0.6,
  E: 0.62,
  e: 0.62,
  v: 0.62,
  y: 0.62,
  h: 0.64,
  n: 0.64,
  o: 0.64,
  u: 0.64,
  '#': 0.66,
  '1': 0.66,
  '2': 0.66,
  '3': 0.66,
  '5': 0.66,
  '6': 0.66,
  '7': 0.66,
  '9': 0.66,
  P: 0.66,
  b: 0.66,
  d: 0.66,
  g: 0.66,
  p: 0.66,
  q: 0.66,
  $: 0.68,
  '8': 0.68,
  B: 0.68,
  R: 0.68,
  S: 0.68,
  T: 0.68,
  Z: 0.68,
  '&': 0.7,
  '+': 0.7,
  '0': 0.7,
  '4': 0.7,
  '<': 0.7,
  '=': 0.7,
  '>': 0.7,
  '~': 0.7,
  D: 0.74,
  K: 0.74,
  A: 0.76,
  C: 0.76,
  H: 0.76,
  U: 0.76,
  V: 0.76,
  X: 0.76,
  Y: 0.76,
  G: 0.78,
  N: 0.78,
  O: 0.8,
  Q: 0.8,
  w: 0.88,
  m: 0.94,
  M: 0.96,
  '\u2026': 1.02,
  '\u2014': 1.02,
  '%': 1.04,
  '@': 1.04,
  W: 1.06
};

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

function charEm(ch) {
  const known = CHAR_EM[ch];
  return known == null ? 0.82 : known;
}

function glyphWidth(text, fontPx) {
  if (!(fontPx > 0)) return 0;
  const s = text == null ? '' : String(text);
  let em = 0;
  for (let i = 0; i < s.length; i++) em += charEm(s.charAt(i));
  return em * fontPx;
}

function estimateTextWidth(text, fontPx) {
  const s = text == null ? '' : String(text);
  if (!s) return 0;
  const glyph = glyphWidth(s, fontPx);
  if (!(glyph > 0)) return 0;
  return glyph + LABEL_PAD_EM * fontPx;
}

export function allLabelMetrics(text, r = ALL_NODE_RADIUS, scale = S_REF) {
  const fontPx = labelFontPx(12, scale);
  const safeScale = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const radius = Number.isFinite(r) ? r : ALL_NODE_RADIUS;
  const maxWorld = Math.max(3 * radius * safeScale, 96) / safeScale;
  const measure = (value) => glyphWidth(value, fontPx);
  const raw = text == null ? '' : String(text);
  const fitted = fitLabel(raw, maxWorld, measure);
  const glyph = measure(fitted);
  return {
    fontPx,
    labelW: glyph > 0 ? glyph + LABEL_PAD_EM * fontPx : 0,
    labelH: fontPx,
    text: fitted
  };
}

export function estimateTitleBox(text, fontPx = TITLE_FONT_PX) {
  const px = fontPx > 0 && Number.isFinite(fontPx) ? fontPx : 0;
  return {
    w: estimateTextWidth(text, px),
    h: px
  };
}

export function titleFontPx(scale) {
  const safeScale = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const screen = TITLE_FONT_PX * safeScale;
  if (screen < TITLE_MIN_SCREEN) return TITLE_MIN_SCREEN / safeScale;
  if (screen > TITLE_MAX_SCREEN) return TITLE_MAX_SCREEN / safeScale;
  return TITLE_FONT_PX;
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

export function buildAllGroups(nodes, scale = S_REF) {
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
        const metrics = allLabelMetrics(n.short || n.name || '', ALL_NODE_RADIUS, scale);
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

function pairArc(a, b, minGap, labelMinGap) {
  let sep = a.r + b.r + minGap;
  const aLabel = a.labelW > 0 && a.labelH > 0;
  const bLabel = b.labelW > 0 && b.labelH > 0;
  if (aLabel && bLabel) sep = Math.max(sep, (a.labelW + b.labelW) / 2 + labelMinGap);
  if (aLabel) sep = Math.max(sep, a.labelW / 2 + b.r + labelMinGap);
  if (bLabel) sep = Math.max(sep, b.labelW / 2 + a.r + labelMinGap);
  return sep;
}

function arcTotal(batch, minGap, labelMinGap) {
  let total = 0;
  for (let i = 1; i < batch.length; i++) total += pairArc(batch[i - 1], batch[i], minGap, labelMinGap);
  return total;
}

function radialStepFor(nodes, labelGap, minGap, labelMinGap) {
  let step = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const stacked = 2 * node.r + node.labelH + labelGap + minGap;
    const labelSpan = node.labelH > 0 ? LABEL_ANCHOR_GAP + node.labelH + labelMinGap : minGap;
    step = Math.max(step, stacked, 2 * node.r + labelSpan);
  }
  return step;
}

function pointAt(angle, dist) {
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

function circleHitsBox(cx, cy, r, box) {
  if (!(r > 0) || !(box.w > 0) || !(box.h > 0)) return false;
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function circleBoxGap(cx, cy, r, box) {
  if (!(box.w > 0) || !(box.h > 0)) return Infinity;
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  return Math.hypot(cx - nx, cy - ny) - r;
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

function collectNodeIntervals(node, other, dirX, dirY, minGap, labelMinGap, intervals) {
  pushInterval(
    intervals,
    circleInterval(dirX, dirY, other.x, other.y, node.r + other.r + minGap)
  );
  const hasLabel = node.labelW > 0 && node.labelH > 0;
  const otherHas = other.labelW > 0 && other.labelH > 0;
  if (hasLabel && otherHas) {
    const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
    pushInterval(intervals, movingRectInterval(dirX, dirY, labelRel(node), {
      x: otherBox.x - labelMinGap,
      y: otherBox.y - labelMinGap,
      w: otherBox.w + labelMinGap * 2,
      h: otherBox.h + labelMinGap * 2
    }));
  }
  if (otherHas) {
    const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
    const pad = node.r + labelMinGap;
    pushInterval(intervals, movingRectInterval(dirX, dirY, { l: 0, r: 0, t: 0, b: 0 }, {
      x: otherBox.x - pad,
      y: otherBox.y - pad,
      w: otherBox.w + pad * 2,
      h: otherBox.h + pad * 2
    }));
  }
  if (hasLabel) {
    const rel = labelRel(node);
    const pad = other.r + labelMinGap;
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

function pairClearAt(node, dist, other, minGap, labelMinGap) {
  const here = positioned(node, dist);
  if (!circlesClear(here.x, here.y, node.r, other.x, other.y, other.r, minGap)) return false;
  const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
  const hereHas = here.box.w > 0 && here.box.h > 0;
  const otherHas = otherBox.w > 0 && otherBox.h > 0;
  if (hereHas && otherHas && boxGap(here.box, otherBox) < labelMinGap - 1e-6) return false;
  if (otherHas && circleHitsBox(here.x, here.y, node.r + labelMinGap, otherBox)) return false;
  if (hereHas && circleHitsBox(other.x, other.y, other.r + labelMinGap, here.box)) return false;
  return true;
}

function clearAt(edgeAt, node, dist, others, minGap, labelMinGap) {
  if (!bodyClear(edgeAt, node, dist, minGap)) return false;
  for (let i = 0; i < others.length; i++) {
    if (!pairClearAt(node, dist, others[i], minGap, labelMinGap)) return false;
  }
  return true;
}

function overlapDepth(node, dist, other, minGap, labelMinGap) {
  const here = positioned(node, dist);
  let depth = 0;
  const dx = here.x - other.x;
  const dy = here.y - other.y;
  const distC = Math.hypot(dx, dy);
  const minD = node.r + other.r + minGap;
  if (distC < minD) depth = Math.max(depth, minD - distC);
  const otherBox = nodeLabelBox(other.x, other.y, other.r, other.labelW, other.labelH);
  const hereHas = here.box.w > 0 && here.box.h > 0;
  const otherHas = otherBox.w > 0 && otherBox.h > 0;
  if (hereHas && otherHas) {
    const gap = boxGap(here.box, otherBox);
    if (gap < labelMinGap) depth = Math.max(depth, labelMinGap - gap);
  }
  if (otherHas) {
    const gap = circleBoxGap(here.x, here.y, node.r, otherBox);
    if (gap < labelMinGap) depth = Math.max(depth, labelMinGap - gap);
  }
  if (hereHas) {
    const gap = circleBoxGap(other.x, other.y, other.r, here.box);
    if (gap < labelMinGap) depth = Math.max(depth, labelMinGap - gap);
  }
  return depth;
}

function solveDist(edgeAt, node, floor, others, minGap, labelMinGap) {
  let dist = Math.max(node.dist, floor);
  const dirX = Math.cos(node.angle);
  const dirY = Math.sin(node.angle);
  for (let guard = 0; guard < 64; guard++) {
    const intervals = [];
    for (let i = 0; i < others.length; i++) {
      collectNodeIntervals(node, others[i], dirX, dirY, minGap, labelMinGap, intervals);
    }
    const jumped = jumpPast(dist, intervals);
    if (jumped > dist) dist = jumped;
    if (dist < floor) dist = floor;
    if (clearAt(edgeAt, node, dist, others, minGap, labelMinGap)) return dist;
    let push = 1;
    for (let i = 0; i < others.length; i++) {
      push = Math.max(push, overlapDepth(node, dist, others[i], minGap, labelMinGap));
    }
    if (!bodyClear(edgeAt, node, dist, minGap)) push = Math.max(push, 6);
    dist += Math.max(1, push);
  }
  let safety = 0;
  while (!clearAt(edgeAt, node, dist, others, minGap, labelMinGap) && safety < 120) {
    let push = 6;
    for (let i = 0; i < others.length; i++) {
      push = Math.max(push, overlapDepth(node, dist, others[i], minGap, labelMinGap));
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

function resolveNodes(edgeAt, nodes, minGap, labelMinGap) {
  const ordered = nodes.slice().sort((a, b) => a.dist - b.dist || a.angle - b.angle || cmpStr(a.id, b.id));
  const fixed = [];
  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i];
    const floor = Math.max(node.dist, bodyMinDist(edgeAt, node, minGap));
    const dist = solveDist(edgeAt, node, floor, fixed, minGap, labelMinGap);
    setDist(node, dist);
    fixed.push(node);
  }
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < ordered.length; i++) {
      const node = ordered[i];
      const others = [];
      for (let j = 0; j < ordered.length; j++) if (j !== i) others.push(ordered[j]);
      if (clearAt(edgeAt, node, node.dist, others, minGap, labelMinGap)) continue;
      const dist = solveDist(edgeAt, node, node.dist, others, minGap, labelMinGap);
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
    const size = estimateTitleBox(wedge.label, titleFontPx(S_REF));
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
    const radialStep = radialStepFor(group.nodes, labelGap, minGap, LABEL_MIN_GAP);
    let basePad = 0;
    let edgePad = 0;
    for (let i = 0; i < group.nodes.length; i++) {
      const node = group.nodes[i];
      basePad = Math.max(basePad, node.r + minGap);
      let pad = node.r + minGap / 2;
      if (node.labelW > 0 && node.labelH > 0) {
        pad = Math.max(pad, node.labelW / 2 + LABEL_MIN_GAP / 2);
      }
      edgePad = Math.max(edgePad, pad);
    }
    const wedge = {
      key: group.key,
      label: group.label,
      start,
      mid,
      span,
      radialStep,
      basePad,
      placed: []
    };
    let index = 0;
    let ring = 0;
    while (index < group.nodes.length && ring < 96) {
      const orbit = edgeAt(mid) + basePad + ring * radialStep;
      const gutter = Math.min(span * 0.49, edgePad / Math.max(orbit, 1));
      const usable = Math.max(0, span - gutter * 2);
      const budget = usable * Math.max(orbit, 1);
      const batch = [group.nodes[index]];
      while (index + batch.length < group.nodes.length) {
        const trial = batch.concat([group.nodes[index + batch.length]]);
        if (arcTotal(trial, minGap, LABEL_MIN_GAP) <= budget + 1e-6) batch.push(group.nodes[index + batch.length]);
        else break;
      }
      const total = arcTotal(batch, minGap, LABEL_MIN_GAP);
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
        if (k < batch.length - 1) acc += pairArc(batch[k], batch[k + 1], minGap, LABEL_MIN_GAP);
      }
      index += batch.length;
      ring += 1;
    }
    wedges.push(wedge);
  }

  resolveNodes(edgeAt, placed, minGap, LABEL_MIN_GAP);
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
