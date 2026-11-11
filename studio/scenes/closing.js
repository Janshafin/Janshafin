import { THREE, rig, backdrop, ethCrystal, dust } from "./common.js";

const W = 1200, H = 340;

export default {
  w: W, h: H, frames: 1,
  html: `<div class="scrim-left"></div>
  <div style="position:absolute;inset:0;padding:48px 60px;display:flex;flex-direction:column">
    <span class="label"><span class="dot"></span>&nbsp;&nbsp;Open to collaborate</span>
    <h2 style="margin-top:20px;font:600 52px/1.02 Geist;letter-spacing:-.045em;max-width:720px">
      Let’s build something <span class="serif" style="font-size:60px;letter-spacing:-.02em">verifiable.</span></h2>
    <div style="margin-top:auto;display:flex;gap:12px;align-items:center">
      <span class="btn">See all repositories&nbsp;&nbsp;→</span>
      <span class="btn ghost">Start with an issue</span>
      <span class="label dim" style="margin-left:14px;font-size:12px">github.com/Janshafin</span>
    </div>
  </div>`,

  async setup(ctx) {
    const { scene, render } = rig({ ...ctx, cam: [0, 0.2, 10], bloom: { strength: 0.45, radius: 0.5, threshold: 0.9 } });
    backdrop(scene, [[0.8, 0.5, 0.14, "#c8ff5a", 0.28], [0.9, 0.4, 0.1, "#6be7ff", 0.24]]);
    const drift = dust(scene, 120, [14, 4, 4], 3);
    const c = ethCrystal(0.72);
    c.position.set(4.4, -0.35, 0);
    c.rotation.set(0.05, 0.35, 0.05);
    scene.add(c);
    const key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.PointLight(0x6be7ff, 30, 12); rim.position.set(7, 1.5, -1); scene.add(rim);
    const warm = new THREE.PointLight(0xc8ff5a, 18, 10); warm.position.set(3, -1.5, 3); scene.add(warm);
    return { frame(t) { drift(t); render(); } };
  },
};
