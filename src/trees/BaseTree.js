/**
 * BaseTree
 * 
 * Abstract base class for all AETHERIS trees (Supplements, Exercise, Nutrition, Habits, etc.).
 * Provides common interface for:
 *   - Data management
 *   - Layout (via LayoutEngine)
 *   - Canvas rendering contract (HiDPI via CanvasViewport)
 *   - Interaction (hit testing, hover, selection)
 *   - Animation hooks
 */

import { CanvasViewport } from "../core/CanvasViewport.js";

export class BaseTree {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;
    this.viewport = canvas ? new CanvasViewport(canvas) : null;
    this.nodes = [];
    this.selectedId = null;
    this.hoveredId = null;
    this.layoutEngine = options.layoutEngine || null;
    this.onNodeClick = options.onNodeClick || null;
    this.onNodeHover = options.onNodeHover || null;
  }

  // Subclasses must implement
  loadData() {
    throw new Error("loadData() must be implemented by subclass");
  }

  computeLayout() {
    throw new Error("computeLayout() must be implemented by subclass");
  }

  draw() {
    throw new Error("draw() must be implemented by subclass");
  }

  // Default hit testing (can be overridden)
  getNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      const r = (n.radius || 18) + 6;
      if (dx * dx + dy * dy < r * r) {
        return n;
      }
    }
    return null;
  }

  select(id) {
    this.selectedId = id;
    this.draw();
  }

  setHover(id) {
    if (this.hoveredId !== id) {
      this.hoveredId = id;
      this.draw();
    }
  }

  reset() {
    this.selectedId = null;
    this.hoveredId = null;
    this.draw();
  }

  /** Logical canvas size (CSS pixels). */
  getLogicalSize() {
    if (this.viewport) {
      return { width: this.viewport.width, height: this.viewport.height };
    }
    return {
      width: this.canvas?.width || 900,
      height: this.canvas?.height || 720
    };
  }

  bindViewport(onResize) {
    this.viewport?.bind(onResize);
  }

  dispose() {
    this.viewport?.dispose();
  }
}
