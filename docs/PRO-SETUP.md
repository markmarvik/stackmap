# Founding Pro setup

One-time purchase through Lemon Squeezy. The browser unlocks Pro with a license key. The license API needs no API key. Nothing in this repo should be a secret.

Store, product, and variant ids in `src/config/pro.js` start as placeholders (`0` and `REPLACE_`). Checkout stays disabled until those are real and the site is redeployed.

## Account setup (Mark does this; never automated)
Do these yourself. Don't share passwords, payout or tax details with anyone, including the bots.

1. **Sign up** at https://app.lemonsqueezy.com/register with your email. Turn on 2FA.
2. **Store:** create a store named StackMap, currency USD. The store subdomain becomes the checkout host (`<store>.lemonsqueezy.com`).
3. **Payouts:** Settings → Payouts. Serbia is on Lemon Squeezy's bank-payout list, and PayPal is the fallback. Payouts are sent in USD; pick RSD/EUR only if your bank account needs it (mid-market conversion). Check the current list when you sign up.
4. **Identity/tax verification:** Lemon Squeezy asks for identity verification and tax info before a store can go live. Lemon Squeezy is merchant of record, so it collects and remits sales tax/VAT for buyers. You still declare your payouts as income in Serbia (ask your accountant about the right status, e.g. a preduzetnik).
5. **Product:** Products → New product "StackMap Founding Pro", single payment.
   - Turn on **License keys**: activation limit 3 (phone + laptop + spare), no expiry.
   - Create **two variants**: "Founding" $19 and "Standard" $29. Optionally cap Founding at 100 sales if the dashboard offers a quantity limit; otherwise switch by config (below).
   - Confirmation email: keep the default receipt (it includes the license key).
6. **Test mode:** toggle Test mode (bottom-left of the dashboard). Repeat step 5 in test mode if products aren't shared. Test keys only work with test-mode purchases.
7. **Send these values back** (all public, none are secrets):
   - store id (number)
   - product id (number)
   - variant id for Founding and for Standard (numbers)
   - the two buy links (`https://<store>.lemonsqueezy.com/buy/<uuid>`), from test mode first
   Never send API keys, passwords, payout or tax details.

## Config fields

Edit `src/config/pro.js`.

| Field | What it is | Where to find it |
| --- | --- | --- |
| `storeId` | Numeric store id | Dashboard → **Settings → Store**. The number in the store URL. The license API also returns it as `meta.store_id`. |
| `productId` | Numeric product id | **Products** → open the product. The number in that URL. API field: `meta.product_id`. |
| `variants.founding` | Numeric variant id for the $19 price | On the product, open the Founding variant. The number in the variant URL or variant details. This is **not** the UUID in the buy link. |
| `variants.standard` | Numeric variant id for the $29 price | Same place, on the Standard variant. |
| `checkoutUrls.founding` | Buy link for $19 | Variant → **Share**. Shape: `https://YOURSTORE.lemonsqueezy.com/buy/<variant-uuid>`. |
| `checkoutUrls.standard` | Buy link for $29 | Same, on the Standard variant. |
| `activeVariant` | Which button the app shows | `'founding'` or `'standard'`. |
| `prices.founding` / `prices.standard` | Display copy only (`$19`, `$29`) | The amount charged is the variant price in Lemon Squeezy. Keep the strings in sync with that. |
| `foundingCap` | Display copy only (`100`) | The app does not count buyers. You watch the order count and flip the switch. |
| `revalidateDays` | How often an online browser re-checks a key | Default 7. |
| `offlineGraceDays` | How long Pro stays on when that re-check cannot reach the API | Default 30. After that, Pro stays off until a check succeeds. |

On the product, turn **license keys** on and set the activation limit. Both variants should generate a key, or a purchase will not have one to paste.

`isProConfigured()` is true only when `storeId`, `productId`, and the active variant id are non-zero and the active checkout URL has no `REPLACE_`. Until then the button reads “Checkout opens soon”.

### Switch the price after 100 buyers

Set `activeVariant: 'standard'` (and/or archive the founding variant in Lemon Squeezy), update the $19 sentences in `public/pricing.html`, then redeploy.

Keys from **both** variants keep working. Validation accepts either variant id in `PRO_CONFIG.variants`.

## Test checklist

1. In Lemon Squeezy, turn on **test mode**.
2. Paste the test-mode store id, product id, both variant ids, and both buy URLs into `src/config/pro.js`. Leave `activeVariant` as `'founding'`.
3. `npm run dev`.
4. Open the upgrade modal (footer **Pro**, or `http://localhost:5173/?pro=1`). The button should show **Checkout — $19 one-time**, not “Checkout opens soon”.
5. Buy with test card `4242 4242 4242 4242`, any future expiry, any CVC.
6. Copy the license key from the test receipt (or test orders). Do not commit it.
7. **Activate** in the modal. Pro turns on. The modal shows `Pro active · key ••••` plus the last 4 characters. The footer label reads **Pro active**.
8. Add a 16th stack item. It saves. On Free, the 16th item is refused with “Free stacks hold 15 items. Founding Pro removes the limit.” and the upgrade modal opens.
9. Print the protocol. There is no corner watermark. Download the PNG share card. It has no “Free” mark.
10. **Templates · Pro** merge into the stack (Desk day, Training day, Rest day, Travel week, Plate basics, Annual labs).
11. **Remove from this browser**. Pro turns off. A 16th new item is blocked again. Print shows the Free watermark. Template rows show a Pro badge and open the upgrade modal.
12. Revalidate path: DevTools → Application → localStorage → `stackmap-pro-license-v1`. Set `lastValidatedAt` to a date more than 7 days ago (keep the rest). Reload. The app POSTs to `/v1/licenses/validate`. A still-valid key refreshes `lastValidatedAt` and Pro stays on.
13. Refund the test order in the dashboard so the key is disabled. Set `lastValidatedAt` old again (or wait out `revalidateDays`) and reload. Pro turns off.

`node scripts/check-license.mjs <license_key>` prints `valid`, `status`, store / product / variant ids, and whether they match `src/config/pro.js`. It never prints the full key.

An old `stackmap-pro-key` or `aetheris-pro-key` value does not unlock Pro. Those keys are deleted on boot.

## CORS

Verified OK from `https://markmarvik.github.io` on 4 Oct 2026: `POST https://api.lemonsqueezy.com/v1/licenses/validate` responded with `Access-Control-Allow-Origin: *`. Activate and deactivate use the same host. The static site can call them directly. No API key, no proxy.

If that ever changes, the smallest fallback is a Cloudflare Worker that forwards POSTs to the three `/v1/licenses/*` endpoints. Not deployed. Point `LICENSE_API` in `src/core/License.js` and the URL in `scripts/check-license.mjs` at the worker.

```js
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Accept, Content-Type' } });
    }
    const action = new URL(request.url).pathname.replace(/^\//, '');
    if (!['activate', 'validate', 'deactivate'].includes(action)) return new Response('Unknown action', { status: 404 });
    const upstream = await fetch('https://api.lemonsqueezy.com/v1/licenses/' + action, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: await request.text()
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
```
