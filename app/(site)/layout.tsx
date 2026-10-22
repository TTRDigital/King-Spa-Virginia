import "../globals.css";
import { Analytics } from "@/components/Analytics";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
