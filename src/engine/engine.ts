import { A11yGuard } from "./a11y";
import { applyPlan, type AppliedState } from "./apply";
import { Journal } from "./journal";
import { buildPlan, type PlanInput } from "./plan";
import type { ApplyReport, EffectCatalog, PageContext, Plan, Resolver } from "./types";

export interface EngineOptions {
  doc: Document;
  resolve: Resolver;
  effects?: EffectCatalog;
  /** Fresh view of the page on every run (components can appear later). */
  getContext?: () => PageContext;
  /** Called after every run, with the observer paused (safe place to update on-page UI). */
  onRun?: (status: EngineStatus) => void;
  /** Turn the accessibility guard off (tests only). Default: on. */
  a11yGuard?: boolean;
  /** Wait before re-applying after the page changes. */
  debounceMs?: number;
  /** Loop guard: more than maxRuns re-applications within windowMs stops the engine. */
  maxRuns?: number;
  windowMs?: number;
  now?: () => number;
}

export interface EngineStatus {
  active: boolean;
  guardTripped: boolean;
  runs: number;
  plan: Plan | null;
  report: ApplyReport | null;
  /** Everything applied so far on this page (cumulative across runs), reverted rules removed. */
  changes: { ruleId: string; elements: number }[];
  /** Rules the accessibility guard undid on this page, with reasons. */
  reverted: { ruleId: string; reason: string }[];
}

export class Engine {
  private journal = new Journal();
  private state: AppliedState = new WeakMap();
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private input: PlanInput | null = null;
  private recent: number[] = [];
  private blocked: Record<string, string> = {};
  private totals = new Map<string, number>();
  private s: EngineStatus = {
    active: false,
    guardTripped: false,
    runs: 0,
    plan: null,
    report: null,
    changes: [],
    reverted: [],
  };
  private readonly o: Required<
    Omit<EngineOptions, "doc" | "resolve" | "effects" | "getContext" | "onRun" | "a11yGuard">
  > &
    EngineOptions;

  constructor(options: EngineOptions) {
    this.o = { debounceMs: 100, maxRuns: 20, windowMs: 2000, now: () => Date.now(), ...options };
  }

  get status(): EngineStatus {
    return { ...this.s };
  }

  /** Applies the profile and keeps it applied as the page changes (SPAs, infinite scroll). */
  start(input: PlanInput): void {
    this.input = input;
    this.s.guardTripped = false;
    this.recent = [];
    this.blocked = {};
    this.totals = new Map();
    this.run();
    this.observe();
    this.s.active = true;
  }

  /** Puts the page back exactly as it was and stops watching. */
  restore(): void {
    this.stopObserving();
    this.journal.rollback();
    this.state = new WeakMap();
    this.input = null;
    this.blocked = {};
    this.totals = new Map();
    this.s = {
      active: false,
      guardTripped: false,
      runs: 0,
      plan: null,
      report: null,
      changes: [],
      reverted: [],
    };
  }

  /** Runs `fn` without the observer seeing our own page changes (on-page UI, style updates). */
  quietly(fn: () => void): void {
    const watching = this.observer !== null;
    this.observer?.disconnect();
    try {
      fn();
    } finally {
      if (watching) this.connect();
    }
  }

  private run(): void {
    if (!this.input) return;
    if (this.o.getContext) this.input = { ...this.input, context: this.o.getContext() };
    const input = { ...this.input, blockedRules: this.blocked };
    const plan = buildPlan(input);
    const guard = this.o.a11yGuard === false ? null : new A11yGuard(this.o.doc);
    const report = applyPlan(
      this.o.doc,
      plan,
      this.o.resolve,
      this.o.effects ?? {},
      this.journal,
      this.state,
      this.input.profile,
      guard,
    );
    for (const r of report.guard.reverted) {
      this.blocked[r.ruleId] = r.reason;
      this.totals.delete(r.ruleId);
    }
    for (const a of report.applied)
      this.totals.set(a.ruleId, (this.totals.get(a.ruleId) ?? 0) + a.elements);
    this.s.plan = {
      entries: plan.entries.filter((e) => !(e.rule.id in this.blocked)),
      skipped: [
        ...plan.skipped,
        ...Object.entries(this.blocked).map(([ruleId, reason]) => ({ ruleId, reason })),
      ],
    };
    this.s.report = report;
    this.s.runs++;
    this.s.changes = [...this.totals].map(([ruleId, elements]) => ({ ruleId, elements }));
    this.s.reverted = Object.entries(this.blocked).map(([ruleId, reason]) => ({ ruleId, reason }));
    this.o.onRun?.({ ...this.s });
  }

  private observe(): void {
    const win = this.o.doc.defaultView;
    if (!win || this.observer) return;
    this.observer = new win.MutationObserver(() => this.schedule());
    this.connect();
  }

  // Only child additions/removals are watched. The engine itself only sets attributes and adds one
  // style element, and that happens while the observer is disconnected, so it cannot trigger itself.
  private connect(): void {
    this.observer?.observe(this.o.doc.documentElement, { childList: true, subtree: true });
  }

  private stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const t = this.o.now();
      this.recent = this.recent.filter((x) => t - x < this.o.windowMs);
      if (this.recent.length >= this.o.maxRuns) {
        // Something keeps changing the page faster than is reasonable: stop instead of looping.
        this.stopObserving();
        this.s.guardTripped = true;
        return;
      }
      this.recent.push(t);
      this.observer?.disconnect();
      this.run();
      this.connect();
    }, this.o.debounceMs);
  }
}
