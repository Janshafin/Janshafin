// 04 BLUE CARBON: the word floats half under still tidal water, bobbing on a slow swell, its
// reflection completing it. A survey line crosses the water and marks the mangrove plots verified.
import { minted } from "./minted.js";
import { layout, quat, TAU } from "./type3d.js";

const WATER = 1.35;

const PRE = /* glsl */ ``;
const POST = /* glsl */ `
#define FLOORFX
#define FLOORN
float swell(vec2 p){
  return .5 * sin(p.x * 1.3 + TAU * uT) + .35 * sin(p.x * 2.1 - p.y * 1.7 - TAU * uT * 2.) + .2 * sin(p.y * 3.3 + TAU * uT);
}
vec3 floorN(vec3 p){
  float e = .02, h = swell(p.xz);
  vec2 g = vec2(swell(p.xz + vec2(e, 0.)) - h, swell(p.xz + vec2(0., e)) - h) / e;
  return normalize(vec3(-g.x * .035, 1., -g.y * .035));
}
vec3 floorFx(vec3 p){
  // the survey line, and a soft verified grid behind it
  float sx = mix(-9., 9., fract(uT));
  float line = exp(-pow((p.x - sx) * 9., 2.)) * smoothstep(5., 1., abs(p.z));
  vec2 g = abs(fract(p.xz * .9) - .5);
  float grid = smoothstep(.47, .5, max(g.x, g.y)) * step(p.x, sx) * smoothstep(7., 1., abs(p.z));
  return uRim * (line * .45 + grid * .22);
}`;

export default minted({
  w: 1200, h: 640, frames: 96, repo: "Blue-Carbon-MRV", index: "04 / 06",
  palettes: ["Deep Sea", "Acid"], materials: ["Candy", "Pearl"],
  candy: [.05, .62, .4],
  chars: "BLUECARBON", R: .17, floorY: WATER,
  cam: { ro: [0, 2.9, 12.5], ta: [0, 1.7, 0], zoom: 1.78 },
  lede: "Measurement, reporting and verification for mangrove restoration: field photos, Sentinel-2 NDVI and EXIF checks, then a record on Sepolia.",
  traits: ({ pal, mat, sha }) => [
    ["Invariant", "Score 75+ and zero flags"], ["Minted at", "Ethereum Sepolia"], ["Stack", "Python, FastAPI, Web3.py, Sentinel-2"],
    ["Status", "Dev mode can mock NDVI"], ["Material", mat], ["Backdrop", pal], ["Seed", sha],
  ],
  init(env) {
    env.home = layout(env.atlas, "BLUE CARBON", { y: WATER + .34 });
  },
  choreo(t, env) {
    return env.home.map((h, i) => {
      // bob on the swell: each letter a little behind its neighbour
      const ph = TAU * t - h.x * .45;
      return { pos: [h.x, h.y + Math.sin(ph) * .07, 0], gi: h.gi, q: quat(0, 0, 1, Math.cos(ph) * .05), s: 1, mat: env.matId };
    });
  },
  glsl: PRE, glslAfter: POST,
});
