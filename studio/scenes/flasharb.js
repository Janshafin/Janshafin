import { THREE, holo, glow, TAU, LIME, toScreen } from "./common.js";
import { W, H, panelHTML, panelRig } from "./panel.js";

const P = {
  index: "01", kind: "DeFi · MEV", name: "flasharb", seed: 21, event: "ETHGlobal Mumbai 2026",
  blurb: "Atomic flash arbitrage between Uniswap v4 and 1inch Aqua. It borrows through v4 flash accounting, trades against an Aqua strategy priced by SwapVM, and keeps the spread, all inside one <span class='mono' style='color:var(--text)'>unlock</span>.",
  invariant: "ΣΔ = 0 &nbsp;<span class='dim'>or the whole trade reverts</span>",
  stack: ["Solidity", "Huff", "Uniswap v4", "1inch Aqua", "Foundry"],
  status: "End-to-end on a local chain",
};
const STEPS = ["swap v4", "SwapVM", "take · push", "settle"];

export default {
  w: W, h: H, frames: 72, fps: 24,
  html: panelHTML(P) + `<div id="steps" style="position:absolute;right:60px;bottom:52px;display:flex;gap:6px"></div>`,

  async setup(ctx) {
    const r = panelRig(ctx, P, [[0.74, 0.45, 0.14, "#c8ff5a", 0.3], [0.86, 0.6, 0.12, "#6be7ff", 0.28]]);
    const { scene, camera, render } = r;
    const g = new THREE.Group();
    g.position.set(r.x, 0.15, 0);
    scene.add(g);

    // two pools, interlocked like chain links
    const ringGeo = new THREE.TorusGeometry(1.0, 0.11, 32, 160);
    const a = new THREE.Mesh(ringGeo, holo({ flatShading: false, roughness: 0.16, color: 0xc4cad3 }));
    const b = new THREE.Mesh(ringGeo, holo({ flatShading: false, roughness: 0.16, color: 0xaab1bc }));
    a.position.x = -0.62; b.position.x = 0.62;
    a.rotation.y = 0.35; b.rotation.set(Math.PI / 2, 0, 0.35);
    g.add(a, b);

    // the borrowed delta: a figure-eight through both pools, with a fading trail
    const path = (s) => new THREE.Vector3(1.25 * Math.sin(s), 0.62 * Math.sin(2 * s) * 0.9, 0.55 * Math.cos(s));
    const token = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), glow(LIME, 4));
    g.add(token);
    const TRAIL = 26, trail = [];
    for (let i = 0; i < TRAIL; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 * (1 - i / TRAIL) + 0.012, 12, 8),
        new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.55 * (1 - i / TRAIL) }));
      g.add(m); trail.push(m);
    }
    const curve = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 200 }, (_, i) => path((i / 199) * TAU))),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }));
    g.add(curve);

    // labels under each pool
    const lab = (txt, v) => {
      const [x, y] = toScreen(camera, v, W, H);
      const el = document.createElement("div");
      el.className = "label";
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translateX(-50%);font-size:11px;white-space:nowrap`;
      el.textContent = txt;
      ctx.ui.appendChild(el);
    };
    lab("v4 PoolManager", new THREE.Vector3(r.x - 0.75, -1.12, 0));
    lab("Aqua · SwapVM", new THREE.Vector3(r.x + 0.85, -1.12, 0));

    const stepsEl = document.getElementById("steps");
    stepsEl.innerHTML = STEPS.map((s, i) => `<span class="chip" data-i="${i}" style="height:26px;font-size:11px">${i + 1}&nbsp;&nbsp;${s}</span>`).join("");
    const chips = [...stepsEl.children];

    return {
      frame(t) {
        g.rotation.y = 0.28 * Math.sin(TAU * t) - 0.2;
        g.rotation.x = 0.12 * Math.cos(TAU * t);
        const s = TAU * t;
        token.position.copy(path(s));
        trail.forEach((m, i) => m.position.copy(path(s - (i + 1) * 0.045)));
        const k = Math.floor(t * 4) % 4;
        chips.forEach((c, i) => {
          const on = i === k;
          c.style.color = on ? "#0A0B0D" : "";
          c.style.background = on ? "var(--lime)" : "";
          c.style.boxShadow = on ? "0 0 24px rgba(200,255,90,.35)" : "";
        });
        r.drift(t);
        render();
      },
    };
  },
};
