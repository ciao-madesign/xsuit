import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { evaluateDocument, renderReport, summarize, type CorpusPage } from "./corpus";

const dir = "tests/corpus";
const pages: CorpusPage[] = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const results = pages.map((p) => {
  const dom = new JSDOM(readFileSync(join(dir, p.file), "utf8"));
  return evaluateDocument(dom.window.document, p);
});
const summary = summarize(results);
writeFileSync("docs/16-generality-report.md", renderReport(results, summary));
console.log(`corpus pages: ${summary.pages}`);
console.log(`precision ${summary.overall.precision}, recall ${summary.overall.recall}`);
console.log(
  `page type precision ${summary.pageType.precision}, coverage ${summary.pageType.coverage}`,
);
console.log("report written to docs/16-generality-report.md");
