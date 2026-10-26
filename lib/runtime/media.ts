import { $, $$, device, libDevice, loadScript, settings, whenVisible } from "./dom";

/*
 * Galleries (Elementor "e-gallery" masonry), the image lightbox, YouTube
 * videos, the Elfsight reviews widget and Elementor popups.
 */

/* ---------- e-gallery masonry (same maths as e-gallery.min.js) ---------- */

function gallery(widget: HTMLElement) {
  const s = settings<Record<string, unknown>>(widget);
  const box = $(".elementor-gallery__container", widget);
  if (!box) return;
  const items = $$<HTMLElement>(".e-gallery-item", box);
  box.classList.add("e-gallery-container", `e-gallery-${String(s.gallery_layout || "grid")}`, "e-gallery--ltr");
  const gapOf = () => {
    const d = libDevice();
    const v = (s[d === "desktop" ? "gap" : `gap_${d}`] ?? s.gap) as { size?: number } | undefined;
    return Number(v?.size ?? 10);
  };
  const colsOf = () => {
    const d = libDevice();
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

/* ---------- YouTube (Elementor's way: the IFrame Player API, same player settings) ---------- */

const ytId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;

type YTPlayer = { mute(): void; playVideo(): void; stopVideo(): void; seekTo(s: number): void; destroy(): void; getIframe(): HTMLIFrameElement };
type YTApi = { loaded?: number; Player: new (el: Element, o: object) => YTPlayer; PlayerState: { UNSTARTED: number; PLAYING: number; ENDED: number } };

/** Elementor's YouTube loader: adds the API script once, then checks every 350 ms until it is ready. */
function onYouTube(cb: (yt: YTApi) => void) {
  const w = window as unknown as { YT?: YTApi };
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) void loadScript("https://www.youtube.com/iframe_api");
  if (w.YT?.loaded) cb(w.YT);
  else setTimeout(() => onYouTube(cb), 350);
}

/** Section background videos (Elementor's background-video handler). */
function backgroundVideos() {
  for (const sec of $$("[data-element_type='section']")) {
    const s = settings<{ background_background?: string; background_video_link?: string; background_video_start?: number; background_video_end?: number; background_play_on_mobile?: string; background_play_once?: string; background_privacy_mode?: string }>(sec);
    if (s.background_background !== "video" || !s.background_video_link) continue;
    const box = $<HTMLElement>(":scope > .elementor-background-video-container", sec);
    const embed = box && $(".elementor-background-video-embed", box);
    if (!box || !embed || (device() === "mobile" && s.background_play_on_mobile !== "yes")) continue;
    const id = ytId(s.background_video_link);
    if (!id) continue;
    onYouTube((YT) => {
      // Chrome (since 67) reports no "playing" when the video starts, so Elementor waits for "unstarted" there.
      const started = "chrome" in window ? YT.PlayerState.UNSTARTED : YT.PlayerState.PLAYING;
      const size = () => {
        // Cover the section at 16:9 (the stylesheet centres the frame).
        const f = player.getIframe();
        const cw = box.offsetWidth;
        const ch = box.offsetHeight;
        const wide = cw / ch > 16 / 9;
        f.style.width = `${wide ? cw : ch * (16 / 9)}px`;
        f.style.height = `${wide ? cw / (16 / 9) : ch}px`;
      };
      const loop = (first: boolean) => {
        if (!player.getIframe().contentWindow) return;
        if (s.background_play_once && !first) return player.stopVideo();
        const start = Number(s.background_video_start) || 0;
        player.seekTo(start);
        if (s.background_video_end) setTimeout(() => loop(false), (Number(s.background_video_end) - start + 1) * 1000);
      };
      const opts: Record<string, unknown> = {
        videoId: id,
        events: {
          onReady: () => {
            player.mute();
            size();
            loop(true);
            player.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === started) box.classList.remove("elementor-invisible", "elementor-loading");
            else if (e.data === YT.PlayerState.ENDED) {
              player.seekTo(Number(s.background_video_start) || 0);
              if (s.background_play_once) player.destroy();
            }
          },
        },
        playerVars: { controls: 0, rel: 0, playsinline: 1, cc_load_policy: 0 },
      };
      if (s.background_privacy_mode) Object.assign(opts, { host: "https://www.youtube-nocookie.com", origin: location.hostname });
      box.classList.add("elementor-loading", "elementor-invisible");
      const player = new YT.Player(embed, opts);
      addEventListener("resize", size);
    });
  }
}

/** Video widgets (Elementor's video handler): the player starts with the page, or on a tap on the image overlay. */
function videoWidgets() {
  for (const w of $$(".elementor-widget-video")) {
    const s = settings<{ video_type?: string; youtube_url?: string; autoplay?: string; mute?: string; loop?: string; controls?: string; rel?: string; play_on_mobile?: string; cc_load_policy?: string; start?: number; end?: number; yt_privacy?: string; lazy_load?: string; show_image_overlay?: string; image_overlay?: { url?: string } }>(w);
    const video = $(".elementor-video", w);
    const id = s.youtube_url ? ytId(s.youtube_url) : null;
    if ((s.video_type ?? "youtube") !== "youtube" || !video || !id) continue;
    const start = (onOverlay: boolean) =>
      onYouTube((YT) => {
        const opts: Record<string, unknown> = {
          videoId: id,
          events: {
            onReady: () => {
              if (s.mute) player.mute();
              if (s.autoplay || onOverlay) player.playVideo();
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState.ENDED && s.loop) player.seekTo(Number(s.start) || 0);
            },
          },
          playerVars: { controls: s.controls ? 1 : 0, rel: s.rel ? 1 : 0, playsinline: s.play_on_mobile ? 1 : 0, cc_load_policy: s.cc_load_policy ? 1 : 0, autoplay: 0, start: s.start, end: s.end },
        };
        if (s.yt_privacy) Object.assign(opts, { host: "https://www.youtube-nocookie.com", origin: location.hostname });
        const player = new YT.Player(video, opts);
      });
    const overlay = $(".elementor-custom-embed-image-overlay", w);
    if (s.show_image_overlay && s.image_overlay?.url && overlay) {
      overlay.addEventListener("click", () => {
        overlay.remove();
        start(true);
      });
    } else if (s.lazy_load) whenVisible(w, () => start(false), "0px");
    else start(false);
  }
}

/* ---------- third-party widgets ---------- */

function elfsight() {
  const el = $("[class*='elfsight-app-']");
  if (!el) return;
  // The page's own loader script (in the widget, as on the live site) normally does it.
  if (!document.querySelector("script[src*='elfsight']")) void loadScript("https://elfsightcdn.com/platform.js");
}

/* ---------- Elementor popups (page-load trigger, shown on every visit as on the live site) ---------- */

function popups() {
  for (const p of $$("[data-ks-popup]")) {
    let s: { triggers?: { page_load?: string; page_load_delay?: number }; a11y_navigation?: string } = {};
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
    const open = () => {
      p.style.display = "";
      $(".dialog-widget-content", p)?.classList.add("fadeIn");
      // "Accessible navigation": Elementor moves keyboard focus into the popup (its close button).
      if (s.a11y_navigation === "yes") $<HTMLElement>(".dialog-close-button", p)?.focus({ preventScroll: true });
    };
    // Elementor's way: when its script starts, after the set delay.
    window.setTimeout(open, Number(s.triggers?.page_load_delay || 0) * 1000);
  }
}

export function initMedia() {
  for (const w of $$(".elementor-widget-gallery")) gallery(w);
  lightbox();
  backgroundVideos();
  videoWidgets();
  elfsight();
  popups();
}
