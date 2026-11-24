// Hero: a chain as architecture. Ceramic blocks stack into a slow twisting tower that sinks
// into still water at dusk; each loop a new block drops onto the top and its seam lights as it finalizes.
import { shaderPlate } from "./gl.js";

export const FRAG = /* glsl */ `
const float H = .34;      // block pitch
const float TW = .31;     // twist per block
const float TOP = 9.;     // the incoming block; the resting stack is every level below it
const float LAND = .46;   // when it lands
const vec3 TOWER = vec3(2.05, 0., -.4);
const vec3 SUN = normalize(vec3(-.7, .3, .32));     // key: low, from the left
const vec3 GLOW = normalize(vec3(.5, .07, -.86));   // where the sun has just set

float fallOffset(float s){
  float x = clamp(s / LAND, 0., 1.);
  float d = 5.2 * (1. - x) * (1. - x);
  // a small settle after contact
  float a = max(s - LAND, 0.);
  return d + .035 * sin(a * 40.) * exp(-a * 18.);
}
float levelY(float i, float s){ return (i - s) * H + (i == TOP ? fallOffset(s) : 0.); }
float levelR(float i, float s){
  float spin = i == TOP ? 1.4 * pow(1. - clamp(s / LAND, 0., 1.), 2.) : 0.;
  return (i - s) * TW + spin;
}
vec3 local(vec3 p, float i){
  float s = uT;
  vec3 q = p - TOWER;
  q.y -= levelY(i, s);
  q.xz *= rot(levelR(i, s));
  return q;
}
float slab(vec3 q){ return sdRBox(q, vec3(1.08, .135, .66), .028); }

vec2 map(vec3 p){
  float s = uT;
  vec3 q0 = p - TOWER;
  float c0 = floor(q0.y / H + s + .5);
  float d = 1e9, id = -1.;
  for(int k = -1; k <= 1; k++){
    float i = min(c0 + float(k), TOP - 1.);
    if(i < -2.) continue;
    float e = slab(local(p, i));
    if(e < d){ d = e; id = 20. + i; }
  }
  float f = slab(local(p, TOP));
  if(f < d){ d = f; id = 20. + TOP; }
  vec2 r = vec2(d, id);
  // distant chains in the haze
  r = opU(r, vec2(p.y, 2.));
  return r;
}
@POST

vec3 sky(vec3 rd){
  float y = rd.y;
  vec3 top = vec3(.025, .022, .07), mid = vec3(.14, .1, .26), hor = vec3(.8, .42, .34);
  vec3 c = mix(hor, mid, smoothstep(-.02, .22, y));
  c = mix(c, top, smoothstep(.16, .75, y));
  float sd = max(dot(rd, GLOW), 0.);
  c += vec3(1., .42, .22) * pow(sd, 10.) * .38 + vec3(1., .6, .4) * pow(sd, 60.) * .6;
  // a faint band of high cloud
  float cl = fbm(vec3(rd.x * 3. / (y + .25), rd.y * 18., 1.3));
  c += vec3(1., .6, .5) * smoothstep(.55, .8, cl) * .12 * smoothstep(.0, .06, y) * (1. - smoothstep(.1, .3, y));
  return c;
}

float glowAge(float i){ return uT + (TOP - i) - LAND; }

vec3 shadeSolid(vec3 p, vec3 n, vec3 rd, float id){
  float ao = calcAO(p, n);
  vec3 ref = reflect(rd, n);
  float fre = pow(1. - max(dot(n, -rd), 0.), 5.);
  float sh = softShadow(p + n * .01, SUN, 12.);
  float dif = max(dot(n, SUN), 0.) * sh;
  float fill = max(dot(n, normalize(vec3(-.7, .45, .6))), 0.);
  float up = .5 + .5 * n.y;
  float down = max(-n.y, 0.);
  vec3 col;
  if(id >= 10.){
    float i = id - 20.;
    vec3 q = local(p, i);
    vec3 alb = vec3(.84, .8, .88);
    float back = max(dot(n, GLOW), 0.);
    col = alb * (dif * vec3(2.5, 1.5, 1.0) + up * vec3(.16, .13, .3) * ao + back * vec3(.9, .42, .3) * ao
                 + down * vec3(.3, .15, .14) * ao);
    col += (.04 + .5 * fre) * sky(ref) * ao * mix(.4, 1., sh);
    // the seam: a hairline groove around each block, with a hash written along it
    float side = 1. - abs(n.y);
    float seam = smoothstep(.016, .006, abs(q.y)) * side;
    float cell = floor(q.x * 22.) + floor(q.z * 22.) * 7. + i * 31.;
    float bits = step(.45, hash12(vec2(cell, i))) * smoothstep(.05, .02, abs(q.y + .055)) * side;
    float age = glowAge(i);
    float hot = age >= 0. ? exp(-age * 2.4) : 0.;
    vec3 ember = vec3(1., .5, .26);
    col *= 1. - seam * .55;
    col += seam * (ember * 5. * hot + vec3(.45, .48, 1.) * .5);
    col = mix(col, col * .55 + ember * 3. * hot, bits * .35);
  } else if(id == 3.){
    col = vec3(.12, .09, .2) + vec3(.5, .3, .25) * max(dot(n, SUN), 0.) * .4;
  } else {
    col = vec3(.03, .025, .06);
  }
  return col;
}

vec3 fogged(vec3 col, vec3 rd, float t){
  vec3 fc = mix(vec3(.62, .34, .32), vec3(.16, .11, .27), smoothstep(-.1, .25, rd.y));
  fc += vec3(1., .5, .3) * pow(max(dot(rd, GLOW), 0.), 8.) * .3;
  return mix(col, fc, 1. - exp(-t * .024));
}

vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 90.);
  if(h.y < 0.) return sky(rd);
  vec3 p = ro + rd * h.x;
  if(h.y == 2.){
    // still water: rings spread from where the tower meets it
    vec2 d = p.xz - TOWER.xz;
    float r = length(d);
    float w = sin(r * 13. - TAU * uT * 3.) * exp(-r * .45) * .5 + (noise(vec3(p.xz * 3.5, 0.)) - .5) * .25;
    vec3 n = normalize(vec3(d / max(r, .001) * w * .06, 1.).xzy);
    vec3 rr = reflect(rd, n);
    vec2 hr = march(p + n * .01, rr, 60.);
    vec3 rc = hr.y < 0. ? sky(rr) : fogged(shadeSolid(p + rr * hr.x, calcNormal(p + rr * hr.x), rr, hr.y), rr, hr.x);
    float fre = .06 + .94 * pow(1. - max(dot(n, -rd), 0.), 5.);
    float sh = softShadow(p + vec3(0, .01, 0), SUN, 10.);
    vec3 base = vec3(.035, .028, .07) * (.4 + .6 * sh);
    vec3 col = mix(base, rc * .85, clamp(fre * 1.35, 0., 1.));
    return fogged(col, rd, h.x);
  }
  return fogged(shadeSolid(p, calcNormal(p), rd, h.y), rd, h.x);
}

void main(){
  vec3 ro = vec3(-.2, 1.15, 8.6), ta = vec3(.7, 1.95, 0.);
  vec3 col = vec3(0);
  for(int j = 0; j < 2; j++) for(int i = 0; i < 2; i++){
    vec2 o = vec2(i, j) / 2. - .25;
    vec2 uv = (gl_FragCoord.xy + o - .5 * uRes) / uRes.y;
    col += render(ro, camRay(ro, ta, uv, 1.65));
  }
  col /= 4.;
  outColor = vec4(finish(col, gl_FragCoord.xy), 1.);
}
`;

export default {
  w: 1200, h: 640, frames: 120, fps: 24,
  html: `
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,11,28,.55) 0%,rgba(14,11,28,.2) 34%,rgba(14,11,28,0) 52%)"></div>
  <div style="position:absolute;left:64px;bottom:58px;width:560px">
    <h1 class="display" style="font-size:118px">Jan Shafin</h1>
    <p class="lede" style="margin-top:26px;max-width:470px;font-size:22px">
      I build Ethereum systems where autonomous agents can act, and can’t cheat.</p>
  </div>
`,

  async setup(ctx) {
    return shaderPlate({ ...ctx, frag: FRAG });
  },
};
