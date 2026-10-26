import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import imageLoader from "@/lib/image-loader";
import type { Attrs, ButtonWidget, Column, ElDocument, ImageWidget, Section, Widget } from "@/lib/types";

/*
 * Turns the Elementor tree back into the same markup the live site served
 * (same tags, classes, element IDs and data attributes), so the live site's
 * stylesheet and our runtime script (components/SiteRuntime.tsx) work on it
 * unchanged. The result is one HTML string per page region.
 *
 * Images are swapped for WebP copies at several widths (scripts/optimize-images.mjs);
 * their other attributes (alt, loading, fetchpriority, decoding) stay as the
 * live site wrote them.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function attrStr(a: Attrs | null | undefined): string {
  if (!a) return "";
  return Object.entries(a)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${esc(String(v))}"`))
    .join("");
}

/* ---------- image sizes (public/_img/manifest.json, written by optimize-images) ---------- */

type Manifest = Record<string, [number, number]>;
let manifest: Manifest | null = null;
function sizes(): Manifest {
  if (manifest) return manifest;
  const file = path.join(process.cwd(), "public/_img/manifest.json");
  manifest = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Manifest) : {};
  return manifest;
}

const WIDTHS = [256, 384, 640, 828, 1200, 1920];

/** src + srcset of the WebP copies of a local photo, or null when there are none (SVG, GIF, not built yet). */
export function responsive(src: string): { src: string; srcset: string; width: number } | null {
  const size = sizes()[src];
  if (!size || !/\.(jpe?g|png|webp)$/i.test(src)) return null;
  const [w] = size;
  const list = WIDTHS.filter((x) => x < w);
  const parts = list.map((x) => `${imageLoader({ src, width: x })} ${x}w`);
  // The largest copy is the original size (copies are never upscaled).
  const top = WIDTHS.find((x) => x >= w) ?? WIDTHS[WIDTHS.length - 1];
  parts.push(`${imageLoader({ src, width: top })} ${w}w`);
  return { src: imageLoader({ src, width: Math.min(top, 1200) }), srcset: parts.join(", "), width: w };
}

/** WebP copy for CSS backgrounds. */
export function bgUrl(src: string): string {
  if (!sizes()[src] || !/\.(jpe?g|png|webp)$/i.test(src)) return src;
  return imageLoader({ src, width: 1920 });
}

const ATTR_RE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttrs(s: string): [string, string][] {
  const out: [string, string][] = [];
  for (const m of s.matchAll(ATTR_RE)) out.push([m[1], m[2] ?? m[3] ?? m[4] ?? ""]);
  return out;
}

const unescapeAttr = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Rewrites every <img> and inline background in a chunk of HTML. */
export function optimizeHtml(html: string): string {
  html = html.replace(/<img\b([^>]*?)\/?>/gi, (_m, inner: string) => {
    const attrs = new Map(parseAttrs(inner).map(([k, v]) => [k.toLowerCase(), unescapeAttr(v)] as [string, string]));
    const src = attrs.get("src") ?? "";
    const r = src.startsWith("/images/") ? responsive(src) : null;
    if (r) {
      attrs.set("src", r.src);
      attrs.set("srcset", r.srcset);
      if (!attrs.has("sizes")) {
        const w = Number(attrs.get("width")) || r.width;
        attrs.set("sizes", `(max-width: ${w}px) 100vw, ${w}px`);
      }
    }
    return `<img${[...attrs].map(([k, v]) => (v === "" && k !== "alt" ? ` ${k}` : ` ${k}="${esc(v)}"`)).join("")}>`;
  });
  html = html.replace(/url\((['"]?)(\/images\/[^'")]+)\1\)/g, (_m, q: string, u: string) => `url(${q}${bgUrl(u)}${q})`);
  // Bitmaps inside SVG icons (512px originals shown at icon size): the 256px WebP copy.
  html = html.replace(/(\s(?:xlink:)?href=")(\/images\/icons\/[^"]+\.png)"/g, (m, a: string, u: string) => (sizes()[u] ? `${a}${imageLoader({ src: u, width: 256 })}"` : m));
  return html;
}

/* ---------- Elementor tree -> HTML ---------- */

function button(b: ButtonWidget): string {
  const icon = b.icon !== null ? `<span class="${b.iconCls}">${b.icon}</span>` : "";
  const a = `<${b.tag} class="${b.cls}"${attrStr(b.attrs)}><span class="${b.contentCls}">${icon}<span class="elementor-button-text">${b.text}</span></span></${b.tag}>`;
  return b.wrapCls ? `<div class="${b.wrapCls}">${a}</div>` : a;
}

function image(i: ImageWidget): string {
  let img: string;
  if (i.asset?.src) {
    // Photo replaced in Sanity: Sanity's CDN serves the sizes.
    const a = { ...i.img, src: imageLoader({ src: i.asset.src, width: 1200 }), width: String(i.asset.width), height: String(i.asset.height) } as Attrs;
    a.srcset = [640, 1200, 1920].map((w) => `${imageLoader({ src: i.asset!.src, width: w })} ${w}w`).join(", ");
    if (i.asset.alt) a.alt = i.asset.alt;
    img = `<img${attrStr(a)}>`;
  } else {
    img = `<img${attrStr(i.img)}>`;
  }
  return i.link ? `<a${attrStr(i.link)}>${img}</a>` : img;
}

function widgetInner(w: Widget): string {
  if (w.doc) return document(w.doc);
  if (w.heading) {
    const h = w.heading;
    return `<${h.tag} class="${h.cls}"${attrStr(h.attrs)}>${h.html}</${h.tag}>`;
  }
  if (typeof w.text === "string") return w.text;
  if (w.button) return button(w.button);
  if (w.image) return image(w.image);
  return w.html ?? "";
}

function widget(w: Widget): string {
  const inner = widgetInner(w);
  const body = w.noContainer ? inner : `<div class="elementor-widget-container">${inner}</div>`;
  return `<div class="${w.cls}"${attrStr(w.attrs)}>${body}</div>`;
}

function column(c: Column): string {
  const kids = c.children.map((x) => (x._type === "section" ? section(x) : widget(x))).join("");
  return `<div class="${c.cls}"${attrStr(c.attrs)}><div class="${c.wrapCls}">${c.pre ?? ""}${kids}</div></div>`;
}

function section(s: Section): string {
  const cols = s.columns.map(column).join("");
  return `<${s.tag} class="${s.cls}"${attrStr(s.attrs)}>${s.pre ?? ""}<div class="${s.containerCls}">${cols}</div></${s.tag}>`;
}

export function document(d: ElDocument): string {
  const sections = d.sections.map(section).join("");
  return d.bare ? sections : `<div class="${d.cls}"${attrStr(d.attrs)}>${sections}</div>`;
}

/** Shell markup with each `<div data-ks-doc="n"></div>` replaced by Elementor document n. */
export function region(shell: string, docs: ElDocument[]): string {
  const html = shell.replace(/<div data-ks-doc="(\d+)"><\/div>/g, (_m, n: string) => (docs[Number(n)] ? document(docs[Number(n)]) : ""));
  return optimizeHtml(html);
}
