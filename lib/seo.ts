import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import type { PageData } from "@/lib/types";

const abs = (u: string) => (u.startsWith("http") ? u : absoluteUrl(u));

/**
 * Title, description, canonical, robots, Open Graph and Twitter tags exactly
 * as the live page had them (Rank Math), with image and page URLs on this site.
 */
export function pageMetadata(page: PageData): Metadata {
  const og = page.og;
  const image = og["og:image"]
    ? [{ url: abs(og["og:image"]), secureUrl: og["og:image:secure_url"] ? abs(og["og:image"]) : undefined, width: Number(og["og:image:width"]) || undefined, height: Number(og["og:image:height"]) || undefined, alt: og["og:image:alt"], type: og["og:image:type"] }]
    : undefined;
  const isArticle = og["og:type"] === "article";
  const other: Record<string, string> = {};
  for (const k of ["twitter:label1", "twitter:data1", "twitter:label2", "twitter:data2"]) if (og[k]) other[k] = og[k];
  if (og["og:updated_time"]) other["og:updated_time"] = og["og:updated_time"];
  return {
    title: { absolute: page.title },
    description: page.description || undefined,
    alternates: page.canonical ? { canonical: new URL(page.canonical).pathname } : undefined,
    robots: page.robots || undefined,
    openGraph: {
      locale: og["og:locale"],
      siteName: og["og:site_name"],
      title: og["og:title"],
      description: og["og:description"],
      url: og["og:url"] ? new URL(og["og:url"]).pathname : undefined,
      images: image,
      videos: og["og:video"] ? [{ url: og["og:video"] }] : undefined,
      ...(isArticle
        ? { type: "article" as const, publishedTime: og["article:published_time"], modifiedTime: og["article:modified_time"], section: og["article:section"] }
        : { type: "website" as const }),
    },
    twitter: {
      card: (og["twitter:card"] as "summary_large_image") || "summary_large_image",
      title: og["twitter:title"],
      description: og["twitter:description"],
      images: og["twitter:image"] ? [abs(og["twitter:image"])] : undefined,
    },
    other,
  };
}
