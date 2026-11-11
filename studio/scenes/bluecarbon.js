import { THREE, chrome, glow, edges, TAU, LIME, CYAN, toScreen } from "./common.js";
import { W, H, panelHTML, panelRig } from "./panel.js";

const P = {
  index: "04", kind: "Climate · Registry", name: "Blue Carbon MRV", seed: 71, flip: true, event: "Mangrove restoration",
  blurb: "Measurement, reporting and verification for mangrove restoration: geotagged field photos, Sentinel-2 NDVI change analysis and EXIF consistency checks, then a <span class='mono' style='color:var(--text)'>BlueCarbonCredit</span> record on Ethereum Sepolia.",
  invariant: "record(c) ⇒ score ≥ 75 ∧ flags = 0",
  stack: ["Python", "FastAPI", "Web3.py", "React", "Sentinel-2"],
  status: "Dev mode can mock NDVI", statusTone: "amber",
};

export default {
  w: W, h: H, frames: 96, fps: 24,
  html: panelHTML(P),

  async setup(ctx) {
    const r = panelRig(ctx, P, [[0.72, 0.5, 0.15, "#6be7ff", 0.3], [0.8, 0.36, 0.1, "#c8ff5a", 0.22]]);
    const { scene, camera, render } = r;
    const g = new THREE.Group();
    g.position.set(r.x + 0.1, 0.05, 0);
    g.rotation.z = 0.32;
    scene.add(g);

    // a low-poly earth, turned so a vertex sits on the spin axis: a 72° turn maps it onto itself
    const geo = new THREE.IcosahedronGeometry(1.45, 2);
    const axis = new THREE.Vector3(0, 1, (1 + Math.sqrt(5)) / 2).normalize();
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0)));
    const spin = new THREE.Group();
    g.add(spin);
    const earth = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0x0b2426, roughness: 0.42, metalness: 0.5, flatShading: true, clearcoat: 0.8, iridescence: 0.5 }));
    edges(earth, CYAN, 0.12);
    spin.add(earth);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.62, 48, 32), new THREE.MeshBasicMaterial({
      color: CYAN, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(atmo);

    // restoration sites: five symmetric clusters of glowing mangroves
    const tree = new THREE.IcosahedronGeometry(0.032, 1);
    let s = 9; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const local = Array.from({ length: 7 }, () => [0.25 + rnd() * 0.5, rnd() * 0.5 - 0.25]);
    for (let k = 0; k < 5; k++) {
      for (const [lat, dlon] of local) {
        const lon = (k / 5) * TAU + dlon;
        const n = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat - 0.6), Math.cos(lat) * Math.sin(lon)).normalize();
        const m = new THREE.Mesh(tree, glow(LIME, 1.6));
        m.position.copy(n.clone().multiplyScalar(1.42));
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        spin.add(m);
      }
    }

    // a satellite on a tilted orbit, with a scan cone to the ground
    const orbit = new THREE.Group();
    orbit.rotation.set(1.1, 0, -0.5);
    g.add(orbit);
    orbit.add(new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.006, 8, 200),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })));
    const sat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.4), chrome({ roughness: 0.2 }));
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.014, 0.26),
      new THREE.MeshPhysicalMaterial({ color: 0x1b2c55, metalness: 0.6, roughness: 0.25, iridescence: 1 }));
    const w1 = wing.clone(); w1.position.x = 0.56; const w2 = wing.clone(); w2.position.x = -0.56;
    sat.add(body, w1, w2);
    orbit.add(sat);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1, 32, 1, true).translate(0, -0.5, 0),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    orbit.add(beam);

    const [lx, ly] = toScreen(camera, new THREE.Vector3(g.position.x, -2.0, 0), W, H);
    const tag = document.createElement("div");
    tag.style.cssText = `position:absolute;left:${lx}px;top:${ly}px;transform:translateX(-50%);display:flex;gap:8px;white-space:nowrap`;
    tag.innerHTML = `<span class="chip" style="height:26px;font-size:11px">photo + EXIF</span>
      <span class="chip" style="height:26px;font-size:11px">Sentinel-2 NDVI</span>
      <span class="chip" id="rec" style="height:26px;font-size:11px">→ record</span>`;
    ctx.ui.appendChild(tag);
    const rec = document.getElementById("rec");

    return {
      frame(t) {
        spin.rotation.y = (TAU / 5) * t;
        const a = TAU * t;
        const R = 2.25;
        sat.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
        sat.lookAt(orbit.localToWorld(new THREE.Vector3(0, 0, 0)));
        // the scan cone points from the satellite to the planet's centre
        beam.position.copy(sat.position);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), sat.position.clone().negate().normalize());
        beam.scale.set(1, R - 1.45, 1);
        const front = Math.sin(a) < -0.2;                      // scanning the visible face
        beam.material.opacity = front ? 0.14 : 0.05;
        rec.style.background = front ? "var(--lime)" : "";
        rec.style.color = front ? "#0A0B0D" : "";
        r.drift(t);
        render();
      },
    };
  },
};
