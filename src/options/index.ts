import { DEFAULT_SETTINGS, sitePatterns, withSite, type Settings } from "../shared/settings";
import { loadSettings, saveSettings } from "../shared/storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;

function render(): void {
  const list = $("sites");
  list.replaceChildren();
  if (settings.enabledSites.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No sites yet.";
    list.append(li);
  }
  for (const d of settings.enabledSites) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = d;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => removeSite(d));
    li.append(name, btn);
    list.append(li);
  }
}

async function removeSite(host: string): Promise<void> {
  // Give the access back to the browser too, not only forget the site.
  await chrome.permissions.remove({ origins: sitePatterns(host) }).catch(() => false);
  await update(withSite(settings, host, false));
}

async function update(next: Settings): Promise<void> {
  settings = next;
  await saveSettings(settings);
  render();
}

async function init(): Promise<void> {
  settings = await loadSettings();
  $("reset").addEventListener("click", async () => {
    for (const d of settings.enabledSites)
      await chrome.permissions.remove({ origins: sitePatterns(d) }).catch(() => false);
    await update({ ...DEFAULT_SETTINGS, enabledSites: [] });
  });
  render();
}

init();
