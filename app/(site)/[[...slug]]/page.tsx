import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChrome, getPage, getPages, getSiteSettings } from "@/lib/content";
import { pageHtml, postIndex, stylesheetHref } from "@/lib/page-html";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, businessSchema, faqPageSchema, pageFaqs } from "@/lib/schema";
import { JsonLd } from "@/components/JsonLd";
import { SiteRuntime } from "@/components/SiteRuntime";

export const dynamicParams = false;

type Props = { params: Promise<{ slug?: string[] }> };

const toPath = (slug?: string[]) => (slug?.length ? `/${slug.map(decodeURIComponent).join("/")}/` : "/");

/** Every page converted from the live site (and any page added in /cms), at its live URL. */
export async function generateStaticParams() {
  const pages = await getPages();
  return pages.filter((p) => p.path !== "/404/").map((p) => ({ slug: p.path === "/" ? [] : p.path.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(toPath((await params).slug));
  return page ? pageMetadata(page) : {};
}

export default async function Page({ params }: Props) {
  const page = await getPage(toPath((await params).slug));
  if (!page || page.path === "/404/") notFound();
  const [chrome, settings] = await Promise.all([getChrome(), getSiteSettings()]);
  const crumbs = page.path === "/" ? null : breadcrumbSchema(page);
  const faqs = pageFaqs(page);
  const html = pageHtml(page, chrome);
  // Post list for the blog search box and the dates on related-post cards.
  const posts = /id="postSearch"|eael-grid-post/.test(html) ? postIndex(await getPages()) : null;
  return (
    <>
      <link rel="stylesheet" href={stylesheetHref(page)} precedence="default" />
      <JsonLd data={businessSchema(settings)} />
      {crumbs ? <JsonLd data={crumbs} /> : null}
      {faqs.length >= 2 ? <JsonLd data={faqPageSchema(faqs)} /> : null}
      <div className={`ks-body ${page.bodyClass}`} dangerouslySetInnerHTML={{ __html: html }} />
      {posts ? <script id="ks-data" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ posts }).replace(/</g, "\\u003c") }} /> : null}
      <SiteRuntime />
    </>
  );
}
