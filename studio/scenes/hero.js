// Hero: JAN SHAFIN minted in puffy type. The letters drift apart on their own phases, then snap
// into the lockup (the mint) and a ring of light runs out across the floor.
import { minted } from "./minted.js";
import { layout, quat, TAU, ease, spring } from "./type3d.js";

const GLSL_AFTER = /* glsl */ `
#define FLOORFX
uniform float uPulseR;
vec3 floorFx(vec3 p){
  float r = length(p.xz - vec2(0., 0.));
  float k = uPulse;
  float ring = exp(-pow((r - k * 11.) * 2.2, 2.)) * (1. - k) * step(.001, k);
  return uRim * ring * 2.2;
}`;

export default minted({
  w: 1200, h: 700, frames: 96, repo: "Janshafin", index: "Genesis",
  palettes: ["Ultraviolet", "Cobalt", "Sunset"], materials: ["Pearl", "Mercury"],
  chars: "JANSHAFIN", R: .17,
  cam: { ro: [0, 2.2, 12.5], ta: [0, 2.0, 0], zoom: 2.75 },
  traits: ({ pal, mat, sha }) => [
    ["Role", "Web3 developer, creative director"], ["Thesis", "Culture plus code"], ["Chain", "Ethereum"],
    ["Minted", "6 builds in 2026"], ["Material", mat], ["Backdrop", pal], ["Seed", sha],
  ],
  init(env) {
    const l1 = layout(env.atlas, "JAN", { y: 2.75 });
    const l2 = layout(env.atlas, "SHAFIN", { y: 1.35 });
    env.home = [...l1, ...l2];
    env.drift = env.home.map(() => ({
      d: [(env.S.rnd() - .5) * 1.1, (env.S.rnd() - .35) * .7, (env.S.rnd() - .5) * 2.],
      ax: [env.S.rnd() - .5, env.S.rnd() - .5, env.S.rnd() - .5], ang: (env.S.rnd() - .5) * 1.5,
      ph: env.S.rnd() * TAU,
    }));
  },
  choreo(t, env) {
    // apart, hold, snap home with a little overshoot
    const amp = t < .55 ? ease(t / .3) : 1 - spring((t - .55) / .1);
    const squash = 1 - .1 * Math.exp(-(((t - .62) / .03) ** 2));
    return env.home.map((h, i) => {
      const d = env.drift[i];
      const live = Math.min(1, amp * 4);              // still once the word is minted
      const bob = Math.sin(TAU * t * 2 + d.ph) * .05 * live;
      return {
        pos: [h.x + d.d[0] * amp, h.y + .2 + d.d[1] * amp + bob, d.d[2] * amp],
        gi: h.gi, q: quat(...d.ax, d.ang * amp + Math.sin(TAU * t + d.ph) * .06 * live),
        s: 1, mat: env.matId, squash,
      };
    });
  },
  extra(plate, t) { plate.set("uPulse", t > .6 ? Math.min((t - .6) / .38, 1) : 0); },
  glslAfter: GLSL_AFTER,
});
