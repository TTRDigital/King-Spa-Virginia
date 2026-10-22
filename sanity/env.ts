/**
 * KING SPA Virginia's Sanity project. The project ID is public (it is in every
 * image URL). It is read from this site's own variable names, not the generic
 * NEXT_PUBLIC_SANITY_PROJECT_ID, so a project ID set for another site on the
 * same machine or CI runner can never be picked up by mistake.
 *   local:   NEXT_PUBLIC_KSV_SANITY_PROJECT_ID in .env.local
 *   GitHub:  repository variable SANITY_PROJECT_ID (the workflows pass it on)
 * Until it is set the site builds from its built-in content and /cms says what to set.
 */
export const projectId = process.env.NEXT_PUBLIC_KSV_SANITY_PROJECT_ID || "";
export const dataset = process.env.NEXT_PUBLIC_KSV_SANITY_DATASET || "production";
export const apiVersion = "2025-02-19";
