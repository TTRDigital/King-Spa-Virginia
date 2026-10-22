import { $, $$, settings, visibleOrIdle } from "./dom";

/*
 * Carousels, loaded only on pages that have them, when they come near the screen
 * or once the page is idle (Elementor starts them on load):
 * - Elementor's image carousels and review carousels: Swiper 8 (the version Elementor ships)
 * - the theme's section sliders (custom.js): jQuery + Slick, with the theme's exact settings
 */

type S = Record<string, unknown>;
const num = (v: unknown, d: number) => {
  const n = typeof v === "object" && v ? Number((v as { size?: unknown }).size) : Number(v);
  return Number.isFinite(n) && String(v ?? "") !== "" && !(typeof v === "object" && (v as { size?: unknown }).size === "") ? n : d;
};

async function swipers() {
  const els = $$(".elementor-widget-image-carousel .swiper, .elementor-widget-reviews .elementor-main-swiper, .elementor-widget-testimonial-carousel .elementor-main-swiper");
  if (!els.length) return;
  for (const el of els) {
    visibleOrIdle(el, async () => {
      const { default: Swiper, Navigation, Pagination, Autoplay, EffectFade, A11y } = await import("swiper");
      const widget = el.closest<HTMLElement>(".elementor-widget")!;
      const s = settings<S>(widget);
      const isCarousel = widget.classList.contains("elementor-widget-image-carousel");
      const per = (k: string, d: number) => num(s[k], d);
      const desktop = isCarousel ? per("slides_to_show", 3) : per("slides_per_view", 3);
      const tablet = isCarousel ? per("slides_to_show_tablet", Math.min(desktop, 2)) : per("slides_per_view_tablet", Math.min(desktop, 2));
      const mobile = isCarousel ? per("slides_to_show_mobile", 1) : per("slides_per_view_mobile", 1);
      const scroll = (k: string, d: number) => num(s[k], d);
      const gap = isCarousel ? (s.image_spacing === "custom" ? num(s.image_spacing_custom, 20) : 20) : num(s.space_between, 10);
      const nav = isCarousel ? s.navigation : "";
      const arrows = $(".elementor-swiper-button-next", widget) && (!isCarousel || nav === "both" || nav === "arrows");
      const dots = $(".swiper-pagination", widget) && (!isCarousel || nav === "both" || nav === "dots" || !nav);
      const loop = isCarousel ? s.infinite === "yes" : s.loop === "yes";
      const one = desktop === 1 && tablet <= 1 && mobile <= 1;
      new Swiper(el, {
        modules: [Navigation, Pagination, Autoplay, EffectFade, A11y],
        slidesPerView: mobile,
        slidesPerGroup: scroll(isCarousel ? "slides_to_scroll_mobile" : "slides_to_scroll_mobile", 1),
        spaceBetween: isCarousel ? gap : num(s.space_between_mobile, gap),
        loop,
        speed: num(s.speed, 500),
        effect: isCarousel && s.effect === "fade" && one ? "fade" : "slide",
        autoplay: s.autoplay === "yes" ? { delay: num(s.autoplay_speed, 5000), disableOnInteraction: s.pause_on_interaction === "yes", pauseOnMouseEnter: s.pause_on_hover === "yes" } : false,
        navigation: arrows ? { nextEl: $(".elementor-swiper-button-next", widget), prevEl: $(".elementor-swiper-button-prev", widget) } : false,
        pagination: dots ? { el: $(".swiper-pagination", widget), type: "bullets", clickable: true } : false,
        breakpoints: {
          768: { slidesPerView: tablet, slidesPerGroup: scroll("slides_to_scroll_tablet", 1), spaceBetween: isCarousel ? gap : num(s.space_between_tablet, gap) },
          1025: { slidesPerView: desktop, slidesPerGroup: scroll("slides_to_scroll", 1), spaceBetween: gap },
        },
      } as unknown as ConstructorParameters<typeof Swiper>[1]);
    });
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
  const first = $(found[0]?.[0] ?? ".popular-dishes-slider")!;
  visibleOrIdle(first, async () => {
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
      // Dining slider (page script on the live site, started 800 ms after load).
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
  });
}

export function initSliders() {
  void swipers();
  void slick();
}
