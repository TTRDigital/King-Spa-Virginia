"use client";

/**
 * Sanity Studio, embedded at /cms. KING SPA blue, grouped sidebar, singletons
 * that cannot be duplicated or deleted.
 */
import { buildLegacyTheme, defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes, singletonTypes } from "./sanity/schemaTypes";
import { structure } from "./sanity/structure";
import { StudioIcon } from "./sanity/StudioIcon";

const theme = buildLegacyTheme({
  "--black": "#022a3e",
  "--white": "#ffffff",
  "--gray": "#6b7280",
  "--gray-base": "#6b7280",
  "--component-bg": "#ffffff",
  "--component-text-color": "#022a3e",
  "--brand-primary": "#00aaff",
  "--default-button-color": "#6b7280",
  "--default-button-primary-color": "#00aaff",
  "--default-button-success-color": "#2f8f4e",
  "--default-button-warning-color": "#c58a1b",
  "--default-button-danger-color": "#c0392b",
  "--state-info-color": "#00aaff",
  "--state-success-color": "#2f8f4e",
  "--state-warning-color": "#c58a1b",
  "--state-danger-color": "#c0392b",
  "--main-navigation-color": "#022a3e",
  "--main-navigation-color--inverted": "#ffffff",
  "--focus-color": "#00aaff",
});

export default defineConfig({
  name: "king-spa-virginia",
  title: "KING SPA Virginia",
  basePath: "/cms",
  projectId: projectId || "unset",
  dataset,
  icon: StudioIcon,
  theme,
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
  schema: {
    types: schemaTypes,
    // Singletons do not appear in the "Create new" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    // Singletons can be edited and published, but not duplicated or deleted.
    actions: (input, context) =>
      singletonTypes.has(context.schemaType) ? input.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action)) : input,
  },
});
