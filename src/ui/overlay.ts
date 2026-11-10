import type { LabelPosition } from "../shared/settings";
import type { ChangeSummary } from "./summary";

const HOST_ATTR = "data-xsuit-ui"; // ignored by measurement and recognition

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font: 12px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { position: relative; display: inline-block; }
.pill { cursor: pointer; border: 0; border-radius: 999px; padding: 4px 10px; color: #fff;
  background: rgba(20, 20, 20, 0.78); opacity: 0.85; animation: fade 1s ease 4s forwards; }
@keyframes fade { to { opacity: 0.25; } }
.wrap:hover .pill, .wrap:focus-within .pill, .pill[aria-expanded="true"] { opacity: 1; animation: none; }
.pill:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid #7b9bff; outline-offset: 2px; }
.panel { position: absolute; bottom: calc(100% + 6px); width: 300px; max-width: 80vw; max-height: 60vh; overflow: auto;
  background: #fff; color: #1a1a1a; border: 1px solid #c9ccd1; border-radius: 8px; padding: 10px 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.left .panel { left: 0; } .right .panel { right: 0; }
.panel[hidden] { display: none; }
p { margin: 0 0 8px; } .muted { color: #5f6368; }
ul { margin: 6px 0; padding-left: 16px; } li { margin: 4px 0; }
.row { display: flex; gap: 8px; margin-top: 8px; }
button.act { cursor: pointer; border: 1px solid #c9ccd1; border-radius: 6px; padding: 4px 10px; background: #f6f7f8; color: #1a1a1a; }
button.act.primary { background: #2f5bea; border-color: #2f5bea; color: #fff; }
@media (prefers-color-scheme: dark) {
  .panel { background: #1b1c1f; color: #ececec; border-color: #3a3c40; } .muted { color: #a0a4aa; }
  button.act { background: #26282c; color: #ececec; border-color: #3a3c40; }
}
@media (prefers-reduced-motion: reduce) { .pill { animation: none; opacity: 0.6; } }
@media print { :host { display: none !important; } }
`;

export interface OverlayHandlers {
  onUndo: () => void;
}

/**
 * Small semi-transparent label in a page corner (decision #31). It is overlaid with
 * position: fixed, so it never moves page content. Everything inside a closed shadow root,
 * built with textContent only.
 */
export class Overlay {
  private host: HTMLElement | null = null;

  constructor(
    private doc: Document,
    private handlers: OverlayHandlers,
  ) {}

  hide(): void {
    this.host?.remove();
    this.host = null;
  }

  show(summary: ChangeSummary, position: LabelPosition, unverifiable = 0): void {
    if (position === "hidden" || summary.count === 0) return this.hide();
    this.hide();
    const doc = this.doc;
    const host = doc.createElement("div");
    host.setAttribute(HOST_ATTR, "");
    const side = position === "bottom-right" ? "right" : "left";
    host.style.cssText = `all: initial; position: fixed; bottom: 12px; ${side}: 12px; z-index: 2147483647;`;
    const root = host.attachShadow({ mode: "closed" });
    const style = doc.createElement("style");
    style.textContent = CSS;

    const wrap = doc.createElement("div");
    wrap.className = `wrap ${side}`;
    const pill = doc.createElement("button");
    pill.className = "pill";
    pill.type = "button";
    pill.textContent = `xsuit · ${summary.count}`;
    pill.setAttribute(
      "aria-label",
      `xsuit made ${summary.count} changes to this page. Open details.`,
    );
    pill.setAttribute("aria-expanded", "false");

    const panel = doc.createElement("div");
    panel.className = "panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "xsuit details");
    const line = doc.createElement("p");
    line.textContent = summary.line;
    panel.append(line);

    const details = doc.createElement("details");
    const sum = doc.createElement("summary");
    sum.textContent = "Why?";
    sum.style.cursor = "pointer";
    const list = doc.createElement("ul");
    for (const r of summary.reasons) {
      const li = doc.createElement("li");
      const b = doc.createElement("strong");
      b.textContent = r.title;
      const d = doc.createElement("span");
      d.textContent = ` ${r.description} `;
      const e = doc.createElement("span");
      e.className = "muted";
      e.textContent = `(${r.evidence}; ${r.sources.map((s) => s.split(":")[0]).join(", ")})`;
      li.append(b, d, e);
      list.append(li);
    }
    details.append(sum, list);
    panel.append(details);

    if (summary.undone.length || unverifiable) {
      const note = doc.createElement("p");
      note.className = "muted";
      const parts: string[] = [];
      for (const u of summary.undone) parts.push(`"${u.title}" was not applied: ${u.reason}.`);
      if (unverifiable)
        parts.push(`${unverifiable} item(s) could not be checked for accessibility.`);
      note.textContent = parts.join(" ");
      panel.append(note);
    }

    const row = doc.createElement("div");
    row.className = "row";
    const undo = doc.createElement("button");
    undo.type = "button";
    undo.className = "act primary";
    undo.textContent = "Undo";
    undo.addEventListener("click", () => this.handlers.onUndo());
    const close = doc.createElement("button");
    close.type = "button";
    close.className = "act";
    close.textContent = "Close";
    row.append(undo, close);
    panel.append(row);

    const toggle = (open: boolean) => {
      panel.hidden = !open;
      pill.setAttribute("aria-expanded", String(open));
      if (open) undo.focus();
      else pill.focus();
    };
    pill.addEventListener("click", () => toggle(panel.hidden));
    close.addEventListener("click", () => toggle(false));
    panel.addEventListener("keydown", (ev) => {
      if ((ev as KeyboardEvent).key === "Escape") toggle(false);
    });

    wrap.append(pill, panel);
    root.append(style, wrap);
    doc.documentElement.append(host);
    this.host = host;
  }
}
