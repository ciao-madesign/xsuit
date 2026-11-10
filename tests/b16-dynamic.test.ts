import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePage } from "../src/analyzer";
import { compatibility } from "../src/analyzer/compatibility";
import { resetShadowCache } from "../src/analyzer/deep";
import { recognizeComponents } from "../src/analyzer/components";
import { Engine } from "../src/engine/engine";
import { isActionRisky, isSensitivePage } from "../src/engine/safety";
import type { Component, Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

/** Serialises the page including the content of OPEN shadow roots, to compare before/after. */
function snapshot(node: Node = document.documentElement): string {
  let out = "";
  if (node.nodeType === 1) {
    const el = node as Element;
    out += `<${el.localName} ${[...el.attributes].map((a) => `${a.name}=${a.value}`).join(" ")}>`;
    if (el.shadowRoot)
      out += `#shadow{${[...el.shadowRoot.childNodes].map((n) => snapshot(n)).join("")}}`;
    out += [...el.childNodes].map((n) => snapshot(n)).join("") + `</${el.localName}>`;
  } else out += node.textContent ?? "";
  return out;
}
const open = (body: string) =>
  (document.documentElement.innerHTML = `<head></head><body>${body}</body>`);
function host(id: string, html: string, mode: ShadowRootMode = "open"): ShadowRoot {
  const h = document.getElementById(id)!;
  const sr = h.attachShadow({ mode });
  sr.innerHTML = html;
  resetShadowCache(document);
  return sr;
}
const links = (n: number) =>
  Array.from({ length: n }, (_, i) => `<a href="/s/${i}">Item ${i}</a>`).join("");

describe("shadow DOM: recognition reads through open roots", () => {
  it("finds header, navigation, search and footer built as web components", () => {
    open(`<my-shell id="a"></my-shell><my-foot id="b"></my-foot>`);
    host(
      "a",
      `<header><nav>${links(4)}</nav><form role="search"><input type="search"></form></header>`,
    );
    host("b", `<footer>${links(4)}</footer>`);
    const r = recognizeComponents(document);
    for (const c of ["header", "primary-nav", "search-box", "footer"] as const)
      expect(r[c], c).toBeDefined();
  });
  it("is reported in the compatibility note", () => {
    open(`<my-shell id="a"></my-shell>`);
    host("a", `<header><nav>${links(4)}</nav></header>`);
    const a = analyzePage(document, null, "/");
    expect(a.environment.shadowRoots).toBe(1);
    expect(compatibility(a, null).reason).toContain("shadow root");
  });
});

describe("shadow DOM and frames: safety sees what is hidden there", () => {
  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
  });
  it("a password field inside a (nested) shadow root makes the page sensitive", () => {
    open(`<login-box id="a"></login-box>`);
    const sr = host("a", `<inner-box id="b"></inner-box>`);
    const inner = sr.getElementById("b")!.attachShadow({ mode: "open" });
    inner.innerHTML = `<input type="password">`;
    resetShadowCache(document);
    expect(isSensitivePage(document)).toBe(true);
  });
  it("a payment form inside a shadow root marks the whole block as risky", () => {
    open(`<aside id="side"><side-box id="a"></side-box></aside>`);
    host("a", `<form action="/transfer"><button>Confirm</button></form>`);
    expect(isActionRisky(document.getElementById("side")!)).toBe(true);
  });
  it("a CLOSED root is read where the browser lets an extension (chrome.dom), otherwise it is a known limit", () => {
    open(`<secret-box id="a"></secret-box>`);
    const closed = host("a", `<input type="password">`, "closed");
    expect(isSensitivePage(document)).toBe(false); // cannot be read without the extension API
    (globalThis as { chrome?: unknown }).chrome = { dom: { openOrClosedShadowRoot: () => closed } };
    resetShadowCache(document);
    expect(isSensitivePage(document)).toBe(true);
  });
  it("a login form in a same-origin iframe makes the page sensitive; other frames are only counted", () => {
    open(`<iframe id="f"></iframe><iframe id="g" src="https://other.test/x"></iframe>`);
    const f = document.getElementById("f") as HTMLIFrameElement;
    f.contentDocument!.body.innerHTML = `<input type="password">`;
    expect(isSensitivePage(document)).toBe(true);
    const a = analyzePage(document, null, "/");
    expect(a.environment.frames.readable + a.environment.frames.blocked).toBe(2);
    expect(compatibility(a, null).reason).toContain("frame(s) are never changed");
  });
});

const comps = (list: Component[]) => Object.fromEntries(list.map((c) => [c, "high"]));
function start(
  profile: "china" | "western",
  resolve: (c: Component) => Element[],
  components: Component[],
  opts = {},
) {
  const engine = new Engine({ doc: document, resolve, a11yGuard: false, ...opts });
  engine.start({
    ruleSets,
    profiles,
    profile,
    depth: "structural",
    context: {
      pageType: "home",
      components: comps(components) as never,
      viewportWidth: 1280,
      metrics: { mediaPer1000Px: 5 },
    },
  });
  return engine;
}

describe("shadow DOM: what xsuit changes there", () => {
  it("applies a visual rule inside an open root, with its own scoped style, and restores exactly", () => {
    open(`<promo-box id="a"></promo-box>`);
    const sr = host("a", `<div id="promo">Sale</div>`);
    const before = snapshot();
    const engine = start(
      "china",
      (c) => (c === "promo-banner" ? [sr.getElementById("promo")!] : []),
      ["promo-banner"],
      {
        effects: { "emphasize=medium": ["gap: 1px"] },
      },
    );
    expect(sr.getElementById("promo")!.hasAttribute("data-xsuit-emph")).toBe(true);
    const style = sr.getElementById("xsuit-style")!;
    expect(style.textContent).toContain("[data-xsuit-emph");
    expect(style.textContent).not.toContain("html[data-xsuit]");
    engine.restore();
    expect(snapshot()).toBe(before);
  });
  it("skips structural changes inside a shadow root, and anything in a closed one, and says so", () => {
    open(`<side-box id="a"></side-box><closed-box id="c"></closed-box>`);
    const sr = host("a", `<aside id="side">side</aside>`);
    const closed = host("c", `<div id="promo">Sale</div>`, "closed");
    const before = snapshot();
    const engine = start("western", (c) => (c === "sidebar" ? [sr.getElementById("side")!] : []), [
      "sidebar",
    ]);
    expect(sr.getElementById("side")!.hasAttribute("data-xsuit-collapsed")).toBe(false);
    expect(engine.status.report!.unsupported.map((u) => u.reason).join()).toContain("shadow DOM");
    engine.restore();
    const e2 = start(
      "china",
      (c) => (c === "promo-banner" ? [closed.getElementById("promo")!] : []),
      ["promo-banner"],
    );
    expect(closed.getElementById("promo")!.hasAttribute("data-xsuit-emph")).toBe(false);
    expect(e2.status.report!.unsupported.map((u) => u.reason).join()).toContain(
      "closed shadow DOM",
    );
    e2.restore();
    expect(snapshot()).toBe(before);
  });
});

describe("dynamic pages: the engine keeps up without hogging the page", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const feed = () => document.getElementById("feed")!;
  const resolveCards = (c: Component) =>
    c === "promo-banner" ? [...document.querySelectorAll(".card")] : [];
  const batch = (n: number, start: number) => {
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "card";
      d.textContent = `item ${start + i}`;
      feed().append(d);
    }
  };

  it("infinite scroll: new items are adapted, old removed ones are forgotten", async () => {
    open(`<div id="feed"></div>`);
    const engine = start("china", resolveCards, ["promo-banner"], {
      effects: { "emphasize=medium": ["gap: 1px"] },
    });
    for (let i = 0; i < 100; i++) {
      batch(10, i * 10);
      while (feed().children.length > 30) feed().firstElementChild!.remove(); // the list recycles items
      await vi.advanceTimersByTimeAsync(400);
    }
    expect(engine.status.guardTripped).toBe(false);
    expect([...feed().children].every((c) => c.hasAttribute("data-xsuit-emph"))).toBe(true);
    // the journal holds only live nodes: it did not grow with the 1000 items that came and went
    expect((engine as unknown as { journal: { size: number } }).journal.size).toBeLessThan(120);
    engine.restore();
    expect(document.querySelector("[data-xsuit-emph]")).toBeNull();
  });

  it("changes that cannot matter (text, comments, scripts) do not trigger a run", async () => {
    open(`<div id="feed"><p id="t">a</p></div>`);
    const engine = start("china", resolveCards, ["promo-banner"]);
    const runs = engine.status.runs;
    document.getElementById("t")!.append(document.createTextNode("more"));
    feed().append(
      document.createComment("c"),
      document.createElement("script"),
      document.createElement("style"),
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.status.runs).toBe(runs);
    batch(1, 0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.status.runs).toBe(runs + 1);
    engine.restore();
  });

  it("changes inside open shadow roots are noticed too", async () => {
    open(`<feed-box id="a"></feed-box>`);
    const sr = host("a", `<div class="card">1</div>`);
    const engine = start("china", () => [...sr.querySelectorAll(".card")], ["promo-banner"], {
      effects: { "emphasize=medium": ["gap: 1px"] },
    });
    const runs = engine.status.runs;
    const d = document.createElement("div");
    d.className = "card";
    sr.append(d);
    await vi.advanceTimersByTimeAsync(500);
    expect(engine.status.runs).toBeGreaterThan(runs);
    expect(d.hasAttribute("data-xsuit-emph")).toBe(true);
    engine.restore();
  });

  it("a page that changes non-stop is given up on: the original page is restored, with the reason", async () => {
    open(`<div id="feed"></div>`);
    const before = snapshot();
    const onStop = vi.fn();
    const engine = start("china", resolveCards, ["promo-banner"], {
      onStop,
      debounceMs: 10,
      maxRuns: 5,
    });
    for (let i = 0; i < 40; i++) {
      batch(1, i);
      await vi.advanceTimersByTimeAsync(20);
    }
    expect(engine.status.guardTripped).toBe(true);
    expect(engine.status.stopReason).toContain("changes too often");
    expect(onStop).toHaveBeenCalledTimes(1);
    for (const c of feed().querySelectorAll(".card"))
      expect(c.hasAttribute("data-xsuit-emph")).toBe(false);
    expect(document.documentElement.hasAttribute("data-xsuit")).toBe(false);
    expect(before).toContain("feed");
  });

  it("slow runs make the next one wait; an extremely slow one makes xsuit step aside", async () => {
    open(`<div id="feed"></div>`);
    let clock = 0;
    let cost = 600; // every run "takes" 600 ms
    const now = () => (clock += cost); // each read of the clock advances it by one run's cost
    const engine = start("china", resolveCards, ["promo-banner"], {
      now,
      effects: { "emphasize=medium": ["gap: 1px"] },
    });
    expect(engine.status.active).toBe(true);
    const runs = engine.status.runs;
    batch(1, 0);
    await vi.advanceTimersByTimeAsync(1500); // 600 ms * 5 = 3000 ms (capped to 2000) is not over yet
    expect(engine.status.runs).toBe(runs);
    await vi.advanceTimersByTimeAsync(700);
    expect(engine.status.runs).toBe(runs + 1);
    cost = 9000;
    batch(1, 1);
    await vi.advanceTimersByTimeAsync(2500);
    expect(engine.status.active).toBe(false);
    expect(engine.status.stopReason).toContain("too heavy");
    expect(document.querySelector("[data-xsuit-emph]")).toBeNull();
  });
});

describe("single-page apps: 100 page changes leave nothing behind", () => {
  it("no observer, listener or journal entry accumulates", () => {
    const win = window as unknown as { MutationObserver: typeof MutationObserver };
    const Original = win.MutationObserver;
    let live = 0;
    let created = 0;
    win.MutationObserver = class extends Original {
      private on = false;
      override observe(...a: Parameters<MutationObserver["observe"]>) {
        if (!this.on) live++;
        this.on = true;
        super.observe(...a);
      }
      override disconnect() {
        if (this.on) live--;
        this.on = false;
        super.disconnect();
      }
      constructor(cb: MutationCallback) {
        super(cb);
        created++;
      }
    } as typeof MutationObserver;
    try {
      open(`<main id="m"></main>`);
      const engine = new Engine({
        doc: document,
        resolve: (c) => (c === "promo-banner" ? [...document.querySelectorAll(".card")] : []),
        a11yGuard: false,
        effects: { "emphasize=medium": ["gap: 1px"] },
      });
      const input = {
        ruleSets,
        profiles,
        profile: "china" as const,
        depth: "structural" as const,
        context: {
          pageType: "home" as const,
          components: comps(["promo-banner"]) as never,
          viewportWidth: 1280,
          metrics: {},
        },
      };
      const before = snapshot();
      for (let i = 0; i < 100; i++) {
        document.getElementById("m")!.innerHTML = `<div class="card">page ${i}</div>`; // the app renders a new "page"
        engine.restore();
        engine.start(input);
        expect(live).toBeLessThanOrEqual(1);
        expect((engine as unknown as { journal: { size: number } }).journal.size).toBeLessThan(10);
      }
      engine.restore();
      expect(live).toBe(0);
      expect(created).toBeGreaterThanOrEqual(100);
      document.getElementById("m")!.innerHTML = "";
      expect(snapshot()).toBe(before);
    } finally {
      win.MutationObserver = Original;
    }
  });
});

describe("performance budget", () => {
  const page = (n: number) =>
    open(
      `<header><nav>${links(6)}</nav></header><main>` +
        Array.from(
          { length: n },
          (_, i) =>
            `<div class="swiper"><div itemscope itemtype="https://schema.org/Product"><a href="/p/${i}">p${i}</a><span class="card">x${i}</span></div></div>`,
        ).join("") +
        `</main><footer>${links(4)}</footer>`,
    );
  const calls = (n: number) => {
    page(n);
    const spy = vi.spyOn(window, "getComputedStyle");
    const t0 = performance.now();
    const a = analyzePage(document, null, "/");
    const engine = new Engine({ doc: document, resolve: (c) => a.resolver(c) });
    engine.start({
      ruleSets,
      profiles,
      profile: "china",
      depth: "structural",
      context: { ...a.context, viewportWidth: 1280 },
    });
    const ms = performance.now() - t0;
    const count = spy.mock.calls.length;
    engine.restore();
    spy.mockRestore();
    return { count, ms };
  };
  it("work grows in step with the page, not with its square", () => {
    const small = calls(500);
    const big = calls(1000);
    expect(big.count / small.count).toBeLessThan(2.6);
  });
  it("a page with 3000 repeated blocks is handled within a generous time budget", () => {
    const r = calls(3000);
    expect(r.ms).toBeLessThan(6000); // jsdom is slow; the real-browser budget is checked by `npm run validate:browser`
  });
});
