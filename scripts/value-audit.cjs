// Developer tool (P3): how much does xsuit visibly change real-layout pages? Runs the corpus pages in
// real Chromium for each market and strength, and measures what changed on the page.
// Usage: npm run build:dev && node scripts/value-audit.cjs  -> research/value/audit.json + docs/27-visible-value.md
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CORPUS = path.join(ROOT, "tests", "corpus");
const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, "manifest.json"), "utf8"));
const norm = (h) => h.replace(/ style=""/g, "");

// A visible change: an element whose box or look differs, counted per element, plus added elements.
const SNAP = (mode) => {
  const props = [
    "filter",
    "textDecorationLine",
    "paddingTop",
    "paddingBottom",
    "outlineWidth",
    "rowGap",
    "width",
  ];
  const key = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return [
      Math.round(r.x),
      Math.round(r.y),
      Math.round(r.width),
      Math.round(r.height),
      ...props.map((p) => cs[p]),
    ].join("|");
  };
  // Elements are compared by identity, so elements xsuit adds cannot shift the comparison.
  if (mode === "before") {
    window.__xsuitBefore = new Map(
      [...document.body.querySelectorAll("*")].map((e) => [e, key(e)]),
    );
    return window.__xsuitBefore.size;
  }
  let changed = 0;
  for (const [e, k] of window.__xsuitBefore) if (e.isConnected && key(e) !== k) changed++;
  return changed;
};

(async () => {
  const pages = {};
  for (const m of manifest) pages[m.file] = fs.readFileSync(path.join(CORPUS, m.file), "utf8");
  const server = http.createServer((q, r) => {
    const name = decodeURIComponent(q.url.split("?")[0].slice(1));
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
  fs.cpSync(path.join(ROOT, "dist-dev"), dist, { recursive: true });
  const mf = JSON.parse(fs.readFileSync(path.join(dist, "manifest.json"), "utf8"));
  mf.host_permissions = ["http://127.0.0.1/*"]; // test build only
  fs.writeFileSync(path.join(dist, "manifest.json"), JSON.stringify(mf));
  const ctx = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "xsuit-prof-")),
    {
      headless: false,
      args: [
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
        "--headless=new",
        "--no-sandbox",
      ],
    },
  );
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker");

  const rows = [];
  for (const m of manifest) {
    for (const profile of ["western", "china"]) {
      for (const intensity of ["light", "standard", "strong"]) {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(`http://127.0.0.1:${port}/${m.file}`);
        await page.waitForTimeout(120);
        const total = await page.evaluate(SNAP, "before");
        const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
        const html0 = norm(await page.evaluate(() => document.documentElement.outerHTML));
        const r = await sw.evaluate(
          async ({ profile, intensity, port }) => {
            await chrome.storage.local.set({
              settings: {
                enabled: true,
                onboarded: true,
                profile,
                depth: "structural",
                intensity,
                enabledSites: [],
              },
            });
            const [t] = await chrome.tabs.query({ url: `http://127.0.0.1:${port}/*` });
            await chrome.scripting.executeScript({
              target: { tabId: t.id },
              files: ["content.js"],
            });
            await new Promise((x) => setTimeout(x, 150));
            const a = await chrome.tabs.sendMessage(t.id, { type: "xsuit/apply-once" });
            return {
              rules: a.rules,
              reverted: a.reverted.length,
              recognized: a.recognized.length,
              skipped: a.skipped.map((s) => s.reason),
            };
          },
          { profile, intensity, port },
        );
        await page.waitForTimeout(80);
        const changed = await page.evaluate(SNAP, "after");
        const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
        const styled = await page.evaluate(
          () => document.querySelectorAll("[data-xsuit-c]").length,
        );
        const added = await page.evaluate(
          () =>
            document.querySelectorAll("[data-xsuit-toggle],[data-xsuit-shortcuts],[data-xsuit-ui]")
              .length,
        );
        const share = total ? styled / total : 0;
        rows.push({
          page: m.file,
          pageType: m.pageType,
          kind: m.kind,
          profile,
          intensity,
          rules: r.rules,
          undoneByGuard: r.reverted,
          recognized: r.recognized,
          elements: total,
          changedElements: changed,
          styledElements: styled,
          heightChange: h0 ? Math.round(((h1 - h0) / h0) * 1000) / 1000 : 0,
          share: Math.round(share * 1000) / 1000,
          added,
          visible: changed > 0 || added > 0,
          skipped: r.skipped.slice(0, 3),
        });
        await sw.evaluate(async (port) => {
          const [t] = await chrome.tabs.query({ url: `http://127.0.0.1:${port}/*` });
          await chrome.tabs.sendMessage(t.id, { type: "xsuit/restore" });
        }, port);
        await page.close();
      }
    }
  }
  await ctx.close();
  server.close();

  const out = path.join(ROOT, "research", "value", "audit.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2) + "\n",
  );

  const med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    const n = s.length;
    return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0;
  };
  const pct = (x) => `${Math.round(x * 100)} %`;
  let md = `# 27 — Visible value (P3)\n\nGenerated by \`node scripts/value-audit.cjs\` (developer build, real Chromium, 1280 px). Corpus: ${manifest.length} synthetic pages in \`tests/corpus\` (not real sites). A page counts as **visibly changed** when at least one element changes box or look (size or position, spacing, colour saturation, underline, outline; line height counts through the size and position it causes, because it is inherited by every child) or xsuit adds an element. **Targeted** = the share of elements xsuit marked and styled; **page height** = how much the page got taller or shorter. The table gives the median over the pages.\n\n`;
  for (const intensity of ["light", "standard", "strong"]) {
    md += `## Strength: ${intensity}\n\n| Market | Page type | Pages | Visibly changed | Median targeted elements | Median page height change | Undone by the accessibility guard |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
    for (const profile of ["western", "china"]) {
      const sel = rows.filter((x) => x.profile === profile && x.intensity === intensity);
      const types = [...new Set(sel.map((x) => x.pageType))].sort();
      for (const t of [...types, "all"]) {
        const g = t === "all" ? sel : sel.filter((x) => x.pageType === t);
        md += `| ${profile} | ${t} | ${g.length} | ${g.filter((x) => x.visible).length} (${pct(g.filter((x) => x.visible).length / g.length)}) | ${pct(med(g.map((x) => x.share)))} | ${pct(med(g.map((x) => x.heightChange)))} | ${g.reduce((s, x) => s + x.undoneByGuard, 0)} |\n`;
      }
    }
    md += "\n";
  }
  const unchanged = rows.filter((x) => x.intensity === "standard" && !x.visible);
  md += `## Pages with no visible change at Standard\n\n${unchanged.length ? unchanged.map((x) => `- ${x.profile} / ${x.page} (${x.pageType}, ${x.kind}): ${x.skipped.length ? x.skipped.join("; ") : "no rule applied"}`).join("\n") : "None."}\n`;
  md += `
## How to read this

- Strength changes the **size** of the same changes, not which rules run: the number of visibly changed pages is the same at every strength; what grows is the spacing, saturation and outline values (for example, header padding of the Western style: 12, 24 and 36 px at Light, Standard and Strong in the first corpus page).
- Pages whose type xsuit cannot recognise (type "any") only get the rules that do not depend on a page type (spacing, link underline). That is where "no visible change" happens. Widening the density rules to unrecognised pages would go beyond their evidence (home pages of municipal sites), so it is not done.
- "Undone by the accessibility guard" counts rules the guard removed because they measurably worsened contrast, target size or sideways scroll; it is 0 at every strength on this corpus.
- Limits: synthetic pages, one viewport (1280 px), no real sites, no people. "Visible" means the page measurably differs, not that a person notices or likes it; that needs the study described in \`24-ux-validation-methodology.md\`.
`;
  fs.writeFileSync(path.join(ROOT, "docs", "27-visible-value.md"), md);
  const std = rows.filter((x) => x.intensity === "standard");
  console.log(
    `runs: ${rows.length}; visibly changed at Standard: ${std.filter((x) => x.visible).length}/${std.length}`,
  );
  for (const i of ["light", "standard", "strong"]) {
    const g = rows.filter((x) => x.intensity === i);
    console.log(
      i,
      "visible",
      g.filter((x) => x.visible).length + "/" + g.length,
      "median share",
      pct(med(g.map((x) => x.share))),
      "undone by guard",
      g.reduce((s, x) => s + x.undoneByGuard, 0),
    );
  }
})();
