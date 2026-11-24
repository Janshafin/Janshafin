// Receipts: the last year of public contributions as a sheet of 3D bubble wrap. One bubble per day,
// inflated by how much went in; quiet days stay flat. Rebuilt nightly in CI from GitHub's calendar.
import { shaderPlate } from "./gl.js";
import { TYPE_GLSL, pushPalette, chrome, PALETTES } from "./type3d.js";

const W = 1200, H = 640;

const FRAG = /* glsl */ `
${TYPE_GLSL}
const float PITCH = .25;
float WEEKS(){ return uData.x; }
float level(vec2 c){
  if(c.x < 0. || c.y < 0. || c.x >= WEEKS() || c.y > 6.) return -1.;
  return floor(texelFetch(uTex, ivec2(c), 0).r * 255. + .5) - 1.;
}
vec3 origin(){ return vec3(-WEEKS() * PITCH * .5, 0., -.9); }
float bubbleH(float l){ return l < .5 ? .018 : .045 + l * .028; }
float cellOf = 0.;
vec2 map(vec3 p){
  vec3 q = p - origin();
  vec2 c0 = floor(q.xz / PITCH);
  float d = 1e9;
  for(int i = -1; i <= 1; i++) for(int j = -1; j <= 1; j++){
    vec2 c = c0 + vec2(i, j);
    float l = level(c);
    if(l < 0.) continue;
    vec3 rad = vec3(.105, bubbleH(l), .105);
    vec3 b = (q - vec3((c.x + .5) * PITCH, 0., (c.y + .5) * PITCH)) / rad;
    float e = (length(b) - 1.) * min(rad.y, .105) * .9;
    if(e < d){ d = e; cellOf = c.x + c.y * 100.; }
  }
  if(q.y < .3) d = min(d, PITCH * .45);
  vec2 r = vec2(d, 1.);
  // the sheet the bubbles are pressed into
  float sheet = p.y + .002;
  if(sheet < r.x) r = vec2(sheet, 2.);
  return r;
}
@POST
const vec3 KEY = normalize(vec3(-.45, .85, .4));
vec3 tone(float l){
  return l < .5 ? vec3(.62, .64, .66) : l < 1.5 ? vec3(.2, .85, .6) : l < 2.5 ? vec3(.25, .5, 1.) : l < 3.5 ? vec3(1., .35, .78) : vec3(1., .72, .2);
}
vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  if(h.y < 0.) return studioBg(rd);
  vec3 p = ro + rd * h.x;
  if(h.y == 2.){
    float sh = softShadow(p + vec3(0, .01, 0), KEY, 8.);
    float ao = calcAO(p, vec3(0, 1, 0));
    vec3 c = uFloor * (.45 + .55 * sh) * ao;
    return mix(c, studioBg(rd), smoothstep(10., 26., h.x));
  }
  map(p);
  float id = cellOf;
  vec2 c = vec2(mod(id, 100.), floor(id / 100.));
  float l = level(c);
  vec3 n = calcNormal(p);
  vec3 r = reflect(rd, n);
  float fre = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  float sh = softShadow(p + n * .01, KEY, 10.);
  float wrap = clamp((dot(n, KEY) + .35) / 1.35, 0., 1.);
  // glossy, slightly clear plastic: colour inside, the studio on the skin
  float sweep = exp(-pow((c.x - mix(-6., WEEKS() + 6., uT)) / 2.2, 2.));
  vec3 base = tone(l) * (wrap * mix(.45, 1., sh) + .3) * (l < .5 ? .6 : 1.);
  vec3 col = base + studio(r) * (.08 + .6 * fre) + vec3(1.6) * smoothstep(.93, .99, dot(r, KEY)) * .7;
  col += tone(l) * sweep * .35 * step(.5, l);
  return mix(col, studioBg(rd), smoothstep(10., 26., h.x));
}
void main(){
  vec3 ro = vec3(-3.2, 4.2, 6.9), ta = vec3(.4, -.1, -.5);
  int AA = int(uData.y);
  vec3 col = vec3(0);
  for(int j = 0; j < AA; j++) for(int i = 0; i < AA; i++){
    vec2 o = (vec2(i, j) + .5) / float(AA) - .5;
    col += render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - vec2(.5, .42) * uRes) / uRes.y, 1.75));
  }
  col /= float(AA * AA);
  col = col / (1. + max(col - .9, 0.) * .8);
  outColor = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}
`;

export default {
  w: W, h: H, frames: 72, fps: 24,
  async setup(ctx) {
    const days = ctx.data;                                    // [{date, level}] sorted
    const last = new Date(days[days.length - 1].date + "T00:00:00Z");
    const start = new Date(last); start.setUTCDate(start.getUTCDate() - 364);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());  // back to Sunday
    const level = new Map(days.map((d) => [d.date, d.level]));
    const weeks = Math.floor((last - start) / 864e5 / 7) + 1;
    const pixels = new Uint8Array(weeks * 7);                 // 0 = no day, else level + 1
    let active = 0, big = 0;
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (day > last) continue;
      const lv = level.get(day.toISOString().slice(0, 10)) ?? 0;
      if (lv > 0) active++;
      if (lv === 4) big++;
      pixels[d * weeks + w] = lv + 1;
    }
    const sha = ctx.repos?.Janshafin?.sha || "nightly";
    const pal = "Bubblegum";             // fixed, so the nightly CI render matches the local one
    const ink = PALETTES[pal].ink;
    const updated = last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    ctx.ui.innerHTML = chrome({ index: "Receipts", seed: "Redrawn nightly", pal, traits: [
      ["Window", "Last 53 weeks"], ["Active days", `${active}`], ["Biggest days", `${big}`], ["Updated", updated],
      ["Source", "GitHub public calendar"], ["Material", "Bubble wrap"], ["Backdrop", pal],
    ] }) + `
      <div style="position:absolute;left:32px;top:54px;color:${ink}">
        <div style="font:800 46px/1 Unbounded;letter-spacing:-.01em">${active} days shipped</div>
        <p class="lede" style="position:static;margin-top:12px;width:560px;opacity:.85">A bubble for every day on GitHub in the last year, inflated by how much went in. Quiet days stay flat. Rebuilt every night.</p>
      </div>`;
    const aa = Number(new URLSearchParams(location.search).get("aa") || 2);
    const plate = shaderPlate({ ...ctx, frag: FRAG, vec: [weeks, aa, 0, 0], texture: { w: weeks, h: 7, pixels } });
    pushPalette(plate, pal);
    return { frame: (t) => plate.frame(t) };
  },
};
