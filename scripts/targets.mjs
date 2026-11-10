// Browser targets (B21). One source manifest (public/manifest.json, written for Chrome); the other
// targets are derived from it by small, listed changes. Security-relevant keys are never touched:
// a test compares them across all targets.

export const TARGETS = ["chrome", "edge", "firefox"];

/** Extension id for Firefox. Fixed once, because an id cannot change after the first publication. */
export const FIREFOX_ID = "{4f6c1b0e-6a52-4d0e-9c1e-5b3a0c7e2d41}";
/** Conservative: the Firefox version MDN uses in its own example. Lower it only after a smoke test. */
export const FIREFOX_MIN_VERSION = "140.0";

/** Release builds go to dist / dist-<target>; developer builds to dist-dev / dist-dev-<target>. */
export function outDir(target, dev = false) {
  const base = dev ? "dist-dev" : "dist";
  return target === "chrome" ? base : `${base}-${target}`;
}

/** Returns the manifest for a target without changing the one passed in. */
export function manifestFor(target, base) {
  if (!TARGETS.includes(target)) throw new Error(`unknown target "${target}"`);
  const m = JSON.parse(JSON.stringify(base));
  if (target === "firefox") {
    // Firefox runs the background as an event page (scripts), not a service worker.
    m.background = { scripts: [m.background.service_worker] };
    delete m.minimum_chrome_version;
    m.browser_specific_settings = {
      gecko: {
        id: FIREFOX_ID,
        strict_min_version: FIREFOX_MIN_VERSION,
        // xsuit collects and transmits nothing; Mozilla asks every new extension to say so.
        data_collection_permissions: { required: ["none"] },
      },
    };
  }
  // Edge is Chromium: same manifest as Chrome. It only has its own folder and package.
  return m;
}
