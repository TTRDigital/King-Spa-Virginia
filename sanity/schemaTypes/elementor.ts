import { defineArrayMember, defineField, defineType } from "sanity";

/*
 * The page layout converted from the live site's Elementor pages:
 * Elementor document > sections > columns > widgets (and sections nested in
 * columns). Class names and "...Json" attribute fields are technical: they
 * tie each element to the site's stylesheet, so they sit in a collapsed
 * "Layout (advanced)" group. Editors change the text, links and photos.
 *
 * Text fields hold HTML exactly as WordPress had it: <strong>, <a href="...">,
 * <br>, <p>, <ul><li> all work.
 */

const advanced = { name: "advanced", title: "Layout (advanced)", options: { collapsible: true, collapsed: true } };
const tech = (name: string, title: string, description?: string) => defineField({ name, title, type: "string", fieldset: "advanced", description });
const techText = (name: string, title: string, description?: string) => defineField({ name, title, type: "text", rows: 3, fieldset: "advanced", description });
const attrs = techText("attrsJson", "Attributes (JSON)", "Element ID and Elementor settings. Do not change unless you know Elementor.");

const strip = (html?: string) =>
  (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const ksHeading = defineType({
  name: "ksHeading",
  title: "Heading",
  type: "object",
  fieldsets: [advanced],
  fields: [defineField({ name: "html", title: "Heading text", type: "text", rows: 2 }), tech("tag", "Tag", "h1–h6, p, div"), tech("cls", "Class"), attrs],
});

export const ksButton = defineType({
  name: "ksButton",
  title: "Button",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({ name: "text", title: "Button text", type: "string" }),
    defineField({ name: "attrsJson", title: "Link and attributes (JSON)", type: "text", rows: 2, description: 'The link is "href", e.g. {"href": "/day-pass/"}.' }),
    tech("tag", "Tag"),
    tech("cls", "Class"),
    tech("wrapCls", "Wrapper class"),
    tech("contentCls", "Content class"),
    techText("icon", "Icon (SVG)"),
    tech("iconCls", "Icon class"),
  ],
});

export const ksImage = defineType({
  name: "ksImage",
  title: "Photo",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({
      name: "asset",
      title: "Photo",
      type: "image",
      fields: [defineField({ name: "alt", title: "Alt text", type: "string", description: "Describe the photo for people who cannot see it." })],
    }),
    techText("imgJson", "Image attributes (JSON)", "Size, class and the built-in file (used when no photo is uploaded above)."),
    techText("linkJson", "Link (JSON)", 'Optional, e.g. {"href": "/day-pass/"}.'),
  ],
});

export const ksWidget = defineType({
  name: "ksWidget",
  title: "Widget",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({ name: "wtype", title: "Widget type", type: "string", readOnly: true }),
    defineField({ name: "heading", title: "Heading", type: "ksHeading", hidden: ({ parent }) => !parent?.heading }),
    defineField({ name: "text", title: "Text (HTML)", type: "text", rows: 8, hidden: ({ parent }) => typeof parent?.text !== "string" }),
    defineField({ name: "button", title: "Button", type: "ksButton", hidden: ({ parent }) => !parent?.button }),
    defineField({ name: "image", title: "Photo", type: "ksImage", hidden: ({ parent }) => !parent?.image }),
    defineField({ name: "html", title: "Content (HTML)", type: "text", rows: 10, description: "This widget's markup as on the live site (lists, accordions, carousels, forms...).", hidden: ({ parent }) => typeof parent?.html !== "string" }),
    defineField({ name: "doc", title: "Post content", type: "ksDocument", hidden: ({ parent }) => !parent?.doc }),
    tech("cls", "Class"),
    attrs,
    defineField({ name: "noContainer", title: "No container", type: "boolean", fieldset: "advanced" }),
  ],
  preview: {
    select: { wtype: "wtype", h: "heading.html", t: "text", b: "button.text", html: "html", media: "image.asset" },
    prepare: ({ wtype, h, t, b, html, media }) => ({ title: strip(h || b || t || html).slice(0, 80) || wtype, subtitle: String(wtype ?? "").replace(".default", ""), media }),
  },
});

const children = [defineArrayMember({ type: "ksWidget" }), defineArrayMember({ type: "ksSection" })];

export const ksColumn = defineType({
  name: "ksColumn",
  title: "Column",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({ name: "children", title: "Widgets", type: "array", of: children }),
    tech("cls", "Class"),
    attrs,
    tech("wrapCls", "Wrapper class"),
    techText("pre", "Background overlay markup"),
  ],
  preview: { select: { c: "children" }, prepare: ({ c }) => ({ title: `Column (${(c ?? []).length} items)` }) },
});

export const ksSection = defineType({
  name: "ksSection",
  title: "Section",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({ name: "columns", title: "Columns", type: "array", of: [defineArrayMember({ type: "ksColumn" })] }),
    tech("tag", "Tag"),
    tech("cls", "Class"),
    attrs,
    tech("containerCls", "Container class"),
    techText("pre", "Background (overlay / video) markup"),
  ],
  preview: {
    select: { h: "columns.0.children.0.heading.html", h2: "columns.0.children.1.heading.html", cls: "cls" },
    prepare: ({ h, h2, cls }) => ({ title: strip(h || h2) || "Section", subtitle: String(cls ?? "").match(/elementor-element-(\w+)/)?.[1] }),
  },
});

export const ksDocument = defineType({
  name: "ksDocument",
  title: "Elementor document",
  type: "object",
  fieldsets: [advanced],
  fields: [
    defineField({ name: "sections", title: "Sections", type: "array", of: [defineArrayMember({ type: "ksSection" })] }),
    tech("cls", "Class"),
    attrs,
    defineField({ name: "bare", title: "Sections only (no wrapper)", type: "boolean", fieldset: "advanced", description: "Set on blog posts whose last sections sit outside the post template on the live site." }),
  ],
  preview: { select: { s: "sections" }, prepare: ({ s }) => ({ title: `Content (${(s ?? []).length} sections)` }) },
});

export const elementorTypes = [ksHeading, ksButton, ksImage, ksWidget, ksColumn, ksSection, ksDocument];
