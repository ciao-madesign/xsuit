import { build, context } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { manifestFor, outDir, TARGETS } from "./targets.mjs";

const watch = process.argv.includes("--watch");
const arg = process.argv.find((a) => a.startsWith("--target="));
const target = arg ? arg.slice(9) : "chrome";
if (!TARGETS.includes(target)) throw new Error(`unknown target "${target}"`);
const out = outDir(target);
const opts = {
  entryPoints: {
    background: "src/background/index.ts",
    content: "src/content/index.ts",
    popup: "src/popup/index.ts",
    options: "src/options/index.ts",
    report: "src/report/index.ts",
  },
  outdir: out,
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: true,
  logLevel: "info",
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("public", out, { recursive: true });
const base = JSON.parse(readFileSync("public/manifest.json", "utf8"));
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifestFor(target, base), null, 2) + "\n");

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
} else {
  await build(opts);
}
