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

  const results = [];
  for (const name of Object.keys(pages)) {
    for (const profile of ["western", "china", "hybrid"]) {
      for (const depth of ["visual", "structural"]) {
        const page = await ctx.newPage();
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
        const r = await sw.evaluate(
          async ({ profile, depth, port }) => {
            await chrome.storage.local.set({
              settings: { enabled: true, profile, depth, enabledSites: [] },
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
          { profile, depth, port },
        );
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
  const bad = results.filter((x) => !x.restoredIdentical || x.errors || x.externalRequests);
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
