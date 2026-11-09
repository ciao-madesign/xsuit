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
}

export class Engine {
  private journal = new Journal();
  private state: AppliedState = new WeakMap();
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private input: PlanInput | null = null;
  private recent: number[] = [];
  private s: EngineStatus = {
    active: false,
    guardTripped: false,
    runs: 0,
    plan: null,
    report: null,
  };
  private readonly o: Required<Omit<EngineOptions, "doc" | "resolve" | "effects" | "getContext">> &
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
    this.s = { active: false, guardTripped: false, runs: 0, plan: null, report: null };
  }

  private run(): void {
    if (!this.input) return;
    if (this.o.getContext) this.input = { ...this.input, context: this.o.getContext() };
    const plan = buildPlan(this.input);
    this.s.plan = plan;
    this.s.report = applyPlan(
      this.o.doc,
      plan,
      this.o.resolve,
      this.o.effects ?? {},
      this.journal,
      this.state,
      this.input.profile,
    );
    this.s.runs++;
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
