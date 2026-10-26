import "server-only";
import captured from "@/lib/data/sitemaps.json";
import { getPages, isBuiltInPath } from "@/lib/content";
import { siteUrl } from "@/lib/site";

/*
 * The site's XML sitemaps, as the live site's SEO plugin (Rank Math) served them:
 * /sitemap_index.xml listing /post-sitemap.xml, /page-sitemap.xml and
 * /category-sitemap.xml, same entries, order, dates and photos (captured in
 * lib/data/sitemaps.json), styled by /main-sitemap.xsl. Pages added in the CMS
 * later are appended to the post or page sitemap.
 */

type Entry = { path: string; lastmod: string | null; images: string[] };
type Kind = "post" | "page" | "category";
const data = captured as Record<Kind, Entry[]> & { index: Record<Kind, string> };
export const SITEMAPS: Kind[] = ["post", "page", "category"];

const HEAD = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="//virginia.kingspa.com/main-sitemap.xsl"?>\n`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Captured entries plus CMS pages that the built-in content and the captured sitemaps do not have. */
async function entries(kind: Kind): Promise<Entry[]> {
  const list = [...data[kind]];
  if (kind === "category") return list;
  const known = new Set([...SITEMAPS.flatMap((k) => data[k].map((e) => e.path))]);
  for (const p of await getPages()) {
    if (known.has(p.path) || isBuiltInPath(p.path) || /noindex/.test(p.robots ?? "")) continue;
    const isPost = /(^|\s)postid-\d+(\s|$)/.test(p.bodyClass);
    if ((kind === "post") !== isPost) continue;
    list.push({ path: p.path, lastmod: p.og["article:modified_time"] ?? p.og["og:updated_time"] ?? null, images: p.og["og:image"] ? [new URL(p.og["og:image"], siteUrl).href] : [] });
  }
  return list;
}

export async function sitemapXml(kind: Kind): Promise<string> {
  const urls = (await entries(kind))
    .map((e) => {
      const lastmod = e.lastmod ? `\n\t\t<lastmod>${esc(e.lastmod)}</lastmod>` : "";
      const images = e.images.map((i) => `\n\t\t<image:image>\n\t\t\t<image:loc>${esc(i)}</image:loc>\n\t\t</image:image>`).join("");
      return `\t<url>\n\t\t<loc>${esc(siteUrl + e.path)}</loc>${lastmod}${images}\n\t</url>\n`;
    })
    .join("");
  return `${HEAD}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

export async function sitemapIndexXml(): Promise<string> {
  const items = await Promise.all(
    SITEMAPS.map(async (kind) => {
      const dates = [data.index[kind], ...(await entries(kind)).map((e) => e.lastmod)].filter((d): d is string => !!d);
      const latest = dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
      return `\t<sitemap>\n\t\t<loc>${siteUrl}/${kind}-sitemap.xml</loc>${latest ? `\n\t\t<lastmod>${latest}</lastmod>` : ""}\n\t</sitemap>\n`;
    }),
  );
  return `${HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("")}</sitemapindex>\n`;
}

export const xmlResponse = (body: string) => new Response(body, { headers: { "Content-Type": "text/xml; charset=UTF-8" } });
