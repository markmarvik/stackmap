/**
 * One map of every constellation. Nodes keep their source id for My Stack.
 * The camera frames the whole set; names appear once you zoom in.
 */

import { SupplementTree } from './SupplementTree.js';
import { calcVitality } from '../core/ScoringEngine.js';
import { computeBiomarkerScore } from '../data/biomarkers.js';
import {
  layoutAll,
  buildAllGroups,
  ALL_NODE_RADIUS,
  ALL_LABEL_SCALE,
  ALL_MIN_GAP,
  ALL_LABEL_GAP,
  ALL_TITLE_GAP,
  TITLE_FONT_PX
} from '../core/AllLayout.js';

export const allCategories = [
  { key: 'supplements', label: 'SUPPS', icon: 'fa-pills' },
  { key: 'habits', label: 'HABITS', icon: 'fa-user-check' },
  { key: 'exercises', label: 'TRAIN', icon: 'fa-dumbbell' },
  { key: 'foods', label: 'FOODS', icon: 'fa-carrot' },
  { key: 'environment', label: 'ENV', icon: 'fa-radiation' },
  { key: 'biomarkers', label: 'LABS', icon: 'fa-vial' }
];

export class AllTree extends SupplementTree {
  static CONST_COLORS = {
    supplements: '#fbbf24',
    habits: '#34d399',
    exercises: '#fb923c',
    foods: '#4ade80',
    environment: '#f87171',
    biomarkers: '#38bdf8'
  };

  loadData(arr) {
    this.rawSupplements = arr;
    this.nodes = arr.map((n) => {
      const isLab = n._constellation === 'biomarkers';
      const vitality = isLab ? computeBiomarkerScore(n) : calcVitality(n);
      return {
        ...n,
        vitality,
        longevity: n.longevity ?? vitality,
        qol: n.qol ?? vitality,
        radius: 11,
        _isBiomarker: isLab,
        _isBlood: isLab,
        displayValue: isLab
          ? (n.current != null ? String(n.current) : String(vitality))
          : n.displayValue
      };
    });
    this.enabledGroups = new Set(this.nodes.map((n) => n.cat).filter(Boolean));
    this.maxNodes = 0;
    this.computeLayout();
  }

  _getNodeColor(node) {
    if (node.impact === 'negative' || node._isNegative || node._constellation === 'environment') {
      return '#ef4444';
    }
    return AllTree.CONST_COLORS[node._constellation] || '#94a3b8';
  }

  computeLayout() {
    const visible = this._getVisibleNodes();
    const groups = buildAllGroups(visible);
    const layout = layoutAll(groups, {
      bodyEdgeRadius: (angle) => this._bodyEdgeRadius(angle),
      minGap: ALL_MIN_GAP,
      labelGap: ALL_LABEL_GAP,
      titleGap: ALL_TITLE_GAP
    });
    for (let i = 0; i < visible.length; i++) {
      const node = visible[i];
      const pos = layout.positions.get(node.id);
      node.radius = ALL_NODE_RADIUS;
      if (!pos) continue;
      node.x = pos.x;
      node.y = pos.y;
    }
    this._mapTitles = layout.titles.map((title) => ({
      ...title,
      color: AllTree.CONST_COLORS[title.key] || '#94a3b8'
    }));
    this._layoutBounds = layout.bounds;

    if (!this.view) this.view = { panX: 0, panY: 0, scale: ALL_LABEL_SCALE };
    if (typeof this.view.panX !== 'number') this.view.panX = 0;
    if (typeof this.view.panY !== 'number') this.view.panY = 0;
    if (typeof this.view.scale !== 'number') this.view.scale = ALL_LABEL_SCALE;
  }

  fitToNodes() {
    const bounds = this._layoutBounds;
    const { width: w, height: h } = this.getLogicalSize();
    if (!bounds || !w || !h || !Number.isFinite(bounds.minX)) {
      super.fitToNodes();
      return;
    }
    const pad = 12;
    const minX = bounds.minX - pad;
    const maxX = bounds.maxX + pad;
    const minY = bounds.minY - pad;
    const maxY = bounds.maxY + pad;
    const bw = Math.max(80, maxX - minX);
    const bh = Math.max(80, maxY - minY);
    const narrow = w < 780;
    const insetL = narrow ? 8 : 16;
    const insetR = narrow ? 156 : 176;
    const insetT = narrow ? 92 : 78;
    const insetB = narrow ? 120 : 56;
    const availW = Math.max(80, w - insetL - insetR);
    const availH = Math.max(80, h - insetT - insetB);
    const scale = Math.max(0.02, Math.min(1.05, Math.min(availW / bw, availH / bh)));
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
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.draw();
  }

  _drawMapGuides(ctx) {
    if (this.bodyFocus || !this._mapTitles || !this._mapTitles.length) return;
    ctx.save();
    ctx.font = `600 ${TITLE_FONT_PX}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < this._mapTitles.length; i++) {
      const title = this._mapTitles[i];
      ctx.fillStyle = title.color;
      ctx.globalAlpha = 0.8;
      ctx.fillText(title.label, title.x + title.w / 2, title.y + title.h / 2);
    }
    ctx.restore();
  }
}
