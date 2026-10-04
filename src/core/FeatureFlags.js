/**
 * Soft Free / Pro feature flags (client-side stub).
 *
 * No real payment backend — Pro is unlocked by a localStorage license key
 * stub (`stackmap-pro-key`, migrated from `aetheris-pro-key`).
 * Soft limits warn but never hard-block.
 */

import { readStorage, removeStorage, writeStorage } from './persist.js';

export const APP_VERSION = '0.3.12';

export const PRO_LICENSE_KEY = 'stackmap-pro-key';
const LEGACY_PRO_LICENSE_KEY = 'aetheris-pro-key';

/** Free-tier soft ceiling for My Stack size. Soft warning only — never hard-block adds. */
export const FREE_STACK_LIMIT = 15;

/**
 * Hosted checkout URL (Lemon Squeezy / Stripe Payment Link).
 * Prefer Vite env `VITE_CHECKOUT_URL`; falls back to `#` placeholder.
 */
export const CHECKOUT_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_CHECKOUT_URL &&
    String(import.meta.env.VITE_CHECKOUT_URL).trim()) ||
  '#';

/** @deprecated alias — use CHECKOUT_URL */
export const PRICING_CHECKOUT_URL = CHECKOUT_URL;

/** Static pricing page (copied from public/ → site root). */
export function pricingPageUrl() {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  return `${base}pricing.html`;
}

/** Feedback form placeholder — swap for Tally / Formspree URL when ready. */
export const FEEDBACK_FORM_URL = 'https://tally.so/r/wAetherisFeedbackPlaceholder';

/**
 * Whether Pro is unlocked. Stub: any non-empty localStorage value under PRO_LICENSE_KEY.
 * Future: validate against hosted checkout delivery / signed token.
 */
export function isPro() {
  const v = readStorage(PRO_LICENSE_KEY, [LEGACY_PRO_LICENSE_KEY]);
  return !!(v && String(v).trim());
}

/** Soft-set a license key (dev / founding buyers). Empty string clears Pro. */
export function setProKey(key) {
  const trimmed = key == null ? '' : String(key).trim();
  writeStorage(PRO_LICENSE_KEY, trimmed || null);
  removeStorage([LEGACY_PRO_LICENSE_KEY]);
}

/** True when stack count is over the free soft limit and user is not Pro. */
export function isOverFreeStackLimit(count) {
  if (isPro()) return false;
  return Number(count) > FREE_STACK_LIMIT;
}

/** Soft gate helper: Pro-preferred features still work on Free with watermark/hint. */
export function softProGate(featureLabel = 'this feature') {
  if (isPro()) return { allowed: true, pro: true, hint: null };
  return {
    allowed: true, // soft — still allow
    pro: false,
    hint: `${featureLabel} is a Pro perk — Free works with limits. Checkout coming soon.`
  };
}

export const FeatureFlags = {
  APP_VERSION,
  FREE_STACK_LIMIT,
  PRO_LICENSE_KEY,
  CHECKOUT_URL,
  PRICING_CHECKOUT_URL,
  pricingPageUrl,
  FEEDBACK_FORM_URL,
  isPro,
  setProKey,
  isOverFreeStackLimit,
  softProGate
};

export default FeatureFlags;
