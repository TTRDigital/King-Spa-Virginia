import { sitemapXml, xmlResponse } from "@/lib/sitemaps";

export const dynamic = "force-static";

export async function GET() {
  return xmlResponse(await sitemapXml("post"));
}
