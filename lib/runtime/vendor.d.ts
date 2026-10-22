/* Swiper 8's package.json "exports" hides its typings from bundler resolution; Slick ships none. */
declare module "swiper" {
  type Options = Record<string, unknown>;
  export default class Swiper {
    constructor(el: Element | string, options?: Options);
  }
  export const Navigation: unknown;
  export const Pagination: unknown;
  export const Autoplay: unknown;
  export const EffectFade: unknown;
  export const A11y: unknown;
}
declare module "slick-carousel";
