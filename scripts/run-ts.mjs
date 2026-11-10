// Runs a TypeScript entry file in Node, cross-platform: node scripts/run-ts.mjs <entry> [--external pkg]
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

const [entry, ...rest] = process.argv.slice(2);
const external = rest.includes("--external") ? [rest[rest.indexOf("--external") + 1]] : [];
mkdirSync("node_modules/.cache/xsuit", { recursive: true });
const outfile = `node_modules/.cache/xsuit/${basename(entry, ".ts")}.mjs`;
await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  external,
  outfile,
  logLevel: "error",
});
await import(pathToFileURL(outfile).href);
