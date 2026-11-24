// Custodian: five gimbal rings, one per agent. They tumble on their own axes and only come into
// one plane when the policy agrees; then, and only then, light passes through the centre.
import { shaderPlate } from "./gl.js";
import { W, H, panelHTML } from "./panel.js";

const P = {
  name: "Custodian", event: "DoraHacks Agent Economy, 2026", scrim: "rgba(12,9,8,.82)",
  blurb: "A treasury run by five agents. Language models propose; a fail-closed rules engine of caps, allowlists, cooldowns and velocity limits decides. Only the execution agent holds keys, and every step lands in a signed ledger.",
  facts: [
    ["Guarantee", "Nothing executes unless the policy gate approved it first."],
    ["Built with", "TypeScript, KeeperHub, json-rules-engine, Sepolia"],
    ["Status", "Policy gate and audit ledger live, 19 tests"],
  ],
};

const FRAG = /* glsl */ `
const vec3 C = vec3(2.45, 1.15, 0.);
const vec3 KEY = normalize(vec3(-.5, .8, .45));
const vec3 EMB = vec3(1., .55, .25);
const float FIRE = .93;   // the moment of agreement

float spin(){ return ease((uT - .06) / .74); }
float beamK(){ float d = abs(fract(uT - FIRE + .5) - .5); return exp(-d * d / .0035); }

float ringD(vec3 p, float R){
  vec2 q = vec2(length(p.xz) - R, p.y);
  return length(max(abs(q) - vec2(.045, .1) + .03, 0.)) - .03;
}
vec3 ringLocal(vec3 p, int i){
  vec3 q = p - C;
  q.yz *= rot(.62); q.xy *= rot(-.18);
  float fi = float(i);
  float a = TAU * (fi < 2. ? fi + 1. : (fi == 2. ? -1. : fi - 1.)) * spin();
  if(i % 2 == 0) q.yz *= rot(a); else q.xy *= rot(a);
  return q;
}
float radius(int i){ return 2.05 - float(i) * .34; }

vec2 map(vec3 p){
  vec2 r = vec2(1e9, -1.);
  for(int i = 0; i < 5; i++) r = opU(r, vec2(ringD(ringLocal(p, i), radius(i)), 10. + float(i)));
  // the treasury itself: a small dark sphere at the centre
  r = opU(r, vec2(length(p - C) - .2, 5.));
  r = opU(r, vec2(p.y + 1.35, 2.));
  return r;
}
@POST

vec3 env(vec3 rd){
  vec3 c = mix(vec3(.02, .014, .012), vec3(.07, .05, .045), smoothstep(-.2, .7, rd.y));
  c += vec3(2.4, 2.1, 1.8) * smoothstep(.1, 0., abs(rd.x + .1) - .45) * smoothstep(.7, .86, rd.y);
  c += vec3(2.2, 1.2, .55) * smoothstep(.06, 0., abs(rd.x - .85) - .04) * smoothstep(0., .3, .55 - abs(rd.y - .1));
  c += vec3(.8, .85, 1.1) * smoothstep(.06, 0., abs(rd.x + .9) - .05) * smoothstep(0., .3, .5 - abs(rd.y - .2));
  c += vec3(.6, .35, .2) * .22 * exp(-abs(rd.y) * 8.);
  return c;
}

vec3 floorCol(vec3 p){
  float sh = softShadow(p + vec3(0, .01, 0), KEY, 9.);
  float ao = calcAO(p, vec3(0, 1, 0));
  vec3 c = vec3(.04, .03, .026) * (.3 + .7 * sh) * ao;
  float b = beamK();
  c += EMB * 1.6 * b * exp(-length(p.xz - C.xz) * 1.6);
  c += vec3(.12, .08, .06) * exp(-length(p.xz - C.xz) * .4) * sh;
  return c;
}

vec3 metal(vec3 p, vec3 n, vec3 rd, float id){
  int i = int(id - 10.);
  vec3 q = ringLocal(p, i);
  float ao = calcAO(p, n);
  // brushed: streaks follow the ring, so the normal gets a little circumferential noise
  float ang = atan(q.z, q.x);
  float br = noise(vec3(ang * 90., q.y * 40., float(i) * 7.));
  vec3 nb = normalize(n + (br - .5) * .08 * normalize(vec3(-q.z, 0, q.x)));
  vec3 ref = reflect(rd, nb);
  float fre = pow(1. - max(dot(nb, -rd), 0.), 5.);
  vec3 tint = i == 2 ? vec3(1., .78, .52) : vec3(.92, .9, .88);
  vec3 c = env(ref) * tint * (.65 + .35 * fre) * (.35 + .65 * ao);
  c += tint * max(dot(nb, KEY), 0.) * .12 * softShadow(p + n * .01, KEY, 10.);
  // the inner face of each ring lights when they agree
  float inner = smoothstep(.0, -.04, length(q.xz) - radius(i)) * smoothstep(.06, .0, abs(q.y));
  c += EMB * inner * (beamK() * 6. + .15);
  return c;
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  vec3 col;
  if(h.y < 0.) col = env(rd) * .3;
  else {
    vec3 p = ro + rd * h.x;
    vec3 n = calcNormal(p);
    if(h.y >= 10.) col = metal(p, n, rd, h.y);
    else if(h.y == 5.) col = env(reflect(rd, n)) * .5 * vec3(.5, .45, .4) + EMB * beamK() * 3.;
    else {
      col = floorCol(p);
      vec3 rr = reflect(rd, n);
      vec2 hr = march(p + n * .01, rr, 10.);
      if(hr.y >= 10.){ vec3 q = p + rr * hr.x; col += metal(q, calcNormal(q), rr, hr.y) * .14; }
    }
    col = mix(col, vec3(.03, .02, .018), 1. - exp(-max(h.x - 9., 0.) * .12));
  }
  // the beam: a column of light through the centre, perpendicular to the agreed plane
  vec3 ax = vec3(0, 1, 0); ax.yz *= rot(-.62); ax.xy *= rot(.18);
  vec3 w = ro - C;
  vec3 c1 = cross(rd, ax);
  float dl = abs(dot(w, c1)) / max(length(c1), 1e-4);
  float b = beamK();
  float along = dot(ro + rd * dot(C - ro, rd) - C, ax);
  col += EMB * b * (exp(-dl * 40.) * 1.6 + exp(-dl * 6.) * .25) * smoothstep(3.2, .4, abs(along));
  return col;
}

void main(){
  vec3 ro = vec3(0., 2.2, 9.8), ta = vec3(.6, .75, 0.);
  vec3 col = vec3(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec2 uv = (gl_FragCoord.xy + o - .5 * uRes) / uRes.y;
    col += render(ro, camRay(ro, ta, uv, 1.85));
  }
  outColor = vec4(finish(col / 4., gl_FragCoord.xy), 1.);
}
`;

export default {
  w: W, h: H, frames: 120, fps: 24,
  html: panelHTML(P),
  async setup(ctx) { return shaderPlate({ ...ctx, frag: FRAG }); },
};
