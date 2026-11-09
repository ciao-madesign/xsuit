import { buildContext, createResolver, findAdapter } from "../adapters";
import { defaultEffects } from "../engine/effects";
import { Engine } from "../engine/engine";
import type { PageContext } from "../engine/types";
import westernRules from "../../rules/western.json";
import chinaRules from "../../rules/china.json";
import profiles from "../../rules/profiles.json";
import type { Profile, RuleSet } from "../rules/types";
import type { Message, PingReply, RestoreReply } from "../shared/messages";
import type { Settings } from "../shared/settings";
import { computeStatus } from "../shared/state";
import { loadSettings, onSettingsChanged } from "../shared/storage";

const ruleSets = [westernRules, chinaRules] as unknown as RuleSet[];

// Components come from the site adapter for now; the generic analyzer arrives in B5.
// Sites without an adapter get an empty context, so nothing visible changes there.
const adapter = findAdapter(location.hostname);
const context = (): PageContext =>
  buildContext(adapter, document, location.pathname, window.innerWidth);

const engine = new Engine({
  doc: document,
  resolve: createResolver(adapter, document),
  effects: defaultEffects,
  getContext: context,
});

function sync(settings: Settings): void {
  const status = computeStatus(settings, location.href);
  if (status.kind !== "active" || settings.profile === "original") {
    engine.restore();
    return;
  }
  engine.restore();
  engine.start({
    ruleSets,
    profiles: profiles as unknown as Profile[],
    profile: settings.profile,
    depth: settings.depth,
    context: context(),
  });
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "xsuit/ping") {
    const reply: PingReply = { ok: true, applied: engine.status.active };
    sendResponse(reply);
  } else if (msg.type === "xsuit/restore") {
    const wasActive = engine.status.active;
    engine.restore();
    const reply: RestoreReply = {
      ok: true,
      restored: wasActive,
      note: wasActive
        ? "Original page restored."
        : "Nothing to restore: no transformation is applied.",
    };
    sendResponse(reply);
  }
  return false;
});

loadSettings().then(sync);
onSettingsChanged(sync);
