// Misuse tests: pages and adapters written the way an attacker would, to make xsuit push people
// toward clicks they did not choose, hide warnings, or dress up a scam. None of them may work.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adapters, findAdapter } from "../src/adapters";
import { analyzePage } from "../src/analyzer";
import { Engine } from "../src/engine/engine";
import { isSensitivePage } from "../src/engine/safety";
import type { PlanInput } from "../src/engine/plan";
import type { Adapter, Component, Profile, RuleSet } from "../src/rules/types";
import { validateAdapter } from "../src/rules/validate";
import { Overlay } from "../src/ui/overlay";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];

type Sel = Partial<Record<Component, string>>;
function run(
  profile: PlanInput["profile"],
  pageType: string,
  body: string,
  sel: Sel,
  comps: string[],
) {
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`;
  const before = document.documentElement.outerHTML;
  const resolve = (c: Component) => [...document.querySelectorAll(sel[c] ?? "#none")];
  const engine = new Engine({ doc: document, resolve, a11yGuard: false });
  engine.start({
    ruleSets,
    profiles,
    profile,
    depth: "structural",
    context: {
      pageType: pageType as never,
      components: Object.fromEntries(comps.map((c) => [c, "high"])),
      viewportWidth: 1280,
      metrics: {},
      sensitive: isSensitivePage(document),
    },
  });
  return { engine, before };
}
const HOME = { "primary-nav": "#h", hero: "#hero" } as Sel;
const HERO = `<section id="hero">hero</section>`;

describe("shortcut strip cannot be used to steer clicks", () => {
  const legit = `<a href="/news">News</a><a href="/video">Video</a><a href="/shop">Shop</a>`;
  it("copies only visible, same-site, plainly named links", () => {
    const hostile = [
      `<a href="https://evil.test/win-a-prize">Special offer</a>`, // other site
      `<a href="/safe" style="opacity:0">Invisible</a>`, // invisible link a page planted
      `<a href="/safe2" style="display:none">Hidden</a>`,
      `<a href="/safe3" style="font-size:1px">Tiny one</a>`,
      `<a href="/safe4" aria-hidden="true">Aria hidden</a>`,
      `<a href="/tool.exe">Get the app</a>`, // download lure
      `<a href="/account/login">Account</a>`, // action
      `<a href="/news2">pay‮pal.com</a>`, // bidirectional trick
      `<a href="/news3">paypal.com/verify</a>`, // text that looks like another address
      `<a href="/news4">Free\u200Bgift</a>`, // zero-width character
      `<a href="javascript:alert(1)">Click me</a>`,
    ].join("");
    const { engine, before } = run(
      "china",
      "home",
      `<header id="h">${legit}${hostile}</header>${HERO}`,
      HOME,
      ["primary-nav", "hero"],
    );
    const strip = document.querySelector("[data-xsuit-shortcuts]")!;
    expect([...strip.querySelectorAll("a")].map((a) => a.textContent)).toEqual([
      "News",
      "Video",
      "Shop",
    ]);
    for (const a of strip.querySelectorAll("a")) {
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.title).toContain("Goes to");
    }
    expect(strip.getAttribute("aria-label")).toContain("xsuit");
    engine.restore();
    expect(document.documentElement.outerHTML).toBe(before);
  });
  it("never takes links from a block that holds a payment or other form", () => {
    run(
      "china",
      "home",
      `<header id="h"><form action="/pay"><input name="amount"></form>${legit}<a href="/x">More</a></header>${HERO}`,
      HOME,
      ["primary-nav", "hero"],
    );
    expect(document.querySelector("[data-xsuit-shortcuts]")).toBeNull();
  });
});

describe("warnings and forms are never hidden, moved or promoted", () => {
  it("does not collapse a sidebar that holds a form, a confirmation or an alert", () => {
    for (const inner of [
      `<form action="/transfer"><button>Confirm transfer</button></form>`,
      `<div role="alert">Your account may be at risk</div>`,
      `<dialog open>Security warning</dialog>`,
      `<input type="file">`,
    ]) {
      const { engine } = run(
        "western",
        "article",
        `<main><aside id="side">side ${inner}</aside></main>`,
        { sidebar: "#side" },
        ["sidebar"],
      );
      expect(document.querySelector("[data-xsuit-collapsed]"), inner).toBeNull();
      engine.restore();
    }
  });
  it("still collapses an ordinary sidebar, and a plain search form is fine", () => {
    run(
      "western",
      "article",
      `<main><aside id="side">related <form role="search"><input type="search"></form></aside></main>`,
      { sidebar: "#side" },
      ["sidebar"],
    );
    expect(document.querySelector("[data-xsuit-collapsed]")).not.toBeNull();
  });
  it("does not reorder blocks in a container that holds a warning", () => {
    const html = `<main><div role="alert">Do not share your password</div><section id="hero">h</section><section id="rec">r</section></main>`;
    const { engine, before } = run(
      "china",
      "home",
      html,
      { hero: "#hero", recommendations: "#rec" },
      ["hero", "recommendations"],
    );
    expect(document.documentElement.outerHTML.replace(/ data-xsuit[^ >]*/g, "")).toBe(
      before.replace(/ data-xsuit[^ >]*/g, ""),
    );
    engine.restore();
  });
});

describe("pages that ask for a password or payment get no structural change or emphasis", () => {
  for (const [name, form] of [
    ["password", `<form action="/session"><input type="password" name="p"></form>`],
    ["card number", `<form><input name="cardnumber" autocomplete="cc-number"></form>`],
    ["checkout form", `<form action="/checkout/step2"><input name="a"></form>`],
  ] as const)
    it(name, () => {
      const body = `<header id="h"><a href="/a">News</a><a href="/b">Video</a><a href="/c">Shop</a></header>${HERO}<aside id="side">s</aside><div id="promo">p</div>${form}`;
      for (const profile of ["china", "western"] as const) {
        const { engine } = run(
          profile,
          "home",
          body,
          { ...HOME, sidebar: "#side", "promo-banner": "#promo" },
          ["primary-nav", "hero", "sidebar", "promo-banner"],
        );
        expect(
          document.querySelector(
            "[data-xsuit-shortcuts],[data-xsuit-collapsed],[data-xsuit-group]",
          ),
        ).toBeNull();
        expect(document.querySelector("[data-xsuit-emph],[data-xsuit-deemph]")).toBeNull();
        expect(engine.status.plan!.skipped.map((s) => s.reason).join(" ")).toContain(
          "password or payment",
        );
        engine.restore();
      }
    });
});

describe("adapters cannot be used to aim at things people click", () => {
  const base = JSON.parse(JSON.stringify(adapters[0])) as Adapter;
  const withSel = (component: Component, selector: string): Adapter => ({
    ...base,
    components: [{ component, selectors: [selector], confidence: "medium" }],
  });
  it("rejects selectors on links, buttons, inputs, frames and action attributes", () => {
    for (const s of [
      "a[href*='pay']",
      "a.buy",
      "div > a",
      "button.confirm",
      "form[action*='login']",
      "input[type='submit']",
      "iframe",
      "[onclick]",
      "div[href]",
      "[download]",
      "select",
      "label",
    ])
      expect(validateAdapter(withSel("sidebar", s)).ok, s).toBe(false);
  });
  it("accepts ordinary block selectors", () => {
    for (const s of [
      "#rhs",
      ".sidebar",
      "aside.related",
      "[data-component-type='s-search-result']",
      "div.a-section",
    ])
      expect(validateAdapter(withSel("sidebar", s)).ok, s).toBe(true);
  });
  it("lets only the search box use a form or input, and never a link or button", () => {
    expect(validateAdapter(withSel("search-box", "form[role='search']")).ok).toBe(true);
    expect(validateAdapter(withSel("search-box", "form[action='/s']")).ok).toBe(true);
    expect(validateAdapter(withSel("search-box", "input[type='search']")).ok).toBe(true);
    expect(validateAdapter(withSel("search-box", "a[href]")).ok).toBe(false);
    expect(validateAdapter(withSel("search-box", "button")).ok).toBe(false);
    expect(validateAdapter(withSel("search-box", "form[onsubmit]")).ok).toBe(false);
  });
  it("applies only to the listed host, never to its subdomains (user content lives there)", () => {
    expect(findAdapter("www.google.com")).not.toBeNull();
    for (const h of [
      "sites.google.com",
      "evil.google.com",
      "google.com.evil.test",
      "notgoogle.com",
    ])
      expect(findAdapter(h), h).toBeNull();
  });
  it("a selector aimed at the wrong thing is ignored, not given a role", () => {
    document.documentElement.innerHTML = `<head></head><body><div id="x">${"words ".repeat(60)}</div><div id="y">Pay now</div><p>${"text ".repeat(100)}</p></body>`;
    const ad = (component: Component, selector: string): Adapter => ({
      ...withSel(component, selector),
      status: "tested",
      verification: { checkedOn: "2026-11-10", browser: "t", pageTypes: ["home"], sheet: "x.json" },
    });
    for (const [component, selector] of [
      ["search-box", "#y"],
      ["primary-nav", "#y"],
      ["video-player", "#y"],
      ["sidebar", "body"],
      ["article-body", "#y"],
    ] as const) {
      const a = analyzePage(document, ad(component, selector), "/");
      expect(
        a.adapterHits.find((h) => h.component === component)?.result,
        `${component} ${selector}`,
      ).toBe("implausible");
      expect(a.resolver(component).includes(document.getElementById("y")!), component).toBe(false);
    }
  });
});

describe("the xsuit label cannot be silenced by the page", () => {
  const summary = { count: 1, line: "x", reasons: [], undone: [] };
  it("page CSS cannot hide it; removing it is detected so the page can be restored", () => {
    document.documentElement.innerHTML = "<head></head><body><p>x</p></body>";
    const o = new Overlay(document, { onUndo: () => {} });
    o.show(summary, "bottom-left");
    expect(o.intact()).toBe(true);
    const style = document.createElement("style");
    style.textContent =
      "[data-xsuit-ui]{display:none !important;visibility:hidden !important;opacity:0 !important}";
    document.head.append(style);
    expect(o.intact()).toBe(true); // inline !important wins over page CSS
    document.querySelector("[data-xsuit-ui]")!.remove();
    expect(o.intact()).toBe(false); // the page removed it: caller undoes everything
  });
  it("an overlay that is not expected is never reported as broken", () => {
    const o = new Overlay(document, { onUndo: () => {} });
    expect(o.intact()).toBe(true);
  });
});

describe("what xsuit is able to add to a page is tiny and fixed", () => {
  const dir = "tests/corpus";
  const pages: { file: string; path: string }[] = load(join(dir, "manifest.json"));
  const ALLOWED_TAGS = new Set(["style", "button", "div", "nav", "a", "span"]);
  const ALLOWED_ATTRS = new Set([
    "id",
    "href",
    "rel",
    "title",
    "type",
    "aria-label",
    "aria-expanded",
  ]);
  it("adds only a few inert elements and only data-xsuit attributes on page elements", () => {
    for (const p of pages)
      for (const profile of ["china", "western"] as const) {
        document.documentElement.innerHTML = readFileSync(join(dir, p.file), "utf8");
        const existing = new Map<Element, string>();
        for (const el of document.querySelectorAll("*"))
          existing.set(el, JSON.stringify([...el.attributes].map((a) => [a.name, a.value])));
        const a = analyzePage(document, null, "/");
        const engine = new Engine({ doc: document, resolve: (c) => a.resolver(c) });
        engine.start({
          ruleSets,
          profiles,
          profile,
          depth: "structural",
          context: { ...a.context, viewportWidth: 1280 },
        });
        for (const el of document.querySelectorAll("*")) {
          const was = existing.get(el);
          if (was === undefined) {
            expect(ALLOWED_TAGS.has(el.localName), `${p.file}: <${el.localName}>`).toBe(true);
            for (const at of el.attributes)
              expect(
                ALLOWED_ATTRS.has(at.name) ||
                  at.name.startsWith("data-xsuit-") ||
                  at.name === "data-xsuit",
                `${p.file}: new ${at.name}`,
              ).toBe(true);
            if (el.localName === "a")
              expect(el.closest("[data-xsuit-shortcuts]"), p.file).not.toBeNull();
          } else if (was !== JSON.stringify([...el.attributes].map((x) => [x.name, x.value]))) {
            const old = new Map<string, string>(JSON.parse(was));
            for (const at of el.attributes)
              if (old.get(at.name) !== at.value)
                expect(
                  at.name.startsWith("data-xsuit"),
                  `${p.file}: changed ${at.name} on <${el.localName}>`,
                ).toBe(true);
            for (const k of old.keys())
              expect(el.hasAttribute(k), `${p.file}: removed ${k}`).toBe(true);
          }
        }
        engine.restore();
      }
  });
});
