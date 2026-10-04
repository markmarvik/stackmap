/**
 * Lemon Squeezy license unlock. No API key — the public license routes are open.
 * CORS from https://markmarvik.github.io answered Access-Control-Allow-Origin: *
 * on 4 Oct 2026. If that ever changes, point LICENSE_API at a forwarder
 * (sketch in docs/PRO-SETUP.md). Do not log license keys.
 */

import { PRO_CONFIG } from '../config/pro.js';
import { readStorage, writeStorage } from './persist.js';

export const LICENSE_STORAGE_KEY = 'stackmap-pro-license-v1';

/** Change this if the public API stops sending CORS headers. */
const LICENSE_API = 'https://api.lemonsqueezy.com/v1/licenses/';
const INSTANCE_NAME = 'StackMap web';
const DAY_MS = 24 * 60 * 60 * 1000;

let toastFn = () => {};
let changeFn = () => {};

/** UI hooks. toast is for license loss; onChange refreshes Pro surfaces. */
export function setLicenseHooks(hooks = {}) {
  if (typeof hooks.toast === 'function') toastFn = hooks.toast;
  if (typeof hooks.onChange === 'function') changeFn = hooks.onChange;
}

function toast(msg) {
  try { toastFn(msg); } catch { /* UI not ready */ }
}

function emit(info) {
  try { changeFn(info || {}); } catch { /* UI not ready */ }
}

export function maskLicenseKey(key) {
  const tail = String(key || '').slice(-4);
  return tail ? `••••${tail}` : '••••';
}

function maskEmail(email) {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  if (at < 1) return '';
  const domain = s.slice(at + 1);
  if (!domain || !domain.includes('.')) return '';
  return `${s.slice(0, 1)}***@${domain}`;
}

function sameId(a, b) {
  const na = Number(a);
  const nb = Number(b);
  return Number.isFinite(na) && na === nb;
}

/** Store, product, and either variant id. Both prices stay valid after the switch. */
function metaMatches(meta) {
  if (!meta) return false;
  // Placeholder config (0s) must never match anything.
  if (!Number(PRO_CONFIG.storeId) || !Number(PRO_CONFIG.productId)) return false;
  if (!sameId(meta.store_id, PRO_CONFIG.storeId)) return false;
  if (!sameId(meta.product_id, PRO_CONFIG.productId)) return false;
  return Object.values(PRO_CONFIG.variants).some((id) => sameId(id, meta.variant_id));
}

function cacheMatches(cache) {
  return metaMatches({
    store_id: cache.storeId,
    product_id: cache.productId,
    variant_id: cache.variantId
  });
}

function ageMs(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return Infinity;
  return Date.now() - t;
}

function readCache() {
  const raw = readStorage(LICENSE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(record) {
  writeStorage(LICENSE_STORAGE_KEY, JSON.stringify(record));
}

function clearCache() {
  writeStorage(LICENSE_STORAGE_KEY, null);
}

function messageForApi(error, status) {
  const raw = String(error || '').toLowerCase();
  if (status === 404 || raw.includes('not found') || raw.includes('does not exist') || raw.includes('no license')) {
    return 'License key not found.';
  }
  if (raw.includes('limit')) return 'Activation limit reached.';
  if (raw.includes('expired') || raw.includes('disabled') || raw.includes('refund') || raw.includes('inactive')) {
    return 'This key is expired or disabled.';
  }
  return 'Could not activate this key.';
}

function networkError() {
  const err = new Error("Network error. Try again when you're online.");
  err.code = 'network';
  return err;
}

async function postLicense(action, fields) {
  let res;
  try {
    res = await fetch(`${LICENSE_API}${action}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(fields)
    });
  } catch {
    throw networkError();
  }
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  // 5xx / rate limit are temporary: treat like offline so a valid license isn't dropped.
  if (res.status >= 500 || res.status === 429) throw networkError();
  const payload = data && typeof data === 'object' ? data : {};
  payload._httpStatus = res.status;
  return payload;
}

async function releaseInstance(licenseKey, instanceId) {
  if (!licenseKey || !instanceId) return;
  try {
    await postLicense('deactivate', {
      license_key: licenseKey,
      instance_id: String(instanceId)
    });
  } catch { /* best effort */ }
}

/**
 * Synchronous. Pro is on only when the cache is active, matches this config,
 * and lastValidatedAt is still inside offlineGraceDays.
 */
export function isLicenseActive() {
  const cache = readCache();
  if (!cache) return false;
  if (String(cache.status || '').toLowerCase() !== 'active') return false;
  if (!cacheMatches(cache)) return false;
  return ageMs(cache.lastValidatedAt) < Number(PRO_CONFIG.offlineGraceDays) * DAY_MS;
}

/** Masked view for the modal. Never includes the raw key. */
export function getLicensePublicState() {
  const cache = readCache();
  return {
    active: isLicenseActive(),
    maskedKey: cache && cache.key ? maskLicenseKey(cache.key) : ''
  };
}

export async function activateLicense(key) {
  const trimmed = String(key || '').replace(/\s+/g, '');
  if (!trimmed) throw new Error('Enter a license key.');

  const data = await postLicense('activate', {
    license_key: trimmed,
    instance_name: INSTANCE_NAME
  });

  if (data.activated !== true) {
    throw new Error(messageForApi(data.error, data._httpStatus));
  }

  const instanceId = data.instance && data.instance.id ? String(data.instance.id) : '';
  if (!metaMatches(data.meta)) {
    // We just took a slot on someone else's product — give it back.
    await releaseInstance(trimmed, instanceId);
    throw new Error('This key is for a different product.');
  }

  const status = String(data.license_key?.status || '').toLowerCase();
  if (status !== 'active' || !instanceId) {
    await releaseInstance(trimmed, instanceId);
    throw new Error(status !== 'active'
      ? 'This key is expired or disabled.'
      : 'Activation did not return an instance. Try again.');
  }

  const record = {
    key: trimmed,
    instanceId,
    storeId: Number(data.meta.store_id),
    productId: Number(data.meta.product_id),
    variantId: Number(data.meta.variant_id),
    status,
    activatedAt: new Date().toISOString(),
    lastValidatedAt: new Date().toISOString()
  };
  const maskedEmail = maskEmail(data.meta.customer_email);
  if (maskedEmail) record.customerEmailMasked = maskedEmail;
  writeCache(record);
  emit({ type: 'activate' });
  return { ok: true, maskedKey: maskLicenseKey(trimmed) };
}

/**
 * Re-check when lastValidatedAt is older than revalidateDays.
 * valid false clears Pro. Network errors keep Pro inside the offline grace window.
 */
export async function revalidateIfStale() {
  const cache = readCache();
  if (!cache || !cache.key) return { ok: true, skipped: true };
  if (ageMs(cache.lastValidatedAt) < Number(PRO_CONFIG.revalidateDays) * DAY_MS) {
    return { ok: true, skipped: true };
  }

  const wasActive = isLicenseActive();
  try {
    const data = await postLicense('validate', {
      license_key: cache.key,
      instance_id: cache.instanceId || ''
    });
    // valid true is the API's answer. Missing status still counts as active.
    const reported = data.license_key && data.license_key.status;
    const status = String(reported || 'active').toLowerCase();
    if (data.valid === true && metaMatches(data.meta) && status === 'active') {
      cache.lastValidatedAt = new Date().toISOString();
      cache.status = status;
      cache.storeId = Number(data.meta.store_id);
      cache.productId = Number(data.meta.product_id);
      cache.variantId = Number(data.meta.variant_id);
      if (data.instance?.id) cache.instanceId = String(data.instance.id);
      const maskedEmail = maskEmail(data.meta.customer_email);
      if (maskedEmail) cache.customerEmailMasked = maskedEmail;
      writeCache(cache);
      emit({ type: 'refreshed' });
      return { ok: true, refreshed: true };
    }
    clearCache();
    toast('This license is no longer valid. Pro is off.');
    emit({ type: 'invalid' });
    return { ok: false, cleared: true };
  } catch {
    // Offline: keep the cache. isLicenseActive() already enforces the grace window.
    return { ok: false, offline: true, kept: wasActive };
  }
}

/** Clears the local cache even when the deactivate call fails. */
export async function deactivateLicense() {
  const cache = readCache();
  let remote = false;
  if (cache?.key && cache?.instanceId) {
    try {
      const data = await postLicense('deactivate', {
        license_key: cache.key,
        instance_id: cache.instanceId
      });
      remote = data.deactivated === true;
    } catch { /* still drop the local unlock */ }
  }
  clearCache();
  emit({ type: 'deactivate' });
  return { ok: true, remote };
}
