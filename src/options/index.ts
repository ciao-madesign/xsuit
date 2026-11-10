import chinaRules from "../../rules/china.json";
import westernRules from "../../rules/western.json";
import type { RuleSet } from "../rules/types";
import {
  DEFAULT_SETTINGS,
  LABEL_POSITIONS,
  sitePatterns,
  withSite,
  type LabelPosition,
  type Settings,
} from "../shared/settings";
import { loadSettings, saveSettings } from "../shared/storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const sets = [westernRules, chinaRules] as unknown as RuleSet[];
const LEVEL: Record<string, string> = {
  strong: "strong evidence",
  moderate: "moderate evidence",
  emerging: "early evidence",
  hypothesis: "hypothesis, not yet validated",
};
let settings: Settings;

function renderSites(): void {
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

function renderRules(): void {
  const box = $("rules");
  box.replaceChildren();
  for (const set of sets) {
    const h = document.createElement("h3");
    h.textContent = `${set.profile === "china" ? "China" : "Western"} style`;
    h.style.fontSize = "13px";
    box.append(h);
    for (const rule of set.rules) {
      const row = document.createElement("div");
      row.className = "row";
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !settings.disabledRules.includes(rule.id);
      cb.addEventListener("change", () => {
        const rest = settings.disabledRules.filter((x) => x !== rule.id);
        void update({ ...settings, disabledRules: cb.checked ? rest : [...rest, rule.id] });
      });
      const title = document.createElement("span");
      title.textContent = ` ${rule.title} `;
      const ev = document.createElement("span");
      ev.className = "muted";
      ev.textContent = `(${LEVEL[rule.evidence.level] ?? rule.evidence.level})`;
      label.append(cb, title, ev);
      row.append(label);
      row.title = rule.description;
      box.append(row);
    }
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
  renderSites();
}

async function init(): Promise<void> {
  settings = await loadSettings();
  const pos = $<HTMLSelectElement>("label-position");
  pos.value = settings.labelPosition;
  pos.addEventListener("change", () => {
    const v = pos.value as LabelPosition;
    if (LABEL_POSITIONS.includes(v)) void update({ ...settings, labelPosition: v });
  });
  $("reset").addEventListener("click", async () => {
    for (const d of settings.enabledSites)
      await chrome.permissions.remove({ origins: sitePatterns(d) }).catch(() => false);
    await update({ ...DEFAULT_SETTINGS, enabledSites: [], disabledRules: [] });
    pos.value = settings.labelPosition;
    renderRules();
  });
  renderSites();
  renderRules();
}

init();
