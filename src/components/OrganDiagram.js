/**
 * Body-camera plate. Paths come from BodyParts3D, drawn once.
 * render() only changes opacity. No lighting, no mesh viewer.
 */

import { bodyCamera } from './bodyCameraGeometry.js';

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function addPaths(parent, paths, attrs) {
  paths.forEach((d) => parent.appendChild(el('path', { d, ...attrs })));
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
    const credit = el('desc', {});
    credit.textContent = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Flat plate, not a render. Source set of Z-Anatomy.';
    svg.appendChild(credit);

    const ribs = el('g', {
      fill: 'none',
      stroke: '#37d6e8',
      'stroke-width': '1.15',
      'stroke-linejoin': 'round',
      opacity: '0.35'
    });
    addPaths(ribs, bodyCamera.ribs, {});
    svg.appendChild(ribs);

    addPaths(svg, bodyCamera.ivc, { fill: '#3b7de2', stroke: 'none' });
    addPaths(svg, bodyCamera.heart, { id: 'organ-heart', fill: '#e23b3b', stroke: 'none' });
    addPaths(svg, bodyCamera.aorta, { fill: '#e23b3b', stroke: 'none' });

    this.liver = el('g', { id: 'organ-liver' });
    addPaths(this.liver, bodyCamera.liver, {
      fill: 'none',
      stroke: '#e8a317',
      'stroke-width': '8',
      opacity: '0.35'
    });
    addPaths(this.liver, bodyCamera.liver, { fill: '#e8a317', stroke: 'none' });
    this.liver.dataset.restOpacity = '0.18';
    svg.appendChild(this.liver);

    this.branches = el('g', { id: 'organ-liver-branches' });
    addPaths(this.branches, bodyCamera.hepaticVeins, { fill: '#3b7de2', stroke: 'none' });
    addPaths(this.branches, bodyCamera.branches, { fill: '#e23b3b', stroke: 'none' });
    this.branches.dataset.restOpacity = '0';
    svg.appendChild(this.branches);

    const claim = el('text', {
      x: '16',
      y: '418',
      fill: '#7f93a3',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size': '11'
    });
    claim.textContent = 'alcohol load on a first heavy night';
    svg.appendChild(claim);

    const value = el('text', {
      x: '16',
      y: '452',
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
