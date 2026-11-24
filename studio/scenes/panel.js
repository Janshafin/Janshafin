// A project plate: the scene fills the card, a caption column sits on the quiet side.
export const W = 1200, H = 560;

export function panelHTML(p) {
  const right = !!p.flip;
  const facts = p.facts.map(([k, v]) =>
    `<div style="display:grid;grid-template-columns:104px 1fr;gap:16px;padding:10px 0;border-top:1px solid rgba(241,236,246,.1)">
       <span class="small" style="color:rgba(241,236,246,.5)">${k}</span>
       <span class="small" style="color:rgba(241,236,246,.86)">${v}</span></div>`).join("");
  const scrim = right
    ? `linear-gradient(270deg,${p.scrim} 0%,${p.scrim.replace(/[\d.]+\)$/, "0.35)")} 38%,transparent 58%)`
    : `linear-gradient(90deg,${p.scrim} 0%,${p.scrim.replace(/[\d.]+\)$/, "0.35)")} 38%,transparent 58%)`;
  return `
  <div style="position:absolute;inset:0;background:${scrim}"></div>
  <div style="position:absolute;top:54px;bottom:48px;${right ? "right" : "left"}:64px;width:452px;display:flex;flex-direction:column">
    <div class="small" style="color:rgba(241,236,246,.56)">${p.event}</div>
    <h2 class="display" style="font-size:86px;margin-top:22px">${p.name}</h2>
    <p class="lede" style="margin-top:20px;font-size:18.5px;color:rgba(241,236,246,.74)">${p.blurb}</p>
    <div style="margin-top:auto">${facts}</div>
  </div>`;
}
