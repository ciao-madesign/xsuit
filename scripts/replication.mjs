import { Buffer } from "node:buffer";
// Cross-platform runner for the replication check (no shell syntax, works on Windows).
import { build } from "esbuild";

const out = await build({
  entryPoints: ["src/research/replication-cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "error",
});
const code = out.outputFiles[0].text;
await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
