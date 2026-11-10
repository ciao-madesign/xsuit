import type { ApplyReply, Message, RestoreReply } from "../shared/messages";
import {
  DEPTHS,
  PROFILE_CHOICES,
  normalizeHost,
  sitePatterns,
  withSite,
  type Depth,
  type ProfileChoice,
  type Settings,
} from "../shared/settings";
import { initDev } from "./dev";
import { computeStatus } from "../shared/state";
import { loadSettings, saveSettings } from "../shared/storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;

function say(text: string): void {
  $("status").textContent = text;
}

/** Set by the developer module; absent from the release build. */
let renderDev: (supported: boolean) => void = () => undefined;

function render(): void {
  const status = computeStatus(settings, tab?.url);
  $<HTMLInputElement>("enabled").checked = settings.enabled;
  $<HTMLSelectElement>("depth").value = settings.depth;
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="profile"]')) {
    r.checked = r.value === settings.profile;
  }
  const supported = status.kind !== "unsupported";
  const always = $<HTMLInputElement>("always");
  always.disabled = !supported;
  always.checked = status.kind === "active";
  $<HTMLButtonElement>("restore").disabled = !supported;
  if (__DEV__) renderDev(supported);
  $<HTMLButtonElement>("apply").disabled =
    !supported || !settings.enabled || settings.profile === "original";
  const box = $("status");
  box.textContent = status.message;
  box.className = `status ${status.kind}`;
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
      say("Access was not granted, so xsuit will not run here automatically.");
      render();
      return;
    }
    await update(withSite(settings, host, true));
    // No style chosen yet: ask in plain words instead of deciding for the user (decision #30).
    if (settings.profile === "original") {
      $("picker").hidden = false;
      return;
    }
    await send<ApplyReply>({ type: "xsuit/apply-once" });
  } else {
    await chrome.permissions.remove({ origins }).catch(() => false);
    await update(withSite(settings, host, false));
  }
}

async function init(): Promise<void> {
  [settings, [tab]] = await Promise.all([
    loadSettings(),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);
  $<HTMLInputElement>("enabled").addEventListener("change", (e) =>
    update({ ...settings, enabled: (e.target as HTMLInputElement).checked }),
  );
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="profile"]')) {
    r.addEventListener("change", () => {
      if (PROFILE_CHOICES.includes(r.value as ProfileChoice))
        update({ ...settings, profile: r.value as ProfileChoice });
    });
  }
  $<HTMLSelectElement>("depth").addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value as Depth;
    if (DEPTHS.includes(v)) update({ ...settings, depth: v });
  });
  $<HTMLInputElement>("always").addEventListener("change", (e) =>
    setAlways((e.target as HTMLInputElement).checked),
  );
  $("apply").addEventListener("click", async () => {
    const r = await send<ApplyReply>({ type: "xsuit/apply-once" });
    if (r)
      say(
        r.applied
          ? `Applied to this page (${r.rules} rule(s)).`
          : "Nothing was applied on this page.",
      );
  });
  $("restore").addEventListener("click", async () => {
    const r = await send<RestoreReply>({ type: "xsuit/restore" });
    if (r) say(r.note);
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>("#picker button")) {
    b.addEventListener("click", async () => {
      const style = b.dataset.style as ProfileChoice;
      $("picker").hidden = true;
      await update({ ...settings, profile: style });
      await send<ApplyReply>({ type: "xsuit/apply-once" });
    });
  }
  if (__DEV__) renderDev = initDev({ send, say, windowId: () => tab?.windowId });
  render();
}

init();
