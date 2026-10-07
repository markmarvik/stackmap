/**
 * Full body for the constellation, drawn in the map plane.
 * Orthographic, so the figure is not cropped by a perspective camera.
 * Nodes are painted after this image, so they are not covered.
 *
 * BodyParts3D release 4.0, © The Database Center for Life Science, CC BY 4.0.
 * Same source set as Z-Anatomy.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  OrthographicCamera,
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
varying vec3 vN;
varying vec3 vP;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vP);
  vec3 keyL = normalize(vec3(0.25, 0.55, 0.85));
  float key = clamp(dot(n, keyL) * 0.65 + 0.35, 0.0, 1.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.1);
  vec3 col = uColor * key;
  col += uRim * fres * 0.55;
  col += uColor * uGlow;
  gl_FragColor = vec4(col, uOpacity);
}
`;

/** Exploded slots in map space. +x right, +y down. Clear of the body. */
const SLOT = {
  brain:    { x: -46,  y: -292 },
  eyes:     { x: 128,  y: -268 },
  teeth:    { x: 178,  y: -246 },
  tongue:   { x: 128,  y: -228 },
  thyroid:  { x: 168,  y: -198 },
  nerves:   { x: 214,  y: -210 },
  lungs:    { x: -158, y: -78 },
  heart:    { x: 164,  y: -118 },
  stomach:  { x: 170,  y: -60 },
  spleen:   { x: 222,  y: -26 },
  pancreas: { x: 170,  y: 10 },
  adrenals: { x: 178,  y: 50 },
  kidneys:  { x: 152,  y: 104 },
  liver:    { x: -160, y: 10 },
  gut:      { x: -164, y: 112 },
  bladder:  { x: -148, y: 180 }
};

const SLOT_ORDER = Object.keys(SLOT);

function easeOutBack(t) {
  const c1 = 0.7;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

const LOOK = {
  muscles: { color: '#c98474', rim: '#f0c2b4', glow: 0.02, order: 0, role: 'muscles' },
  bones: { color: '#d5dde4', rim: '#ffffff', glow: 0.04, order: 1, role: 'bones' },
  nerves: { color: '#e6c85a', rim: '#fff1b0', glow: 0.08, order: 2, role: 'organ', keys: ['nerves'] },
  brain: { color: '#e7b7c4', rim: '#ffd5e0', glow: 0.08, order: 3, role: 'organ', keys: ['brain', 'sleep', 'mind'] },
  lungs: { color: '#e08b96', rim: '#ffd0d4', glow: 0.06, order: 3, role: 'organ', keys: ['lungs', 'airway', 'respiratory', 'breath', 'pleura'] },
  gut: { color: '#e0a15c', rim: '#ffd7a8', glow: 0.05, order: 3, role: 'organ', keys: ['gut', 'colon'] },
  liver: { color: '#e8a317', rim: '#ffe0a0', glow: 0.1, order: 4, role: 'organ', keys: ['liver'] },
  stomach: { color: '#d7a36a', rim: '#ffe0bf', glow: 0.06, order: 4, role: 'organ', keys: ['stomach'] },
  kidneys: { color: '#c45c4e', rim: '#ffc2b8', glow: 0.06, order: 4, role: 'organ', keys: ['kidney', 'kidneys'] },
  spleen: { color: '#8d3c48', rim: '#e7a8b0', glow: 0.05, order: 4, role: 'organ', keys: ['immune'] },
  pancreas: { color: '#e6c36a', rim: '#fff0c2', glow: 0.06, order: 5, role: 'organ', keys: ['pancreas', 'metabolic', 'metabolism', 'blood-sugar'] },
  adrenals: { color: '#e8b45a', rim: '#ffe3a8', glow: 0.08, order: 5, role: 'organ', keys: ['adrenal', 'adrenals'] },
  bladder: { color: '#d2bc74', rim: '#fff0c0', glow: 0.04, order: 4, role: 'organ', keys: ['bladder'] },
  glands: { color: '#e7b4cc', rim: '#ffd6e6', glow: 0.06, order: 5, role: 'organ', keys: ['prostate', 'repro', 'ovaries', 'endocrine', 'hormone', 'hormones'] },
  heart: { color: '#e23b3b', rim: '#ffb0a8', glow: 0.12, order: 6, role: 'organ', keys: ['heart', 'cardiovascular', 'vascular', 'vessels', 'blood'] },
  vessels: { color: '#c53636', rim: '#ffc4bc', glow: 0.08, order: 6, role: 'organ', keys: ['heart', 'vascular', 'vessels', 'blood'] },
  thyroid: { color: '#e89ab8', rim: '#ffd0e0', glow: 0.1, order: 7, role: 'organ', keys: ['thyroid', 'endocrine', 'hormone', 'hormones'] },
  tongue: { color: '#e07a86', rim: '#ffc8ce', glow: 0.06, order: 7, role: 'organ', keys: ['tongue', 'mouth'] },
  teeth: { color: '#f4f1e8', rim: '#ffffff', glow: 0.04, order: 8, role: 'organ', keys: ['teeth', 'mouth'] },
  eyes: { color: '#f7f8fb', rim: '#d5e4ff', glow: 0.05, order: 8, role: 'organ', keys: ['eyes', 'eye'] }
};

function parseBody(buffer) {
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

let shared = null;

export function getBodyStage() {
  if (!shared) shared = new BodyStage();
  return shared;
}

class BodyStage {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 520;
    this.canvas.height = 1100;
    this.parts = {};
    this.ready = false;
    this.layers = { base: 1, skeleton: 0, muscles: 0, organs: 1 };
    this.highlights = new Set();
    this.negative = false;
    this.explode = 0;
    this.centers = {};
    this.frame = 360;
    this.onReady = null;
    this._load();
  }

  setState({ layers, highlights, negative, explode }) {
    if (layers) this.layers = layers;
    this.highlights = highlights instanceof Set ? highlights : new Set(highlights || []);
    this.negative = !!negative;
    if (typeof explode === 'number') this.explode = explode;
  }

  async _load() {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${base}assets/body/camera/body.bin?v=3`);
      if (!response.ok) return;
      this._build(parseBody(await response.arrayBuffer()));
      this.ready = true;
      this.render();
      if (this.onReady) this.onReady();
    } catch (error) {
      console.warn('[body]', error);
    }
  }

  _build(data) {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.scene = new Scene();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    data.groups.forEach((group) => {
      const look = LOOK[group.name];
      if (!look) return;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(group.pos, 3));
      geo.setAttribute('normal', new BufferAttribute(group.nrm, 3));
      geo.setIndex(new BufferAttribute(group.idx, 1));
      const pos = group.pos;
      for (let i = 0; i < pos.length; i += 3) {
        minX = Math.min(minX, pos[i]);
        maxX = Math.max(maxX, pos[i]);
        minY = Math.min(minY, pos[i + 1]);
        maxY = Math.max(maxY, pos[i + 1]);
      }
      const material = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(look.color) },
          uRim: { value: new Color(look.rim) },
          uGlow: { value: look.glow },
          uOpacity: { value: 1 }
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: look.role !== 'muscles',
        side: DoubleSide,
        toneMapped: false
      });
      const mesh = new Mesh(geo, material);
      mesh.name = group.name;
      mesh.renderOrder = look.order;
      mesh.userData.look = look;
      mesh.userData.base = new Color(look.color);
      mesh.userData.cx = 0;
      mesh.userData.cy = 0;
      mesh.userData.hw = 0;
      mesh.userData.hh = 0;
      if (look.role === 'organ') {
        let sx = 0;
        let sy = 0;
        let n = 0;
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (let i = 0; i < pos.length; i += 3) {
          sx += pos[i];
          sy += pos[i + 1];
          x0 = Math.min(x0, pos[i]);
          x1 = Math.max(x1, pos[i]);
          y0 = Math.min(y0, pos[i + 1]);
          y1 = Math.max(y1, pos[i + 1]);
          n += 1;
        }
        mesh.userData.cx = sx / n;
        mesh.userData.cy = sy / n;
        mesh.userData.hw = (x1 - x0) / 2;
        mesh.userData.hh = (y1 - y0) / 2;
      }
      this.parts[group.name] = mesh;
    });
    const meshH = Math.max(1, maxY - minY);
    this.worldScale = (245 * 1.92) / meshH;
    this.root = new Group();
    this.root.scale.setScalar(this.worldScale);
    Object.values(this.parts).forEach((mesh) => this.root.add(mesh));
    this.scene.add(this.root);
    const frame = this.frame;
    this.camera = new OrthographicCamera(-frame, frame, frame, -frame, -4000, 4000);
    this.camera.position.set(0, 0, 2000);
    this.camera.lookAt(0, 0, 0);
    this.canvas.width = 900;
    this.canvas.height = 900;
    this.renderer.setSize(900, 900, false);
  }

  /** One shared clock. The visible tree redraws; idle ticks stay slow. */
  start(onFrame) {
    this.onFrame = onFrame;
    if (this._loop) return;
    this._loop = true;
    let last = 0;
    const tick = (now) => {
      const moving = (this.explode || 0) > 0.02;
      const min = moving ? 32 : 50;
      if (!document.hidden && now - last >= min) {
        last = now;
        this._time = now;
        if (this.onFrame) this.onFrame();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  render() {
    if (!this.ready) return;
    this._apply();
    this.renderer.render(this.scene, this.camera);
  }

  _apply() {
    const boneA = Math.min(1, (this.layers.skeleton || 0) + (this.layers.base || 0) * 0.16);
    const muscleA = Math.min(1, (this.layers.muscles || 0) + (this.layers.base || 0) * 0.26);
    const organA = this.layers.organs ?? 1;
    const any = this.highlights.size > 0;
    const hot = new Color('#ef4444');
    const progress = this.explode || 0;
    const scale = this.worldScale || 1;
    const time = (this._time || performance.now()) / 1000;
    const breath = Math.sin(time * 1.4) * 0.012 * (1 - progress);
    const beat = Math.pow(Math.max(0, Math.sin(time * 7.3)), 10);
    this.centers = {};
    Object.values(this.parts).forEach((mesh) => {
      const look = mesh.userData.look;
      const uniforms = mesh.material.uniforms;
      let opacity = look.role === 'bones' ? boneA : look.role === 'muscles' ? muscleA : organA;
      if (look.role === 'muscles') opacity *= 1 - progress * 0.28;
      const lit = (look.keys || []).some((key) => this.highlights.has(key));
      if (any && !lit && look.role === 'organ' && progress < 0.15) opacity *= 0.22;
      let glow = lit ? 0.72 : look.glow;
      if (mesh.name === 'heart') glow += beat * 0.6;
      if (mesh.name === 'lungs') glow += Math.max(0, breath) * 4;
      uniforms.uGlow.value = glow;
      if (lit && this.negative) uniforms.uColor.value.copy(hot);
      else uniforms.uColor.value.copy(mesh.userData.base);
      uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.03;
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      const breathe = look.role === 'muscles' || mesh.name === 'lungs';
      mesh.scale.set(1, breathe ? 1 + breath : 1, 1);
    });
    SLOT_ORDER.forEach((name, index) => {
      const mesh = this.parts[name];
      const slot = SLOT[name];
      if (!mesh || !slot) return;
      const delay = (index / SLOT_ORDER.length) * 0.28;
      const local = Math.min(1, Math.max(0, (progress - delay) / 0.72));
      const eased = easeOutBack(local);
      const homeX = mesh.userData.cx * scale;
      const homeY = -mesh.userData.cy * scale;
      const bob = Math.sin(time * 1.7 + index * 0.7) * 3.5 * local;
      const x = homeX + (slot.x - homeX) * eased;
      const y = homeY + (slot.y - homeY) * eased + bob;
      mesh.position.set((x - homeX) / scale, -(y - homeY) / scale, local * 60);
      const grow = name === 'eyes' || name === 'tongue' || name === 'thyroid' || name === 'teeth' || name === 'bladder' || name === 'nerves'
        ? 1 + local * 0.45
        : 1 + local * 0.04;
      const pulse = name === 'heart' ? 1 + beat * 0.07 : 1;
      mesh.scale.set(grow * pulse, grow * pulse * (name === 'lungs' ? 1 + breath : 1), 1);
      mesh.rotation.z = (slot.x < 0 ? 0.18 : -0.18) * (1 - local);
      this.centers[name] = {
        x,
        y,
        hx: mesh.userData.hw * scale * grow,
        hy: mesh.userData.hh * scale * grow
      };
    });
  }
}
