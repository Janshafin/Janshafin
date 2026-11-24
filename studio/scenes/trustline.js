// TrustLine: a frosted enclave with a warm core you can sense but not read. Inputs drift in and
// vanish; once per loop a single bit of light drops out and draws one line across the floor.
import { shaderPlate } from "./gl.js";
import { W, H, panelHTML } from "./panel.js";

const P = {
  name: "TrustLine", event: "ETHOnline, 2026", flip: true, scrim: "rgba(16,8,20,.82)",
  blurb: "A private solvency check for agent-to-agent payments. A Chainlink CRE confidential workflow compares balance and price inside an enclave, and a Privy policy wallet pays only when the answer is settle.",
  facts: [
    ["Guarantee", "The enclave reveals one bit: settle, or insufficient. Balances never leave it."],
    ["Built with", "Solidity, TypeScript, Chainlink CRE, Privy, x402"],
    ["Status", "CRE workflow runs in local simulation"],
  ],
};

const FRAG = /* glsl */ `
const vec3 C = vec3(-2.25, 1.35, -.2);
const vec3 KEY = normalize(vec3(.4, .9, .35));
const vec3 EMB = vec3(1., .46, .22);

vec3 toLocal(vec3 p){
  vec3 q = p - C;
  q.yz *= rot(.38); q.xy *= rot(-.22);
  q.xz *= rot(.5 + TAU * uT / 4.);      // a quarter turn per loop: the cube looks the same
  return q;
}
float cubeD(vec3 p){ return sdRBox(toLocal(p), vec3(.86), .14); }

vec3 inputPos(float i){
  float ph = fract(uT + i / 5.);
  vec3 a = C + vec3(-4.4 + .5 * sin(i * 2.1), .8 * cos(i * 1.7) + .2, -3.2 + .9 * sin(i * 3.3));
  return mix(a, C, smoothstep(0., 1., ph));
}
float inputD(vec3 p){
  float d = 1e9;
  for(int k = 0; k < 5; k++){
    float i = float(k), ph = fract(uT + i / 5.);
    vec3 q = p - inputPos(i);
    q.xy *= rot(ph * 3. + i); q.yz *= rot(ph * 2.);
    float s = .11 * smoothstep(0., .12, ph);
    d = min(d, sdRBox(q, vec3(s), .02));
  }
  return d;
}
// the bit: drops from the enclave, lands, runs across the floor
const vec3 DIR = normalize(vec3(.45, 0., 1.));
vec3 bitPos(out float alive){
  float u = uT;
  alive = smoothstep(.22, .27, u) * (1. - smoothstep(.86, .96, u));
  vec3 base = vec3(C.x, .07, C.z);
  float fall = clamp((u - .25) / .13, 0., 1.);
  float y = mix(C.y - .4, .07, fall * fall);
  float run = max(u - .38, 0.) / .58;
  return base + vec3(0, y - .07, 0) + DIR * (3.4 * (1. - pow(1. - run, 2.2)));
}

vec2 map(vec3 p){
  vec2 r = vec2(cubeD(p), 1.);
  r = opU(r, vec2(inputD(p), 3.));
  float al; vec3 b = bitPos(al);
  vec3 bq = p - b;
  bq.xz *= rot(-atan(DIR.z, DIR.x));
  r = opU(r, vec2(al > .01 ? sdCapsule(bq, vec3(-.09, 0, 0), vec3(.09, 0, 0), .055) : 1e9, 4.));
  r = opU(r, vec2(p.y, 2.));
  return r;
}
@POST

vec3 env(vec3 rd){
  vec3 c = mix(vec3(.05, .025, .055), vec3(.09, .05, .12), smoothstep(-.1, .7, rd.y));
  c += vec3(1.8, 1.6, 1.9) * smoothstep(.1, 0., abs(rd.x - .1) - .5) * smoothstep(.7, .85, rd.y);
  c += vec3(.9, .45, .5) * .5 * exp(-abs(rd.y - .02) * 10.);
  return c;
}

// light from the core reaching a point outside the enclave
vec3 coreLight(vec3 p, vec3 n){
  vec3 l = C - p; float d2 = dot(l, l);
  float pulse = .85 + .15 * sin(TAU * uT * 2.);
  return EMB * 5.5 * pulse * max(dot(n, normalize(l)), 0.) / (1. + d2 * 1.1);
}

vec3 floorCol(vec3 p){
  vec3 n = vec3(0, 1, 0);
  float sh = softShadow(p + n * .01, KEY, 8.);
  float ao = calcAO(p, n);
  vec3 c = vec3(.055, .032, .06) * (.3 + .7 * sh) * ao + vec3(.03, .015, .03);
  c += coreLight(p, n) * .32 * ao;
  // the line the bit leaves behind
  float al; vec3 b = bitPos(al);
  vec3 a0 = vec3(C.x, 0., C.z);
  vec2 pa = p.xz - a0.xz, ba = b.xz - a0.xz;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.);
  float d = length(pa - ba * h);
  float fade = smoothstep(.0, 1., h) * al * step(.38, uT);
  c += EMB * (exp(-d * 90.) * 2.2 + exp(-d * 9.) * .25) * fade;
  // a faint pool where the bit glows
  c += EMB * exp(-length(p.xz - b.xz) * 5.) * .9 * al;
  return c;
}

vec3 solid(vec3 p, vec3 n, vec3 rd, float id){
  if(id == 4.) return EMB * 7.;
  if(id == 2.) return floorCol(p);
  // the inputs: pale ceramic, lit warmly as they approach the core
  float ao = calcAO(p, n);
  vec3 c = vec3(.82, .78, .86) * (max(dot(n, KEY), 0.) * vec3(1.1, 1., 1.1) * .9 + .12 * ao) + coreLight(p, n) * .8;
  c += pow(1. - max(dot(n, -rd), 0.), 4.) * env(reflect(rd, n)) * .6;
  return c;
}

vec3 enclave(vec3 p, vec3 n, vec3 rd){
  vec3 q = toLocal(p);
  float frost = fbm(q * 2.6 + 3.);
  vec3 nf = normalize(n + (vec3(fbm(q * 5.), fbm(q * 5. + 7.), fbm(q * 5. + 13.)) - .5) * .35);
  float fre = .04 + .96 * pow(1. - max(dot(nf, -rd), 0.), 5.);
  vec3 refl = env(reflect(rd, nf));
  // walk through the frosted volume, gathering light from the core
  vec3 rdi = refract(rd, nf, 1. / 1.45);
  vec3 x = p - n * .02;
  float g = 0., ds = .045, through = 0.;
  for(int i = 0; i < 64; i++){
    if(cubeD(x) > 0.) break;
    float dc = length(x - C);
    float pulse = .85 + .15 * sin(TAU * uT * 2.);
    g += (exp(-max(dc - .2, 0.) * 2.6) * pulse + .5 * exp(-max(inputD(x), 0.) * 30.)) * ds;
    x += rdi * ds; through += ds;
  }
  vec3 behind = env(rdi) * .35;
  vec3 inner = EMB * g * (1.1 + .8 * frost) + vec3(1., .82, .7) * pow(g, 3.) * .5;
  // frosted faces catch a little scattered light of their own
  float edge = 1. - smoothstep(.0, .12, -sdBox(q, vec3(.86)) + .0);
  vec3 skin = vec3(.55, .45, .6) * (.08 + .1 * frost) + EMB * .25 * g;
  vec3 c = mix(behind + inner, skin, .25) + refl * fre * .8;
  c += vec3(.9, .7, .8) * .05 * max(dot(nf, KEY), 0.);
  return c;
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  if(h.y < 0.) return env(rd);
  vec3 p = ro + rd * h.x;
  vec3 n = calcNormal(p);
  vec3 col = h.y == 1. ? enclave(p, n, rd) : solid(p, n, rd, h.y);
  if(h.y == 2.){
    // satin floor: a dim, soft reflection
    vec3 rr = reflect(rd, n);
    vec2 hr = march(p + n * .01, rr, 12.);
    if(hr.y == 1.){ vec3 q = p + rr * hr.x; col += enclave(q, calcNormal(q), rr) * .12; }
    else if(hr.y >= 3.){ vec3 q = p + rr * hr.x; col += solid(q, calcNormal(q), rr, hr.y) * .18; }
  }
  return mix(col, vec3(.06, .03, .07), 1. - exp(-max(h.x - 9., 0.) * .1));
}

void main(){
  vec3 ro = vec3(.3, 2.3, 9.6), ta = vec3(-.55, .95, 0.);
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
  w: W, h: H, frames: 96, fps: 24,
  html: panelHTML(P),
  async setup(ctx) { return shaderPlate({ ...ctx, frag: FRAG }); },
};
