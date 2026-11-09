import { describe } from "../shared/version";
import { DEFAULT_SETTINGS, normalizeHost, sitePatterns, withSite } from "../shared/settings";
import { loadSettings, onSettingsChanged, saveSettings } from "../shared/storage";
import type { Settings } from "../shared/settings";

const SCRIPT_ID = "xsuit-content";

/**
 * The content script is registered only for sites the user enabled AND granted access to.
 * Reason: minimal permissions (spec principle 5). No access to any other site.
 */
async function syncRegistration(settings: Settings): Promise<void> {
  const matches: string[] = [];
  for (const host of settings.enabledSites) {
    const origins = sitePatterns(host);
    if (await chrome.permissions.contains({ origins })) matches.push(...origins);
  }
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  if (matches.length) {
    await chrome.scripting.registerContentScripts([
      { id: SCRIPT_ID, matches, js: ["content.js"], runAt: "document_idle" },
    ]);
  }
}

const hostsOf = (origins: string[] | undefined) =>
  [
    ...new Set(
      (origins ?? []).map((o) =>
        normalizeHost(o.replace(/^\*:\/\/(\*\.)?/, "").replace(/\/\*$/, "")),
      ),
    ),
  ].filter((h): h is string => h !== null);

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") await saveSettings({ ...DEFAULT_SETTINGS, enabledSites: [] });
  await syncRegistration(await loadSettings());
});
chrome.runtime.onStartup.addListener(async () => syncRegistration(await loadSettings()));
onSettingsChanged((s) => void syncRegistration(s));

// The permission prompt can close the popup before it finishes, so the site list is also
// kept in step here.
chrome.permissions.onAdded.addListener(async (p) => {
  let s = await loadSettings();
  for (const h of hostsOf(p.origins)) s = withSite(s, h, true);
  await saveSettings(s);
  await syncRegistration(s);
});
chrome.permissions.onRemoved.addListener(async (p) => {
  let s = await loadSettings();
  for (const h of hostsOf(p.origins)) s = withSite(s, h, false);
  await saveSettings(s);
  await syncRegistration(s);
});

console.info(describe(), "service worker ready");
