#!/usr/bin/env node
// Render profile plates: node render.mjs [scene ...] [--quick] [--still]
//   --quick  every 8th frame only, for fast previews
//   --still  write one PNG (frame 0) instead of an animation
// Chrome: set CHROME_PATH, otherwise the usual install locations are tried.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.env.OUT || resolve(ROOT, "../assets"));
const ALL = ["hero", "flasharb", "trustline", "custodian", "bluecarbon", "capsule", "activity", "closing"];
const REPOS = ["Janshafin", "flasharb", "TrustLine", "Custodian", "Blue-Carbon-MRV", "ADGENT", "gigforce"];
const STILLS = new Set([]);
const DPR = Number(process.env.DPR || 1.25);   // 1500px wide: sharp at GitHub's 896px column on retina

const args = process.argv.slice(2);
const quick = args.includes("--quick");
const forceStill = args.includes("--still");
const at = Number((args.find((a) => a.startsWith("--at=")) || "--at=0").slice(5));
const names = args.filter((a) => !a.startsWith("--"));
const scenes = names.length ? names : ALL;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!path.startsWith(ROOT) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
  res.end(await readFile(path));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;

const chromePath = process.env.CHROME_PATH || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
].find(existsSync);
const browser = await puppeteer.launch({
  executablePath: chromePath, headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--use-angle=" + (process.env.ANGLE || (process.platform === "darwin" ? "metal" : "swiftshader"))],
});

async function contributions() {
  const res = await fetch("https://github.com/users/Janshafin/contributions",
    { headers: { "user-agent": "Mozilla/5.0 profile-studio/1.0", accept: "text/html" } });
  const html = await res.text();
  const days = [...html.matchAll(/data-date="(\d{4}-\d\d-\d\d)"[^>]*?data-level="(\d)"/g)]
    .map(([, date, level]) => ({ date, level: Number(level) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 200) throw new Error(`parsed only ${days.length} days; keeping the last good figure`);
  return days;
}

await mkdir(join(ROOT, "data"), { recursive: true });
try {
  // the latest real commit of each featured repo, printed as the barcode on its hangtag
  if (!process.env.NOFETCH && scenes.some((s) => s !== "activity")) {
    // start from the last good hashes, so a rate-limited API never loses a seed
    let repos = {};
    try { repos = JSON.parse(await readFile(join(ROOT, "data/repos.json"), "utf8")); } catch {}
    for (const r of REPOS) {
      try {
        const res = await fetch(`https://api.github.com/repos/Janshafin/${r}/commits?per_page=1`,
          { headers: { "user-agent": "profile-studio/1.0", accept: "application/vnd.github+json" } });
        const body = await res.json();
        if (Array.isArray(body) && body[0]) repos[r] = { sha: body[0].sha, date: body[0].commit.committer.date };
      } catch { /* keep going without a barcode */ }
    }
    await writeFile(join(ROOT, "data/repos.json"), JSON.stringify(repos));
  }
  if (scenes.includes("activity")) {
    await writeFile(join(ROOT, "data/contributions.json"), JSON.stringify(await contributions()));
  }

  for (const name of scenes) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error(`[${name}] ${e.message}`));
    page.on("console", (m) => m.type() === "error" && console.error(`[${name}] ${m.text()}`));
    const data = name === "activity" ? "&data=/data/contributions.json" : "";
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: DPR });
    const aa = process.env.AA ? `&aa=${process.env.AA}` : "";
    await page.goto(`${base}/stage.html?scene=${name}&dpr=${DPR}${data}${aa}`);
    await page.waitForFunction("window.__ready === true", { timeout: 60000 });
    const spec = await page.evaluate(() => window.__spec);
    await page.setViewport({ width: spec.w, height: spec.h, deviceScaleFactor: DPR });
    const clip = { x: 0, y: 0, width: spec.w, height: spec.h };

    const still = forceStill || STILLS.has(name) || spec.frames === 1;
    const step = quick ? 8 : 1;
    const indices = still ? [Math.round(at * spec.frames) % spec.frames] : Array.from({ length: Math.ceil(spec.frames / step) }, (_, k) => k * step);
    const raws = [];
    let W = 0, H = 0;
    const t0 = Date.now();
    for (const i of indices) {
      await page.evaluate((i) => window.__frame(i), i);
      const png = await page.screenshot({ clip, omitBackground: true, type: "png" });
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      W = info.width; H = info.height;
      raws.push(data);
    }
    await page.close();

    if (still) {
      const file = join(OUT, `${name}.png`);
      await sharp(raws[0], { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toFile(file);
      console.log(`${name}.png  ${W}x${H}`);
    } else {
      const file = join(OUT, `${name}.webp`);
      const delay = Math.round((1000 / spec.fps) * step);
      const buf = await sharp(Buffer.concat(raws), { raw: { width: W, height: H * raws.length, channels: 4, pageHeight: H } })
        .webp({ quality: Number(process.env.Q || 80), alphaQuality: 100, effort: 5, loop: 0, delay: raws.map(() => delay), smartSubsample: true })
        .toBuffer();
      await writeFile(file, buf);
      console.log(`${name}.webp  ${W}x${H}  ${raws.length} frames  ${(buf.length / 1048576).toFixed(2)} MB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
