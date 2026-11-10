import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { replicationCheck, type MetricFile } from "./replication";

const dir = "research/measurements";
const files: MetricFile[] = [];
for (const site of readdirSync(dir)) {
  const d = join(dir, site);
  if (!statSync(d).isDirectory()) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(readFileSync(join(d, f), "utf8"));
    if (j?.schema === "xsuit.metrics/1") files.push({ site, metrics: j.metrics });
  }
}
console.log(`measurement files read: ${files.length}`);
for (const r of replicationCheck(files))
  console.log(
    `${r.metric}: West n=${r.west.n} median=${r.west.median} | China n=${r.china.n} median=${r.china.median} -> ${r.verdict}  (study: ${r.study}; rules: ${r.rules.join(", ")})`,
  );
