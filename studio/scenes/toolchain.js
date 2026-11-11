// The toolchain, as a designed card with real marks (Simple Icons, CC0) — no badge wall.
const W = 1200, H = 360;
const icon = (slug) => `<img src="/node_modules/simple-icons/icons/${slug}.svg" style="width:22px;height:22px;filter:invert(94%)">`;
const mono = (txt) => `<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#F3F4F6;color:#0A0B0D;font:700 10px/1 'Geist Mono'">${txt}</span>`;

const GROUPS = [
  ["Onchain", [["ethereum", "Ethereum"], ["solidity", "Solidity"], [mono("Fo"), "Foundry"], [mono("v4"), "Uniswap v4"], ["chainlink", "Chainlink CRE"], [mono("Hf"), "Huff"]]],
  ["Product", [["typescript", "TypeScript"], ["react", "React"], ["nodedotjs", "Node.js"], ["vite", "Vite"], ["python", "Python"], ["fastapi", "FastAPI"]]],
  ["Agents", [["anthropic", "Claude"], [mono("MCP"), "MCP"], [mono("x4"), "x402"], ["githubactions", "Actions"]]],
];

export default {
  w: W, h: H, frames: 1,
  classes: ["toolchain"],
  html: `<div style="position:absolute;inset:0;padding:44px 60px;
           background:radial-gradient(120% 140% at 100% 0%, rgba(200,255,90,.06), transparent 50%)">
    <div style="display:flex;align-items:baseline;gap:14px">
      <span class="label lime">06</span><span class="label">Toolchain</span>
      <span class="label dim" style="margin-left:auto;font-size:12px">what the projects above are actually built with</span>
    </div>
    <div style="margin-top:30px;display:grid;grid-template-columns:120px 1fr;row-gap:18px;align-items:center">
      ${GROUPS.map(([name, items]) => `
        <div class="label" style="font-size:12px">${name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${items.map(([ic, label]) => `
            <div style="display:flex;align-items:center;gap:10px;height:52px;padding:0 18px 0 14px;border-radius:14px;
                        background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
                        box-shadow:inset 0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.06)">
              ${ic.startsWith("<") ? ic : icon(ic)}
              <span style="font:500 16px/1 Geist;letter-spacing:-.01em">${label}</span>
            </div>`).join("")}
        </div>`).join("")}
    </div>
  </div>`,
};
