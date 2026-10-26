import { $, $$, settings } from "./dom";

/*
 * Carousels, loaded only on pages that have them and started straight away, as
 * Elementor and the theme start them:
 * - Elementor's image carousels and review carousels: Swiper 8 (the version Elementor ships)
 * - the theme's section sliders (custom.js): jQuery + Slick, with the theme's exact settings
 */

type S = Record<string, unknown>;

/** A size setting ({ size }) for a device, falling back mobile -> tablet -> desktop as Elementor does. */
const sizeFor = (s: S, key: string, device: "mobile" | "tablet" | "desktop"): number | undefined => {
  const chain = device === "mobile" ? ["_mobile", "_tablet", ""] : device === "tablet" ? ["_tablet", ""] : [""];
  for (const suffix of chain) {
    const v = s[key + suffix] as { size?: unknown } | undefined;
    if (v && v.size !== "" && v.size !== undefined && Number.isFinite(Number(v.size))) return Number(v.size);
  }
  return undefined;
};

type Opts = Record<string, unknown> & { breakpoints: Record<number, Record<string, unknown>> };

/** Elementor's image carousel (image-carousel.js), as Swiper gets it after Elementor's breakpoint adjustment. */
function imageCarousel(s: S, widget: HTMLElement): Opts {
  const show = +(s.slides_to_show as string) || 3;
  const single = show === 1;
  const perView = (d: "mobile" | "tablet") => +(s[`slides_to_show_${d}`] as string) || (d === "mobile" ? 1 : single ? 1 : 2);
  const perGroup = (d: "mobile" | "tablet") => +(s[`slides_to_scroll_${d}`] as string) || 1;
  const custom = !!s.image_spacing_custom;
  const bp = (d: "mobile" | "tablet") => ({ slidesPerView: perView(d), slidesPerGroup: perGroup(d), ...(custom ? { spaceBetween: sizeFor(s, "image_spacing_custom", d) || 0 } : {}) });
  const o: Opts = { slidesPerView: show, loop: s.infinite === "yes", speed: s.speed, breakpoints: {} };
  if (s.autoplay === "yes") o.autoplay = { delay: s.autoplay_speed, disableOnInteraction: s.pause_on_interaction === "yes" };
  if (single) {
    o.effect = s.effect;
    if (s.effect === "fade") o.fadeEffect = { crossFade: true };
  } else o.slidesPerGroup = +(s.slides_to_scroll as string) || 1;
  if (custom) o.spaceBetween = sizeFor(s, "image_spacing_custom", "desktop") || 0;
  if (s.navigation === "arrows" || s.navigation === "both") o.navigation = { prevEl: $(".elementor-swiper-button-prev", widget), nextEl: $(".elementor-swiper-button-next", widget) };
  if (s.navigation === "dots" || s.navigation === "both" || s.pagination) o.pagination = { el: $(".swiper-pagination", widget), type: s.pagination || "bullets", clickable: true };
  o.breakpoints = { 0: bp("mobile"), 767: bp("tablet"), 1024: { slidesPerView: o.slidesPerView, slidesPerGroup: o.slidesPerGroup ?? 1 } };
  return o;
}

/** Elementor Pro's reviews / testimonial carousel (carousel base.js), same adjustment. */
function proCarousel(s: S, widget: HTMLElement, slides: number): Opts {
  const perView = (suffix: string) => Math.min(slides, +(s[`slides_per_view${suffix}`] as string) || 1);
  const perGroup = (suffix: string) => +(s[`slides_to_scroll${suffix}`] as string) || 1;
  const space = (d: "mobile" | "tablet" | "desktop") => sizeFor(s, "space_between", d) ?? 10;
  const o: Opts = { slidesPerView: perView(""), slidesPerGroup: perGroup(""), loop: s.loop === "yes", speed: s.speed, grabCursor: true, spaceBetween: space("desktop"), breakpoints: {} };
  if (s.autoplay === "yes") o.autoplay = { delay: s.autoplay_speed, disableOnInteraction: !!s.pause_on_interaction };
  if (s.show_arrows === "yes") o.navigation = { prevEl: $(".elementor-swiper-button-prev", widget), nextEl: $(".elementor-swiper-button-next", widget) };
  if (s.pagination !== "" && $(".swiper-pagination", widget)) o.pagination = { el: $(".swiper-pagination", widget), type: s.pagination || "bullets", clickable: true };
  o.breakpoints = {
    0: { slidesPerView: perView("_mobile"), slidesPerGroup: perGroup("_mobile"), spaceBetween: space("mobile") },
    767: { slidesPerView: perView("_tablet"), slidesPerGroup: perGroup("_tablet"), spaceBetween: space("tablet") },
    1024: { slidesPerView: o.slidesPerView, slidesPerGroup: o.slidesPerGroup },
  };
  return o;
}

async function swipers() {
  // Elementor leaves a carousel with a single slide as it is.
  const els = $$(".elementor-widget-image-carousel .swiper, .elementor-widget-reviews .elementor-main-swiper, .elementor-widget-testimonial-carousel .elementor-main-swiper").filter((el) => $$(".swiper-slide", el).length > 1);
  if (!els.length) return;
  const { default: Swiper, Navigation, Pagination, Autoplay, EffectFade, A11y } = await import("swiper");
  for (const el of els) {
    const widget = el.closest<HTMLElement>(".elementor-widget")!;
    const s = settings<S>(widget);
    const opts = widget.classList.contains("elementor-widget-image-carousel") ? imageCarousel(s, widget) : proCarousel(s, widget, $$(".swiper-slide", el).length);
    const swiper = new Swiper(el, { modules: [Navigation, Pagination, Autoplay, EffectFade, A11y], a11y: { enabled: true }, ...opts } as unknown as ConstructorParameters<typeof Swiper>[1]) as unknown as { autoplay: { start(): void; stop(): void } };
    // "Pause on hover": Elementor stops and restarts the autoplay itself.
    if (s.autoplay === "yes" && s.pause_on_hover === "yes") {
      el.addEventListener("mouseenter", () => swiper.autoplay.stop());
      el.addEventListener("mouseleave", () => swiper.autoplay.start());
    }
  }
}

type SlickOpts = Record<string, unknown>;
const responsive = (tablet: SlickOpts, phone: SlickOpts) => [
  { breakpoint: 1024, settings: tablet },
  { breakpoint: 480, settings: phone },
];

/** The theme's sliders (wp-content/themes/kingspa/js/custom.js), same settings. */
const SLICK: [string, SlickOpts][] = [
  [".spa-slider > .elementor-container", { dots: true, infinite: true, speed: 800, slidesToShow: 2, slidesToScroll: 1, arrows: false, autoplay: true, autoplaySpeed: 3000, responsive: responsive({ slidesToShow: 1, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".paradise-slider > .elementor-container", { dots: false, infinite: true, speed: 800, slidesToShow: 3, slidesToScroll: 1, arrows: false, autoplay: true, autoplaySpeed: 4000, variableWidth: true, responsive: responsive({ slidesToShow: 2, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".why-choose-slider > .elementor-container", { dots: false, infinite: true, speed: 800, slidesToShow: 4, slidesToScroll: 1, arrows: false, autoplay: true, autoplaySpeed: 4000, variableWidth: true, responsive: responsive({ slidesToShow: 2, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".how-to-book-slider > .elementor-container", { dots: false, infinite: true, speed: 800, slidesToShow: 4, slidesToScroll: 1, arrows: false, autoplay: true, autoplaySpeed: 4000, variableWidth: true, responsive: responsive({ slidesToShow: 2, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".signature-slider > .elementor-container", { dots: false, infinite: true, speed: 800, slidesToShow: 4, slidesToScroll: 1, arrows: true, autoplay: true, autoplaySpeed: 4000, responsive: responsive({ slidesToShow: 2, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".signature-slider-bath-1 > .elementor-container", { dots: false, infinite: true, speed: 800, slidesToShow: 3, slidesToScroll: 1, arrows: true, autoplay: true, autoplaySpeed: 4000, responsive: responsive({ slidesToShow: 2, slidesToScroll: 1 }, { slidesToShow: 1, slidesToScroll: 1 }) }],
  [".healing-slider > .elementor-widget-wrap", { dots: false, infinite: false, speed: 800, slidesToShow: 1, slidesToScroll: 1, arrows: true, autoplay: false, autoplaySpeed: 4000 }],
];

async function slick() {
  const found = SLICK.filter(([sel]) => $(sel)) as [string, SlickOpts][];
  const dishes = $(".popular-dishes-slider ul") && $(".food-slider-wrap .elementor-container");
  if (!found.length && !dishes) return;
  const { default: jq } = await import("jquery");
  (window as unknown as { jQuery: typeof jq; $: typeof jq }).jQuery = jq;
  (window as unknown as { $: typeof jq }).$ = jq;
  await import("slick-carousel");
  const $j = jq as unknown as (s: string) => { slick: (o: unknown, ...a: unknown[]) => void; each: (f: (i: number, e: Element) => void) => void; on: (ev: string, f: (this: Element) => void) => void; data: (k: string) => unknown };
  // rows: 0 = slides stay direct children of the track, as with the theme's older Slick (1.8.1 wraps each in two <div>s).
  for (const [sel, opts] of found) $j(sel).slick({ rows: 0, ...opts });
  $j(".sanctuary-healing li").on("click", function (this: Element) {
    $j(".healing-slider > .elementor-widget-wrap").slick("slickGoTo", Number(this.getAttribute("data-slide")));
  });
  if (dishes) {
    // Dining slider (page script on the live site, started 800 ms after it runs).
    setTimeout(() => {
      $$(".popular-dishes-slider ul li").forEach((li, i) => li.setAttribute("data-slide", String(i)));
      $j(".popular-dishes-slider ul").slick({ rows: 0, slidesToShow: 5, slidesToScroll: 5, asNavFor: ".food-slider-wrap .elementor-container", infinite: false, arrows: false, dots: false, variableWidth: true });
      $j(".food-slider-wrap .elementor-container").slick({
        rows: 0,
        slidesToShow: 5,
        slidesToScroll: 1,
        asNavFor: ".popular-dishes-slider ul",
        infinite: true,
        dots: false,
        arrows: false,
        centerMode: true,
        focusOnSelect: true,
        responsive: [
          { breakpoint: 1024, settings: { slidesToShow: 4 } },
          { breakpoint: 640, settings: { slidesToShow: 3 } },
          { breakpoint: 420, settings: { slidesToShow: 1 } },
        ],
      });
      $j(".popular-dishes-slider ul li").on("click", function (this: Element) {
        $j(".food-slider-wrap .elementor-container").slick("slickGoTo", Number(this.getAttribute("data-slide")));
      });
    }, 800);
  }
}

export function initSliders() {
  void swipers();
  void slick();
}
