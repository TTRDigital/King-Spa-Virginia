import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PageData } from "@/lib/types";

/*
 * Structured data exactly as the live page had it: Rank Math's graph and the
 * site's DaySpa block, captured with each page (page.ldjson). Only photo URLs
 * change: wp-content/uploads paths point at the same files on this site.
 */
const UPLOADS = /https:\/\/virginia\.kingspa\.com\/wp-content\/uploads\/([^"\\?#]+)/g;

function localize(json: string): string {
  return json.replace(UPLOADS, (m, rel: string) => (existsSync(path.join(process.cwd(), "public/images/wp", rel)) ? `https://virginia.kingspa.com/images/wp/${rel}` : m));
}

/** The page's JSON-LD blocks, in the live order. */
export function pageJsonLd(page: PageData): unknown[] {
  return (page.ldjson ?? []).map((ld) => JSON.parse(localize(JSON.stringify(ld))));
}
