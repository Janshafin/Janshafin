// Shared rig for every plate: physically based renderer, studio environment,
// a soft coloured backdrop for glass to refract, bloom and SMAA.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export { THREE };
export const BG = 0x0a0b0d;
export const LIME = 0xc8ff5a;
export const CYAN = 0x6be7ff;
export const AMBER = 0xffb547;
export const TAU = Math.PI * 2;

export function rig({ canvas, w, h, dpr, fov = 30, cam = [0, 0.4, 10], look = [0, 0, 0],
                      bloom = { strength: 0.5, radius: 0.55, threshold: 0.82 }, env = 1 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = env === "room" ? new RoomEnvironment() : lightbox();
  scene.environment = pmrem.fromScene(room, 0.03).texture;
  scene.environmentIntensity = env === "room" ? 1 : 1;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
  camera.position.set(...cam);
  camera.lookAt(...look);

  const target = new THREE.WebGLRenderTarget(w * dpr, h * dpr, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), bloom.strength, bloom.radius, bloom.threshold));
  composer.addPass(new SMAAPass());
  composer.addPass(new OutputPass());

  return { renderer, scene, camera, render: () => composer.render() };
}

/** A dark product-photo studio: black walls and a few softboxes, so chrome has contrast. */
function lightbox() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x050607, side: THREE.BackSide })));
  const panel = (w, h, color, k, pos, look = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  panel(8, 3, 0xffffff, 2.4, [0, 9, 3]);            // overhead key
  panel(2, 10, 0xffffff, 1.8, [-9, 1, 4]);        // left strip
  panel(1.2, 10, 0xc8ff5a, 4.5, [9, 0, -2]);      // lime kicker
  panel(10, 1.2, 0x6be7ff, 3.5, [2, -7, -6]);     // cyan floor bounce
  panel(3, 3, 0xff8a3d, 1.6, [-6, -3, -8]);       // warm back fill
  return s;
}

/** A large, dim plane of coloured light behind the subject: glass needs something to bend. */
export function backdrop(scene, blobs, { z = -7, size = 34, base = "#0a0b0d" } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 1024);
  for (const [x, y, r, color, a] of blobs) {
    const grad = g.createRadialGradient(x * 1024, y * 1024, 0, x * 1024, y * 1024, r * 1024);
    grad.addColorStop(0, hexA(color, a));
    grad.addColorStop(1, hexA(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 1024);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.6),
    new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  plane.position.z = z;
  scene.add(plane);
  return plane;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export const glass = (o = {}) => new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 1.4, ior: 1.65,
  iridescence: 1, iridescenceIOR: 1.32, iridescenceThicknessRange: [180, 820],
  clearcoat: 1, clearcoatRoughness: 0.04, dispersion: 2.5, flatShading: true, ...o,
});

export const chrome = (o = {}) => new THREE.MeshPhysicalMaterial({
  color: 0xdfe3ea, metalness: 1, roughness: 0.16, clearcoat: 0.6, ...o,
});

export const glow = (color = LIME, intensity = 3) => new THREE.MeshStandardMaterial({
  color: 0x000000, emissive: color, emissiveIntensity: intensity,
});

export function edges(mesh, color = 0xffffff, opacity = 0.35) {
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 1),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(line);
  return line;
}

/** Dust that drifts on closed orbits, so every loop is seamless. */
export function dust(scene, n = 260, spread = [9, 5, 5], seed = 7, color = 0xffffff) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const base = new Float32Array(n * 3), phase = new Float32Array(n), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base[i * 3] = (rnd() - 0.5) * spread[0];
    base[i * 3 + 1] = (rnd() - 0.5) * spread[1];
    base[i * 3 + 2] = (rnd() - 0.5) * spread[2];
    phase[i] = rnd() * TAU;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(pts);
  return (t) => {
    for (let i = 0; i < n; i++) {
      const a = TAU * t + phase[i];
      pos[i * 3] = base[i * 3] + Math.cos(a) * 0.12;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(a) * 0.18;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.sin(a + 1.3) * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

/** Faint perspective floor grid, fading into fog. */
export function floor(scene, y = -2.6, opacity = 0.07) {
  const grid = new THREE.GridHelper(40, 60, 0xffffff, 0xffffff);
  grid.material.transparent = true;
  grid.material.opacity = opacity;
  grid.position.y = y;
  scene.add(grid);
  scene.fog = new THREE.Fog(BG, 9, 22);
  return grid;
}

/** Holographic chrome: mirror facets with a thin-film shimmer. */
export const holo = (o = {}) => new THREE.MeshPhysicalMaterial({
  color: 0x8c929c, metalness: 1, roughness: 0.22, flatShading: true, iridescence: 1, iridescenceIOR: 1.9,
  iridescenceThicknessRange: [120, 950], clearcoat: 1, clearcoatRoughness: 0.08, ...o,
});

/** The Ethereum crystal: a tall upper pyramid over a short lower one, split by a hairline gap. */
export function ethCrystal(scale = 1) {
  const g = new THREE.Group();
  const m = holo();
  const upper = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 4, 1).translate(0, 1.0, 0), m);
  const lower = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.15, 4, 1).rotateX(Math.PI).translate(0, -0.575 - 0.16, 0), m);
  for (const part of [upper, lower]) { edges(part, 0xffffff, 0.28); g.add(part); }
  g.scale.setScalar(scale);
  return g;
}

/** Project a world point to card pixels, for placing HTML labels next to 3D parts. */
export function toScreen(camera, v, w, h) {
  const p = v.clone().project(camera);
  return [(p.x * 0.5 + 0.5) * w, (-p.y * 0.5 + 0.5) * h];
}

export const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
