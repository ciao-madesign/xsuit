// Developer-only page messages (measurement, comparison report, compatibility check).
// Not part of the release build: content/index.ts reaches this file only behind `__DEV__`,
// so the release bundle contains none of it (tested in tests/p1-release.test.ts).

import type { Adapter } from "../rules/types";
import type { Analysis } from "../analyzer";
import { compatibility } from "../analyzer/compatibility";
import type { Engine } from "../engine/engine";
import { measurePage } from "../metrics/metrics";
import { buildReport } from "../report/report";
import { buildScorecard, type Baselines } from "../report/scorecard";
import dimensionData from "../../rules/dimensions.json";
import baselineData from "../../rules/baselines.json";
import profiles from "../../rules/profiles.json";
import type { Dimension } from "../rules/configuration";
import type { Profile, Rule } from "../rules/types";
import type { InspectReply, MeasureReply, Message, ReportReply } from "../shared/messages";
import type { Settings } from "../shared/settings";
import type { Overlay } from "../ui/overlay";

export const DEV_MESSAGE_TYPES = ["xsuit/measure", "xsuit/inspect", "xsuit/report"] as const;

export interface DevDeps {
  engine: Engine;
  overlay: Overlay;
  adapter: Adapter | null;
  allRules: Rule[];
  current: () => Settings | null;
  sync: (s: Settings) => void;
  analysis: () => Analysis;
}

/** Handles a developer message. Returns true when it answered. */
export function handleDevMessage(
  msg: Message,
  d: DevDeps,
  sendResponse: (r: unknown) => void,
): boolean {
  const { engine, overlay } = d;
  switch (msg.type) {
    case "xsuit/measure": {
      // Measure the ORIGINAL page: undo our changes first, then put them back.
      const wasActive = engine.status.active;
      engine.restore();
      overlay.hide();
      const measurement = measurePage(document);
      const cur = d.current();
      if (wasActive && cur) d.sync(cur);
      sendResponse({ ok: true, measurement } satisfies MeasureReply);
      return true;
    }
    case "xsuit/report": {
      // "After" is measured with the changes in place, "before" on the restored original page.
      const wasActive = engine.status.active;
      const st = engine.status;
      const after = wasActive ? measurePage(document) : null;
      const { changes, reverted } = st;
      const skipped = st.plan?.skipped ?? [];
      engine.restore();
      overlay.hide();
      const before = measurePage(document);
      const cur = d.current();
      if (wasActive && cur) d.sync(cur);
      sendResponse({
        ok: true,
        report: buildReport({
          profile: cur?.profile ?? "original",
          depth: cur?.depth ?? "visual",
          pageType: d.analysis().context.pageType,
          before,
          after,
          changes,
          reverted,
          skipped,
          allRules: d.allRules,
          confidences: d.analysis().context.components,
          scorecard: buildScorecard(
            before.metrics as unknown as Record<string, unknown>,
            after ? (after.metrics as unknown as Record<string, unknown>) : null,
            (dimensionData as { dimensions: Dimension[] }).dimensions,
            (baselineData as { metrics: Baselines }).metrics,
            profiles as unknown as Profile[],
          ),
        }),
      } satisfies ReportReply);
      return true;
    }
    case "xsuit/inspect": {
      const a = d.analysis();
      sendResponse({
        ok: true,
        pageType: a.context.pageType,
        classificationNote: a.classification.note,
        recognized: a.recognized,
        skipped: engine.status.plan?.skipped ?? [],
        reverted: engine.status.reverted,
        compatibility: compatibility(a, d.adapter),
        adapterHits: a.adapterHits,
      } satisfies InspectReply);
      return true;
    }
  }
  return false;
}
