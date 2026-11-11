// A project panel: product-style copy on one side, the project's own 3D object on the other.
import { rig, backdrop, dust, floor } from "./common.js";

export const W = 1200, H = 560;

export function panelHTML(p) {
  const side = p.flip ? "right" : "left";
  const pad = p.flip ? "padding:52px 60px 52px 640px" : "padding:52px 640px 52px 60px";
  const chips = p.stack.map((s) => `<span class="chip">${s}</span>`).join("");
  return `
  <div class="scrim-${side}"></div>
  <div style="position:absolute;inset:0;${pad};display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="label lime" style="letter-spacing:.1em">${p.index}</span>
      <span class="label">${p.kind}</span>
    </div>
    <h2 style="margin-top:22px;font:600 60px/1 Geist;letter-spacing:-.045em">${p.name}</h2>
    <p style="margin-top:16px;font:400 19px/1.45 Geist;letter-spacing:-.01em;color:var(--muted)">${p.blurb}</p>
    <div style="margin-top:22px;display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;
                background:rgba(200,255,90,.05);box-shadow:inset 0 0 0 1px rgba(200,255,90,.22)">
      <span class="label lime" style="font-size:11px">Invariant</span>
      <span class="mono" style="font-size:17px;color:var(--text)">${p.invariant}</span>
    </div>
    <div class="chips" style="margin-top:20px">${chips}</div>
    <div style="margin-top:auto;display:flex;align-items:center;gap:18px">
      <span class="btn ghost" style="white-space:nowrap;flex:none">View repository <span style="opacity:.7">↗</span></span>
      <span class="label" style="font-size:12px;white-space:nowrap"><span class="dot ${p.statusTone || ""}"></span>&nbsp;&nbsp;${p.status}</span>
    </div>
  </div>
  <div class="label" style="position:absolute;top:54px;${p.flip ? "left" : "right"}:60px;font-size:12px">${p.event}</div>`;
}

/** Standard stage for a panel: the subject sits in the empty half of the card. */
export function panelRig(ctx, p, blobs, opts = {}) {
  const r = rig({ ...ctx, cam: [0, 0.3, 10.5], bloom: { strength: 0.5, radius: 0.5, threshold: 0.9 }, ...opts });
  backdrop(r.scene, blobs.map(([x, y, rad, c, a]) => [p.flip ? 1 - x : x, y, rad, c, a]));
  floor(r.scene, -2.7, 0.05);
  r.drift = dust(r.scene, 160, [12, 6, 6], p.seed || 5);
  r.x = p.flip ? -2.9 : 2.9;  // world x of the subject's centre
  return r;
}
