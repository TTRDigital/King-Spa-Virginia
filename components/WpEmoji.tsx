import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/*
 * WordPress's emoji support, as on the live site: the loader checks whether the
 * browser draws the newest emoji itself and, only if it does not, loads
 * wp-emoji-release.min.js, which swaps emoji in the text for Twemoji images.
 * Same settings and loader (assets/wp-emoji, WordPress's own code); the script
 * is served from /wp-assets/ instead of /wp-includes/.
 */
const SETTINGS = {
  baseUrl: "https://s.w.org/images/core/emoji/17.0.2/72x72/",
  ext: ".png",
  svgUrl: "https://s.w.org/images/core/emoji/17.0.2/svg/",
  svgExt: ".svg",
  source: { concatemoji: "/wp-assets/includes/js/wp-emoji-release.min.js?ver=7.0" },
};

export function WpEmoji() {
  const loader = readFileSync(path.join(process.cwd(), "assets/wp-emoji/wp-emoji-loader.min.js"), "utf8");
  return (
    <>
      <script id="wp-emoji-settings" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SETTINGS) }} />
      <script type="module" dangerouslySetInnerHTML={{ __html: loader }} />
    </>
  );
}
