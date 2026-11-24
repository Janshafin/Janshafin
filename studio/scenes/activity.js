// A year of real public contributions as ceramic columns standing in still water. Regenerated
// daily in CI from GitHub's public contribution calendar. A slow survey light runs the year.
import { shaderPlate } from "./gl.js";

const W = 1200, H = 520;

const FRAG = /* glsl */ `
const float PITCH = .26, HALF = .095;
const vec3 SUN = normalize(vec3(-.6, .42, .45));
const vec3 GLOW = normalize(vec3(.45, .05, -.9));
const vec3 EMB = vec3(1., .5, .26);
float WEEKS(){ return uData.x; }

float level(vec2 c){
  if(c.x < 0. || c.y < 0. || c.x >= WEEKS() || c.y > 6.) return -1.;
  return floor(texelFetch(uTex, ivec2(c), 0).r * 255. + .5) - 1.;
}
float height(float l){ return l < 0. ? -1. : (l < .5 ? .05 : .12 + l * .3); }
vec3 gridOrigin(){ return vec3(-WEEKS() * PITCH * .5 + 1.2, 0., -1.); }

vec2 map(vec3 p){
  vec3 q = p - gridOrigin();
  vec2 c0 = floor(q.xz / PITCH);
  float d = 1e9; float id = -1.;
  for(int i = -1; i <= 1; i++) for(int j = -1; j <= 1; j++){
    vec2 c = c0 + vec2(i, j);
    float hgt = height(level(c));
    if(hgt < 0.) continue;
    vec3 l = q - vec3((c.x + .5) * PITCH, hgt * .5, (c.y + .5) * PITCH);
    float e = sdRBox(l, vec3(HALF, hgt * .5 + .0, HALF), .018);
    if(e < d){ d = e; id = 10. + c.x + c.y * 100.; }
  }
  // only the 3x3 neighbourhood is checked, so never step further than one cell
  if(q.y < 1.6) d = min(d, PITCH * .9);
  vec2 r = vec2(d, id);
  r = opU(r, vec2(p.y, 2.));
  return r;
}
@POST

vec3 sky(vec3 rd){
  vec3 top = vec3(.02, .018, .055), mid = vec3(.09, .065, .18), hor = vec3(.42, .2, .2);
  vec3 c = mix(hor, mid, smoothstep(-.02, .2, rd.y));
  c = mix(c, top, smoothstep(.15, .7, rd.y));
  c += vec3(1., .42, .22) * pow(max(dot(rd, GLOW), 0.), 10.) * .35;
  return c;
}
float sweep(){ return mix(-6., WEEKS() + 6., uT); }

vec3 column(vec3 p, vec3 n, vec3 rd, float id){
  float cid = id - 10.;
  vec2 c = vec2(mod(cid, 100.), floor(cid / 100.));
  float l = level(c);
  vec3 q = p - gridOrigin();
  float ao = calcAO(p, n);
  float sh = softShadow(p + n * .01, SUN, 14.);
  float dif = max(dot(n, SUN), 0.) * sh;
  float back = max(dot(n, GLOW), 0.);
  vec3 alb = l < .5 ? vec3(.06, .05, .1) : vec3(.84, .8, .88);
  vec3 col = alb * (dif * vec3(2.3, 1.45, 1.) + (.5 + .5 * n.y) * vec3(.16, .13, .3) * ao + back * vec3(.8, .38, .28) * ao);
  col += pow(1. - max(dot(n, -rd), 0.), 5.) * sky(reflect(rd, n)) * .4 * ao;
  // the busiest days carry a lit cap; the survey light warms each week as it passes
  float cap = smoothstep(.6, .9, n.y) * step(3.5, l);
  col = mix(col, EMB * 2.2, cap * .55);
  float dw = c.x - sweep();
  float pass = exp(-dw * dw / 3.) * step(.5, l);
  col = mix(col, col * EMB * 1.3 + EMB * (.5 + 2. * smoothstep(.6, .9, n.y)), pass * .85);
  return col;
}

vec3 fogged(vec3 col, vec3 rd, float t){
  vec3 fc = mix(vec3(.26, .14, .17), vec3(.06, .045, .12), smoothstep(-.1, .25, rd.y));
  return mix(col, fc, 1. - exp(-t * .028));
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 60.);
  if(h.y < 0.) return sky(rd);
  vec3 p = ro + rd * h.x;
  if(h.y == 2.){
    vec3 n = normalize(vec3(.004 * sin(p.x * 9. + TAU * uT * 2.), 1., .004 * cos(p.z * 11. - TAU * uT * 2.)));
    vec3 rr = reflect(rd, n);
    vec2 hr = march(p + n * .01, rr, 20.);
    vec3 rc = hr.y < 0. ? sky(rr) : column(p + rr * hr.x, calcNormal(p + rr * hr.x), rr, hr.y);
    float fre = .05 + .95 * pow(1. - max(dot(n, -rd), 0.), 5.);
    float sh = softShadow(p + vec3(0, .01, 0), SUN, 10.);
    vec3 col = mix(vec3(.02, .016, .045) * (.4 + .6 * sh), rc * .6, clamp(fre * 1.2, 0., 1.));
    return fogged(col, rd, h.x);
  }
  return fogged(column(p, calcNormal(p), rd, h.y), rd, h.x);
}

void main(){
  vec3 ro = vec3(-3.4, 2.5, 7.6), ta = vec3(1.6, .95, -.5);
  vec3 col = vec3(0);
  int AA = int(uData.y);
  for(int j = 0; j < AA; j++) for(int i = 0; i < AA; i++){
    vec2 o = (vec2(i, j) + .5) / float(AA) - .5;
    vec2 uv = (gl_FragCoord.xy + o - .5 * uRes) / uRes.y;
    col += render(ro, camRay(ro, ta, uv, 1.8));
  }
  outColor = vec4(finish(col / float(AA * AA), gl_FragCoord.xy), 1.);
}
`;

export default {
  w: W, h: H, frames: 96, fps: 24,
  html: `
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,8,22,.55) 0%,rgba(10,8,22,0) 46%)"></div>
  <div style="position:absolute;left:64px;top:52px;right:64px;display:flex;align-items:flex-start;gap:40px">
    <div>
      <h2 class="display" id="headline" style="font-size:64px"></h2>
      <p class="lede" style="margin-top:14px;font-size:17px;color:rgba(241,236,246,.72)">
        A column for every day of the last year, raised by how much I shipped. Redrawn each night from GitHub.</p>
    </div>
    <div class="small" id="upd" style="margin-left:auto;margin-top:12px;white-space:nowrap;color:rgba(241,236,246,.55)"></div>
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
    ctx.ui.querySelector("#headline").textContent = `${active} days of building`;
    ctx.ui.querySelector("#upd").textContent = `Updated ${last.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;
    const aa = Number(new URLSearchParams(location.search).get("aa") || 2);
    return shaderPlate({ ...ctx, frag: FRAG, vec: [weeks, aa, 0, 0], texture: { w: weeks, h: 7, pixels } });
  },
};
