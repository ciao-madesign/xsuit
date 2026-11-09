import { buildContext, createResolver, findAdapter } from "../adapters";
import { defaultEffects } from "../engine/effects";
import { Engine } from "../engine/engine";
import type { PageContext } from "../engine/types";
import { measurePage } from "../metrics/metrics";
import westernRules from "../../rules/western.json";
import chinaRules from "../../rules/china.json";
import profiles from "../../rules/profiles.json";
import type { Profile, RuleSet } from "../rules/types";
import type {
  ApplyReply,
  MeasureReply,
  Message,
  PingReply,
  RestoreReply,
} from "../shared/messages";
import type { Settings } from "../shared/settings";
import { computeStatus } from "../shared/state";
import { loadSettings, onSettingsChanged } from "../shared/storage";

declare global {
  interface Window {
    __xsuitLoaded?: boolean;
  }
}

function main(): void {
  const ruleSets = [westernRules, chinaRules] as unknown as RuleSet[];

  // Components come from the site adapter for now; the generic analyzer arrives in B7.
  // Sites without an adapter get an empty context, so only page-wide token rules can apply.
  const adapter = findAdapter(location.hostname);
  const context = (): PageContext =>
    buildContext(adapter, document, location.pathname, window.innerWidth);
  const engine = new Engine({
    doc: document,
    resolve: createResolver(adapter, document),
    effects: defaultEffects,
    getContext: context,
  });

  let once = false; // user asked to apply on this page without enabling the site
  let current: Settings | null = null;

  function sync(settings: Settings): void {
    current = settings;
    engine.restore();
    if (computeStatus(settings, location.href, once).kind !== "active") return;
    if (settings.profile === "original") return;
    engine.start({
      ruleSets,
      profiles: profiles as unknown as Profile[],
      profile: settings.profile,
      depth: settings.depth,
      context: context(),
    });
  }

  chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
    switch (msg.type) {
      case "xsuit/ping":
        sendResponse({ ok: true, applied: engine.status.active } satisfies PingReply);
        break;
      case "xsuit/restore": {
        const wasActive = engine.status.active;
        once = false;
        engine.restore();
        sendResponse({
          ok: true,
          restored: wasActive,
          note: wasActive
            ? "Original page restored."
            : "Nothing to restore: no transformation is applied.",
        } satisfies RestoreReply);
        break;
      }
      case "xsuit/apply-once":
        once = true;
        if (current) sync(current);
        sendResponse({
          ok: true,
          applied: engine.status.active,
          rules: engine.status.plan?.entries.length ?? 0,
        } satisfies ApplyReply);
        break;
      case "xsuit/measure": {
        // Measure the ORIGINAL page: undo our changes first, then put them back.
        const wasActive = engine.status.active;
        engine.restore();
        const measurement = measurePage(document);
        if (wasActive && current) sync(current);
        sendResponse({ ok: true, measurement } satisfies MeasureReply);
        break;
      }
    }
    return false;
  });

  loadSettings().then(sync);
  onSettingsChanged(sync);
}

// The script can arrive twice (registered for the site and injected on request): run once.
if (!window.__xsuitLoaded) {
  window.__xsuitLoaded = true;
  main();
}
