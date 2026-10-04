# UI and system overhaul

**Brand:** StackMap (locked 2026-09-21). **Repo:** `markmarvik/stackmap`.  
**Live path:** https://stackmap-31c.pages.dev/  
**Started:** v0.3.7 · repo rename v0.3.8

GitHub redirects `github.com/markmarvik/aetheris` to this repo. Project Pages do not redirect, so the public site is only the `/stackmap/` path.

## Shipped in v0.3.7

- User-facing name is StackMap, with “formerly Aetheris” on the map mark, pricing, print, and share card.
- Open Graph / Twitter cards match the in-app title.
- Browser data moves forward on read: `stackmap-*` keys, copied from `aetheris-*` so existing stacks, personal stats, Pro keys, and dismissed tips survive.
- JSON export is `app: "stackmap"` and still imports older `aetheris` files.
- Runtime namespace stays `window.AETHERIS` for this release (canvas, inspector, and modal already call it).
- Desktop right rail is one tool at a time: **Map**, **Body**, or **Stack**. Phone layout stays the stacked column plus bottom sheets.

## Still the system, not a rewrite

`src/main.js` remains the shell (constellation switch, inspector, personal corner, My Stack, pricing). Split it only when a slice has a caller:

| Module | Pull out of `main.js` when touched |
|--------|--------------------------------------|
| `src/shell/constellations.js` | switch + deep link `?c=` |
| `src/shell/inspector.js` | `populateInspector` |
| `src/shell/personal.js` | Personal Corner |
| `src/shell/mystackUi.js` | list, print, import/export |
| `src/shell/rail.js` | Map / Body / Stack modes |

Do not rename `window.AETHERIS` in the same change as a shell split.

## Product work that is not this overhaul

Follow `docs/THREE_MONTH_PLAN.md`: Month 1 is a supplements quality pass, not new constellations and not a canvas rewrite. Anatomy Phase 2 art (#36), live checkout (#37), and Plausible (#39) stay their own PRs.
