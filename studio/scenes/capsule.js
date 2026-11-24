// 05 + 06: two more from 2026 on one plate. ADGENT inflates letter by letter and only holds its
// shape once the sale settles; GIGFORGE gets hammered flat on the beat and springs back.
import { minted } from "./minted.js";
import { layout, quat, TAU, spring } from "./type3d.js";

export default minted({
  w: 1200, h: 640, frames: 96, repo: "ADGENT", index: "05 + 06 / 06",
  palettes: ["Bubblegum", "Mercury", "Acid"], materials: ["Black chrome", "Mercury", "Pearl"],
  candy: [.95, .3, .08],
  chars: "ADGENTIFOR", R: .17,
  cam: { ro: [0, 2.4, 14], ta: [0, 2.0, 0], zoom: 2.2 },
  lede: "Two more from 2026: ads inside AI shopping agents that only pay when a sale settles, and an AI co-founder for freelancers.",
  traits: ({ pal, mat, sha }) => [
    ["ADGENT", "Ads inside AI shopping agents"], ["Settles", "Pays only on a PayPal sale"], ["Minted at", "PayPal AI Hackathon 2026"],
    ["GigForge", "AI co-founder for freelancers"], ["Status", "Live on Vercel"], ["Material", `Candy, ${mat}`], ["Seed", sha],
  ],
  init(env) {
    env.top = layout(env.atlas, "ADGENT", { y: 2.95 });
    env.bot = layout(env.atlas, "GIGFORGE", { y: 1.3 });
  },
  choreo(t, env) {
    const a = env.top.map((h, i) => {
      // inflate in turn, hold, let the air out at the end of the loop
      const s = .12 + .88 * spring((t - .08 - i * .06) / .2) * (1 - Math.min(1, Math.max(0, (t - .9) / .08)));
      return { pos: [h.x, h.y, 0], gi: h.gi, q: quat(0, 1, 0, Math.sin(TAU * t + i) * .12), s, mat: 2 };
    });
    const b = env.bot.map((h, i) => {
      // three hammer beats roll across the word
      let sq = 1;
      for (const beat of [.3, .5, .7]) sq -= .42 * Math.exp(-(((t - beat - i * .022) / .022) ** 2));
      return { pos: [h.x, h.y - (1 - sq) * .45, 0], gi: h.gi, s: 1, mat: env.matId, squash: sq };
    });
    return [...a, ...b];
  },
});
