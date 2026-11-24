// DROP 04 Blue Carbon: a designer-toy mangrove in a pot cut open on one side, so you can see the
// dark peat where blue carbon is stored. A tiny satellite circles and its scan ring sweeps the canopy.
import { dropPlate } from "./drop.js";

const FRAG = /* glsl */ `
const float PR = .95, PH = .55;          // pot radius and half height
vec3 satPos(){ float a = TAU * uT; return vec3(1.35 * cos(a), 2.75 + .08 * sin(2. * a), 1.35 * sin(a)); }
float scanY(){ return mix(2.4, 1.0, ease(fract(uT * 2.) / .7)); }

vec2 map(vec3 p){
  // the pot, with a quarter cut away to show the strata
  vec3 q = p - vec3(0., PH, 0.);
  float pot = sdCyl(q, PR, PH) - .04;
  float cut = max(-q.x, -q.z);           // remove the x>0, z>0 quarter
  float potCut = max(pot, -cut);
  vec2 r = vec2(potCut, 1.);
  // water on top, inside the rim
  r = opU(r, vec2(max(sdCyl(p - vec3(0., 2. * PH + .05, 0.), PR - .08, .02), -max(-p.x, -p.z)), 3.));
  // trunk and arched prop roots
  float tree = sdCapsule(p, vec3(0., 1.1, 0.), vec3(.03, 1.85, .02), .085);
  for(int i = 0; i < 6; i++){
    float a = float(i) * TAU / 6. + .4;
    vec3 base = vec3(cos(a) * .55, 1.12, sin(a) * .55);
    vec3 mid = vec3(cos(a) * .32, 1.48, sin(a) * .32);
    tree = smin(tree, sdCapsule(p, base, mid, .035), .04);
    tree = smin(tree, sdCapsule(p, mid, vec3(0., 1.6, 0.), .04), .05);
  }
  r = opU(r, vec2(tree, 4.));
  // the canopy: soft vinyl puffs
  float can = 1e9;
  for(int i = 0; i < 12; i++){
    float fi = float(i);
    float rr = i < 7 ? .5 : .24;
    vec3 c = vec3(rr * cos(fi * 2.4), 2.0 + .1 * sin(fi * 3.1) + (i < 7 ? 0. : .2), rr * sin(fi * 2.4));
    can = smin(can, length(p - c) - (.22 + .04 * sin(fi * 5.)), .1);
  }
  r = opU(r, vec2(can, 5.));
  // the satellite: a body and two panels
  vec3 s = p - satPos();
  s.xz *= rot(-TAU * uT);
  float sat = sdRBox(s, vec3(.08, .07, .07), .02);
  sat = min(sat, sdRBox(s - vec3(0., 0., .2), vec3(.06, .005, .12), .005));
  sat = min(sat, sdRBox(s + vec3(0., 0., .2), vec3(.06, .005, .12), .005));
  r = opU(r, vec2(sat, 8.));
  r = opU(r, vec2(p.y, 6.));
  return r;
}
@POST

vec3 surface(vec3 p, vec3 n, vec3 rd, float id){
  float sy = scanY();
  float scan = smoothstep(.03, .0, abs(p.y - sy)) * (1. - step(.7, fract(uT * 2.)));
  if(id == 1.){
    vec3 q = p - vec3(0., PH, 0.);
    // on the cut faces, layers of peat, clay and sand; outside, cream vinyl
    float cf = min(max(abs(q.x), -q.z), max(abs(q.z), -q.x));
    float onCut = step(cf, .02) * step(length(q.xz), PR - .02);
    float y = q.y + .03 * sin(q.x * 9. + q.z * 7.);
    vec3 strata = y > .3 ? vec3(.012, .01, .008) : y > .05 ? vec3(.05, .025, .012) : y > -.2 ? vec3(.01) : vec3(.35, .27, .16);
    strata = y > .46 ? vec3(.06, .2, .3) : strata;
    vec3 c = onCut > .5 ? vinyl(p, n, rd, strata, .4) : vinyl(p, n, rd, vec3(.82, .8, .74), .9);
    return c;
  }
  if(id == 3.) return vinyl(p, n, rd, vec3(.03, .2, .32), 1.2);
  if(id == 4.) return vinyl(p, n, rd, vec3(.09, .045, .02), .5);
  if(id == 5.){
    vec3 c = vinyl(p, n, rd, vec3(.015, .11, .03), .9);
    return c + vec3(.9, 1., .95) * scan * 2.5;
  }
  if(id == 8.) return chromeIn(p, n, rd, vec3(.95));
  return vec3(0);
}

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  vec4 col = vec4(0);
  if(h.y >= 0.){
    vec3 p = ro + rd * h.x;
    col = h.y == 6. ? vec4(pageLin() * .3, floorShade(p) * .85) : vec4(surface(p, calcNormal(p), rd, h.y), 1.);
  }
  // the scan beam: a faint cone from the satellite to the canopy
  vec3 s = satPos();
  float tb = clamp(dot(vec3(0., 2.2, 0.) - ro, rd), 0., h.y < 0. ? 30. : h.x);
  vec3 cp = ro + rd * tb;
  vec3 ax = normalize(vec3(0., 2.2, 0.) - s);
  float along = clamp(dot(cp - s, ax), 0., length(vec3(0., 2.2, 0.) - s));
  float dl = length(cp - s - ax * along);
  float beam = exp(-dl * dl / (.004 + along * .02)) * .35 * (1. - step(.7, fract(uT * 2.)));
  col.rgb = col.rgb * col.a + vec3(1.) * beam;
  col.a = max(col.a, beam);
  if(col.a > 0.) col.rgb /= col.a;
  return col;
}

void main(){
  vec3 ro = vec3(3.2, 3.4, 6.6), ta = vec3(0., 1.35, 0.);
  vec2 C = vec2(.6, .42) * uRes;
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec4 c = render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 1.7));
    col += vec4(c.rgb * c.a, c.a);
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

export default dropPlate({
  name: "Blue Carbon", short: "Blue Carbon", drop: "04/06", repo: "Blue-Carbon-MRV", page: "#6BBF7A", fit: "me-green",
  figX: 440, tagX: 956, frames: 96,
  lead: "Measurement, reporting and verification for mangrove restoration.",
  copy: "Geotagged field photos, Sentinel-2 NDVI change and EXIF checks feed a credit record on Ethereum Sepolia.",
  spray: { text: "75+ or<br>nothing", x: 52, y: 268, size: 58, r: -7 },
  tag: [
    ["Minted", "Mangrove restoration registry"],
    ["Materials", "Python, FastAPI, Web3.py, React, Sentinel-2"],
    ["Care", "Recorded only with a score of 75 or more and zero flags."],
    ["Status", "Development mode can stand in mock NDVI"],
  ],
  frag: FRAG,
});
