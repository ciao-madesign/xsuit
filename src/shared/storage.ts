import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./settings";

const KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  try {
    const data = await chrome.storage.local.get(KEY);
    return normalizeSettings(data[KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS, enabledSites: [], disabledRules: [] };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: normalizeSettings(settings) });
}

export function onSettingsChanged(cb: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]) cb(normalizeSettings(changes[KEY].newValue));
  });
}
