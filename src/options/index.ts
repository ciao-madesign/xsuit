import chinaRules from "../../rules/china.json";
import westernRules from "../../rules/western.json";
import profiles from "../../rules/profiles.json";
import dimensionData from "../../rules/dimensions.json";
import type { Dimension } from "../rules/configuration";
import type { Profile, Rule, RuleSet } from "../rules/types";
import {
  DEFAULT_SETTINGS,
  LABEL_POSITIONS,
  sitePatterns,
  withSite,
  type LabelPosition,
  type Settings,
} from "../shared/settings";
import { loadSettings, saveSettings } from "../shared/storage";
import { LANGUAGES, type Translate } from "../i18n";
import { showLanguageUi } from "../i18n/picker";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const sets = [westernRules, chinaRules] as unknown as RuleSet[];
const LEVEL: Record<string, string> = {
  strong: "strong evidence",
  moderate: "moderate evidence",
  emerging: "early evidence",
  hypothesis: "hypothesis, not yet validated",
};
let settings: Settings;
let t: Translate;

/** Texts follow the chosen interface language. */
function applyLanguage(): void {
  ({ t } = showLanguageUi(document, settings.language, navigator.language));
  renderSites();
}

function renderSites(): void {
  const list = $("sites");
  list.replaceChildren();
  if (settings.enabledSites.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = t("options.sites.none");
    list.append(li);
  }
  for (const d of settings.enabledSites) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = d;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t("options.sites.remove");
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

/** The configuration Hybrid uses when the person has not chosen: its own, from profiles.json. */
function defaultChoices(): Record<string, string> {
  return (profiles as unknown as Profile[]).find((p) => p.id === "hybrid")?.configuration ?? {};
}

/** Hybrid: one choice per dimension (a pole, or keep the page as it is). Conflicts cannot occur. */
function renderHybrid(): void {
  const box = $("hybrid-rules");
  box.replaceChildren();
  const all = sets.flatMap((s) => s.rules) as Rule[];
  const choices = settings.hybridChoices ?? defaultChoices();
  for (const dim of (dimensionData as { dimensions: Dimension[] }).dimensions) {
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("label");
    const name = document.createElement("span");
    name.textContent = `${dim.name}: `;
    const select = document.createElement("select");
    const keep = document.createElement("option");
    keep.value = "";
    keep.textContent = "Keep the page as it is";
    select.append(keep);
    for (const pole of dim.poles) {
      const o = document.createElement("option");
      o.value = pole.id;
      o.textContent = pole.name;
      select.append(o);
    }
    select.value = choices[dim.id] ?? "";
    const note = document.createElement("span");
    note.className = "muted";
    const describe = () => {
      const pole = dim.poles.find((p) => p.id === select.value);
      const rules = all.filter((r) => r.dimension === dim.id && r.pole === select.value);
      note.textContent = pole
        ? ` ${pole.description} Rules: ${rules.map((r) => `${r.title} (${LEVEL[r.evidence.level] ?? r.evidence.level})`).join(", ")}.`
        : " No rule from this dimension is used.";
    };
    describe();
    select.addEventListener("change", () => {
      const next = { ...(settings.hybridChoices ?? defaultChoices()) };
      if (select.value) next[dim.id] = select.value;
      else delete next[dim.id];
      void update({ ...settings, hybridChoices: next, hybridRules: null });
    });
    label.append(name, select);
    row.append(label, note);
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
    await update({
      ...DEFAULT_SETTINGS,
      enabledSites: [],
      disabledRules: [],
      hybridChoices: null,
      hybridRules: null,
    });
    pos.value = settings.labelPosition;
    renderRules();
  });
  $("delete-all").addEventListener("click", async () => {
    if (!confirm(t("options.privacy.confirm"))) return;
    for (const d of settings.enabledSites)
      await chrome.permissions.remove({ origins: sitePatterns(d) }).catch(() => false);
    await chrome.storage.local.clear();
    await chrome.storage.session.clear().catch(() => undefined);
    settings = {
      ...DEFAULT_SETTINGS,
      enabledSites: [],
      disabledRules: [],
      hybridChoices: null,
      hybridRules: null,
    };
    pos.value = settings.labelPosition;
    renderSites();
    renderRules();
    applyLanguage();
    $("delete-note").textContent = t("options.privacy.done");
  });
  $("hybrid-default").addEventListener("click", () =>
    update({ ...settings, hybridChoices: null, hybridRules: null }),
  );
  if (location.hash === "#hybrid") $<HTMLDetailsElement>("hybrid").open = true;
  $<HTMLSelectElement>("language").addEventListener("change", async (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (v === "auto" || (LANGUAGES as readonly string[]).includes(v)) {
      await update({ ...settings, language: v as Settings["language"] });
      applyLanguage();
    }
  });
  applyLanguage();
  renderRules();
  renderHybrid();
}

init();
