import type { ApplyReply, BriefReply, Message, PingReply, RestoreReply } from "../shared/messages";
import {
  DEPTHS,
  INTENSITY_CHOICES,
  type IntensityChoice,
  normalizeHost,
  sitePatterns,
  withSite,
  type Depth,
  type ProfileChoice,
  type Settings,
} from "../shared/settings";
import { computeStatus } from "../shared/state";
import { loadSettings, saveSettings } from "../shared/storage";
import { initDev } from "./dev";
import {
  applyToDocument,
  isMachineTranslated,
  LANGUAGES,
  LANGUAGE_NAMES,
  resolveLanguage,
  translator,
  type Lang,
  type Translate,
} from "../i18n";
import { adaptMessage, MARKET_IDS, marketName, suggestMarket, viewFor, type Market } from "./model";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;
let adapted = false;
let lang: Lang = "en";
let t: Translate = translator("en");
let message = "";

/** Set by the developer module; absent from the release build. */
let renderDev: (supported: boolean) => void = () => undefined;

function say(text: string): void {
  message = text;
  render();
}

function marketButtons(into: HTMLElement, onPick: (m: Market) => void): void {
  into.replaceChildren();
  for (const id of MARKET_IDS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.dataset.market = id;
    const name = document.createElement("strong");
    name.textContent = t(`market.${id}.name`);
    const blurb = document.createElement("span");
    blurb.className = "muted";
    blurb.textContent = t(`market.${id}.blurb`);
    b.append(name, blurb);
    b.addEventListener("click", () => onPick(id));
    into.append(b);
  }
}

/** Language and texts follow the setting (or the browser). Called at start and when the setting changes. */
function applyLanguage(): void {
  lang = resolveLanguage(settings.language, navigator.language);
  t = translator(lang);
  applyToDocument(document, lang, t);
  marketButtons($("marketChoices"), chooseMarket);
  marketButtons($("marketPicker"), chooseMarket);
  const sel = $<HTMLSelectElement>("language");
  sel.replaceChildren();
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = t("language.auto");
  sel.append(auto);
  for (const l of LANGUAGES) {
    const o = document.createElement("option");
    o.value = l;
    o.textContent = LANGUAGE_NAMES[l];
    sel.append(o);
  }
  sel.value = settings.language;
  const notice = $("notice");
  notice.hidden = !isMachineTranslated(lang);
  notice.textContent = isMachineTranslated(lang) ? `${t("notice.auto")}` : "";
}

function render(): void {
  const page = computeStatus(settings, tab?.url);
  const supported = page.kind !== "unsupported";
  const view = viewFor(
    {
      settings,
      supported,
      unsupportedKey: supported ? undefined : (page as { messageKey?: string }).messageKey,
      adapted,
    },
    t,
  );
  $("onboarding").hidden = view.kind !== "onboarding";
  $("home").hidden = view.kind !== "home";
  $("advanced").hidden = view.kind === "onboarding";
  const un = $("unsupported");
  un.hidden = view.kind !== "unsupported";
  if (view.kind === "unsupported") un.textContent = view.message;
  if (view.kind === "onboarding") {
    const s = suggestMarket(navigator.language);
    $("suggestion").textContent = s ? t("onboarding.suggestion", { market: marketName(s, t) }) : "";
  }
  if (view.kind === "home") {
    const sw = $<HTMLButtonElement>("toggle");
    sw.textContent = view.toggle.label;
    sw.disabled = view.toggle.disabled;
    $("marketName").textContent = marketName(settings.profile, t);
    $("hint").textContent = message || view.hint;
    const always = $<HTMLInputElement>("always");
    always.disabled = !supported;
    always.checked = supported && isOn();
  }
  $<HTMLInputElement>("enabled").checked = settings.enabled;
  $<HTMLSelectElement>("depth").value = settings.depth;
  $<HTMLSelectElement>("intensity").value = settings.intensity;
  $<HTMLInputElement>("custom").checked = settings.profile === "hybrid";
  renderDev(supported);
}

/** "Always on this site" is checked when this site is on the always-on list. */
function isOn(): boolean {
  const status = computeStatus(settings, tab?.url);
  return (
    "host" in status &&
    settings.enabledSites.some((d) => status.host === d || status.host.endsWith(`.${d}`))
  );
}

async function update(next: Settings): Promise<void> {
  settings = next;
  await saveSettings(settings);
  render();
}

/** Talks to the page, injecting the content script first if it is not there (activeTab). */
async function send<T>(msg: Message): Promise<T | null> {
  if (!tab?.id) return null;
  try {
    return (await chrome.tabs.sendMessage(tab.id, msg)) as T;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      return (await chrome.tabs.sendMessage(tab.id, msg)) as T;
    } catch {
      say(t("msg.noReach"));
      return null;
    }
  }
}

/** Is this page adapted right now? Asks the page without injecting anything. */
async function isAdapted(): Promise<boolean> {
  if (!tab?.id) return false;
  try {
    return ((await chrome.tabs.sendMessage(tab.id, { type: "xsuit/ping" })) as PingReply).applied;
  } catch {
    return false;
  }
}

async function chooseMarket(m: Market): Promise<void> {
  const next = { ...settings, profile: m as ProfileChoice, onboarded: true };
  $("marketPicker").hidden = true;
  const wasAdapted = adapted;
  await update(next);
  // The page follows the new market by itself when it is already adapted (storage change).
  if (wasAdapted) message = t("msg.marketChanged", { market: marketName(m, t) });
  render();
}

/** The one switch: adapt this page, or go back to the original. Needs only the click (activeTab). */
async function toggle(): Promise<void> {
  message = "";
  if (adapted) {
    const r = await send<RestoreReply>({ type: "xsuit/restore" });
    if (r) {
      adapted = false;
      message = t("msg.restored");
    }
  } else {
    const r = await send<ApplyReply>({ type: "xsuit/apply-once" });
    if (r) {
      adapted = r.applied;
      message = adaptMessage(
        {
          applied: r.applied,
          rules: r.rules,
          skipped: r.skipped,
          recognized: r.recognized,
          reverted: r.reverted,
          intensity: settings.intensity,
          market: marketName(settings.profile, t),
        },
        t,
      );
    }
  }
  render();
}

/** Opens the localization brief of the adapted page, built on this device. */
async function openBrief(): Promise<void> {
  if (!adapted) return say(t("brief.empty"));
  const r = await send<BriefReply>({ type: "xsuit/brief" });
  if (!r) return;
  await chrome.storage.session.set({ brief: r.brief });
  await chrome.tabs.create({ url: chrome.runtime.getURL("brief.html") });
}

async function setAlways(on: boolean): Promise<void> {
  const status = computeStatus(settings, tab?.url);
  if (!("host" in status)) return;
  const host = normalizeHost(status.host);
  if (!host) return;
  const origins = sitePatterns(host);
  if (on) {
    // Must be called straight from the click. The prompt may close this popup; the
    // background worker then records the site.
    const granted = await chrome.permissions.request({ origins }).catch(() => false);
    if (!granted) {
      message = t("msg.noAccess");
      render();
      return;
    }
    await update(withSite(settings, host, true));
    adapted = (await send<ApplyReply>({ type: "xsuit/apply-once" }))?.applied ?? false;
    message = "";
  } else {
    await chrome.permissions.remove({ origins }).catch(() => false);
    await update(withSite(settings, host, false));
  }
  render();
}

async function init(): Promise<void> {
  [settings, [tab]] = await Promise.all([
    loadSettings(),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);
  adapted = await isAdapted();
  applyLanguage();
  $<HTMLSelectElement>("language").addEventListener("change", async (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (v === "auto" || (LANGUAGES as readonly string[]).includes(v)) {
      await update({ ...settings, language: v as Settings["language"] });
      applyLanguage();
      render();
    }
  });
  $("changeMarket").addEventListener("click", () => {
    $("marketPicker").hidden = !$("marketPicker").hidden;
  });
  $("toggle").addEventListener("click", toggle);
  $("brief").addEventListener("click", openBrief);
  $<HTMLInputElement>("always").addEventListener("change", (e) =>
    setAlways((e.target as HTMLInputElement).checked),
  );
  $<HTMLInputElement>("enabled").addEventListener("change", (e) =>
    update({ ...settings, enabled: (e.target as HTMLInputElement).checked }),
  );
  $<HTMLSelectElement>("intensity").addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value as IntensityChoice;
    if (INTENSITY_CHOICES.includes(v)) update({ ...settings, intensity: v });
  });
  $<HTMLSelectElement>("depth").addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value as Depth;
    if (DEPTHS.includes(v)) update({ ...settings, depth: v });
  });
  $<HTMLInputElement>("custom").addEventListener("change", (e) => {
    const on = (e.target as HTMLInputElement).checked;
    // Back from the custom mix to a market: the one suggested for the browser, or Western.
    const back: ProfileChoice = (suggestMarket(navigator.language) ?? "western") as ProfileChoice;
    update({ ...settings, profile: on ? "hybrid" : back, onboarded: true });
  });
  if (__DEV__) renderDev = initDev({ send, say, windowId: () => tab?.windowId });
  render();
}

init();
