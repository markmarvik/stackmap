/**
 * Share card — Canvas 2D PNG export of My Stack summary.
 * No html2canvas / heavy deps — pure Canvas 2D.
 */

import { PRODUCT_NAME, PUBLIC_HOST_LABEL } from './Brand.js';

/**
 * @typedef {{ id: string, constellation: string, note?: string, slot?: string, name?: string }} StackCardEntry
 */

/**
 * Draw and download a PNG share card for the current stack.
 * @param {StackCardEntry[]} entries
 * @param {{ isPro?: boolean, title?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function downloadStackShareCard(entries, opts = {}) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) {
    return { ok: false, reason: 'empty' };
  }

  const W = 720;
  const pad = 28;
  const lineH = 28;
  const headerH = 110;
  const footerH = 48;
  const maxRows = Math.min(list.length, 24);
  const H = headerH + maxRows * lineH + footerH + (list.length > maxRows ? lineH : 0);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'no-canvas' };

  // Background
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, H);
  // Gold accent bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#d4af37');
  grad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 4);

  // Title
  ctx.fillStyle = '#f4e9c8';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(opts.title || `${PRODUCT_NAME} · My Stack`, pad, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${list.length} item${list.length === 1 ? '' : 's'} · educational map only`, pad, 70);
  ctx.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), pad, 92);

  // Rows
  let y = headerH;
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  for (let i = 0; i < maxRows; i++) {
    const e = list[i];
    const name = e.name || e.id;
    const slot = e.slot === 'morning' ? '☀' : e.slot === 'evening' ? '☾' : '·';
    const noteBit = e.note ? ` — ${String(e.note).slice(0, 42)}${e.note.length > 42 ? '…' : ''}` : '';
    const line = `${slot}  ${name}  (${e.constellation})${noteBit}`;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
    ctx.fillRect(pad - 8, y - 18, W - pad * 2 + 16, lineH);
    ctx.fillStyle = '#e8e6df';
    ctx.fillText(truncate(ctx, line, W - pad * 2), pad, y);
    y += lineH;
  }
  if (list.length > maxRows) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`… +${list.length - maxRows} more`, pad, y);
  }

  // Source line stays so the PNG names where it came from.
  // The Free mark is the watermark — Pro cards omit it.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(PUBLIC_HOST_LABEL, pad, H - 18);
  if (!opts.isPro) {
    ctx.fillStyle = 'rgba(245,158,11,0.55)';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Free', W - pad, H - 18);
    ctx.textAlign = 'left';
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return { ok: false, reason: 'blob' };
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stackmap-my-stack.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true };
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + '…').width > maxW) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

export default { downloadStackShareCard };
