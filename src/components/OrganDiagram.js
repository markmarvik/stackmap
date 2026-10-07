/**
 * Optimized body-camera view.
 * BodyParts3D release 4.0, © The Database Center for Life Science,
 * CC BY 4.0. The same meshes are the source set of Z-Anatomy.
 * Positions are quantized. One lit draw per part. No postprocessing.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer
} from 'three';

const VERT = `
varying vec3 vN;
varying vec3 vP;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vP = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uGlow;
uniform float uOpacity;
uniform float uSpec;
varying vec3 vN;
varying vec3 vP;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vP);
  vec3 keyL = normalize(vec3(0.45, 0.82, 0.62));
  vec3 fillL = normalize(vec3(-0.72, 0.12, 0.28));
  float key = clamp(dot(n, keyL) * 0.55 + 0.45, 0.0, 1.0);
  float fill = clamp(dot(n, fillL) * 0.5 + 0.5, 0.0, 1.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.35);
  float spec = pow(max(dot(n, normalize(keyL + v)), 0.0), 36.0);
  vec3 col = uColor * (key * 0.78 + fill * 0.28);
  col += uRim * fres;
  col += vec3(1.0, 0.96, 0.9) * spec * uSpec;
  col += uColor * uGlow;
  gl_FragColor = vec4(col, uOpacity);
}
`;

const LOOK = {
  ribs: { color: '#145e68', rim: '#37d6e8', glow: 0.05, opacity: 0.38, spec: 0.04, transparent: true, order: 0 },
  heart: { color: '#e23b3b', rim: '#ffb0a4', glow: 0.14, opacity: 1, spec: 0.32, order: 1 },
  aorta: { color: '#d83232', rim: '#ffc9c0', glow: 0.2, opacity: 1, spec: 0.38, order: 1 },
  ivc: { color: '#3b7de2', rim: '#c9ddff', glow: 0.12, opacity: 1, spec: 0.28, order: 1 },
  artery: { color: '#e23b3b', rim: '#ffd0c8', glow: 0.18, opacity: 1, spec: 0.34, order: 3, with: 'liver' },
  hepatic: { color: '#3b7de2', rim: '#d7e6ff', glow: 0.16, opacity: 1, spec: 0.28, order: 3, with: 'liver' },
  liver: { color: '#e8a317', rim: '#f0d48a', glow: 0.28, opacity: 1, spec: 0.1, order: 2, organ: 'liver' }
};

function materialFor(look) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(look.color) },
      uRim: { value: new Color(look.rim) },
      uGlow: { value: look.glow },
      uOpacity: { value: look.opacity },
      uSpec: { value: look.spec }
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: !!look.transparent,
    depthWrite: !look.transparent,
    side: DoubleSide,
    toneMapped: false
  });
}

function parseTorso(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'BOD2') throw new Error('bad body mesh');
  let offset = 4;
  const count = view.getUint16(offset, true);
  offset += 4;
  const radius = view.getFloat32(offset, true);
  offset += 4;
  const scale = view.getFloat32(offset, true);
  offset += 4;
  const text = new TextDecoder();
  const groups = [];
  for (let g = 0; g < count; g += 1) {
    const nameLen = view.getUint8(offset);
    offset += 1;
    const name = text.decode(new Uint8Array(buffer, offset, nameLen));
    offset += nameLen;
    const verts = view.getUint32(offset, true);
    offset += 4;
    const indexCount = view.getUint32(offset, true);
    offset += 4;
    const use16 = view.getUint8(offset) === 1;
    offset += 1;
    const pos = new Float32Array(verts * 3);
    for (let i = 0; i < pos.length; i += 1) {
      pos[i] = view.getInt16(offset, true) * scale;
      offset += 2;
    }
    const nrm = new Float32Array(verts * 3);
    for (let i = 0; i < nrm.length; i += 1) {
      nrm[i] = view.getInt8(offset) / 127;
      offset += 1;
    }
    const idx = use16 ? new Uint16Array(indexCount) : new Uint32Array(indexCount);
    for (let i = 0; i < indexCount; i += 1) {
      idx[i] = use16 ? view.getUint16(offset, true) : view.getUint32(offset, true);
      offset += use16 ? 2 : 4;
    }
    groups.push({ name, pos, nrm, idx });
  }
  return { radius, groups };
}

export class OrganDiagram {
  constructor(containerId = 'body-diagram') {
    this.container = document.getElementById(containerId);
    this.activeOrgans = [];
    this.parts = {};
    this.yaw = -0.55;
    this.pitch = 0.12;
    this.dragging = false;
    this.alive = false;
    this.pendingPulse = null;
    this.idleUntil = 0;
  }

  render(activeOrgans = []) {
    if (!this.container) return;
    this.activeOrgans = Array.isArray(activeOrgans) ? activeOrgans : [];
    if (this.container.dataset.bodyCamera !== '1') this.mount();
    this.sync();
  }

  mount() {
    const root = this.container;
    root.dataset.bodyCamera = '1';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'run-body-canvas';
    this.canvas.setAttribute('aria-label', 'ALCOHOL LOAD');
    root.appendChild(this.canvas);
    if (!root.querySelector('.run-body-value')) {
      const claim = document.createElement('p');
      claim.className = 'run-body-label';
      claim.textContent = 'alcohol load on a first heavy night';
      const value = document.createElement('p');
      value.className = 'run-body-value';
      value.textContent = 'ALCOHOL LOAD';
      root.append(claim, value);
    }
    root.addEventListener('pointerdown', (event) => this.onDown(event));
    root.addEventListener('pointermove', (event) => this.onMove(event));
    root.addEventListener('pointerup', () => { this.dragging = false; });
    root.addEventListener('pointercancel', () => { this.dragging = false; });
    this.load();
  }

  async load() {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${base}assets/body/camera/torso.bin?v=2`);
      if (!response.ok) throw new Error('mesh missing');
      const data = parseTorso(await response.arrayBuffer());
      if (!this.container.isConnected) return;
      this.build(data);
      this.sync();
      if (this.pendingPulse) this.runPulse(this.pendingPulse);
    } catch (error) {
      console.warn('[body camera]', error);
    }
  }

  build(data) {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x070b14, 1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.scene = new Scene();
    this.group = new Group();
    this.scene.add(this.group);
    const dist = data.radius / Math.sin((14 * Math.PI) / 180);
    this.camera = new PerspectiveCamera(28, 1, data.radius * 0.02, dist * 4);
    this.camera.position.set(0, data.radius * 0.04, dist * 0.92);
    data.groups.forEach((group) => {
      const look = LOOK[group.name];
      if (!look) return;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(group.pos, 3));
      geo.setAttribute('normal', new BufferAttribute(group.nrm, 3));
      geo.setIndex(new BufferAttribute(group.idx, 1));
      const mesh = new Mesh(geo, materialFor(look));
      mesh.name = group.name;
      mesh.renderOrder = look.order;
      mesh.userData.restGlow = look.glow;
      mesh.userData.with = look.with || null;
      this.group.add(mesh);
      this.parts[group.name] = mesh;
    });
    this.alive = true;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.container);
    this.resize();
    this.last = performance.now();
    this.frame = (now) => this.tick(now);
    requestAnimationFrame(this.frame);
  }

  resize() {
    if (!this.renderer || !this.container) return;
    const width = this.container.clientWidth || 320;
    const height = this.container.clientHeight || 400;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  tick(now) {
    if (!this.alive) return;
    if (!this.container.isConnected) {
      this.dispose();
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.dragging && now > this.idleUntil) this.yaw += dt * 0.32;
    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.pitch;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  }

  onDown(event) {
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.idleUntil = performance.now() + 2600;
    if (this.container.setPointerCapture) this.container.setPointerCapture(event.pointerId);
  }

  onMove(event) {
    if (!this.dragging) return;
    this.yaw += (event.clientX - this.lastX) * 0.008;
    this.pitch = Math.max(-0.65, Math.min(0.85, this.pitch + (event.clientY - this.lastY) * 0.005));
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.idleUntil = performance.now() + 2600;
  }

  sync() {
    const liverOn = this.activeOrgans.includes('liver');
    const liver = this.parts.liver;
    if (liver) {
      const glow = liverOn ? 0.28 : 0.05;
      liver.userData.restGlow = glow;
      liver.material.uniforms.uGlow.value = glow;
      liver.material.uniforms.uOpacity.value = liverOn ? 1 : 0.22;
      liver.material.transparent = !liverOn;
      liver.material.depthWrite = liverOn;
      liver.material.needsUpdate = true;
    }
    Object.values(this.parts).forEach((mesh) => {
      if (mesh.userData.with) mesh.visible = liverOn;
    });
  }

  pulse(organKey) {
    if (!organKey) return;
    this.pendingPulse = organKey;
    this.runPulse(organKey);
  }

  runPulse(organKey) {
    const mesh = this.parts[organKey];
    if (!mesh) return;
    const rest = mesh.userData.restGlow ?? 0.46;
    const start = performance.now();
    const from = 1.25;
    const step = (now) => {
      if (!mesh.material) return;
      const t = Math.min(1, (now - start) / 2400);
      mesh.material.uniforms.uGlow.value = from + (rest - from) * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  dispose() {
    this.alive = false;
    this.observer?.disconnect();
    this.renderer?.dispose();
    Object.values(this.parts).forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.parts = {};
  }

  clear() {
    this.activeOrgans = [];
    this.sync();
  }
}
