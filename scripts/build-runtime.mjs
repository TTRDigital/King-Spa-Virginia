/*
 * Runs before `next build`: bundles the page runtime (lib/runtime/index.ts) into
 * public/js as an ES module, with its carousels (Swiper, jQuery + Slick) split
 * into chunks that load only on pages that have them. File names carry a content
 * hash; public/js/runtime.json names the entry file for components/SiteRuntime.tsx.
 */
import { build } from "esbuild";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

const outdir = path.resolve("public/js");
await rm(outdir, { recursive: true, force: true });
const result = await build({
  entryPoints: { runtime: "lib/runtime/index.ts" },
  bundle: true,
  splitting: true,
  format: "esm",
  target: ["es2020"],
  minify: true,
  outdir,
  entryNames: "[name]-[hash]",
  chunkNames: "chunk-[hash]",
  metafile: true,
  legalComments: "none",
  logLevel: "warning",
});
const entry = Object.entries(result.metafile.outputs).find(([, o]) => o.entryPoint)?.[0];
if (!entry) throw new Error("runtime entry not built");
const src = "/js/" + path.basename(entry);
await writeFile(path.join(outdir, "runtime.json"), JSON.stringify({ src }));
const kb = (f) => Math.round(result.metafile.outputs[f].bytes / 1024);
console.log(`[runtime] ${src} (${kb(entry)} KB), ${Object.keys(result.metafile.outputs).length - 1} lazy chunks`);
