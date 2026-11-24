// 03 CUSTODIAN: every letter is a slot-machine reel. They spin, then lock upright one at a time,
// and five lamps above (the five agents) light as they agree. Only then does gold run through the word.
import { minted } from "./minted.js";
import { layout, quat, TAU } from "./type3d.js";

const LOCK0 = .12, STEP = .055;            // when the first reel locks, and the gap between them
const ease3 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

const PRE = /* glsl */ `
#define PROPS
uniform float uLamps;          // how many of the five lamps are lit (fractional fades)
uniform float uGold;
const vec3 FC = vec3(0., 1.6, -.55);
float housing(vec3 p){
  // a slim black frame behind the reels, with a lamp rail on top
  float back = sdRBox(p - FC, vec3(5.6, 1.05, .12), .1);
  return back;
}
float lamp(vec3 p, out float idx){
  float d = 1e9; idx = -1.;
  for(int i = 0; i < 5; i++){
    vec3 c = vec3(-2.4 + float(i) * 1.2, 2.95, -.4);
    float e = length(p - c) - .14;
    if(e < d){ d = e; idx = float(i); }
  }
  return d;
}
float props(vec3 p){ float i; return min(housing(p), lamp(p, i)); }`;

const POST = /* glsl */ `
vec3 propShade(vec3 p, vec3 n, vec3 rd){
  float idx; float dl = lamp(p, idx);
  if(dl < housing(p)){
    float on = clamp(uLamps - idx, 0., 1.);
    vec3 off = vec3(.04) + studio(reflect(rd, n)) * .15;
    return mix(off, uRim * 2.4 + vec3(.6), on);
  }
  vec3 r = reflect(rd, n);
  return studio(r) * .07 + vec3(.008) + vec3(1.5) * smoothstep(.9, .98, dot(r, KEY)) * .4;
}`;

export default minted({
  w: 1200, h: 640, frames: 96, repo: "Custodian", index: "03 / 06",
  palettes: ["Cobalt", "Acid", "Mercury"], materials: ["Black chrome", "Mercury"],
  chars: "CUSTODIAN", R: .17,
  cam: { ro: [0, 2.3, 13.5], ta: [0, 1.75, 0], zoom: 2.25 },
  lede: "A treasury run by five agents. Models propose, a fail-closed policy gate decides, and only the execution agent holds keys.",
  traits: ({ pal, mat, sha }) => [
    ["Invariant", "No approval, no execution"], ["Minted at", "DoraHacks Agent Economy"], ["Stack", "TypeScript, KeeperHub, json-rules-engine"],
    ["Status", "Policy gate live, 19 tests"], ["Material", mat], ["Backdrop", pal], ["Seed", sha],
  ],
  init(env) {
    env.home = layout(env.atlas, "CUSTODIAN", { y: 1.6 });
    env.turns = env.home.map(() => 2 + Math.floor(env.S.rnd() * 3));
  },
  choreo(t, env) {
    const gold = Math.exp(-(((t - .7) / .05) ** 2));
    return env.home.map((h, i) => {
      const T = LOCK0 + i * STEP;
      // spin about the horizontal axis like a reel, slowing into place
      const ang = (1 - ease3(t / T)) * env.turns[i] * TAU;
      const sweep = Math.exp(-(((t - .7 - (h.x + 5) * .012) / .03) ** 2));
      return { pos: [h.x, h.y, 0], gi: h.gi, q: quat(1, 0, 0, ang), s: 1, mat: env.matId, glow: sweep * 1.4 + gold * .2 };
    });
  },
  extra(plate, t) {
    // five lamps light as reels lock: roughly one lamp per two reels
    const locked = Math.max(0, Math.min(9, (t - LOCK0) / STEP + 1));
    plate.set("uLamps", t > .95 ? 5 * (1 - (t - .95) / .05) : locked * 5 / 9);
    plate.set("uGold", 0);
  },
  glsl: PRE, glslAfter: POST,
});
