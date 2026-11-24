// Receipts: a year of real public contributions as toy block towers on cream. One block per level
// of activity, stacked through the four fits. Regenerated nightly in CI from GitHub's public calendar.
import { shaderPlate } from "./gl.js";

const W = 1200, H = 560;

const FRAG = /* glsl */ `
const float PITCH = .26, HALF = .1, VP = .215;
float WEEKS(){ return uData.x; }
float level(vec2 c){
  if(c.x < 0. || c.y < 0. || c.x >= WEEKS() || c.y > 6.) return -1.;
  return floor(texelFetch(uTex, ivec2(c), 0).r * 255. + .5) - 1.;
}
vec3 origin(){ return vec3(-WEEKS() * PITCH * .5, 0., -.9); }
float wave(float wk){ float d = wk - mix(-8., WEEKS() + 8., uT); return .07 * exp(-d * d / 6.); }

vec2 map(vec3 p){
  vec3 q = p - origin();
  vec2 c0 = floor(q.xz / PITCH);
  float d = 1e9, id = -1.;
  for(int i = -1; i <= 1; i++) for(int j = -1; j <= 1; j++){
    vec2 c = c0 + vec2(i, j);
    float l = level(c);
    if(l < 0.) continue;
    vec3 l3 = q - vec3((c.x + .5) * PITCH, 0., (c.y + .5) * PITCH);
    float e;
    float k = 0.;
    if(l < .5) e = sdRBox(l3 - vec3(0., .012, 0.), vec3(HALF, .012, HALF), .01);
    else {
      l3.y -= wave(c.x) * step(.5, l);
      float k0 = clamp(floor(l3.y / VP), 0., l - 1.), k1 = clamp(k0 + (fract(l3.y / VP) > .5 ? 1. : -1.), 0., l - 1.);
      float e0 = sdRBox(l3 - vec3(0., (k0 + .5) * VP, 0.), vec3(HALF), .03);
      float e1 = sdRBox(l3 - vec3(0., (k1 + .5) * VP, 0.), vec3(HALF), .03);
      e = min(e0, e1); k = e0 < e1 ? k0 : k1;
    }
    if(e < d){ d = e; id = 10. + k + 10. * c.x + 1000. * c.y; }
  }
  if(q.y < 1.1) d = min(d, PITCH * .9);   // only the 3x3 neighbourhood is checked
  vec2 r = vec2(d, id);
  r = opU(r, vec2(p.y, 6.));
  return r;
}
@POST

vec3 fit(float k){
  return k < .5 ? vec3(.15, .52, .19) : k < 1.5 ? vec3(.16, .46, 1.) : k < 2.5 ? vec3(.8, .23, .46) : vec3(.9, .24, .11);
}

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  if(h.y == 6.) return vec4(pageLin() * .3, floorShade(p) * .8 * exp(-max(h.x - 9., 0.) * .25));
  float cid = h.y - 10.;
  float row = floor(cid / 1000.);
  float rest = cid - row * 1000.;
  float col = floor(rest / 10.);
  float k = rest - col * 10.;
  float l = level(vec2(col, row));
  vec3 n = calcNormal(p);
  vec3 alb = l < .5 ? vec3(.62, .62, .58) : fit(k);
  return vec4(vinyl(p, n, rd, alb, 1.), 1.);
}

void main(){
  vec3 ro = vec3(-3.4, 4.6, 7.4), ta = vec3(.6, .2, -.4);
  vec2 C = vec2(.5, .4) * uRes;
  int AA = int(uData.y);
  vec4 col = vec4(0);
  for(int j = 0; j < AA; j++) for(int i = 0; i < AA; i++){
    vec2 o = (vec2(i, j) + .5) / float(AA) - .5;
    vec4 c = render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 1.75));
    col += vec4(c.rgb * c.a, c.a);
  }
  col /= float(AA * AA);
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

const swatch = (c, l) => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${c}"></i>${l}</span>`;

export default {
  w: W, h: H, frames: 72, fps: 24, page: "#EEF0E8",
  html: `
  <div style="position:absolute;left:40px;top:40px;right:40px;display:flex;align-items:flex-start">
    <div>
      <div class="caps" style="font-size:12px">Receipts</div>
      <div class="wide" id="headline" style="font-size:64px;margin-top:14px"></div>
      <p class="body" style="margin-top:14px;font-size:15px;width:470px;color:rgba(11,11,11,.78)">Every day on GitHub in the last year. One block for each level of activity, stacked through the four fits. Rebuilt every night.</p>
    </div>
    <div class="caps" id="upd" style="margin-left:auto;font-size:12px;text-align:right"></div>
  </div>
  <div class="caps" style="position:absolute;left:40px;bottom:36px;display:flex;gap:18px;font-size:11px">
    ${swatch("#6BBF7A", "1 block")}${swatch("#6EB5FF", "2")}${swatch("#E882B4", "3")}${swatch("#F4845F", "4, a big day")}
  </div>`,

  async setup(ctx) {
    const days = ctx.data;                                    // [{date, level}] sorted
    const last = new Date(days[days.length - 1].date + "T00:00:00Z");
    const start = new Date(last); start.setUTCDate(start.getUTCDate() - 364);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());  // back to Sunday
    const level = new Map(days.map((d) => [d.date, d.level]));
    const weeks = Math.floor((last - start) / 864e5 / 7) + 1;
    const pixels = new Uint8Array(weeks * 7);                 // 0 = no day, else level + 1
    let active = 0;
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (day > last) continue;
      const lv = level.get(day.toISOString().slice(0, 10)) ?? 0;
      if (lv > 0) active++;
      pixels[d * weeks + w] = lv + 1;
    }
    ctx.ui.querySelector("#headline").textContent = `${active} days shipped`;
    ctx.ui.querySelector("#upd").innerHTML = `Updated<br>${last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
    const aa = Number(new URLSearchParams(location.search).get("aa") || 2);
    return shaderPlate({ ...ctx, frag: FRAG, page: "#EEF0E8", vec: [weeks, aa, 0, 0], texture: { w: weeks, h: 7, pixels } });
  },
};
