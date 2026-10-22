/*
 * Writes the form handler's settings (public/api/form.php reads them) from
 * environment variables, i.e. the GitHub secrets in the deploy workflow.
 * The file is denied to visitors by .htaccess and never committed.
 */
import { writeFileSync } from "node:fs";

const out = process.argv[2] || "out/api/.config.php";
const php = (v) => `'${String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const cfg = {
  to: process.env.FORM_TO_EMAIL,
  from: process.env.FORM_FROM_EMAIL || "noreply@virginia.kingspa.com",
  recaptcha_secret_elementor: process.env.RECAPTCHA_SECRET_ELEMENTOR,
  recaptcha_secret_cf7: process.env.RECAPTCHA_SECRET_CF7,
  klaviyo_list_id: process.env.KLAVIYO_LIST_ID,
  klaviyo_company_id: "VuDLmc",
};
if (!cfg.to) console.warn("[forms] FORM_TO_EMAIL is not set: the forms will show an error until it is.");
writeFileSync(out, `<?php\n// Written by scripts/form-config.mjs during the deploy. Do not commit.\nreturn [\n${Object.entries(cfg).map(([k, v]) => `  '${k}' => ${php(v)},`).join("\n")}\n];\n`);
console.log(`[forms] settings written to ${out}`);
