/**
 * FoodsTree
 *
 * 100 Foods Constellation (80 healthiest + 20 common harmful with negative effects).
 * Reuses the entire rich rendering, camera, interaction, and collision system
 * from SupplementTree for maximum UI reuse and consistency.
 *
 * Negative impact foods (impact: 'negative') trigger red damage highlights on the body
 * when selected (organs they harm are shown in damage red instead of normal organ colors).
 * Only the data, colors, categories, load logic, and node coloring are customized.
 */

import { SupplementTree } from "./SupplementTree.js";
import { calcVitality } from "../core/ScoringEngine.js";

export class FoodsTree extends SupplementTree {
  constructor(canvas, options = {}) {
    super(canvas, options);

    // Natural, food-oriented palette — greens, earth, warm tones for healthy foods
    // Negative nodes will override to red via base _getNodeColor support
    this.organColors = {
      brain:   '#a78bfa',
      heart:   '#fb7185',
      lungs:   '#67e8f9',
      muscle:  '#fb923c',
      joints:  '#f472b6',
      bones:   '#d1d5db',
      mito:    '#facc15',
      nerves:  '#c084fc',
      immune:  '#4ade80',
      liver:   '#a3e635',
      gut:     '#34d399',
      sleep:   '#6366f1',
      mind:    '#c084fc',
      nutrition: '#f59e0b',
      recovery: '#14b8a6',
      social:  '#ec4899',
      vices:   '#ef4444',
      productivity: '#3b82f6',
      // Food-specific / natural additions
      vegetables: '#22c55e',
      fruits: '#f97316',
      berries: '#ec4899',
      "nuts-seeds": '#854d0e',
      legumes: '#65a30d',
      grains: '#ca8a04',
      fish: '#0ea5e9',
      proteins: '#f43f5e',
      fermented: '#8b5cf6',
      spices: '#f59e0b',
      teas: '#10b981',
      oils: '#eab308',
      superfoods: '#a855f7',
      // Caution categories get a red-ish base (overridden by impact flag anyway)
      "caution-sugars": '#b91c1c',
      "caution-drinks": '#991b1b',
      "caution-fried": '#7f1d1d',
      "caution-snacks": '#9f1239',
      "caution-meats": '#881337',
      "caution-processed": '#7c2d12',
      "caution-refined": '#854d0e',
      "caution-fats": '#78350f'
    };

    // Sequence for potential horizontal views (food categories)
    this.sequenceOrder = [
      'vegetables', 'fruits', 'berries', 'nuts-seeds', 'legumes', 'grains',
      'fish', 'proteins', 'fermented', 'spices', 'teas', 'oils', 'superfoods',
      'caution-sugars', 'caution-drinks', 'caution-fried', 'caution-snacks', 'caution-meats', 'caution-processed', 'caution-refined', 'caution-fats'
    ];
  }

  loadData(foodsArray) {
    this.rawSupplements = foodsArray;

    this.nodes = foodsArray.map(f => {
      const vitality = calcVitality(f);
      return {
        ...f,
        vitality,
        radius: this._calcNodeRadius({ ...f, vitality }, 0.5),
        _isFood: true,
        // Ensure impact flag for negative foods (bad foods have impact:'negative' in data)
        impact: f.impact || 'positive'
      };
    });

    this.enabledGroups = new Set(this.nodes.map(n => n.cat).filter(Boolean));
    this.computeLayout();
  }

  // Optional: foods can override node color logic more if needed (base already handles impact negative -> red)
}