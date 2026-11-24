// Hero, CHANGE THE FIT: the portfolio's opening, made for GitHub. Four fits, four colourways,
// a hard colour wipe between them, and a gloss-black ETH bag charm swinging on a ball chain.
import { shaderPlate, TAU } from "./gl.js";

const W = 1200, H = 720;
const FITS = [
  { page: "#F4845F", fig: "me-orange", name: "Stay focused" },
  { page: "#6EB5FF", fig: "me-blue", name: "Focus" },
  { page: "#6BBF7A", fig: "me-green", name: "Yeo!" },
  { page: "#E882B4", fig: "me-pink", name: "Soft launch" },
];

const FRAG = /* glsl */ `
const vec3 PIV = vec3(0., 3.4, 0.);
const float LEN = 2.;
float swing(){ return .16 * sin(TAU * uT * 2.) + .05 * sin(TAU * uT * 4. + 1.); }
vec3 down(){ float a = swing(); return normalize(vec3(sin(a), -cos(a), .25 * sin(a * 2.))); }

vec2 map(vec3 p){
  vec3 dir = down();
  vec3 end = PIV + dir * LEN;
  // ball chain: beads strung along the line
  vec3 q = p - PIV;
  float along = clamp(dot(q, dir), 0., LEN);
  float k = floor(along / .085 + .5) * .085;
  float bead = 1e9;
  for(int j = -1; j <= 1; j++){
    float s = clamp(k + float(j) * .085, 0., LEN);
    bead = min(bead, length(q - dir * s) - .032);
  }
  vec2 r = vec2(bead, 1.);
  // jump ring
  vec3 jr = p - end - dir * .06;
  r = opU(r, vec2(sdTorus(jr.xzy, vec2(.08, .022)), 1.));
  // the charm: the Ethereum mark, chunky vinyl, turning slowly on the chain
  vec3 c = p - end - dir * .5;
  c.xz *= rot(TAU * uT + .4);
  vec3 a = abs(c);
  float upper = max((a.x + a.z) - (.3 - (c.y - .03) * .5), .03 - c.y);
  float lower = max((a.x + a.z) - (.3 + (c.y + .03) * 1.12), c.y + .03);
  float eth = min(upper, lower) * .6 - .02;
  r = opU(r, vec2(eth, 3.));
  return r;
}
@POST

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  vec3 n = calcNormal(p);
  if(h.y == 1.) return vec4(chromeIn(p, n, rd, vec3(.95, .96, 1.)), 1.);
  // gloss-black: vinyl body with a black-chrome skin, so the facets catch the studio
  return vec4(vinyl(p, n, rd, vec3(.008), .9) + chromeIn(p, n, rd, vec3(.3)), 1.);
}

void main(){
  vec3 ro = vec3(0., .55, 7.4), ta = vec3(0., .55, 0.);
  vec2 C = vec2(.775, .6) * uRes;
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    col += render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 2.));
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

export default {
  w: W, h: H, frames: 128, fps: 24, page: FITS[3].page,
  under: `
    <div id="base" style="position:absolute;inset:0"></div>
    <div id="wipe" style="position:absolute;inset:0"></div>
    <div id="nm" class="wide" style="position:absolute;left:34px;right:34px;top:58px;display:flex;justify-content:space-between;font-size:150px;letter-spacing:.01em;white-space:nowrap">
      <span style="text-transform:none;font-weight:800">Jan</span><span>Shafin</span></div>
    ${FITS.map((f, i) => `<img id="f${i}" src="/models/${f.fig}.webp" style="position:absolute;left:50%;bottom:-430px;height:1100px;transform:translateX(-50%);transform-origin:50% 70%;opacity:0">`).join("")}`,
  html: `
    <div class="caps" style="position:absolute;left:40px;top:300px;font-size:17px;line-height:1.2">Web3 developer<br><span style="font-weight:600">and creative director.</span></div>
    <div class="caps" style="position:absolute;left:40px;top:362px;width:260px;font-size:13px;font-weight:600;line-height:1.35">I build Ethereum systems where autonomous agents can act, and can’t cheat.</div>
    <div class="caps" style="position:absolute;right:40px;top:300px;text-align:right;font-size:17px;line-height:1.2">Culture<br><span style="font-weight:600">plus code.</span></div>
    <div class="pill caps" style="position:absolute;left:28px;bottom:28px;font-size:13px">Get in touch <span class="dot">@</span></div>
    <div class="caps" style="position:absolute;left:50%;bottom:30px;transform:translateX(-50%);height:46px;display:flex;align-items:center;gap:12px;
      padding:0 8px 0 22px;border-radius:99px;background:rgba(255,255,255,.38);font-size:12px">
      Fit <span id="fitno">01/04</span><span id="fitname" style="background:var(--ink);color:#fff;height:32px;padding:0 16px;border-radius:99px;display:flex;align-items:center;font-size:13px"></span></div>
    <div class="caps" style="position:absolute;right:40px;bottom:44px;font-size:13px">Chennai, India</div>`,

  async setup(ctx) {
    const nmEl = ctx.under.querySelector("#nm");
    nmEl.style.justifyContent = "flex-start"; nmEl.style.gap = "0.32em";
    nmEl.style.fontSize = `${150 * (W - 68) / nmEl.scrollWidth}px`;
    nmEl.style.justifyContent = "space-between"; nmEl.style.gap = "0";
    const imgs = FITS.map((_, i) => ctx.under.querySelector(`#f${i}`));
    await Promise.all(imgs.map((im) => im.decode()));
    const base = ctx.under.querySelector("#base"), wipe = ctx.under.querySelector("#wipe");
    const no = ctx.ui.querySelector("#fitno"), nm = ctx.ui.querySelector("#fitname");
    const toy = shaderPlate({ ...ctx, frag: FRAG, page: FITS[0].page });
    return {
      frame(t) {
        const k = Math.floor(t * 4) % 4, u = t * 4 - Math.floor(t * 4);
        const prev = (k + 3) % 4;
        const w = ease(u / .22);                       // the wipe, from the figure outward
        base.style.background = FITS[w >= 1 ? k : prev].page;
        wipe.style.background = FITS[k].page;
        wipe.style.clipPath = `circle(${w * 110}% at 50% 62%)`;
        const showing = u < .07 ? prev : k;
        imgs.forEach((im, i) => {
          im.style.opacity = i === showing ? 1 : 0;
          const pop = i === k ? 1 - .05 * Math.exp(-Math.max(u - .07, 0) * 40) : 1;
          im.style.transform = `translateX(-50%) scale(${pop.toFixed(3)})`;
        });
        ctx.card.style.setProperty("--page", FITS[showing].page);
        no.textContent = `0${showing + 1}/04`;
        nm.textContent = FITS[showing].name;
        toy.setPage(FITS[showing].page);
        toy.frame(t);
      },
    };
  },
};
