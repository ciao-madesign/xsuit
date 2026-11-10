import type { RecognizedComponent } from "../analyzer";
import type { Measurement } from "../metrics/metrics";

export type Message =
  | { type: "xsuit/ping" }
  | { type: "xsuit/restore" }
  | { type: "xsuit/apply-once" }
  | { type: "xsuit/measure" };

export interface PingReply {
  ok: true;
  applied: boolean;
  rules: number;
}
export interface RestoreReply {
  ok: true;
  restored: boolean;
  note: string;
}
export interface ApplyReply {
  ok: true;
  applied: boolean;
  rules: number;
  /** Rules left out and why (feeds the explain panel in B8). */
  skipped: { ruleId: string; reason: string }[];
  /** What was recognized on the page, from which source and why (explain panel). */
  recognized: RecognizedComponent[];
  pageType: string;
}
export interface MeasureReply {
  ok: true;
  measurement: Measurement;
}
