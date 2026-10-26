/* Small DOM helpers shared by the runtime modules. */

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);

/** Elementor's data-settings JSON of an element (empty object when missing or broken). */
export function settings<T = Record<string, unknown>>(el: Element | null): T {
  try {
    return JSON.parse(el?.getAttribute("data-settings") || "{}") as T;
  } catch {
    return {} as T;
  }
}

/** Elementor's breakpoints: mobile up to 767px, tablet up to 1024px. */
export const device = (): "mobile" | "tablet" | "desktop" => (innerWidth <= 767 ? "mobile" : innerWidth <= 1024 ? "tablet" : "desktop");

/** Device as Elementor's carousel and gallery libraries see it: desktop from 1024px, tablet from 767px. */
export const libDevice = (): "mobile" | "tablet" | "desktop" => (innerWidth < 767 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop");

/** Device-specific setting with Elementor's fallback (mobile -> tablet -> desktop). */
export function responsive<T>(s: Record<string, unknown>, key: string): T | undefined {
  const d = device();
  const pick = (k: string) => {
    const v = s[k] as unknown;
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v === "object" && v && "size" in (v as Record<string, unknown>)) {
      const size = (v as { size: unknown }).size;
      return size === "" || size === undefined ? undefined : (size as T);
    }
    return v as T;
  };
  if (d === "mobile") return pick(`${key}_mobile`) ?? pick(`${key}_tablet`) ?? pick(key);
  if (d === "tablet") return pick(`${key}_tablet`) ?? pick(key);
  return pick(key);
}

/** jQuery-like slideDown/slideUp (height animation), used by toggles and accordions. */
export function slide(el: HTMLElement, open: boolean, ms = 300) {
  el.style.overflow = "hidden";
  if (open) {
    el.style.display = "block";
    const h = el.scrollHeight;
    el.style.height = "0px";
    requestAnimationFrame(() => {
      el.style.transition = `height ${ms}ms ease`;
      el.style.height = `${h}px`;
    });
  } else {
    el.style.height = `${el.scrollHeight}px`;
    requestAnimationFrame(() => {
      el.style.transition = `height ${ms}ms ease`;
      el.style.height = "0px";
    });
  }
  window.setTimeout(() => {
    el.style.removeProperty("height");
    el.style.removeProperty("overflow");
    el.style.removeProperty("transition");
    if (!open) el.style.display = "none";
  }, ms + 20);
}

export function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed: ${src}`));
    document.head.appendChild(s);
  });
}

/** Runs `fn` once the element is near the viewport. */
export function whenVisible(el: Element, fn: () => void, margin = "300px") {
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}

/** After the page has fully loaded and the browser is idle. */
export function afterLoad(fn: () => void) {
  const idle = (cb: () => void) => ("requestIdleCallback" in window ? (window as unknown as { requestIdleCallback: (f: () => void, o?: object) => void }).requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200));
  if (document.readyState === "complete") idle(fn);
  else addEventListener("load", () => idle(fn), { once: true });
}

/** Runs once: when the element comes near the screen, or when the page is idle after load, whichever is first. */
export function visibleOrIdle(el: Element, fn: () => void) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    fn();
  };
  whenVisible(el, once);
  afterLoad(once);
}

/** Height of the sticky site header (for anchor scrolling). */
export const headerHeight = () => (document.getElementById("masthead")?.getBoundingClientRect().height ?? 0);
