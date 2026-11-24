// Closing plate: the same tower from far out on the water, and the toolchain set as a short list.
import { shaderPlate } from "./gl.js";
import { FRAG as HERO } from "./hero.js";

const FRAG = HERO.replace(
  "vec3 ro = vec3(-.2, 1.15, 8.6), ta = vec3(.7, 1.95, 0.);",
  "vec3 ro = vec3(-9.5, 1.6, 15.5), ta = vec3(-2.2, 1.3, 0.);");

const rows = [
  ["Onchain", "Ethereum, Solidity, Foundry, Uniswap v4, Chainlink CRE, Huff"],
  ["Product", "TypeScript, React, Node.js, Vite, Python, FastAPI"],
  ["Agents", "Claude, MCP, x402, GitHub Actions"],
].map(([k, v]) => `<div style="display:grid;grid-template-columns:96px 1fr;gap:16px;padding:10px 0;border-top:1px solid rgba(241,236,246,.12)">
  <span class="small" style="color:rgba(241,236,246,.52)">${k}</span><span class="small" style="color:rgba(241,236,246,.88)">${v}</span></div>`).join("");

export default {
  w: 1200, h: 460, frames: 1,
  html: `
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,11,28,.7) 0%,rgba(14,11,28,.35) 45%,rgba(14,11,28,0) 70%)"></div>
  <div style="position:absolute;left:64px;top:54px;bottom:50px;width:520px;display:flex;flex-direction:column">
    <h2 class="display" style="font-size:66px">Let’s build something verifiable.</h2>
    <div style="margin-top:auto">${rows}</div>
  </div>
  <div class="small" style="position:absolute;right:56px;bottom:50px;color:rgba(241,236,246,.7)">See all repositories on GitHub</div>`,
  async setup(ctx) { return shaderPlate({ ...ctx, frag: FRAG }); },
};
