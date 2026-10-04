/**
 * Founding Pro — Lemon Squeezy placeholders.
 *
 * Every 0 and every REPLACE_ string is a placeholder. The app does not charge
 * until these are filled in and the site is redeployed. Nothing here is secret:
 * the license API is public and needs no API key.
 *
 * Where each value comes from in the Lemon Squeezy dashboard:
 * - storeId — Settings → Store. The number in the store URL, also meta.store_id on a license.
 * - productId — Products → open the product. The number in that URL, also meta.product_id.
 * - variants.founding / variants.standard — numeric variant ids (variant URL or variant
 *   details). These are NOT the UUID in the buy link.
 * - checkoutUrls.* — variant → Share. Looks like
 *   https://YOURSTORE.lemonsqueezy.com/buy/<variant-uuid>.
 * - prices.* — display copy only. The amount charged is the variant price in Lemon Squeezy.
 * - foundingCap — display copy only. This app does not count buyers.
 * - revalidateDays — how often an online browser re-checks a key.
 * - offlineGraceDays — how long Pro stays on when that re-check cannot reach the API.
 * - activeVariant — which price and checkout URL the upgrade button uses.
 *
 * HOW TO SWITCH PRICE after 100 buyers: set activeVariant: 'standard'
 * (and/or archive the founding variant in Lemon Squeezy) then redeploy.
 * Keys from BOTH variants keep working because validation accepts either variant id.
 * Also update the hard-coded $19 copy in public/pricing.html.
 */

export const PRO_CONFIG = {
  storeId: 0,
  productId: 0,
  variants: { founding: 0, standard: 0 },
  activeVariant: 'founding',
  checkoutUrls: {
    founding: 'https://REPLACE_STORE.lemonsqueezy.com/buy/REPLACE_FOUNDING_VARIANT_UUID',
    standard: 'https://REPLACE_STORE.lemonsqueezy.com/buy/REPLACE_STANDARD_VARIANT_UUID'
  },
  prices: { founding: '$19', standard: '$29' },
  foundingCap: 100,
  revalidateDays: 7,
  offlineGraceDays: 30
};

/** True only when the active checkout can actually open. Placeholders stay false. */
export function isProConfigured() {
  const variantId = Number(PRO_CONFIG.variants?.[PRO_CONFIG.activeVariant]);
  const url = String(PRO_CONFIG.checkoutUrls?.[PRO_CONFIG.activeVariant] || '');
  return Number(PRO_CONFIG.storeId) !== 0
    && Number(PRO_CONFIG.productId) !== 0
    && Number.isFinite(variantId)
    && variantId !== 0
    && url.length > 0
    && !url.includes('REPLACE_');
}
