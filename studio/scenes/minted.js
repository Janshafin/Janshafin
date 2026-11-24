// The MINTED TYPE plate: one shader that renders puffy letters (plus optional scene props) in a
// studio sweep with a glossy floor. Scenes supply choreography in JS and optional GLSL hooks.
import { shaderPlate } from "./gl.js";
import { TYPE_GLSL, glyphAtlas, pushLetters, pushPalette, seeded, chrome, PALETTES } from "./type3d.js";

const BASE = (pre, post) => /* glsl */ `
${TYPE_GLSL}
${pre}
uniform vec3 uCam, uTa;
uniform float uZoom, uMat0, uFloorY;
uniform vec3 uCandy;
#ifndef PROPS
float props(vec3 p){ return 1e9; }
#endif
vec2 map(vec3 p){
#ifdef NOLETTERS
  vec2 r = vec2(1e9, 1.);
#else
  vec2 r = vec2(letters(p), 1.);
#endif
  float pr = props(p);
  if(pr < r.x) r = vec2(pr, 3.);
  float f = p.y - uFloorY;
  if(f < r.x) r = vec2(f, 2.);
  return r;
}
@POST
const vec3 KEY = normalize(vec3(-.45, .85, .4));
${post}
#ifndef PROPS
vec3 propShade(vec3 p, vec3 n, vec3 rd){ return vec3(0); }
#endif
#ifndef FLOORFX
vec3 floorFx(vec3 p){ return vec3(0); }
#endif
#ifndef FLOORN
vec3 floorN(vec3 p){ return vec3(0, 1, 0); }
#endif
vec3 shadeLetter(vec3 p, vec3 n, vec3 rd, float mat, float glow, bool bounce){
  vec3 r = reflect(rd, n);
  float fre = pow(1. - max(dot(n, -rd), 0.), 5.);
  float ao = calcAO(p, n);
  vec3 env = studio(r);
  // the floor, seen in the letter, reads as the floor colour
  env = mix(env, uFloor * .55, smoothstep(.02, -.2, r.y));
  if(bounce){
    vec2 h = march(p + n * .02, r, 12.);
    if(h.y == 1. || h.y == 3.){ vec3 q = p + r * h.x; vec3 n2 = calcNormal(q); env = studio(reflect(r, n2)) * .7; }
  }
  vec3 c;
  if(mat < .5) c = env * vec3(.96, .97, 1.);                                     // mercury
  else if(mat < 1.5){                                                           // pearl
    float th = .55 + .35 * noise(p * 2.3) + .2 * n.y;
    c = env * mix(vec3(1.), film(max(dot(n, -rd), 0.), th, 0.) * 1.35, .7);
  } else if(mat < 2.5){                                                         // candy vinyl
    float sh = softShadow(p + n * .02, KEY, 10.);
    float wrap = clamp((dot(n, KEY) + .3) / 1.3, 0., 1.);
    c = uCandy * (wrap * mix(.4, 1., sh) + .35 * ao) + env * (.06 + .5 * fre) + vec3(2.) * smoothstep(.9, .98, dot(r, KEY));
  } else c = env * .16 + vec3(2.2) * smoothstep(.88, .97, dot(r, KEY)) * .6 + env * fre * .5;   // black chrome
  c *= .45 + .55 * ao;
  return c + uRim * glow;
}
vec3 shade(vec3 p, vec3 rd, float id, bool bounce){
  map(p);
  int i = int(letterId);          // capture before the normal samples move it
  vec3 n = calcNormal(p);
  if(id == 1.) return shadeLetter(p, n, rd, uX[i].y, uX[i].z, bounce);
  return propShade(p, n, rd);
}
vec3 render(vec3 ro, vec3 rd){
  vec2 h = march(ro, rd, 60.);
  if(h.y < 0.) return studioBg(rd);
  vec3 p = ro + rd * h.x;
  if(h.y != 2.) return shade(p, rd, h.y, true);
  // the glossy floor: a soft reflection, contact shadows, and whatever the scene draws on it
  vec3 fn = floorN(p);
  vec3 r = reflect(rd, fn);
  vec2 hr = march(p + vec3(0, .01, 0), r, 20.);
  vec3 refl = hr.y < 0. || hr.y == 2. ? studioBg(r) : shade(p + r * hr.x, r, hr.y, false);
  float fre = .08 + .92 * pow(1. - max(dot(-rd, fn), 0.), 5.);
  float sh = softShadow(p + vec3(0, .01, 0), KEY, 8.);
  float ao = calcAO(p, vec3(0, 1, 0));
  vec3 c = mix(uFloor * (.35 + .65 * sh) * ao, refl * .8, clamp(fre * .9 + .12, 0., 1.)) + floorFx(p);
  // the floor melts into the sweep with distance
  return mix(c, studioBg(rd), smoothstep(14., 34., h.x));
}
void main(){
  vec3 col = vec3(0);
  int AA = int(uData.y);
  for(int j = 0; j < AA; j++) for(int i = 0; i < AA; i++){
    vec2 o = (vec2(i, j) + .5) / float(AA) - .5;
    col += render(uCam, camRay(uCam, uTa, (gl_FragCoord.xy + o - .5 * uRes) / uRes.y, uZoom));
  }
  col /= float(AA * AA);
  col = col / (1. + max(col - .9, 0.) * .8);
  col = pow(clamp(col, 0., 1.), vec3(1. / 2.2));
  vec2 q = gl_FragCoord.xy / uRes;
  col *= .82 + .18 * pow(16. * q.x * q.y * (1. - q.x) * (1. - q.y), .25);
  outColor = vec4(col, 1.);
}
`;

/**
 * opts: { w, h, frames, repo, index, palettes[], materials[], chars, glsl (hooks, optional),
 *         cam:{ro,ta,zoom}, R, traits(seedInfo) -> [[k,v,r]], choreo(t, ctx) -> letters, extra(plate, t) }
 */
export function minted(o) {
  return {
    w: o.w, h: o.h, frames: o.frames, fps: 24,
    html: "",
    async setup(ctx) {
      const sha = ctx.repos?.[o.repo]?.sha || "0000000000000000";
      const S = seeded(sha);
      const pal = S.pick(o.palettes), mat = S.pick(o.materials);
      await document.fonts.load('900 196px "Unbounded"', o.chars);
      const atlas = glyphAtlas(o.chars, { S: o.cell ?? 1.6 });
      const ui = chrome({ index: o.index, seed: `0x${sha.slice(0, 10)}`, pal,
        traits: o.traits({ pal, mat, sha: sha.slice(0, 7) }) });
      const lede = o.lede ? `<p class="lede" style="left:32px;top:52px;width:540px;color:${PALETTES[pal].ink};opacity:.85">${o.lede}</p>` : "";
      ctx.ui.innerHTML = ui + lede + (o.overlay ? o.overlay(PALETTES[pal]) : "");
      await Promise.all([...ctx.ui.querySelectorAll("img")].map((im) => im.decode()));
      const aa = Number(new URLSearchParams(location.search).get("aa") || 2);
      const frag = BASE(o.glsl || "", o.glslAfter || "");
      const plate = shaderPlate({ ...ctx, frag, vec: [0, aa, 0, 0], texture: atlas.texture });
      plate.set("uGlyphs", atlas.count); plate.set("uCell", atlas.S); plate.set("uR", o.R ?? .15);
      plate.set("uCam", o.cam.ro, 3); plate.set("uTa", o.cam.ta, 3); plate.set("uZoom", o.cam.zoom);
      plate.set("uFloorY", o.floorY ?? 0);
      pushPalette(plate, pal);
      const matId = ["Mercury", "Pearl", "Candy", "Black chrome", "Frosted"].indexOf(mat);
      plate.set("uMat0", matId);
      plate.set("uCandy", (o.candy || [.9, .2, .5]), 3);
      const env = { atlas, S, pal, mat, matId, sha };
      if (o.init) o.init(env);
      return {
        frame(t) {
          pushLetters(plate, o.choreo(t, env));
          if (o.extra) o.extra(plate, t, env);
          plate.frame(t);
        },
      };
    },
  };
}
