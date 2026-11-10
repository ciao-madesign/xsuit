import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en, type Key } from "../src/i18n/en";
import { ar } from "../src/i18n/ar";
import { de } from "../src/i18n/de";
import { es } from "../src/i18n/es";
import { fr } from "../src/i18n/fr";
import { it as itTable } from "../src/i18n/it";
import { zh } from "../src/i18n/zh";
import {
  applyToDocument,
  isMachineTranslated,
  isRtl,
  LANGUAGES,
  resolveLanguage,
  ruleText,
  translator,
  type Lang,
} from "../src/i18n";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/shared/settings";
import { Overlay } from "../src/ui/overlay";
import { summarizeChanges } from "../src/ui/summary";
import type { Rule } from "../src/rules/types";

const TABLES: Record<Exclude<Lang, "en">, Record<Key, string>> = {
  it: itTable,
  es,
  fr,
  de,
  zh,
  ar,
};
const keys = Object.keys(en) as Key[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const rules = [
  ...JSON.parse(readFileSync("rules/western.json", "utf8")).rules,
  ...JSON.parse(readFileSync("rules/china.json", "utf8")).rules,
] as Rule[];

describe("the interface table", () => {
  for (const [lang, table] of Object.entries(TABLES)) {
    it(`${lang}: has every text, the same placeholders, and no empty text`, () => {
      expect(Object.keys(table).sort()).toEqual([...keys].sort());
      for (const k of keys) {
        expect(table[k].trim(), `${lang}/${k}`).not.toBe("");
        expect(placeholders(table[k]), `${lang}/${k}`).toEqual(placeholders(en[k]));
      }
    });
    it(`${lang}: is really translated (few texts left identical to English)`, () => {
      const same = keys.filter((k) => table[k] === en[k]);
      expect(same.length, same.join(", ")).toBeLessThanOrEqual(10);
    });
  }

  it("every rule that can change a page has a sentence in plain words", () => {
    for (const r of rules) expect(`rule.${r.id}` in en, r.id).toBe(true);
  });

  it("a missing text falls back to English, never to nothing", () => {
    const t = translator("it");
    expect(t("home.adapt")).toBe("Adatta questa pagina");
    expect(translator("en")("hint.ready", { market: "X" })).toBe(
      "One click: this page takes the X style.",
    );
    expect(ruleText(t, "no.such-rule")).toBeNull();
  });

  it("every non-English language carries the machine-translation notice, English does not", () => {
    expect(isMachineTranslated("en")).toBe(false);
    for (const l of LANGUAGES.filter((x) => x !== "en")) {
      expect(isMachineTranslated(l)).toBe(true);
      expect(TABLES[l as Exclude<Lang, "en">]["notice.auto"]).not.toBe(en["notice.auto"]);
    }
    expect(en["notice.auto"]).toMatch(
      /translated automatically and has not been reviewed by a person/,
    );
  });
});

describe("choosing the language", () => {
  it("auto follows the browser, falls back to English, and a choice always wins", () => {
    expect(resolveLanguage("auto", "it-IT")).toBe("it");
    expect(resolveLanguage("auto", "zh_CN")).toBe("zh");
    expect(resolveLanguage("auto", "ja")).toBe("en");
    expect(resolveLanguage("auto", undefined)).toBe("en");
    expect(resolveLanguage("de", "it")).toBe("de");
  });
  it("settings accept only known languages", () => {
    expect(DEFAULT_SETTINGS.language).toBe("auto");
    expect(normalizeSettings({ language: "fr" }).language).toBe("fr");
    expect(normalizeSettings({ language: "klingon" }).language).toBe("auto");
  });
  it("Arabic is right-to-left, the others are not", () => {
    expect(isRtl("ar")).toBe(true);
    for (const l of LANGUAGES.filter((x) => x !== "ar")) expect(isRtl(l)).toBe(false);
    applyToDocument(document, "ar", translator("ar"));
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    applyToDocument(document, "en", translator("en"));
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("the pages are fully in the table", () => {
  const strip = (h: string) => h.replace(/<!-- dev:start -->[\s\S]*?<!-- dev:end -->/g, "");
  for (const file of ["popup", "options"]) {
    it(`${file}.html: every key exists and every visible text is translatable`, () => {
      const doc = new DOMParser().parseFromString(
        strip(readFileSync(`public/${file}.html`, "utf8")),
        "text/html",
      );
      for (const el of doc.querySelectorAll<HTMLElement>("[data-i18n]"))
        expect(el.dataset.i18n! in en, el.dataset.i18n).toBe(true);
      const bad: string[] = [];
      for (const el of doc.body.querySelectorAll<HTMLElement>("*")) {
        if (el.closest("#hybrid") || ["SCRIPT", "STYLE"].includes(el.tagName)) continue;
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent!.trim())
          .join("");
        if (own && own !== "xsuit" && !el.hasAttribute("data-i18n"))
          bad.push(`<${el.tagName.toLowerCase()}> ${own}`);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("the on-page label in the person's language", () => {
  afterEach(() => vi.restoreAllMocks());
  const open = () => {
    const real = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, "attachShadow").mockImplementation(function (
      this: HTMLElement,
    ) {
      return real.call(this, { mode: "open" });
    });
  };
  const show = (lang: Lang) => {
    document.documentElement.innerHTML = "<head></head><body><p>page</p></body>";
    open();
    const o = new Overlay(document, { onUndo: () => {} });
    o.setLanguage(lang);
    o.show(
      summarizeChanges([{ ruleId: "visual.china.vivid-palette", elements: 2 }], [], rules),
      "bottom-left",
    );
    const host = document.querySelector("[data-xsuit-ui]") as HTMLElement;
    return { o, root: host.shadowRoot! };
  };

  it("English: plain sentence, why and evidence, technical details one level down", () => {
    const { o, root } = show("en");
    const text = root.textContent!;
    expect(text).toContain("Livelier colours: slightly more saturated.");
    expect(text).toContain("Sites in this market usually do this.");
    expect(text).toContain("Sources:");
    expect(root.querySelector("details details summary")?.textContent).toBe("Technical details");
    expect(root.querySelector("details details")?.textContent).toContain("rule v");
    o.hide();
  });

  it("Italian: the label is translated, the technical part stays English and says so", () => {
    const { o, root } = show("it");
    const text = root.textContent!;
    expect(text).toContain("Colori più vivaci: leggermente più saturi.");
    expect(text).toContain("Annulla");
    expect(root.querySelector(".wrap")?.getAttribute("lang")).toBe("it");
    expect(root.querySelector("details details div")?.getAttribute("lang")).toBe("en");
    o.hide();
  });

  it("Arabic: the label is laid out right to left", () => {
    const { o, root } = show("ar");
    expect(root.querySelector(".wrap")?.getAttribute("dir")).toBe("rtl");
    expect(root.textContent).toContain(ar["overlay.undo"]);
    o.hide();
  });
});

describe("the popup in another language", () => {
  it("shows its texts, the right direction and the machine-translation notice", async () => {
    vi.resetModules();
    document.documentElement.innerHTML = readFileSync("public/popup.html", "utf8")
      .replace(/<!doctype html>|<\/?html[^>]*>/gi, "")
      .replace(/<script[^>]*><\/script>/gi, "");
    const store: Record<string, unknown> = {
      settings: { ...DEFAULT_SETTINGS, onboarded: true, profile: "western", language: "ar" },
    };
    vi.stubGlobal("chrome", {
      storage: {
        local: { get: async () => store, set: async (o: object) => void Object.assign(store, o) },
        onChanged: { addListener() {} },
      },
      tabs: {
        query: async () => [{ id: 1, url: "https://example.com/", windowId: 1 }],
        sendMessage: async () => {
          throw new Error("no script");
        },
      },
    });
    await import("../src/popup/index");
    await new Promise((r) => setTimeout(r, 30));
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.getElementById("toggle")!.textContent).toBe(ar["home.adapt"]);
    const notice = document.getElementById("notice")!;
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe(ar["notice.auto"]);
    vi.unstubAllGlobals();
  });
});
