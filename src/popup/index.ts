import { computeStatus } from "../shared/state";
import type { Message, RestoreReply } from "../shared/messages";
import { loadSettings, saveSettings } from "../shared/storage";
import {
  DEPTHS,
  PROFILE_CHOICES,
  withExclusion,
  type Depth,
  type ProfileChoice,
  type Settings,
} from "../shared/settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings;
let tab: chrome.tabs.Tab | undefined;

async function render(): Promise<void> {
  const status = computeStatus(settings, tab?.url);
  $<HTMLInputElement>("enabled").checked = settings.enabled;
  $<HTMLSelectElement>("depth").value = settings.depth;
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="profile"]')) {
    r.checked = r.value === settings.profile;
  }
  const supported = status.kind !== "unsupported";
  const exclude = $<HTMLInputElement>("exclude");
  exclude.disabled = !supported;
  exclude.checked = status.kind === "excluded";
  $<HTMLButtonElement>("restore").disabled = !supported;
  const box = $("status");
  box.textContent = status.message;
  box.className = `status ${status.kind}`;
}

async function update(next: Settings): Promise<void> {
  settings = next;
  await saveSettings(settings);
  await render();
}

async function restore(): Promise<void> {
  if (!tab?.id) return;
  try {
    const reply = (await chrome.tabs.sendMessage(tab.id, {
      type: "xsuit/restore",
    } satisfies Message)) as RestoreReply;
    $("status").textContent = reply.note;
  } catch {
    $("status").textContent = "Could not reach the page. Reload it and try again.";
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
  $<HTMLInputElement>("exclude").addEventListener("change", (e) => {
    const host = computeStatus(settings, tab?.url);
    if ("host" in host)
      update(withExclusion(settings, host.host, (e.target as HTMLInputElement).checked));
  });
  $("restore").addEventListener("click", restore);
  await render();
}

init();
