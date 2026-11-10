// The localization brief page. Reads the brief the popup stored for this session, checks it again,
// shows it in the person's language, and lets them print or save it. Nothing leaves the device.

import { ruleText, type Key } from "../i18n";
import { showLanguageUi } from "../i18n/picker";
import { marketName } from "../popup/model";
import { loadSettings } from "../shared/storage";
import { validateBrief, type Brief } from "./brief";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

async function main(): Promise<void> {
  const settings = await loadSettings();
  const { t } = showLanguageUi(document, settings.language, navigator.language);
  const got = (await chrome.storage.session.get("brief")) as { brief?: Brief };
  const brief = got.brief;
  if (!brief || validateBrief(brief).length) {
    $("summary").textContent = t("brief.empty");
    $("changes").hidden = true;
    return;
  }
  const market = marketName(brief.market, t);
  $("subtitle").textContent = t("brief.subtitle", {
    host: brief.host,
    market,
    strength: t(`strength.${brief.strength}` as Key),
    date: brief.createdOn,
  });
  $("summary").textContent = brief.changes.length
    ? t("brief.summary", { n: brief.changes.length, market })
    : t("brief.empty");

  for (const c of brief.changes) {
    const box = el("article", undefined, "change");
    box.append(el("h3", ruleText(t, c.ruleId) ?? c.title));
    box.append(
      el(
        "p",
        `${t("overlay.reason")} ${t(`evidence.${c.evidenceLevel}` as Key)}. ${t("overlay.sources", { list: c.sources.join(", ") })}`,
        "muted",
      ),
    );
    box.append(el("p", t("brief.elements", { n: c.elements }), "muted"));
    if (c.limit) {
      const lim = el("p", `${t("brief.limits")}: ${c.limit}`, "muted");
      lim.lang = "en";
      lim.dir = "ltr";
      box.append(lim);
    }
    if (c.structural) box.append(el("p", t("brief.structural")));
    else if (c.css.length) {
      box.append(el("h4", t("brief.css")));
      const pre = el("pre");
      pre.dir = "ltr";
      pre.textContent = c.css
        .map((x) =>
          x.on
            ? `/* ${t(x.on === "a" ? "brief.cssLinks" : "brief.cssImages")} */ ${x.declaration};`
            : `${x.declaration};`,
        )
        .join("\n");
      box.append(pre, el("p", t("brief.cssNote"), "muted"));
    }
    const tech = el("details");
    tech.append(
      el("summary", t("overlay.technical")),
      el(
        "div",
        `${c.title} · ${c.dimension}: ${c.pole} · rule v${c.version} · recognition: ${c.confidence}`,
        "muted",
      ),
    );
    tech.lang = "en";
    box.append(tech);
    $("changes").append(box);
  }
  if (brief.notApplied.length) {
    $("notApplied").hidden = false;
    for (const n of brief.notApplied)
      $("notAppliedList").append(
        el("li", t("overlay.notApplied", { title: n.title, reason: n.reason })),
      );
  }
  $("print").addEventListener("click", () => window.print());
  $("save").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(brief, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `xsuit-brief-${brief.host}-${brief.createdOn}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

void main();
