// DROP 03 Custodian: a toy vault door with five combination dials, one per agent. They spin and
// click into line one at a time; only when all five agree does the wheel turn and the door open.
import { dropPlate } from "./drop.js";

const FRAG = /* glsl */ `
const vec3 DC = vec3(0., 1.15, .3);     // door centre when closed
const float DR = .86;
float dialA(int i){
  float fi = float(i);
  float T = .1 + fi * .065;
  float k = (2. + mod(fi, 2.)) * (mod(fi, 2.) == 0. ? 1. : -1.);
  return (1. - ease(uT / T)) * k * TAU;
}
float handleA(){ return .5 * PI * (ease((uT - .42) / .07) - ease((uT - .9) / .07)); }
float doorA(){ return 1.15 * (ease((uT - .5) / .14) - ease((uT - .78) / .12)); }
vec3 doorLocal(vec3 p){
  vec3 q = p - vec3(-DR, DC.y, DC.z);   // the hinge
  q.xz *= rot(-doorA());
  return q - vec3(DR, 0., 0.);
}
vec2 dialPos(int i){ float a = PI * (.84 - .17 * float(i)); return vec2(cos(a), sin(a)) * .56; }

vec2 map(vec3 p){
  // the frame: a squat safe body with a round opening, a little dark room inside
  vec3 f = p - vec3(0., 1.15, 0.);
  float body = sdRBox(f, vec3(1.18, 1.15, .32), .14);
  float hole = sdCyl((f - vec3(0., 0., .2)).xzy, DR + .02, .34);
  vec2 r = vec2(max(body, -hole), 1.);
  // gold inside
  for(int i = 0; i < 3; i++){
    float fi = float(i);
    // a stack of coins, each one nudged a little off the one below
    vec3 g = p - vec3(-.36 + fi * .36, .4, -.02);
    float n = 4. + fi * 3.;
    float c = clamp(floor(g.y / .07 + .5), 0., n - 1.);
    for(int k = -1; k <= 1; k++){
      float ck = clamp(c + float(k), 0., n - 1.);
      vec3 gc = g - vec3(.018 * sin(ck * 2.7 + fi), ck * .07, .018 * cos(ck * 1.9));
      r = opU(r, vec2(sdCyl(gc, .14, .028) - .004, 5.));
    }
  }
  // the door
  vec3 q = doorLocal(p);
  float door = sdCyl(q.xzy, DR - .02, .07);
  door = min(door, sdTorus(q.xzy - vec3(0., .07, 0.), vec2(DR - .1, .035)));
  r = opU(r, vec2(door, 2.));
  for(int i = 0; i < 5; i++){
    vec3 d = q - vec3(dialPos(i), .11);
    r = opU(r, vec2(sdCyl(d.xzy, .1, .04) - .01, 10. + float(i)));
  }
  vec3 hq = q - vec3(0., 0., .14);
  hq.xy *= rot(handleA());
  float hub = sdCyl(hq.xzy, .09, .07);
  for(int k = 0; k < 3; k++){
    vec3 s = hq; s.xy *= rot(float(k) * TAU / 3.);
    hub = min(hub, sdCapsule(s, vec3(0.), vec3(0., .34, .06), .028));
    hub = min(hub, length(s - vec3(0., .34, .06)) - .055);
  }
  r = opU(r, vec2(hub, 4.));
  r = opU(r, vec2(p.y, 6.));
  return r;
}
@POST

vec3 surface(vec3 p, vec3 n, vec3 rd, float id){
  if(id == 1.){
    // inside the opening it is dark; outside, cream vinyl
    vec3 f = p - vec3(0., 1.15, 0.);
    float inside = step(length(f.xy), DR + .05) * step(f.z, .3);
    return mix(vinyl(p, n, rd, vec3(.82, .8, .74), .9), vinyl(p, n, rd, vec3(.01), .4), inside);
  }
  if(id == 2.) return chromeIn(p, n, rd, vec3(.92, .93, .96));
  if(id == 4.) return chromeIn(p, n, rd, vec3(.95));
  if(id == 5.) return chromeIn(p, n, rd, vec3(1., .74, .36));
  // a dial: ink, with a white tick that ends up pointing straight up
  int i = int(id - 10.);
  vec3 q = doorLocal(p) - vec3(dialPos(i), .11);
  q.xy *= rot(-dialA(i));
  float tick = step(abs(q.x), .014) * step(.03, q.y) * step(q.y, .095) * step(.0, n.z - .5);
  return mix(vinyl(p, n, rd, vec3(.008), 1.), vec3(.95), tick);
}

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  if(h.y == 6.) return vec4(pageLin() * .3, floorShade(p) * .85);
  return vec4(surface(p, calcNormal(p), rd, h.y), 1.);
}

void main(){
  vec3 ro = vec3(2.4, 2.4, 7.), ta = vec3(0., 1.05, 0.);
  vec2 C = vec2(.6, .4) * uRes;
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec4 c = render(ro, camRay(ro, ta, (gl_FragCoord.xy + o - C) / uRes.y, 1.85));
    col += vec4(c.rgb * c.a, c.a);
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

export default dropPlate({
  name: "Custodian", short: "Custodian", drop: "03/06", repo: "Custodian", page: "#E882B4", fit: "me-pink",
  figX: 440, tagX: 956, frames: 120,
  lead: "A treasury run by five agents.",
  copy: "Language models propose. A fail-closed rules engine of caps, allowlists, cooldowns and velocity limits decides. Only the execution agent holds keys.",
  spray: { text: "No gate,<br>no go", x: 52, y: 268, size: 58, r: -7 },
  tag: [
    ["Minted", "DoraHacks Agent Economy 2026"],
    ["Materials", "TypeScript, KeeperHub, json-rules-engine, Sepolia"],
    ["Care", "Nothing executes unless the policy gate approved it first."],
    ["Status", "Policy gate and audit ledger live, 19 tests"],
  ],
  frag: FRAG,
});
