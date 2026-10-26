import { defineArrayMember, defineField, defineType } from "sanity";

/*
 * Documents mirror the built-in content in lib/data (same field names), so
 * scripts/seed.ts can load it and lib/content.ts can use CMS values in place
 * of it. A field left empty falls back to the built-in content.
 */

const advanced = { name: "advanced", title: "Technical (advanced)", options: { collapsible: true, collapsed: true } };
const techText = (name: string, title: string, description?: string) => defineField({ name, title, type: "text", rows: 3, fieldset: "advanced", description });

/* ---------- Pages (every URL of the site) ---------- */

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fieldsets: [advanced],
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "path",
      title: "URL",
      type: "string",
      group: ["content", "seo"],
      description: "e.g. /treatments/facial/basic/ (with slashes). Changing it changes the page address: add a 301 in public/.htaccess for the old one.",
      validation: (r) => r.required().regex(/^\/([a-z0-9-]+\/)*$/, { name: "path like /about/faq/" }),
    }),
    defineField({ name: "kind", title: "Type", type: "string", options: { list: ["page", "post", "archive"] }, group: "content", initialValue: "page" }),
    defineField({ name: "docs", title: "Page content", type: "array", of: [defineArrayMember({ type: "ksDocument" })], group: "content" }),
    defineField({ name: "title", title: "SEO title", type: "string", group: "seo", validation: (r) => r.required().max(90).warning("Long titles may be cut off in Google.") }),
    defineField({ name: "description", title: "Meta description", type: "text", rows: 3, group: "seo", validation: (r) => r.max(170).warning("Long descriptions may be cut off in Google.") }),
    defineField({ name: "canonical", title: "Canonical URL", type: "string", group: "seo" }),
    defineField({ name: "robots", title: "Robots", type: "string", group: "seo", description: 'e.g. "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large" or "follow, noindex".' }),
    techText("ogJson", "Open Graph / Twitter tags (JSON)"),
    techText("ldjsonJson", "Structured data (JSON-LD, as on the live site)"),
    techText("headExtraJson", "Other head tags (JSON): article tags, video tags, prev/next links"),
    techText("navJson", "Current menu item (JSON)"),
    defineField({ name: "bodyClass", title: "Page classes", type: "text", rows: 2, fieldset: "advanced" }),
    defineField({ name: "shell", title: "Theme wrapper (HTML)", type: "text", rows: 6, fieldset: "advanced", description: 'Around the content; <div data-ks-doc="0"></div> marks where "Page content" goes.' }),
    defineField({ name: "cssKey", title: "Stylesheet", type: "string", fieldset: "advanced", description: "Leave empty. For a new page, the key of the page it was copied from (e.g. about)." }),
    defineField({ name: "canvas", title: "No header and footer", type: "boolean", fieldset: "advanced" }),
  ],
  orderings: [{ title: "URL", name: "path", by: [{ field: "path", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "path" } },
});

/* ---------- Header, footer and popups ---------- */

const region = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "object",
    fields: [
      defineField({ name: "docs", title: "Content", type: "array", of: [defineArrayMember({ type: "ksDocument" })] }),
      defineField({ name: "shell", title: "Theme wrapper (HTML)", type: "text", rows: 4 }),
    ],
  });

export const siteChrome = defineType({
  name: "siteChrome",
  title: "Header, footer & popups",
  type: "document",
  fields: [
    region("header", "Header (menu, phone, Shop)"),
    region("footer", "Footer (links, hours, newsletter)"),
    defineField({
      name: "popups",
      title: "Popups",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "ksPopup",
          fields: [
            defineField({ name: "id", title: "Popup ID", type: "string" }),
            defineField({ name: "settingsJson", title: "Trigger settings (JSON)", type: "text", rows: 3, description: '"page_load": "yes" shows it when a page opens; "timing.schedule_end_date" ends it.' }),
            defineField({ name: "doc", title: "Content", type: "ksDocument" }),
          ],
          preview: { select: { title: "id" }, prepare: ({ title }) => ({ title: `Popup ${title}` }) },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Header, footer & popups" }) },
});

/* ---------- Business details (DaySpa schema) ---------- */

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Business details",
  type: "document",
  description: "Used for the site-wide DaySpa schema (Google). Keep it the same as the site's own text.",
  fields: [
    defineField({ name: "name", title: "Name", type: "string" }),
    defineField({ name: "legalName", title: "Business name", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    defineField({ name: "url", title: "Website", type: "string" }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "street", title: "Street address", type: "string" }),
    defineField({ name: "city", title: "City", type: "string" }),
    defineField({ name: "region", title: "State", type: "string" }),
    defineField({ name: "postalCode", title: "ZIP code", type: "string" }),
    defineField({ name: "country", title: "Country", type: "string" }),
    defineField({ name: "latitude", title: "Latitude", type: "number" }),
    defineField({ name: "longitude", title: "Longitude", type: "number" }),
    defineField({ name: "mapsUrl", title: "Google Maps link", type: "string" }),
    defineField({ name: "logo", title: "Logo file", type: "string" }),
    defineField({ name: "image", title: "Photo file", type: "string" }),
    defineField({ name: "priceRange", title: "Price range", type: "string" }),
    defineField({
      name: "hours",
      title: "Opening hours",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "ksHours",
          fields: [
            defineField({ name: "days", title: "Days", type: "array", of: [defineArrayMember({ type: "string" })], options: { list: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] } }),
            defineField({ name: "opens", title: "Opens (24h, e.g. 09:00)", type: "string" }),
            defineField({ name: "closes", title: "Closes (24h, e.g. 23:00; 00:00 = midnight)", type: "string" }),
          ],
          preview: { select: { d: "days", o: "opens", c: "closes" }, prepare: ({ d, o, c }) => ({ title: (d ?? []).join(", "), subtitle: `${o}–${c}` }) },
        }),
      ],
    }),
    defineField({ name: "social", title: "Social profiles", type: "array", of: [defineArrayMember({ type: "string" })] }),
  ],
  preview: { prepare: () => ({ title: "Business details" }) },
});

export const singletonTypes = new Set(["siteChrome", "siteSettings"]);
export const documentTypes = [page, siteChrome, siteSettings];
