import { THREE, rig, backdrop, glass, chrome, edges, dust, floor, ethCrystal, TAU, LIME } from "./common.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export default {
  w: 1200, h: 640, frames: 96, fps: 24,
  html: `
  <div class="scrim-left"></div>
  <div style="position:absolute;inset:0;padding:48px 60px;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:14px">
      <span class="mark">JS</span>
      <span class="label" style="color:var(--text);letter-spacing:.12em">Jan Shafin</span>
      <span class="label" style="margin-left:auto">github.com/Janshafin</span>
    </div>
    <div style="margin-top:96px" class="label"><span class="dot"></span>&nbsp;&nbsp;Onchain systems · AI agents</div>
    <h1 style="margin-top:22px;font:600 112px/0.92 Geist;letter-spacing:-.055em">Jan Shafin</h1>
    <p style="margin-top:26px;max-width:540px;font:400 25px/1.32 Geist;letter-spacing:-.015em;color:var(--muted)">
      I build Ethereum systems where autonomous agents can act&nbsp;—
      <span class="serif" style="color:var(--text);font-size:31px">and can’t cheat.</span></p>
    <div class="chips" style="margin-top:30px">
      <span class="chip">Solidity</span><span class="chip">TypeScript</span><span class="chip">Python</span>
      <span class="chip">Foundry</span><span class="chip">Uniswap v4</span>
    </div>
    <div class="label" style="margin-top:auto;font-size:12px;color:var(--dim)">
      Four hackathon builds in 2026 &nbsp;/&nbsp; ETHGlobal Mumbai · ETHOnline · DoraHacks · PayPal AI
    </div>
  </div>`,

  async setup(ctx) {
    const { scene, camera, render } = rig({ ...ctx, cam: [0, 0.35, 10.5], bloom: { strength: 0.45, radius: 0.5, threshold: 0.92 } });
    backdrop(scene, [[0.7, 0.42, 0.13, "#c8ff5a", 0.32], [0.78, 0.6, 0.12, "#6be7ff", 0.3],
                     [0.64, 0.62, 0.09, "#ff8a3d", 0.18]]);
    floor(scene, -2.75, 0.06);
    const drift = dust(scene, 220, [12, 6, 6], 11);

    const hero = new THREE.Group();
    hero.position.set(2.7, -0.05, 0);
    scene.add(hero);

    const crystal = ethCrystal();
    crystal.position.y = 0.05;
    hero.add(crystal);

    // Orbit: a chrome ring with eight glass blocks chained along it.
    const tilt = new THREE.Group();
    tilt.rotation.set(1.18, 0, -0.32);
    hero.add(tilt);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 16, 240), chrome({ roughness: 0.35, color: 0x9aa0a9 }));
    tilt.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.005, 8, 240),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }));
    tilt.add(ring2);

    const N = 8, R = 2.1, HEAD = -1.75;
    const blockGeo = new RoundedBoxGeometry(0.34, 0.34, 0.34, 3, 0.05);
    const blocks = [];
    for (let i = 0; i < N; i++) {
      const b = new THREE.Mesh(blockGeo, glass({ thickness: 0.4, flatShading: false, iridescence: 0.6, emissive: LIME, emissiveIntensity: 0 }));
      edges(b, 0xffffff, 0.25);
      tilt.add(b);
      blocks.push(b);
    }
    const linkGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: N + 1 }, () => new THREE.Vector3()));
    const links = new THREE.Line(linkGeo, new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.35 }));
    tilt.add(links);

    const key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0x6be7ff, 30, 12);
    rim.position.set(5.5, 1.5, -1);
    scene.add(rim);
    const warm = new THREE.PointLight(0xc8ff5a, 18, 10);
    warm.position.set(0.5, -1.5, 3);
    scene.add(warm);

    return {
      frame(t) {
        crystal.rotation.y = (TAU / 4) * t + 0.35;          // four-fold symmetry: a quarter turn loops
        crystal.position.y = 0.05 + Math.sin(TAU * t) * 0.09;
        const pts = linkGeo.attributes.position;
        for (let i = 0; i < N; i++) {
          const a = (TAU / N) * (i + t) + 0.6;                // one block-length per loop
          blocks[i].position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
          blocks[i].rotation.set(a * 0.5, a, 0);
          // a block "confirms" as it passes the front of the orbit
          const d = Math.atan2(Math.sin(a - HEAD), Math.cos(a - HEAD));
          blocks[i].material.emissiveIntensity = 2.4 * Math.exp(-(d * d) / 0.12);
          pts.setXYZ(i, Math.cos(a) * R, Math.sin(a) * R, 0);
        }
        pts.setXYZ(N, pts.getX(0), pts.getY(0), 0);
        pts.needsUpdate = true;
        drift(t);
        render();
      },
    };
  },
};
