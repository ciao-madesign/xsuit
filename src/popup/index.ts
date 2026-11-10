import { measurementFileName, type Measurement } from "../metrics/metrics";
import type {
  ApplyReply,
  InspectReply,
  MeasureReply,
  Message,
  ReportReply,
  RestoreReply,
} from "../shared/messages";
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
import { computeStatus } from "../shared/state";
import { loadSettings, saveSettings } from "../shared/storage";
import { summarize } from "./summary";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;
let last: Measurement | null = null;

function say(text: string): void {
  $("status").textContent = text;
}

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
  for (const id of ["restore", "measure", "inspect", "compare"])
    $<HTMLButtonElement>(id).disabled = !supported;
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

async function measure(): Promise<void> {
  const reply = await send<MeasureReply>({ type: "xsuit/measure" });
  if (!reply) return;
  last = reply.measurement;
  const table = $<HTMLTableElement>("metrics");
  table.replaceChildren();
  for (const [label, value] of summarize(last)) {
    const tr = table.insertRow();
    tr.insertCell().textContent = label;
    tr.insertCell().textContent = value;
  }
  table.hidden = false;
  $<HTMLButtonElement>("download").disabled = false;
}

const LEVEL_TEXT = { full: "Full", partial: "Partial", minimal: "Minimal" } as const;

async function inspect(): Promise<void> {
  const r = await send<InspectReply>({ type: "xsuit/inspect" });
  if (!r) return;
  const box = $("compat");
  box.replaceChildren();
  const add = (text: string, strong = false) => {
    const p = document.createElement("p");
    if (strong) p.style.fontWeight = "600";
    p.textContent = text;
    box.append(p);
  };
  add(`Compatibility: ${LEVEL_TEXT[r.compatibility.level]}`, true);
  add(r.compatibility.reason);
  add(`Page type: ${r.pageType} (${r.classificationNote})`);
  for (const c of r.recognized)
    add(`${c.component}: ${c.confidence}, from ${c.source} (${c.signals.join("; ")})`);
  for (const h of r.adapterHits)
    add(`adapter ${h.component}: ${h.result} (${h.selectors} selector(s))`);
  if (r.skipped.length) add(`Skipped rules: ${r.skipped.length}`);
  for (const s of r.skipped.slice(0, 8)) add(`- ${s.ruleId}: ${s.reason}`);
  box.hidden = false;
}

/** Before/after report: numbers from the page, plus two screenshots of the visible area. */
async function compare(): Promise<void> {
  say("Preparing the report…");
  const r = await send<ReportReply>({ type: "xsuit/report" });
  if (!r) return;
  const images: { before: string | null; after: string | null } = { before: null, after: null };
  const shot = () =>
    chrome.tabs.captureVisibleTab(tab!.windowId, { format: "png" }).catch(() => null);
  if (r.report.transformed) {
    images.after = await shot();
    await send<RestoreReply>({ type: "xsuit/restore" });
    await new Promise((res) => setTimeout(res, 300));
    images.before = await shot();
    await send<ApplyReply>({ type: "xsuit/apply-once" });
  }
  try {
    await chrome.storage.session.set({ report: { report: r.report, images } });
  } catch {
    await chrome.storage.session.set({
      report: { report: r.report, images: { before: null, after: null } },
    });
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
}

function download(): void {
  if (!last) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(last, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = measurementFileName(last);
  a.click();
  URL.revokeObjectURL(url);
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
  $("inspect").addEventListener("click", inspect);
  $("measure").addEventListener("click", measure);
  $("download").addEventListener("click", download);
  $("compare").addEventListener("click", compare);
  render();
}

init();
