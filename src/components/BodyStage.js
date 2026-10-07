/**
 * One shared 3D torso for the constellation.
 * Drawn over the map, under the chrome. Pan and zoom stay on the 2D canvas.
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
  col += uRim * fres * 0.85;
  col += vec3(1.0, 0.96, 0.9) * spec * 0.16;
  col += uColor * uGlow;
  gl_FragColor = vec4(col, uOpacity);
}
`;

const LOOK = {
  ribs: { color: '#145e68', rim: '#37d6e8', glow: 0.05, role: 'ribs' },
  heart: { color: '#e23b3b', rim: '#ffb0a4', glow: 0.14, role: 'heart' },
  aorta: { color: '#d83232', rim: '#ffc9c0', glow: 0.18, role: 'heart' },
  ivc: { color: '#3b7de2', rim: '#c9ddff', glow: 0.1, role: 'vessel' },
  artery: { color: '#e23b3b', rim: '#ffd0c8', glow: 0.14, role: 'liver' },
  hepatic: { color: '#3b7de2', rim: '#d7e6ff', glow: 0.12, role: 'liver' },
  liver: { color: '#e8a317', rim: '#f0d48a', glow: 0.28, role: 'liver' }
};

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

let shared = null;

export function getBodyStage() {
  if (!shared) shared = new BodyStage();
  return shared;
}

class BodyStage {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.title = 'BodyParts3D, Database Center for Life Science, CC BY 4.0';
    this.parts = {};
    this.yaw = -0.5;
    this.ready = false;
    this.layers = { base: 1, skeleton: 0, muscles: 0, organs: 1 };
    this.highlights = new Set();
    this.negative = false;
    this.explode = 0;
    this._last = performance.now();
    this._load();
  }

  setState({ layers, highlights, negative, explode }) {
    if (layers) this.layers = layers;
    this.highlights = highlights instanceof Set ? highlights : new Set(highlights || []);
    this.negative = !!negative;
    this.explode = explode || 0;
  }

  async _load() {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${base}assets/body/camera/torso.bin?v=2`);
      if (!response.ok) return;
      const data = parseTorso(await response.arrayBuffer());
      this._build(data);
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
    this.group = new Group();
    this.scene.add(this.group);
    const dist = data.radius / Math.sin((14 * Math.PI) / 180);
    this.camera = new PerspectiveCamera(28, 1, data.radius * 0.02, dist * 4);
    this.camera.position.set(0, data.radius * 0.16, dist * 0.62);
    data.groups.forEach((group) => {
      const look = LOOK[group.name];
      if (!look) return;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(group.pos, 3));
      geo.setAttribute('normal', new BufferAttribute(group.nrm, 3));
      geo.setIndex(new BufferAttribute(group.idx, 1));
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
        depthWrite: look.role !== 'ribs',
        side: DoubleSide,
        toneMapped: false
      });
      const mesh = new Mesh(geo, material);
      mesh.name = group.name;
      mesh.renderOrder = look.role === 'ribs' ? 0 : 1;
      mesh.userData.look = look;
      mesh.userData.base = new Color(look.color);
      mesh.userData.rim = new Color(look.rim);
      this.group.add(mesh);
      this.parts[group.name] = mesh;
    });
    this.ready = true;
    const loop = (now) => {
      this._tick(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w < 8 || h < 8) return false;
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pw = Math.round(w * pr);
    const ph = Math.round(h * pr);
    if (pw === this._pw && ph === this._ph) return true;
    this._pw = pw;
    this._ph = ph;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(pw, ph, false);
    this.camera.aspect = pw / ph;
    this.camera.updateProjectionMatrix();
    return true;
  }

  _tick(now) {
    if (!this.ready || !this.canvas.isConnected) return;
    if (!this._resize()) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.yaw += dt * 0.28;
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = 0.1;
    this._apply();
    this.renderer.render(this.scene, this.camera);
  }

  _apply() {
    const ribs = Math.min(1, this.layers.base * 0.5 + this.layers.skeleton * 0.95 + this.layers.muscles * 0.4);
    const organs = this.layers.organs ?? 1;
    const any = this.highlights.size > 0;
    const liverHot = this.highlights.has('liver');
    const heartHot = ['heart', 'cardiovascular', 'vascular', 'vessels', 'blood'].some((key) => this.highlights.has(key));
    const hot = new Color('#ef4444');
    const e = this.explode;
    Object.values(this.parts).forEach((mesh) => {
      const role = mesh.userData.look.role;
      const uniforms = mesh.material.uniforms;
      let opacity = role === 'ribs' ? ribs * 0.9 : organs;
      let glow = mesh.userData.look.glow;
      let lit = false;
      if (role === 'liver') lit = liverHot;
      if (role === 'heart') lit = heartHot;
      if (role === 'vessel') lit = liverHot || heartHot;
      if (any && role !== 'ribs' && !lit) opacity *= 0.22;
      if (lit) {
        glow = 0.85;
        if (this.negative) uniforms.uColor.value.copy(hot);
        else uniforms.uColor.value.copy(mesh.userData.base);
      } else {
        uniforms.uColor.value.copy(mesh.userData.base);
      }
      uniforms.uGlow.value = glow;
      uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.03;
    });
    const liver = this.parts.liver;
    const heart = this.parts.heart;
    if (liver) liver.position.set(-e * 58, -e * 8, e * 24);
    if (heart) heart.position.set(e * 50, e * 34, e * 18);
    if (this.parts.aorta && heart) this.parts.aorta.position.copy(heart.position);
  }
}
