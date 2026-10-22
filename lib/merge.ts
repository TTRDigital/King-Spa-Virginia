/**
 * Merges Sanity content over fallback content. A CMS value wins when it is
 * "filled": not null, not an empty string, not an empty array and, for
 * images, has a src. Plain objects merge key by key, so one filled field
 * never wipes out its siblings. Arrays are replaced whole.
 */
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function filled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (isObj(v) && "src" in v) return !!v.src;
  return true;
}

/** Drops empty images and empty values inside CMS arrays (e.g. a feature section without a photo). */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined).map(clean) as T;
  if (isObj(v)) {
    const out: Obj = {};
    for (const [k, x] of Object.entries(v)) {
      if (!filled(x)) continue;
      out[k] = clean(x);
    }
    return out as T;
  }
  return v;
}

export function merge<T>(fallback: T, cms: unknown): T {
  if (!filled(cms)) return fallback;
  if (Array.isArray(fallback) || Array.isArray(cms)) return clean(cms) as T;
  if (isObj(fallback) && isObj(cms)) {
    const out: Obj = { ...fallback };
    for (const [k, v] of Object.entries(cms)) {
      out[k] = k in fallback ? merge((fallback as Obj)[k], v) : filled(v) ? clean(v) : undefined;
    }
    return out as T;
  }
  return cms as T;
}
