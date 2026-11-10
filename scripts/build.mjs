import { build, context } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { manifestFor, outDir, TARGETS } from "./targets.mjs";

const watch = process.argv.includes("--watch");
const arg = process.argv.find((a) => a.startsWith("--target="));
const target = arg ? arg.slice(9) : "chrome";
if (!TARGETS.includes(target)) throw new Error(`unknown target "${target}"`);
const dev = process.argv.includes("--dev");
const out = outDir(target, dev);
const opts = {
  entryPoints: {
    background: "src/background/index.ts",
    content: "src/content/index.ts",
    popup: "src/popup/index.ts",
    options: "src/options/index.ts",
    // The comparison report page is a developer tool: only in the developer build.
    ...(dev ? { report: "src/report/index.ts" } : {}),
  },
  outdir: out,
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: true,
  // `__DEV__` is false in the release build, so every `if (__DEV__)` block and what only it uses
  // is removed from the bundle.
  define: { __DEV__: dev ? "true" : "false" },
  logLevel: "info",
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("public", out, { recursive: true });
if (!dev) {
  // Release: no report page, and no developer section in any page.
  rmSync(`${out}/report.html`, { force: true });
  for (const f of ["popup.html", "options.html"]) {
    const p = `${out}/${f}`;
    const html = readFileSync(p, "utf8").replace(
      /[ \t]*<!-- dev:start -->[\s\S]*?<!-- dev:end -->\n?/g,
      "",
    );
    writeFileSync(p, html);
  }
}
const base = JSON.parse(readFileSync("public/manifest.json", "utf8"));
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifestFor(target, base), null, 2) + "\n");

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
} else {
  await build(opts);
}
