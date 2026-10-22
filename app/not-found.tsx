import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Page Not Found - KING SPA Virginia" }, robots: { index: false, follow: true } };

/*
 * Next.js's own not-found screen. The site's real 404 page is the live site's, built at /404/ and
 * served by Apache for unknown URLs (public/.htaccess). Kept tiny: Next.js embeds this component in
 * every page's data.
 */
export default function NotFound() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
      <h1>Page not found</h1>
      <p>
        {/* A full page load: the site's pages carry no client-side router. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">KING SPA Virginia home page</a>
      </p>
    </main>
  );
}
