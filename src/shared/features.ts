// Feature checks for browser APIs that differ between Chrome, Edge and Firefox (B21).
// Every API xsuit needs is listed here, as "required" (without it xsuit cannot work and says so)
// or "optional" (without it one feature is skipped, nothing else changes).

type Api = Record<string, unknown>;

export const REQUIRED_APIS = [
  "storage.local",
  "runtime.sendMessage",
  "tabs.query",
  "tabs.sendMessage",
  "scripting.executeScript",
  "scripting.registerContentScripts",
  "scripting.unregisterContentScripts",
  "scripting.getRegisteredContentScripts",
  "permissions.request",
  "permissions.contains",
  "permissions.remove",
] as const;

export const OPTIONAL_APIS = [
  "storage.session", // report hand-over to the report page
  "tabs.captureVisibleTab", // screenshots in the report (never exported)
  "permissions.onAdded", // keeps the site list in step when the prompt closes the popup
  "permissions.onRemoved",
] as const;

function has(root: Api | undefined, path: string): boolean {
  let cur: unknown = root;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !(part in (cur as Api))) return false;
    cur = (cur as Api)[part];
  }
  return cur !== undefined && cur !== null;
}

/** APIs from `list` that this browser does not provide. `api` defaults to the global `chrome`. */
export function missingApis(list: readonly string[], api?: Api): string[] {
  const root = api ?? (globalThis as unknown as { chrome?: Api }).chrome;
  return list.filter((p) => !has(root, p));
}

/** Calls fn only when the API exists; otherwise returns the fallback. Never throws for a missing API. */
export function ifAvailable<T, F>(path: string, fn: () => T, fallback: F, api?: Api): T | F {
  return missingApis([path], api).length ? fallback : fn();
}
