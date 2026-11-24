// 02 TRUSTLINE: the word is sealed inside a frosted glass slab, the enclave. You can sense it as a
// warm glow but never read it sharp. Once per loop a single bright bit slides out and lands.
import { minted } from "./minted.js";
import { layout } from "./type3d.js";

const PRE = /* glsl */ `
#define PROPS
#define NOLETTERS
const vec3 SC = vec3(0., 1.62, 0.);
const vec3 SB = vec3(5.05, .95, .62);
uniform vec3 uBit; uniform float uBitA;
float slab(vec3 p){ return sdRBox(p - SC, SB, .3); }
float bit(vec3 p){ return uBitA > .01 ? length(p - uBit) - .16 * uBitA : 1e9; }
float props(vec3 p){ return min(slab(p), bit(p)); }`;

const POST = /* glsl */ `
const vec3 EMB = vec3(1., .52, .24);
vec3 propShade(vec3 p, vec3 n, vec3 rd){
  if(bit(p) < slab(p)) return EMB * 1.9 + vec3(.25) * pow(max(dot(n, -rd), 0.), 4.);
  // frosted glass: a rough reflection on top, and a walk through the slab gathering the hidden word as glow
  vec3 nf = normalize(n + (vec3(noise(p * 9.), noise(p * 9. + 4.), noise(p * 9. + 8.)) - .5) * .25);
  float fre = .04 + .96 * pow(1. - max(dot(nf, -rd), 0.), 5.);
  vec3 refl = studio(reflect(rd, nf));
  vec3 rdi = refract(rd, nf, 1. / 1.45);
  vec3 x = p - n * .02;
  float g = 0., ds = .05;
  for(int i = 0; i < 48; i++){
    if(slab(x) > 0.) break;
    float d = letters(x);
    g += exp(-max(d, 0.) * 7.) * ds;
    x += rdi * ds;
  }
  float pulse = .9 + .1 * sin(TAU * uT);
  vec3 behind = studioBg(rdi) * .75 + vec3(.06);
  vec3 inner = EMB * g * 2.6 * pulse + vec3(1., .85, .7) * pow(g, 3.) * 1.4;
  return behind + inner + refl * fre * .7 + vec3(.04);
}`;

export default minted({
  w: 1200, h: 640, frames: 96, repo: "TrustLine", index: "02 / 06",
  palettes: ["Mercury", "Bubblegum", "Cobalt"], materials: ["Frosted"],
  chars: "TRUSTLINE", R: .17,
  cam: { ro: [0, 2.9, 13.5], ta: [0, 1.5, 0], zoom: 2.2 },
  lede: "A private solvency check for agent-to-agent payments. A Chainlink CRE enclave compares balance and price and answers with one bit.",
  traits: ({ pal, mat, sha }) => [
    ["Invariant", "Only one bit comes out"], ["Minted at", "ETHOnline 2026"], ["Stack", "Solidity, Chainlink CRE, Privy, x402"],
    ["Status", "CRE in local simulation"], ["Material", mat], ["Backdrop", pal], ["Seed", sha],
  ],
  init(env) { env.home = layout(env.atlas, "TRUSTLINE", { y: 1.62 }); },
  choreo(t, env) {
    return env.home.map((h) => ({ pos: [h.x, h.y, 0], gi: h.gi, s: 1, mat: 0 }));
  },
  extra(plate, t) {
    // the bit: appears at the right face, drops to the floor, slides out, fades
    const u = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
    const fall = u(t, .32, .44), slide = u(t, .44, .82);
    const alive = u(t, .28, .32) * (1 - u(t, .86, .96));
    const x = 2.4 + slide * 1.6;
    const y = .62 - (.62 - .16) * fall * fall;
    plate.set("uBit", [x, y, .1 + slide * 1.3], 3);
    plate.set("uBitA", alive);
  },
  glsl: PRE, glslAfter: POST,
});
