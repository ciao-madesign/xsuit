// "Check before saving": shows what a file contains, then saves exactly that text, only after
// the person presses Save. Built with textContent only.

import type { ExportPreview } from "../research/exportGate";

export interface PreviewElements {
  box: HTMLElement;
  summary: HTMLElement;
  problems: HTMLElement;
  json: HTMLElement;
  save: HTMLButtonElement;
  cancel: HTMLButtonElement;
}

/** Saves the previewed text as a file on this device. Nothing is sent anywhere. */
export function saveText(fileName: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function showPreview(
  el: PreviewElements,
  preview: ExportPreview,
  save: (fileName: string, json: string) => void = saveText,
): void {
  el.summary.replaceChildren();
  el.problems.replaceChildren();
  el.json.textContent = preview.ok ? preview.json : "";
  for (const row of preview.summary) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    el.summary.append(dt, dd);
  }
  for (const text of preview.problems) {
    const p = document.createElement("p");
    p.textContent = text;
    el.problems.append(p);
  }
  el.save.disabled = !preview.ok;
  el.save.onclick = () => {
    if (!preview.ok) return;
    save(preview.fileName, preview.json); // the exact text that was shown
    el.box.hidden = true;
  };
  el.cancel.onclick = () => {
    el.box.hidden = true;
  };
  el.box.hidden = false;
}
