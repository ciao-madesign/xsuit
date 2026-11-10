// Cross-platform runner for the B13 corpus report (bundles the TypeScript, then runs it).
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

mkdirSync("node_modules/.cache/xsuit", { recursive: true });
const outfile = "node_modules/.cache/xsuit/corpus-cli.mjs";
await build({
  entryPoints: ["src/research/corpus-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["jsdom"],
  outfile,
  logLevel: "error",
});
await import(pathToFileURL(outfile).href);
