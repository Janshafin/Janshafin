import { THREE, glass, chrome, glow, edges, TAU, LIME, AMBER, toScreen, ease } from "./common.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { W, H, panelHTML, panelRig } from "./panel.js";

const P = {
  index: "03", kind: "AI agents · Treasury", name: "Custodian", seed: 53, event: "DoraHacks Agent Economy",
  blurb: "A five-agent treasury. Language models propose; a fail-closed rules engine (caps, allowlists, cooldowns, velocity) decides; only the execution agent holds KeeperHub credentials; every stage lands in an HMAC-signed ledger.",
  invariant: "execute(i) ⇒ policy(i) = APPROVED",
  stack: ["TypeScript", "KeeperHub", "json-rules-engine", "Sepolia"],
  status: "Policy + audit live · 19 tests",
};
const LAYERS = ["Signal", "Strategist", "Policy", "Execution", "Audit"];

export default {
  w: W, h: H, frames: 96, fps: 24,
  html: panelHTML(P),

  async setup(ctx) {
    const r = panelRig(ctx, P, [[0.74, 0.5, 0.14, "#c8ff5a", 0.26], [0.84, 0.36, 0.1, "#ffb547", 0.2]]);
    const { scene, camera, render } = r;
    const g = new THREE.Group();
    g.position.set(r.x + 0.35, -0.12, 0);
    g.rotation.set(0.42, -0.62, 0);
    scene.add(g);

    const slabGeo = new RoundedBoxGeometry(2.3, 0.14, 1.7, 4, 0.05);
    const GAP = 0.62, top = 1.25;
    const slabs = LAYERS.map((name, i) => {
      let mat;
      if (i < 2) mat = glass({ roughness: 0.25, thickness: 0.3, iridescence: 0.8, flatShading: false, opacity: 0.9 });
      else if (i === 2) mat = chrome({ color: 0x23272d, roughness: 0.3, emissive: LIME, emissiveIntensity: 0.1 });
      else mat = chrome({ color: 0x9aa1ac, roughness: 0.24 });
      const m = new THREE.Mesh(slabGeo, mat);
      m.position.y = top - i * GAP;
      edges(m, i === 2 ? LIME : 0xffffff, i === 2 ? 0.9 : i < 2 ? 0.5 : 0.22);
      g.add(m);
      return m;
    });

    // proposals fall from the models; the gate decides
    const amber = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glow(AMBER, 3.5));
    const lime = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glow(LIME, 4));
    g.add(amber, lime);
    const yTop = top + 0.45, yGate = top - 2 * GAP + 0.17, yEnd = top - 4 * GAP - 0.5;

    // labels left of the stack
    const labels = LAYERS.map((name, i) => {
      const v = new THREE.Vector3(-1.25, slabs[i].position.y, 0.85).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
      const [x, y] = toScreen(camera, v, W, H);
      const el = document.createElement("div");
      el.className = "label";
      el.style.cssText = `position:absolute;left:${x - 22}px;top:${y - 8}px;transform:translateX(-100%);font-size:11px;white-space:nowrap`;
      el.innerHTML = `${name}${i < 2 ? ' <span class="dim">· model</span>' : i === 2 ? ' <span class="lime">· gate</span>' : ""}`;
      ctx.ui.appendChild(el);
      return el;
    });

    return {
      frame(t) {
        // the two model layers drift; the deterministic layers never move
        for (let i = 0; i < 2; i++) {
          slabs[i].rotation.z = 0.05 * Math.sin(TAU * t + i * 1.7);
          slabs[i].rotation.x = 0.04 * Math.cos(TAU * t * 2 + i);
          slabs[i].position.x = 0.06 * Math.sin(TAU * t + i * 2.1);
        }
        // 0.0-0.5: a proposal hits the gate and is refused; 0.5-1.0: an approved one passes through
        const a = t < 0.5 ? t / 0.5 : 1;
        amber.visible = t < 0.5;
        amber.position.y = THREE.MathUtils.lerp(yTop, yGate, ease(Math.min(1, a / 0.6)));
        amber.material.opacity = 1;
        amber.scale.setScalar(a > 0.6 ? Math.max(0.01, 1 - (a - 0.6) / 0.4) : 1);
        const b = t >= 0.5 ? (t - 0.5) / 0.5 : 0;
        lime.visible = t >= 0.5;
        lime.position.y = THREE.MathUtils.lerp(yTop, yEnd, ease(b));
        lime.scale.setScalar(b > 0.85 ? Math.max(0.01, (1 - b) / 0.15) : 1);
        const gate = slabs[2].material;
        const refuse = t < 0.5 && a > 0.55 && a < 0.85;
        gate.emissive.set(refuse ? AMBER : LIME);
        gate.emissiveIntensity = refuse ? 0.55 : t >= 0.5 && Math.abs(lime.position.y - yGate) < 0.25 ? 0.6 : 0.1;
        labels[2].style.color = refuse ? "var(--amber)" : "";
        r.drift(t);
        render();
      },
    };
  },
};
