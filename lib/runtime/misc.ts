import { $, $$, device, settings } from "./dom";

/*
 * Smaller page scripts from the live site: Elementor Pro's sticky sections and
 * widgets, the header shadow after 200px of scrolling, stretched sections, blog call-to-action click events, publish dates on related-post
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

/* ---------- Elementor Pro sticky (jquery.sticky.js and its handler, Pro 4.1) ---------- */

type StickyCfg = { to: "top" | "bottom"; offset: number; effectsOffset: number };

/** Elementor's getCurrentDeviceSetting: the device's value, else the next larger device's, else desktop's. */
function deviceSetting(s: Record<string, unknown>, key: string): number {
  const devices = ["desktop", "tablet", "mobile"];
  for (let i = devices.indexOf(device()); i > 0; i--) {
    const v = s[`${key}_${devices[i]}`];
    if (v || v === 0) return Number(v);
  }
  return Number(s[key]);
}

/** Size of a box as jquery.sticky measures it (border and padding added for content-box). */
function boxSize(el: HTMLElement, prop: "width" | "height"): number {
  const cs = getComputedStyle(el);
  let v = parseFloat(cs[prop]);
  if (cs.boxSizing !== "border-box") for (const part of ["border", "padding"]) for (const side of prop === "height" ? ["top", "bottom"] : ["left", "right"]) v += parseFloat(cs.getPropertyValue(part === "border" ? `border-${side}-width` : `padding-${side}`));
  return v;
}

const UNSTICKY = ["position", "width", "margin-top", "margin-bottom", "top", "bottom", "inset-inline-start"];

function sticky(el: HTMLElement, cfg: StickyCfg) {
  let stuck = false;
  let effects = false;
  let spacer: HTMLElement | null = null;
  let width = 0;
  let left = 0;
  let backup: Record<string, string> = {};
  const measure = () => {
    width = boxSize(el, "width");
    left = el.getBoundingClientRect().left + scrollX;
  };
  const addSpacer = () => {
    spacer = el.cloneNode(true) as HTMLElement;
    spacer.classList.add("elementor-sticky__spacer");
    Object.assign(spacer.style, { visibility: "hidden", transition: "none", animation: "none" });
    el.after(spacer);
  };
  const stick = () => {
    backup = Object.fromEntries(UNSTICKY.map((p) => [p, el.style.getPropertyValue(p)]));
    el.style.position = "fixed";
    el.style.width = `${width}px`;
    el.style.marginTop = "0px";
    el.style.marginBottom = "0px";
    el.style.setProperty(cfg.to, `${cfg.offset}px`);
    el.style.setProperty(cfg.to === "top" ? "bottom" : "top", "");
    if (left) el.style.setProperty("inset-inline-start", `${left}px`);
    el.classList.add("elementor-sticky--active", "elementor-section--handles-inside");
  };
  const unstick = () => {
    for (const [p, v] of Object.entries(backup)) el.style.setProperty(p, v);
    el.classList.remove("elementor-sticky--active", "elementor-section--handles-inside");
  };
  // How far the box is from its sticking point (top: its top edge to the offset; bottom: its bottom edge to the window bottom minus the offset).
  const distance = (e: HTMLElement) => {
    const top = e.getBoundingClientRect().top;
    return cfg.to === "top" ? top - cfg.offset : -(top - innerHeight + boxSize(e, "height")) - cfg.offset;
  };
  const check = () => {
    let t: number;
    if (stuck) {
      t = distance(spacer!);
      if (t > 0) {
        unstick();
        spacer?.remove();
        spacer = null;
        stuck = false;
      }
    } else {
      t = distance(el);
      if (t <= 0) {
        measure();
        addSpacer();
        stick();
        stuck = true;
      }
    }
    if (effects && -t < cfg.effectsOffset) {
      el.classList.remove("elementor-sticky--effects");
      effects = false;
    } else if (!effects && -t >= cfg.effectsOffset) {
      el.classList.add("elementor-sticky--effects");
      effects = true;
    }
  };
  const resize = () => {
    if (!stuck) return;
    unstick();
    spacer?.remove();
    measure();
    addSpacer();
    stick();
  };
  el.classList.add("elementor-sticky");
  addEventListener("scroll", check);
  addEventListener("resize", resize);
  check();
  return () => {
    if (stuck) {
      unstick();
      spacer?.remove();
      spacer = null;
      stuck = false;
    }
    removeEventListener("scroll", check);
    removeEventListener("resize", resize);
    el.classList.remove("elementor-sticky");
  };
}

/** Sections and widgets set to "sticky": stuck on the chosen devices, re-set when a resize changes the offsets. */
export function initSticky() {
  for (const el of $$<HTMLElement>("[data-settings*='\"sticky\":']")) {
    if (el.closest(".elementor-sticky__spacer")) continue;
    const s = settings<Record<string, unknown> & { sticky?: "top" | "bottom"; sticky_on?: string[] }>(el);
    if (!s.sticky) continue;
    let destroy: (() => void) | null = null;
    let current = "";
    const config = (): StickyCfg => ({ to: s.sticky!, offset: deviceSetting(s, "sticky_offset"), effectsOffset: deviceSetting(s, "sticky_effects_offset") });
    const run = (again = false) => {
      if (!(s.sticky_on ?? []).includes(device())) {
        destroy?.();
        destroy = null;
      } else if (again || !destroy) {
        destroy?.();
        current = JSON.stringify(config());
        destroy = sticky(el, config());
      }
    };
    let timer = 0;
    addEventListener("resize", () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (JSON.stringify(config()) !== current) run(true);
      }, 300);
    });
    run();
  }
}

function stickyHeader() {
  const body = $(".ks-body");
  if (!body) return;
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
