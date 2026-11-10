import { A11yGuard } from "./a11y";
import { resetShadowCache, shadowRootsUnder } from "../analyzer/deep";
import { applyPlan, forgetStyledRoots, type AppliedState } from "./apply";
import { Journal } from "./journal";
import { buildPlan, type PlanInput } from "./plan";
import type { ApplyReport, EffectCatalog, PageContext, Plan, Resolver } from "./types";

export interface EngineOptions {
  doc: Document;
  resolve: Resolver;
  /** The catalog, or a function giving the current one (the strength can change while the page is open). */
  effects?: EffectCatalog | (() => EffectCatalog);
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
  /** Performance budget: a run slower than this makes the engine wait longer before the next one. */
  budgetMs?: number;
  /** A single run slower than this means the page is too heavy: everything is undone. */
  abortMs?: number;
  /** Called when the engine gave up and restored the page (changes too often, or too heavy). */
  onStop?: (reason: string) => void;
}

export interface EngineStatus {
  active: boolean;
  guardTripped: boolean;
  /** Why the engine gave up on this page, when it did. */
  stopReason?: string;
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
  /** Open shadow roots watched in addition to the document. */
  private roots: ShadowRoot[] = [];
  /** Current wait before re-applying: grows when runs are slow, so xsuit never hogs the page. */
  private delay = 0;
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
    Omit<
      EngineOptions,
      "doc" | "resolve" | "effects" | "getContext" | "onRun" | "a11yGuard" | "onStop"
    >
  > &
    EngineOptions;

  constructor(options: EngineOptions) {
    this.o = {
      debounceMs: 100,
      maxRuns: 20,
      windowMs: 2000,
      budgetMs: 150,
      abortMs: 2000,
      now: () => Date.now(),
      ...options,
    };
  }

  get status(): EngineStatus {
    return { ...this.s };
  }

  /** Applies the profile and keeps it applied as the page changes (SPAs, infinite scroll). */
  start(input: PlanInput): void {
    this.input = input;
    this.s.guardTripped = false;
    this.s.stopReason = undefined;
    this.delay = 0;
    this.recent = [];
    this.blocked = {};
    this.totals = new Map();
    this.run();
    if (this.s.stopReason) return; // the first run was already too heavy: the page was restored
    this.observe();
    this.s.active = true;
  }

  /** Puts the page back exactly as it was and stops watching. */
  restore(): void {
    this.stopObserving();
    this.journal.rollback();
    forgetStyledRoots(this.o.doc);
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

  /**
   * The viewport changed (window resized, browser zoom, device rotated). The page is put back,
   * measured again at the new width, and the rules and the accessibility check run again: a rule
   * that is fine at 1280 px but makes the page scroll sideways at 640 px (200 % zoom) is undone.
   */
  reflow(): void {
    const input = this.input;
    if (!input || !this.s.active) return;
    this.restore();
    this.start(input);
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
    this.journal.prune(); // forget changes to nodes the page already removed
    resetShadowCache(this.o.doc);
    const t0 = this.o.now();
    if (this.o.getContext) this.input = { ...this.input, context: this.o.getContext() };
    const input = { ...this.input, blockedRules: this.blocked };
    const plan = buildPlan(input);
    const guard = this.o.a11yGuard === false ? null : new A11yGuard(this.o.doc);
    const report = applyPlan(
      this.o.doc,
      plan,
      this.o.resolve,
      typeof this.o.effects === "function" ? this.o.effects() : (this.o.effects ?? {}),
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
    // Performance budget: slow runs make the next one wait (about 17 % of the time at most);
    // an extremely slow one means this page is too heavy and xsuit steps aside.
    const took = this.o.now() - t0;
    this.delay = Math.min(2000, Math.max(this.o.debounceMs, took * 5));
    if (took > this.o.abortMs)
      this.giveUp("this page is too heavy for xsuit, so the original page was restored");
  }

  /** Puts the page back and records why, so the user is never left with a half-changed page. */
  private giveUp(reason: string): void {
    this.restore();
    this.s.guardTripped = true;
    this.s.stopReason = reason;
    this.o.onStop?.(reason);
  }

  private observe(): void {
    const win = this.o.doc.defaultView;
    if (!win || this.observer) return;
    this.observer = new win.MutationObserver((records) => {
      if (records.every(irrelevant)) return;
      this.schedule();
    });
    this.connect();
  }

  // Only child additions/removals are watched. The engine itself only sets attributes and adds one
  // style element, and that happens while the observer is disconnected, so it cannot trigger itself.
  private connect(): void {
    if (!this.observer) return;
    this.observer?.observe(this.o.doc.documentElement, { childList: true, subtree: true });
    // Web components keep their content in shadow roots, which the document observer cannot see.
    resetShadowCache(this.o.doc);
    this.roots = shadowRootsUnder(this.o.doc);
    for (const sr of this.roots) this.observer?.observe(sr, { childList: true, subtree: true });
  }

  private stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        const t = this.o.now();
        this.recent = this.recent.filter((x) => t - x < this.o.windowMs);
        if (this.recent.length >= this.o.maxRuns) {
          // Something keeps changing the page faster than is reasonable: give up and restore, so the
          // page is never left half adapted (new content would not be adapted).
          this.giveUp("this page changes too often, so the original page was restored");
          return;
        }
        this.recent.push(t);
        this.observer?.disconnect();
        this.run();
        this.connect();
      },
      Math.max(this.o.debounceMs, this.delay),
    );
  }
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "TEMPLATE"]);
const inertNode = (n: Node): boolean =>
  n.nodeType === 3 ||
  n.nodeType === 8 ||
  (n.nodeType === 1 &&
    (SKIP_TAGS.has((n as Element).tagName) || (n as Element).hasAttribute("data-xsuit-ui")));

/** A change that cannot affect what xsuit looks at: only text, comments, scripts, styles or xsuit's own label. */
const irrelevant = (r: MutationRecord): boolean =>
  [...r.addedNodes, ...r.removedNodes].every(inertNode);
