import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The page runtime (lib/runtime), loaded as a module script: it runs after the
 * page is parsed and needs no React in the browser. Built by scripts/build-runtime.mjs.
 */
export function SiteRuntime() {
  const file = path.join(process.cwd(), "public/js/runtime.json");
  if (!existsSync(file)) return null;
  const { src } = JSON.parse(readFileSync(file, "utf8")) as { src: string };
  // Module scripts already wait for the page to be parsed; `defer` just says so.
  return <script type="module" src={src} defer />;
}
