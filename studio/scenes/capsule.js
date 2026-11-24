// Capsule: the two builds that round out the drop, side by side on cream. Each turns on its own
// turntable: ADGENT as a shopping bag that only pays out on a settled sale, GigForge as an anvil.
import { shaderPlate, TAU } from "./gl.js";

const W = 1200, H = 620;

const FRAG = /* glsl */ `
int toy = 0;
float spinA(){ return TAU * uT; }

float bag(vec3 p){
  float body = sdRBox(p - vec3(0., .62, 0.), vec3(.42, .5, .2), .05);
  // the gusset fold: a soft crease down each side
  body += .012 * smoothstep(.02, .0, abs(abs(p.x) - .3));
  vec3 h = p - vec3(0., 1.12, 0.);
  float handle = 1e9;
  for(int i = -1; i <= 1; i += 2){
    vec3 hq = h - vec3(0., 0., float(i) * .1);
    handle = min(handle, max(length(vec2(length(hq.xy) - .2, hq.z)) - .028, -hq.y));
  }
  return min(body, handle);
}
float anvil(vec3 p){
  float base = sdRBox(p - vec3(0., .14, 0.), vec3(.42, .14, .26), .03);
  float waist = sdRBox(p - vec3(0., .42, 0.), vec3(.2, .16, .13), .03);
  float top = sdRBox(p - vec3(-.05, .7, 0.), vec3(.42, .12, .2), .03);
  // the horn
  vec3 hq = p - vec3(.37, .72, 0.);
  float horn = sdCapsule(hq, vec3(0.), vec3(.42, .03, 0.), .1);
  horn = max(horn, -sdCapsule(hq, vec3(.05, -.4, 0.), vec3(.6, -.27, 0.), .4)) ;
  horn = smin(horn, length(hq - vec3(.42, .03, 0.)) - .03, .08);
  return min(min(base, waist), smin(top, horn, .06));
}

vec2 map(vec3 p){
  vec2 r = vec2(p.y, 6.);
  // turntable
  r = opU(r, vec2(sdCyl(p - vec3(0., .045, 0.), .82, .045) - .01, 2.));
  vec3 q = p - vec3(0., .1, 0.);
  q.xz *= rot(spinA() + (toy == 0 ? .6 : 2.4));
  float d = toy == 0 ? bag(q) : anvil(q);
  r = opU(r, vec2(d, toy == 0 ? 3. : 4.));
  return r;
}
@POST

vec3 surface(vec3 p, vec3 n, vec3 rd, float id){
  if(id == 2.){
    float rim = smoothstep(.79, .81, length(p.xz));
    return mix(vinyl(p, n, rd, vec3(.8, .78, .72), .7), chromeIn(p, n, rd, vec3(.95)), rim);
  }
  vec3 q = p - vec3(0., .1, 0.);
  q.xz *= rot(spinA() + (toy == 0 ? .6 : 2.4));
  if(id == 3.){
    // orange bag, a white sticker on each face that says it pays only on a settled sale
    vec2 s = vec2(q.x, q.y - .6);
    float sticker = step(length(s), .17) * step(.19, abs(q.z));
    float ring = step(abs(length(s) - .12), .012) * sticker;
    float tick = sticker * step(abs(s.x + s.y * .55 - .0), .02) * step(-.08, s.y) * step(s.y, .06);
    vec3 c = vinyl(p, n, rd, vec3(.9, .24, .11), .9);
    if(q.y > 1.1) c = vinyl(p, n, rd, vec3(.008), 1.);
    c = mix(c, vinyl(p, n, rd, vec3(.86, .85, .8), .6), sticker);
    return mix(c, vec3(.01), max(ring, tick));
  }
  return vinyl(p, n, rd, vec3(.008), 1.1) + chromeIn(p, n, rd, vec3(.18));
}

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  if(h.y == 6.) return vec4(pageLin() * .3, floorShade(p) * .85);
  return vec4(surface(p, calcNormal(p), rd, h.y), 1.);
}

void main(){
  toy = gl_FragCoord.x < uRes.x * .5 ? 0 : 1;
  vec3 ro = vec3(0., 2.1, 5.4), ta = vec3(0., .62, 0.);
  vec2 C = vec2(toy == 0 ? .365 : .865, .36) * uRes;
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec4 c = render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 1.45));
    col += vec4(c.rgb * c.a, c.a);
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

const half = (x, p) => `
  <div style="position:absolute;left:${x + 40}px;top:42px;width:300px">
    <div class="caps" style="font-size:12px;display:flex;gap:14px"><span>Drop ${p.drop}</span><span style="opacity:.55">${p.minted}</span></div>
    <div class="wide" style="font-size:${p.size}px;margin-top:18px">${p.name}</div>
    <p class="caps" style="margin-top:22px;font-size:13px">${p.lead}</p>
    <p class="body" style="margin-top:10px;font-size:14.5px;color:rgba(11,11,11,.78)">${p.copy}</p>
  </div>
  <div style="position:absolute;left:${x + 40}px;bottom:40px;width:250px">
    ${p.rows.map(([k, v]) => `<div class="tagrow" style="display:grid;grid-template-columns:82px 1fr;gap:8px;padding:7px 0;border-top:1.5px solid var(--ink);font-size:11.5px;line-height:1.3;font-weight:560">
      <b style="font-stretch:115%;font-weight:800;font-size:10.5px;text-transform:uppercase">${k}</b><span>${v}</span></div>`).join("")}
  </div>
  <div class="spray" style="position:absolute;left:${x + 44}px;top:${p.sprayY}px;font-size:38px;transform:rotate(-7deg);color:var(--ink)">${p.spray}</div>`;

export default {
  w: W, h: H, frames: 96, fps: 24, page: "#EEF0E8",
  html: `
  <div style="position:absolute;left:600px;top:40px;bottom:40px;width:1.5px;background:rgba(11,11,11,.18)"></div>
  ${half(0, { drop: "05/06", minted: "PayPal AI Hackathon 2026", name: "Adgent", size: 92,
      lead: "Ads inside AI shopping agents.",
      copy: "Merchants launch campaigns from their PayPal sales data. The ads run inside AI shopping agents over MCP.",
      rows: [["Materials", "TypeScript, MCP, PayPal"], ["Care", "Paid only when a sale settles"]], spray: "Pay on<br>settle", sprayY: 432 })}
  ${half(600, { drop: "06/06", minted: "Live on Vercel", name: "GigForge", size: 76,
      lead: "An AI co-founder for freelancers.",
      copy: "Chat with it and it drafts proposals, qualifies leads and keeps the revenue pipeline moving.",
      rows: [["Materials", "Next.js, FastAPI, Gemini"], ["Status", "Live, gigforce-iota.vercel.app"]], spray: "Ship<br>solo", sprayY: 432 })}`,
  async setup(ctx) {
    const toy = shaderPlate({ ...ctx, frag: FRAG, page: "#EEF0E8" });
    return { frame: (t) => toy.frame(t) };
  },
};
