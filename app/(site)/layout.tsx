import "../globals.css";
import { BodyTags, FootTags, HeadTags } from "@/components/Analytics";
import { WpEmoji } from "@/components/WpEmoji";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <HeadTags />
      <BodyTags />
      {children}
      <WpEmoji />
      <FootTags />
    </>
  );
}
