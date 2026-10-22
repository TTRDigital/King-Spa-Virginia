/*
 * next/image loader for the static export (no image server on SiteGround).
 * - Local photos: WebP copies at fixed widths, made before the build by
 *   scripts/optimize-images.mjs (public/images/x.jpg -> /_img/images/x-640.webp).
 * - Sanity photos: Sanity's own image CDN resizes them.
 * - SVGs are served as they are.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://cdn.sanity.io/")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}w=${width}&q=${quality || 75}&fit=max&auto=format`;
  }
  // SVGs scale on their own; the #w fragment only tells next/image the width was handled
  // (fragments are not sent to the server, so every width is the same cached file).
  if (src.endsWith(".svg")) return `${src}#w${width}`;
  if (!src.startsWith("/images/")) return src;
  return `/_img${src.replace(/\.(jpe?g|png|webp)$/i, "")}-${width}.webp`;
}
