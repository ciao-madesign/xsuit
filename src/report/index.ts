import { reportFileName, type Report } from "./report";

export interface StoredReport {
  report: Report;
  images: { before: string | null; after: string | null };
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (v: number | null) => (v === null ? "n/a" : String(v));

function addImage(id: string, src: string | null, alt: string): void {
  const box = $(id);
  // Only an inline PNG captured by the popup is accepted: never a remote or script address.
  if (!src || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src)) {
    box.textContent = "No screenshot.";
    return;
  }
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  box.replaceChildren(img);
}

async function init(): Promise<void> {
  const got = (await chrome.storage.session.get("report")) as { report?: StoredReport };
  // Screenshots may show personal data: they are kept only until this page has read them.
  await chrome.storage.session.remove("report");
  const data = got.report;
  if (!data) {
    $("empty").hidden = false;
    return;
  }
  const r = data.report;
  $("content").hidden = false;
  $("title").textContent = `${r.page.host} (${r.page.pageType})`;
  $("meta").textContent =
    `Style: ${r.profile} · depth: ${r.depth} · page type: ${r.pageType} · ${r.createdAt}`;
  $("not-transformed").hidden = r.transformed;

  const rules = $<HTMLTableElement>("rules");
  for (const x of r.rules) {
    const tr = rules.insertRow();
    tr.insertCell().textContent = x.title;
    tr.insertCell().textContent = x.evidence;
    tr.insertCell().textContent = String(x.elements);
  }
  const ul = $("undone");
  for (const x of r.undoneByGuard) {
    const li = document.createElement("li");
    li.textContent = `${x.ruleId}: ${x.reason}`;
    ul.append(li);
  }
  $("undone-box").hidden = r.undoneByGuard.length === 0;

  const t = $<HTMLTableElement>("metrics");
  for (const m of r.metrics) {
    const tr = t.insertRow();
    tr.insertCell().textContent = m.metric;
    tr.insertCell().textContent = fmt(m.before);
    tr.insertCell().textContent = fmt(m.after);
    tr.insertCell().textContent = m.delta === null ? "" : (m.delta > 0 ? "+" : "") + m.delta;
  }
  for (const n of r.notes) {
    const li = document.createElement("li");
    li.textContent = n;
    $("notes").append(li);
  }
  addImage("img-before", data.images.before, "Page before");
  addImage("img-after", data.images.after, "Page after");

  $("download").addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFileName(r);
    a.click();
    URL.revokeObjectURL(url);
  });
}

init();
