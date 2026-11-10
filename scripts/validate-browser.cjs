// Internal validation in real Chromium (needs Playwright + Chromium; run after `npm run build`).
// Usage: node scripts/validate-browser.cjs   -> writes research/validation/results.json
// For every fixture x profile x depth: apply, restore, compare the HTML; record time, errors,
// external requests and rules undone by the accessibility guard.
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const FIX = path.join(__dirname, "..", "tests", "fixtures");
const norm = (h) => h.replace(/ style=""/g, ""); // Chromium itself adds empty style attributes

function bigPage(n) {
  let b =
    "<header><nav><a href='/a'>A</a><a href='/b'>B</a><a href='/c'>C</a></nav></header><main><article><h1>Big</h1>";
  for (let i = 0; i < n; i++)
    b += `<p>paragraph ${i} <a href="/x${i}">link ${i}</a> <img alt="" width="40" height="40"></p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>big</title></head><body>${b}</article><aside><a href="/s">side</a></aside></main><footer><a href="/1">1</a><a href="/2">2</a><a href="/3">3</a></footer></body></html>`;
}

(async () => {
  const pages = {};
  for (const f of fs.readdirSync(FIX)) pages[f] = fs.readFileSync(path.join(FIX, f), "utf8");
  pages["big-5000.html"] = bigPage(5000);
  const server = http.createServer((q, r) => {
    const name = decodeURIComponent(q.url.slice(1));
    if (pages[name]) {
      r.setHeader("content-type", "text/html");
      r.end(pages[name]);
    } else {
      r.statusCode = 404;
      r.end();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port;

  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "xsuit-val-"));
  fs.cpSync(path.join(__dirname, "..", "dist"), dist, { recursive: true });
  const mf = JSON.parse(fs.readFileSync(path.join(dist, "manifest.json"), "utf8"));
  mf.host_permissions = ["http://127.0.0.1/*"]; // test build only
  fs.writeFileSync(path.join(dist, "manifest.json"), JSON.stringify(mf));
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "xsuit-prof-"));
  const ctx = await chromium.launchPersistentContext(prof, {
    headless: false,
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      "--headless=new",
      "--no-sandbox",
    ],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker");

  // The popup page itself loads in the real browser without errors, first run and normal use (P2).
  const extId = new URL(sw.url()).host;
  const popupProblems = [];
  for (const first of [true, false]) {
    await sw.evaluate(async (first) => {
      await chrome.storage.local.set({
        settings: first ? {} : { enabled: true, profile: "western", onboarded: true },
      });
    }, first);
    const pp = await ctx.newPage();
    const errs = [];
    pp.on("pageerror", (e) => errs.push(e.message));
    await pp.goto(`chrome-extension://${extId}/popup.html`);
    await pp.waitForTimeout(300);
    const shown = await pp.evaluate(() => ({
      onboarding: !document.getElementById("onboarding").hidden,
      // Opened as a page, the "current tab" is the popup itself (not adaptable), so the normal view
      // shows either the switch or the plain-words explanation, never the first-run screen.
      toggle:
        !document.getElementById("onboarding").hidden === false &&
        (!document.getElementById("home").hidden || !document.getElementById("unsupported").hidden),
    }));
    if (errs.length) popupProblems.push(`popup errors: ${errs.join("; ")}`);
    if (first && !shown.onboarding) popupProblems.push("first run did not show the market choice");
    if (!first && !shown.toggle)
      popupProblems.push("normal view showed neither the switch nor an explanation");
    await pp.close();
  }
  // The localization brief page (P5) renders a stored brief in the real browser without errors.
  await sw.evaluate(async () => {
    await chrome.storage.session.set({
      brief: {
        schema: "xsuit.brief/1",
        createdOn: "2026-11-10",
        host: "example.com",
        market: "china",
        strength: "standard",
        depth: "visual",
        pageType: "home",
        unverifiable: 0,
        notApplied: [],
        changes: [
          {
            ruleId: "visual.china.compact-density",
            title: "Compact density",
            dimension: "density",
            pole: "compact",
            evidenceLevel: "moderate",
            sources: ["li2026"],
            limit: "Sample is institutional.",
            elements: 3,
            confidence: "high",
            version: "1.0.0",
            structural: false,
            css: [{ on: null, declaration: "line-height: 1.4" }],
          },
        ],
      },
    });
  });
  {
    const bp = await ctx.newPage();
    const errs = [];
    bp.on("pageerror", (e) => errs.push(e.message));
    await bp.goto(`chrome-extension://${extId}/brief.html`);
    await bp.waitForTimeout(300);
    const txt = await bp.evaluate(() => document.body.textContent);
    if (errs.length) popupProblems.push(`brief page errors: ${errs.join("; ")}`);
    if (!txt.includes("example.com") || !txt.includes("line-height: 1.4"))
      popupProblems.push("brief page did not show the brief");
    await bp.close();
  }
  console.log(
    popupProblems.length
      ? `POPUP PROBLEMS: ${popupProblems.join(" | ")}`
      : "popup page: ok (first run and normal view)",
  );
  if (popupProblems.length) process.exitCode = 1;

  const results = [];
  // Desktop width for every page; phone width (B20) for the pages where text and layout are most at risk.
  // Strength (P3): the strong level is also run on every page, structural, for both markets.
  const PHONE = [
    "rtl-arabic.html",
    "cjk-zh.html",
    "cjk-ja.html",
    "long-words-de.html",
    "dense.html",
    "div-soup.html",
  ];
  const runs = Object.keys(pages).flatMap((n) => [
    { name: n, width: 1280 },
    ...(PHONE.includes(n) ? [{ name: n, width: 390 }] : []),
  ]);
  const withStrength = runs.flatMap((r) => [
    { ...r, intensity: "standard" },
    ...(r.width === 1280 ? [{ ...r, intensity: "strong" }] : []),
  ]);
  for (const { name, width, intensity } of withStrength) {
    for (const profile of ["western", "china", "hybrid"]) {
      for (const depth of ["visual", "structural"]) {
        const page = await ctx.newPage();
        await page.setViewportSize({ width, height: width < 600 ? 800 : 720 });
        const errors = [],
          external = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on(
          "console",
          (m) =>
            m.type() === "error" &&
            !m.text().startsWith("Failed to load resource") &&
            errors.push(m.text()),
        ); // fixtures reference images that do not exist
        page.on("request", (q) => {
          if (
            !q.url().startsWith(`http://127.0.0.1:${port}`) &&
            !q.url().startsWith("chrome-extension://") &&
            !q.url().startsWith("data:")
          )
            external.push(q.url());
        });
        await page.goto(`http://127.0.0.1:${port}/${name}`);
        await page.waitForTimeout(150);
        const before = norm(await page.evaluate(() => document.documentElement.outerHTML));
        // Sideways scroll and the smallest line-height / font-size ratio of paragraphs, before and after.
        const probe = () =>
          page.evaluate(() => {
            const de = document.documentElement;
            const ratios = [...document.querySelectorAll("article p, main p")]
              .map((p) => {
                const cs = getComputedStyle(p);
                const lh = parseFloat(cs.lineHeight);
                return Number.isFinite(lh) ? lh / parseFloat(cs.fontSize) : null;
              })
              .filter((x) => x !== null);
            return {
              overflow: de.scrollWidth > window.innerWidth + 1,
              lhRatio: ratios.length ? Math.min(...ratios) : null,
            };
          });
        const probeBefore = await probe();
        const r = await sw.evaluate(
          async ({ profile, depth, intensity, port }) => {
            await chrome.storage.local.set({
              settings: {
                enabled: true,
                onboarded: true,
                profile,
                depth,
                intensity,
                enabledSites: [],
              },
            });
            const [t] = await chrome.tabs.query({ url: `http://127.0.0.1:${port}/*` });
            await chrome.scripting.executeScript({
              target: { tabId: t.id },
              files: ["content.js"],
            });
            await new Promise((x) => setTimeout(x, 200));
            const t0 = Date.now();
            const a = await chrome.tabs.sendMessage(t.id, { type: "xsuit/apply-once" });
            const ms = Date.now() - t0;
            return { rules: a.rules, ms, reverted: a.reverted, pageType: a.pageType };
          },
          { profile, depth, intensity, port },
        );
        const probeAfter = await probe();
        const changed =
          norm(await page.evaluate(() => document.documentElement.outerHTML)) !== before;
        await sw.evaluate(async (port) => {
          const [t] = await chrome.tabs.query({ url: `http://127.0.0.1:${port}/*` });
          await chrome.tabs.sendMessage(t.id, { type: "xsuit/restore" });
        }, port);
        await page.waitForTimeout(150);
        const identical =
          norm(await page.evaluate(() => document.documentElement.outerHTML)) === before;
        results.push({
          page: name,
          width,
          intensity,
          overflowIntroduced: probeAfter.overflow && !probeBefore.overflow,
          lineHeightLoweredBelow15:
            name.startsWith("cjk-") &&
            probeAfter.lhRatio !== null &&
            probeAfter.lhRatio < 1.5 &&
            (probeBefore.lhRatio === null || probeAfter.lhRatio < probeBefore.lhRatio),
          profile,
          depth,
          rules: r.rules,
          ms: r.ms,
          pageType: r.pageType,
          changed,
          restoredIdentical: identical,
          undoneByGuard: r.reverted.length,
          errors: errors.length,
          externalRequests: external.length,
        });
        await page.close();
      }
    }
  }
  await ctx.close();
  server.close();
  const out = path.join(__dirname, "..", "research", "validation", "results.json");
  fs.writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString(), runs: results }, null, 2) + "\n",
  );
  const bad = results.filter(
    (x) =>
      !x.restoredIdentical ||
      x.errors ||
      x.externalRequests ||
      x.overflowIntroduced ||
      x.lineHeightLoweredBelow15,
  );
  console.log(`runs: ${results.length}, failures: ${bad.length}`);
  for (const b of bad) console.log("FAIL", JSON.stringify(b));
  console.log(
    "max ms:",
    Math.max(...results.map((x) => x.ms)),
    "| undone by guard:",
    results.reduce((a, x) => a + x.undoneByGuard, 0),
  );
})().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
