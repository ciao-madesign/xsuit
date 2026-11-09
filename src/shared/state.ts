import { checkPageSupport } from "./support";
import { isSiteEnabled, type Settings } from "./settings";

export type Status =
  | { kind: "unsupported"; message: string }
  | { kind: "off"; message: string; host: string }
  | { kind: "not-enabled"; message: string; host: string }
  | { kind: "original"; message: string; host: string }
  | { kind: "active"; message: string; host: string };

/**
 * What xsuit should do on a page, and the message to show the user. Pure function.
 * `once` means the user asked to apply on this page now, without enabling the whole site.
 */
export function computeStatus(settings: Settings, url: string | undefined, once = false): Status {
  const page = checkPageSupport(url);
  if (!page.supported || !page.host) {
    return { kind: "unsupported", message: page.reason ?? "This page is not supported." };
  }
  const host = page.host;
  if (!settings.enabled) return { kind: "off", host, message: "xsuit is turned off." };
  if (settings.profile === "original") {
    return { kind: "original", host, message: "Showing the original page." };
  }
  if (!once && !isSiteEnabled(settings, host)) {
    return {
      kind: "not-enabled",
      host,
      message: `xsuit does not run on ${host} automatically. Use "Apply now" or turn on "Always on this site".`,
    };
  }
  return {
    kind: "active",
    host,
    message: `Profile "${settings.profile}" (${settings.depth}) ${once ? "applied to this page" : "runs on this site"}.`,
  };
}
