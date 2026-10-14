export function labelFontPx(r, scale, options) {
  const opts = options || {};
  const minScreen = opts.minScreen == null ? 10.5 : opts.minScreen;
  const maxScreen = opts.maxScreen == null ? 13 : opts.maxScreen;
  const safeScale = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const radius = Number.isFinite(r) ? r : 0;
  const natural = Math.round(Math.max(8, Math.min(11, radius * 0.38)));
  const screen = natural * safeScale;
  if (screen < minScreen) return minScreen / safeScale;
  if (screen > maxScreen) return maxScreen / safeScale;
  return natural;
}

export function fitLabel(text, maxWidthPx, measure) {
  const s = text == null ? '' : String(text);
  if (!s) return '';
  if (typeof measure !== 'function') return s;
  if (measure(s) <= maxWidthPx) return s;
  const ell = '…';
  let lo = 1;
  let hi = s.length - 1;
  let best = s.charAt(0) + ell;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = s.slice(0, mid) + ell;
    if (measure(candidate) <= maxWidthPx) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function createLabelCollider(cellSize = 48) {
  const size = cellSize > 0 && Number.isFinite(cellSize) ? cellSize : 48;
  const cells = new Map();
  const pool = [];
  let count = 0;
  let frame = 1;

  function keyOf(ix, iy) {
    return ix * 65536 + iy;
  }

  function overlaps(x, y, w, h) {
    const x0 = Math.floor(x / size);
    const y0 = Math.floor(y / size);
    const x1 = Math.floor((x + w) / size);
    const y1 = Math.floor((y + h) / size);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const cell = cells.get(keyOf(ix, iy));
        if (!cell || cell.frame !== frame) continue;
        const items = cell.items;
        for (let i = 0; i < items.length; i++) {
          const b = items[i];
          if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
        }
      }
    }
    return false;
  }

  function occupy(x, y, w, h) {
    const box = pool[count] || (pool[count] = { x: 0, y: 0, w: 0, h: 0 });
    box.x = x;
    box.y = y;
    box.w = w;
    box.h = h;
    count += 1;
    const x0 = Math.floor(x / size);
    const y0 = Math.floor(y / size);
    const x1 = Math.floor((x + w) / size);
    const y1 = Math.floor((y + h) / size);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const key = keyOf(ix, iy);
        let cell = cells.get(key);
        if (!cell) {
          cell = { frame: 0, items: [] };
          cells.set(key, cell);
        }
        if (cell.frame !== frame) {
          cell.frame = frame;
          cell.items.length = 0;
        }
        cell.items.push(box);
      }
    }
  }

  return {
    reset() {
      frame += 1;
      count = 0;
      if (frame > 1e9 || cells.size > 4000) {
        frame = 1;
        cells.clear();
      }
    },
    place(x, y, w, h, step) {
      if (!(w > 0) || !(h > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
      const gap = step > 0 && Number.isFinite(step) ? step : h;
      let dy = 0;
      for (let i = 0; i < 8; i++) {
        dy = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * gap;
        if (!overlaps(x, y + dy, w, h)) break;
      }
      occupy(x, y + dy, w, h);
      return dy;
    }
  };
}
