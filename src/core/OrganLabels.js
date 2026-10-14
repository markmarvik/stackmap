import { ORGAN_LABELS } from './OrganExplode.js';

export const ORGAN_LABEL_TEXT = {
  ...ORGAN_LABELS,
  tongue: 'Tongue',
  teeth: 'Teeth',
  spleen: 'Spleen',
  bladder: 'Bladder',
  glands: 'Glands'
};

const ABOVE_KEYS = new Set(['brain', 'eyes', 'teeth']);

function cmpStr(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) return -1;
  if (sb < sa) return 1;
  return 0;
}

function boxesNeedGap(a, b, minGap) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gapX >= minGap || gapY >= minGap) return false;
  if (gapX < 0 && gapY < 0) return true;
  if (gapX < 0) return gapY < minGap;
  if (gapY < 0) return gapX < minGap;
  return Math.hypot(gapX, gapY) < minGap;
}

function shiftBox(item, dy) {
  item.y += dy;
  item.textY += dy;
}

function leaderFor(item) {
  if (item.mode === 'above') {
    const naturalBottom = item.anchorY - item.hy - item.aboveGap;
    const moved = Math.abs(item.textX - item.anchorX) > 0.5 || Math.abs(item.y + item.h - naturalBottom) > 0.5;
    if (!moved) return null;
    return {
      x1: item.anchorX,
      y1: item.anchorY - item.hy,
      x2: item.textX,
      y2: item.y + item.h
    };
  }
  if (Math.abs(item.textY - item.anchorY) <= 0.5) return null;
  const side = item.mode === 'left' ? -1 : 1;
  return {
    x1: item.anchorX + side * item.hx,
    y1: item.anchorY,
    x2: side < 0 ? item.x + item.w : item.x,
    y2: item.textY
  };
}

function refreshLeader(item) {
  item.leader = leaderFor(item);
}

export function stackOrganLabels(items, opts) {
  const options = opts || {};
  const minGap = Number.isFinite(options.minGap) ? options.minGap : 4;
  const fontPx = Number.isFinite(options.fontPx) ? options.fontPx : 13;
  const widthFactor = Number.isFinite(options.widthFactor) ? options.widthFactor : 0.6;
  const sidePad = Number.isFinite(options.sidePad) ? options.sidePad : 10;
  const aboveGap = Number.isFinite(options.aboveGap) ? options.aboveGap : 6;
  const prepared = [];
  for (const raw of items || []) {
    if (!raw) continue;
    const label = raw.label == null ? '' : String(raw.label);
    if (!label) continue;
    const labelW = Number.isFinite(raw.labelW) ? raw.labelW : label.length * fontPx * widthFactor;
    const labelH = Number.isFinite(raw.labelH) ? raw.labelH : fontPx;
    prepared.push({
      key: raw.key,
      label,
      anchorX: raw.x || 0,
      anchorY: raw.y || 0,
      hx: Number.isFinite(raw.hx) ? raw.hx : 16,
      hy: Number.isFinite(raw.hy) ? raw.hy : 16,
      above: raw.above != null ? !!raw.above : ABOVE_KEYS.has(raw.key),
      labelW: Math.max(1, labelW),
      labelH: Math.max(1, labelH),
      aboveGap
    });
  }

  const top = [];
  const left = [];
  const right = [];
  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i];
    if (item.above) top.push(item);
    else if (item.anchorX < 0) left.push(item);
    else right.push(item);
  }

  const placed = [];

  top.sort((a, b) => a.anchorX - b.anchorX || cmpStr(a.key, b.key));
  let prevRight = -Infinity;
  for (let i = 0; i < top.length; i++) {
    const item = top[i];
    let leftEdge = item.anchorX - item.labelW / 2;
    if (leftEdge < prevRight + minGap) leftEdge = prevRight + minGap;
    const textX = leftEdge + item.labelW / 2;
    const textY = item.anchorY - item.hy - aboveGap;
    const box = {
      key: item.key,
      label: item.label,
      textX,
      textY,
      align: 'center',
      baseline: 'bottom',
      x: leftEdge,
      y: textY - item.labelH,
      w: item.labelW,
      h: item.labelH,
      anchorX: item.anchorX,
      anchorY: item.anchorY,
      hx: item.hx,
      hy: item.hy,
      aboveGap,
      mode: 'above',
      leader: null
    };
    refreshLeader(box);
    prevRight = leftEdge + item.labelW;
    placed.push(box);
  }

  const placeSide = (list, mode) => {
    list.sort((a, b) => a.anchorY - b.anchorY || a.anchorX - b.anchorX || cmpStr(a.key, b.key));
    let prevBottom = -Infinity;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      let topEdge = item.anchorY - item.labelH / 2;
      if (topEdge < prevBottom + minGap) topEdge = prevBottom + minGap;
      const textY = topEdge + item.labelH / 2;
      const edge = item.hx + sidePad;
      const textX = mode === 'left' ? item.anchorX - edge : item.anchorX + edge;
      const boxX = mode === 'left' ? textX - item.labelW : textX;
      const box = {
        key: item.key,
        label: item.label,
        textX,
        textY,
        align: mode === 'left' ? 'right' : 'left',
        baseline: 'middle',
        x: boxX,
        y: topEdge,
        w: item.labelW,
        h: item.labelH,
        anchorX: item.anchorX,
        anchorY: item.anchorY,
        hx: item.hx,
        hy: item.hy,
        aboveGap,
        mode,
        leader: null
      };
      refreshLeader(box);
      prevBottom = topEdge + item.labelH;
      placed.push(box);
    }
  };
  placeSide(left, 'left');
  placeSide(right, 'right');

  const order = placed.slice().sort((a, b) => a.y - b.y || a.x - b.x || cmpStr(a.key, b.key));
  for (let pass = 0; pass < order.length * order.length + 1; pass++) {
    let moved = false;
    for (let i = 0; i < order.length; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const a = order[i];
        const b = order[j];
        if (!boxesNeedGap(a, b, minGap)) continue;
        const aMid = a.y + a.h / 2;
        const bMid = b.y + b.h / 2;
        let mover = aMid <= bMid ? b : a;
        let other = mover === a ? b : a;
        if (a.mode === 'above' && b.mode !== 'above') {
          mover = a;
          other = b;
        } else if (b.mode === 'above' && a.mode !== 'above') {
          mover = b;
          other = a;
        }
        if (mover.mode === 'above' && other.mode !== 'above') {
          const newBottom = other.y - minGap;
          const dy = newBottom - (mover.y + mover.h);
          if (dy < -1e-6) {
            shiftBox(mover, dy);
            moved = true;
          } else {
            shiftBox(mover, -(minGap + mover.h));
            moved = true;
          }
        } else {
          const newTop = other.y + other.h + minGap;
          const dy = newTop - mover.y;
          if (dy > 1e-6) shiftBox(mover, dy);
          else shiftBox(mover, minGap);
          moved = true;
        }
        refreshLeader(mover);
      }
    }
    if (!moved) break;
  }

  const byKey = new Map();
  for (let i = 0; i < placed.length; i++) byKey.set(placed[i].key, placed[i]);
  const out = [];
  for (let i = 0; i < prepared.length; i++) {
    const box = byKey.get(prepared[i].key);
    if (!box) continue;
    out.push({
      key: box.key,
      label: box.label,
      textX: box.textX,
      textY: box.textY,
      align: box.align,
      baseline: box.baseline,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      leader: box.leader
    });
  }
  return out;
}
