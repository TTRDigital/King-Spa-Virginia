/*
 * Runs before `next build`:
 * 1. WebP copies of every photo in public/images at the widths the pages ask
 *    for (see lib/image-loader.ts and lib/render.ts), into public/_img, plus
 *    public/_img/manifest.json with each photo's real size. Copies that are
 *    newer than their source are kept, so repeat builds are fast.
 * 2. public/css/<page>.css from lib/data/css (each page's stylesheet), with
 *    background photos pointed at their WebP copies (smaller ones on tablets and phones).
 * 3. The icon fonts (Font Awesome, Elementor's eicons) from assets/icon-fonts, cut down to the
 *    icons the stylesheets use, into the public paths the stylesheets load them from.
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import sharp from "sharp";
import subsetFont from "subset-font";

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

// Page stylesheets: background photos -> WebP copies sized for the screen: 1920px, and right after
// each such rule the same background at 1200px for tablets and 828px for phones (same selector,
// same place in the cascade, so the page's own tablet/phone rules still win where they follow).
const cssIn = path.resolve("lib/data/css");
const cssOut = path.resolve("public/css");
await mkdir(cssOut, { recursive: true });
const isPhoto = (u) => manifest[u] && /\.(jpe?g|png|webp)$/i.test(u);
const webp = (u, w) => `/_img${u.replace(/\.(jpe?g|png|webp)$/i, "")}-${w}.webp`;
const PHOTO_URL = /url\((['"]?)(\/images\/[^'")]+)\1\)/g;
const SMALLER = [
  [1200, "(max-width:1024px)"],
  [828, "(max-width:767px)"],
];
let sheets = 0;
for (const f of await readdir(cssIn)) {
  if (!f.endsWith(".css")) continue;
  const root = postcss.parse(await readFile(path.join(cssIn, f), "utf8"));
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    const decls = rule.nodes.filter((d) => d.type === "decl" && /^background(-image)?$/.test(d.prop) && [...d.value.matchAll(PHOTO_URL)].some((m) => isPhoto(m[2])));
    if (!decls.length) return;
    let at = rule;
    for (const [w, media] of SMALLER) {
      const copy = postcss.rule({ selector: rule.selector });
      for (const d of decls) copy.append(d.clone({ prop: "background-image", value: [...d.value.matchAll(PHOTO_URL)].filter((m) => isPhoto(m[2])).map((m) => `url(${webp(m[2], w)})`).join(",") }));
      const wrap = postcss.atRule({ name: "media", params: media });
      wrap.append(copy);
      at.after(wrap);
      at = wrap;
    }
    for (const d of decls) d.value = d.value.replace(PHOTO_URL, (m, q, u) => (isPhoto(u) ? `url(${q}${webp(u, 1920)}${q})` : m));
  });
  await writeFile(path.join(cssOut, f), root.toString());
  sheets++;
}
console.log(`[css] ${sheets} page stylesheets written to public/css`);

// Icon fonts: keep only the icons in use: every icon class is a `content:"\\fxxx"` rule in some
// page's stylesheet, and some widgets (Elementor's star ratings) put the icon character itself in
// the text. The glyphs and metrics are the original ones.
const ICON_FONTS = {
  "eicons.woff2": "public/wp-assets/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2",
  "fa-solid-900.woff2": "public/wp-assets/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2",
  "fa-regular-400.woff2": "public/wp-assets/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff2",
  "fa-brands-400.woff2": "public/wp-assets/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2",
};
const icons = new Set();
for (const f of await readdir(cssOut)) {
  for (const m of (await readFile(path.join(cssOut, f), "utf8")).matchAll(/content:\s*["']\\([ef][0-9a-f]{3})["']/gi)) icons.add(String.fromCodePoint(parseInt(m[1], 16)));
}
const dataDir = path.resolve("lib/data");
for (const f of ["chrome.json", ...(await readdir(path.join(dataDir, "pages"))).map((x) => path.join("pages", x))]) {
  if (!f.endsWith(".json")) continue;
  for (const m of JSON.stringify(JSON.parse(await readFile(path.join(dataDir, f), "utf8"))).matchAll(/[\ue000-\uf8ff]/g)) icons.add(m[0]);
}
const text = [...icons].join("");
for (const [name, out] of Object.entries(ICON_FONTS)) {
  const full = await readFile(path.resolve("assets/icon-fonts", name));
  const cut = await subsetFont(full, text, { targetFormat: "woff2" });
  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await writeFile(path.resolve(out), cut);
  console.log(`[fonts] ${name}: ${icons.size} icons, ${Math.round(full.length / 1024)} KB -> ${Math.round(cut.length / 1024)} KB`);
}
