import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { document, optimizeHtml, region } from "@/lib/render";
import type { Chrome, PageData } from "@/lib/types";

/*
 * Assembles a whole page the way WordPress served it:
 *   <a class="skip-link"> + #page (header#masthead, #content, footer#colophon) + popups
 * Elementor Canvas pages (no theme header/footer) are just the document + popups.
 */

/** Elementor popup shown on page load, in the wrapper Elementor's script builds for it. */
function popupHtml(p: Chrome["popups"][number]): string {
  const doc = optimizeHtml(document(p.doc, { eager: 0 }), { eager: 0 }).replace('class="elementor elementor-', 'style="display: block;" class="elementor elementor-');
  return (
    `<div class="dialog-widget dialog-lightbox-widget dialog-type-buttons dialog-type-lightbox elementor-popup-modal" id="elementor-popup-modal-${p.id}" aria-modal="true" role="document" tabindex="0" style="display:none" data-ks-popup='${JSON.stringify(p.settings).replace(/'/g, "&#39;")}'>` +
    `<div class="dialog-widget-content dialog-lightbox-widget-content animated"><a role="button" tabindex="0" aria-label="Close" href="#" class="dialog-close-button dialog-lightbox-close-button"><i class="eicon-close"></i></a>` +
    `<div class="dialog-header dialog-lightbox-header"></div><div class="dialog-message dialog-lightbox-message">${doc}</div><div class="dialog-buttons-wrapper dialog-lightbox-buttons-wrapper"></div></div></div>`
  );
}

/** Popups that are switched on now (expired scheduled ones are left out, as WordPress does). */
export function activePopups(chrome: Chrome, now = new Date()): Chrome["popups"] {
  return chrome.popups.filter((p) => {
    const t = (p.settings as { timing?: { schedule?: string; schedule_end_date?: string } }).timing;
    if (t && !Array.isArray(t) && t.schedule === "yes" && t.schedule_end_date && new Date(t.schedule_end_date.replace(" ", "T")) < now) return false;
    return true;
  });
}

/** "Published: Oct 6, 2026 | Updated: Oct 9, 2026" under a post's title (the live site added it with a script). */
function postDates(page: PageData): string | null {
  if (!/\bsingle-post\b/.test(page.bodyClass)) return null;
  const pub = page.og["article:published_time"];
  const mod = page.og["article:modified_time"] ?? page.og["og:updated_time"] ?? pub;
  if (!pub) return null;
  const f = (v: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(v.slice(0, 10) + "T12:00:00Z"));
  return `<div class="ksv-post-dates" style="font-size:13px;line-height:1.5;margin:8px 0;color:#667085">Published: ${f(pub)} | Updated: ${f(mod)}</div>`;
}

/** Marks this page's item (and its parents) in the header menu, as WordPress did. */
function markCurrent(header: string, page: PageData): string {
  return header.replace(/<li class="([^"]*)" id="(menu-item-\d+)"/g, (_m, cls: string, id: string) => {
    const base = cls.split(/\s+/).filter((c) => c && !c.startsWith("current")).join(" ");
    const extra = page.nav?.[id]?.cls;
    return `<li class="${extra ? `${base} ${extra}` : base}" id="${id}"`;
  });
}

export function pageHtml(page: PageData, chrome: Chrome): string {
  let content = region(page.shell, page.docs, { eager: 3 });
  const dates = postDates(page);
  if (dates) content = content.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/, `$1${dates}`);
  const popups = activePopups(chrome).map(popupHtml).join("");
  if (page.canvas) return content + popups;
  const header = markCurrent(region(chrome.header.shell, chrome.header.docs, { eager: 1 }), page);
  const footer = region(chrome.footer.shell, chrome.footer.docs, { eager: 0 });
  return `<a class="skip-link screen-reader-text" href="#content">Skip to content</a><div class="hfeed site" id="page">${header}${content}${footer}</div>${popups}`;
}

/** Published posts (id, title, link, photo, dates) for the blog search and related-post cards. */
export function postIndex(pages: PageData[]) {
  return pages
    .filter((p) => /\bsingle-post\b/.test(p.bodyClass))
    .map((p) => ({
      id: Number((p.bodyClass.match(/\bpostid-(\d+)\b/) ?? [])[1]) || 0,
      title: (p.og["og:title"] ?? p.title).replace(/ - KING SPA Virginia$/, ""),
      url: p.path,
      image: p.og["og:image"] ?? "",
      date: p.og["article:published_time"] ?? "",
      modified: p.og["article:modified_time"] ?? p.og["article:published_time"] ?? "",
    }));
}

/** /css/<page>.css?v=<hash> (written by scripts/optimize-images.mjs from lib/data/css). */
export function stylesheetHref(page: PageData): string {
  const key = page.cssKey ?? page.key;
  const file = path.join(process.cwd(), "lib/data/css", `${key}.css`);
  const v = existsSync(file) ? createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 10) : "0";
  return `/css/${key}.css?v=${v}`;
}
