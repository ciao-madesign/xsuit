import type { ApplyReply, Message, PingReply, RestoreReply } from "../shared/messages";
import {
  DEPTHS,
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
import { adaptResult, marketName, MARKETS, suggestMarket, viewFor, type Market } from "./model";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;
let adapted = false;
let message = "";

/** Set by the developer module; absent from the release build. */
let renderDev: (supported: boolean) => void = () => undefined;

function say(text: string): void {
  message = text;
  render();
}

function marketButtons(into: HTMLElement, onPick: (m: Market) => void): void {
  into.replaceChildren();
  for (const m of MARKETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.dataset.market = m.id;
    const name = document.createElement("strong");
    name.textContent = m.name;
    const blurb = document.createElement("span");
    blurb.className = "muted";
    blurb.textContent = m.blurb;
    b.append(name, blurb);
    b.addEventListener("click", () => onPick(m.id));
    into.append(b);
  }
}

function render(): void {
  const page = computeStatus(settings, tab?.url);
  const supported = page.kind !== "unsupported";
  const view = viewFor({
    settings,
    supported,
    unsupportedReason: supported ? undefined : page.message,
    adapted,
  });
  $("onboarding").hidden = view.kind !== "onboarding";
  $("home").hidden = view.kind !== "home";
  $("advanced").hidden = view.kind === "onboarding";
  const un = $("unsupported");
  un.hidden = view.kind !== "unsupported";
  if (view.kind === "unsupported") un.textContent = view.message;
  if (view.kind === "onboarding") {
    const s = suggestMarket(navigator.language);
    $("suggestion").textContent = s
      ? `Suggestion from your browser language: ${marketName(s)}. The choice is yours.`
      : "";
  }
  if (view.kind === "home") {
    const t = $<HTMLButtonElement>("toggle");
    t.textContent = view.toggle.label;
    t.disabled = view.toggle.disabled;
    $("marketName").textContent = marketName(settings.profile);
    $("hint").textContent = message || view.hint;
    const always = $<HTMLInputElement>("always");
    always.disabled = !supported;
    always.checked = supported && isOn();
  }
  $<HTMLInputElement>("enabled").checked = settings.enabled;
  $<HTMLSelectElement>("depth").value = settings.depth;
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
      say("Could not reach the page. Reload it and try again.");
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
  if (wasAdapted) message = `Market changed to ${marketName(m)}.`;
  render();
}

/** The one switch: adapt this page, or go back to the original. Needs only the click (activeTab). */
async function toggle(): Promise<void> {
  message = "";
  if (adapted) {
    const r = await send<RestoreReply>({ type: "xsuit/restore" });
    if (r) {
      adapted = false;
      message = "Back to the original page.";
    }
  } else {
    const r = await send<ApplyReply>({ type: "xsuit/apply-once" });
    if (r) {
      adapted = r.applied;
      message = adaptResult(r.applied, r.rules);
    }
  }
  render();
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
      message = "Access was not granted, so xsuit will not run here automatically.";
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
  marketButtons($("marketChoices"), chooseMarket);
  marketButtons($("marketPicker"), chooseMarket);
  $("changeMarket").addEventListener("click", () => {
    $("marketPicker").hidden = !$("marketPicker").hidden;
  });
  $("toggle").addEventListener("click", toggle);
  $<HTMLInputElement>("always").addEventListener("change", (e) =>
    setAlways((e.target as HTMLInputElement).checked),
  );
  $<HTMLInputElement>("enabled").addEventListener("change", (e) =>
    update({ ...settings, enabled: (e.target as HTMLInputElement).checked }),
  );
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
