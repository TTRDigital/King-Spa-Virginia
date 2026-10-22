/*
 * Runs before `next build`:
 * 1. WebP copies of every photo in public/images at the widths the pages ask
 *    for (see lib/image-loader.ts and lib/render.ts), into public/_img, plus
 *    public/_img/manifest.json with each photo's real size. Copies that are
 *    newer than their source are kept, so repeat builds are fast.
 * 2. public/css/<page>.css from lib/data/css (each page's stylesheet), with
 *    background photos pointed at their WebP copies.
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTHS = [256, 384, 640, 828, 1200, 1920];
const SRC = path.resolve("public/images");
const OUT = path.resolve("public/_img/images");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) yield full;
  }
}

const manifest = {};
const jobs = [];
let made = 0;
let files = 0;

async function one(file) {
  files++;
  const rel = path.relative(SRC, file).replace(/\.(jpe?g|png|webp)$/i, "");
  const srcTime = (await stat(file)).mtimeMs;
  const meta = await sharp(file).metadata();
  const portrait = (meta.orientation ?? 1) >= 5;
  manifest["/images/" + path.relative(SRC, file).split(path.sep).join("/")] = portrait ? [meta.height, meta.width] : [meta.width, meta.height];
  await mkdir(path.dirname(path.join(OUT, rel)), { recursive: true });
  for (const w of WIDTHS) {
    const target = path.join(OUT, `${rel}-${w}.webp`);
    const existing = await stat(target).catch(() => null);
    if (existing && existing.mtimeMs >= srcTime) continue;
    // Never upscale: widths above the original get the original size. Metadata is not copied.
    await sharp(file)
      .rotate()
      .resize({ width: Math.min(w, meta.width ?? w), withoutEnlargement: true })
      .webp({ quality: 74, effort: 5 })
      .toFile(target);
    made++;
  }
}

for await (const file of walk(SRC)) {
  jobs.push(one(file));
  if (jobs.length >= 8) await Promise.all(jobs.splice(0));
}
await Promise.all(jobs);
await writeFile(path.resolve("public/_img/manifest.json"), JSON.stringify(manifest));
console.log(`[images] ${files} photos, ${made} WebP files written to public/_img`);

// Page stylesheets: background photos -> 1920px WebP copy.
const cssIn = path.resolve("lib/data/css");
const cssOut = path.resolve("public/css");
await mkdir(cssOut, { recursive: true });
let sheets = 0;
for (const f of await readdir(cssIn)) {
  if (!f.endsWith(".css")) continue;
  let css = await readFile(path.join(cssIn, f), "utf8");
  css = css.replace(/url\((['"]?)(\/images\/[^'")]+)\1\)/g, (m, q, u) =>
    manifest[u] && /\.(jpe?g|png|webp)$/i.test(u) ? `url(${q}/_img${u.replace(/\.(jpe?g|png|webp)$/i, "")}-1920.webp${q})` : m,
  );
  await writeFile(path.join(cssOut, f), css);
  sheets++;
}
console.log(`[css] ${sheets} page stylesheets written to public/css`);
