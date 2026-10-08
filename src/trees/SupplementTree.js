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
import { getBodyStage } from "../components/BodyStage.js";
import {
  OrganExplodeController,
  ORGAN_EXPLODE_KEYS,
  ORGAN_LABELS,
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
  static NODE_HALO = 12;
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
    if (this.bodyFocus) return [];
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
      collisionPadding: 18 + density * 8,
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
    // Use import.meta.env.BASE_URL so the configured base and local dev both resolve PNGs correctly.
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

  /** Push two nodes apart. Extra vertical room keeps the name above from crossing the next ring. */
  _separatePair(a, b, pad, halo) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.01) {
      dx = 1;
      dy = 0.2;
      dist = Math.hypot(dx, dy);
    }
    const minX = this._nodeHitRadius(a, halo) + this._nodeHitRadius(b, halo) + pad;
    const minY = minX + 16;
    const nx = dx / minX;
    const ny = dy / minY;
    const nlen = Math.hypot(nx, ny);
    if (nlen >= 1) return false;
    const gap = (1 - nlen) * Math.min(minX, minY);
    const gx = dx / (minX * minX);
    const gy = dy / (minY * minY);
    const gl = Math.hypot(gx, gy) || 1;
    a.x -= (gx / gl) * gap * 0.5;
    a.y -= (gy / gl) * gap * 0.5;
    b.x += (gx / gl) * gap * 0.5;
    b.y += (gy / gl) * gap * 0.5;
    return true;
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
          this._separatePair(nodes[i], nodes[j], pad, halo);
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

    const maxAttempts = Math.min(64, 28 + Math.floor(nodes.length / 4));
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let fixed = false;

      for (const n of nodes) {
        if (this._pushOutsideBody(n, bodyPad, halo)) fixed = true;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (this._separatePair(nodes[i], nodes[j], pad, halo)) fixed = true;
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
      const spread = Math.min(1.7, 0.24 * group.length + 0.22);

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
        node.y = Math.sin(ang) * orbitDist;
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
   * Constellation mark: dim track, vitality arc, core. No per-node gradient.
   */
  _drawNodeGlyph(ctx, x, y, r, color, vitality, flags) {
    const p = Math.max(0.06, Math.min(1, (Number(vitality) || 0) / 100));
    const ring = flags.ring || color;
    const radius = Math.max(6, r - 0.6);
    const t = (performance.now() / 1000);

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = '#101624';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color.length === 7 ? color + '38' : color;
    ctx.lineWidth = 1.35;
    ctx.stroke();

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.strokeStyle = ring;
    ctx.lineWidth = flags.selected ? 3.1 : 2.35;
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
    ctx.lineCap = 'butt';

    if (flags.selected || flags.hovered || flags.hot) {
      const spin = t * (flags.selected ? 2.1 : 0.85);
      ctx.beginPath();
      ctx.strokeStyle = flags.selected ? '#f8fafc' : ring;
      ctx.lineWidth = flags.selected ? 2 : 1.4;
      ctx.arc(x, y, radius + 3.2, spin, spin + 0.7);
      ctx.stroke();
    }

    if (flags.stacked) {
      ctx.beginPath();
      ctx.fillStyle = '#d4af37';
      ctx.arc(x, y + radius - 1.5, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Centered vitality score. x/y are the drawn position, including explode offset. */
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
    // Stack coverage is a quiet glow only. It must not dim every other organ.
    if (!organFilter && !selectedNodeForBody && (!rawHighlightOrgs || !rawHighlightOrgs.length) && typeof window !== 'undefined') {
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
    const isolate = !!(selectedNodeForBody || organFilter);

    this._drawCentralBodyPng(ctx, 0, 0, 3.15, highlightOrgs, isNegativeImpact, isolate);

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

      if (isDimmed) ctx.globalAlpha = 0.22;

      const ring = (organFilter && organFilterMatch)
        ? (organFilterNeg ? '#ef4444' : '#22c55e')
        : ((isSelected || isHighlighted) ? '#f4e9c8' : (inStack && stack?.highlightMode ? '#d4af37' : groupColor));

      this._drawNodeGlyph(ctx, nx, ny, r, groupColor, node.vitality, {
        ring,
        selected: isSelected || isHighlighted,
        hovered: isHovered,
        hot: isHighValue && !isDimmed,
        stacked: inStack && !isDimmed
      });

      this._drawNodeScore(ctx, node, r, { isDimmed, isSelected, isHighValue, x: nx, y: ny, scale });

      const labelSize = Math.round(Math.max(8, Math.min(11, r * 0.38)));
      const showLabel = isSelected || isHovered || (labelSize * scale >= 7.5);
      if (showLabel) {
        ctx.fillStyle = isDimmed ? "#6b7280" : (isSelected ? "#f4e9c8" : "#e5e7eb");
        ctx.font = `${isSelected ? 700 : 600} ${labelSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(node.short, nx, ny - r - 8);
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

    if (typeof this._drawMapGuides === 'function') this._drawMapGuides(ctx);

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
   * 3D torso in place of the PNG body.
   * Layer opacities, selection highlight, and explode targets stay.
   */
  _drawCentralBodyPng(ctx, cx, cy, s, highlightOrgs = [], isNegative = false, isolate = false) {
    const active = new Set(highlightOrgs);
    const layerOp = this.anatomy?.opacity || { base: 1, skeleton: 0, muscles: 0, organs: 1 };
    const explode = this.organExplode;
    const explodeP = explode ? explode.progress : 0;

    const stage = getBodyStage();
    stage.acting = !!this.bodyFocus && explodeP < 0.04;
    stage.setState({
      layers: layerOp,
      highlights: active,
      negative: isNegative,
      explode: explodeP,
      isolate
    });
    if (!stage.onReady) {
      stage.onReady = () => { if (this.canvas) this.draw(); };
      stage.start(() => { if (this.canvas?.isConnected) this.draw(); });
    }
    stage.render();

    ctx.save();
    if (stage.ready) {
      const frame = stage.frame || 360;
      ctx.drawImage(stage.canvas, cx - frame, cy - frame, frame * 2, frame * 2);
    }
    const anchors = (typeof this._getOrganPositions === 'function') ? this._getOrganPositions() : {};
    this._organDrawPositions = { ...(stage.centers || {}) };
    const filterKey = explode?.activeOrganFilter || null;
    const hoverOrg = explode?.hoveredOrgan || null;
    const labels = {
      ...ORGAN_LABELS,
      tongue: 'Tongue',
      teeth: 'Teeth',
      spleen: 'Spleen',
      bladder: 'Bladder',
      glands: 'Glands'
    };
    if (explodeP > 0.45) {
      Object.entries(this._organDrawPositions).forEach(([key, pos]) => {
        if (!labels[key]) return;
        const isFilter = filterKey === key;
        const isHover = hoverOrg === key;
        const above = key === 'brain' || key === 'eyes' || key === 'teeth';
        const side = pos.x < 0 ? -1 : 1;
        const labelA = Math.min(1, (explodeP - 0.45) / 0.35) * 0.92;
        ctx.globalAlpha = labelA;
        ctx.font = `600 ${Math.round(11 + explodeP * 2)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isFilter ? '#86efac' : (isHover ? '#f8fafc' : '#cbd5e1');
        if (above) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(labels[key], pos.x, pos.y - (pos.hy || 16) - 6);
        } else {
          ctx.textAlign = side < 0 ? 'right' : 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[key], pos.x + side * ((pos.hx || 16) + 10), pos.y);
        }
      });
      ctx.globalAlpha = 1;
    }
    // Seated organs still need a hit point before the mesh centers exist.
    if (!stage.ready) {
      for (const key of ORGAN_EXPLODE_KEYS) {
        const anchor = anchors[key] || { x: cx, y: cy };
        this._organDrawPositions[key] = (explode && explodeP > 0.001)
          ? explode.getDrawPosition(key, anchor.x, anchor.y)
          : { x: anchor.x, y: anchor.y };
      }
    }

    if (filterKey && explodeP > 0.2) {
      ctx.globalAlpha = 0.85;
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(`Nodes linked to ${ORGAN_LABELS[filterKey] || filterKey}`, cx, cy - 250);
    }
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
    const keys = Object.keys(positions);
    let best = null;
    let bestD = Infinity;
    const hitR = 64 * (0.8 + explode.progress * 0.35);

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
      if (!explode.pinned && explode.setExpanded(true)) dirty = true;
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
      // Hover preview closes on leave. A click-pinned explode stays put.
      if (!explode.pinned && !explode.activeOrganFilter) {
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
    // First tap pins the explode open and leaves pan/zoom alone.
    // A second tap on the body collapses. Do not refit the camera.
    if (explode.pinned) {
      explode.collapseAll();
    } else {
      explode.pinned = true;
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
