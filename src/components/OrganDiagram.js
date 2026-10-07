/**
 * Body-camera organ view. Nodes are created once.
 * render() only changes opacity. pulse() is opacity for 2.4s.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export class OrganDiagram {
  constructor(containerId = 'body-diagram') {
    this.container = document.getElementById(containerId);
    this.activeOrgans = [];
    this.liver = null;
    this.branches = null;
    this.built = false;
  }

  render(activeOrgans = []) {
    if (!this.container) return;
    this.activeOrgans = Array.isArray(activeOrgans) ? activeOrgans : [];
    if (this.container.dataset.bodyCamera === '1') this.rebind();
    else this.mount();
    this.sync();
  }

  rebind() {
    this.liver = this.container.querySelector('#organ-liver');
    this.branches = this.container.querySelector('#organ-liver-branches');
    this.built = true;
  }

  mount() {
    const svg = this.container;
    svg.setAttribute('viewBox', '0 0 320 480');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'ALCOHOL LOAD');
    svg.style.background = '#070b14';
    svg.style.display = 'block';
    svg.dataset.bodyCamera = '1';

    svg.appendChild(el('rect', { x: '0', y: '0', width: '320', height: '480', fill: '#070b14' }));

    const wire = el('g', {
      fill: 'none',
      stroke: '#37d6e8',
      'stroke-width': '1.15',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0.35'
    });
    [
      'M148 36 L148 68 M172 36 L172 68',
      'M148 68 Q104 76 96 118',
      'M172 68 Q216 76 224 118',
      'M96 118 C86 176 90 250 108 312 C124 348 148 362 160 364 C172 362 196 348 212 312 C230 250 234 176 224 118',
      'M160 72 L160 348'
    ].forEach((d) => wire.appendChild(el('path', { d })));
    [108, 136, 164, 192, 220, 248].forEach((y) => {
      const bow = 18 + (y - 108) * 0.04;
      wire.appendChild(el('path', { d: `M160 ${y} Q${160 - 52} ${y + bow} ${108 + (y - 108) * 0.08} ${y + 28}` }));
      wire.appendChild(el('path', { d: `M160 ${y} Q${160 + 52} ${y + bow} ${212 - (y - 108) * 0.08} ${y + 28}` }));
    });
    svg.appendChild(wire);

    const veins = el('g', {
      fill: 'none',
      stroke: '#3b7de2',
      'stroke-width': '2.4',
      'stroke-linecap': 'round',
      opacity: '0.85'
    });
    veins.appendChild(el('path', { d: 'M154 150 L146 292' }));
    svg.appendChild(veins);

    svg.appendChild(el('ellipse', {
      id: 'organ-heart',
      cx: '176',
      cy: '132',
      rx: '16',
      ry: '13',
      fill: '#e23b3b'
    }));

    svg.appendChild(el('path', {
      d: 'M176 126 C196 108 204 132 184 146 L174 268',
      fill: 'none',
      stroke: '#e23b3b',
      'stroke-width': '4',
      'stroke-linecap': 'round'
    }));

    this.branches = el('g', {
      id: 'organ-liver-branches',
      fill: 'none',
      'stroke-linecap': 'round'
    });
    [
      'M174 176 L124 214',
      'M172 198 L128 232',
      'M170 220 L136 246'
    ].forEach((d) => {
      this.branches.appendChild(el('path', { d, stroke: '#e23b3b', 'stroke-width': '2.2' }));
    });
    [
      'M124 214 L146 196',
      'M130 236 L146 214'
    ].forEach((d) => {
      this.branches.appendChild(el('path', { d, stroke: '#3b7de2', 'stroke-width': '2' }));
    });
    this.branches.dataset.restOpacity = '0';
    svg.appendChild(this.branches);

    this.liver = el('g', { id: 'organ-liver' });
    const liverPath = 'M72 188 C58 214 62 278 108 302 C156 322 186 292 176 246 C170 220 150 236 136 220 C154 200 168 188 150 174 C124 164 90 168 72 188';
    this.liver.appendChild(el('path', {
      d: liverPath,
      fill: 'none',
      stroke: '#e8a317',
      'stroke-width': '10',
      opacity: '0.35'
    }));
    this.liver.appendChild(el('path', { d: liverPath, fill: '#e8a317', stroke: 'none' }));
    this.liver.dataset.restOpacity = '0.18';
    svg.appendChild(this.liver);

    const claim = el('text', {
      x: '20',
      y: '404',
      fill: '#7f93a3',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size': '11'
    });
    claim.textContent = 'alcohol load on a first heavy night';
    svg.appendChild(claim);

    const value = el('text', {
      x: '20',
      y: '444',
      fill: '#e8eef2',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size': '28'
    });
    value.textContent = 'ALCOHOL LOAD';
    svg.appendChild(value);

    this.built = true;
  }

  sync() {
    const liverOn = this.activeOrgans.includes('liver');
    const organOpacity = liverOn ? '1' : '0.18';
    const branchOpacity = liverOn ? '1' : '0';
    this.liver.dataset.restOpacity = organOpacity;
    this.liver.style.transition = 'none';
    this.liver.style.opacity = organOpacity;
    this.branches.dataset.restOpacity = branchOpacity;
    this.branches.style.transition = 'none';
    this.branches.style.opacity = branchOpacity;
  }

  pulse(organKey) {
    if (!this.container || !organKey) return;
    this.container.querySelectorAll(`#organ-${organKey}`).forEach((node) => {
      const rest = node.dataset.restOpacity || '1';
      node.style.transition = 'none';
      node.style.opacity = '0.28';
      requestAnimationFrame(() => {
        node.style.transition = 'opacity 2.4s linear';
        node.style.opacity = rest;
      });
    });
  }

  clear() {
    this.activeOrgans = [];
    if (this.built) this.sync();
  }
}
