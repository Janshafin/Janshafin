// Closing: a huge puffy "gm." that hops hello, one small figurine cameo as the signature, and the
// contact details and toolchain as traits.
import { minted } from "./minted.js";
import { layout, quat, TAU } from "./type3d.js";

export default minted({
  w: 1200, h: 640, frames: 72, repo: "Janshafin", index: "Closing",
  palettes: ["Bubblegum", "Ultraviolet", "Acid"], materials: ["Pearl", "Candy"],
  candy: [.95, .3, .08],
  chars: "gm.", R: .2, cell: 1.6,
  cam: { ro: [0, 2.3, 12.5], ta: [0, 2.0, 0], zoom: 2.2 },
  lede: "Let’s build something verifiable. Open to teams, hackathons and onchain agent work.",
  traits: ({ pal, sha }) => [
    ["Email", "janshafin09@gmail.com"], ["Phone", "+91 63690 56143"], ["Portfolio", "janshafin.github.io/My_Portfolio"],
    ["Onchain", "Solidity, Foundry, Uniswap v4, Chainlink CRE"], ["Product", "TypeScript, React, Python, FastAPI"],
    ["Agents", "Claude, MCP, x402"], ["Seed", sha],
  ],
  overlay: (pal) => `
    <div style="position:absolute;left:944px;top:372px;width:120px;height:18px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),rgba(0,0,0,0))"></div>
    <img id="cameo" src="/models/me-blue.webp" style="position:absolute;left:916px;top:196px;height:190px">
    <div style="position:absolute;left:938px;top:170px;font:700 12px Manrope;color:${pal.ink};opacity:.8">that’s me</div>`,
  init(env) { env.home = layout(env.atlas, "gm.", { y: 2.1, scale: 1.7, track: -.1 }).map((l) => ({ ...l, x: l.x - 1.2 })); },
  choreo(t, env) {
    return env.home.map((h, i) => {
      // a hello: each glyph hops in turn and lands with a squash
      const u = (t - .1 - i * .09) / .2;
      const hop = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
      const land = Math.exp(-(((u - 1) / .12) ** 2)) * (u > .8 ? 1 : 0);
      return { pos: [h.x, h.y + hop * .8, 0], gi: h.gi, q: quat(0, 0, 1, hop * .12 * (i % 2 ? 1 : -1)), s: 1.7, mat: env.matId, squash: 1 - land * .18 };
    });
  },
});
