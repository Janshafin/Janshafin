// A year of real public contributions as a 3D skyline. Regenerated daily in CI.
import { THREE, rig, backdrop, dust, TAU, LIME } from "./common.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const W = 1200, H = 520;

export default {
  w: W, h: H, frames: 96, fps: 24,
  html: `<div style="position:absolute;inset:0;padding:48px 60px;display:flex;flex-direction:column;pointer-events:none">
    <div style="display:flex;align-items:baseline;gap:14px">
      <span class="label lime">05</span><span class="label">Activity · last 53 weeks</span>
      <span class="label" id="upd" style="margin-left:auto;font-size:12px"></span>
    </div>
    <div style="margin-top:18px;font:600 44px/1 Geist;letter-spacing:-.04em" id="headline"></div>
    <div style="margin-top:10px;font:400 17px/1.4 Geist;color:var(--muted)">Every public contribution day, raised by intensity. Pulled from GitHub, redrawn daily.</div>
    <div style="margin-top:auto;display:flex;align-items:center;gap:10px" class="label" id="legend"></div>
  </div>`,

  async setup(ctx) {
    const days = ctx.data;                                    // [{date, level}] sorted
    const last = new Date(days[days.length - 1].date + "T00:00:00Z");
    const start = new Date(last); start.setUTCDate(start.getUTCDate() - 364);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());  // back to Sunday
    const level = new Map(days.map((d) => [d.date, d.level]));
    const weeks = Math.floor((last - start) / 864e5 / 7) + 1;
    let active = 0, total = 0;

    const { scene, camera, render } = rig({ ...ctx, cam: [0, 7.5, 13], look: [1.2, -0.6, 0], fov: 28,
      bloom: { strength: 0.32, radius: 0.4, threshold: 0.96 } });
    backdrop(scene, [[0.6, 0.55, 0.22, "#c8ff5a", 0.06], [0.85, 0.4, 0.16, "#6be7ff", 0.06]], { z: -12, size: 60 });
    const drift = dust(scene, 140, [26, 6, 10], 99);

    const city = new THREE.Group();
    city.position.set(1.4, -1.6, 0.6);
    scene.add(city);
    const P = 0.26, S = 0.21;
    const geo = new RoundedBoxGeometry(S, 1, S, 2, 0.03).translate(0, 0.5, 0);
    const mats = [
      new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.6, metalness: 0.3 }),
      ...[0.1, 0.22, 0.45, 0.85].map((k, i) => new THREE.MeshPhysicalMaterial({
        color: 0x161a12, metalness: 0.6, roughness: 0.25, emissive: LIME, emissiveIntensity: k,
        iridescence: 0.4, clearcoat: 1 })),
    ];
    const heights = [0.05, 0.35, 0.7, 1.15, 1.7];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const day = new Date(start); day.setUTCDate(start.getUTCDate() + w * 7 + d);
        if (day > last) continue;
        const key = day.toISOString().slice(0, 10);
        const lv = level.get(key) ?? 0;
        total++; if (lv > 0) active++;
        const m = new THREE.Mesh(geo, mats[lv]);
        m.scale.y = heights[lv];
        m.position.set((w - weeks / 2) * P, 0, (d - 3) * P);
        city.add(m);
      }
    }
    // a thin plinth under the grid
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(weeks * P + 0.3, 0.06, 7 * P + 0.3, 2, 0.03),
      new THREE.MeshPhysicalMaterial({ color: 0x111317, roughness: 0.4, metalness: 0.5 }));
    plinth.position.y = -0.04;
    city.add(plinth);
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-4, 8, 6); scene.add(key);

    ctx.ui.querySelector("#headline").innerHTML =
      `${active} active days <span class="serif" style="font-size:44px;color:var(--muted)">out of ${total}</span>`;
    ctx.ui.querySelector("#upd").textContent = `Updated ${last.toISOString().slice(0, 10)}`;
    ctx.ui.querySelector("#legend").innerHTML = `Less ${[0, 1, 2, 3, 4].map((l) =>
      `<span style="display:inline-block;width:14px;height:${6 + l * 4}px;border-radius:3px;background:${l ? `rgba(200,255,90,${0.2 + l * 0.2})` : "#1a1d22"};box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)"></span>`).join("")} More`;

    return {
      frame(t) {
        city.rotation.y = -0.38 + 0.12 * Math.sin(TAU * t);
        city.rotation.x = 0.04 * Math.cos(TAU * t);
        drift(t);
        render();
      },
    };
  },
};
