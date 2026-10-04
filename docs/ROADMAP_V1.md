# Aetheris Roadmap → v1.0

**Baseline:** v0.3.9 (all-nodes map, fuller catalog) · live: https://stackmap-31c.pages.dev/  
**Goal:** Ship a **v1.0** web product people can explore, personalize, and (optionally) pay for — without native apps or a custom billing backend.

Related: [`IMPROVEMENT_PLAN.md`](./IMPROVEMENT_PLAN.md), [`MONETIZATION_ROADMAP.md`](./MONETIZATION_ROADMAP.md).

---

## v1.0 definition of done

A **shippable product** when all of the following are true:

1. **Map UX** — Reliable on phone and desktop: pan/zoom, constellations, filters, inspector / bottom sheet, Anatomy controls usable on mobile (not clipped under the sheet).
2. **My Stack** — Persist, highlight, add/remove, export/import, list management; stable across constellations.
3. **OrganSystem scores** — Cumulative organ impact from the active stack (or selection), visible on map / inspector.
4. **Anatomy Phase 2 art** — Photoreal (or high-quality illustrated) spine / kidneys / MSK layers replacing Phase 1 placeholders; limb detail optional but tracked.
5. **Free / Pro gate** — Clear client-side feature boundary (stack limits, PDF export, saved lab filters, etc.) with a checkout **link** (Payment Link / Lemon Squeezy) — not a custom billing server.
6. **Protocol PDF export** — Pro path: printable/shareable stack summary.
7. **Analytics + feedback** — Lightweight page/constellation metrics + a feedback link.
8. **Polish** — README/status accurate, GH Pages green on Node 24, no known P0 mobile blockers.

Educational framing only — no medical claims.

---

## Phases (ordered)

### Phase A — Mobile polish (now → ~0.2.x / 0.3.x)

- [x] My Stack bottom-sheet button clicks (bubble-phase `stopPropagation`) — v0.2.7
- [x] Anatomy mobile fixed bottom sheet / overlay — v0.2.8
- [x] Zoom-toward-cursor (wheel) + pinch clamp polish — v0.3.0
- [x] Touch pan polish (RAF coalesce, inertia on release, chrome ignore, pinch→one-finger handoff) — v0.3.1
- [x] First-run coach tip (select → Add to My Stack → Anatomy; localStorage dismiss) — v0.3.2
- [x] Footer polish: Feedback + Pricing + version visible on mobile without heavy map cover — v0.3.2
- [x] Constellation deep-link `?c=supplements|habits|…` (shareable URLs) — v0.3.2
- [x] GH issues for remaining v1 gaps (art #36, checkout #37, limb zoom #38, Plausible #39) — v0.3.2
- [ ] Smoke pass on live Pages (iOS Safari + Android Chrome): Anatomy, My Stack, inspector sheet

**Exit:** Phone map is usable end-to-end without clipped rails or dead taps.

### Phase B — My Stack depth

- [x] Notes / morning–evening slots on stack entries — v0.3.0
- [x] Share card (PNG) of current stack — Canvas 2D, v0.3.0
- [ ] Optional waitlist / email capture for future cloud sync
- [x] Harden import/merge + empty states — v0.3.0

**Exit:** User can build, revisit, and share a personal stack without an account.

### Phase C — OrganSystem scores

- [x] Data model: roll up organ tags + impact from stack (and/or visible nodes) — v0.3.0
- [x] UI: organ scores in inspector + My Stack strip + subtle anatomy highlight — v0.3.0
- [x] Print protocol includes organ coverage scores — v0.3.1
- [x] Organ explode: hover/tap body → spread organs; click organ → green/red linked nodes — v0.3.3
- [x] Explode node spread: constellation nodes ease radially outward with organs (closer nodes move more) — v0.3.4
- [x] Explode organ spacing: staggered radii + even-ish angles so organs don’t overlap when expanded — v0.3.5
- [x] Explode node score/labels: BiomarkerTree (and all trees) draw numbers at getNodeDrawPosition — v0.3.6
- [ ] Tie into Anatomy layer highlights where cheap (further polish)

**Exit:** Stack → organ impact is visible and explainable.

### Phase D — Anatomy Phase 2 art

- [ ] Replace placeholders: spine, kidneys, pancreas, adrenals, skeleton, muscles — [#36](https://github.com/markmarvik/aetheris/issues/36)
- [ ] Drop-in PNG workflow documented (already sketched in README)
- [ ] Limb inset / click-zoom (stretch goal inside v1 if art lands early) — [#38](https://github.com/markmarvik/aetheris/issues/38)

**Exit:** Body layers look premium enough to sit behind Pro messaging.

### Phase E — Free / Pro gate

- [x] Feature flags: Free vs Pro (license key stub `aetheris-pro-key` + checkout-link placeholder) — v0.3.0 soft scaffold
- [x] Free: full map explore + soft-limited stack size (warn, no hard block) — v0.3.0
- [ ] Pro: unlimited stack, PDF export, saved lab specimen filters, early anatomy extras
- [x] In-app Pricing modal stub + checkout link placeholder — **no custom billing backend** — v0.3.0
- [x] Static `/pricing.html` Free vs Founding Pro ($29) page + footer/modal links — v0.3.1
- [ ] Live Lemon Squeezy / Stripe Payment Link URL (`VITE_CHECKOUT_URL`) — [#37](https://github.com/markmarvik/aetheris/issues/37)

**Exit:** Clear boundary; money can flow via hosted checkout.

### Phase F — PDF export + analytics + polish

- [x] Printable protocol (`window.print` stylesheet) soft-gated — v0.3.0
- [x] Print protocol layout polish + organ scores — v0.3.1
- [x] Analytics stub `track()` + constellation hooks; Plausible drop comment in index.html — v0.3.0
- [ ] Live Plausible (or GA4) site ID / script — [#39](https://github.com/markmarvik/aetheris/issues/39)
- [x] Feedback link (Tally/Formspree placeholder) in footer — v0.3.0
- [ ] README Current Status → v1.0; version bump; Pages deploy verified

**Exit:** Tag **v1.0.0** on `main`.

---

## Explicit non-goals for v1

| Non-goal | Why |
|----------|-----|
| Native iOS / Android apps or home-screen widgets | Web-first; STEADY lane is separate |
| Clinic / coach B2B seats, EHR, medical-device positioning | Consumer loop first; compliance risk |
| Custom billing backend (subscriptions engine, webhooks farm) | Use Lemon Squeezy / Stripe Payment Link |
| Full cloud sync + accounts as a blocker | localStorage + export is enough for v1 |
| Merging STEADY-style widgets into this canvas app | Wrong-repo debt (#19–#26) |

---

## Suggested version waypoints

| Version | Focus |
|---------|--------|
| 0.2.8 | Anatomy mobile sheet + this roadmap |
| 0.3.0 | My Stack depth + Free/Pro soft scaffold + OrganSystem + zoom-toward-pointer |
| 0.3.1 | Touch pan polish + static pricing page + print protocol (organs) |
| 0.3.2 | First-run tip + `?c=` deep-link + footer version; GH issues for remaining v1 gaps |
| 0.3.3 | Organ explode + organ→node filter |
| 0.3.4 | Explode spreads constellation nodes radially with organs |
| 0.3.5 | Explode organ spacing (no sprite stack) + node-push retune |
| 0.3.6 | Explode: node score/value text moves with spread circles |
| 0.3.7 | StackMap surface + storage migration; desktop Map / Body / Stack rail |
| 0.3.8 | Repo rename to `stackmap`; node search; five starter stacks |
| 0.4.x | Anatomy Phase 2 art |
| 0.5.x | Live checkout URL + stronger Pro perks |
| 0.9.x | Analytics live + polish |
| **1.0.0** | Definition of done met |

Stay lean: small PRs, one user-visible win each.
