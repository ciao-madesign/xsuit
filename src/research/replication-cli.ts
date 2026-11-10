import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkMeasurementFile } from "./privacy";
import { replicationCheck, type MetricFile } from "./replication";

const dir = "research/measurements";
const files: MetricFile[] = [];
let rejected = 0;
for (const site of readdirSync(dir)) {
  const d = join(dir, site);
  if (!statSync(d).isDirectory()) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json"))) {
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(join(d, f), "utf8"));
    } catch {
      console.warn(`REJECTED ${site}/${f}: not valid JSON`);
      rejected++;
      continue;
    }
    const check = checkMeasurementFile(json);
    if (!check.ok || !check.cleaned) {
      console.warn(`REJECTED ${site}/${f}: ${check.problems.join("; ")}`);
      rejected++;
      continue;
    }
    const c = check.cleaned as {
      page: { pageType: string };
      metrics: Record<string, number | null>;
    };
    files.push({ site, pageType: c.page.pageType, metrics: c.metrics });
  }
}
console.log(`measurement files read: ${files.length}, rejected: ${rejected}`);
for (const r of replicationCheck(files))
  console.log(
    `${r.metric}: West n=${r.west.n} median=${r.west.median} | China n=${r.china.n} median=${r.china.median} -> ${r.verdict}${r.reason ? ` (${r.reason})` : ""}  (study: ${r.study}; rules: ${r.rules.join(", ")})`,
  );
