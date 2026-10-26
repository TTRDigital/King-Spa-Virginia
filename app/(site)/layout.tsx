import "../globals.css";
import { HeadTags } from "@/components/Analytics";

/* The page-specific scripts (start and end of <body>) come with each page (app/(site)/[[...slug]]/page.tsx). */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <HeadTags />
      {children}
    </>
  );
}
