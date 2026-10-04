/**
 * Free / Pro flags.
 *
 * Pro is a Lemon Squeezy license cached in this browser (see License.js).
 * There is no API key. Ids and checkout URLs live in src/config/pro.js.
 * Old localStorage stubs (stackmap-pro-key, aetheris-pro-key) do not unlock Pro
 * and are removed on boot.
 *
 * FREE_STACK_LIMIT is a hard cap for Free. Stacks already over the cap are kept
 * and cannot grow. Print and share stay available; Free gets a watermark.
 */

import { isLicenseActive } from './License.js';
import { PRO_CONFIG, isProConfigured } from '../config/pro.js';
import { removeStorage } from './persist.js';

export const APP_VERSION = '0.4.0';

/** Legacy any-string keys. Removed so they cannot be mistaken for a real license. */
const LEGACY_PRO_KEYS = ['stackmap-pro-key', 'aetheris-pro-key'];
removeStorage(LEGACY_PRO_KEYS);

/** Free-tier cap for My Stack size. Hard block on new items; never deletes existing rows. */
export const FREE_STACK_LIMIT = 15;

/**
 * Active checkout URL, or '#' until src/config/pro.js is filled in.
 * The upgrade modal uses PRO_CONFIG directly.
 */
export const CHECKOUT_URL = isProConfigured()
  ? PRO_CONFIG.checkoutUrls[PRO_CONFIG.activeVariant]
  : '#';

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

/** Whether a validated license is cached and still inside the offline grace window. */
export function isPro() {
  return isLicenseActive();
}

/** True when a Free stack is already past the cap (kept as-is, cannot grow). */
export function isOverFreeStackLimit(count) {
  if (isPro()) return false;
  return Number(count) > FREE_STACK_LIMIT;
}

/** Print and share still run on Free. The watermark is the difference. */
export function softProGate(featureLabel = 'this feature') {
  if (isPro()) return { allowed: true, pro: true, hint: null };
  return {
    allowed: true,
    pro: false,
    hint: `${featureLabel} includes a Free watermark. Founding Pro removes it.`
  };
}

export const FeatureFlags = {
  APP_VERSION,
  FREE_STACK_LIMIT,
  CHECKOUT_URL,
  PRICING_CHECKOUT_URL,
  pricingPageUrl,
  FEEDBACK_FORM_URL,
  isPro,
  isOverFreeStackLimit,
  softProGate
};

export default FeatureFlags;
