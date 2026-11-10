import { isRtl, ruleText, translator, type Key, type Lang, type Translate } from "../i18n";
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
  private lang: Lang = "en";
  private t: Translate = translator("en");

  constructor(
    private doc: Document,
    private handlers: OverlayHandlers,
  ) {}

  /** The label is shown in the person's interface language (not the page's). */
  setLanguage(lang: Lang): void {
    this.lang = lang;
    this.t = translator(lang);
  }

  /** True while a label is supposed to be on screen. */
  expected = false;

  hide(): void {
    this.host?.remove();
    this.host = null;
    this.expected = false;
  }

  /**
   * The label is how a person knows the page was changed by xsuit. If the page removes it, hides
   * it, makes it transparent or shrinks it, this returns false and the caller undoes everything
   * (fail safe: no changes without a visible notice).
   */
  intact(): boolean {
    if (!this.expected) return true;
    const host = this.host;
    if (!host || !host.isConnected || host.parentNode !== this.doc.documentElement) return false;
    const win = this.doc.defaultView!;
    const cs = win.getComputedStyle(host);
    if (cs.display === "none" || cs.visibility !== "visible") return false;
    if (parseFloat(cs.opacity || "1") < 0.5) return false;
    const r = host.getBoundingClientRect();
    const layout = this.doc.documentElement.getBoundingClientRect().width > 0;
    return !layout || (r.width >= 8 && r.height >= 8);
  }

  show(summary: ChangeSummary, position: LabelPosition, unverifiable = 0): void {
    if (position === "hidden" || summary.count === 0) return this.hide();
    this.hide();
    const doc = this.doc;
    const host = doc.createElement("div");
    host.setAttribute(HOST_ATTR, "");
    const side = position === "bottom-right" ? "right" : "left";
    // !important in the inline style: page CSS cannot override it.
    host.style.cssText = `all: initial !important; display: block !important; visibility: visible !important; opacity: 1 !important; position: fixed !important; bottom: 12px !important; ${side}: 12px !important; z-index: 2147483647 !important;`;
    const root = host.attachShadow({ mode: "closed" });
    const style = doc.createElement("style");
    style.textContent = CSS;

    const wrap = doc.createElement("div");
    wrap.className = `wrap ${side}`;
    const pill = doc.createElement("button");
    pill.className = "pill";
    pill.type = "button";
    const t = this.t;
    wrap.dir = isRtl(this.lang) ? "rtl" : "ltr";
    wrap.lang = this.lang;
    pill.textContent = t("overlay.pill", { n: summary.count });
    pill.setAttribute("aria-label", t("overlay.pillAria", { n: summary.count }));
    pill.setAttribute("aria-expanded", "false");

    const panel = doc.createElement("div");
    panel.className = "panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("overlay.panelAria"));
    const line = doc.createElement("p");
    line.textContent = t("overlay.line", { n: summary.count });
    panel.append(line);

    const details = doc.createElement("details");
    const sum = doc.createElement("summary");
    sum.textContent = t("overlay.why");
    sum.style.cursor = "pointer";
    const list = doc.createElement("ul");
    for (const r of summary.reasons) {
      const li = doc.createElement("li");
      // Plain words first: what changed, why, how sure the evidence is. The rule's own
      // technical text is used only when there is no plain sentence for it.
      const what = doc.createElement("strong");
      what.textContent = ruleText(t, r.ruleId) ?? `${r.title}: ${r.description}`;
      const why = doc.createElement("div");
      why.className = "muted";
      const level = `evidence.${r.evidenceLevel}` as Key;
      const sources = r.sources.map((s) => s.split(":")[0]).join(", ");
      why.textContent = `${t("overlay.reason")} ${t(level)}. ${t("overlay.sources", { list: sources })}`;
      // One level down: the exact rule, version, how sure xsuit was about the page part, limits.
      const tech = doc.createElement("details");
      const ts = doc.createElement("summary");
      ts.textContent = t("overlay.technical");
      const more = doc.createElement("div");
      more.className = "muted";
      more.lang = "en";
      more.dir = "ltr";
      more.textContent = `${r.title} (${r.evidence}) · ${r.dimension} · rule v${r.version} · recognition: ${r.confidence} · ${r.elements} element(s). ${r.limit ? `Not shown by the evidence: ${r.limit} ` : ""}`;
      const off = doc.createElement("div");
      off.className = "muted";
      off.textContent = t("overlay.turnOff");
      tech.append(ts, more);
      li.append(what, why, tech, off);
      list.append(li);
    }
    details.append(sum, list);
    panel.append(details);

    if (summary.undone.length || unverifiable) {
      const note = doc.createElement("p");
      note.className = "muted";
      const parts: string[] = [];
      for (const u of summary.undone)
        parts.push(t("overlay.notApplied", { title: u.title, reason: u.reason }));
      if (unverifiable) parts.push(t("overlay.unverified", { n: unverifiable }));
      note.textContent = parts.join(" ");
      panel.append(note);
    }

    const row = doc.createElement("div");
    row.className = "row";
    const undo = doc.createElement("button");
    undo.type = "button";
    undo.className = "act primary";
    undo.textContent = t("overlay.undo");
    undo.addEventListener("click", () => this.handlers.onUndo());
    const close = doc.createElement("button");
    close.type = "button";
    close.className = "act";
    close.textContent = t("overlay.close");
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
    this.expected = true;
  }
}
