/**
 * AnatomyRenderer — layered body visualization (Issue #16 Phase 1)
 *
 * Manages independent opacity for:
 *   base (silhouette) · skeleton · muscles · organs
 *
 * Photoreal art is NOT required for Phase 1. Missing assets use labeled
 * transparent PNG placeholders under public/assets/body/{skeleton,muscles,organs}/
 * or canvas fallbacks drawn by SupplementTree.
 *
 * Drawing itself stays in SupplementTree._drawCentralBodyPng so pan/zoom/HiDPI
 * and existing organ glow behavior remain unchanged; this class owns layer state,
 * presets, and asset path lists.
 */

export const ANATOMY_PRESETS = {
  organs: {
    label: 'Organs',
    base: 1.0,
    skeleton: 0.0,
    muscles: 0.0,
    organs: 1.0
  },
  musculoskeletal: {
    label: 'Musculoskeletal',
    base: 0.55,
    skeleton: 0.85,
    muscles: 0.9,
    organs: 0.2
  },
  combined: {
    label: 'Combined',
    base: 0.85,
    skeleton: 0.4,
    muscles: 0.45,
    organs: 0.85
  },
  skeletal: {
    label: 'Skeletal only',
    base: 0.45,
    skeleton: 1.0,
    muscles: 0.0,
    organs: 0.0
  },
  muscles: {
    label: 'Muscles only',
    base: 0.45,
    skeleton: 0.0,
    muscles: 1.0,
    organs: 0.0
  }
};

/** Organ keys that should load from /organs/*.png (existing + Phase 1 placeholders). */
export const ORGAN_ASSET_KEYS = [
  'brain', 'eyes', 'gut', 'heart', 'liver', 'lungs', 'mito', 'nerves',
  'stomach', 'thyroid',
  // Phase 1 placeholders (labeled silhouettes until real art lands)
  'spine', 'kidneys', 'pancreas', 'adrenals'
];

/** Map data organ tags → visual asset key (e.g. kidney → kidneys.png). */
export const ORGAN_TAG_TO_ASSET = {
  kidney: 'kidneys',
  kidneys: 'kidneys',
  spine: 'spine',
  bones: 'spine',       // highlight spine placeholder when bones tagged
  pancreas: 'pancreas',
  adrenal: 'adrenals',
  adrenals: 'adrenals',
  stomach: 'stomach'
};

export class AnatomyRenderer {
  constructor() {
    this.opacity = {
      base: 1.0,
      skeleton: 0.0,
      muscles: 0.0,
      organs: 1.0
    };
    this.visible = {
      base: true,
      skeleton: false,
      muscles: false,
      organs: true
    };
    this.preset = 'organs';
    this.images = {
      base: {},
      organs: {},
      skeleton: {},
      muscles: {}
    };
    this.ready = false;
    this._listeners = [];
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _notify() {
    const snap = this.snapshot();
    this._listeners.forEach(fn => {
      try { fn(snap); } catch { /* ignore */ }
    });
  }

  snapshot() {
    return {
      preset: this.preset,
      opacity: { ...this.opacity },
      visible: { ...this.visible }
    };
  }

  applyPreset(name) {
    const p = ANATOMY_PRESETS[name];
    if (!p) return;
    this.preset = name;
    for (const layer of ['base', 'skeleton', 'muscles', 'organs']) {
      const v = p[layer] ?? 0;
      this.opacity[layer] = v;
      this.visible[layer] = v > 0.01;
    }
    this._notify();
  }

  setLayerOpacity(layer, value) {
    if (!(layer in this.opacity)) return;
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    this.opacity[layer] = v;
    this.visible[layer] = v > 0.01;
    this.preset = 'custom';
    this._notify();
  }

  /**
   * Load PNGs. `baseUrl` should already include trailing path to /assets/body
   * (caller supplies import.meta.env.BASE_URL + 'assets/body').
   */
  load(baseUrl) {
    const pending = [];
    const loadOne = (bucket, key, src) => {
      const img = new Image();
      img.src = src;
      pending.push(new Promise((resolve) => {
        img.onload = () => {
          this.images[bucket][key] = img;
          resolve();
        };
        img.onerror = () => resolve();
      }));
    };

    ['male', 'female'].forEach((g) => {
      loadOne('base', g, `${baseUrl}/base/body-${g}.png`);
    });

    ORGAN_ASSET_KEYS.forEach((key) => {
      loadOne('organs', key, `${baseUrl}/organs/${key}.png`);
    });

    loadOne('skeleton', 'full', `${baseUrl}/skeleton/skeleton_full.png`);
    loadOne('muscles', 'anterior', `${baseUrl}/muscles/muscles_anterior.png`);
    loadOne('muscles', 'posterior', `${baseUrl}/muscles/muscles_posterior.png`);

    return Promise.all(pending).then(() => {
      this.ready = true;
      this._notify();
      return this;
    });
  }

  /** Expand highlight organ tags so kidney/bones/etc. light the right PNG. */
  expandHighlights(organs = []) {
    const out = new Set();
    for (const raw of organs) {
      const key = String(raw || '').toLowerCase();
      if (!key) continue;
      out.add(key);
      const mapped = ORGAN_TAG_TO_ASSET[key];
      if (mapped) out.add(mapped);
      // stomach ↔ gut mutual highlight for ring continuity
      if (key === 'gut') out.add('stomach');
      if (key === 'stomach') out.add('gut');
    }
    return out;
  }
}
