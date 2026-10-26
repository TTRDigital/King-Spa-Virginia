import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/site";

/*
 * Root layout is intentionally bare: the website's styles and chrome come
 * with each page (app/(site)) so the embedded Sanity Studio at /cms loads
 * without them.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Same icons and site verifications as the live site.
  icons: {
    icon: [
      { url: "/images/wp/2021/08/king-spa-logo.svg", sizes: "32x32" },
      { url: "/images/wp/2021/08/king-spa-logo.svg", sizes: "192x192" },
    ],
    apple: "/images/wp/2021/08/king-spa-logo.svg",
  },
  verification: {
    google: "xhsqwBm5__D_RQIGCTkncoUKZMazdlVvV9OFk5V5Pa0",
    other: {
      "ahrefs-site-verification": "e0f053d58729dbd68cef6115bdb00e27375db2623bf341068c2790977f8482d0",
      "facebook-domain-verification": "rsm4matwqri1h1wk95wcbfobhfv4tt",
      "msapplication-TileImage": "/images/wp/2021/08/king-spa-logo.svg",
    },
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
