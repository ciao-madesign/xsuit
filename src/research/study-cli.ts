import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeStudy, assignOrders, validateStudy, type Study } from "./study";

const args = process.argv.slice(2);
const at = args.indexOf("--assign");
if (at >= 0) {
  const n = Number(args[at + 1]);
  const seed = Number(args[at + 2] ?? 1);
  if (!Number.isInteger(n) || n < 2) {
    console.error("usage: npm run study -- --assign <participants (2 or more)> [seed]");
    process.exit(2);
  }
  assignOrders(n, seed).forEach((o, i) =>
    console.log(
      `P${String(i + 1).padStart(2, "0")}  ${o === "AB" ? "A (original) first" : "B (adapted) first"}`,
    ),
  );
} else {
  const dir = "research/studies";
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "template.json")
    : [];
  let bad = 0;
  for (const f of files) {
    const study = JSON.parse(readFileSync(join(dir, f), "utf8")) as Study;
    const problems = validateStudy(study);
    if (problems.length) {
      bad++;
      console.log(`PROBLEM ${f}: ${problems.join("; ")}`);
      continue;
    }
    const a = analyzeStudy(study);
    console.log(`ok      ${f}: ${a.participants} participants, verdict ${a.verdict.toUpperCase()}`);
    for (const c of a.checks)
      console.log(`          ${c.ok ? "met    " : "NOT MET"} ${c.name}: ${c.detail}`);
    console.log(`          ${a.note}`);
  }
  if (!files.length) console.log("no study files yet (template: research/studies/template.json)");
  process.exitCode = bad ? 1 : 0;
}
