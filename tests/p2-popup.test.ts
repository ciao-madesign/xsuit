import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketName, suggestMarket, viewFor } from "../src/popup/model";
import { DEFAULT_SETTINGS, type Settings } from "../src/shared/settings";

const base = (o: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  onboarded: true,
  profile: "western",
  ...o,
});

describe("what the popup shows", () => {
  it("first run: choose a market before anything else", () => {
    expect(viewFor({ settings: DEFAULT_SETTINGS, supported: true, adapted: false }).kind).toBe(
      "onboarding",
    );
    expect(
      viewFor({ settings: base({ onboarded: false }), supported: true, adapted: false }).kind,
    ).toBe("onboarding");
  });

  it("one switch: adapt, then back to original", () => {
    const off = viewFor({ settings: base(), supported: true, adapted: false });
    expect(off).toMatchObject({
      kind: "home",
      toggle: { label: "Adapt this page", disabled: false },
    });
    const on = viewFor({ settings: base(), supported: true, adapted: true });
    expect(on).toMatchObject({ kind: "home", toggle: { label: "Back to original" } });
  });

  it("explains pages that cannot be changed and a switched-off xsuit in plain words", () => {
    const un = viewFor({
      settings: base(),
      supported: false,
      unsupportedReason: "Browser pages cannot be changed.",
      adapted: false,
    });
    expect(un).toEqual({ kind: "unsupported", message: "Browser pages cannot be changed." });
    const off = viewFor({ settings: base({ enabled: false }), supported: true, adapted: false });
    expect(off).toMatchObject({ toggle: { disabled: true } });
  });

  it("the suggestion follows the browser language but is only a suggestion", () => {
    expect(suggestMarket("zh-CN")).toBe("china");
    expect(suggestMarket("it-IT")).toBe("western");
    expect(suggestMarket("")).toBeNull();
    expect(marketName("hybrid")).toBe("Custom mix");
    expect(marketName("china")).toBe("China");
  });
});

/** The real popup page with a fake browser: clicks and the calls they make. */
describe("the popup page", () => {
  let store: Record<string, unknown>;
  let sent: string[];
  let permissionCalls: number;
  let injected: number;
  let pageAdapted: boolean;
  let hasScript: boolean;

  async function open(settings: Partial<Settings> | null, url = "https://example.com/page") {
    vi.resetModules();
    document.documentElement.innerHTML = readFileSync("public/popup.html", "utf8")
      .replace(/<!doctype html>|<\/?html[^>]*>/gi, "")
      .replace(/<script[^>]*><\/script>/gi, "");
    store = settings ? { settings: { ...DEFAULT_SETTINGS, ...settings } } : {};
    sent = [];
    permissionCalls = 0;
    injected = 0;
    const chromeFake = {
      storage: {
        local: {
          get: async () => store,
          set: async (o: Record<string, unknown>) => void Object.assign(store, o),
        },
        onChanged: { addListener() {} },
      },
      tabs: {
        query: async () => [{ id: 1, url, windowId: 1 }],
        sendMessage: async (_id: number, msg: { type: string }) => {
          if (!hasScript && msg.type !== "xsuit/ping") throw new Error("no script");
          if (!hasScript && msg.type === "xsuit/ping") throw new Error("no script");
          sent.push(msg.type);
          if (msg.type === "xsuit/ping") return { ok: true, applied: pageAdapted, rules: 0 };
          if (msg.type === "xsuit/apply-once") {
            pageAdapted = true;
            return { ok: true, applied: true, rules: 3, skipped: [], recognized: [], reverted: [] };
          }
          pageAdapted = false;
          return { ok: true, restored: true, note: "" };
        },
      },
      scripting: {
        executeScript: async () => {
          injected++;
          hasScript = true;
        },
      },
      permissions: {
        request: async () => (permissionCalls++, true),
        remove: async () => true,
        contains: async () => true,
      },
    };
    vi.stubGlobal("chrome", chromeFake);
    await import("../src/popup/index");
    await new Promise((r) => setTimeout(r, 20));
  }
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  const click = async (el: HTMLElement) => {
    el.click();
    await new Promise((r) => setTimeout(r, 20));
  };

  beforeEach(() => {
    pageAdapted = false;
    hasScript = false;
  });

  it("first run shows the market choice only, and choosing saves it", async () => {
    await open(null);
    expect($("onboarding").hidden).toBe(false);
    expect($("home").hidden).toBe(true);
    expect($("advanced").hidden).toBe(true);
    const china = document.querySelector<HTMLElement>('#marketChoices [data-market="china"]')!;
    await click(china);
    const saved = store.settings as Settings;
    expect(saved.profile).toBe("china");
    expect(saved.onboarded).toBe(true);
    expect($("home").hidden).toBe(false);
    expect($("marketName").textContent).toBe("China");
  });

  it("one click adapts the page with no permission prompt, one more click restores it", async () => {
    await open({ profile: "western", onboarded: true });
    expect($("toggle").textContent).toBe("Adapt this page");
    await click($("toggle"));
    expect(injected).toBe(1); // activeTab: the page script is injected by the click itself
    expect(permissionCalls).toBe(0); // no site permission asked
    expect(sent).toContain("xsuit/apply-once");
    expect($("toggle").textContent).toBe("Back to original");
    expect($("hint").textContent).toMatch(/3 changes/);
    await click($("toggle"));
    expect(sent).toContain("xsuit/restore");
    expect($("toggle").textContent).toBe("Adapt this page");
    expect($("hint").textContent).toMatch(/Back to the original/);
  });

  it("'Always on this site' is the only thing that asks for site access", async () => {
    await open({ profile: "western", onboarded: true });
    const always = $("always") as HTMLInputElement;
    always.checked = true;
    always.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 30));
    expect(permissionCalls).toBe(1);
    expect((store.settings as Settings).enabledSites).toEqual(["example.com"]);
  });

  it("browser pages are explained and cannot be switched", async () => {
    await open({ profile: "western", onboarded: true }, "chrome://extensions");
    expect($("unsupported").hidden).toBe(false);
    expect($("home").hidden).toBe(true);
  });

  it("the custom mix lives under Advanced, not in the main view", async () => {
    await open({ profile: "western", onboarded: true });
    const adv = $("advanced");
    expect(adv.contains($("custom"))).toBe(true);
    expect($("home").contains($("custom"))).toBe(false);
    ($("custom") as HTMLInputElement).checked = true;
    $("custom").dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect((store.settings as Settings).profile).toBe("hybrid");
    expect($("marketName").textContent).toBe("Custom mix");
  });
});
