import type { Measurement } from "../metrics/metrics";

export type Message =
  | { type: "xsuit/ping" }
  | { type: "xsuit/restore" }
  | { type: "xsuit/apply-once" }
  | { type: "xsuit/measure" };

export interface PingReply {
  ok: true;
  applied: boolean;
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
}
export interface MeasureReply {
  ok: true;
  measurement: Measurement;
}
