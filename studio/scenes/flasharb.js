// flasharb: two pools of liquid metal joined at the waist. A droplet of borrowed value runs a
// figure-eight through both and comes home; the pools trade volume but the sum never changes.
import { shaderPlate } from "./gl.js";
import { W, H, panelHTML } from "./panel.js";

const P = {
  name: "flasharb", event: "ETHGlobal Mumbai, 2026", scrim: "rgba(6,8,18,.8)",
  blurb: "Flash arbitrage between Uniswap v4 and 1inch Aqua. It borrows through v4 flash accounting, trades against an Aqua strategy and keeps the spread, all inside one unlock.",
  facts: [
    ["Guarantee", "Every borrowed token is repaid in the same transaction, or the whole trade reverts."],
    ["Built with", "Solidity, Huff, Uniswap v4, 1inch Aqua, Foundry"],
    ["Status", "Runs end to end on a local chain"],
  ],
};

const FRAG = /* glsl */ `
const vec3 C = vec3(2.35, 1.05, 0.);
vec3 dropPos(float s){ return vec3(2.25 * sin(s), 1.25 * sin(s) * cos(s), .95 * cos(s)); }

vec2 map(vec3 p){
  float s = TAU * uT;
  vec3 q = p - C;
  q.xz *= rot(-.35);
  float k = .09 * sin(s);
  float a = length(q - vec3(-.98, 0, 0)) - (.82 + k);
  float b = length(q - vec3( .98, 0, 0)) - (.82 - k);
  float d = smin(a, b, .85);
  // the droplet, and a second one half a loop behind
  d = smin(d, length(q - dropPos(s)) - .16, .5);
  d = smin(d, length(q - dropPos(s + PI)) - .1, .4);
  // a fine standing ripple on the metal
  d += .004 * sin(14. * q.x + 3. * s) * sin(12. * q.y - 2. * s) * sin(11. * q.z + s);
  vec2 r = vec2(d * .9, 1.);
  r = opU(r, vec2(p.y + .25, 2.));
  return r;
}
@POST

// a dark photo studio: one overhead softbox, a cool strip, a warm kicker
vec3 env(vec3 rd){
  vec3 c = mix(vec3(.012, .014, .03), vec3(.05, .055, .1), smoothstep(-.3, .6, rd.y));
  c += vec3(2.6, 2.5, 2.7) * smoothstep(.08, .0, abs(rd.x + .05) - .55) * smoothstep(.72, .86, rd.y);
  c += vec3(1.2, 1.4, 2.) * smoothstep(.06, .0, abs(rd.x + .86) - .06) * smoothstep(.0, .2, .55 - abs(rd.y - .15));
  c += vec3(2.4, 1.1, .5) * smoothstep(.07, .0, abs(rd.x - .78) - .05) * smoothstep(.0, .25, .5 - abs(rd.y - .05)) * step(rd.z, .2);
  c += vec3(.5, .4, .7) * .25 * exp(-abs(rd.y) * 9.);
  return c;
}

vec3 floorCol(vec3 p, vec3 rd){
  float sh = softShadow(p + vec3(0, .01, 0), normalize(vec3(-.1, 1., .15)), 6.);
  float ao = calcAO(p, vec3(0, 1, 0));
  vec3 c = vec3(.035, .038, .07) * (.25 + .75 * sh) * ao;
  float r = length(p.xz - C.xz);
  c += vec3(.12, .1, .2) * exp(-r * .35) * sh;
  return c;
}

vec3 metal(vec3 p, vec3 n, vec3 rd){
  vec3 ref = reflect(rd, n);
  vec2 h = march(p + n * .02, ref, 20.);
  vec3 rc;
  if(h.y == 1.) rc = env(reflect(ref, calcNormal(p + ref * h.x))) * vec3(.85, .87, .92);
  else if(h.y == 2.) rc = floorCol(p + ref * h.x, ref);
  else rc = env(ref);
  float fre = .78 + .22 * pow(1. - max(dot(n, -rd), 0.), 5.);
  float ao = calcAO(p, n);
  return rc * vec3(.9, .92, .96) * fre * (.4 + .6 * ao);
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 40.);
  if(h.y < 0.) return env(rd) * .35;
  vec3 p = ro + rd * h.x;
  vec3 n = calcNormal(p);
  vec3 col = h.y == 1. ? metal(p, n, rd) : floorCol(p, rd);
  if(h.y == 2.){
    // glossy floor: a soft, dim reflection of the metal
    vec3 rr = reflect(rd, vec3(0, 1, 0));
    vec2 hr = march(p + vec3(0, .01, 0), rr, 20.);
    if(hr.y == 1.){ vec3 q = p + rr * hr.x; col += metal(q, calcNormal(q), rr) * .22 * exp(-hr.x * .9); }
  }
  return mix(col, vec3(.02, .022, .045), 1. - exp(-max(h.x - 8., 0.) * .12));
}

void main(){
  vec3 ro = vec3(0., 1.75, 9.4), ta = vec3(.55, .65, 0.);
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
