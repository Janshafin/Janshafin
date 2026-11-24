// Blue Carbon MRV: a core cut from a mangrove coast. The canopy and shallow water sit on top; the
// side shows the dark peat where blue carbon is actually stored. A survey line sweeps the canopy
// and every tile it passes is marked verified.
import { shaderPlate } from "./gl.js";
import { W, H, panelHTML } from "./panel.js";

const P = {
  name: "Blue Carbon", event: "Mangrove restoration registry", flip: true, scrim: "rgba(4,12,18,.84)",
  blurb: "Measurement, reporting and verification for mangrove restoration. Geotagged field photos, Sentinel-2 NDVI change analysis and EXIF checks feed a credit record on Ethereum Sepolia.",
  facts: [
    ["Guarantee", "A credit is recorded only with a score of 75 or more and zero flags."],
    ["Built with", "Python, FastAPI, Web3.py, React, Sentinel-2"],
    ["Status", "Development mode can stand in mock NDVI"],
  ],
};

const FRAG = /* glsl */ `
const vec3 C = vec3(-2.3, .95, 0.);
const float R = 1.75, HH = .5;
const vec3 SUN = normalize(vec3(-.75, .32, -.5));

vec3 toLocal(vec3 p){ vec3 q = p - C; q.xz *= rot(.5 + .22 * sin(TAU * uT)); return q; }
float canopyMask(vec2 x){ return smoothstep(.46, .66, fbm(vec3(x * .95, 2.1)) + .12 * (1. - length(x) / R)); }
float canopyH(vec2 x){
  float m = canopyMask(x);
  return m * (.07 + .07 * fbm(vec3(x * 7., 4.)) + .03 * noise(vec3(x * 24., 1.)));
}

vec2 map(vec3 p){
  vec3 q = toLocal(p);
  float cyl = sdCyl(q, R, HH);
  float top = q.y - HH - canopyH(q.xz);
  float d = max(length(q.xz) - R, top * .6);
  d = max(d, -q.y - HH);
  d = min(d, cyl);
  vec2 r = vec2(d, 1.);
  r = opU(r, vec2(p.y, 2.));
  return r;
}
@POST

vec3 sky(vec3 rd){
  vec3 c = mix(vec3(.12, .2, .26), vec3(.02, .05, .1), smoothstep(-.05, .6, rd.y));
  c += vec3(.9, .45, .3) * pow(max(dot(rd, SUN), 0.), 6.) * .35;
  return c;
}

float scanX(){ return mix(-R - .2, R + .2, ease(uT / .7)); }
float tileLit(vec2 x){
  vec2 cell = floor(x * 4.) + .5;
  float passed = step(cell.x / 4., scanX());
  float fadeOut = 1. - smoothstep(.82, .98, uT);
  return passed * fadeOut * step(.5, canopyMask(cell / 4.));
}

vec3 shade(vec3 p, vec3 n, vec3 rd){
  vec3 q = toLocal(p);
  float ao = calcAO(p, n);
  float sh = softShadow(p + n * .01, SUN, 10.);
  float dif = max(dot(n, SUN), 0.) * sh;
  vec3 sunC = vec3(2.2, 1.3, .85), skyC = vec3(.18, .32, .42);
  float onTop = step(HH - .005, q.y) * step(.6, n.y + .5);
  vec3 col;
  if(q.y > HH - .01 && length(q.xz) < R - .01){
    float m = canopyMask(q.xz);
    float hgt = canopyH(q.xz);
    if(m > .05 && hgt > .02){
      // canopy: dense, dark green with warm tips
      vec3 alb = mix(vec3(.02, .07, .035), vec3(.09, .2, .07), fbm(vec3(q.xz * 9., 3.)));
      alb = mix(alb, vec3(.25, .3, .1), smoothstep(.22, .32, hgt) * .5);
      col = alb * (dif * sunC + (.5 + .5 * n.y) * skyC * ao) * ao;
      // translucency toward the sun
      col += vec3(.2, .3, .05) * pow(max(dot(rd, SUN), 0.), 3.) * .3;
    } else {
      // shallow water over mud
      vec3 nw = normalize(n + .025 * vec3(sin(q.x * 22. + TAU * uT * 2.), 0, cos(q.z * 19. - TAU * uT * 2.)));
      float fre = .02 + .98 * pow(1. - max(dot(nw, -rd), 0.), 5.);
      vec3 deep = vec3(.03, .17, .2) * (.5 + .5 * sh);
      col = mix(deep, sky(reflect(rd, nw)) * 1.3, fre);
      col += sunC * pow(max(dot(reflect(rd, nw), SUN), 0.), 120.) * sh * .8;
    }
    // the survey line, and the tiles it has verified
    float dx = q.x - scanX();
    col += vec3(.5, 1., .95) * exp(-dx * dx * 5000.) * 1.6 + vec3(.3, .8, .9) * exp(-dx * dx * 120.) * .12 * (1. - smoothstep(.7, .78, uT));
    vec2 g = abs(fract(q.xz * 4.) - .5);
    float grid = smoothstep(.47, .5, max(g.x, g.y));
    col += vec3(1., .62, .35) * grid * tileLit(q.xz) * .7;
    col += vec3(1., .62, .35) * .05 * tileLit(q.xz);
  } else if(q.y < -HH + .005){
    col = vec3(.01);
  } else {
    // the cut face: water line, living roots, then layer on layer of dark peat and clay
    float y = q.y + .06 * fbm(vec3(atan(q.z, q.x) * 3., q.y * 2., 1.));
    vec3 peat = vec3(.035, .025, .02), clay = vec3(.16, .15, .15), silt = vec3(.3, .26, .2);
    float b = fract(y * 3.6 + .55 * fbm(vec3(q.xz * 2.2, y * 6.)));
    vec3 alb = mix(peat, clay, smoothstep(.55, .75, b) * smoothstep(.45, .1, q.y));
    alb = mix(alb, silt, smoothstep(-.25, -.45, y) * .7);
    alb = mix(alb, vec3(.06, .1, .06), smoothstep(.36, .46, y));   // roots near the surface
    alb *= .8 + .4 * noise(vec3(q * 40.));
    col = alb * (dif * sunC + skyC * ao * .9 + .05);
    // a carbon reading written into the peat as a faint vertical gauge
    col += vec3(.95, .6, .35) * smoothstep(.006, .0, abs(fract(atan(q.z, q.x) * 8. / TAU) - .5) - .002) * smoothstep(.0, -.4, q.y) * .06;
  }
  // a hairline rim where the core was cut
  col += vec3(.6, .8, .85) * smoothstep(.012, .0, abs(q.y - HH)) * smoothstep(R - .03, R, length(q.xz)) * .4;
  return col;
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  if(h.y < 0.) return vec3(.03, .07, .09);
  vec3 p = ro + rd * h.x;
  vec3 n = calcNormal(p);
  vec3 col;
  if(h.y == 1.) col = shade(p, n, rd);
  else {
    float sh = softShadow(p + vec3(0, .01, 0), SUN, 8.);
    float ao = calcAO(p, n);
    col = vec3(.02, .045, .06) * (.35 + .65 * sh) * ao;
    vec3 rr = reflect(rd, n);
    vec2 hr = march(p + n * .01, rr, 10.);
    if(hr.y == 1.){ vec3 q = p + rr * hr.x; col += shade(q, calcNormal(q), rr) * .2; }
    else col += sky(rr) * .06;
  }
  return mix(col, vec3(.03, .07, .09), 1. - exp(-max(h.x - 7., 0.) * .25));
}

void main(){
  vec3 ro = vec3(.4, 3.6, 9.2), ta = vec3(-.7, .7, 0.);
  vec3 col = vec3(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec2 uv = (gl_FragCoord.xy + o - .5 * uRes) / uRes.y;
    col += render(ro, camRay(ro, ta, uv, 1.9));
  }
  outColor = vec4(finish(col / 4., gl_FragCoord.xy), 1.);
}
`;

export default {
  w: W, h: H, frames: 120, fps: 24,
  html: panelHTML(P),
  async setup(ctx) { return shaderPlate({ ...ctx, frag: FRAG }); },
};
