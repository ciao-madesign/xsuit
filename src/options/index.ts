import chinaRules from "../../rules/china.json";
import westernRules from "../../rules/western.json";
import profiles from "../../rules/profiles.json";
import { hybridBlockedBy } from "../engine/hybrid";
import type { Rule, RuleSet } from "../rules/types";
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

function defaultHybrid(): string[] {
  const h = (profiles as { id: string; composition?: { ruleIds: string[] }[] }[]).find(
    (p) => p.id === "hybrid",
  );
  return (h?.composition ?? []).flatMap((c) => c.ruleIds);
}

function renderHybrid(): void {
  const box = $("hybrid-rules");
  box.replaceChildren();
  const all = sets.flatMap((s) => s.rules) as Rule[];
  const selected = settings.hybridRules ?? defaultHybrid();
  for (const rule of all) {
    const on = selected.includes(rule.id);
    const by = on ? null : hybridBlockedBy(rule.id, selected, all);
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = on;
    cb.disabled = by !== null;
    cb.addEventListener("change", () => {
      const rest = selected.filter((x) => x !== rule.id);
      void update({ ...settings, hybridRules: cb.checked ? [...rest, rule.id] : rest });
    });
    const text = document.createElement("span");
    const origin = rule.profile === "china" ? "China" : "Western";
    text.textContent = ` ${rule.title} (${origin}) `;
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = by
      ? `conflicts with "${all.find((r) => r.id === by)?.title}"`
      : `(${LEVEL[rule.evidence.level] ?? rule.evidence.level})`;
    label.append(cb, text, note);
    row.append(label);
    row.title = rule.description;
    box.append(row);
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
  renderHybrid();
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
    await update({ ...DEFAULT_SETTINGS, enabledSites: [], disabledRules: [], hybridRules: null });
    pos.value = settings.labelPosition;
    renderRules();
  });
  $("delete-all").addEventListener("click", async () => {
    if (!confirm("Delete all xsuit data from this browser? Site access will be removed too."))
      return;
    for (const d of settings.enabledSites)
      await chrome.permissions.remove({ origins: sitePatterns(d) }).catch(() => false);
    await chrome.storage.local.clear();
    await chrome.storage.session.clear().catch(() => undefined);
    settings = { ...DEFAULT_SETTINGS, enabledSites: [], disabledRules: [], hybridRules: null };
    pos.value = settings.labelPosition;
    renderSites();
    renderRules();
    $("delete-note").textContent = "All xsuit data was deleted.";
  });
  $("hybrid-default").addEventListener("click", () => update({ ...settings, hybridRules: null }));
  if (location.hash === "#hybrid") $<HTMLDetailsElement>("hybrid").open = true;
  renderSites();
  renderRules();
  renderHybrid();
}

init();
