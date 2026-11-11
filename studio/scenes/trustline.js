import { THREE, glass, glow, edges, TAU, LIME, AMBER, toScreen } from "./common.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { W, H, panelHTML, panelRig } from "./panel.js";

const P = {
  index: "02", kind: "Privacy · Agent payments", name: "TrustLine", seed: 37, flip: true, event: "ETHOnline 2026",
  blurb: "A private solvency check for agent-to-agent payments. A Chainlink CRE confidential workflow compares balance and price inside an enclave and publishes a single bit; a Privy policy wallet pays only on <span class='mono' style='color:var(--text)'>SETTLE</span>.",
  invariant: "out ∈ {SETTLE, INSUFFICIENT}",
  stack: ["Solidity", "TypeScript", "Chainlink CRE", "Privy", "x402"],
  status: "CRE runs in local simulation", statusTone: "amber",
};

export default {
  w: W, h: H, frames: 72, fps: 24,
  html: panelHTML(P),

  async setup(ctx) {
    const r = panelRig(ctx, P, [[0.72, 0.46, 0.14, "#ffb547", 0.26], [0.8, 0.62, 0.12, "#6be7ff", 0.26]]);
    const { scene, camera, render } = r;
    const g = new THREE.Group();
    g.position.set(r.x + 0.2, 0.2, 0);
    scene.add(g);

    // the enclave: frosted glass, a private core you can sense but not read
    const box = new THREE.Group();
    box.rotation.x = 0.5;
    g.add(box);
    const shell = new THREE.Mesh(new RoundedBoxGeometry(2.1, 2.1, 2.1, 6, 0.16),
      glass({ roughness: 0.42, thickness: 2.4, iridescence: 0.35, flatShading: false }));
    edges(shell, 0xffffff, 0.18);
    box.add(shell);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), glow(AMBER, 2.6));
    g.add(core);

    // inputs drift in from the far side and vanish inside
    const IN = 7, inputs = [];
    for (let i = 0; i < IN; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      g.add(m); inputs.push(m);
    }

    // the only output: one bit, travelling out along a rail
    const out = new THREE.Vector3(1.45, -1.75, 0.5);
    const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.7, -0.8, 0.4), out]),
      new THREE.LineBasicMaterial({ color: LIME, transparent: true, opacity: 0.4 }));
    g.add(rail);
    const bit = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), glow(LIME, 4));
    g.add(bit);

    const [ox, oy] = toScreen(camera, out.clone().add(g.position), W, H);
    const tag = document.createElement("div");
    tag.style.cssText = `position:absolute;left:${ox}px;top:${oy + 14}px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;white-space:nowrap`;
    tag.innerHTML = `<span class="chip" id="settle" style="height:28px;font-size:12px">SETTLE</span>
                     <span class="label dim" style="font-size:11px">only output</span>`;
    ctx.ui.appendChild(tag);
    const settle = document.getElementById("settle");

    return {
      frame(t) {
        box.rotation.y = (TAU / 4) * t;                       // a cube loops on a quarter turn
        core.rotation.set(TAU * t, TAU * t * 2, 0);
        core.material.emissiveIntensity = 2.2 + 0.8 * Math.sin(TAU * t);
        inputs.forEach((m, i) => {
          const u = (t + i / IN) % 1;                          // staggered, each on its own lane
          const lane = (i / IN - 0.5) * 1.6;
          m.position.set(-3.2 + u * 3.2, lane * (1 - u), -0.6 + u * 0.6);
          m.rotation.set(u * 4, u * 3, 0);
          m.material.opacity = u < 0.15 ? u / 0.15 : u > 0.75 ? Math.max(0, (1 - u) / 0.25) : 1;
          m.material.opacity *= 0.7;
        });
        const u = (t * 2) % 1;                                 // the bit leaves twice per loop
        bit.position.lerpVectors(new THREE.Vector3(0.7, -0.8, 0.4), out, u);
        bit.material.emissiveIntensity = u > 0.92 ? 7 : 4;
        const hit = u > 0.82;
        settle.style.background = hit ? "var(--lime)" : "";
        settle.style.color = hit ? "#0A0B0D" : "";
        settle.style.boxShadow = hit ? "0 0 28px rgba(200,255,90,.45)" : "";
        r.drift(t);
        render();
      },
    };
  },
};
