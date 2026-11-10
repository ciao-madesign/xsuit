// B18 safety net: the profiles Western, China and Hybrid must behave EXACTLY as before the move to
// dimensions. The golden file was recorded with the code of B17 (before the change). It holds, for
// many pages and settings, the plan (rules, order, skip reasons) and a hash of the adapted page.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzePage } from "../src/analyzer";
import { defaultEffects } from "../src/engine/effects";
import { Engine } from "../src/engine/engine";
import { buildPlan, needsMetrics } from "../src/engine/plan";
import { measurePage } from "../src/metrics/metrics";
import { PAGE_TYPES } from "../src/rules/vocab";
import type { Profile, RuleSet } from "../src/rules/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const ruleSets = [load("rules/western.json"), load("rules/china.json")] as RuleSet[];
const profiles = load("rules/profiles.json") as Profile[];
const pages: { file: string; path: string }[] = load("tests/corpus/manifest.json");
const GOLDEN = "tests/golden/b18-before.json";
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const CUSTOM_HYBRID = [
  "visual.western.muted-palette",
  "visual.china.compact-density",
  "structure.china.surface-shortcuts",
];
const CONFIGS = [
  { name: "western/visual", profile: "western", depth: "visual", ids: null },
  { name: "western/structural", profile: "western", depth: "structural", ids: null },
  { name: "china/visual", profile: "china", depth: "visual", ids: null },
  { name: "china/structural", profile: "china", depth: "structural", ids: null },
  { name: "hybrid-default/structural", profile: "hybrid", depth: "structural", ids: null },
  { name: "hybrid-custom/structural", profile: "hybrid", depth: "structural", ids: CUSTOM_HYBRID },
] as const;

function record(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // 1. Real pages through the real engine.
  for (const p of pages)
    for (const c of CONFIGS) {
      document.documentElement.innerHTML = readFileSync(join("tests/corpus", p.file), "utf8");
      const [pathname = "/", search = ""] = p.path.split("?");
      let a = analyzePage(document, null, pathname, search ? `?${search}` : "");
      const input = {
        ruleSets,
        profiles,
        profile: c.profile,
        hybridRuleIds: c.ids as string[] | null,
      };
      const metrics = needsMetrics(input)
        ? (measurePage(document).metrics as unknown as Partial<Record<string, number | null>>)
        : undefined;
      const engine = new Engine({
        doc: document,
        resolve: (x) => a.resolver(x),
        effects: defaultEffects,
        getContext: () => {
          a = analyzePage(document, null, pathname, search ? `?${search}` : "");
          return { ...a.context, viewportWidth: 1280, metrics };
        },
      });
      engine.start({
        ...input,
        depth: c.depth,
        context: { ...a.context, viewportWidth: 1280, metrics },
        disabledRules: [],
      });
      const st = engine.status;
      out[`page|${p.file}|${c.name}`] = {
        plan: st.plan?.entries.map((e) => e.rule.id) ?? [],
        skipped: (st.plan?.skipped ?? []).map((s) => `${s.ruleId}: ${s.reason}`).sort(),
        changes: [...st.changes].sort((x, y) => x.ruleId.localeCompare(y.ruleId)),
        reverted: st.reverted,
        dom: sha(withoutB20Marks(document.documentElement.outerHTML)),
      };
      engine.restore();
    }
  // 2. Planner only: every page type x metric situation x confidence, for every profile.
  const allComponents = [
    "header",
    "primary-nav",
    "search-box",
    "hero",
    "carousel",
    "promo-banner",
    "product-card",
    "product-grid",
    "headline-list",
    "recommendations",
    "sidebar",
    "footer",
    "article-body",
    "feed-item",
    "video-player",
    "filters",
    "comments",
    "ads",
  ] as const;
  for (const pageType of PAGE_TYPES)
    for (const conf of ["low", "medium", "high"] as const)
      for (const m of [
        { mediaPer1000Px: 5, mainBlocks: 2, peripheralBlocks: 0 },
        { mediaPer1000Px: 40, mainBlocks: 7, peripheralBlocks: 2 },
        {},
      ])
        for (const c of CONFIGS) {
          const plan = buildPlan({
            ruleSets,
            profiles,
            profile: c.profile,
            depth: c.depth,
            hybridRuleIds: c.ids as string[] | null,
            context: {
              pageType,
              components: Object.fromEntries(allComponents.map((k) => [k, conf])),
              viewportWidth: 1280,
              metrics: m,
            },
            disabledRules: [],
          });
          out[`plan|${pageType}|${conf}|${JSON.stringify(m)}|${c.name}`] = {
            plan: plan.entries.map((e) => e.rule.id),
            skipped: plan.skipped.map((s) => `${s.ruleId}: ${s.reason}`).sort(),
          };
        }
  return out;
}

/**
 * B20 added lang and dir attributes to the few elements xsuit injects (the English toggle and
 * shortcut labels). The recording was made before that, so those attributes are removed before the
 * hash: everything else on the page must still be byte-identical. The attributes themselves are
 * checked in b20-language.test.ts.
 */
function withoutB20Marks(html: string): string {
  return html.replace(/<(button|nav|span|a)([^>]*data-xsuit-(?:toggle|shortcuts)[^>]*)>/g, (m) =>
    m.replace(/ (lang|dir)="[^"]*"/g, ""),
  );
}

describe("B18 golden: profiles behave exactly as before the move to dimensions", () => {
  it("matches the recording made with the B17 code", () => {
    const now = record();
    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(GOLDEN, JSON.stringify(now, null, 1) + "\n");
      return;
    }
    const before = load(GOLDEN) as Record<string, unknown>;
    expect(Object.keys(now).length).toBe(Object.keys(before).length);
    for (const [k, v] of Object.entries(now)) expect(v, k).toEqual(before[k]);
  });
});
