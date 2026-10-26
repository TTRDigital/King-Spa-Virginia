import { $, $$, device, headerHeight, settings, slide } from "./dom";

/*
 * Elementor and Essential Addons widgets, with the plugins' own behaviour:
 * toggles, accordions, tabs, the theme's custom tab blocks, the "rate us"
 * stars, the table of contents and the share buttons.
 */

/* ---------- Elementor toggle / accordion / tabs ---------- */

function setTab(title: HTMLElement, content: HTMLElement | null, open: boolean, animate = true) {
  title.classList.toggle("elementor-active", open);
  title.setAttribute("aria-expanded", String(open));
  title.setAttribute("aria-selected", String(open));
  if (!content) return;
  content.classList.toggle("elementor-active", open);
  if (animate) slide(content, open, 400);
  else content.style.display = open ? "block" : "none";
}

const contentOf = (title: HTMLElement) => document.getElementById(title.getAttribute("aria-controls") ?? "") as HTMLElement | null;

function toggles() {
  for (const box of $$(".elementor-toggle")) {
    const titles = $$(":scope > .elementor-toggle-item > .elementor-tab-title", box);
    for (const t of titles) {
      t.addEventListener("click", () => setTab(t, contentOf(t), !t.classList.contains("elementor-active")));
      t.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          t.click();
        }
      });
    }
    // The theme opens the first item of every toggle once the page has loaded.
    if (titles[0]) setTab(titles[0], contentOf(titles[0]), true, false);
  }
}

function accordions() {
  for (const box of $$(".elementor-accordion")) {
    const titles = $$(":scope > .elementor-accordion-item > .elementor-tab-title", box);
    titles.forEach((t, i) => {
      // Elementor opens the first item.
      if (i === 0) setTab(t, contentOf(t), true, false);
      t.addEventListener("click", () => {
        const open = !t.classList.contains("elementor-active");
        for (const o of titles) if (o !== t && o.classList.contains("elementor-active")) setTab(o, contentOf(o), false);
        setTab(t, contentOf(t), open);
      });
    });
  }
  // Offers page: its accordion starts closed (page script, 1 second after load).
  setTimeout(() => {
    for (const t of $$(".closeAccordion .elementor-tab-title")) t.classList.remove("elementor-active");
    for (const c of $$(".closeAccordion .elementor-tab-content")) c.style.display = "none";
  }, 1000);
}

function tabs() {
  for (const box of $$(".elementor-tabs")) {
    const all = $$(".elementor-tab-title", box);
    const activate = (n: string) => {
      for (const t of all) {
        const on = t.dataset.tab === n;
        t.classList.toggle("elementor-active", on);
        t.setAttribute("aria-selected", String(on));
        t.setAttribute("tabindex", on ? "0" : "-1");
      }
      for (const c of $$(".elementor-tab-content", box)) {
        const on = c.dataset.tab === n;
        c.classList.toggle("elementor-active", on);
        c.hidden = !on;
        c.style.display = on ? "block" : "none";
      }
    };
    for (const t of all) t.addEventListener("click", () => activate(t.dataset.tab ?? "1"));
    activate("1");
  }
}

/* ---------- Essential Addons accordion / tabs ---------- */

function eaelAccordions() {
  const hash = location.hash.slice(1);
  for (const box of $$(".eael-adv-accordion")) {
    const type = box.dataset.accordionType;
    const speed = Number(box.dataset.toogleSpeed) || 300;
    const headers = $$(".eael-accordion-header", box);
    let byHash = false;
    for (const h of headers)
      if (hash && h.id === hash) {
        byHash = true;
        h.classList.add("show-this", "active");
        slide(h.nextElementSibling as HTMLElement, true, speed);
      }
    if (!byHash)
      for (const h of headers)
        if (h.classList.contains("active-default")) {
          h.classList.add("show-this", "active");
          (h.nextElementSibling as HTMLElement).style.display = "block";
        }
    for (const h of headers) {
      const panel = h.nextElementSibling as HTMLElement;
      h.addEventListener("click", (e) => {
        e.preventDefault();
        if (h.classList.contains("show-this")) {
          h.classList.remove("show-this", "active");
          slide(panel, false, speed);
        } else {
          if (type === "accordion")
            for (const o of headers)
              if (o !== h && o.classList.contains("show-this")) {
                o.classList.remove("show-this", "active");
                slide(o.nextElementSibling as HTMLElement, false, speed);
              }
          h.classList.add("show-this", "active");
          slide(panel, true, speed);
        }
      });
      h.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") h.click();
      });
    }
  }
}

function eaelTabs() {
  for (const box of $$(".eael-advance-tabs")) {
    const items = $$(":scope > .eael-tabs-nav > ul > li", box);
    const panes = $$(":scope > .eael-tabs-content > div", box);
    const def = items.findIndex((li) => li.classList.contains("active-default"));
    const start = def >= 0 ? def : box.classList.contains("eael-tab-auto-active") ? 0 : -1;
    const activate = (i: number) => {
      items.forEach((li, j) => {
        li.classList.toggle("active", i === j);
        li.classList.toggle("inactive", i !== j);
        if (i !== j) li.classList.remove("active-default");
        li.setAttribute("aria-selected", String(i === j));
        li.setAttribute("tabindex", i === j ? "0" : "-1");
      });
      panes.forEach((p, j) => {
        p.classList.toggle("active", i === j);
        p.classList.toggle("inactive", i !== j);
        p.classList.remove("active-default");
      });
    };
    if (start >= 0) {
      items.forEach((li, j) => li.classList.toggle(j === start ? "active" : "inactive", true));
      panes.forEach((p, j) => p.classList.toggle(j === start ? "active" : "inactive", true));
    }
    items.forEach((li, i) => {
      li.addEventListener("click", (e) => {
        e.preventDefault();
        activate(i);
      });
      li.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const cur = items.findIndex((x) => x.classList.contains("active"));
        const n = e.key === "ArrowRight" ? (cur + 1) % items.length : (cur - 1 + items.length) % items.length;
        items[n].focus();
        activate(n);
      });
    });
  }
}

/* ---------- the theme's own tab blocks (wp-content/themes/kingspa/js/custom.js) ---------- */

const slug = (s: string) => s.trim().replace(/\s+/g, "-").toLowerCase();

function themeTabs() {
  // Home: "Explore Our Sanctuary of Healing".
  const list = $$(".healing-explore-tab-list ul li");
  const indexItems = () => {
    for (const ul of $$(".healing-explore-tab-content-wrap ul")) $$("li", ul).forEach((li, i) => li.setAttribute("data-index", String(i)));
    for (const wrap of $$(".healing-explore-tab-content .sanctuary-healing-images-wrap > .elementor-widget-wrap")) $$(".elementor-widget", wrap).forEach((w, i) => w.setAttribute("data-index", String(i)));
  };
  indexItems();
  for (const li of $$(".healing-explore-tab-content-wrap ul li")) {
    li.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = li.dataset.index;
      for (const a of $$(".healing-explore-tab-content-wrap ul li a")) a.classList.remove("active");
      $("a", li)?.classList.add("active");
      const target = li.closest(".healing-explore-tab-content-wrap")?.nextElementSibling?.querySelector(`[data-index='${idx}']`);
      if (target) {
        target.classList.add("active");
        for (const s of Array.from(target.parentElement?.children ?? [])) if (s !== target) s.classList.remove("active");
      }
    });
  }
  list[0]?.classList.add("active");
  for (const li of list) {
    li.addEventListener("click", () => {
      li.classList.add("active");
      for (const s of Array.from(li.parentElement?.children ?? [])) if (s !== li) s.classList.remove("active");
      const pane = $(`.healing-explore-tab-content.${CSS.escape(slug(li.textContent ?? ""))}`);
      if (!pane) return;
      pane.classList.add("active");
      for (const s of Array.from(pane.parentElement?.children ?? [])) if (s !== pane) s.classList.remove("active");
      ($(`ul li`, pane) as HTMLElement | null)?.click();
    });
  }

  // Body scrub page: tab list + accordion with photos.
  const tl = $$(".tab-list-wrapper ul li");
  tl[0]?.classList.add("active");
  for (const li of tl) {
    li.addEventListener("click", (e) => {
      e.preventDefault();
      li.classList.add("active");
      for (const s of Array.from(li.parentElement?.children ?? [])) if (s !== li) s.classList.remove("active");
      const cls = slug(li.textContent ?? "").replace("'", "");
      const sec = $(`section.${CSS.escape(cls)}`);
      if (!sec) return;
      sec.classList.add("active");
      for (const s of Array.from(sec.parentElement?.children ?? [])) if (s !== sec) s.classList.remove("active");
      ($("ul li", sec) as HTMLElement | null)?.click();
    });
  }
  for (const acc of $$(".tab-accordion-list-wrap .eael-adv-accordion")) $$(".eael-accordion-list", acc).forEach((x, i) => x.setAttribute("data-index", String(i)));
  for (const wrap of $$(".tab-accordion-images-wrap > .elementor-widget-wrap")) $$(".elementor-widget", wrap).forEach((x, i) => x.setAttribute("data-index", String(i)));
  for (const item of $$(".tab-accordion-list-wrap .eael-adv-accordion .eael-accordion-list")) {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const t = item.closest("section")?.querySelector(`.tab-accordion-images-wrap [data-index='${item.dataset.index}']`);
      if (!t) return;
      t.classList.add("active");
      for (const s of Array.from(t.parentElement?.children ?? [])) if (s !== t) s.classList.remove("active");
    });
  }

  // Explore pages: sticky in-page menu that follows the sections.
  const wrapper = $(".tab-links-wrapper");
  if (wrapper) {
    const body = $(".ks-body");
    const links = $$(".tab-links-wrapper ul.elementor-icon-list-items li a");
    links[0]?.classList.add("active");
    const stickyTop = wrapper.getBoundingClientRect().top + scrollY - headerHeight();
    const first = $("#main section")?.getBoundingClientRect().height ?? 0;
    const onScroll = () => {
      const top = scrollY;
      body?.classList.toggle("sticky", stickyTop <= top);
      if (top >= headerHeight()) {
        $$("#main section.slider-content-wrapper").forEach((sec, i) => {
          if (sec.offsetTop - first <= top + 42) {
            for (const a of links) a.classList.remove("active");
            links[i]?.classList.add("active");
          }
        });
      } else links[0]?.classList.add("active");
    };
    addEventListener("scroll", onScroll, { passive: true });
  }
}

/* ---------- "How would you rate your experience?" (Reviews page) ---------- */

function reviewStars() {
  const google = document.getElementById("google-review");
  if (google) google.style.display = "none";
  for (const w of $$(".custom-review-star-widget")) {
    const stars = $$("ul li", w);
    const paint = (n: number, keepSelected: boolean) =>
      stars.forEach((li, i) => {
        const on = i < n || (keepSelected && li.classList.contains("selected"));
        $("i", li)?.setAttribute("class", on ? "fas fa-star" : "far fa-star");
      });
    stars.forEach((li, i) => {
      li.addEventListener("click", () => {
        stars.forEach((s, j) => s.classList.toggle("selected", j <= i));
        paint(i + 1, false);
        const widget = w.closest(".elementor-widget-reviews_star_widgets");
        const next = widget?.nextElementSibling as HTMLElement | null;
        const form = $(".custom-view-form-wrap", w);
        if (i >= 3) {
          if (next) next.style.display = "";
          if (form) form.style.display = "none";
        } else {
          if (next) next.style.display = "none";
          if (form) form.style.display = "block";
        }
      });
      li.addEventListener("mouseenter", () => paint(i + 1, true));
      li.addEventListener("mouseleave", () => paint(stars.filter((s) => s.classList.contains("selected")).length, false));
    });
  }
}

/* ---------- table of contents ---------- */

const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Elementor Pro's table of contents (table-of-contents.js, Pro 4.1), step for step: the headings it
 * lists, the anchors it adds, the list markup, the item it highlights while reading (one
 * IntersectionObserver per item, with the same rules) and the minimised box.
 */
function toc() {
  for (const w of $$(".elementor-widget-table-of-contents")) {
    const s = settings<{ headings_by_tags?: string[]; exclude_headings_by_selector?: string | string[]; container?: string; no_headings_message?: string; minimize_box?: string; minimized_on?: string; marker_view?: string; hierarchical_view?: string; min_height?: { size?: string | number; unit?: string } }>(w);
    const body = $(".elementor-toc__body", w);
    if (!body) continue;
    const popup = w.closest<HTMLElement>(".elementor")?.dataset.elementorType === "popup" ? w.closest<HTMLElement>(".elementor") : null;
    const containers = s.container ? $$(s.container) : popup ? [popup] : $$('.elementor:not([data-elementor-type="header"]):not([data-elementor-type="footer"]):not([data-elementor-type="popup"])');
    const exclude = (Array.isArray(s.exclude_headings_by_selector) ? s.exclude_headings_by_selector.join(",") : s.exclude_headings_by_selector) || "";
    const tags = (s.headings_by_tags ?? ["h2", "h3", "h4", "h5", "h6"]).join(",");
    const heads = [...new Set(containers.flatMap((c) => $$(tags, c)))].filter((h) => !h.matches(".elementor-toc__header-title") && !(exclude && h.closest(exclude)));
    if (!heads.length) {
      body.innerHTML = s.no_headings_message ?? "";
      continue;
    }
    // Anchor: the heading's own id or its widget's, else a span Elementor puts before the heading.
    const items = heads.map((h, i) => {
      const own = h.id || h.closest<HTMLElement>(".elementor-widget")?.id;
      return { tag: Number(h.tagName.slice(1)), text: h.textContent ?? "", own: !!own, link: own || `elementor-toc__heading-anchor-${i}`, level: undefined as number | undefined };
    });
    heads.forEach((h, i) => {
      if (!items[i].own) h.insertAdjacentHTML("beforebegin", `<span id="${items[i].link}" class="elementor-menu-anchor "></span>`);
    });
    // Hierarchical view: a heading nests under the nearest earlier heading of a higher rank.
    if (s.hierarchical_view)
      items.forEach((it, i) => {
        it.level = 0;
        for (let j = i - 1; j >= 0; j--) {
          if (items[j].tag <= it.tag) {
            it.level = items[j].level! + (items[j].tag < it.tag ? 1 : 0);
            break;
          }
        }
      });
    const tag = s.marker_view === "numbers" ? "ol" : "ul";
    let pointer = 0;
    const level = (lv?: number): string => {
      let html = `<${tag} class="elementor-toc__list-wrapper">`;
      while (pointer < items.length) {
        const it = items[pointer];
        if (lv! > it.level!) break;
        if (lv === it.level) {
          html += `<li class="elementor-toc__list-item"><div class="elementor-toc__list-item-text-wrapper"><a href="#${it.link}" class="elementor-toc__list-item-text${it.level === 0 ? " elementor-toc__top-level" : ""}">${escHtml(it.text)}</a></div>`;
          pointer++;
          const next = items[pointer];
          if (next && lv! < next.level!) html += level(next.level);
          html += "</li>";
        }
      }
      return `${html}</${tag}>`;
    };
    body.innerHTML = s.hierarchical_view ? level(0) : level();
    // The item of the heading being read is highlighted.
    const links = $$<HTMLAnchorElement>(".elementor-toc__list-item-text", w);
    const at = (i: number) => (i < 0 ? links[links.length + i] : links[i]); // jQuery's .eq()
    let active: HTMLElement | undefined;
    let clicked = false;
    const inView: Record<string, boolean> = {};
    const activate = (a: HTMLElement | undefined) => {
      if (active && active !== a) active.classList.remove("elementor-item-active");
      a?.classList.add("elementor-item-active");
      active = a;
    };
    links.forEach((a, i) => {
      const id = decodeURIComponent(a.hash.slice(1));
      const anchor = document.getElementById(id);
      if (!anchor) return;
      let last = 0;
      new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            const top = document.documentElement.scrollTop;
            const down = top > last;
            if (e.isIntersecting && !clicked) {
              inView[id] = true;
              activate(a);
            } else if (e.isIntersecting && down) {
              delete inView[id];
              if (Object.keys(inView).length) activate(at(i + 1));
            } else if (!down) {
              delete inView[id];
              activate(at(i - 1));
            }
            last = top <= 0 ? 0 : top;
          }),
        { rootMargin: "0px", threshold: 0 },
      ).observe(anchor);
      a.addEventListener("click", () => {
        clicked = true;
        setTimeout(() => (clicked = false), 2000);
        activate(a);
      });
    });
    // Minimised box: the toggle buttons, and closed on load at the chosen size and smaller.
    if (!s.minimize_box) continue;
    const expand = $<HTMLElement>(".elementor-toc__toggle-button--expand", w);
    const collapse = $<HTMLElement>(".elementor-toc__toggle-button--collapse", w);
    const container = $<HTMLElement>(".elementor-widget-container", w) ?? w;
    const set = (collapsed: boolean, focus: boolean) => {
      w.classList.toggle("elementor-toc--collapsed", collapsed);
      slide(body, !collapsed, 400);
      expand?.setAttribute("aria-expanded", String(!collapsed));
      collapse?.setAttribute("aria-expanded", String(!collapsed));
      container.style.minHeight = collapsed ? "0px" : s.min_height?.size ? `${s.min_height.size}${s.min_height.unit ?? "px"}` : "";
      if (focus) (collapsed ? expand : collapse)?.focus();
    };
    for (const [btn, collapsed] of [[expand, false], [collapse, true]] as const) {
      btn?.addEventListener("click", () => set(collapsed, true));
      btn?.addEventListener("keyup", (e) => {
        if (e.keyCode === 13 || e.keyCode === 32) {
          btn.click();
          e.stopPropagation();
        }
      });
    }
    const order = ["mobile", "tablet", "desktop"];
    if (s.minimized_on === "desktop" || order.indexOf(s.minimized_on ?? "") >= order.indexOf(device())) set(true, false);
  }
}

/* ---------- share buttons ---------- */

const SHARE: Record<string, string> = {
  facebook: "https://www.facebook.com/sharer.php?u={url}",
  twitter: "https://twitter.com/intent/tweet?text={text}%20{url}",
  "x-twitter": "https://x.com/intent/tweet?text={text}%20{url}",
  linkedin: "https://www.linkedin.com/shareArticle?mini=true&url={url}&title={text}",
  pinterest: "https://www.pinterest.com/pin/create/button/?url={url}",
  reddit: "https://reddit.com/submit?url={url}&title={text}",
  whatsapp: "https://api.whatsapp.com/send?text=*{text}*%0A{url}",
  email: "mailto:?subject={text}&body={url}",
  telegram: "https://telegram.me/share/url?url={url}&text={text}",
};

function shareButtons() {
  for (const b of $$(".elementor-share-btn")) {
    const net = Array.from(b.classList).find((c) => c.startsWith("elementor-share-btn_"))?.slice(20);
    if (!net) continue;
    b.addEventListener("click", () => {
      if (net === "print") return window.print();
      const tpl = SHARE[net];
      if (!tpl) return;
      const url = tpl.replace("{url}", encodeURIComponent(location.href)).replace("{text}", encodeURIComponent(document.title));
      if (net === "email") location.href = url;
      else window.open(url, "", "width=600,height=500,top=100,left=100");
    });
  }
}

/* ---------- anchors under the sticky header ---------- */

function hashScroll() {
  const id = location.hash.slice(1);
  if (!id) return;
  const el = document.getElementById(decodeURIComponent(id));
  if (!el) return;
  window.setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerHeight() - 60, behavior: "smooth" }), 300);
}

export function initWidgets() {
  toggles();
  accordions();
  tabs();
  eaelAccordions();
  eaelTabs();
  themeTabs();
  reviewStars();
  toc();
  shareButtons();
  hashScroll();
}
