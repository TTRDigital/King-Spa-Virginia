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

/** Is this menu currently shown as a dropdown (phone menu)? */
function dropdownMode(widget: HTMLElement): boolean {
  if (document.querySelector(".ks-body")?.classList.contains("ks-nav-collapsed") && widget.classList.contains("hfe-nav-menu__breakpoint-tablet")) return true;
  if (matchMedia("(max-width: 767px)").matches) return widget.classList.contains("hfe-nav-menu__breakpoint-mobile") || widget.classList.contains("hfe-nav-menu__breakpoint-tablet");
  if (matchMedia("(max-width: 1024px)").matches) return widget.classList.contains("hfe-nav-menu__breakpoint-tablet");
  return false;
}

/** The sub-menus that follow a parent item's link box (its siblings, not its children). */
const subMenus = (box: Element) => [...(box.parentElement?.children ?? [])].filter((e): e is HTMLElement => e !== box && e.matches(".sub-menu") && !!(box.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING));

function setup(widget: HTMLElement) {
  const toggle = $(".hfe-nav-menu__toggle", widget);
  const nav = $<HTMLElement>("nav", widget);
  if (!nav) return;

  for (const sub of $$(".sub-menu", widget)) sub.closest(".menu-item")?.classList.add("parent-has-child");
  for (const a of $$(".parent-has-child .hfe-has-submenu-container a", widget)) {
    a.setAttribute("aria-haspopup", "true");
    a.setAttribute("aria-expanded", "false");
  }

  const border = () => {
    const on = dropdownMode(widget);
    nav.classList.toggle("hfe-dropdown", on);
    for (const twin of $$(`.elementor-sticky__spacer [data-id="${widget.dataset.id}"] nav`)) twin.classList.toggle("hfe-dropdown", on);
  };
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
      // The sticky header's invisible copy opens too (it takes the menu's room in the page).
      for (const twin of $$(`.elementor-sticky__spacer [data-id="${widget.dataset.id}"] nav`)) twin.classList.toggle("menu-is-active", open);
      // The plugin's icons, from the nav's data-toggle-icon / data-close-icon (Font Awesome <i>).
      if (icon && nav.dataset.toggleIcon) icon.innerHTML = (open ? nav.dataset.closeIcon : nav.dataset.toggleIcon) ?? "";
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
        for (const s of subMenus(box)) {
          s.classList.remove("sub-menu-open");
          Object.assign(s.style, { visibility: "hidden", opacity: "0", height: "0", transition: "none" });
        }
        return; // second tap: the link opens
      }
      e.preventDefault();
      link?.setAttribute("aria-expanded", "true");
      if (sub) sub.style.position = "relative";
      box.classList.add("sub-menu-active");
      for (const s of subMenus(box)) {
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
  for (const w of $$(".elementor-widget-navigation-menu")) if (!w.closest(".elementor-sticky__spacer")) setup(w);
  noWrap();
}
