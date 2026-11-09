import { checkPageSupport } from "./support";
import { isExcluded, type Settings } from "./settings";

export type Status =
  | { kind: "unsupported"; message: string }
  | { kind: "off"; message: string; host: string }
  | { kind: "excluded"; message: string; host: string }
  | { kind: "original"; message: string; host: string }
  | { kind: "active"; message: string; host: string };

/** What xsuit should do on a page, and the message to show the user. Pure function. */
export function computeStatus(settings: Settings, url: string | undefined): Status {
  const page = checkPageSupport(url);
  if (!page.supported || !page.host) {
    return { kind: "unsupported", message: page.reason ?? "This page is not supported." };
  }
  const host = page.host;
  if (!settings.enabled) return { kind: "off", host, message: "xsuit is turned off." };
  if (isExcluded(settings, host)) {
    return { kind: "excluded", host, message: `${host} is excluded. The page stays original.` };
  }
  if (settings.profile === "original") {
    return { kind: "original", host, message: "Showing the original page." };
  }
  return {
    kind: "active",
    host,
    message: `Profile "${settings.profile}" selected (${settings.depth}). Transformations arrive in later builds.`,
  };
}
