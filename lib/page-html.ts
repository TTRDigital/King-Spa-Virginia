import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { document, optimizeHtml, photoSize, region } from "@/lib/render";
import redirectedPosts from "@/lib/data/redirected-posts.json";
import type { Chrome, Column, PageData, Section, Widget } from "@/lib/types";

/*
 * Assembles a whole page the way WordPress served it:
 *   <a class="skip-link"> + #page (header#masthead, #content, footer#colophon) + popups
 * Elementor Canvas pages (no theme header/footer) are just the document + popups.
 */

/**
 * Elementor popup shown on page load, in the wrapper Elementor's script builds for it. One that
 * opens with no delay is open in the HTML already (the runtime adds closing and focus), so it is in
 * the first paint, its photo loading right away; others stay hidden until the runtime opens them.
 */
function popupHtml(p: Chrome["popups"][number]): string {
  const t = (p.settings as { triggers?: { page_load?: string; page_load_delay?: number } }).triggers;
  const open = t?.page_load === "yes" && !Number(t.page_load_delay || 0);
  // Photo sized for the popup box (820px wide on the live site, full width on phones).
  const ctx = { eager: open ? 99 : 0, highUsed: true };
  // width/height (the photo's own) so the box keeps its shape while the photo loads (its CSS sets height:auto).
  const sized = document(p.doc, ctx).replace(/<img\b([^>]*?)\s*\/?>/g, (m, attrs: string) => {
    const src = / src="([^"]+)"/.exec(attrs)?.[1];
    const size = src && !/\swidth=/.test(attrs) ? photoSize(src) : null;
    return size ? `<img${attrs} width="${size[0]}" height="${size[1]}">` : m;
  });
  const doc = optimizeHtml(sized, ctx)
    .replace(/sizes="[^"]*"/g, 'sizes="(max-width: 820px) 100vw, 820px"')
    .replace('class="elementor elementor-', 'style="display: block;" class="elementor elementor-');
  return (
    `<div class="dialog-widget dialog-lightbox-widget dialog-type-buttons dialog-type-lightbox elementor-popup-modal${open ? " ks-popup-open" : ""}" id="elementor-popup-modal-${p.id}" aria-modal="true" role="document" tabindex="0"${open ? "" : ' style="display:none"'} data-ks-popup='${JSON.stringify(p.settings).replace(/'/g, "&#39;")}'>` +
    `<div class="dialog-widget-content dialog-lightbox-widget-content animated${open ? " fadeIn" : ""}"><a role="button" tabindex="0" aria-label="Close" href="#" class="dialog-close-button dialog-lightbox-close-button"><i class="eicon-close"></i></a>` +
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
  if (!/(^|\s)postid-\d+(\s|$)/.test(page.bodyClass)) return null;
  const pub = page.og["article:published_time"];
  const mod = page.og["article:modified_time"] ?? page.og["og:updated_time"] ?? pub;
  if (!pub) return null;
  const f = (v: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(v.slice(0, 10) + "T12:00:00Z"));
  return `<div class="ksv-post-dates" style="font-size:13px;line-height:1.5;margin:8px 0;color:#667085">Published: ${f(pub)} | Updated: ${f(mod)}</div>`;
}

/** Marks this page's item (and its parents) in the header menu, as WordPress did. */
function markCurrent(header: string, page: PageData): string {
  return header.replace(/<li class="([^"]*)" id="(menu-item-\d+)">(<a class="hfe-sub-menu-item)?/g, (_m, cls: string, id: string, sub?: string) => {
    const item = page.nav?.[id];
    // Current items get their classes as WordPress wrote them on this page; the others lose the home page's current-* classes.
    const classes = item?.cls ?? cls.split(/\s+/).filter((c) => c && !c.startsWith("current")).join(" ");
    const link = sub ? (item?.linkActive ? `${sub} hfe-sub-menu-item-active` : sub) : "";
    return `<li class="${classes}" id="${id}">${link}`;
  });
}

export function pageHtml(page: PageData, chrome: Chrome): string {
  // With a hero background photo (preloaded by the page), that photo is the one that loads first:
  // the images below it wait (only the first loads right away, none with high priority).
  const hero = heroBackground(page) !== null;
  let content = region(page.shell, page.docs, { eager: hero ? 1 : 3, highUsed: hero, lazyBgFrom: 2 });
  const dates = postDates(page);
  if (dates) content = content.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/, `$1${dates}`);
  const popups = activePopups(chrome).map(popupHtml).join("");
  if (page.canvas) return content + popups;
  const header = markCurrent(region(chrome.header.shell, chrome.header.docs, { eager: 1 }), page);
  const footer = region(chrome.footer.shell, chrome.footer.docs, { eager: 0, lazyBgFrom: 0 });
  return `<a class="skip-link screen-reader-text" href="#content">Skip to content</a><div class="hfeed site" id="page">${header}${content}${footer}</div>${popups}`;
}

/**
 * Published posts (id, title, link, photo, dates) for the blog search and related-post cards: the
 * site's posts, plus published posts whose own URLs the live site redirects (they still appear in
 * related-post cards and search results there).
 */
export function postIndex(pages: PageData[]) {
  const own = pages
    .filter((p) => /(^|\s)postid-\d+(\s|$)/.test(p.bodyClass))
    .map((p) => ({
      id: Number((p.bodyClass.match(/\bpostid-(\d+)\b/) ?? [])[1]) || 0,
      title: (p.og["og:title"] ?? p.title).replace(/ - KING SPA Virginia$/, ""),
      url: p.path,
      image: p.og["og:image"] ?? "",
      date: p.og["article:published_time"] ?? "",
      modified: p.og["article:modified_time"] ?? p.og["article:published_time"] ?? "",
    }));
  return [...own, ...redirectedPosts.filter((r) => !own.some((p) => p.id === r.id))];
}

/** /css/<page>.css?v=<hash> (written by scripts/optimize-images.mjs from lib/data/css). */
export function stylesheetHref(page: PageData): string {
  const key = page.cssKey ?? page.key;
  // Hash of the file the browser gets (public/css, written before `next build`), else of its source.
  const built = path.join(process.cwd(), "public/css", `${key}.css`);
  const file = existsSync(built) ? built : path.join(process.cwd(), "lib/data/css", `${key}.css`);
  const v = existsSync(file) ? createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 10) : "0";
  return `/css/${key}.css?v=${v}`;
}

/**
 * The background photo of the page's first section (its hero), if it has one: the page's CSS rule
 * (outside media queries) for that section or an element inside it. Preloaded by the page.
 */
export function heroBackground(page: PageData): string | null {
  const first = page.docs[0]?.sections[0];
  if (!first) return null;
  const ids = new Set<string>();
  const walk = (n: Section | Column | Widget) => {
    const id = n.attrs?.["data-id"];
    if (typeof id === "string") ids.add(id);
    if (n._type === "section") n.columns.forEach(walk);
    else if (n._type === "column") n.children.forEach(walk);
  };
  walk(first);
  const file = path.join(process.cwd(), "lib/data/css", `${page.cssKey ?? page.key}.css`);
  if (!existsSync(file)) return null;
  let hero: string | null = null;
  postcss.parse(readFileSync(file, "utf8")).walkRules((rule) => {
    if (hero || rule.parent?.type === "atrule") return;
    if (![...rule.selector.matchAll(/\.elementor-element-([0-9a-f]+)/g)].some((m) => ids.has(m[1]))) return;
    rule.walkDecls(/^background(-image)?$/, (d) => {
      hero ??= d.value.match(/url\((['"]?)(\/images\/[^'")]+\.(?:jpe?g|png|webp))\1\)/i)?.[2] ?? null;
    });
  });
  return hero;
}

/** The site's text and heading fonts: preloaded so the first screen's text does not reflow when they arrive. */
const PRELOAD_FONTS = ["Mulish", "DM Serif Display"];

/** The woff2 files of PRELOAD_FONTS (upright, Latin) that the page's stylesheet uses. */
export function preloadFonts(page: PageData): string[] {
  const file = path.join(process.cwd(), "lib/data/css", `${page.cssKey ?? page.key}.css`);
  if (!existsSync(file)) return [];
  const urls = new Set<string>();
  postcss.parse(readFileSync(file, "utf8")).walkAtRules("font-face", (at) => {
    const prop = (name: string) => at.nodes?.find((d): d is postcss.Declaration => d.type === "decl" && d.prop === name)?.value ?? "";
    const family = prop("font-family").replace(/["']/g, "").trim();
    if (!PRELOAD_FONTS.includes(family) || prop("font-style") === "italic") return;
    const range = prop("unicode-range");
    if (range && !/U\+0000-00FF/i.test(range)) return;
    const url = /url\((['"]?)(\/[^'")]+\.woff2)\1\)/.exec(prop("src"))?.[2];
    if (url) urls.add(url);
  });
  return [...urls];
}
