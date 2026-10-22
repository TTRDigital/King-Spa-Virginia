import type { MetadataRoute } from "next";
import { getPages } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

/**
 * The pages, posts and categories the live site's sitemaps listed (minus the
 * six URLs that only redirected), with their last-modified dates. Left out as
 * on the live site: noindex pages, the HTML sitemap page, tag pages and the
 * parent "Blog" category.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getPages();
  return pages
    .filter((p) => p.path !== "/404/" && !/noindex/.test(p.robots ?? "") && !/^\/(sitemap|blog\/tag\/.*|blog\/category\/blog)\/$/.test(p.path))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)))
    .map((p) => {
      const lastModified = p.og["article:modified_time"] ?? p.og["og:updated_time"];
      return { url: absoluteUrl(p.path), ...(lastModified ? { lastModified } : {}) };
    });
}
