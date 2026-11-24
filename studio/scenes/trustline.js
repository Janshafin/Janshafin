// DROP 02 TrustLine: a gachapon machine. A coin goes in, the knob turns, and exactly one capsule
// comes out. Whatever is inside the globe stays inside: the enclave answers with one bit.
import { dropPlate } from "./drop.js";

const FRAG = /* glsl */ `
bool noGlobe = false;
const vec3 GC = vec3(0., 1.72, 0.);
float knobA(){ return TAU * .5 * ease((uT - .14) / .2); }
vec3 capsuleOut(){
  float u = clamp((uT - .34) / .2, 0., 1.);
  float x = ease(u);
  vec3 p = mix(vec3(0., .32, .3), vec3(.55, .17, .98), x);
  p.y += .1 * sin(PI * x) * (1. - x);
  return p;
}
float outScale(){ return smoothstep(.33, .36, uT) * (1. - smoothstep(.9, .98, uT)); }
vec3 capCol(float i){
  i = mod(i, 4.);
  return i < 1. ? vec3(.9, .24, .1) : i < 2. ? vec3(.12, .5, .16) : i < 3. ? vec3(.8, .25, .45) : vec3(.85, .84, .8);
}

vec2 map(vec3 p){
  // body
  float body = sdRBox(p - vec3(0., .56, 0.), vec3(.62, .56, .56), .09);
  body = max(body, -sdRBox(p - vec3(0., .3, .6), vec3(.24, .15, .2), .05));   // the chute
  vec2 r = vec2(body, 1.);
  // collar and knob
  r = opU(r, vec2(sdTorus(p - vec3(0., 1.13, 0.), vec2(.56, .06)), 4.));
  vec3 k = p - vec3(0., .78, .6);
  k.xy *= rot(knobA());
  float knob = sdCyl(k.xzy, .17, .045);
  knob = min(knob, sdRBox(k - vec3(0., 0., .07), vec3(.2, .045, .04), .02));
  r = opU(r, vec2(knob, 4.));
  // the globe and what is sealed inside it
  if(!noGlobe) r = opU(r, vec2(abs(length(p - GC) - .6) - .01, 2.));
  float jig = .03 * sin(TAU * uT * 6.) * (1. - smoothstep(.0, .1, abs(uT - .24)));
  for(int i = 0; i < 8; i++){
    float fi = float(i);
    vec3 c = GC + vec3(.33 * cos(fi * 2.4), -.28 + .2 * floor(fi / 3.) + jig * mod(fi, 2.), .3 * sin(fi * 2.4));
    r = opU(r, vec2(length(p - c) - .17, 10. + fi));
  }
  // the one capsule that comes out
  float s = outScale();
  if(s > .01) r = opU(r, vec2(length(p - capsuleOut()) - .17 * s, 7.));
  // the coin
  float cu = uT / .13;
  if(cu < 1.){
    vec3 c = p - vec3(0., mix(2.9, 1.0, cu * cu), .64);
    c.xy *= rot(cu * 6.);
    r = opU(r, vec2(sdCyl(c.xzy, .1, .016), 5.));
  }
  r = opU(r, vec2(p.y, 6.));
  return r;
}
@POST

vec3 surface(vec3 p, vec3 n, vec3 rd, float id){
  if(id == 1.){
    vec3 c = vinyl(p, n, rd, vec3(.82, .8, .74), .9);
    // the coin slot and the chute mouth, printed in ink
    float slot = step(abs(p.x), .08) * step(abs(p.y - 1.0), .02) * step(.55, p.z);
    return mix(c, vec3(.01), slot);
  }
  if(id == 4.) return chromeIn(p, n, rd, vec3(.95));
  if(id == 5.) return chromeIn(p, n, rd, vec3(1., .74, .36));
  if(id == 7.){
    vec3 q = p - capsuleOut();
    q.xy *= rot(-ease(clamp((uT - .34) / .2, 0., 1.)) * 5.);
    return vinyl(p, n, rd, q.y > 0. ? vec3(.86, .85, .8) : vec3(.008), 1.);
  }
  if(id >= 10.) return vinyl(p, n, rd, capCol(id - 10.), 1.);
  return vec3(0);
}

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  if(h.y == 6.) return vec4(pageLin() * .3, floorShade(p) * .85);
  vec3 n = calcNormal(p);
  if(h.y != 2.) return vec4(surface(p, n, rd, h.y), 1.);
  // the globe: a clear dome. Highlights and a faint tint on top, the capsules seen through it
  vec3 rf = reflect(rd, n);
  float fre = .05 + .95 * pow(1. - abs(dot(n, rd)), 4.);
  vec3 skin = vec3(2.6) * smoothstep(.85, .95, dot(rf, KEYL)) + vec3(1.4) * smoothstep(.975, .995, dot(rf, normalize(vec3(.85, .25, .45))));
  noGlobe = true;
  vec2 h2 = march(p + rd * .03, rd, 10.);
  vec4 behind = vec4(0);
  if(h2.y >= 0. && h2.y != 6.){ vec3 q = p + rd * (h2.x + .03); behind = vec4(surface(q, calcNormal(q), rd, h2.y), 1.); }
  else if(h2.y == 6.) behind = vec4(pageLin() * .3, floorShade(p + rd * h2.x) * .85);
  noGlobe = false;
  vec3 tint = vec3(.85, .92, 1.);
  float a = max(behind.a, fre * .6);
  vec3 col = (behind.rgb * behind.a * tint * .92 + pageLin() * fre * .3 + skin * .9) / max(a, 1e-3);
  return vec4(col, clamp(a + length(skin) * .3, 0., 1.));
}

void main(){
  vec3 ro = vec3(1.2, 2.6, 7.6), ta = vec3(0., 1.1, 0.);
  vec2 C = vec2(.62, .44) * uRes;
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec4 c = render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 2.3));
    col += vec4(c.rgb * c.a, c.a);
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

export default dropPlate({
  name: "TrustLine", short: "TrustLine", drop: "02/06", repo: "TrustLine", page: "#6EB5FF", fit: "me-blue",
  figX: 440, tagX: 956, frames: 96,
  lead: "A private solvency check for agent-to-agent payments.",
  copy: "Balance and price are compared inside a Chainlink CRE enclave. The wallet only pays when the answer comes back settle.",
  spray: { text: "1 bit<br>out", x: 52, y: 268, size: 64, r: -7 },
  tag: [
    ["Minted", "ETHOnline 2026"],
    ["Materials", "Solidity, TypeScript, Chainlink CRE, Privy, x402"],
    ["Care", "Reveals one bit, settle or insufficient. Balances never leave."],
    ["Status", "CRE workflow runs in local simulation"],
  ],
  frag: FRAG,
});
