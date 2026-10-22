import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChrome, getPage, getPages, getSiteSettings } from "@/lib/content";
import imageLoader from "@/lib/image-loader";
import { heroBackground, pageHtml, postIndex, preloadFonts, stylesheetHref } from "@/lib/page-html";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, businessSchema, faqPageSchema, pageFaqs } from "@/lib/schema";
import { JsonLd } from "@/components/JsonLd";
import { SiteRuntime } from "@/components/SiteRuntime";

export const dynamicParams = false;

/** The hero background's WebP copies, per screen size as in the page CSS (scripts/optimize-images.mjs). */
const HERO_SIZES: [number, string][] = [
  [828, "(max-width: 767px)"],
  [1200, "(min-width: 768px) and (max-width: 1024px)"],
  [1920, "(min-width: 1025px)"],
];

type Props = { params: Promise<{ slug?: string[] }> };

/** Next.js reserves /404, so the live 404 page is built at /404-error/ (Apache's ErrorDocument, see public/.htaccess). */
const ERROR_PAGE = "/404-error/";
const toPath = (slug?: string[]) => {
  const p = slug?.length ? `/${slug.map(decodeURIComponent).join("/")}/` : "/";
  return p === ERROR_PAGE ? "/404/" : p;
};
const toSlug = (path: string) => (path === "/" ? [] : (path === "/404/" ? ERROR_PAGE : path).split("/").filter(Boolean));

/** Every page converted from the live site (and any page added in /cms), at its live URL, plus the 404 page. */
export async function generateStaticParams() {
  const pages = await getPages();
  return pages.map((p) => ({ slug: toSlug(p.path) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(toPath((await params).slug));
  return page ? pageMetadata(page) : {};
}

export default async function Page({ params }: Props) {
  const page = await getPage(toPath((await params).slug));
  if (!page) notFound();
  const [chrome, settings] = await Promise.all([getChrome(), getSiteSettings()]);
  const crumbs = page.path === "/" || page.path === "/404/" ? null : breadcrumbSchema(page);
  const faqs = pageFaqs(page);
  const html = pageHtml(page, chrome);
  // Post list for the blog search box and the dates on related-post cards.
  const posts = /id="postSearch"|eael-grid-post/.test(html) ? postIndex(await getPages()) : null;
  const hero = heroBackground(page);
  return (
    <>
      <link rel="stylesheet" href={stylesheetHref(page)} precedence="default" />
      {preloadFonts(page).map((href) => (
        <link key={href} rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />
      ))}
      {hero ? HERO_SIZES.map(([w, media]) => <link key={w} rel="preload" as="image" href={imageLoader({ src: hero, width: w })} media={media} fetchPriority="high" />) : null}
      <JsonLd data={businessSchema(settings)} />
      {crumbs ? <JsonLd data={crumbs} /> : null}
      {faqs.length >= 2 ? <JsonLd data={faqPageSchema(faqs)} /> : null}
      <div className={`ks-body ${page.bodyClass}`} dangerouslySetInnerHTML={{ __html: html }} />
      {posts ? <script id="ks-data" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ posts }).replace(/</g, "\\u003c") }} /> : null}
      <SiteRuntime />
    </>
  );
}
