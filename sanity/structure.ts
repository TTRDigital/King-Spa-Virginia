import type { StructureResolver } from "sanity/structure";

const singleton = (S: Parameters<StructureResolver>[0], type: string, title: string) => S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title));

const pages = (S: Parameters<StructureResolver>[0], title: string, kind: string) =>
  S.listItem()
    .title(title)
    .id(`pages-${kind}`)
    .child(S.documentList().title(title).schemaType("page").filter('_type == "page" && kind == $kind').params({ kind }).defaultOrdering([{ field: "path", direction: "asc" }]));

/** Sidebar: business details, header & footer, pages, blog posts, blog categories/tags. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("KING SPA Virginia")
    .items([
      singleton(S, "siteSettings", "Business details"),
      singleton(S, "siteChrome", "Header, footer & popups"),
      S.divider(),
      pages(S, "Pages", "page"),
      pages(S, "Blog posts", "post"),
      pages(S, "Blog categories & tags", "archive"),
    ]);
