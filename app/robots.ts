import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

/** The live site's robots.txt (same rules and AI crawlers), pointing at this site's sitemap. The studio is off limits. */
export default function robots(): MetadataRoute.Robots {
  const open = ["GPTBot", "OAI-SearchBot", "Google-Extended", "ClaudeBot", "anthropic-ai"].map((userAgent) => ({ userAgent, allow: "/" }));
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/wp-admin/", "/tag/", "/tags/", "/trackback/", "/cgi-bin/", "/subscribe/", "/newsletter/", "/careers/", "/xmlrpc.php", "/cms/"],
        allow: ["/wp-admin/admin-ajax.php", "/wp-content/uploads/", "/wp-json/"],
      },
      ...open,
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
