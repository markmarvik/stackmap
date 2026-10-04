# Aetheris Improvement Plan

**Status:** living doc · updated 2026-09-21  
**Product:** Modular Longevity Constellation (Vite + canvas) · https://stackmap-31c.pages.dev/

## Current baseline (post #14 / #16 Phase 1)

| Area | State |
|------|--------|
| Constellations | Supplements, Habits, Exercise, Foods, Biomarkers (multi-specimen), Environment |
| Map UX | HiDPI canvas, pan/zoom, filters, hover + inspector, mobile bottom sheet |
| Anatomy | Layered renderer + opacity presets; **placeholder** organ/skeleton/muscle art |
| Deploy | GitHub Pages via Actions (Node 24), base `/stackmap/` |
| Auth / accounts | None |
| Payments | None |
| Persistence | Client-only (share/personalization not a paid loop yet) |

## Principles

1. **Ship thin slices** — small PRs, one user-visible win each.
2. **Web first** — do not rebuild as native until a paying loop exists.
3. **Data model before chrome** — profile / stack / labs schema unlocks monetization.
4. **Compliance-aware** — no medical claims; educational + tracking framing.
5. **Wrong-repo debt** — GitHub issues #19–#26 describe STEADY-style widgets; keep them out of this canvas app unless we deliberately merge products.

---

## Phase 0 — Stabilize (days 1–3)

- [ ] Merge biomarker + anatomy Phase 1 PRs; confirm Pages deploy green
- [ ] Smoke-test mobile + desktop on live URL
- [ ] Replace README “Current Status” with accurate constellation + layer list
- [ ] Add simple analytics (Plausible or GA4) — page views + constellation switches only
- [ ] Open “feedback” link (Formspree / Tally) in footer

**Exit:** Live build matches main; we can measure visits.

## Phase 1 — Personal stack (days 4–10) ← unlocks paid wedge

Goal: user can save **their** stack and see it on the map.

- [ ] Local profile model: `selectedNodes[]`, notes, morning/evening slots, last labs snapshot
- [ ] Persist via `localStorage` first; export/import JSON
- [ ] “My stack” highlight mode on canvas (dim non-selected)
- [ ] Optional email capture (waitlist) for cloud sync later
- [ ] Share card: PNG/OG summary of stack (already share-adjacent; make it crisp)

**Exit:** Someone can build and re-open a personal stack without an account.

## Phase 2 — Anatomy Phase 2 + depth (days 8–18, parallel)

- [ ] Commission or source transparent PNG art: spine, kidneys, pancreas, adrenals, skeleton, muscles
- [ ] Limb inset / click-zoom for exercise targets
- [ ] Organ impact rollup (`OrganSystem` cumulative scores from active stack)
- [ ] Touch pan polish + zoom-toward-cursor (README roadmap leftovers)

**Exit:** Map feels “premium” enough to charge for Pro features.

## Phase 3 — Pro surface (days 12–25)

- [ ] Feature flags: Free vs Pro (client license key or Lemon Squeezy webhook later)
- [ ] Pro: cloud sync stub, lab specimen filters saved, custom node notes, PDF protocol export
- [ ] Free: full exploration map + limited stack size (e.g. 15 nodes)
- [ ] Pricing page section in-app or `/pricing` markdown → static page

**Exit:** Clear Free/Pro boundary; checkout link live (see monetization roadmap).

## Phase 4 — Growth loops (days 20–30+)

- [ ] SEO landing: “longevity stack map” + constellation deep links
- [ ] Embeddable read-only constellation for Substack/YouTube descriptions
- [ ] Affiliate-ready outbound links (disclosure) only where Mark opts in
- [ ] Clinic/coach “seat” experiment only after first consumer $ 

## Explicit non-goals (next 30 days)

- Native Android/iOS apps / home-screen widgets (STEADY lane)
- Full EHR / medical-device positioning
- Building a custom billing backend before Lemon Squeezy / Stripe Payment Link

## Suggested issue backlog (create after merge)

1. Analytics + feedback footer  
2. Personal stack (localStorage) + My Stack mode  
3. Anatomy art drop-in (replace placeholders)  
4. OrganSystem cumulative impact  
5. Free/Pro flags + license gate  
6. Protocol PDF export (Pro)  
7. Pricing / checkout static page  

---

*Owned by Aetheris product lane. Schedule hygiene: Personal assistant.*
