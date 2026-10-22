/**
 * Public site URL, used for canonical links, the sitemap, schema and Open
 * Graph. NEXT_PUBLIC_SITE_URL overrides the default.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://virginia.kingspa.com").replace(/\/$/, "");

/** Page paths get the trailing slash the static export uses (/about/); files (/sitemap.xml) do not. */
export const absoluteUrl = (path = "/") => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${p.endsWith("/") || /\.[a-z0-9]+$/i.test(p) ? p : `${p}/`}`;
};
