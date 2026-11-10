import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateObservation } from "./observation";
import { scanForPersonalData } from "./personal";
import { checkMeasurementFile } from "./privacy";

const files = (d: string): string[] =>
  !existsSync(d)
    ? []
    : readdirSync(d).flatMap((f) =>
        statSync(join(d, f)).isDirectory()
          ? files(join(d, f))
          : f.endsWith(".json")
            ? [join(d, f)]
            : [],
      );

let bad = 0;
const report = (f: string, problems: string[]) => {
  if (problems.length) bad++;
  console.log(
    `${problems.length ? "PROBLEM" : "ok     "} ${f}${problems.length ? `: ${problems.join("; ")}` : ""}`,
  );
};
const read = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
for (const f of files("research/measurements")) report(f, checkMeasurementFile(read(f)).problems);
for (const f of files("research/observations").filter((x) => !x.endsWith("template.json")))
  report(f, validateObservation(read(f)));
for (const f of files("research/adapter-verification").filter((x) => !x.endsWith("template.json")))
  report(f, scanForPersonalData(readFileSync(f, "utf8")));
console.log(
  bad
    ? `${bad} file(s) must be fixed before they are shared`
    : "all research files pass the privacy checks",
);
process.exitCode = bad ? 1 : 0;
