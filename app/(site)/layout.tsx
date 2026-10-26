import "../globals.css";
import { Analytics } from "@/components/Analytics";
import { WpEmoji } from "@/components/WpEmoji";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Marks that scripts run, before the page is drawn (deferred section backgrounds, app/globals.css). */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('ks-js')" }} />
      {children}
      <WpEmoji />
      <Analytics />
    </>
  );
}
