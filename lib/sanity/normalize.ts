/*
 * Sanity document -> the built-in content shape (lib/types.ts). Shared by
 * lib/content.ts and scripts/seed.ts (whose dry run checks that every page
 * comes back out of Sanity exactly as it went in).
 */

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/** Sanity object type -> the built-in `_type`. */
const TYPES: Record<string, string> = { ksDocument: "document", ksSection: "section", ksColumn: "column", ksWidget: "widget" };

/** Sanity image -> { src, width, height, alt }, read straight from the asset reference (image-<id>-<w>x<h>-<ext>). */
export function toImg(v: Loose, projectId: string, dataset: string) {
  const ref = (v.asset as Loose | undefined)?._ref;
  if (typeof ref !== "string") return null;
  const m = ref.match(/^image-([a-zA-Z0-9]+)-(\d+)x(\d+)-(\w+)$/);
  if (!m) return null;
  return { src: `https://cdn.sanity.io/images/${projectId}/${dataset}/${m[1]}-${m[2]}x${m[3]}.${m[4]}`, alt: typeof v.alt === "string" ? v.alt : "", width: Number(m[2]), height: Number(m[3]) };
}

/**
 * Drops Sanity's system keys (keeps _key and the element type), parses the
 * "...Json" fields and turns images into { src, width, height, alt }.
 */
export function normalize(v: unknown, projectId: string, dataset: string): unknown {
  if (Array.isArray(v)) return v.map((x) => normalize(x, projectId, dataset)).filter((x) => x !== null && x !== undefined);
  if (!isObj(v)) return v;
  if (v._type === "image" || (isObj(v.asset) && typeof v.asset._ref === "string" && v.asset._ref.startsWith("image-"))) return toImg(v, projectId, dataset);
  const out: Loose = {};
  for (const [k, x] of Object.entries(v)) {
    if (k === "_type") {
      if (typeof x === "string" && TYPES[x]) out._type = TYPES[x];
      continue;
    }
    if (k.startsWith("_") && k !== "_key") continue;
    if (k.endsWith("Json")) {
      try {
        if (typeof x === "string" && x) out[k.slice(0, -4)] = JSON.parse(x);
      } catch {
        // A broken JSON field keeps the built-in value.
      }
      continue;
    }
    out[k] = normalize(x, projectId, dataset);
  }
  return out;
}
