import { DEFAULT_SETTINGS, normalizeHost, withExclusion, type Settings } from "../shared/settings";
import { loadSettings, saveSettings } from "../shared/storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;

function render(): void {
  const list = $("excluded");
  list.replaceChildren();
  if (settings.excludedDomains.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No excluded sites.";
    list.append(li);
  }
  for (const d of settings.excludedDomains) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = d;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => update(withExclusion(settings, d, false)));
    li.append(name, btn);
    list.append(li);
  }
}

async function update(next: Settings): Promise<void> {
  settings = next;
  await saveSettings(settings);
  render();
}

async function init(): Promise<void> {
  settings = await loadSettings();
  $("add").addEventListener("click", async () => {
    const input = $<HTMLInputElement>("new-domain");
    const host = normalizeHost(input.value);
    if (!host) {
      $("error").textContent = "Enter a valid domain, for example example.com.";
      return;
    }
    $("error").textContent = "";
    input.value = "";
    await update(withExclusion(settings, host, true));
  });
  $("reset").addEventListener("click", () => update({ ...DEFAULT_SETTINGS, excludedDomains: [] }));
  render();
}

init();
