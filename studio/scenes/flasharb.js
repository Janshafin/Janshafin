// 01 FLASHARB: the letters ride a chrome loop like a coaster. Down, under, back up, and home again
// to spell the word: borrowed, traded and repaid inside one unlock.
import { minted } from "./minted.js";
import { layout, quat, ease } from "./type3d.js";

const L = 8.6, RAD = 1.25, Y = 2.05;          // the stadium loop the letters ride
const P = 2 * L + 2 * Math.PI * RAD;

function along(a) {
  a = ((a % P) + P) % P;
  if (a < L) return { x: -L / 2 + a, y: Y + RAD, ang: 0 };
  a -= L;
  if (a < Math.PI * RAD) { const th = a / RAD; return { x: L / 2 + Math.sin(th) * RAD, y: Y + Math.cos(th) * RAD, ang: -th }; }
  a -= Math.PI * RAD;
  if (a < L) return { x: L / 2 - a, y: Y - RAD, ang: -Math.PI };
  a -= L;
  const th = a / RAD;
  return { x: -L / 2 - Math.sin(th) * RAD, y: Y - Math.cos(th) * RAD, ang: -Math.PI - th };
}

const PRE = /* glsl */ `
#define PROPS
const float LL = ${L}, RR = ${RAD} - .62, YY = ${Y};
float props(vec3 p){
  vec2 q = vec2(max(abs(p.x) - LL * .5, 0.), p.y - YY);
  float d2 = length(q) - RR;
  return length(vec2(d2, p.z + .05)) - .07;          // the rail: a chrome tube
}`;
const POST = /* glsl */ `
vec3 propShade(vec3 p, vec3 n, vec3 rd){
  vec3 r = reflect(rd, n);
  return studio(r) * vec3(.9, .9, .95) * (.5 + .5 * calcAO(p, n));
}`;

export default minted({
  w: 1200, h: 640, frames: 96, repo: "flasharb", index: "01 / 06",
  palettes: ["Sunset", "Ultraviolet", "Acid"], materials: ["Mercury", "Pearl", "Candy"],
  candy: [.95, .32, .08],
  chars: "FLASHARB", R: .17,
  cam: { ro: [0, 2.4, 13.5], ta: [0, 1.62, 0], zoom: 2.05 },
  lede: "Atomic flash arbitrage between Uniswap v4 and 1inch Aqua. Borrow, trade, repay, all inside one unlock.",
  traits: ({ pal, mat, sha }) => [
    ["Invariant", "Sum of deltas is zero"], ["Minted at", "ETHGlobal Mumbai 2026"], ["Stack", "Solidity, Huff, Uniswap v4, 1inch Aqua"],
    ["Status", "End to end, local chain"], ["Material", mat], ["Backdrop", pal], ["Seed", sha],
  ],
  init(env) {
    const line = layout(env.atlas, "FLASHARB");
    // arc-length position of each letter on the top straight
    env.home = line.map((l) => ({ ...l, a: l.x + L / 2 }));
  },
  choreo(t, env) {
    const u = P * ease((t - .1) / .78);
    return env.home.map((h) => {
      const k = along(h.a + u);
      // ride on the outside of the rail; the letter turns with the track
      const nx = -Math.sin(k.ang), ny = Math.cos(k.ang);
      const off = .0;
      return { pos: [k.x + nx * off, k.y + ny * off, 0], gi: h.gi, q: quat(0, 0, 1, k.ang), s: 1, mat: env.matId };
    });
  },
  glsl: PRE, glslAfter: POST,
});
