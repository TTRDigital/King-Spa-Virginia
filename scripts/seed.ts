/**
 * Loads the built-in content (lib/data: every page converted from the live
 * site, the header/footer and the business details) and its photos into
 * Sanity, so the CMS starts full instead of empty.
 *
 *   npm run seed                 # create documents that don't exist yet (add-missing)
 *   npm run seed -- --force      # overwrite with the built-in content
 *   npm run seed -- --dry-run    # build every document without uploading or writing
 *   npm run seed -- --force --only=page-_home,siteChrome  # only documents whose ID starts with these
 *
 * Writes to NEXT_PUBLIC_KSV_SANITY_PROJECT_ID / NEXT_PUBLIC_KSV_SANITY_DATASET
 * (environment or .env.local). Needs SANITY_WRITE_TOKEN (Editor token from
 * sanity.io/manage > API > Tokens). Without --force, anything an editor
 * already created is kept.
 *
 * The dry run also reads every document back the way the site does
 * (lib/sanity/normalize.ts) and checks it is identical to the built-in page.
 */
import { createReadStream, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@sanity/client";
import type { Chrome, Column, ElDocument, PageData, Section, Widget } from "../lib/types";
import { fallbackSettings } from "../lib/data/site.ts";
import { normalize } from "../lib/sanity/normalize.ts";

const root = new URL("..", import.meta.url).pathname;

// Minimal .env.local reader so the script works without extra packages.
if (existsSync(join(root, ".env.local"))) {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const projectId = process.env.NEXT_PUBLIC_KSV_SANITY_PROJECT_ID || "";
const dataset = process.env.NEXT_PUBLIC_KSV_SANITY_DATASET || "production";
const token = process.env.SANITY_WRITE_TOKEN;
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const only = (process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

if (!dryRun && (!projectId || !token)) {
  console.error(!projectId ? "Set NEXT_PUBLIC_KSV_SANITY_PROJECT_ID (.env.local or the workflow's SANITY_PROJECT_ID variable)." : "Set SANITY_WRITE_TOKEN (Editor token from sanity.io/manage > API > Tokens).");
  process.exit(1);
}

const client = createClient({ projectId: projectId || "dry-run", dataset, token, apiVersion: "2025-02-19", useCdn: false });

/* ---------- photos ---------- */

const uploaded = new Map<string, string>();

/** Uploads a photo from public/ once; returns its Sanity asset ID (image-<hash>-<w>x<h>-<ext>). */
async function asset(src: string): Promise<string | null> {
  if (uploaded.has(src)) return uploaded.get(src)!;
  const file = join(root, "public", decodeURIComponent(src));
  if (!src.startsWith("/images/") || !existsSync(file)) return null;
  let id: string;
  if (dryRun) {
    // A reference shaped like Sanity's, so the dry run also checks the read-back.
    const { createHash } = await import("node:crypto");
    const { default: sharp } = await import("sharp");
    const m = await sharp(file).metadata();
    id = `image-${createHash("sha1").update(src).digest("hex")}-${m.width}x${m.height}-${src.split(".").pop()}`;
  } else {
    const doc = await client.assets.upload("image", createReadStream(file), { filename: basename(file) });
    id = doc._id;
    process.stdout.write(".");
  }
  uploaded.set(src, id);
  return id;
}

/* ---------- built-in tree -> Sanity objects ---------- */

const json = (v: unknown) => (v === undefined ? undefined : JSON.stringify(v));

async function widget(w: Widget): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { _type: "ksWidget", _key: w._key, wtype: w.wtype, cls: w.cls, attrsJson: json(w.attrs) };
  if (w.noContainer) out.noContainer = true;
  if (w.heading) out.heading = { _type: "ksHeading", tag: w.heading.tag, cls: w.heading.cls, attrsJson: json(w.heading.attrs), html: w.heading.html };
  if (typeof w.text === "string") out.text = w.text;
  if (w.button) out.button = { _type: "ksButton", ...w.button, attrs: undefined, attrsJson: json(w.button.attrs) };
  if (w.image) {
    const ref = await asset(w.image.img.src ?? "");
    out.image = {
      _type: "ksImage",
      imgJson: json(w.image.img),
      linkJson: json(w.image.link),
      ...(ref ? { asset: { _type: "image", alt: w.image.img.alt ?? "", asset: { _type: "reference", _ref: ref } } } : {}),
    };
  }
  if (w.doc) out.doc = await document(w.doc);
  if (typeof w.html === "string") out.html = w.html;
  return out;
}

async function column(c: Column): Promise<Record<string, unknown>> {
  return { _type: "ksColumn", _key: c._key, cls: c.cls, attrsJson: json(c.attrs), wrapCls: c.wrapCls, pre: c.pre, children: await Promise.all(c.children.map((x) => (x._type === "section" ? section(x) : widget(x)))) };
}

async function section(s: Section): Promise<Record<string, unknown>> {
  return { _type: "ksSection", _key: s._key, tag: s.tag, cls: s.cls, attrsJson: json(s.attrs), pre: s.pre, containerCls: s.containerCls, columns: await Promise.all(s.columns.map(column)) };
}

async function document(d: ElDocument, key?: string): Promise<Record<string, unknown>> {
  return { _type: "ksDocument", ...(key ? { _key: key } : {}), ...(d.bare ? { bare: true } : {}), cls: d.cls, attrsJson: json(d.attrs), sections: await Promise.all(d.sections.map(section)) };
}

const docs = (list: ElDocument[]) => Promise.all(list.map((d, i) => document(d, `doc${i}`)));

/* ---------- documents ---------- */

const pages: PageData[] = readdirSync(join(root, "lib/data/pages"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(root, "lib/data/pages", f), "utf8")));
const chrome: Chrome = JSON.parse(readFileSync(join(root, "lib/data/chrome.json"), "utf8"));

const kind = (p: PageData) => (/(^|\s)postid-\d+(\s|$)/.test(p.bodyClass) ? "post" : /(^|\s)archive(\s|$)/.test(p.bodyClass) ? "archive" : "page");
const pageId = (p: PageData) => `page-${p.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

async function build() {
  const out: Record<string, unknown>[] = [];
  out.push({ _id: "siteSettings", _type: "siteSettings", ...fallbackSettings, hours: fallbackSettings.hours.map((h, i) => ({ _type: "ksHours", _key: `h${i}`, ...h })) });
  out.push({
    _id: "siteChrome",
    _type: "siteChrome",
    header: { shell: chrome.header.shell, docs: await docs(chrome.header.docs) },
    footer: { shell: chrome.footer.shell, docs: await docs(chrome.footer.docs) },
    popups: await Promise.all(chrome.popups.map(async (p) => ({ _type: "ksPopup", _key: `popup${p.id}`, id: p.id, settingsJson: json(p.settings), doc: await document(p.doc) }))),
  });
  for (const p of pages) {
    if (only.length && !only.some((o) => pageId(p).startsWith(o))) continue;
    out.push({
      _id: pageId(p),
      _type: "page",
      path: p.path,
      kind: kind(p),
      title: p.title,
      description: p.description ?? undefined,
      canonical: p.canonical ?? undefined,
      robots: p.robots ?? undefined,
      ogJson: json(p.og),
      ldjsonJson: json(p.ldjson),
      navJson: json(p.nav),
      headExtraJson: json(p.headExtra),
      bodyClass: p.bodyClass,
      shell: p.shell,
      canvas: p.canvas || undefined,
      chromeLazyJson: json(p.chromeLazy),
      docs: await docs(p.docs),
    });
  }
  return out;
}

/** Removes undefined fields (Sanity rejects them in JSON). */
const clean = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(clean)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, x]) => x !== undefined)
            .map(([k, x]) => [k, clean(x)]),
        )
      : v;

console.log(`Seeding ${projectId || "(no project)"}/${dataset}${force ? " (overwriting)" : " (keeping existing documents)"}${dryRun ? " [dry run]" : ""}${only.length ? ` only: ${only.join(", ")}` : ""}. Uploading photos`);
const all = (await build()).map((d) => clean(d) as { _id: string; _type: string }).filter((d) => !only.length || only.some((p) => d._id.startsWith(p)));
console.log(`\n${uploaded.size} photos ${dryRun ? "checked" : "uploaded"}. ${dryRun ? "Built" : "Writing"} ${all.length} documents…`);

if (dryRun) {
  const counts = all.reduce<Record<string, number>>((acc, d) => ((acc[d._type] = (acc[d._type] ?? 0) + 1), acc), {});
  // Every array member that is an object needs a unique _key, or Sanity refuses the write.
  const problems: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) {
      const keys = new Set<string>();
      v.forEach((x, i) => {
        if (x && typeof x === "object" && !Array.isArray(x)) {
          const k = (x as { _key?: string })._key;
          if (!k) problems.push(`${path}[${i}] has no _key`);
          else if (keys.has(k)) problems.push(`${path}[${i}] duplicate _key ${k}`);
          else keys.add(k);
        }
        walk(x, `${path}[${i}]`);
      });
    } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  all.forEach((d) => walk(d, d._id));
  // Round trip: what the site reads back must equal the built-in page (photos aside).
  const stripAssets = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stripAssets)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([k]) => k !== "asset" && !(k === "_key" && (v as { _type?: string })._type === "document"))
              .map(([k, x]) => [k, stripAssets(x)]),
          )
        : v;
  let checked = 0;
  for (const d of all.filter((x) => x._type === "page")) {
    const back = normalize(d, "p", "production") as Partial<PageData>;
    const base = pages.find((p) => p.path === back.path)!;
    for (const k of ["title", "description", "canonical", "robots", "og", "ldjson", "headExtra", "nav", "chromeLazy", "bodyClass", "shell", "docs"] as const) {
      const a = stripAssets(back[k] ?? null);
      const b = stripAssets(base[k] ?? null);
      if (!isDeepStrictEqual(a, b)) {
        problems.push(`${d._id}.${k} does not read back the same`);
        if (process.env.SEED_DEBUG && problems.length === 1) {
          const { writeFileSync } = await import("node:fs");
          writeFileSync("/tmp/seed-a.json", JSON.stringify(a, null, 1));
          writeFileSync("/tmp/seed-b.json", JSON.stringify(b, null, 1));
        }
      }
    }
    checked++;
  }
  if (problems.length) {
    console.error(`${problems.length} problems:`, problems.slice(0, 20));
    process.exit(1);
  }
  console.log("Dry run, nothing written:", counts, `${checked} pages read back identical, ${Math.round(JSON.stringify(all).length / 1024)} KB of content`);
  process.exit(0);
}

const existing = new Set(await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: all.map((d) => d._id) }));
if (!force && existing.size) console.log(`Keeping ${existing.size} documents that already exist (use overwrite to replace them).`);

// One document per transaction: some pages are large.
let written = 0;
for (const d of all) {
  if (!force && existing.has(d._id)) continue;
  await client.transaction()[force ? "createOrReplace" : "createIfNotExists"](d).commit({ visibility: "async" });
  written++;
  process.stdout.write(`${written} `);
}
console.log(`\nDone: ${written} documents written. Open /cms to see the content.`);
