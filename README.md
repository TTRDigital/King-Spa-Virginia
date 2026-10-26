# KING SPA Virginia — virginia.kingspa.com

The KING SPA Virginia website, rebuilt from the WordPress + Elementor site as a
Next.js 16 static export with Sanity as the CMS. Every page keeps its live URL,
text, photos, titles and descriptions; old WordPress URLs redirect (public/.htaccess).
The site is plain files hosted on SiteGround; there is no server code apart from
the form handler (public/api/form.php).

## How it fits together

| Part | Where |
| --- | --- |
| Page content (built-in copy of the live site) | `lib/data/pages/*.json`, header/footer/popups in `lib/data/chrome.json`, business details in `lib/data/site.ts` |
| Page styles (the live site's own CSS, cut down per page) | `lib/data/css/*.css` |
| Renderer (Elementor sections/columns/widgets → the live markup) | `lib/render.ts`, `lib/page-html.ts` |
| Page route (every page, at its live URL) | `app/(site)/[[...slug]]/page.tsx` |
| Behaviour (menus, tabs, accordions, sliders, gallery, popups, forms…) | `lib/runtime/*` — plain TypeScript, no React in the browser |
| CMS | Sanity Studio at `/cms` (`sanity.config.ts`, `sanity/`) |
| SEO | as on the live site: titles, meta, Open Graph and other head tags (`lib/seo.ts`), the live JSON-LD (`lib/schema.ts`), Rank Math-style sitemaps `/sitemap_index.xml` + `post-`/`page-`/`category-sitemap.xml` (`lib/sitemaps.ts`, data in `lib/data/sitemaps.json`), `public/robots.txt` |
| Hosting rules | `public/.htaccess` (https, host, redirects, 410s, headers, caching) |
| Forms | `public/api/form.php` (mail + optional Klaviyo + reCAPTCHA check) |

Content: the site reads Sanity at build time and lays it over the built-in copy,
page by page (a page in Sanity replaces the built-in one; pages added in Sanity are
built too). Until a Sanity project is connected, the site builds from the built-in
copy alone.

### Build steps (`npm run build`)

1. `scripts/optimize-images.mjs` — WebP copies of every photo (256–1920px) in
   `public/_img`; page stylesheets into `public/css` with background photos at
   phone/tablet/desktop sizes; the Font Awesome and Elementor icon fonts
   (`assets/icon-fonts`) cut down to the icons the site uses.
2. `scripts/build-runtime.mjs` — bundles `lib/runtime` into `public/js` (esbuild).
3. `next build` — static export into `out/`.
4. `scripts/strip-next-runtime.mjs` — removes Next.js's browser scripts from the
   website's pages (they are static HTML plus the runtime above; the Studio at
   `/cms` keeps them) and puts the third-party scripts in place (`<head>`, start
   and end of `<body>`). The build fails if any Next.js scripts are left.

`out/` is what goes to SiteGround's `public_html`.

### Loading

Pages load the way the live site does: images keep the live site's own `loading` /
`fetchpriority` attributes, section backgrounds, sliders, videos, the reviews widget,
reCAPTCHA and the popup start when the page starts, and the third-party tags load
straight away from the same places in the page. On top of that: photos are WebP
copies at the right size per screen, the hero photo and the two main fonts are
preloaded, and there is no React in the browser. Lighthouse (mobile) scores are in
the handover report.

## Run it locally

```bash
npm ci
cp .env.example .env.local   # optional: Sanity project, tag switch
npm run dev                  # http://localhost:3000, Studio at /cms
npm run build                # static site in out/
npm run lint && npm run typecheck
```

`NEXT_PUBLIC_DISABLE_TAGS=1` in `.env.local` keeps the analytics tags off while testing.
The tags are only added by `npm run build`, so `npm run dev` never sends any.

## Sanity

The project uses its own variables, `NEXT_PUBLIC_KSV_SANITY_PROJECT_ID` and
`NEXT_PUBLIC_KSV_SANITY_DATASET` (dataset `production`), so it never picks up
another project's ID from the environment.

1. **Project ID** — GitHub: Settings → Secrets and variables → Actions → Variables →
   `SANITY_PROJECT_ID`.
2. **CORS origins** — sanity.io/manage → project → API → CORS origins, each with
   "Allow credentials": `https://virginia.kingspa.com`, `http://localhost:3000`, and
   the SiteGround temporary address while testing there.
3. **Write token** — sanity.io/manage → API → Tokens → Editor token, saved as the
   GitHub secret `SANITY_WRITE_TOKEN`. Delete or rotate it after loading the content.
4. **Load the content** — Actions → "Load content into Sanity" → Run workflow:
   - `dry-run` checks everything and writes nothing;
   - `add-missing` creates only what is not in Sanity yet (safe to repeat);
   - `overwrite` replaces Sanity's documents with the built-in content.
   The "only" box limits it to document IDs starting with the given text
   (e.g. `page-_home,siteChrome`).
5. **Rebuild on publish** (optional) — a Sanity webhook (API → Webhooks) that POSTs to
   `https://api.github.com/repos/TTRDigital/King-Spa-Virginia/dispatches` with the body
   `{"event_type":"sanity-publish"}` and an `Authorization: Bearer <token>` header
   (a fine-grained GitHub token for this repository with "Contents: read and write").
   Otherwise run "Deploy to SiteGround" by hand after publishing.

In the Studio, editors change headings, text, buttons, links and photos (with alt
text). The "Layout (advanced)" groups hold the class names and settings that tie each
element to the live stylesheet; leave them unless you know Elementor.

## Deploy (GitHub Actions → SiteGround over FTPS)

"Deploy to SiteGround" runs on every push to this branch or `main`, on Sanity publish
(webhook above) and by hand. Repository secrets:

| Secret | |
| --- | --- |
| `SG_FTP_SERVER`, `SG_FTP_USERNAME`, `SG_FTP_PASSWORD` | SiteGround Site Tools → Site → FTP Accounts. Files go to `./public_html/` (variable `SG_FTP_DIR` to change). |
| `FORM_TO_EMAIL` | Where form submissions are sent (comma-separated for several). |
| `RECAPTCHA_SECRET_ELEMENTOR`, `RECAPTCHA_SECRET_CF7` | Optional: secret keys for the reCAPTCHA site keys on the newsletter and review forms, so the server checks them too. |
| `KLAVIYO_LIST_ID` | Optional: Klaviyo list that newsletter sign-ups join. |

Until the FTP secrets exist the workflow only builds (a check that the site builds).
The form settings are written at deploy time to `api/.config.php`, which is never in
the repository and is blocked from the web by `.htaccess`.

## DNS and HTTPS (Cloudflare)

`virginia.kingspa.com` lives in the kingspa.com Cloudflare zone. Change only this
one record:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `virginia` | the site's IP from SiteGround Site Tools → Site → Site Information | see below |

Certificate, either way:

- **Cloudflare origin certificate:** Cloudflare → SSL/TLS → Origin Server → Create
  certificate (hostname `virginia.kingspa.com`); in SiteGround Site Tools → Security →
  SSL Manager → Import, paste the certificate and key. Then proxy the record (orange
  cloud) and set SSL/TLS mode to **Full (strict)**.
- **Let's Encrypt on SiteGround:** keep the record **DNS only** (grey cloud) until
  SiteGround has issued the Let's Encrypt certificate (SSL Manager → Get), then proxy
  it and set **Full (strict)**.

`.htaccess` reads Cloudflare's `X-Forwarded-Proto`/`CF-Visitor` headers, so the http →
https redirect does not loop behind the proxy. Nothing else in the kingspa.com zone
needs to change.

## Notes for later changes

- The site copies the live WordPress site as it was on 26 Oct 2026, including its
  structured data (Rank Math's graph and the DaySpa block, with its rating and price
  list) and robots.txt. Pages edited in Sanity keep their captured sitemap dates;
  new pages are added to the sitemaps automatically.
- WordPress's emoji support is kept (`components/WpEmoji.tsx`): browsers that cannot
  draw the newest emoji get Twemoji images, as on the live site.

- Icon fonts are cut down to the icons in use at build time. An icon that no page
  uses yet needs its CSS rule in the page stylesheet before it shows.
- Fonts ship Latin only (latin-ext is not used by any text on the site).
- Old URLs: add a line to the "Old URLs" block of `public/.htaccess`, above the
  slash rule.
- The third-party scripts (Tag Manager, gtag, Meta Pixel, Hotjar, Clixtell, Ahrefs,
  Klaviyo, AddToAny, reCAPTCHA) are copied word for word from the live site into
  `components/Analytics.tsx`; Tag Manager adds GA4 and Google Ads. A new tag
  domain must also be added to the Content-Security-Policy in `.htaccess`.
- Alt text is exactly the live site's: images with no alt text there have none here.
  Editors can add it in the Studio.
