// MINTED TYPE: the shared kit. Puffy 3D letters ray-marched from a glyph distance-field atlas,
// a studio sweep in a hash-picked palette, the materials, and the seed that picks them.

export const TAU = Math.PI * 2;
export const MAXL = 16;

// ---------- palettes (sRGB) ----------
export const PALETTES = {
  Ultraviolet: { top: "#1E0B57", bot: "#6A4DFF", floor: "#2C1690", rim: "#FF8AE6", ink: "#FFFFFF" },
  Acid:        { top: "#E4FF4A", bot: "#B8C1AE", floor: "#C6CF86", rim: "#FFFFFF", ink: "#0B0B0B" },
  Bubblegum:   { top: "#FFB8E8", bot: "#B7A6FF", floor: "#E4A8F0", rim: "#FFFFFF", ink: "#170A26" },
  Cobalt:      { top: "#04124F", bot: "#1F48E8", floor: "#0A1F8A", rim: "#FF7A2E", ink: "#FFFFFF" },
  Mercury:     { top: "#F2F4F6", bot: "#AEB6C1", floor: "#D2D8DF", rim: "#FFFFFF", ink: "#0B0B0B" },
  "Deep Sea":  { top: "#01242B", bot: "#0C7A74", floor: "#033C44", rim: "#7DFFD8", ink: "#FFFFFF" },
  Sunset:      { top: "#3A0B4A", bot: "#FF6A3D", floor: "#7A1E4F", rim: "#FFD36E", ink: "#FFFFFF" },
};
export const MATERIALS = ["Mercury", "Pearl", "Candy", "Black chrome", "Frosted"];

// ---------- seed: a commit hash picks the variant, and says so in the traits ----------
export function seeded(sha = "0000000000") {
  let a = parseInt(sha.slice(0, 8), 16) >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { rnd, pick: (arr) => arr[Math.floor(rnd() * arr.length)] };
}
const hex3 = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255) ** 2.2);

// ---------- glyph atlas: TinySDF-style subpixel distance fields ----------
const INF = 1e20;
function edt1d(f, d, v, z, n) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const r = v[k]; d[q] = (q - r) * (q - r) + f[r]; }
}
function edt(grid, w, h) {
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = grid[y * w + x]; edt1d(f, d, v, z, h); for (let y = 0; y < h; y++) grid[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = grid[y * w + x]; edt1d(f, d, v, z, w); for (let x = 0; x < w; x++) grid[y * w + x] = d[x]; }
}

function blur(a, w, h, r, passes) {
  const t = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) { let acc = 0; const o = y * w;
      for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { t[o + x] = acc / (2 * r + 1);
        acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let acc = 0;
      for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { a[y * w + x] = acc / (2 * r + 1);
        acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  }
}
/** chars -> { texture, index(ch), adv(ch) } ; cell = S world units square */
export function glyphAtlas(chars, { G = 256, S = 1.6, size = 196, weight = 900 } = {}) {
  const uniq = [...new Set(chars.replace(/\s/g, ""))];
  const W = G * uniq.length;
  const c = document.createElement("canvas"); c.width = W; c.height = G;
  const g = c.getContext("2d");
  g.font = `${weight} ${size}px "Unbounded"`;
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#fff";
  const adv = {};
  const capH = size * 0.71;
  uniq.forEach((ch, i) => {
    g.fillText(ch, i * G + G / 2, G / 2 + capH / 2);
    adv[ch] = (g.measureText(ch).width / G) * S;
  });
  adv[" "] = 0.32 * S;
  const img = g.getImageData(0, 0, W, G).data;
  const outer = new Float64Array(W * G), inner = new Float64Array(W * G);
  for (let i = 0; i < W * G; i++) {
    const a = img[i * 4 + 3] / 255;
    outer[i] = a === 1 ? INF : a === 0 ? 0 : Math.max(0, 0.5 - a) ** 2;
    inner[i] = a === 1 ? 0 : a === 0 ? INF : Math.max(0, a - 0.5) ** 2;
  }
  edt(outer, W, G); edt(inner, W, G);
  const px = new Float32Array(W * G);
  for (let i = 0; i < W * G; i++) px[i] = ((Math.sqrt(inner[i]) - Math.sqrt(outer[i])) / G) * S;   // negative inside
  // soften the ridge down the middle of every stroke, so letters dome instead of bevel
  blur(px, W, G, Math.round(G * .028), 3);
  return { texture: { w: W, h: G, pixels: px, float: true }, count: uniq.length, S,
    index: (ch) => uniq.indexOf(ch), adv: (ch) => adv[ch] ?? 0.5 * S };
}

/** Lay a line of text out around x = 0. Returns [{ch, gi, x, y}] (spaces dropped). */
export function layout(atlas, text, { y = 0, track = -0.06, scale = 1 } = {}) {
  const items = []; let x = 0;
  for (const ch of text) { const a = atlas.adv(ch) * scale; items.push({ ch, x: x + a / 2, w: a }); x += a + track * scale; }
  const w = x - track * scale;
  return items.filter((i) => i.ch !== " ").map((i) => ({ ch: i.ch, gi: atlas.index(i.ch), x: i.x - w / 2, y }));
}

// quaternion from axis-angle, and a tiny helper to pack letter uniforms
export const quat = (ax, ay, az, ang) => { const l = Math.hypot(ax, ay, az) || 1, s = Math.sin(ang / 2);
  return [ax / l * s, ay / l * s, az / l * s, Math.cos(ang / 2)]; };
export const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];

/** letters: [{pos:[x,y,z], gi, q:[x,y,z,w], s, mat, glow}] -> uniforms */
export function pushLetters(plate, letters) {
  const P = new Float32Array(MAXL * 4), Q = new Float32Array(MAXL * 4), X = new Float32Array(MAXL * 4);
  letters.forEach((l, i) => {
    P.set([...l.pos, l.gi], i * 4);
    Q.set(l.q || [0, 0, 0, 1], i * 4);
    X.set([l.s ?? 1, l.mat ?? 0, l.glow ?? 0, l.squash ?? 1], i * 4);
  });
  plate.set("uP", P, 4); plate.set("uQ", Q, 4); plate.set("uX", X, 4); plate.set("uN", letters.length);
}
export function pushPalette(plate, pal) {
  const p = PALETTES[pal];
  plate.set("uTop", hex3(p.top), 3); plate.set("uBot", hex3(p.bot), 3);
  plate.set("uFloor", hex3(p.floor), 3); plate.set("uRim", hex3(p.rim), 3);
}

export const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const spring = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(9 * x));

// ---------- GLSL: letters, studio sweep, materials ----------
export const TYPE_GLSL = /* glsl */ `
uniform vec4 uP[${MAXL}], uQ[${MAXL}], uX[${MAXL}];
uniform float uN, uGlyphs, uCell, uR;
uniform vec3 uTop, uBot, uFloor, uRim;
uniform float uPulse;       // 0..1 floor light ring
vec3 qrot(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
float glyphD(float gi, vec2 p){
  vec2 uv = p / uCell + .5; uv.y = 1. - uv.y;
  vec2 cuv = clamp(uv, .004, .996);
  float d = texture(uTex, vec2((gi + cuv.x) / uGlyphs, cuv.y)).r;
  return d + length(uv - cuv) * uCell;
}
// inflated: a rounded extrusion whose thickness follows the stroke, plus a soft bulge
float puffy(float gi, vec3 q){
  float d2 = glyphD(gi, q.xy);
  float bulge = .06 * smoothstep(0., -.22, d2);
  vec2 e = vec2(d2 + uR, abs(q.z) - bulge);
  return min(max(e.x, e.y), 0.) + length(max(e, 0.)) - uR;
}
float letterId = -1.;
float letters(vec3 p){
  float d = 1e9;
  for(int i = 0; i < ${MAXL}; i++){
    if(float(i) >= uN) break;
    vec3 q = p - uP[i].xyz;
    float s = uX[i].x;
    float bound = length(q) - .95 * uCell * s;
    if(bound > .25){ if(bound < d){ d = bound; } continue; }
    q = qrot(vec4(-uQ[i].xyz, uQ[i].w), q) / s;
    q.y /= uX[i].w; q.xz *= mix(1., 1.25, 1. - uX[i].w);   // squash and stretch
    float e = puffy(uP[i].w, q) * s * min(uX[i].w, 1.);
    if(e < d){ d = e; letterId = float(i); }
  }
  return d;
}
vec3 studio(vec3 rd){
  // the sweep: a soft gradient cyclorama, a hot softbox above, a rim strip to one side
  vec3 c = mix(uBot, uTop, smoothstep(-.15, .7, rd.y));
  c += vec3(2.4) * smoothstep(.86, .97, dot(rd, normalize(vec3(-.3, .9, .35))));
  c += uRim * 1.6 * smoothstep(.05, 0., abs(rd.x - .78) - .05) * smoothstep(.0, .3, .5 - abs(rd.y - .15));
  c += vec3(1.2) * smoothstep(.04, 0., abs(rd.x + .85) - .04) * smoothstep(.0, .3, .5 - abs(rd.y - .1));
  // a hot horizon band: the streak that makes chrome read as chrome
  c += mix(vec3(1.5), uRim, .35) * exp(-pow((rd.y - .06) * 13., 2.));
  return c;
}
// what the camera sees behind everything: the sweep without the lights
vec3 studioBg(vec3 rd){ return mix(uBot, uTop, smoothstep(-.15, .7, rd.y)); }
vec3 film(float c, float d, float shift){ return .5 + .5 * cos(TAU * (d * (1.6 - c) + shift + vec3(0., .33, .67))); }
`;

// Layout HTML: top labels, traits row. Text colour follows the palette.
export function chrome({ title, index, seed, traits, pal }) {
  const ink = PALETTES[pal].ink;
  const light = ink === "#FFFFFF";
  const box = light ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.42)";
  const line = light ? "rgba(255,255,255,.2)" : "rgba(11,11,11,.12)";
  return `
  <div class="mt" style="color:${ink}">
    <div class="top"><span><b>Jan Shafin</b>&nbsp;&nbsp;Minted Type</span><span>${index}</span><span class="seed">${seed}</span></div>
    <div class="traits">${traits.map(([k, v, r]) => `<div class="trait" style="background:${box};box-shadow:inset 0 0 0 1px ${line}">
      <span class="k">${k}</span><span class="v">${v}</span><span class="r">${r || "1 of 1"}</span></div>`).join("")}</div>
  </div>`;
}
