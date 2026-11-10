import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adapters } from "../adapters";
import { checkVerification } from "../rules/adapterVerification";
import { validateAdapter } from "../rules/validate";

let bad = 0;
console.log("adapter".padEnd(22), "status".padEnd(8), "checks");
for (const a of adapters) {
  const issues: string[] = [];
  const v = validateAdapter(a);
  if (!v.ok) issues.push(...v.errors.map((e) => `invalid: ${e.path} ${e.message}`));
  if (a.status === "tested") {
    const file = join("research/adapter-verification", `${a.id}.json`);
    if (!existsSync(file)) issues.push("no verification sheet");
    else issues.push(...checkVerification(a, JSON.parse(readFileSync(file, "utf8"))));
  }
  if (issues.length) bad++;
  console.log(
    a.id.padEnd(22),
    a.status.padEnd(8),
    issues.length
      ? `PROBLEMS: ${issues.join("; ")}`
      : a.status === "tested"
        ? "ok (verified)"
        : "ok (draft: not verified on the real site)",
  );
}
console.log(bad ? `${bad} adapter(s) with problems` : "all adapters consistent");
process.exitCode = bad ? 1 : 0;
