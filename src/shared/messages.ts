export type Message = { type: "xsuit/ping" } | { type: "xsuit/restore" };
export interface PingReply {
  ok: true;
  applied: boolean;
}
export interface RestoreReply {
  ok: true;
  restored: boolean;
  note: string;
}
