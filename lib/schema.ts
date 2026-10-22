import "server-only";
import { parse } from "node-html-parser";
import { absoluteUrl, siteUrl } from "@/lib/site";
import type { Column, ElDocument, PageData, Section, SiteSettings, Widget } from "@/lib/types";

const abs = (src: string) => (src.startsWith("http") ? src : absoluteUrl(src));

/** The one DaySpa entity for the whole site, from the spa's own address, phone and hours. */
export function businessSchema(s: SiteSettings) {
  const digits = s.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return {
    "@context": "https://schema.org",
    "@type": "DaySpa",
    "@id": `${siteUrl}/#dayspa`,
    name: s.name,
    description: s.description,
    url: s.url,
    logo: abs(s.logo),
    image: abs(s.image),
    telephone: `+1-${digits.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3")}`,
    email: s.email,
    priceRange: s.priceRange,
    address: { "@type": "PostalAddress", streetAddress: s.street, addressLocality: s.city, addressRegion: s.region, postalCode: s.postalCode, addressCountry: s.country },
    geo: { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude },
    hasMap: s.mapsUrl,
    openingHoursSpecification: s.hours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    sameAs: s.social,
  };
}

/** BreadcrumbList as the live site had it (Rank Math), with the same names. */
export function breadcrumbSchema(page: PageData) {
  for (const ld of page.ldjson ?? []) {
    const graph = ((ld as { "@graph"?: unknown[] })["@graph"] ?? [ld]) as Record<string, unknown>[];
    const bc = graph.find((x) => x["@type"] === "BreadcrumbList") as { itemListElement?: { item: { "@id": string; name: string } }[] } | undefined;
    if (!bc?.itemListElement?.length || bc.itemListElement.length < 2) continue;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: bc.itemListElement.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.item.name,
        item: absoluteUrl(new URL(it.item["@id"], siteUrl).pathname),
      })),
    };
  }
  return null;
}

/* ---------- FAQ ---------- */

const text = (html: string) =>
  parse(html)
    .textContent.replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

function* widgets(node: ElDocument | Section | Column | Widget): Generator<Widget> {
  if (node._type === "document") for (const s of node.sections) yield* widgets(s);
  else if (node._type === "section") for (const c of node.columns) yield* widgets(c);
  else if (node._type === "column") for (const x of node.children) yield* widgets(x);
  else {
    yield node;
    if (node.doc) yield* widgets(node.doc);
  }
}

/** Question/answer pairs from the page's toggles and accordions (titles that are questions), word for word. */
export function pageFaqs(page: PageData): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  for (const d of page.docs) {
    for (const w of widgets(d)) {
      if (!w.html || !/^(toggle|accordion|eael-adv-accordion)\./.test(w.wtype)) continue;
      const root = parse(w.html);
      const titles = root.querySelectorAll(".elementor-tab-title, .eael-accordion-header");
      for (const t of titles) {
        const titleEl = t.querySelector(".elementor-toggle-title, .elementor-accordion-title, .eael-accordion-tab-title") ?? t;
        const q = text(titleEl.innerHTML);
        let next = t.nextElementSibling;
        while (next && !/elementor-tab-content|eael-accordion-content/.test(next.getAttribute("class") ?? "")) next = next.nextElementSibling;
        const a = next ? text(next.innerHTML) : "";
        if (q.endsWith("?") && a) out.push({ q, a });
      }
    }
  }
  return out;
}

export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
