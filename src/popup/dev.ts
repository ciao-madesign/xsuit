// Developer-only popup tools (measure, compatibility check, comparison report, export).
// Not part of the release build: popup/index.ts reaches this file only behind `__DEV__`.

import type { Measurement } from "../metrics/metrics";
import { showPreview } from "../pages/exportPreview";
import { prepareMeasurementExport } from "../research/exportGate";
import { ifAvailable } from "../shared/features";
import type {
  ApplyReply,
  InspectReply,
  MeasureReply,
  Message,
  ReportReply,
  RestoreReply,
} from "../shared/messages";
import { summarize } from "./summary";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export interface PopupDeps {
  send: <T>(msg: Message) => Promise<T | null>;
  say: (text: string) => void;
  windowId: () => number | undefined;
}

let last: Measurement | null = null;
let deps: PopupDeps;

async function measure(): Promise<void> {
  const reply = await deps.send<MeasureReply>({ type: "xsuit/measure" });
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
  const r = await deps.send<InspectReply>({ type: "xsuit/inspect" });
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
  deps.say("Preparing the report…");
  const r = await deps.send<ReportReply>({ type: "xsuit/report" });
  if (!r) return;
  const images: { before: string | null; after: string | null } = { before: null, after: null };
  // Screenshots are optional: a browser without the API simply gets a report without images.
  const shot = (): Promise<string | null> =>
    ifAvailable(
      "tabs.captureVisibleTab",
      () => chrome.tabs.captureVisibleTab(deps.windowId()!, { format: "png" }).catch(() => null),
      Promise.resolve(null),
    );
  if (r.report.transformed) {
    images.after = await shot();
    await deps.send<RestoreReply>({ type: "xsuit/restore" });
    await new Promise((res) => setTimeout(res, 300));
    images.before = await shot();
    await deps.send<ApplyReply>({ type: "xsuit/apply-once" });
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

/** Opens the "Check before saving" box; the file is written only after the person presses Save. */
function download(): void {
  if (!last) return;
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  showPreview(
    {
      box: $("exportBox"),
      summary: $("exportSummary"),
      problems: $("exportProblems"),
      json: $("exportJson"),
      save: $("exportSave") as HTMLButtonElement,
      cancel: $("exportCancel") as HTMLButtonElement,
    },
    prepareMeasurementExport(last),
  );
}

/** Wires the developer buttons. Returns the function that enables or disables them. */
export function initDev(d: PopupDeps): (supported: boolean) => void {
  deps = d;
  $("inspect").addEventListener("click", inspect);
  $("measure").addEventListener("click", measure);
  $("download").addEventListener("click", download);
  $("compare").addEventListener("click", compare);
  return (supported) => {
    for (const id of ["measure", "inspect", "compare"])
      $<HTMLButtonElement>(id).disabled = !supported;
  };
}
