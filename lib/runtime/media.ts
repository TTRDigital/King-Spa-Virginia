import { $, $$, afterLoad, device, loadScript, settings, whenVisible } from "./dom";

/*
 * Galleries (Elementor "e-gallery" masonry), the image lightbox, YouTube
 * videos (background videos start after the page has loaded), the Elfsight
 * reviews widget, AddToAny and Elementor popups.
 */

/* ---------- e-gallery masonry (same maths as e-gallery.min.js) ---------- */

function gallery(widget: HTMLElement) {
  const s = settings<Record<string, unknown>>(widget);
  const box = $(".elementor-gallery__container", widget);
  if (!box) return;
  const items = $$<HTMLElement>(".e-gallery-item", box);
  box.classList.add("e-gallery-container", `e-gallery-${String(s.gallery_layout || "grid")}`, "e-gallery--ltr");
  const gapOf = () => {
    const d = device();
    const v = (s[d === "desktop" ? "gap" : `gap_${d}`] ?? s.gap) as { size?: number } | undefined;
    return Number(v?.size ?? 10);
  };
  const colsOf = () => {
    const d = device();
    return Number(s[d === "desktop" ? "columns" : `columns_${d}`] ?? s.columns ?? 4);
  };
  const layout = () => {
    const cols = colsOf();
    const gap = gapOf();
    box.style.setProperty("--hgap", `${gap}px`);
    box.style.setProperty("--vgap", `${gap}px`);
    box.style.setProperty("--animation-duration", "350ms");
    const width = box.clientWidth;
    const colW = (width - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const counts = new Array(cols).fill(0);
    const tops: number[] = [];
    items.forEach((item, i) => {
      const img = $(".e-gallery-image", item);
      const w = Number(img?.dataset.width) || 1;
      const h = Number(img?.dataset.height) || 1;
      let col = i % cols;
      let cur = heights[col];
      heights.forEach((v, j) => {
        if (v && cur > v + 5) {
          cur = v;
          col = j;
        }
      });
      tops[i] = heights[col];
      heights[col] += colW / (w / h);
      item.style.setProperty("--item-height", `${(h / w) * 100}%`);
      item.style.setProperty("--column", String(col));
      item.style.setProperty("--items-in-column", String(counts[col]));
      counts[col]++;
    });
    const max = Math.max(...heights);
    const highest = heights.indexOf(max);
    box.style.setProperty("--columns", String(cols));
    box.style.setProperty("--highest-column-gap-count", String(counts[highest] - 1));
    box.style.paddingBottom = `${(max / width) * 100}%`;
    items.forEach((item, i) => item.style.setProperty("--percent-height", `${tops[i] ? (tops[i] / max) * 100 : 0}%`));
  };
  layout();
  addEventListener("resize", layout);
  // Lazy images: shown as backgrounds when near the screen (e-gallery's lazyload).
  if (s.lazyload === "yes") box.classList.add("e-gallery--lazyload");
  for (const item of items) {
    const img = $(".e-gallery-image", item);
    if (!img) continue;
    whenVisible(item, () => {
      img.style.backgroundImage = `url("${img.dataset.thumbnail}")`;
      img.classList.add("e-gallery-image-loaded");
    });
  }
}

/* ---------- lightbox for links to photos ---------- */

function lightbox() {
  const links = $$<HTMLAnchorElement>("a[data-elementor-open-lightbox='yes'], a[href$='.jpg'][data-elementor-open-lightbox='default'], a[href$='.png'][data-elementor-open-lightbox='default'], a[href$='.webp'][data-elementor-open-lightbox='default']");
  if (!links.length) return;
  let box: HTMLDivElement | null = null;
  let group: HTMLAnchorElement[] = [];
  let index = 0;
  const show = () => {
    const a = group[index];
    const img = box!.querySelector("img")!;
    img.src = a.getAttribute("href")!;
    img.alt = a.dataset.elementorLightboxTitle ?? "";
    box!.querySelector(".elementor-slideshow__counter")!.textContent = `${index + 1} / ${group.length}`;
  };
  const close = () => {
    if (box) box.style.display = "none";
  };
  const open = (a: HTMLAnchorElement) => {
    const slideshow = a.dataset.elementorLightboxSlideshow;
    group = slideshow ? links.filter((l) => l.dataset.elementorLightboxSlideshow === slideshow) : [a];
    index = group.indexOf(a);
    if (!box) {
      box = document.createElement("div");
      box.className = "dialog-widget dialog-lightbox-widget dialog-type-buttons dialog-type-lightbox elementor-lightbox";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.innerHTML =
        '<div class="dialog-widget-content dialog-lightbox-widget-content"><div class="dialog-header dialog-lightbox-header"><div class="elementor-slideshow__header elementor-lightbox-prevent-close"><span class="elementor-slideshow__counter"></span></div></div>' +
        '<div class="dialog-message dialog-lightbox-message"><div class="elementor-lightbox-item elementor-lightbox-item-active" style="display:flex;align-items:center;justify-content:center;height:100%"><img class="elementor-lightbox-image" style="max-width:90vw;max-height:85vh;object-fit:contain"></div></div>' +
        '<div class="elementor-swiper-button elementor-swiper-button-prev" role="button" tabindex="0" aria-label="Previous"><i class="eicon-chevron-left"></i></div><div class="elementor-swiper-button elementor-swiper-button-next" role="button" tabindex="0" aria-label="Next"><i class="eicon-chevron-right"></i></div>' +
        '<div class="dialog-close-button dialog-lightbox-close-button" role="button" tabindex="0" aria-label="Close"><i class="eicon-close"></i></div></div>';
      Object.assign(box.style, { position: "fixed", inset: "0", zIndex: "9999", background: "rgba(0,0,0,.87)" });
      document.querySelector(".ks-body")?.appendChild(box);
      box.querySelector(".dialog-lightbox-close-button")!.addEventListener("click", close);
      box.querySelector(".elementor-swiper-button-prev")!.addEventListener("click", () => {
        index = (index - 1 + group.length) % group.length;
        show();
      });
      box.querySelector(".elementor-swiper-button-next")!.addEventListener("click", () => {
        index = (index + 1) % group.length;
        show();
      });
      box.addEventListener("click", (e) => {
        if (e.target === box || (e.target as HTMLElement).classList.contains("elementor-lightbox-item")) close();
      });
      addEventListener("keydown", (e) => {
        if (!box || box.style.display === "none") return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowRight") (box.querySelector(".elementor-swiper-button-next") as HTMLElement).click();
        if (e.key === "ArrowLeft") (box.querySelector(".elementor-swiper-button-prev") as HTMLElement).click();
      });
    }
    const single = group.length < 2;
    for (const b of box.querySelectorAll<HTMLElement>(".elementor-swiper-button")) b.style.display = single ? "none" : "";
    box.style.display = "block";
    show();
  };
  for (const a of links)
    a.addEventListener("click", (e) => {
      e.preventDefault();
      open(a);
    });
}

/* ---------- YouTube ---------- */

const ytId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;

/** Section background videos: started after the page has loaded (Elementor's behaviour, deferred). */
function backgroundVideos() {
  for (const sec of $$("[data-element_type='section']")) {
    const s = settings<{ background_video_link?: string; background_video_start?: number; background_video_end?: number; background_play_on_mobile?: string; background_play_once?: string }>(sec);
    if (!s.background_video_link) continue;
    const box = $(":scope > .elementor-background-video-container", sec);
    if (!box || (device() === "mobile" && s.background_play_on_mobile !== "yes")) continue;
    const id = ytId(s.background_video_link);
    if (!id) continue;
    afterLoad(() => {
      const q = new URLSearchParams({ autoplay: "1", mute: "1", controls: "0", loop: s.background_play_once === "yes" ? "0" : "1", playlist: id, playsinline: "1", rel: "0", modestbranding: "1", enablejsapi: "0" });
      if (s.background_video_start) q.set("start", String(s.background_video_start));
      if (s.background_video_end) q.set("end", String(s.background_video_end));
      const f = document.createElement("iframe");
      f.className = "elementor-background-video-embed";
      f.title = "Background video";
      f.allow = "autoplay; encrypted-media";
      f.setAttribute("frameborder", "0");
      f.src = `https://www.youtube.com/embed/${id}?${q}`;
      box.appendChild(f);
      const fit = () => {
        // Cover the section with a 16:9 frame, as Elementor does.
        const w = box.clientWidth;
        const h = box.clientHeight;
        const ratio = 16 / 9;
        const [fw, fh] = w / h > ratio ? [w, w / ratio] : [h * ratio, h];
        Object.assign(f.style, { width: `${fw}px`, height: `${fh}px`, maxWidth: "none", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      };
      fit();
      addEventListener("resize", fit);
    });
  }
}

/** Video widgets: the YouTube player is added when the video comes near the screen. */
function videoWidgets() {
  for (const w of $$(".elementor-widget-video")) {
    const s = settings<{ youtube_url?: string; autoplay?: string; mute?: string; loop?: string; controls?: string; start?: number; end?: number; lightbox?: string }>(w);
    const target = $(".elementor-video", w);
    const id = s.youtube_url ? ytId(s.youtube_url) : null;
    if (!target || !id) continue;
    const start = (s.youtube_url ?? "").match(/[?&]t=(\d+)/)?.[1];
    const embed = () => {
      const q = new URLSearchParams({ controls: s.controls === "" ? "0" : "1", rel: "0", playsinline: "1" });
      if (s.autoplay === "yes") q.set("autoplay", "1");
      if (s.mute === "yes") q.set("mute", "1");
      if (s.loop === "yes") {
        q.set("loop", "1");
        q.set("playlist", id);
      }
      if (s.start || start) q.set("start", String(s.start || start));
      if (s.end) q.set("end", String(s.end));
      const f = document.createElement("iframe");
      f.className = "elementor-video-iframe";
      f.title = "YouTube video player";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.setAttribute("frameborder", "0");
      f.width = "640";
      f.height = "360";
      f.src = `https://www.youtube.com/embed/${id}?${q}`;
      target.replaceWith(f);
    };
    const overlay = $(".elementor-custom-embed-image-overlay", w);
    if (overlay) {
      overlay.addEventListener("click", () => {
        s.autoplay = "yes";
        embed();
        overlay.remove();
      });
    } else afterLoad(() => whenVisible(w, embed, "200px"));
  }
}

/* ---------- third-party widgets ---------- */

function elfsight() {
  const el = $("[class*='elfsight-app-']");
  if (!el) return;
  whenVisible(el, () => void loadScript("https://elfsightcdn.com/platform.js"), "600px");
}

function addToAny() {
  if (!$(".a2a_kit")) return;
  afterLoad(() => void loadScript("https://static.addtoany.com/menu/page.js", { defer: "" }));
}

/* ---------- Elementor popups (page-load trigger, shown on every visit as on the live site) ---------- */

function popups() {
  for (const p of $$("[data-ks-popup]")) {
    let s: { triggers?: { page_load?: string; page_load_delay?: number } } = {};
    try {
      s = JSON.parse(p.dataset.ksPopup || "{}");
    } catch {
      /* no settings: never opened */
    }
    if (s.triggers?.page_load !== "yes") continue;
    const close = () => {
      p.style.display = "none";
    };
    $(".dialog-close-button", p)?.addEventListener("click", (e) => {
      e.preventDefault();
      close();
    });
    p.addEventListener("click", (e) => {
      if (e.target === p) close();
    });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    afterLoad(() =>
      window.setTimeout(
        () => {
          p.style.display = "";
          p.classList.add("ks-popup-open");
          $(".dialog-widget-content", p)?.classList.add("fadeIn");
        },
        Number(s.triggers?.page_load_delay || 0) * 1000,
      ),
    );
  }
}

export function initMedia() {
  for (const w of $$(".elementor-widget-gallery")) gallery(w);
  lightbox();
  backgroundVideos();
  videoWidgets();
  elfsight();
  addToAny();
  popups();
}
