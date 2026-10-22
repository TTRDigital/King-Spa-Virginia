import { NextStudio } from "next-sanity/studio";
import config from "../../../sanity.config";
import { projectId } from "../../../sanity/env";

export const dynamic = "force-static";

// Static export: one page at /cms/. Inner studio URLs are sent to it by public/.htaccess.
export function generateStaticParams() {
  return [{ tool: [] }];
}

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  // Without a project ID the studio cannot start; say what to set instead of erroring.
  if (!projectId) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "15vh auto", padding: 24, lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 24 }}>Sanity is not connected yet</h1>
        <p>
          Set <code>NEXT_PUBLIC_KSV_SANITY_PROJECT_ID</code> in <code>.env.local</code> (or the repository variable <code>SANITY_PROJECT_ID</code>), then rebuild. See the README for the full setup.
        </p>
      </main>
    );
  }
  return <NextStudio config={config} />;
}
