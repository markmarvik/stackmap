/**
 * Check a Lemon Squeezy license key against src/config/pro.js.
 * Usage: node scripts/check-license.mjs <license_key>
 * POSTs validate with no instance id. Never prints the full key.
 */

import { PRO_CONFIG, isProConfigured } from '../src/config/pro.js';

const key = process.argv[2];
if (!key || process.argv.length > 3) {
  console.error('Usage: node scripts/check-license.mjs <license_key>');
  process.exit(1);
}

const trimmed = String(key).replace(/\s+/g, '');

function mask(value) {
  const tail = String(value || '').slice(-4);
  return tail ? `••••${tail}` : '••••';
}

function redact(text) {
  const raw = String(text || '');
  if (!trimmed) return raw;
  return raw.split(trimmed).join(mask(trimmed));
}

let res;
try {
  res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ license_key: trimmed })
  });
} catch (err) {
  console.error('Network error.', err && err.message ? err.message : '');
  process.exit(1);
}

let data = {};
try {
  data = await res.json();
} catch {
  console.error('License server did not return JSON. HTTP', res.status);
  process.exit(1);
}

const meta = data.meta || {};
const license = data.license_key || {};
const variantIds = Object.values(PRO_CONFIG.variants).map((id) => Number(id));
const matchesConfig = Number(meta.store_id) === Number(PRO_CONFIG.storeId)
  && Number(meta.product_id) === Number(PRO_CONFIG.productId)
  && variantIds.includes(Number(meta.variant_id));

const out = {
  key: mask(trimmed),
  httpStatus: res.status,
  valid: data.valid === true,
  status: license.status || null,
  error: data.error ? redact(data.error) : null,
  store_id: meta.store_id ?? null,
  product_id: meta.product_id ?? null,
  variant_id: meta.variant_id ?? null,
  matchesConfig,
  configReady: isProConfigured(),
  expected: {
    storeId: PRO_CONFIG.storeId,
    productId: PRO_CONFIG.productId,
    variants: PRO_CONFIG.variants
  }
};

console.log(JSON.stringify(out, null, 2));
