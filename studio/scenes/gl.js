// Ray-marched plates: each scene is one fragment shader drawn on a full-screen triangle.
// The shader gets uT in [0,1) and must loop seamlessly at t = 1.

export const TAU = Math.PI * 2;

const PRE = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform vec4 uData;
uniform vec3 uPage;   // the plate's page colour, sRGB
uniform sampler2D uTex;
out vec4 outColor;
#define TAU 6.28318530718
#define PI 3.14159265359

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for(int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
float sdTorus(vec3 p, vec2 t){ return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float sdOcta(vec3 p, float s){ p = abs(p); return (p.x + p.y + p.z - s) * .57735027; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdCyl(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
vec2 opU(vec2 a, vec2 b){ return a.x < b.x ? a : b; }

// thin-film interference, cheap: a cosine palette driven by optical path
vec3 film(float c, float d){ return .5 + .5 * cos(TAU * (d * (1.6 - c) + vec3(0., .33, .67))); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
float ease(float x){ x = clamp(x, 0., 1.); return x * x * (3. - 2. * x); }

// camera: ray direction for pixel uv (-1..1 on the short axis)
vec3 camRay(vec3 ro, vec3 ta, vec2 uv, float zoom){
  vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0, 1, 0))), u = cross(r, f);
  return normalize(uv.x * r + uv.y * u + zoom * f);
}
`;

// Helpers that need the scene's map(); spliced in where a scene writes @POST.
const POST = /* glsl */ `
vec3 calcNormal(vec3 p){
  const vec2 e = vec2(1, -1) * .0007;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
vec2 march(vec3 ro, vec3 rd, float tmax){
  float t = 0.; vec2 h = vec2(1e9, -1.);
  for(int i = 0; i < 220; i++){
    h = map(ro + rd * t);
    if(abs(h.x) < .0004 * t + .0002) return vec2(t, h.y);
    t += h.x * .9;
    if(t > tmax) break;
  }
  return vec2(tmax, -1.);
}
float softShadow(vec3 ro, vec3 rd, float k){
  float res = 1., t = .02;
  for(int i = 0; i < 64; i++){
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, .01, .3);
    if(res < .002 || t > 14.) break;
  }
  return clamp(res, 0., 1.);
}
float calcAO(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for(int i = 0; i < 5; i++){ float h = .02 + .11 * float(i); o += (h - map(p + n * h).x) * s; s *= .8; }
  return clamp(1. - 1.6 * o, 0., 1.);
}

// ---- the toy studio: a sweep lit in the page colour, softboxes for the gloss ----
vec3 pageLin(){ return pow(uPage, vec3(2.2)); }
const vec3 KEYL = normalize(vec3(-.55, .85, .55));
// glossy designer-toy vinyl. alb is linear colour; gloss 0..1
vec3 vinyl(vec3 p, vec3 n, vec3 rd, vec3 alb, float gloss){
  float ao = calcAO(p, n);
  float sh = softShadow(p + n * .01, KEYL, 10.);
  float wrap = clamp((dot(n, KEYL) + .3) / 1.3, 0., 1.);
  vec3 c = alb * (wrap * mix(.35, 1., sh) * 1.05 + .32 * ao * (.65 + .35 * n.y));
  c += alb * pageLin() * .45 * clamp(.5 - .5 * n.y, 0., 1.) * ao;          // bounce off the sweep
  vec3 r = reflect(rd, n);
  float fre = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
  float box = smoothstep(.8, .96, dot(r, KEYL));
  float strip = smoothstep(.975, .995, dot(r, normalize(vec3(.85, .25, .45))));
  c += (box * 1.25 * mix(.2, 1., sh) + strip * .8) * gloss * (.3 + .7 * fre);
  c += fre * pageLin() * .5 * ao * gloss;                                     // the studio, reflected
  return c;
}
// polished metal in the same studio
vec3 chromeIn(vec3 p, vec3 n, vec3 rd, vec3 tint){
  float ao = calcAO(p, n);
  vec3 r = reflect(rd, n);
  // product-shot studio: dark flags all round, the page colour on the floor, hard white softboxes
  vec3 env = vec3(.012);
  env += pageLin() * .55 * smoothstep(.05, -.25, r.y);
  env += vec3(3.2) * smoothstep(.82, .93, dot(r, KEYL));
  env += vec3(2.2) * smoothstep(.06, .0, abs(r.x - .55) - .08) * smoothstep(-.1, .3, r.y) * step(0., r.z);
  env += vec3(1.4) * smoothstep(.04, .0, abs(r.x + .8) - .05) * smoothstep(.0, .2, .6 - abs(r.y - .2));
  env += pageLin() * .35 * smoothstep(.0, .2, r.y) * smoothstep(.4, .0, abs(r.z + .7));
  return env * tint * (.4 + .6 * ao);
}
// how much the sweep is darkened at a floor point: 0 = page colour, 1 = deep shadow
float floorShade(vec3 p){
  float sh = softShadow(p + vec3(0, .01, 0), KEYL, 7.);
  float ao = calcAO(p, vec3(0, 1, 0));
  return clamp((1. - sh) * .42 + (1. - ao) * .75, 0., 1.);
}
`;

// Shared finishing: tone map, vignette, grain. The grain is keyed to the frame so it loops.
const FINISH = /* glsl */ `
// for plates that sit on a flat page colour: no tone curve, so an unlit sweep equals the page exactly
vec4 finishA(vec4 c, vec2 frag){
  vec3 col = c.rgb;
  col = col / (1. + max(col - .85, 0.) * .9);       // soften only the hot highlights
  col = pow(clamp(col, 0., 1.), vec3(1. / 2.2));
  col += (hash12(frag + fract(uT * 7.13) * 911.) - .5) * .012 * c.a;
  return vec4(col, c.a);
}
vec3 finish(vec3 col, vec2 frag){
  vec2 q = frag / uRes;
  col *= .55 + .45 * pow(16. * q.x * q.y * (1. - q.x) * (1. - q.y), .18);
  col = aces(col);
  col = pow(col, vec3(1. / 2.2));
  col += (hash12(frag + fract(uT * 7.13) * 911.) - .5) * .018;
  return col;
}
`;

export const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function shaderPlate({ canvas, w, h, dpr, frag, vec = [0, 0, 0, 0], texture = null, page = "#F4845F" }) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL2 unavailable");
  const src = PRE + FINISH + frag.replace("@POST", POST);
  const sh = (type, s) => {
    const o = gl.createShader(type);
    gl.shaderSource(o, s);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(o);
      const lines = s.split("\n");
      const m = /0:(\d+)/.exec(log);
      const at = m ? `\n> ${lines[Number(m[1]) - 1]}` : "";
      throw new Error(log + at);
    }
    return o;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
    void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2. - 1., 0, 1); }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, src));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  gl.viewport(0, 0, canvas.width, canvas.height);
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform2f(U("uRes"), canvas.width, canvas.height);
  gl.uniform4f(U("uData"), ...vec);
  gl.uniform3f(U("uPage"), ...hex3(page));
  if (texture) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, texture.w, texture.h, 0, gl.RED, gl.UNSIGNED_BYTE, texture.pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U("uTex"), 0);
  }
  const uT = U("uT");
  const uPage = U("uPage");
  return {
    setPage(hex) { gl.uniform3f(uPage, ...hex3(hex)); },
    frame(t) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, t);
      // draw in strips so a heavy shader never trips the GPU watchdog
      gl.enable(gl.SCISSOR_TEST);
      const strip = 96;
      for (let y = 0; y < canvas.height; y += strip) {
        gl.scissor(0, y, canvas.width, strip);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.finish();
      }
      gl.disable(gl.SCISSOR_TEST);
    },
  };
}
