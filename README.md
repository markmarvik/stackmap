# StackMap — Longevity Constellation

Formerly **Aetheris**. Repository: **https://github.com/markmarvik/stackmap**. Live site: **https://markmarvik.github.io/stackmap/**.

`github.com/markmarvik/aetheris` redirects to this repo. The old Pages address does not.

## Current Status (v0.3.11)

**Launch polish (v0.3.11):** social preview image + favicon, privacy and terms pages, medical disclaimer on every screen size, faster font loading, mobile map picker collapses so the map is visible.

**Active stack (v0.3.10):** My Stack has an **All / Active** toggle on the personal map. Each saved item stays **Active** until you mark it **Paused**; Active view shows only stack items that are still active. The choice is saved in this browser.

**All nodes (v0.3.9):** the Map list includes **All nodes**, one map of every constellation, framed to the screen. The crosshairs button fits whatever is visible. Names show when you zoom in; `/` still jumps to a node. New nodes landed in every constellation, and a few headline supplement lines were rewritten into neutral, educational wording.

**Find + starters (v0.3.8):** search any node (`/` focuses the box) and jump to it, including across constellations. My Stack includes five starter sets (Sleep base, Foundation, Train, Plate, First labs) that merge into the saved stack.
**Shell (v0.3.7):** product name StackMap across the map, pricing, print, and share card. Browser data copies forward from `aetheris-*` localStorage keys. Desktop right rail is Map / Body / Stack — one tool at a time. Phone keeps the stacked column.

**Map UX (multi-constellation):**
- Body-centric canvas: central human figure with nodes in organ rings
- Constellations: Supplements, Habits, Exercises, Foods, Environment, **Biomarkers**
- Biomarkers cover blood + urine + saliva (+ other) via `specimen_type` (Issue #14)
- **My Stack depth (v0.3.0)**: notes + morning/evening slots, import replace/merge, empty states, Canvas PNG share card, printable protocol
- **First-run tip (v0.3.2)**: one-time dismissible coach mark — select node → Add to My Stack → Anatomy (localStorage)
- **Constellation deep-link (v0.3.2)**: `?c=habits|exercises|foods|environment|biomarkers|supplements` switches on load (shareable)
- **Footer polish (v0.3.2)**: Feedback + Pricing + version string stay visible on mobile without heavy map cover
- **Touch pan polish (v0.3.1)**: RAF-coalesced drag, inertia on release, chrome ignore (bottom sheet / anatomy), pinch→one-finger handoff
- **Static pricing (v0.3.1)**: `/pricing.html` Free vs Founding Pro $29 + footer/modal links (`CHECKOUT_URL` / `VITE_CHECKOUT_URL` stub)
- **Print protocol (v0.3.1)**: cleaner `@media print` + organ coverage scores
- **Free/Pro soft scaffold**: `FeatureFlags` + localStorage license key stub; soft stack-limit warnings (no hard paywall); Pricing modal “Coming soon”
- **Analytics + feedback**: `track()` stub + constellation hooks; footer Feedback (Tally placeholder)
- **Layered anatomy** (Issue #16 Phase 1): independent opacity for base / organs / skeleton / muscles + view presets; **mobile** opens as fixed bottom sheet (v0.2.8)
- **Organ impact** (v0.3.0): My Stack → tagged systems coverage strip + anatomy highlight
- **Organ explode (v0.3.3+)**: hover/tap the central body to spread organs; constellation nodes also spread radially so they clear the organ ring; click an organ to highlight linked nodes (green = positive framing, red = higher-risk / negative) — educational “nodes linked to this organ” only
- **Explode node spread (v0.3.4)**: nodes ease outward with the same explode progress (closer-to-body nodes move more)
- **Explode organ spacing (v0.3.5)**: retuned organ ring (staggered radii + even-ish angles) so exploded sprites no longer stack; node push bumped to clear the wider ring
- **Explode node labels (v0.3.6)**: score/value text inside nodes uses the same explode draw position as circles (BiomarkerTree override was lagging at home coords)
- HiDPI rendering via `CanvasViewport` (sharp nodes and labels)
- 2D pan (drag + inertia), zoom toward pointer (wheel / pinch / +/-), recenter (`r`)
- Dynamic layout: larger nodes closer to body, collision + body keep-out settling
- Category group toggles on the map (+ specimen filters for Biomarkers)
- `HoverPopup` on hover and click (pinned until click away or Esc)
- Sidebar detail panel + Gorkipedia explorer modal

**Keyboard:** `Esc` reset · `+`/`-` zoom · `r` recenter · `f` show all groups

**Development (recommended):**
```bash
cd stackmap
npm install
npm run dev
```

> **Note:** Do not open `index.html` directly in a browser. The project uses Vite + ES module imports (including CSS). Use `npm run dev` (or `npm run build && npm run preview`) instead. Direct file:// or raw static serving will fail to load modules correctly.

## Architecture

| Area | Location |
|------|----------|
| Entry + input | [`src/main.js`](src/main.js) |
| Tree classes | [`src/trees/SupplementTree.js`](src/trees/SupplementTree.js), Habits / Exercise / Foods / Environment / [`BiomarkerTree.js`](src/trees/BiomarkerTree.js) |
| Layered anatomy | [`src/core/AnatomyRenderer.js`](src/core/AnatomyRenderer.js) + body draw in SupplementTree |
| Organ explode + node spread | [`src/core/OrganExplode.js`](src/core/OrganExplode.js) + body/node draw / hit-test in SupplementTree |
| HiDPI canvas | [`src/core/CanvasViewport.js`](src/core/CanvasViewport.js) |
| Data | [`src/data/supplements.js`](src/data/supplements.js), habits, exercises, foods, environment, [`biomarkers.js`](src/data/biomarkers.js) |
| Hover card | [`src/components/HoverPopup.js`](src/components/HoverPopup.js) |
| Deep dive modal | [`src/components/ExplorerModal.js`](src/components/ExplorerModal.js) |
| Legacy layout helper | [`src/core/LayoutEngine.js`](src/core/LayoutEngine.js) (polar prototype; tree uses `_settleNodePositions`) |
| Optional sidebar SVG body | [`src/components/OrganDiagram.js`](src/components/OrganDiagram.js) (not wired; body drawn on canvas) |
| Product plans | [`docs/ROADMAP_V1.md`](docs/ROADMAP_V1.md), [`docs/IMPROVEMENT_PLAN.md`](docs/IMPROVEMENT_PLAN.md), [`docs/MONETIZATION_ROADMAP.md`](docs/MONETIZATION_ROADMAP.md) |

## Building

```bash
npm run build   # output in dist/
npm run preview
```

## Deployment on GitHub Pages

This project is hosted on GitHub Pages at: **https://markmarvik.github.io/stackmap/**

The site uses a production `base` of `/stackmap/` so all JS, CSS, and asset URLs (including body PNG layers) are correct for the sub-path.

### Requirements
- **Node.js 24+** (enforced via `package.json#engines` and `.nvmrc`)
- `npm install`

> **Note:** Do not open `index.html` directly. Use `npm run dev` or the built `dist/`.

### Local production build
```bash
npm run build
npm run preview
```

### GitHub Pages Deployment
A GitHub Actions workflow builds the project with **Node 24** on every push to `main` and deploys only the `dist/` folder.

- `vite.config.js` sets the correct base for the `/stackmap/` subpath.
- `public/.nojekyll` is present to prevent Jekyll processing.
- Workflow uses `actions/setup-node` (v24), `npm ci`, `npm run build`, and the official `actions/deploy-pages`.

**One-time setup in the GitHub repo UI (required):**
1. Go to **Settings → Pages**
2. Under "Build and deployment", set **Source** to **GitHub Actions** (not "Deploy from a branch")
3. If Source is "Deploy from a branch" / `main` `/`, the live site serves raw `index.html` + `src/main.js` and looks like HTML-only — switch to Actions and re-run this workflow

After the setting change, push to `main` (or run the workflow manually from the Actions tab). The site should update within a couple of minutes.

All built assets (JS modules, CSS, body PNGs) are emitted under `/stackmap/assets/...`.


## Anatomy assets (Issue #16)

Folder layout under `public/assets/body/`:

```
base/          body-male.png, body-female.png     (real art)
organs/        brain, eyes, gut, heart, liver, lungs, mito, nerves, stomach, thyroid  (real)
               + spine, kidneys, pancreas, adrenals                                  (Phase 1 placeholders)
skeleton/      skeleton_full.png                                                     (placeholder)
muscles/       muscles_anterior.png, muscles_posterior.png                           (placeholders)
```

**UI:** right-side **Anatomy** panel → presets (Organs / Musculoskeletal / Combined / Skeletal only / Muscles only) + per-layer opacity sliders. State lives in `AnatomyRenderer`; drawing stays in `SupplementTree._drawCentralBodyPng` so pan/zoom/HiDPI keep working.

### Real art still needed (follow-up)
Replace placeholders with transparent PNGs (same scale language as existing organ assets):
- Photoreal / illustrated `spine.png`, `kidneys.png`, `pancreas.png`, `adrenals.png`
- `skeleton_full.png` (or torso + limb bones)
- `muscles_anterior.png` / `muscles_posterior.png` (+ optional arm/leg detail sheets)
- Limb insets / click-to-zoom (Phase 2 of #16 — deferred)

### Extending layers
1. Drop PNGs into the folders above (names match `AnatomyRenderer` load list).
2. Add organ keys to `ORGAN_ASSET_KEYS` / `PNG_ORGAN_CONFIG` / `_getOrganPositions` / `organMeta` as needed.
3. Tag data nodes with matching `organs: [...]` so rings + highlights resolve.

## Roadmap

Concrete path to **v1.0:** [`docs/ROADMAP_V1.md`](docs/ROADMAP_V1.md).

- ~~Touch/pointer pan for mobile~~ (shipped)
- Zoom toward cursor polish
- ~~More constellations~~ (Exercise, Foods, Environment, Biomarkers shipped)
- ~~Layered anatomy Phase 1~~ (opacity presets + placeholders) — #16
- ~~Anatomy mobile bottom sheet~~ — v0.2.8: fixed overlay on phone (`#anatomy-panel`, z-100); desktop right-rail unchanged
- Layered anatomy Phase 2: photoreal spine/kidneys/MSK art + limb detail
- ~~`OrganSystem` cumulative organ impact across trees~~ — v0.3.0: My Stack rollup + inspector/stack strip
- ~~My Stack (localStorage + highlight + export/import + preview Add)~~ — v0.2.7: bottom-sheet button clicks fixed (bubble-phase stopPropagation); preview one-tap Add; panel list + Import JSON
- See also [`docs/IMPROVEMENT_PLAN.md`](docs/IMPROVEMENT_PLAN.md) and [`docs/MONETIZATION_ROADMAP.md`](docs/MONETIZATION_ROADMAP.md)

Original monolith reference: `/home/tux/aetheris-longevity-tree.html`


- Rebrand: [`docs/REBRAND_OPTIONS.md`](docs/REBRAND_OPTIONS.md)
- 3-month data plan: [`docs/THREE_MONTH_PLAN.md`](docs/THREE_MONTH_PLAN.md)
