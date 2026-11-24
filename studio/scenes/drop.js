// A drop plate: the piece's name set huge across the page, Jan's figurine in that colourway,
// the project as a vinyl toy on the sweep, and a hangtag carrying the metadata.
import { shaderPlate, TAU } from "./gl.js";

export const W = 1200, H = 700;

function barcode(sha) {
  if (!sha) return "";
  const bits = [...sha.slice(0, 24)].flatMap((c) => parseInt(c, 16).toString(2).padStart(4, "0").split(""));
  return bits.map((b, i) => `<i style="width:${b === "1" ? 3 : 1}px;${i % 3 === 2 ? "margin-right:1px;" : ""}"></i>`).join("");
}

export function dropPlate(p) {
  const rows = p.tag.map(([k, v]) => `<div class="row"><b>${k}</b><span>${v}</span></div>`).join("");
  return {
    w: W, h: H, frames: p.frames || 96, fps: 24, page: p.page,
    under: `
      <div id="name" class="wide" style="position:absolute;left:36px;top:40px;font-size:180px;white-space:nowrap">${p.name}</div>
      <div style="position:absolute;left:${p.figX - 150}px;bottom:34px;width:300px;height:34px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,0,0,.28),rgba(0,0,0,0))"></div>
      <img id="fig" src="/models/${p.fit}.webp" style="position:absolute;left:${p.figX - 240}px;bottom:-6px;height:${p.figH || 560}px;transform-origin:50% 100%">`,
    html: `
      <div style="position:absolute;left:40px;bottom:40px;width:270px">
        <p class="caps" style="font-size:14px;line-height:1.25">${p.lead}</p>
        <p class="body" style="margin-top:12px;font-size:15.5px;color:rgba(11,11,11,.8)">${p.copy}</p>
      </div>
      <div id="spray" class="spray" style="position:absolute;left:${p.spray.x}px;top:${p.spray.y}px;font-size:${p.spray.size || 46}px;
        transform:rotate(${p.spray.r ?? -7}deg);text-shadow:0 2px 0 rgba(0,0,0,.08)">${p.spray.text}</div>
      <div id="string" class="string" style="left:${p.tagX + 118}px;top:0;height:245px"></div>
      <div id="tag" class="tag" style="left:${p.tagX}px;top:222px">
        <div class="caps" style="font-size:10.5px;display:flex;justify-content:space-between;margin-bottom:10px">
          <span>Drop ${p.drop}</span><span>Edition 1/1</span></div>
        <div class="wide" style="font-size:19px;line-height:.95;margin-bottom:12px;white-space:nowrap">${p.short || p.name}</div>
        ${rows}
        <div class="code" id="code"></div>
        <div class="hash" id="hash"></div>
      </div>
      <div class="pill caps" style="position:absolute;right:28px;bottom:30px;font-size:13px">See the build <span class="dot">↗</span></div>`,

    async setup(ctx) {
      const fig = ctx.under.querySelector("#fig");
      await fig.decode();
      // fit the name to the page width
      const name = ctx.under.querySelector("#name");
      name.style.fontSize = `${Math.min(190, 180 * (W - 72) / name.scrollWidth)}px`;
      const c = ctx.repos?.[p.repo];
      if (c) {
        ctx.ui.querySelector("#code").innerHTML = barcode(c.sha);
        ctx.ui.querySelector("#hash").textContent = `${p.repo} @ ${c.sha.slice(0, 7)}`;
      }
      const toy = shaderPlate({ ...ctx, frag: p.frag, page: p.page });
      const tag = ctx.ui.querySelector("#tag"), str = ctx.ui.querySelector("#string");
      return {
        frame(t) {
          const a = Math.sin(TAU * t * (p.swing || 1)) * 2.6 + Math.sin(TAU * t * 2 + 1) * .7;
          tag.style.transform = `rotate(${a}deg)`;
          str.style.transform = `rotate(${a * .35}deg)`;
          toy.frame(t);
        },
      };
    },
  };
}
