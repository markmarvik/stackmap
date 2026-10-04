/**
 * Lightweight analytics helper: cookieless GoatCounter.
 * Pageviews come from count.js; track() forwards named events.
 * Do NOT invent traffic numbers — this only emits events you choose to listen to.
 */

import { readStorage } from './persist.js';

/** GoatCounter site code → https://<code>.goatcounter.com. Register it (free) at goatcounter.com. */
export const GOATCOUNTER_CODE = 'stackmap';


const DEBUG = readStorage('stackmap-analytics-debug', ['aetheris-analytics-debug']) === '1';

/**
 * Track a named event with optional props.
 * @param {string} event
 * @param {Record<string, unknown>} [props]
 */
export function track(event, props = {}) {
  if (!event) return;
  try {
    // Events show up in GoatCounter as paths like "event/mystack_add" (props aren't sent: less data, cookieless).
    if (typeof window !== 'undefined' && window.goatcounter && typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({ path: `event/${event}`, title: event, event: true });
    }
  } catch {
    /* non-fatal */
  }
  if (DEBUG) {
    console.debug('[AETHERIS:track]', event, props);
  }
}

/** Page-load / boot ping (call once). */
export function trackPageView() {
  track('pageview', { path: typeof location !== 'undefined' ? location.pathname : '/' });
}

/** Constellation switch hook. */
export function trackConstellation(type) {
  track('constellation_switch', { constellation: String(type || '') });
}

export default { track, trackPageView, trackConstellation };

/**
 * Load GoatCounter's async count.js once. If the site code isn't registered yet the
 * request just fails in the background; nothing in the app depends on it.
 */
export function initAnalytics() {
  if (typeof document === 'undefined' || !GOATCOUNTER_CODE || document.getElementById('goatcounter-js')) return;
  const s = document.createElement('script');
  s.id = 'goatcounter-js';
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}
