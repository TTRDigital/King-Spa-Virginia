import { $, $$ } from "./dom";

/*
 * Smaller page scripts from the live site: the header shadow after 200px of
 * scrolling, stretched sections, blog call-to-action click events, publish dates on related-post
 * cards, and the blog's article search.
 */

type PostInfo = { id: number; title: string; url: string; image: string; date: string; modified: string };

function data(): { posts?: PostInfo[] } {
  try {
    return JSON.parse(document.getElementById("ks-data")?.textContent || "{}");
  } catch {
    return {};
  }
}

function stickyHeader() {
  const body = $(".ks-body");
  if (!body) return;
  // Elementor's sticky sections (the header): same classes as on the live site; the stylesheet keeps them at the top.
  for (const sec of $$("[data-settings*='\"sticky\":\"top\"']")) sec.classList.add("elementor-sticky", "elementor-sticky--active", "elementor-sticky--effects");
  const on = () => body.classList.toggle("sticky-header", scrollY >= 200);
  on();
  addEventListener("scroll", on, { passive: true });
}

/** Elementor "stretch section": the section spans the whole window, whatever box it sits in. */
function stretchSections() {
  const secs = $$(".elementor-section-stretched");
  if (!secs.length) return;
  const fit = () => {
    const page = document.body.getBoundingClientRect();
    for (const s of secs) {
      s.style.width = "";
      s.style.left = "";
      const offset = s.getBoundingClientRect().left - page.left;
      s.style.width = `${document.body.clientWidth}px`;
      s.style.left = `${-offset}px`;
    }
  };
  fit();
  addEventListener("resize", fit);
}

/** Blog CTA boxes: the same dataLayer / gtag event the live posts sent. */
function ctaTracking() {
  const links = $$<HTMLAnchorElement>(".ks-primary-cta a, .ks-sticky-cta a");
  if (!links.length) return;
  const pageId = Number(($(".ks-body")?.className.match(/\bpostid-(\d+)\b/) ?? [])[1]) || undefined;
  const type = (h: string) => (h.includes("AdmissionList") ? "day_pass" : h.includes("GiftCardList") ? "gift_card" : h.startsWith("tel:") ? "phone_call" : h.includes("/subscribe") ? "newsletter" : "other");
  for (const a of links) {
    a.addEventListener("click", () => {
      const cta_type = type(a.getAttribute("href") ?? "");
      const cta_location = a.closest(".ks-sticky-cta") ? "sticky_mobile" : a.closest(".ks-primary-cta") ? "primary_cta" : "blog_body";
      const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
      (w.dataLayer = w.dataLayer || []).push({ event: "blog_cta_click", cta_type, cta_location, page_id: pageId });
      w.gtag?.("event", "blog_cta_click", { cta_type, cta_location, page_id: pageId });
    });
  }
}

const fmt = (v: string) => new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(v.slice(0, 10) + "T12:00:00Z"));

/** "Published: … | Updated: …" on related-post cards (the live site fetched these from WordPress). */
function cardDates(posts: PostInfo[]) {
  for (const card of $$(".eael-grid-post[data-id]")) {
    const p = posts.find((x) => String(x.id) === card.dataset.id);
    const head = $(".eael-entry-header", card);
    if (!p || !head || $(".ksv-post-dates", head)) continue;
    const d = document.createElement("div");
    d.className = "ksv-post-dates";
    d.textContent = `Published: ${fmt(p.date)} | Updated: ${fmt(p.modified)}`;
    d.style.cssText = "font-size:13px;line-height:1.5;margin:8px 0;color:#667085";
    head.appendChild(d);
  }
}

/** Blog page search box: results after 3 letters, cleared on a click elsewhere (theme's ajax-scripts.js). */
function blogSearch(posts: PostInfo[]) {
  const input = $<HTMLInputElement>("#postSearch");
  const list = $("#posts-lists");
  if (!input || !list) return;
  const close = $("#ajax-close");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const clear = () => {
    if (close) close.style.display = "none";
    list.innerHTML = "";
    input.value = "";
  };
  input.addEventListener("keyup", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length <= 2) return;
    const hits = posts.filter((p) => p.title.toLowerCase().includes(q));
    if (!hits.length) return clear();
    if (close) close.style.display = "";
    list.innerHTML = hits.map((p) => `<div class="post-item"><a href="${esc(p.url)}">${p.image ? `<img src="${esc(p.image)}" class="attachment-post-thumbnail size-post-thumbnail wp-post-image" alt="" decoding="async" loading="lazy">` : ""}<h2>${esc(p.title)}</h2></a></div>`).join("");
  });
  close?.addEventListener("click", (e) => {
    e.preventDefault();
    clear();
  });
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains("search-posts") && !t.closest("#posts-lists")) clear();
  });
}

export function initMisc() {
  stickyHeader();
  stretchSections();
  ctaTracking();
  const posts = data().posts ?? [];
  cardDates(posts);
  blogSearch(posts);
}
