/*
 * Content types shared by the built-in content (lib/data), the Sanity queries
 * (lib/content.ts) and the components.
 *
 * Pages were converted from the live WordPress/Elementor site: each page keeps
 * Elementor's tree (sections > columns > widgets) with the same class names and
 * element IDs, so the live site's own stylesheet (lib/data/css) styles it the
 * same way. Text, links and photos are editable in /cms.
 */

export type Attrs = Record<string, string>;

/** A photo uploaded to Sanity (replaces the built-in file when set). */
export type SanityImg = { src: string; alt?: string; width: number; height: number };

export type HeadingWidget = { tag: string; cls: string; attrs: Attrs; html: string };

export type ButtonWidget = {
  wrapCls: string | null;
  tag: string;
  cls: string;
  attrs: Attrs;
  text: string;
  icon: string | null;
  iconCls: string | null;
  contentCls: string | null;
};

export type ImageWidget = { img: Attrs; link: Attrs | null; asset?: SanityImg | null };

export type Widget = {
  _type: "widget";
  _key: string;
  wtype: string;
  cls: string;
  attrs: Attrs;
  noContainer?: boolean;
  heading?: HeadingWidget;
  text?: string;
  button?: ButtonWidget;
  image?: ImageWidget;
  /** Theme-builder "post content": a nested Elementor document. */
  doc?: ElDocument;
  /** Inner markup of any other widget, as on the live site. */
  html?: string;
};

export type Column = {
  _type: "column";
  _key: string;
  cls: string;
  attrs: Attrs;
  wrapCls: string;
  pre?: string;
  children: (Widget | Section)[];
};

export type Section = {
  _type: "section";
  _key: string;
  tag: string;
  cls: string;
  attrs: Attrs;
  /** Background overlay / video / shape markup that sits before the container. */
  pre?: string;
  containerCls: string;
  columns: Column[];
};

/**
 * An Elementor document (`<div class="elementor elementor-N">` + sections). `bare`: sections that
 * browsers place outside their template on the live site (a post with unbalanced HTML closes the
 * template early), rendered without the wrapper.
 */
export type ElDocument = { _type: "document"; bare?: boolean; cls: string; attrs: Attrs; sections: Section[] };

export type PageData = {
  key: string;
  path: string;
  title: string;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  og: Record<string, string>;
  ldjson?: unknown[];
  bodyClass: string;
  /** #content markup with `<div data-ks-doc="n">` where Elementor document n goes. */
  shell: string;
  docs: ElDocument[];
  /** Elementor Canvas template: no theme header/footer. */
  canvas?: boolean;
  /** Header menu items WordPress marked as current on this page (li id -> classes). */
  /** Header menu items that are current on this page: their <li> classes as on the live page, and whether the plugin marked the link active. */
  nav?: Record<string, { cls: string; ariaCurrent: string | null; linkActive?: boolean }>;
  /** Which stylesheet in lib/data/css to use (defaults to the page's own). */
  cssKey?: string;
};

export type Chrome = {
  header: { shell: string; docs: ElDocument[] };
  footer: { shell: string; docs: ElDocument[] };
  popups: { id: string; settings: Record<string, unknown>; doc: ElDocument }[];
};

export type DayHours = { days: string[]; opens: string; closes: string };

export type SiteSettings = {
  name: string;
  legalName: string;
  description: string;
  url: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  logo: string;
  image: string;
  priceRange: string;
  hours: DayHours[];
  social: string[];
};
