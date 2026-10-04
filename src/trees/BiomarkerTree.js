/**
 * BiomarkerTree
 *
 * Biomarker constellation (blood + urine + saliva + other) inspired by
 * Bryan Johnson Blueprint / Siim Land. Reuses layout/rendering from SupplementTree.
 *
 * Nodes represent biomarkers across specimen types. Placed near relevant organs
 * where possible. Display shows current value + color by status (optimal/sub/high).
 * Age predictor impact used for sizing/importance.
 *
 * See GitHub Issue #14.
 */

import { SupplementTree } from "./SupplementTree.js";
import { computeBiomarkerScore } from "../data/biomarkers.js";

export class BiomarkerTree extends SupplementTree {
  constructor(canvas, options = {}) {
    super(canvas, options);

    this.organColors = {
      heart:   '#fb7185',
      vascular: '#f87171',
      brain:   '#c084fc',
      liver:   '#a3e635',
      kidney:  '#67e8f9',
      mito:    '#facc15',
      immune:  '#4ade80',
      muscle:  '#fb923c',
      endocrine: '#f472b6',
      pancreas: '#f59e0b',
      adrenal: '#f472b6',
      inflammation: '#ef4444',
      metabolic: '#f59e0b',
      lipids: '#fb7185',
      hormones: '#c084fc',
      nutrients: '#4ade80',
      other: '#94a3b8'
    };

    this.sequenceOrder = [
      'inflammation', 'metabolic', 'lipids', 'hormones',
      'nutrients', 'kidney', 'liver', 'other'
    ];

    /** Optional specimen filter: null/"all" = show all specimen types. */
    this.enabledSpecimens = new Set(['blood', 'urine', 'saliva', 'other']);
  }

  loadData(markerArray) {
    this.rawSupplements = markerArray;

    this.nodes = markerArray.map(m => {
      const specimen = m.specimen_type || 'blood';
      const vitality = computeBiomarkerScore(m);
      return {
        ...m,
        specimen_type: specimen,
        vitality,
        radius: this._calcNodeRadius({ ...m, vitality }, 0.6),
        _isBiomarker: true,
        // Legacy flag kept briefly so older inspector branches still work
        _isBlood: true,
        displayValue: m.current != null
          ? String(m.current)
          : (m.age_impact != null
              ? (m.age_impact > 0 ? `+${m.age_impact}` : String(m.age_impact))
              : '?')
      };
    });

    this.enabledGroups = new Set(this.nodes.map(n => n.cat).filter(Boolean));
    this.computeLayout();
  }

  setSpecimenFilter(keys) {
    if (!keys || keys.length === 0 || (keys.length === 1 && keys[0] === 'all')) {
      this.enabledSpecimens = new Set(['blood', 'urine', 'saliva', 'other']);
    } else {
      this.enabledSpecimens = new Set(keys);
    }
    this._afterGroupChange();
  }

  _getVisibleNodes() {
    let vis = super._getVisibleNodes();
    if (this.enabledSpecimens && this.enabledSpecimens.size > 0) {
      vis = vis.filter(n => this.enabledSpecimens.has(n.specimen_type || 'blood'));
    }
    return vis;
  }

  _getNodeColor(node) {
    if (node.status === 'high') return '#ef4444';
    if (node.status === 'suboptimal') return '#f59e0b';
    if (node.status === 'optimal') return '#4ade80';
    return super._getNodeColor ? super._getNodeColor(node) : '#94a3b8';
  }

  _drawNodeScore(ctx, node, r, { isDimmed, isSelected, x, y, scale = 1 }) {
    if (!isSelected && r * scale < 7) return;
    if (r < 8) return;

    const val = node.displayValue || String(node.vitality ?? '');
    // Use explode draw pos when provided (same as circle / label / hit-test)
    const dx = x ?? node.x;
    const dy = y ?? node.y;
    const fsVit = Math.round(Math.max(7, Math.min(12, r * 0.48)));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${isSelected ? 700 : 600} ${fsVit}px Inter, system-ui, sans-serif`;

    let color = '#e0f2fe';
    if (node.status === 'high') color = '#fecaca';
    else if (node.status === 'suboptimal') color = '#fef08c';
    else if (node.status === 'optimal') color = '#bbf7d0';

    ctx.fillStyle = isDimmed ? '#6b7280' : (isSelected ? '#e0f2fe' : color);
    ctx.fillText(val, dx, dy);
  }
}
