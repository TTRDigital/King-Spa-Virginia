import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { sanityFetch } from "@/lib/sanity/fetch";
import { merge } from "@/lib/merge";
import { normalize as normalizeDoc } from "@/lib/sanity/normalize";
import { dataset, projectId } from "@/sanity/env";
import { fallbackSettings } from "@/lib/data/site";
import type { Chrome, PageData, SiteSettings } from "@/lib/types";

/* ==========================================================================
   Content layer
   Every page reads through these functions. Sanity values win when present;
   anything missing falls back to lib/data (converted from the live site), so
   the site works before the CMS is filled in, and an empty field never
   breaks a page.
   ========================================================================== */

const DATA = path.join(process.cwd(), "lib/data");

/* ---------- built-in content ---------- */

const builtInPages = cache((): PageData[] =>
  readdirSync(path.join(DATA, "pages"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(DATA, "pages", f), "utf8")) as PageData),
);

const builtInChrome = cache((): Chrome => JSON.parse(readFileSync(path.join(DATA, "chrome.json"), "utf8")) as Chrome);

/* ---------- Sanity -> built-in shape ---------- */

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);
const normalize = (v: unknown) => normalizeDoc(v, projectId, dataset);

/**
 * Top-level merge for Elementor content: a filled CMS field replaces the
 * built-in one as a whole (trees are kept exactly as stored, so empty
 * attribute values such as allowfullscreen="" survive).
 */
function mergeTop<T extends object>(base: T, cms: unknown): T {
  if (!isObj(cms)) return base;
  const out: Loose = { ...(base as Loose) };
  for (const [k, v] of Object.entries(cms)) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out as T;
}

/* ---------- pages ---------- */

export const getPages = cache(async (): Promise<PageData[]> => {
  const builtIn = builtInPages();
  const cms = await sanityFetch<Loose[]>(`*[_type == "page" && defined(path) && !(_id in path("drafts.**"))]`, {}, ["page"]);
  if (!cms?.length) return builtIn;
  const byPath = new Map(builtIn.map((p) => [p.path, p]));
  const merged = cms.map((raw) => {
    const c = normalize(raw) as Partial<PageData>;
    const base = byPath.get(c.path ?? "");
    // CMS-only pages use the stylesheet of the page they were copied from (cssKey) or the basic page.
    return base ? mergeTop(base, c) : ({ shell: '<div id="content" class="site-content"><div class="ast-container"><div data-ks-doc="0"></div></div></div>', bodyClass: "page ast-page-builder-template ast-no-sidebar elementor-default elementor-kit-7", og: {}, docs: [], cssKey: "about", ...c } as PageData);
  });
  const missing = builtIn.filter((b) => !merged.some((m) => m.path === b.path));
  return [...merged, ...missing];
});

export const getPage = cache(async (pathname: string) => (await getPages()).find((p) => p.path === pathname));

/** Header, footer and the site-wide popups. */
export const getChrome = cache(async (): Promise<Chrome> => {
  const cms = await sanityFetch<Loose>(`*[_id == "siteChrome"][0]`, {}, ["siteChrome"]);
  const c = normalize(cms) as Partial<Chrome> | null;
  const base = builtInChrome();
  return { header: mergeTop(base.header, c?.header), footer: mergeTop(base.footer, c?.footer), popups: c?.popups?.length ? c.popups : base.popups };
});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const cms = await sanityFetch<Loose>(`*[_id == "siteSettings"][0]`, {}, ["siteSettings"]);
  return merge(fallbackSettings, normalize(cms));
});
