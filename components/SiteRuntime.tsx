"use client";

import { useEffect } from "react";
import { initForms } from "@/lib/runtime/forms";
import { initMedia } from "@/lib/runtime/media";
import { initMenus } from "@/lib/runtime/menu";
import { initMisc } from "@/lib/runtime/misc";
import { initSliders } from "@/lib/runtime/sliders";
import { initWidgets } from "@/lib/runtime/widgets";

/**
 * Brings the page's markup to life (menus, toggles, tabs, sliders, gallery,
 * videos, popups, forms), replacing the WordPress plugins' scripts.
 * Each page is a full page load, so this runs once per page.
 */
export function SiteRuntime() {
  useEffect(() => {
    const w = window as unknown as { __ksRuntime?: boolean };
    if (w.__ksRuntime) return;
    w.__ksRuntime = true;
    for (const init of [initMenus, initWidgets, initMedia, initSliders, initForms, initMisc]) {
      try {
        init();
      } catch (error) {
        console.warn("[ks]", error);
      }
    }
  }, []);
  return null;
}
