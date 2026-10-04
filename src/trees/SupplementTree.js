/**
 * SupplementTree (and HabitsTree via inheritance)
 * 
 * Body-centric layout: the body silhouette is central on the canvas.
 * Nodes are placed near the organs they influence, with the most influential
 * (by vitality) being closest to the organ and rendered largest.
 * Vitality score (centered) + name + warnings shown on nodes.
 * Central body organ highlights on selection (detail via HoverPopup).
 */

import { BaseTree } from "./BaseTree.js";
import { calcVitality } from "../core/ScoringEngine.js";
import { AnatomyRenderer } from "../core/AnatomyRenderer.js";
import {
  OrganExplodeController,
  ORGAN_EXPLODE_KEYS,
  ORGAN_LABELS,
  ORGAN_HIT_RADIUS,
  BODY_HIT_PAD,
  nodeMatchesOrgan,
  nodeIsNegativeImpact
} from "../core/OrganExplode.js";

export class SupplementTree extends BaseTree {
  /** Matches _drawCentralBody scale; used for keep-out ellipse. */
  static BODY_SCALE = 3.15;
  static BODY_RX = 105;
  static BODY_RY = 245;
  /** Extra clearance beyond node circle (labels + stroke) in layout space. */
  static NODE_HALO = 7;
  /** Safety margin on body ellipse so nodes never clip the silhouette. */
  static BODY_MARGIN = 1.12;

  /** Organs named in data that should sit on a real body anchor. */
  static ORGAN_ALIAS = {
    cardiovascular: 'heart',
    vascular: 'heart',
    vessels: 'heart',
    blood: 'heart',
    systemic: 'immune',
    endocrine: 'thyroid',
    hormones: 'thyroid',
    hormone: 'thyroid',
    repro: 'gut',
    ovaries: 'gut',
    prostate: 'gut',
    breast: 'lungs',
    metabolic: 'pancreas',
    metabolism: 'pancreas',
    'blood-sugar': 'pancreas',
    tendons: 'joints',
    shoulders: 'joints',
    legs: 'bones',
    core: 'muscle',
    mouth: 'brain',
    teeth: 'brain',
    breath: 'lungs',
    respiratory: 'lungs',
    pleura: 'lungs',
    'bone-marrow': 'bones',
    bone_marrow: 'bones',
    bone: 'bones',
    bladder: 'kidneys',
    dna: 'mito',
    cell_membranes: 'mito',
    herpes: 'immune',
    iron: 'liver',
    'heavy-metals': 'liver',
    'cancer-all': 'immune',
    colon: 'gut',
    recovery: 'muscle',
    sleep: 'brain',
    grip: 'muscle',
    hips: 'joints',
    airway: 'lungs',
    calves: 'muscle',
    zinc: 'immune'
  };

  // PNG layered body (GitHub issue #2).
  // PNG body is the only version.

  // =====================================================
  // TUNING SECTION — PNG body & organ registration (issue #2)
  // =====================================================
  // Body bases (~360x780) and individual organ PNGs need their own scales + small offsets
  // because each asset was authored at slightly different "visual weights".
  //
  // dx / dy are in the original *design units* (the numbers like 85, 26, 92, 78 etc. in _getOrganPositions).
  // Small values (±2 to ±8) usually move things the right amount.
  //
  // Edit these, save, and hard-reload the dev server page (or use the console toggle + draw()).

  static PNG_BODY_CONFIG = {
    scale: 0.25,
    vOffset: -0.03,   // fraction of body height, negative moves the PNG up relative to torso center
    dx: 0,            // design units
    dy: 0,
  };

  // Per-organ overrides. Anything not listed here uses scale: 1.0 relative to the global PNG_ORGAN_DRAW_SCALE.
  static PNG_ORGAN_CONFIG = {
    // Core anatomical
    brain:   { scale: 1.2,  dx: 0, dy: -4 },
    eyes:    { scale: 0.85, dx: 6, dy: 0 },
    thyroid: { scale: 0.75, dx: 0, dy: 1 },
    lungs:   { scale: 1.5, dx: 14, dy: -10 },   // single asset for both sides
    heart:   { scale: 0.9, dx: -3, dy: -10 },
    liver:   { scale: 1.0,  dx: 7, dy: -13 },
    stomach: { scale: 1.2, dx: 3, dy: -15 },
    gut:     { scale: 1.2, dx: -1, dy: -8 },
    mito:    { scale: 0.72, dx: 20, dy: 10 },
    nerves:  { scale: 1.0,  dx: 0, dy: 0 },

    // Phase 1 placeholders (#16) — replace with real art when available
    spine:     { scale: 0.95, dx: 0, dy: 8 },
    kidneys:   { scale: 0.85, dx: 0, dy: 0 },
    pancreas:  { scale: 0.7,  dx: -4, dy: -6 },
    adrenals:  { scale: 0.65, dx: 0, dy: -18 },

    // Add more here as you create additional PNGs (immune, bones, joints, muscle accents, etc.)
    // immune: { scale: 1.0, dx: 0, dy: 0 },
  };

  // Global fallback scales (used when no per-organ override exists)
  static PNG_ORGAN_DRAW_SCALE = 0.4;

  // Debug: draw small red crosses at every organ anchor so you can see exact registration points while tuning.
  static PNG_DEBUG_ANCHORS = false;

  // -----------------------------------------------------
  // Selection / pop behavior (makes highlighted organs stand out)
  // When a node is selected, its organs get full brightness + glow. Everything else recedes.
  // -----------------------------------------------------
  static PNG_IDLE_ALPHA_NO_SELECTION = 0.78;     // how visible organs are when nothing is selected
  static PNG_IDLE_ALPHA_WITH_SELECTION = 0.22;   // non-selected organs when something is highlighted (lower = more pop for the chosen ones)
  static PNG_ACTIVE_ALPHA = 1.0;

  // Dim the body silhouette itself a little when an organ is active (helps the glowing organs stand out)
  static PNG_BODY_ALPHA_WITH_SELECTION = 0.82;

  // Glow tuning
  static PNG_GLOW_CIRCULAR = true;               // keep the soft round energy halo in addition to shaped glow?
  static PNG_GLOW_SHAPED_STRENGTH = 0.48;        // opacity of the shaped bloom layer
  static PNG_GLOW_SHAPED_BLUR = 22;              // how soft the shaped glow is (higher = more dispersed)
  static PNG_GLOW_SHAPED_ENLARGE = 1.13;         // draw the glow pass slightly bigger than the PNG for nice bloom

  constructor(canvas, options = {}) {
    super(canvas, options);
    this.data = [];
    this.rawSupplements = [];

    // Camera: pan in world space (0,0 = body center), scale = zoom
    this.view = {
      panX: 0,
      panY: 0,
      scale: 0.92
    };

    /** Active category keys (nodes outside these are hidden + excluded from layout). */
    this.enabledGroups = new Set();

    // Perf (GitHub #12): RAF-batched redraw for smooth pan/zoom
    this._rafPending = false;
    this._rafId = null;

    // Panning mode flag (used to skip expensive body/organ glows during drag for perf)
    this._isPanning = false;

    // Fixed screen-space stars for celestial background (normalized coords for natural distribution)
    // Using deterministic hash instead of modulo for non-grid "starfield" look
    this._stars = Array.from({ length: 160 }, (_, i) => {
      const h1 = (i * 9821 + 17) % 100000 / 100000;
      const h2 = (i * 6923 + 41) % 100000 / 100000;
      const h3 = (i * 5147 + 99) % 100000 / 100000;
      const size = (h3 < 0.08) ? 2.1 : (h3 < 0.25 ? 1.3 : 0.7);
      const alpha = (h3 < 0.06) ? 0.95 : (h3 < 0.22 ? 0.55 : 0.32);
      return { nx: h1, ny: h2, size, alpha };
    });

    // Offscreen canvas for static background (stars + fill + nebula) to avoid per-frame work
    this._bgOffscreen = null;
    this._lastBgW = 0;
    this._lastBgH = 0;

    // Premium color palette for organ groups (harmonious with dark celestial theme)
    // Each organ gets a distinct but elegant color for clear visual grouping
    this.organColors = {
      brain:   '#c084fc',   // soft purple
      eyes:    '#60a5fa',   // clear blue
      nerves:  '#a78bfa',   // light violet
      heart:   '#f87171',   // warm red
      lungs:   '#67e8f9',   // cyan
      liver:   '#a3e635',   // lime green
      gut:     '#4ade80',   // fresh green
      immune:  '#e879f9',   // magenta
      skin:    '#fbbf24',   // gold/amber
      muscle:  '#fb923c',   // orange
      joints:  '#f472b6',   // pink
      bones:   '#d1d5db',   // cool gray
      mito:    '#facc15',   // bright yellow (energy)
      thyroid: '#fb7185',   // coral
      stomach: '#86efac',
      spine:   '#cbd5e1',
      kidney:  '#f87171',
      kidneys: '#f87171',
      pancreas:'#fbbf24',
      adrenal: '#f472b6',
      adrenals:'#f472b6'
    };

    // Sequence (kept for compatibility / future horizontal views; body-centric layout uses organ positions instead)
    this.sequenceOrder = [
      'brain', 'eyes', 'nerves',
      'heart', 'lungs',
      'liver', 'stomach', 'gut',
      'kidney', 'kidneys', 'pancreas', 'adrenal', 'adrenals',
      'immune', 'skin',
      'muscle', 'joints', 'bones', 'spine',
      'mito', 'thyroid'
    ];

    // PNG body assets (issue #2 / #16). Populated by _loadBodyAssets().
    this.bodyImages = { base: {}, organs: {}, skeleton: {}, muscles: {} };
    this._bodyPngReady = false;
    // Layered anatomy opacity / presets (Issue #16 Phase 1)
    this.anatomy = new AnatomyRenderer();
    this.anatomy.applyPreset('organs');
    this.anatomy.subscribe(() => {
      if (this.canvas && typeof this.draw === 'function') this.draw();
    });
    // Organ explode + organ→node filter (hover/tap body)
    this.organExplode = new OrganExplodeController();
    this._loadBodyAssets();
  }

  loadData(supplementsArray) {
    this.rawSupplements = supplementsArray;

    // Always give every node a proper initial radius based on its vitality + disease coverage.
    // This ensures nodes have different sizes even before/without layout.
    this.nodes = supplementsArray.map(s => {
      const vitality = calcVitality(s);
      return {
        ...s,
        vitality,
        radius: this._calcNodeRadius({ ...s, vitality }, 0.5)
      };
    });

    const cats = [...new Set(this.nodes.map(n => n.cat).filter(Boolean))];
    this.enabledGroups = new Set(cats);
    this.maxNodes = 0; // 0 = unlimited (top N via slider). Sorted by vitality for limits.

    this.computeLayout();
  }

  setMaxNodes(n) {
    this.maxNodes = Math.max(0, Math.min(800, n | 0));
    this._afterGroupChange();
  }

  _getVisibleNodes() {
    // size===0 means "all off" (via ALL chip quick-reset / 'f' key) → show no nodes
    // otherwise filter strictly to enabled groups (initial + manual + ALL-on)
    let vis = (!this.enabledGroups || this.enabledGroups.size === 0)
      ? []
      : this.nodes.filter(n => this.enabledGroups.has(n.cat));

    if (this.maxNodes > 0 && vis.length > this.maxNodes) {
      // Highest vitality first; layout + orbit math already places top vitality closer to center within clusters.
      vis = [...vis].sort((a, b) => (b.vitality || 0) - (a.vitality || 0)).slice(0, this.maxNodes);
    }
    return vis;
  }

  /**
   * Nodes to paint and hit-test. Active view drops non-active stack nodes.
   * Layout still uses _getVisibleNodes so the remaining nodes do not move.
   */
  _getShownNodes() {
    const vis = this._getVisibleNodes();
    const stack = (typeof window !== 'undefined' && window.AETHERIS && window.AETHERIS.myStack) || null;
    if (!stack || stack.viewMode !== 'active' || typeof stack.shouldHide !== 'function') return vis;
    return vis.filter((node) => {
      const constellation = node._constellation
        || (window.AETHERIS && window.AETHERIS.currentConstellation)
        || 'supplements';
      const stackId = node._sourceId || node.id;
      return !stack.shouldHide(stackId, constellation);
    });
  }

  isGroupEnabled(key) {
    return this.enabledGroups.has(key);
  }

  setGroupEnabled(key, enabled = true) {
    if (!key || key === 'all') return;
    if (enabled) this.enabledGroups.add(key);
    else if (this.enabledGroups.size > 1) this.enabledGroups.delete(key);
    this._afterGroupChange();
  }

  toggleGroup(key) {
    if (!key || key === 'all') return;
    if (this.enabledGroups.has(key)) {
      if (this.enabledGroups.size <= 1) return;
      this.enabledGroups.delete(key);
    } else {
      this.enabledGroups.add(key);
    }
    this._afterGroupChange();
  }

  enableAllGroups() {
    const cats = [...new Set(this.nodes.map(n => n.cat).filter(Boolean))];
    this.enabledGroups = new Set(cats);
    this._afterGroupChange();
  }

  /** Toggle between all groups enabled and all groups disabled (for ALL chip + 'f' key quick reset). */
  toggleAllGroups() {
    const cats = [...new Set(this.nodes.map(n => n.cat).filter(Boolean))];
    const allOn = cats.length > 0 && this.enabledGroups.size === cats.length;
    if (allOn) {
      this.enabledGroups = new Set();
    } else {
      this.enabledGroups = new Set(cats);
    }
    this._afterGroupChange();
  }

  _afterGroupChange() {
    // Deselect if the current selection is no longer in the visible set (group filter OR maxNodes limit)
    if (this.selectedId) {
      const vis = this._getVisibleNodes();
      if (!vis.some(n => n.id === this.selectedId)) {
        this.selectedId = null;
        this.hoveredId = null;
      }
    }
    this.computeLayout();
    this.draw();
  }

  /** Radius from vitality (+ optional rank boost within organ cluster). */
  _calcNodeRadius(node, rankInfluence = 0.5) {
    const vitality = node.vitality ?? 70;
    const diseaseBonus = Math.min(0.18, (node.diseases || 4) / 80);
    const norm = Math.pow(vitality / 100, 1.05);
    const baseR = 9 + norm * 18;
    const r = baseR * (1 + diseaseBonus * 0.9) * (0.9 + rankInfluence * 0.22);
    return Math.max(9, Math.min(28, r));
  }

  /** Orbit distance: larger nodes closer to body, smaller farther; scales with cluster density. */
  _calcOrbitDistance(edge, node, group) {
    const radii = group.map(n => n.radius || 16);
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    const r = node.radius || 16;
    const sizeNorm = maxR > minR ? (maxR - r) / (maxR - minR) : 0;

    const density = group.length;
    const bodyPad = 18 + Math.min(14, density * 1.1);
    const ringSpread = 22 + density * 8 + maxR * 0.45;

    return edge + r + bodyPad + sizeNorm * ringSpread;
  }

  _layoutSpacingParams() {
    const n = this._getVisibleNodes().length || 1;
    const density = Math.sqrt(n / 20);
    // Dynamic for dense constellations (e.g. 100+ foods): more padding/iterations but cap to avoid jank
    const settleCap = n > 80 ? 110 : 140;
    return {
      collisionPadding: 14 + density * 7,
      settleIterations: Math.min(settleCap, 55 + Math.floor(n * 2.8)),
      bodyPadding: 18 + density * 5,
      labelMargin: SupplementTree.NODE_HALO
    };
  }

  _nodeHitRadius(node, labelMargin = SupplementTree.NODE_HALO) {
    return (node.radius || 18) + labelMargin;
  }

  /**
   * Organ anchors in the same world space as _drawCentralBody (hx/hy at BODY_SCALE).
   */
  _getOrganPositions() {
    const s = SupplementTree.BODY_SCALE;
    const wx = x => (x - 85) * s;
    const wy = y => (y - 100) * s;
    return {
      brain:   { x: wx(85), y: wy(26) },
      eyes:    { x: wx(79), y: wy(25) },
      nerves:  { x: wx(85), y: wy(55) },
      heart:   { x: wx(92), y: wy(78) },  // anatomical left (screen right) to match corrected body draw
      lungs:   { x: wx(70), y: wy(68) },  // anatomical right lung (larger, screen left)
      liver:   { x: wx(72), y: wy(92) },  // anatomical right (screen left) to match corrected body draw
      gut:     { x: wx(85), y: wy(112) },
      stomach: { x: wx(88), y: wy(98) },
      immune:  { x: wx(85), y: wy(100) },
      skin:    { x: wx(85), y: wy(55) },
      muscle:  { x: wx(55), y: wy(95) },
      joints:  { x: wx(68), y: wy(55) },
      bones:   { x: wx(74), y: wy(153) },
      spine:   { x: wx(85), y: wy(88) },
      kidney:  { x: wx(70), y: wy(105) },
      kidneys: { x: wx(85), y: wy(105) },
      pancreas:{ x: wx(90), y: wy(100) },
      adrenal: { x: wx(70), y: wy(92) },
      adrenals:{ x: wx(85), y: wy(92) },
      mito:    { x: wx(88), y: wy(78) },
      thyroid: { x: wx(85), y: wy(40) },
      sleep:      { x: wx(85), y: wy(30) },
      mind:       { x: wx(85), y: wy(26) },
      nutrition:  { x: wx(85), y: wy(105) },
      recovery:   { x: wx(95), y: wy(85) },
      social:     { x: wx(110), y: wy(50) },
      vices:      { x: wx(72), y: wy(75) },
      productivity: { x: wx(85), y: wy(45) }
    };
  }

  _getCurrentGender() {
    try {
      const p = (window.AETHERIS && window.AETHERIS.personal) || {};
      const g = String(p.gender || '').toLowerCase().trim();
      if (g === 'female') return 'female';
      // 'male', 'other', or unset -> male base (androgynous stylized figure still reads well)
      return 'male';
    } catch {
      return 'male';
    }
  }

  _loadBodyAssets() {
    // Use import.meta.env.BASE_URL so GitHub Pages (/aetheris/) + local dev both resolve PNGs correctly.
    const base = import.meta.env.BASE_URL + 'assets/body';

    this.anatomy.load(base).then(() => {
      // Mirror images onto bodyImages for existing draw helpers
      this.bodyImages.base = this.anatomy.images.base;
      this.bodyImages.organs = this.anatomy.images.organs;
      this.bodyImages.skeleton = this.anatomy.images.skeleton;
      this.bodyImages.muscles = this.anatomy.images.muscles;
      this._bodyPngReady = true;
      if (this.canvas && typeof this.draw === 'function') {
        requestAnimationFrame(() => this.draw());
      }
    });
  }

  /** Apply an anatomy view preset (organs / musculoskeletal / combined / skeletal / muscles). */
  setAnatomyPreset(name) {
    this.anatomy?.applyPreset(name);
  }

  setAnatomyOpacity(layer, value) {
    this.anatomy?.setLayerOpacity(layer, value);
  }

  /** Ellipse radius along a ray from body center (matches scaled silhouette). */
  _bodyEdgeRadius(angle) {
    const rx = SupplementTree.BODY_RX * SupplementTree.BODY_MARGIN;
    const ry = SupplementTree.BODY_RY * SupplementTree.BODY_MARGIN;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    return (rx * ry) / Math.sqrt((ry * c) ** 2 + (rx * sn) ** 2);
  }

  _minDistFromCenter(node, bodyPadding = 14, labelMargin = SupplementTree.NODE_HALO) {
    const ang = Math.atan2(node.y || 0, node.x || 0.001);
    return this._bodyEdgeRadius(ang) + this._nodeHitRadius(node, labelMargin) + bodyPadding;
  }

  /** Hard push: node hull must sit outside the body ellipse. */
  _pushOutsideBody(node, padding = 14, labelMargin = SupplementTree.NODE_HALO) {
    let x = node.x || 0;
    let y = node.y || 0;
    let dist = Math.hypot(x, y);
    const r = this._nodeHitRadius(node, labelMargin);

    if (dist < 0.01) {
      const edge = this._bodyEdgeRadius(-Math.PI / 2);
      node.x = 0;
      node.y = -(edge + r + padding);
      return true;
    }

    const ang = Math.atan2(y, x);
    const minDist = this._bodyEdgeRadius(ang) + r + padding;
    if (dist < minDist) {
      const scale = minDist / dist;
      node.x = x * scale;
      node.y = y * scale;
      return true;
    }
    return false;
  }

  /**
   * Iterative settle: body constraint every step + node-node repulsion.
   * Outermost nodes absorb more separation force so clusters don't collapse inward.
   */
  _settleNodePositions(nodes, spacing = this._layoutSpacingParams()) {
    if (!nodes.length) return;

    const pad = spacing.collisionPadding;
    const bodyPad = spacing.bodyPadding;
    const halo = spacing.labelMargin ?? SupplementTree.NODE_HALO;
    const iterations = spacing.settleIterations ?? 80;

    for (let iter = 0; iter < iterations; iter++) {
      for (const n of nodes) {
        this._pushOutsideBody(n, bodyPad, halo);
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          if (dist < 0.01) {
            const jitter = 0.5 + (iter % 7) * 0.05;
            dx = jitter;
            dy = 0;
            dist = jitter;
          }

          const ra = this._nodeHitRadius(a, halo);
          const rb = this._nodeHitRadius(b, halo);
          const minDist = ra + rb + pad;

          if (dist >= minDist) continue;

          const overlap = minDist - dist;
          const ux = dx / dist;
          const uy = dy / dist;
          const force = overlap * 0.52;

          const aCenter = Math.hypot(a.x, a.y);
          const bCenter = Math.hypot(b.x, b.y);
          const aBias = aCenter >= bCenter ? 0.58 : 0.42;
          const bBias = 1 - aBias;

          a.x -= ux * force * aBias;
          a.y -= uy * force * aBias;
          b.x += ux * force * bBias;
          b.y += uy * force * bBias;
        }
      }
    }

    const bodyIters = Math.min(12, 6 + Math.floor(nodes.length / 12));
    for (let k = 0; k < bodyIters; k++) {
      let any = false;
      for (const n of nodes) {
        if (this._pushOutsideBody(n, bodyPad, halo)) any = true;
      }
      if (!any) break;
    }

    this._fixRemainingOverlaps(nodes, spacing);
  }

  /** Final greedy pass until no node-node or node-body violations remain. */
  _fixRemainingOverlaps(nodes, spacing) {
    const pad = spacing.collisionPadding;
    const bodyPad = spacing.bodyPadding;
    const halo = spacing.labelMargin ?? SupplementTree.NODE_HALO;

    const maxAttempts = Math.min(38, 18 + Math.floor(nodes.length / 5));
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let fixed = false;

      for (const n of nodes) {
        if (this._pushOutsideBody(n, bodyPad, halo)) fixed = true;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          if (dist < 0.01) {
            dx = 1;
            dy = 0;
            dist = 1;
          }
          const minDist = this._nodeHitRadius(a, halo) + this._nodeHitRadius(b, halo) + pad;
          if (dist < minDist) {
            const overlap = (minDist - dist) + 1;
            const ux = dx / dist;
            const uy = dy / dist;
            a.x -= ux * overlap * 0.5;
            a.y -= uy * overlap * 0.5;
            b.x += ux * overlap * 0.5;
            b.y += uy * overlap * 0.5;
            fixed = true;
          }
        }
      }

      if (!fixed) break;
    }
  }

  computeLayout() {
    const visible = this._getVisibleNodes();
    const spacing = this._layoutSpacingParams();
    const organPositions = this._getOrganPositions();

    const organGroups = {};
    Object.keys(organPositions).forEach(o => { organGroups[o] = []; });

    visible.forEach(node => {
      let assigned = false;
      for (const raw of node.organs || []) {
        const alias = SupplementTree.ORGAN_ALIAS[raw];
        const o = organGroups[raw] !== undefined ? raw : alias;
        if (o && organGroups[o] !== undefined) {
          organGroups[o].push(node);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        (organGroups.mito = organGroups.mito || []).push(node);
      }
    });

    Object.keys(organGroups).forEach(organ => {
      const group = organGroups[organ] || [];
      if (!group.length) return;

      group.sort((a, b) => (b.vitality || 0) - (a.vitality || 0));

      const base = organPositions[organ] || { x: 0, y: 0 };
      const sectorAng = Math.atan2(base.y, base.x || 0.001);
      const edge = this._bodyEdgeRadius(sectorAng);
      const spread = Math.min(1.15, 0.16 * group.length + 0.14);

      group.forEach((node, i) => {
        const t = group.length > 1 ? i / (group.length - 1) : 0;
        const influence = 1 - t;
        node.radius = this._calcNodeRadius(node, influence);
        const idSpread = ((node.id?.length || 0) * 0.019 + (node.id?.charCodeAt(0) || 0) * 0.0008) % 0.12 - 0.06;
        const fan = (t - 0.5) * spread + idSpread;
        const ang = sectorAng + fan;
        let orbitDist = this._calcOrbitDistance(edge, node, group);

        // Strictly enforce rank-based proximity: highest vitality (i=0) gets minimal orbit (closest to organ)
        // Lower rank get pushed outward. This fulfills #5 rank proximity enforcement.
        const rankFactor = 0.6 + (t * 0.7);  // 0.6 for top, up to ~1.3 for lowest
        orbitDist = orbitDist * rankFactor;

        node.x = Math.cos(ang) * orbitDist;
        node.y = Math.sin(ang) * orbitDist * 0.82;
      });
    });

    this._settleNodePositions(visible, spacing);

    if (!this.view) this.view = { panX: 0, panY: 0, scale: 0.92 };
    if (typeof this.view.panX !== 'number') this.view.panX = this.view.scrollX || 0;
    if (typeof this.view.panY !== 'number') this.view.panY = this.view.scrollY || 0;
    if (typeof this.view.scale !== 'number') this.view.scale = 0.92;
  }

  _enforceVisibleOutsideBody(padding = 14) {
    const nodes = this._getVisibleNodes();
    for (let k = 0; k < 8; k++) {
      let moved = false;
      for (const n of nodes) {
        if (this._pushOutsideBody(n, padding)) moved = true;
      }
      if (!moved) break;
    }
  }

  /**
   * Draw centered vitality score inside node.
   * Pass draw-space x/y (e.g. from organExplode.getNodeDrawPosition) so subclasses
   * that override this method keep numbers glued to the circle during explode.
   */
  _drawNodeScore(ctx, node, r, { isDimmed, isSelected, isHighValue, x, y, scale = 1 }) {
    if (!isSelected && r * scale < 7) return;
    if (r < 8) return;

    const vit = String(node.vitality ?? '');
    const dx = x ?? node.x;
    const dy = y ?? node.y;

    const fsVit = Math.round(Math.max(8, Math.min(13, r * 0.52)));

    // Centered longevity score (vitality)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `${isSelected ? 800 : 700} ${fsVit}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = isDimmed ? '#6b7280' : (isHighValue ? '#f4e9c8' : (isSelected ? '#e0f2fe' : '#a5d8ff'));
    ctx.fillText(vit, dx, dy);
  }

  draw(highlightIds = []) {
    if (!this.ctx) return;

    // Advance organ explode animation; keep RAF going while in flight
    if (this.organExplode && this.organExplode.update()) {
      this._scheduleDraw();
    }

    const ctx = this.ctx;
    const { width: w, height: h } = this.getLogicalSize();
    const dpr = this.viewport?.dpr || 1;

    const v = this.view || { panX: 0, panY: 0, scale: 1 };
    const panX = v.panX ?? v.scrollX ?? 0;
    const panY = v.panY ?? v.scrollY ?? 0;
    const scale = v.scale || 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

    // 1. FIXED screen-space celestial background (stars + nebula)
    // Use cached offscreen for perf during panning (and always faster)
    this._ensureBackgroundCache(w, h);
    if (this._bgOffscreen) {
      ctx.drawImage(this._bgOffscreen, 0, 0, w, h);
    } else {
      // Fallback
      ctx.fillStyle = "#05070f";
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Body-centric layer: body in the middle, nodes clustered around the organs they affect.
    ctx.save();

    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-panX, -panY);

    // Draw the central body model (silhouette + organs) -- now larger
    // We highlight organs that the currently selected node influences.
    const visibleNodes = this._getShownNodes();
    const selectedNodeForBody = this.selectedId ? visibleNodes.find(n => n.id === this.selectedId) || null : null;
    const organFilter = this.organExplode?.activeOrganFilter || null;
    let rawHighlightOrgs = organFilter
      ? [organFilter]
      : (selectedNodeForBody ? (selectedNodeForBody.organs || []) : []);
    // When nothing selected / no organ filter, lightly show My Stack organ coverage
    if ((!rawHighlightOrgs || !rawHighlightOrgs.length) && typeof window !== 'undefined') {
      const os = window.AETHERIS && window.AETHERIS.organSystem;
      if (os && typeof os.getTopOrgans === 'function') {
        const stackOrgans = os.getTopOrgans(6);
        if (stackOrgans && stackOrgans.length) rawHighlightOrgs = stackOrgans;
      }
    }
    const highlightOrgs = this.anatomy
      ? [...this.anatomy.expandHighlights(rawHighlightOrgs)]
      : rawHighlightOrgs;
    const isNegativeImpact = !organFilter && !!(selectedNodeForBody && (selectedNodeForBody.impact === 'negative' || selectedNodeForBody._isNegative));

    // PNG body is the only version (layered via AnatomyRenderer — Issue #16).
    if (this._bodyPngReady) {
      this._drawCentralBodyPng(ctx, 0, 0, 3.15, highlightOrgs, isNegativeImpact);
    } else if (!this._bodyPngWarned) {
      // draw() runs every frame; one warning is enough until the PNGs arrive.
      this._bodyPngWarned = true;
      console.warn('[AETHERIS] Body PNGs not ready');
    }

    // PNG body is the only version. No toggle.

    // Culling + unified simplified node rendering (same for panning and static)
    // Removes shading (inner gradients) + inner circle for optimum mobile perf.
    // Always shows score (vitality), name, warnings. Selected glow preserved.
    const margin = 60;
    const invScale = 1 / scale;
    const viewHalfW = (w * invScale) / 2;
    const viewHalfH = (h * invScale) / 2;
    const worldLeft = panX - viewHalfW - margin;
    const worldRight = panX + viewHalfW + margin;
    const worldTop = panY - viewHalfH - margin;
    const worldBottom = panY + viewHalfH + margin;

    const explodeCtrl = this.organExplode;
    const explodeP = explodeCtrl ? explodeCtrl.progress : 0;

    visibleNodes.forEach(node => {
      // Explode spreads nodes radially; draw/hit use displaced coords
      const drawPos = (explodeCtrl && explodeP > 0.001)
        ? explodeCtrl.getNodeDrawPosition(node.x, node.y)
        : null;
      const nx = drawPos ? drawPos.x : node.x;
      const ny = drawPos ? drawPos.y : node.y;

      // Basic view culling — big win when zoomed or panned (use draw pos)
      if (nx < worldLeft || nx > worldRight || ny < worldTop || ny > worldBottom) {
        return;
      }

      const isSelected = this.selectedId === node.id;
      const isHovered = this.hoveredId === node.id;
      const isHighlighted = highlightIds.includes(node.id);

      const baseRadius = node.radius || 18;
      let r = (isSelected || isHovered) ? baseRadius * 1.18 : baseRadius;

      const groupColor = this._getNodeColor(node);
      // My Stack highlight mode: dim nodes not in the user's personal stack
      const stack = (typeof window !== 'undefined' && window.AETHERIS && window.AETHERIS.myStack) || null;
      const constellation = node._constellation
        || (typeof window !== 'undefined' && window.AETHERIS && window.AETHERIS.currentConstellation)
        || 'supplements';
      const stackId = node._sourceId || node.id;
      const inStack = !!(stack && typeof stack.has === 'function' && stack.has(stackId, constellation));
      let isDimmed = !!(stack && typeof stack.shouldDim === 'function' && stack.shouldDim(stackId, constellation));
      const isHighValue = node.vitality > 82;

      // Organ explode filter: linked nodes get green/red rings; others dim
      let organFilterMatch = false;
      let organFilterNeg = false;
      if (organFilter) {
        const expand = this.anatomy
          ? (orgs) => this.anatomy.expandHighlights(orgs)
          : null;
        organFilterMatch = nodeMatchesOrgan(node, organFilter, expand);
        organFilterNeg = nodeIsNegativeImpact(node, constellation);
        if (!organFilterMatch) isDimmed = true;
      }

      // Unified simplified path (same when scrolling or not): dark fill + ring only.
      // No shading gradients, no inner circle. Fast + consistent. Selected glows.
      if (organFilter && organFilterMatch) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = organFilterNeg ? '#ef4444' : '#22c55e';
      } else if (isSelected || isHighlighted || (inStack && stack?.highlightMode)) {
        ctx.shadowBlur = isSelected || isHighlighted ? 22 : 14;
        ctx.shadowColor = (inStack && stack?.highlightMode && !isSelected) ? '#d4af37' : groupColor;
      } else if (isHovered) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = groupColor;
      } else {
        ctx.shadowBlur = 0;
      }

      if (isDimmed) ctx.globalAlpha = 0.18;

      ctx.fillStyle = "#0f1424";
      if (organFilter && organFilterMatch) {
        ctx.strokeStyle = organFilterNeg ? '#ef4444' : '#22c55e';
        ctx.lineWidth = isSelected ? 4.4 : 3.4;
      } else {
        ctx.strokeStyle = (isSelected || isHighlighted)
          ? "#f4e9c8"
          : (inStack && stack?.highlightMode ? '#d4af37' : groupColor);
        ctx.lineWidth = isSelected ? 4.2 : (isHovered || (inStack && stack?.highlightMode) ? 3.0 : 2.2);
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      this._drawNodeScore(ctx, node, r, { isDimmed, isSelected, isHighValue, x: nx, y: ny, scale });

      const labelSize = Math.round(Math.max(8, Math.min(11, r * 0.38)));
      const showLabel = isSelected || isHovered || (labelSize * scale >= 7.5);
      if (showLabel) {
        ctx.fillStyle = isDimmed ? "#6b7280" : (isSelected ? "#f4e9c8" : "#e5e7eb");
        ctx.font = `${isSelected ? 700 : 600} ${labelSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(node.short, nx, ny - r - 4);
      }

      if (isDimmed) ctx.globalAlpha = 1;

      if (node.highDoseRisks) {
        const warnSize = Math.max(6, Math.min(9, r * 0.22));
        const wx = nx + r * 0.65;
        const wy = ny - r * 0.65;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(wx, wy - warnSize);
        ctx.lineTo(wx - warnSize * 0.9, wy + warnSize * 0.6);
        ctx.lineTo(wx + warnSize * 0.9, wy + warnSize * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.font = `700 ${Math.round(warnSize * 1.1)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', wx, wy + warnSize * 0.15);
      }
    });

    ctx.restore(); // end map layer (pannable constellation)
    ctx.restore(); // end master save (fixed bg + map)
  }

  // Helper: get the primary organ color for a node (for coloring by group)
  _getNodeColor(node) {
    if (node.impact === 'negative' || node._isNegative) {
      return '#ef4444'; // red for damage / negative impact foods
    }
    for (const organ of node.organs || []) {
      if (this.organColors[organ]) return this.organColors[organ];
    }
    return '#d4af37';
  }

  /** Radial glow behind an organ when highlighted. */
  _drawOrganGlow(ctx, x, y, radius, color, active) {
    if (!active) return;
    const g = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2.4);
    g.addColorStop(0, color + '66');
    g.addColorStop(0.45, color + '22');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Filled ellipse organ with depth gradient. */
  _drawOrganEllipse(ctx, hx, hy, sx, sy, rx, ry, s, color, active, idleAlpha = 0.38) {
    const x = hx(sx);
    const y = hy(sy);
    const erx = rx * s;
    const ery = ry * s;
    const glowR = Math.max(erx, ery);
    this._drawOrganGlow(ctx, x, y, glowR, color, active);

    const grad = ctx.createRadialGradient(x - erx * 0.35, y - ery * 0.35, 0, x, y, glowR * 1.15);
    if (active) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, color);
      grad.addColorStop(0.75, color + 'bb');
      grad.addColorStop(1, color + '33');
    } else {
      grad.addColorStop(0, '#4a5568');
      grad.addColorStop(0.45, '#2a3142');
      grad.addColorStop(1, '#141820');
    }
    ctx.fillStyle = grad;
    ctx.globalAlpha = active ? 0.92 : idleAlpha;
    ctx.beginPath();
    ctx.ellipse(x, y, erx, ery, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = active ? color : '#4b5568';
    ctx.lineWidth = (active ? 2 : 0.9) * s;
    ctx.shadowBlur = active ? 12 * s : 0;
    ctx.shadowColor = active ? color : 'transparent';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /**
   * PNG-based layered body + organs.
   */
  _drawCentralBodyPng(ctx, cx, cy, s, highlightOrgs = [], isNegative = false) {
    const active = new Set(highlightOrgs);
    const hasSelection = active.size > 0;
    const layerOp = this.anatomy?.opacity || { base: 1, skeleton: 0, muscles: 0, organs: 1 };
    const layerVis = this.anatomy?.visible || { base: true, skeleton: false, muscles: false, organs: true };

    const hx = (x) => cx + (x - 85) * s;
    const hy = (y) => cy + (y - 100) * s;
    const organCol = (key) => this.organColors[key] || '#d4af37';
    const getHighlightColor = (key) => (isNegative && active.has(key)) ? '#ef4444' : organCol(key);

    ctx.save();

    const coreX = hx(85);
    const coreY = hy(95);

    // Shared body-frame rect (used by base / skeleton / muscles full-body layers)
    const cfg = SupplementTree.PNG_BODY_CONFIG || {};
    const bodyFrame = (() => {
      const gender = this._getCurrentGender();
      const bodyImg = this.bodyImages.base[gender] || this.bodyImages.base.male;
      const imgW = (bodyImg && bodyImg.naturalWidth) || 360;
      const imgH = (bodyImg && bodyImg.naturalHeight) || 780;
      const bScale = (cfg.scale ?? 0.25) * s;
      const dw = imgW * bScale;
      const dh = imgH * bScale;
      const bx = coreX + ((cfg.dx ?? 0) * s);
      const by = coreY + ((cfg.dy ?? 0) * s) - dh * (0.48 + (cfg.vOffset ?? -0.03));
      return { bodyImg, dw, dh, bx: bx - dw / 2, by, gender };
    })();

    // Ambient halo (cheap + pretty, keep from the old aesthetic)
    const amb = ctx.createRadialGradient(coreX, coreY, 8 * s, coreX, coreY, 130 * s);
    amb.addColorStop(0, active.has('skin') ? 'rgba(251, 191, 36, 0.14)' : 'rgba(103, 232, 249, 0.07)');
    amb.addColorStop(0.45, 'rgba(167, 139, 250, 0.05)');
    amb.addColorStop(1, 'transparent');
    ctx.fillStyle = amb;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 130 * s, 0, Math.PI * 2);
    ctx.fill();

    // --- Layer: base silhouette ---
    if (layerVis.base && bodyFrame.bodyImg && bodyFrame.bodyImg.complete && bodyFrame.bodyImg.naturalWidth > 10) {
      let alpha = layerOp.base;
      if (hasSelection) {
        alpha *= (SupplementTree.PNG_BODY_ALPHA_WITH_SELECTION ?? 0.82);
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(bodyFrame.bodyImg, bodyFrame.bx, bodyFrame.by, bodyFrame.dw, bodyFrame.dh);
      ctx.globalAlpha = 1.0;
    }

    // --- Layer: skeleton (full-body overlay) ---
    const skelImg = this.bodyImages.skeleton?.full;
    if (layerVis.skeleton && skelImg && skelImg.complete && skelImg.naturalWidth > 10) {
      ctx.globalAlpha = layerOp.skeleton;
      ctx.drawImage(skelImg, bodyFrame.bx, bodyFrame.by, bodyFrame.dw, bodyFrame.dh);
      ctx.globalAlpha = 1.0;
    }

    // --- Layer: muscles (anterior primary; posterior lightly if both loaded) ---
    const muscAnt = this.bodyImages.muscles?.anterior;
    const muscPost = this.bodyImages.muscles?.posterior;
    if (layerVis.muscles) {
      if (muscAnt && muscAnt.complete && muscAnt.naturalWidth > 10) {
        ctx.globalAlpha = layerOp.muscles;
        ctx.drawImage(muscAnt, bodyFrame.bx, bodyFrame.by, bodyFrame.dw, bodyFrame.dh);
        ctx.globalAlpha = 1.0;
      }
      if (muscPost && muscPost.complete && muscPost.naturalWidth > 10 && layerOp.muscles > 0.5) {
        ctx.globalAlpha = layerOp.muscles * 0.35;
        ctx.drawImage(muscPost, bodyFrame.bx, bodyFrame.by, bodyFrame.dw, bodyFrame.dh);
        ctx.globalAlpha = 1.0;
      }
    }

    // --- Layer: organs ---
    // Organ layer z-order (back to front). Includes Phase 1 placeholders (spine/kidneys/…).
    const anchors = (typeof this._getOrganPositions === 'function') ? this._getOrganPositions() : {};
    const organDrawOrder = [
      'spine',
      'lungs',
      'kidneys',
      'adrenals',
      'liver',
      'pancreas',
      'stomach',
      'gut',
      'heart',
      'mito',
      'nerves',
      'thyroid',
      'brain',
      'eyes'
    ];

    const globalOrganScale = SupplementTree.PNG_ORGAN_DRAW_SCALE;
    const organCfg = SupplementTree.PNG_ORGAN_CONFIG || {};

    const explode = this.organExplode;
    const explodeP = explode ? explode.progress : 0;
    const filterKey = explode?.activeOrganFilter || null;
    const hoverOrg = explode?.hoveredOrgan || null;
    // Cache draw positions for hit-testing (world space)
    this._organDrawPositions = this._organDrawPositions || {};

    for (const key of organDrawOrder) {
      if (!layerVis.organs || layerOp.organs <= 0.01) break;

      let img = this.bodyImages.organs[key];
      if (!img || !img.complete || img.naturalWidth < 10) continue;

      // Position in the current transformed world (anchors are already * BODY_SCALE)
      const anchor = anchors[key] || { x: 0, y: 0 };
      const cfg = organCfg[key] || {};

      // dx/dy are in design units (the 85/26/92 etc. numbers), then multiplied by s
      const homeX = anchor.x + ((cfg.dx ?? 0) * s);
      const homeY = anchor.y + ((cfg.dy ?? 0) * s);
      const drawPos = (explode && explodeP > 0.001)
        ? explode.getDrawPosition(key, homeX, homeY)
        : { x: homeX, y: homeY };
      const ax = drawPos.x;
      const ay = drawPos.y;
      this._organDrawPositions[key] = { x: ax, y: ay };

      const thisScale = globalOrganScale * (cfg.scale ?? 1.0);
      // Slight shrink when exploded — large PNG footprints clear neighbors better
      // (hit targets stay generous via ORGAN_HIT_RADIUS).
      const explodeBoost = 1 - explodeP * 0.06;

      const isFilter = filterKey === key;
      const isHoverOrg = hoverOrg === key;
      const isAct = active.has(key) || isFilter || (isHoverOrg && explodeP > 0.3);
      const col = isFilter ? '#22c55e' : getHighlightColor(key);

      const ow = img.naturalWidth * thisScale * explodeBoost;
      const oh = img.naturalHeight * thisScale * explodeBoost;

      if (isAct) {
        // Skip expensive shaped shadows/glows entirely while panning
        if (!this._isPanning) {
          // --- Shaped glow that follows the PNG's actual outline (the important part) ---
          // We draw the image itself with a shadow. The browser's shadow respects the PNG alpha,
          // so the glow takes on the real shape of the organ instead of a round blob.
          const shapedBlur = SupplementTree.PNG_GLOW_SHAPED_BLUR ?? 22;
          const shapedAlpha = SupplementTree.PNG_GLOW_SHAPED_STRENGTH ?? 0.48;
          const enlarge = SupplementTree.PNG_GLOW_SHAPED_ENLARGE ?? 1.12;

          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = shapedBlur;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.globalAlpha = shapedAlpha * layerOp.organs;

          const gw = ow * enlarge;
          const gh = oh * enlarge;
          ctx.drawImage(img, ax - gw / 2, ay - gh / 2, gw, gh);
          ctx.restore();

          // Optional classic round "energy" halo on top of the shaped one (toggleable)
          if (SupplementTree.PNG_GLOW_CIRCULAR) {
            const glowR = Math.max(ow, oh) * 0.38;
            this._drawOrganGlow(ctx, ax, ay, glowR, col, true);
          }
        }

        // Still draw the actual organ PNG even while panning
      }

      // The actual organ PNG.
      // When something is selected, non-active organs become quite transparent so the highlighted
      // ones (and their shaped glow) really stand out.
      // During explode, keep all organs readable (tap targets).
      const idleAlpha = (explodeP > 0.15)
        ? Math.max(0.72, SupplementTree.PNG_IDLE_ALPHA_NO_SELECTION ?? 0.78)
        : (hasSelection
          ? (SupplementTree.PNG_IDLE_ALPHA_WITH_SELECTION ?? 0.22)
          : (SupplementTree.PNG_IDLE_ALPHA_NO_SELECTION ?? 0.78));

      const organAlpha = (isAct
        ? (SupplementTree.PNG_ACTIVE_ALPHA ?? 1.0)
        : idleAlpha) * layerOp.organs;

      ctx.globalAlpha = organAlpha;
      ctx.drawImage(img, ax - ow / 2, ay - oh / 2, ow, oh);
      ctx.globalAlpha = 1.0;

      // Label when exploded (cheap text, no medical claims)
      if (explodeP > 0.45 && ORGAN_LABELS[key]) {
        const labelA = Math.min(1, (explodeP - 0.45) / 0.35) * 0.9;
        ctx.save();
        ctx.globalAlpha = labelA;
        ctx.font = `600 ${Math.round(11 + explodeP * 2)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isFilter ? '#86efac' : (isHoverOrg ? '#e2e8f0' : '#94a3b8');
        ctx.fillText(ORGAN_LABELS[key], ax, ay + oh / 2 + 4);
        ctx.restore();
      }
    }

    // Hint near body when an organ filter is active
    if (filterKey && explodeP > 0.2) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#a7f3d0';
      const label = ORGAN_LABELS[filterKey] || filterKey;
      ctx.fillText(`Nodes linked to ${label}`, coreX, bodyFrame.by - 8);
      ctx.restore();
    }

    // Optional debug anchors (super useful while tuning scales/offsets)
    if (SupplementTree.PNG_DEBUG_ANCHORS) {
      ctx.fillStyle = '#ff0000';
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      Object.entries(anchors).forEach(([k, a]) => {
        const x = a.x;
        const y = a.y;
        ctx.beginPath();
        ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
        ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
        ctx.stroke();
        ctx.fillText(k, x + 8, y - 4);
      });
    }

    // Fallback for organs we don't have PNGs for yet (e.g. immune)
    if (active.has('immune') || (!this.bodyImages.organs.immune && active.has('immune'))) {
      // Use the lightweight ellipse helper the old code already had for immune
      this._drawOrganEllipse(ctx, hx, hy, 85, 58, 5, 4, s, getHighlightColor('immune'), active.has('immune'), 0.28);
    }

    // Keep a few cheap structural accents on top of the PNG body.
    // These give nice "active" feedback on limbs/spine without requiring extra PNGs.
    // (The body bases already provide the main silhouette + limbs.)

    // Spine (subtle)
    const spineActive = active.has('bones') || active.has('joints');
    ctx.strokeStyle = spineActive ? '#e2e8f0' : '#475569';
    ctx.lineWidth = (spineActive ? 2.0 : 1.1) * s;
    ctx.globalAlpha = spineActive ? 0.6 : (hasSelection ? 0.12 : 0.25);
    ctx.beginPath();
    ctx.moveTo(hx(85), hy(40));
    ctx.lineTo(hx(85), hy(120));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Arms (muscle)
    const muscleCol = getHighlightColor('muscle');
    const hasMuscle = active.has('muscle');
    const drawArm = (x1, y1, cx1, cy1, x2, y2) => {
      ctx.strokeStyle = hasMuscle ? muscleCol : '#3d4a5c';
      ctx.lineWidth = (hasMuscle ? 4.8 : 3.6) * s;
      ctx.lineCap = 'round';
      ctx.globalAlpha = hasMuscle ? 0.85 : (hasSelection ? 0.18 : 0.35);
      if (hasMuscle) {
        ctx.shadowBlur = 7 * s;
        ctx.shadowColor = muscleCol;
      }
      ctx.beginPath();
      ctx.moveTo(hx(x1), hy(y1));
      ctx.quadraticCurveTo(hx(cx1), hy(cy1), hx(x2), hy(y2));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };
    drawArm(68, 58, 52, 78, 55, 115);
    drawArm(102, 58, 118, 78, 115, 115);

    // Legs (bones)
    const hasBones = active.has('bones');
    const bonesActiveColor = (isNegative && hasBones) ? '#ef4444' : '#e2e8f0';
    ctx.lineCap = 'round';
    ctx.strokeStyle = hasBones ? bonesActiveColor : '#3d4a5c';
    ctx.lineWidth = (hasBones ? 4.2 : 3.4) * s;
    ctx.globalAlpha = hasBones ? 0.55 : (hasSelection ? 0.14 : 0.28);
    ctx.beginPath();
    ctx.moveTo(hx(77), hy(123));
    ctx.quadraticCurveTo(hx(71), hy(155), hx(74), hy(177));
    ctx.moveTo(hx(93), hy(123));
    ctx.quadraticCurveTo(hx(99), hy(155), hx(96), hy(177));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Joint markers (shoulders + knees) — small colored dots when relevant
    const jointCol = getHighlightColor('joints');
    const boneCol = getHighlightColor('bones');
    const hasJoints = active.has('joints');
    [[68, 55, jointCol, hasJoints],
     [102, 55, jointCol, hasJoints],
     [74, 153, boneCol, hasBones || hasJoints],
     [96, 153, boneCol, hasBones || hasJoints]]
      .forEach(([sx, sy, color, isAct]) => {
        const x = hx(sx);
        const y = hy(sy);
        if (isAct) this._drawOrganGlow(ctx, x, y, 4.5 * s, color, true);
        ctx.fillStyle = isAct ? color : '#3d4a5c';
        ctx.globalAlpha = isAct ? 0.85 : (hasSelection ? 0.16 : 0.32);
        ctx.beginPath();
        ctx.arc(x, y, (isAct ? 2.8 : 2.2) * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

    ctx.restore();
  }

  // -----------------------------------------------------------------
  // Organ explode: world conversion, body/organ hit tests, filter API
  // -----------------------------------------------------------------

  /** Canvas-local screen → world (body-centric, pan/zoom aware). */
  screenToWorld(screenX, screenY) {
    const v = this.view || {};
    const { width: w, height: h } = this.getLogicalSize();
    const panX = v.panX ?? v.scrollX ?? 0;
    const panY = v.panY ?? v.scrollY ?? 0;
    const scale = v.scale || 1;
    return {
      x: (screenX - w / 2) / scale + panX,
      y: (screenY - h / 2) / scale + panY
    };
  }

  /** True if world point is inside the body silhouette ellipse. */
  hitTestBody(worldX, worldY) {
    const rx = SupplementTree.BODY_RX * BODY_HIT_PAD;
    const ry = SupplementTree.BODY_RY * BODY_HIT_PAD;
    const nx = worldX / rx;
    const ny = worldY / ry;
    return (nx * nx + ny * ny) <= 1;
  }

  /**
   * Hit-test exploded (or seated) organs. Prefer when explode progress is high.
   * @returns {string|null} organ key
   */
  hitTestOrgan(worldX, worldY, { requireExploded = true } = {}) {
    const explode = this.organExplode;
    if (!explode) return null;
    if (requireExploded && explode.progress < 0.35) return null;

    const positions = this._organDrawPositions || {};
    const keys = ORGAN_EXPLODE_KEYS;
    let best = null;
    let bestD = Infinity;
    const hitR = ORGAN_HIT_RADIUS * (0.85 + explode.progress * 0.35);

    for (const key of keys) {
      const pos = positions[key];
      if (!pos) continue;
      const dx = pos.x - worldX;
      const dy = pos.y - worldY;
      const d2 = dx * dx + dy * dy;
      if (d2 < hitR * hitR && d2 < bestD) {
        bestD = d2;
        best = key;
      }
    }
    return best;
  }

  /** Body silhouette OR any organ hit (for hover-leave zone). */
  isOverBodyZone(worldX, worldY) {
    if (this.hitTestBody(worldX, worldY)) return true;
    const explode = this.organExplode;
    if (explode && explode.progress > 0.2) {
      return !!this.hitTestOrgan(worldX, worldY, { requireExploded: false });
    }
    return false;
  }

  /**
   * Desktop hover: expand when over body; collapse on leave if no filter.
   * @returns {boolean} whether a redraw was scheduled
   */
  handleBodyHover(screenX, screenY) {
    if (!this.organExplode) return false;
    const { x, y } = this.screenToWorld(screenX, screenY);
    const over = this.isOverBodyZone(x, y);
    const explode = this.organExplode;
    let dirty = false;

    if (over) {
      if (explode.setExpanded(true)) dirty = true;
      const org = explode.progress > 0.3
        ? this.hitTestOrgan(x, y, { requireExploded: false })
        : null;
      if (explode.hoveredOrgan !== org) {
        explode.hoveredOrgan = org;
        dirty = true;
      }
    } else {
      if (explode.hoveredOrgan) {
        explode.hoveredOrgan = null;
        dirty = true;
      }
      // Keep exploded while a filter is active so user can inspect green/red nodes
      if (!explode.activeOrganFilter) {
        if (explode.setExpanded(false)) dirty = true;
      }
    }

    if (dirty) this._scheduleDraw();
    return dirty;
  }

  /** Clear organ filter + collapse explode. */
  clearOrganExplode() {
    if (!this.organExplode) return;
    if (this.organExplode.collapseAll()) this._scheduleDraw();
    else this._scheduleDraw();
  }

  /**
   * Prefer organ hit when exploded (does not steal node clicks when collapsed).
   * @returns {string|null} organ key if handled
   */
  trySelectOrganAt(screenX, screenY) {
    if (!this.organExplode) return null;
    const explode = this.organExplode;
    if (explode.progress < 0.4) return null;
    const { x, y } = this.screenToWorld(screenX, screenY);
    const org = this.hitTestOrgan(x, y, { requireExploded: false });
    if (!org) return null;
    explode.toggleOrganFilter(org);
    explode.setExpanded(true);
    this._scheduleDraw();
    return org;
  }

  /**
   * Body tap when no node/organ was hit: explode or collapse.
   * @returns {boolean} true if handled
   */
  tryToggleBodyExplode(screenX, screenY) {
    if (!this.organExplode) return false;
    const { x, y } = this.screenToWorld(screenX, screenY);
    if (!this.hitTestBody(x, y)) return false;
    const explode = this.organExplode;
    if (explode.isExploded && explode.progress > 0.5) {
      explode.collapseAll();
    } else {
      explode.setExpanded(true);
    }
    this._scheduleDraw();
    return true;
  }

  /** Empty-map tap: collapse explode + clear organ filter if any. */
  collapseOrganExplodeIfOpen() {
    if (!this.organExplode) return false;
    const ex = this.organExplode;
    if (!ex.isExploded && !ex.activeOrganFilter && ex.progress < 0.02) return false;
    ex.collapseAll();
    this._scheduleDraw();
    return true;
  }

  getActiveOrganFilter() {
    return this.organExplode?.activeOrganFilter || null;
  }

  // Hit testing for body-centric layout (body at center of transform)
  getNodeAt(screenX, screenY) {
    const v = this.view;
    const { width: w, height: h } = this.getLogicalSize();
    const panX = v.panX ?? v.scrollX ?? 0;
    const panY = v.panY ?? v.scrollY ?? 0;
    const scale = v.scale || 1;

    const worldX = (screenX - w / 2) / scale + panX;
    const worldY = (screenY - h / 2) / scale + panY;

    const visible = this._getShownNodes();
    const explode = this.organExplode;
    const spread = explode && explode.progress > 0.001;
    for (let i = visible.length - 1; i >= 0; i--) {
      const n = visible[i];
      const pos = spread
        ? explode.getNodeDrawPosition(n.x, n.y)
        : n;
      const dx = pos.x - worldX;
      const dy = pos.y - worldY;

      // Cache the dynamic padding radius computation
      const r = Math.max((n.radius || 18) + 6, 8 / scale);

      // Performance optimization: Avoid repeating multiplication inside conditional check
      if ((dx * dx + dy * dy) < (r * r)) {
        return n;
      }
    }
    return null;
  }

  /** @deprecated Use toggleGroup / enableAllGroups */
  setFilter(filterKey) {
    if (filterKey === 'all') {
      this.enableAllGroups();
    } else {
      this.enabledGroups = new Set([filterKey]);
      this._afterGroupChange();
    }
  }

  zoom(delta) {
    const factor = delta > 0 ? 1.18 : 0.82;
    this.zoomFactor(factor);
  }

  /**
   * Zoom by direct multiplicative factor (for pinch).
   * If focalX/focalY (canvas-local logical pixels) provided, zoom centered on that point.
   */
  zoomFactor(factor, focalX = null, focalY = null) {
    const v = this.view;
    if (!v) return;
    if (!Number.isFinite(factor) || factor <= 0) return;
    const oldScale = v.scale || 1;
    let newScale = oldScale * factor;
    newScale = Math.max(0.55, Math.min(2.8, newScale));
    // No-op when clamped (avoids pinch pan drift at min/max zoom)
    if (Math.abs(newScale - oldScale) < 1e-6) return;

    if (focalX != null && focalY != null && Number.isFinite(focalX) && Number.isFinite(focalY)) {
      const { width: w, height: h } = this.getLogicalSize();
      const panX = v.panX ?? v.scrollX ?? 0;
      const panY = v.panY ?? v.scrollY ?? 0;
      const worldAtFocalX = panX + (focalX - w / 2) / oldScale;
      const worldAtFocalY = panY + (focalY - h / 2) / oldScale;
      v.scale = newScale;
      v.panX = worldAtFocalX - (focalX - w / 2) / newScale;
      v.panY = worldAtFocalY - (focalY - h / 2) / newScale;
    } else {
      v.scale = newScale;
    }
    delete v.scrollX;
    delete v.scrollY;
    this._scheduleDraw();
  }

  /** Pan map in screen pixels (drag right → view moves right). */
  pan(dx, dy = 0) {
    const v = this.view;
    const s = v.scale || 1;
    v.panX = (v.panX ?? v.scrollX ?? 0) - dx / s;
    v.panY = (v.panY ?? v.scrollY ?? 0) - dy / s;
    delete v.scrollX;
    delete v.scrollY;
    this._scheduleDraw();
  }

  /** RAF-batched draw for panning perf (issue #12). Direct draw() remains immediate for clicks/selections. */
  _scheduleDraw() {
    if (this._rafPending) return;
    this._rafPending = true;
    this._rafId = requestAnimationFrame(() => {
      this._rafPending = false;
      this._rafId = null;
      this.draw();
    });
  }

  /** Pre-render static background (solid + stars + nebula) to offscreen canvas (logical size). */
  _ensureBackgroundCache(w, h) {
    const needsRecreate = !this._bgOffscreen || Math.abs(this._lastBgW - w) > 1 || Math.abs(this._lastBgH - h) > 1;
    if (!needsRecreate) return;

    // Offscreen at logical resolution; main draw ctx.scale(dpr) will handle crispness
    this._bgOffscreen = document.createElement('canvas');
    this._bgOffscreen.width = Math.max(1, Math.round(w));
    this._bgOffscreen.height = Math.max(1, Math.round(h));
    const bgCtx = this._bgOffscreen.getContext('2d', { alpha: true });

    // Solid dark
    bgCtx.fillStyle = "#05070f";
    bgCtx.fillRect(0, 0, w, h);

    // Stars (pre-drawn)
    bgCtx.fillStyle = "rgba(255,255,255,0.9)";
    for (const s of (this._stars || [])) {
      const sx = s.nx * w;
      const sy = s.ny * h;
      bgCtx.globalAlpha = s.alpha;
      const sz = Math.max(1, s.size);
      bgCtx.fillRect((sx | 0), (sy | 0), sz, sz);
    }
    bgCtx.globalAlpha = 1;

    // Nebula
    const nebula = bgCtx.createRadialGradient(w * 0.5, h * 0.25, 60, w * 0.5, h * 0.55, 380);
    nebula.addColorStop(0, "rgba(110, 130, 190, 0.028)");
    nebula.addColorStop(0.6, "rgba(90, 110, 170, 0.015)");
    nebula.addColorStop(1, "transparent");
    bgCtx.fillStyle = nebula;
    bgCtx.fillRect(0, 0, w, h);

    this._lastBgW = w;
    this._lastBgH = h;
  }

  scroll(dx) {
    this.pan(dx, 0);
  }

  resetView() {
    this.fitToNodes();
  }

  /** Frame every visible node inside the canvas, clear of the right rail and top search. */
  fitToNodes() {
    // Frame what is actually drawn (Active stack view); fall back to all visible if nothing is shown.
    const shown = this._getShownNodes();
    const nodes = shown.length ? shown : this._getVisibleNodes();
    const { width: w, height: h } = this.getLogicalSize();
    if (!w || !h) {
      this.view = { panX: 0, panY: 0, scale: 0.92 };
      this.draw();
      return;
    }
    let minX = -50;
    let maxX = 50;
    let minY = -90;
    let maxY = 90;
    for (const n of nodes) {
      const pad = (n.radius || 14) + 16;
      const x = n.x || 0;
      const y = n.y || 0;
      if (x - pad < minX) minX = x - pad;
      if (x + pad > maxX) maxX = x + pad;
      if (y - pad < minY) minY = y - pad;
      if (y + pad > maxY) maxY = y + pad;
    }
    const bw = Math.max(80, maxX - minX);
    const bh = Math.max(80, maxY - minY);
    const narrow = w < 780;
    const insetL = narrow ? 8 : 16;
    const insetR = narrow ? 156 : 176;
    const insetT = narrow ? 92 : 78;
    const insetB = narrow ? 120 : 56;
    const availW = Math.max(80, w - insetL - insetR);
    const availH = Math.max(80, h - insetT - insetB);
    const scale = Math.max(0.12, Math.min(1.05, Math.min(availW / bw, availH / bh)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const targetX = insetL + availW / 2;
    const targetY = insetT + availH / 2;
    this.view = {
      panX: cx - (targetX - w / 2) / scale,
      panY: cy - (targetY - h / 2) / scale,
      scale
    };
    this._rafPending = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.draw();
  }

  centerOn(node) {
    if (!node) return;
    const v = this.view;
    v.panX = node.x || 0;
    v.panY = node.y || 0;
    v.scale = Math.max(v.scale, 1.12);
    this._scheduleDraw();
  }

  recenter() {
    this.computeLayout();
    this.fitToNodes();
  }
}
