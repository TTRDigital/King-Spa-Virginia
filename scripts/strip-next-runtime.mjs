/*
 * Runs after `next build`. The website's pages are static HTML plus the page
 * runtime (public/js, a module script): nothing on them is a React component in
 * the browser and links are plain full-page links. So the exported pages drop
 * Next.js's browser runtime: its script tags, script preloads and the inline
 * React payload (which repeats the page's markup). The Sanity Studio (/cms) is
 * a React app and keeps everything.
 * It also puts the live site's third-party scripts in place: each
 * <template data-ks-tags> block (components/Analytics.tsx) is unwrapped where it
 * stands, or moved to the end of <head> for data-ks-tags="head".
 * Fails the build if a page still references Next.js's scripts afterwards.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("out");

async function* pages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === path.join(OUT, "cms") || full === path.join(OUT, "_next")) continue;
      yield* pages(full);
    } else if (entry.name.endsWith(".html")) yield full;
  }
}

const NEXT_SCRIPT = /<script\b[^>]*\bsrc="\/_next\/[^"]*"[^>]*><\/script>/g;
const NEXT_PRELOAD = /<link\b[^>]*\bas="script"[^>]*\bhref="\/_next\/[^"]*"[^>]*\/?>/g;
const INLINE = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const TAGS = /<template data-ks-tags="(head|body)">([\s\S]*?)<\/template>/g;
const isNextInline = (attrs, body) => / id="_R_"/.test(attrs) || /^\s*\(?self\.__next_[fs]\b/.test(body) || /^\s*\(globalThis\["TURBOPACK"\]/.test(body);

let files = 0;
let saved = 0;
for await (const file of pages(OUT)) {
  const html = await readFile(file, "utf8");
  let head = "";
  const out = html
    .replace(NEXT_SCRIPT, "")
    .replace(NEXT_PRELOAD, "")
    .replace(INLINE, (m, attrs, body) => (isNextInline(attrs, body) ? "" : m))
    .replace(TAGS, (_m, where, inner) => {
      if (where === "body") return inner;
      head += inner;
      return "";
    })
    .replace("</head>", () => `${head}</head>`);
  if (/\/_next\/static\/[^"]*\.js|__next_f|TURBOPACK/.test(out)) throw new Error(`Next.js runtime left in ${path.relative(OUT, file)}`);
  if (out !== html) {
    await writeFile(file, out);
    files++;
    saved += html.length - out.length;
  }
}
console.log(`[pages] Next.js browser runtime removed from ${files} pages (${Math.round(saved / 1024)} KB)`);
