import "./globals.css";
import type { Metadata } from "next";
import { getChrome, getPage } from "@/lib/content";
import { pageHtml, stylesheetHref } from "@/lib/page-html";
import { SiteRuntime } from "@/components/SiteRuntime";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = { title: { absolute: "Page Not Found - KING SPA Virginia" }, robots: { index: false, follow: true } };

/* The live site's 404 page, served with a real 404 status (.htaccess ErrorDocument). */
export default async function NotFound() {
  const [page, chrome] = await Promise.all([getPage("/404/"), getChrome()]);
  if (!page) return <h1>Page not found</h1>;
  return (
    <>
      <link rel="stylesheet" href={stylesheetHref(page)} precedence="default" />
      <div className={`ks-body ${page.bodyClass}`} dangerouslySetInnerHTML={{ __html: pageHtml(page, chrome) }} />
      <SiteRuntime />
      <Analytics />
    </>
  );
}
