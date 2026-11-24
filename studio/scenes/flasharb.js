// DROP 01 flasharb: a Cuban-link chain lying on the sweep. An ETH pendant runs the whole chain
// once per loop and comes home: borrowed, traded, repaid, inside one unlock.
import { dropPlate } from "./drop.js";

const FRAG = /* glsl */ `
const float N = 22., R = 1.32;
const float LE = .115, R1 = .13, R2 = .056;
float sdLink(vec3 p, float le, float r1, float r2){
  vec3 q = vec3(p.x, max(abs(p.y) - le, 0.), p.z);
  return length(vec2(length(q.xy) - r1, q.z)) - r2;
}
vec3 frameP(vec3 p){
  p.y -= .2;
  p.yz *= rot(-.12);
  p.xz *= rot(TAU * uT / N * 2.);   // two links per loop: the chain looks identical at t = 1
  return p;
}
float pendT(){ return TAU * uT; }
vec3 pendantPos(){ float a = pendT() + 1.2; return vec3(R * cos(a), .28, R * sin(a)); }

vec2 map(vec3 p){
  vec3 q0 = frameP(p);
  float a = atan(q0.z, q0.x), st = TAU / N;
  float d = 1e9;
  float i0 = floor(a / st + .5);
  for(int k = -1; k <= 1; k++){
    float i = i0 + float(k);
    vec3 q = q0; q.xz *= rot(-i * st);
    q.x -= R;
    vec3 l = mod(i, 2.) == 0. ? vec3(q.x, q.z, q.y) : vec3(q.y, q.z, q.x);
    l.xz *= rot(mod(i, 2.) == 0. ? .5 : -.5);      // a Cuban link is twisted flat
    d = min(d, sdLink(l, LE, R1, R2));
  }
  vec2 r = vec2(d * .9, 1.);
  // the pendant: a chunky ETH diamond riding the chain
  vec3 pp = q0 - pendantPos();
  float pa = pendT() * 2.;
  pp.xz *= rot(pa);
  pp.y -= .12;
  vec3 a3 = abs(pp);
  // the Ethereum mark: a tall upper pyramid over a short lower one, split by a hairline
  float upper = max((a3.x + a3.z) - (.26 - (pp.y - .03) * .5), .03 - pp.y);
  float lower = max((a3.x + a3.z) - (.26 + (pp.y + .03) * 1.1), pp.y + .03);
  float dia = min(upper, lower) * .6 - .008;
  r = opU(r, vec2(dia, 3.));
  r = opU(r, vec2(p.y, 2.));
  return r;
}
@POST

vec4 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 30.);
  if(h.y < 0.) return vec4(0);
  vec3 p = ro + rd * h.x;
  if(h.y == 2.){
    float s = floorShade(p);
    return vec4(pageLin() * .32, s * .85);
  }
  vec3 n = calcNormal(p);
  if(h.y == 1.) return vec4(chromeIn(p, n, rd, vec3(1., .74, .36)), 1.);   // gold
  return vec4(vinyl(p, n, rd, vec3(.012), 1.), 1.);       // gloss-black vinyl pendant
}

void main(){
  vec3 ro = vec3(0., 6.1, 10.4), ta = vec3(0., .1, 0.);
  vec2 C = vec2(.618, .33) * uRes;   // where the toy sits on the plate
  vec4 col = vec4(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec2 uv = (gl_FragCoord.xy + o - C) / uRes.y;
    col += render(ro, camRay(ro, ta, uv, 2.1));
  }
  col /= 4.;
  if(col.a > 0.) col.rgb /= col.a;
  outColor = finishA(col, gl_FragCoord.xy);
}
`;

export default dropPlate({
  name: "Flasharb", short: "flasharb", drop: "01/06", repo: "flasharb", page: "#F4845F", fit: "me-orange",
  figX: 470, tagX: 956, frames: 96,
  lead: "Atomic flash arbitrage between Uniswap v4 and 1inch Aqua.",
  copy: "Borrow through v4 flash accounting, trade against an Aqua strategy, keep the spread. All inside one unlock.",
  spray: { text: "Repay<br>or revert", x: 52, y: 268, size: 58, r: -7 },
  tag: [
    ["Minted", "ETHGlobal Mumbai 2026"],
    ["Materials", "Solidity, Huff, Uniswap v4, 1inch Aqua, Foundry"],
    ["Care", "Repay in the same transaction or the whole trade reverts."],
    ["Status", "Runs end to end on a local chain"],
  ],
  frag: FRAG,
});
