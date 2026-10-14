/**
 * Pure ?c= / ?n= query helpers. No DOM.
 * Node ids are trimmed, lowercased, and limited to [a-z0-9_-], max 64 chars,
 * so a crafted query cannot become a selector or a path.
 */

const CONSTELLATIONS = new Set([
  'all',
  'supplements',
  'habits',
  'exercises',
  'foods',
  'environment',
  'biomarkers'
]);

const ID_RE = /^[a-z0-9_-]{1,64}$/;

function queryString(search) {
  const raw = search == null ? '' : String(search);
  const hash = raw.indexOf('#');
  const bare = hash >= 0 ? raw.slice(0, hash) : raw;
  const q = bare.indexOf('?');
  if (q >= 0) return bare.slice(q + 1);
  if (bare.includes('=') && !bare.includes('/')) return bare;
  return '';
}

function cleanConstellation(value) {
  if (value == null) return null;
  const c = String(value).trim().toLowerCase();
  return CONSTELLATIONS.has(c) ? c : null;
}

function cleanNodeId(value) {
  if (value == null) return null;
  const n = String(value).trim().toLowerCase();
  if (!n || !ID_RE.test(n)) return null;
  return n;
}

/** @returns {{ c: string|null, n: string|null }} */
export function parseDeepLink(search) {
  const params = new URLSearchParams(queryString(search));
  return {
    c: cleanConstellation(params.get('c')),
    n: cleanNodeId(params.get('n'))
  };
}

/**
 * @param {string} base path, absolute URL, or existing query
 * @param {{ c?: string|null, n?: string|null }} link valid values are written; null drops the key
 */
export function buildDeepLink(base, link = {}) {
  const raw = base == null ? '' : String(base);
  const originMatch = raw.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]*)/i);
  const origin = originMatch ? originMatch[1] : '';
  const rest = origin ? raw.slice(origin.length) : raw;
  const hashAt = rest.indexOf('#');
  const hash = hashAt >= 0 ? rest.slice(hashAt) : '';
  const before = hashAt >= 0 ? rest.slice(0, hashAt) : rest;
  const q = before.indexOf('?');
  const path = q >= 0 ? before.slice(0, q) : before;
  const params = new URLSearchParams(q >= 0 ? before.slice(q + 1) : '');

  const c = cleanConstellation(link.c);
  if (c) params.set('c', c);
  else params.delete('c');

  const n = cleanNodeId(link.n);
  if (n) params.set('n', n);
  else params.delete('n');

  const qs = params.toString();
  return origin + path + (qs ? `?${qs}` : '') + hash;
}
