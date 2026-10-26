import { initForms } from "./forms";
import { initMedia } from "./media";
import { initMenus } from "./menu";
import { initMisc, initSticky } from "./misc";
import { initSliders } from "./sliders";
import { initWidgets } from "./widgets";

/*
 * Brings the page's markup to life (menus, toggles, tabs, sliders, gallery,
 * videos, popups, forms), replacing the WordPress plugins' scripts.
 * Bundled on its own by scripts/build-runtime.mjs into public/js and loaded as
 * a module script (components/SiteRuntime.tsx): the pages need no React in the
 * browser. Runs once per page load.
 */
for (const init of [initMenus, initSticky, initWidgets, initMedia, initSliders, initForms, initMisc]) {
  try {
    init();
  } catch (error) {
    console.warn("[ks]", error);
  }
}
