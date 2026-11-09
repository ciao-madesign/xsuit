import { describe } from "../shared/version";
import { DEFAULT_SETTINGS } from "../shared/settings";
import { saveSettings } from "../shared/storage";

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") await saveSettings({ ...DEFAULT_SETTINGS });
});

console.info(describe(), "service worker ready");
