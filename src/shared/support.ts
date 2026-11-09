export interface PageSupport {
  supported: boolean;
  host?: string;
  reason?: string;
}

const STORE_HOSTS = ["chromewebstore.google.com", "chrome.google.com"];

/** Decides whether xsuit can work on a page. Unsupported pages get a clear message, never a silent failure. */
export function checkPageSupport(url: string | undefined): PageSupport {
  if (!url) return { supported: false, reason: "No page is open in this tab." };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { supported: false, reason: "This page address is not valid." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return {
      supported: false,
      reason: "Browser internal, file and extension pages cannot be adapted.",
    };
  }
  if (STORE_HOSTS.includes(u.hostname)) {
    return { supported: false, reason: "The browser does not allow extensions on its store." };
  }
  return { supported: true, host: u.hostname };
}
