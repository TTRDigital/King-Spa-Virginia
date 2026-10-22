import { $, $$ } from "./dom";

/*
 * Header menus (Header Footer Elementor "Navigation Menu" widget), the same
 * behaviour as the plugin's frontend.js:
 * - the toggle button opens/closes the phone menu (full width under the header)
 * - in phone/tablet mode a tap on a parent item opens its sub-menu; a second tap follows the link
 * - on desktop, sub-menus open on hover (CSS)
 * The menu never wraps: when the desktop menu does not fit on one line, the
 * header switches to the phone menu (.ks-nav-collapsed, see lib/data/css).
 */

const BARS =
  '<svg aria-hidden="true" class="e-font-icon-svg e-fas-bars" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg>';
const CLOSE =
  '<svg aria-hidden="true" class="e-font-icon-svg e-far-window-close" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V86c0-3.3 2.7-6 6-6h404c3.3 0 6 2.7 6 6v340zM356.5 194.6L295.1 256l61.4 61.4c4.6 4.6 4.6 12.1 0 16.8l-22.3 22.3c-4.6 4.6-12.1 4.6-16.8 0L256 295.1l-61.4 61.4c-4.6 4.6-12.1 4.6-16.8 0l-22.3-22.3c-4.6-4.6-4.6-12.1 0-16.8l61.4-61.4-61.4-61.4c-4.6-4.6-4.6-12.1 0-16.8l22.3-22.3c4.6-4.6 12.1-4.6 16.8 0l61.4 61.4 61.4-61.4c4.6-4.6 12.1-4.6 16.8 0l22.3 22.3c4.7 4.6 4.7 12.1 0 16.8z"></path></svg>';

/** Is this menu currently shown as a dropdown (phone menu)? */
function dropdownMode(widget: HTMLElement): boolean {
  if (document.querySelector(".ks-body")?.classList.contains("ks-nav-collapsed") && widget.classList.contains("hfe-nav-menu__breakpoint-tablet")) return true;
  if (matchMedia("(max-width: 767px)").matches) return widget.classList.contains("hfe-nav-menu__breakpoint-mobile") || widget.classList.contains("hfe-nav-menu__breakpoint-tablet");
  if (matchMedia("(max-width: 1024px)").matches) return widget.classList.contains("hfe-nav-menu__breakpoint-tablet");
  return false;
}

function setup(widget: HTMLElement) {
  const toggle = $(".hfe-nav-menu__toggle", widget);
  const nav = $<HTMLElement>("nav", widget);
  if (!nav) return;

  for (const sub of $$(".sub-menu", widget)) sub.closest(".menu-item")?.classList.add("parent-has-child");
  for (const a of $$(".parent-has-child .hfe-has-submenu-container a", widget)) {
    a.setAttribute("aria-haspopup", "true");
    a.setAttribute("aria-expanded", "false");
  }

  const border = () => nav.classList.toggle("hfe-dropdown", dropdownMode(widget));
  border();
  addEventListener("resize", border);

  const fullWidth = () => {
    if (!toggle?.classList.contains("hfe-active-menu") || nav.dataset.fullWidth !== "yes") return;
    const section = widget.closest<HTMLElement>(".elementor-section");
    if (!section) return;
    nav.style.left = "0";
    nav.style.width = `${section.offsetWidth}px`;
    nav.style.left = `${section.getBoundingClientRect().left - nav.getBoundingClientRect().left}px`;
    nav.style.zIndex = "9999";
  };

  if (toggle) {
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    const icon = $(".hfe-nav-menu-icon", widget);
    const onToggle = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const open = !toggle.classList.contains("hfe-active-menu");
      toggle.classList.toggle("hfe-active-menu", open);
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("menu-is-active", open);
      if (icon && nav.dataset.toggleIcon) icon.innerHTML = open ? CLOSE : BARS;
      if (nav.dataset.fullWidth === "yes") {
        toggle.classList.toggle("hfe-active-menu-full-width", open);
        if (open) fullWidth();
        else {
          nav.style.width = "auto";
          nav.style.left = "0";
          nav.style.zIndex = "0";
        }
      }
    };
    toggle.addEventListener("click", onToggle);
    toggle.addEventListener("keyup", onToggle);
    addEventListener("resize", fullWidth);
  }

  // Parent items: first tap opens the sub-menu (phone/tablet menu), second tap follows the link.
  for (const box of $$(".hfe-has-submenu-container", widget)) {
    box.addEventListener("click", (e) => {
      if (!dropdownMode(widget) || !widget.classList.contains("hfe-link-redirect-child")) return;
      const sub = box.nextElementSibling as HTMLElement | null;
      const link = $("a", box);
      if (box.classList.contains("sub-menu-active")) {
        link?.setAttribute("aria-expanded", "false");
        box.classList.remove("sub-menu-active");
        for (const s of $$(":scope ~ .sub-menu", box)) {
          s.classList.remove("sub-menu-open");
          Object.assign(s.style, { visibility: "hidden", opacity: "0", height: "0", transition: "none" });
        }
        return; // second tap: the link opens
      }
      e.preventDefault();
      link?.setAttribute("aria-expanded", "true");
      if (sub) sub.style.position = "relative";
      box.classList.add("sub-menu-active");
      for (const s of $$(":scope ~ .sub-menu", box)) {
        s.classList.add("sub-menu-open");
        Object.assign(s.style, { visibility: "visible", opacity: "1", height: "auto", transition: "0.3s ease" });
      }
    });
  }
}

/**
 * Switches the header to the phone menu when the desktop menu would wrap
 * (narrow desktop windows, larger system fonts).
 */
function noWrap() {
  const body = document.querySelector(".ks-body");
  const main = $<HTMLElement>("#masthead .hfe-nav-menu__breakpoint-tablet ul.hfe-nav-menu");
  if (!body || !main) return;
  const check = () => {
    if (innerWidth <= 1024) {
      body.classList.remove("ks-nav-collapsed");
      return;
    }
    body.classList.remove("ks-nav-collapsed");
    const items = $$(":scope > li", main).filter((li) => li.offsetParent !== null);
    const tops = new Set(items.map((li) => li.offsetTop));
    const header = $<HTMLElement>("#masthead .elementor-section-content-middle > .elementor-container");
    const overflow = header ? header.scrollWidth > header.clientWidth + 1 : false;
    if (tops.size > 1 || overflow) body.classList.add("ks-nav-collapsed");
  };
  check();
  addEventListener("resize", check);
  document.fonts?.ready.then(check);
}

export function initMenus() {
  for (const w of $$(".elementor-widget-navigation-menu")) setup(w);
  noWrap();
}
