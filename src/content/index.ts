import { findAdapter } from "../adapters";
import { analyzePage, type Analysis } from "../analyzer";
import { effectFile, toCatalog } from "../engine/effects";
import { Engine, type EngineStatus } from "../engine/engine";
import { needsMetrics } from "../engine/plan";
import type { PageContext, Resolver } from "../engine/types";
import { computeMetrics } from "../metrics/metrics";
import westernRules from "../../rules/western.json";
import chinaRules from "../../rules/china.json";
import profiles from "../../rules/profiles.json";
import type { Profile, RuleSet } from "../rules/types";
import type { ApplyReply, BriefReply, Message, PingReply, RestoreReply } from "../shared/messages";
import type { Settings } from "../shared/settings";
import { computeStatus } from "../shared/state";
import { loadSettings, onSettingsChanged } from "../shared/storage";
import { resolveLanguage } from "../i18n";
import { buildBrief } from "../brief/brief";
import { Overlay } from "../ui/overlay";
import { DEV_MESSAGE_TYPES, handleDevMessage } from "./dev";
import { summarizeChanges } from "../ui/summary";

declare global {
  interface Window {
    __xsuitLoaded?: boolean;
  }
}

const MESSAGE_TYPES = new Set<string>([
  "xsuit/ping",
  "xsuit/restore",
  "xsuit/apply-once",
  "xsuit/brief",
  ...(__DEV__ ? DEV_MESSAGE_TYPES : []),
]);
function isMessage(x: unknown): x is Message {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { type?: unknown }).type === "string" &&
    MESSAGE_TYPES.has((x as { type: string }).type)
  );
}

function main(): void {
  const ruleSets = [westernRules, chinaRules] as unknown as RuleSet[];
  const allRules = ruleSets.flatMap((s) => s.rules);
  const STRUCTURAL = new Set(
    allRules
      .filter((r) => ["collapse", "reorder", "group", "surface-shortcut"].includes(r.action.type))
      .map((r) => r.id),
  );

  // Recognition: the site adapter first, the generic analyzer for what it does not cover.
  // It is re-run on every engine run (cheap, read-only) because components can appear later.
  const adapter = findAdapter(location.hostname);
  // Metrics of the ORIGINAL page, measured once per page (not on every change): stable and light.
  let metrics: Partial<Record<string, number | null>> | undefined;
  let analysis: Analysis | null = null;
  const analyze = (): Analysis =>
    (analysis = analyzePage(document, adapter, location.pathname, location.search));
  const context = (): PageContext => ({
    ...analyze().context,
    viewportWidth: window.innerWidth,
    metrics,
  });
  const resolve: Resolver = (component) => (analysis ?? analyze()).resolver(component);

  let once = false; // user asked to apply on this page without enabling the site
  let suspended = false; // user pressed Undo on the page: stay original until reload
  let current: Settings | null = null;

  const overlay = new Overlay(document, {
    onUndo: () => {
      suspended = true;
      engine.restore();
      overlay.hide();
    },
  });

  // Runs after every engine run, while the page observer is paused.
  const onRun = (st: EngineStatus) => {
    const summary = summarizeChanges(
      st.changes,
      st.reverted,
      allRules,
      analysis?.context.components,
    );
    // Hiding the label is allowed for spacing/typography only. When xsuit moved, hid or added
    // content, a visible notice is mandatory (anti-abuse: a changed page must be recognizable).
    const structural = st.changes.some((c) => STRUCTURAL.has(c.ruleId));
    const wanted = current?.labelPosition ?? "bottom-left";
    overlay.show(
      summary,
      wanted === "hidden" && structural ? "bottom-left" : wanted,
      st.report?.guard.unverifiable ?? 0,
    );
  };

  const engine = new Engine({
    doc: document,
    resolve,
    effects: () => toCatalog(effectFile, current?.intensity ?? "standard"),
    getContext: context,
    onRun,
    onStop: () => overlay.hide(),
  });

  function sync(settings: Settings): void {
    current = settings;
    overlay.setLanguage(resolveLanguage(settings.language, navigator.language));
    engine.restore(); // the page is original again, so it can be measured
    overlay.hide();
    metrics = undefined;
    if (suspended) return;
    if (computeStatus(settings, location.href, once).kind !== "active") return;
    if (settings.profile === "original") return;
    const input = {
      ruleSets,
      profiles: profiles as unknown as Profile[],
      profile: settings.profile,
      hybridChoices: settings.hybridChoices,
      hybridRuleIds: settings.hybridRules,
    };
    if (needsMetrics(input))
      metrics = computeMetrics(document) as unknown as Partial<Record<string, number | null>>;
    engine.start({
      ...input,
      depth: settings.depth,
      context: context(),
      disabledRules: settings.disabledRules,
    });
  }

  chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
    // Only our own extension (popup / report pages, which have no tab) may command the page.
    if (sender.id !== chrome.runtime.id || sender.tab) return false;
    if (!isMessage(raw)) return false;
    const msg = raw;
    if (__DEV__) {
      const dev = handleDevMessage(
        msg,
        {
          engine,
          overlay,
          adapter,
          allRules,
          current: () => current,
          sync,
          analysis: () => analysis ?? analyze(),
        },
        sendResponse,
      );
      if (dev) return false;
    }
    switch (msg.type) {
      case "xsuit/ping":
        sendResponse({
          ok: true,
          applied: engine.status.active,
          rules: engine.status.plan?.entries.length ?? 0,
        } satisfies PingReply);
        break;
      case "xsuit/restore": {
        const wasActive = engine.status.active;
        once = false;
        suspended = true; // stays original until the next load or until the person adapts again
        engine.restore();
        overlay.hide();
        sendResponse({
          ok: true,
          restored: wasActive,
          note: wasActive
            ? "Original page restored."
            : "Nothing to restore: no transformation is applied.",
        } satisfies RestoreReply);
        break;
      }
      case "xsuit/brief": {
        // Local only: the site name (no path), the rules that ran and their sources, nothing from the page text.
        const st = engine.status;
        sendResponse({
          ok: true,
          brief: buildBrief({
            host: location.hostname,
            now: new Date(),
            market: current?.profile ?? "original",
            strength: current?.intensity ?? "standard",
            depth: current?.depth ?? "visual",
            pageType: (analysis ?? analyze()).context.pageType,
            changes: st.changes,
            reverted: st.reverted,
            unverifiable: st.report?.guard.unverifiable ?? 0,
            rules: allRules,
            components: (analysis ?? analyze()).context.components,
            catalog: toCatalog(effectFile, current?.intensity ?? "standard"),
          }),
        } satisfies BriefReply);
        break;
      }
      case "xsuit/apply-once":
        once = true;
        suspended = false;
        if (current) sync(current);
        sendResponse({
          ok: true,
          applied: engine.status.active,
          rules: engine.status.plan?.entries.length ?? 0,
          skipped: engine.status.plan?.skipped ?? [],
          recognized: analysis?.recognized ?? [],
          pageType: analysis?.context.pageType ?? "any",
          reverted: engine.status.reverted,
        } satisfies ApplyReply);
        break;
    }
    return false;
  });

  // Single-page sites change page without reloading: measure and decide again, after the new
  // page had time to render. Only the path matters; the query string is ignored.
  let lastPath = location.pathname;
  let navTimer: ReturnType<typeof setTimeout> | null = null;
  const onNavigate = () => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    if (navTimer) clearTimeout(navTimer);
    navTimer = setTimeout(() => current && sync(current), 400);
  };
  const nav = (window as unknown as { navigation?: EventTarget }).navigation;
  nav?.addEventListener("navigatesuccess", onNavigate);
  window.addEventListener("popstate", onNavigate);

  // Watchdog: if the page hides or removes the xsuit label, undo everything (fail safe).
  setInterval(() => {
    if (!engine.status.active || overlay.intact()) return;
    suspended = true;
    engine.restore();
    overlay.hide();
  }, 1500);

  // Zoom or resize changes the viewport width in CSS pixels: re-check the accessibility guard
  // at the new width (reflow, WCAG 1.4.10). Only when the width really changed.
  let lastWidth = window.innerWidth;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastWidth) < 1) return;
      lastWidth = window.innerWidth;
      if (!suspended && engine.status.active) engine.reflow();
    }, 300);
  });

  loadSettings().then(sync);
  onSettingsChanged(sync);
}

// The script can arrive twice (registered for the site and injected on request): run once.
if (!window.__xsuitLoaded) {
  window.__xsuitLoaded = true;
  main();
}
