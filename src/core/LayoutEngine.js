/**
 * LayoutEngine
 * 
 * Responsible for smart, collision-free placement of nodes in a tree/constellation.
 * Current implementation: Improved version of the vitality-weighted polar layout.
 * Future: Iterative repulsion, circle packing, spring-based animation targets.
 */

export class LayoutEngine {
  constructor(options = {}) {
    this.MAX_ORBIT = options.maxOrbit ?? 265;
    this.MIN_ORBIT = options.minOrbit ?? 38;
    this.centerX = options.centerX ?? 410;
    this.centerY = options.centerY ?? 430;
  }

  /**
   * Computes positions for a list of nodes.
   * Each node is expected to have at least: vitality, cat, (optional) radius hint
   */
  computePositions(nodes) {
    const positions = new Map();

    // Category angular sectors (same philosophy as the monolith, improved)
    const catAngles = {
      cardio: -1.8,
      neuro: -1.0,
      immune: -0.4,
      mito: 0.6,
      metabolic: 1.3,
      muscle: 1.9,
      foundational: 2.6,
      gut: 2.9,
      "": 0
    };

    nodes.forEach((node, index) => {
      const vitality = node.vitality ?? 70;
      const norm = Math.min(1, vitality / 100);
      const diseaseBonus = Math.min(0.18, (node.diseases || 4) / 80);
      const importance = Math.min(0.97, norm + diseaseBonus);

      const baseAngle = catAngles[node.cat] ?? 0;
      const jitter = ((index * 0.618) % 1 - 0.5) * 0.72;
      const angle = baseAngle + jitter;

      const orbit = this.MIN_ORBIT + (this.MAX_ORBIT - this.MIN_ORBIT) * (1 - importance * 0.93);

      const x = this.centerX + Math.cos(angle) * orbit;
      const y = this.centerY + Math.sin(angle) * orbit * 0.88;

      // Basic radius (will be refined with collision pass)
      const baseR = 11 + (vitality / 100) * 19;
      const radius = Math.max(13, Math.min(31, baseR * (1 + diseaseBonus * 1.5)));

      positions.set(node.id, { x, y, radius });
    });

    // TODO: Add collision resolution pass here (repulsion iterations)
    // TODO: Return both final positions and animation targets

    // Apply collision resolution
    this.resolveCollisions(positions, nodes, 12);

    // Ensure every entry has a radius (defensive)
    positions.forEach((p, id) => {
      if (!p.radius) {
        const node = nodes.find(n => n.id === id);
        if (node) {
          const diseaseBonus = Math.min(0.18, (node.diseases || 4) / 80);
          const baseR = 11 + ((node.vitality ?? 70) / 100) * 19;
          p.radius = Math.max(13, Math.min(32, baseR * (1 + diseaseBonus * 1.6)));
        }
      }
    });

    return { positions, previous: new Map() };
  }

  /**
   * Iterative collision resolution (repulsion).
   * Used by SupplementTree after its zodiac slice placement to guarantee
   * proper node spacing on the 2D canvas (even for very differently-sized nodes).
   * This directly addresses the "node collisions" issue.
   */
  resolveCollisions(positions, nodes, iterations = 12, padding = 6) {
    const posArray = Array.from(positions.entries()).map(([id, p]) => {
      return { id, x: p.x, y: p.y, r: (p.radius || 18) };
    });

    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;

      for (let i = 0; i < posArray.length; i++) {
        for (let j = i + 1; j < posArray.length; j++) {
          const a = posArray[i];
          const b = posArray[j];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 0.01) dist = 0.01;

          const minDist = a.r + b.r + padding;

          if (dist < minDist) {
            const overlap = (minDist - dist) / 2 + 0.5;
            const ux = dx / dist;
            const uy = dy / dist;

            a.x -= ux * overlap;
            a.y -= uy * overlap;
            b.x += ux * overlap;
            b.y += uy * overlap;

            moved = true;
          }
        }
      }

      if (!moved) break; // early exit when stable
    }

    // Write back improved positions
    posArray.forEach(p => {
      if (positions.has(p.id)) {
        const orig = positions.get(p.id);
        positions.set(p.id, { ...orig, x: p.x, y: p.y });
      }
    });

    return positions;
  }
}
