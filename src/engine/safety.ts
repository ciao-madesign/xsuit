// Anti-abuse rules (docs/14-security-model.md). xsuit must never become a mask for scams:
// it must not push users toward clicks they did not choose, hide warnings, or make forms
// for credentials, payment or file transfer look friendlier. When in doubt, do nothing.

/** Pages asking for credentials or payment details: only spacing and typography may change. */
const SENSITIVE_PAGE = [
  'input[type="password"]',
  '[autocomplete="current-password"]',
  '[autocomplete="new-password"]',
  '[autocomplete="one-time-code"]',
  '[autocomplete^="cc-"]',
  'input[name*="card" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  'form[action*="checkout" i]',
  'form[action*="payment" i]',
  'form[action*="login" i]',
  'form[action*="signin" i]',
].join(",");

export function isSensitivePage(doc: Document): boolean {
  return doc.querySelector(SENSITIVE_PAGE) !== null;
}

/** Notices a user must not miss: alerts, dialogs, live announcements. Never hidden, never moved past. */
const NOTICE =
  '[role="alert"], [role="alertdialog"], [role="dialog"], dialog, [aria-live="assertive"], [aria-modal="true"]';
const SEARCH_FIELD = /^(q|query|s|search|keyword|keywords|wd|kw|searchtext|search_query)$/i;

/** A form that is only a search box is harmless; any other form can send data somewhere. */
export function isSearchForm(form: Element): boolean {
  if (form.getAttribute("role") === "search" || form.querySelector('input[type="search"]'))
    return true;
  const fields = [...form.querySelectorAll("input:not([type=hidden]), select, textarea")];
  return (
    fields.length > 0 &&
    fields.length <= 2 &&
    fields.some((f) => SEARCH_FIELD.test(f.getAttribute("name") ?? ""))
  );
}

/**
 * Elements that act on the user's behalf if they click: forms that are not search, file inputs,
 * downloads. And notices. Such blocks are never collapsed, moved, grouped, emphasized or used
 * as a source of shortcuts. (Visual spacing/typography tokens are still allowed.)
 */
export function isActionRisky(el: Element): boolean {
  const inForm = el.closest("form");
  if (inForm && !isSearchForm(inForm)) return true;
  if (el.closest(NOTICE) || el.querySelector(NOTICE)) return true;
  for (const f of el.querySelectorAll("form")) if (!isSearchForm(f)) return true;
  return el.querySelector('input[type="file"], [download]') !== null;
}

export function isNotice(el: Element): boolean {
  return el.matches(NOTICE) || el.querySelector(NOTICE) !== null;
}

// ---- links that xsuit is allowed to surface -------------------------------------------------

const RISKY_WORDS =
  /(log-?out|sign-?out|log-?in|sign-?in|delete|remove|unsubscribe|deactivate|close-?account|checkout|pay(ment)?\b|purchase|buy-?now|confirm|transfer|download|install|update-?now|verify|claim|prize|winner|giveaway|airdrop|crypto|wallet|approve|authori[sz]e|oauth|consent|accept|agree|subscribe|redeem|activate)/i;
const DOWNLOAD_EXT = /\.(exe|msi|apk|dmg|pkg|bat|cmd|scr|jar|ps1|sh|zip|rar|7z|iso|js|vbs|lnk)$/i;
/** Zero-width and bidirectional controls: used to make a link read differently than it is. */
const HIDDEN_CHARS = new RegExp("[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF\\u00AD]");
const URL_LIKE_TEXT =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|cn|ru|top|xyz|info|biz|cc|tk)\b)/i;

const sameSite = (host: string, pageHost: string): boolean => {
  const a = host.replace(/^www\./, "");
  const b = pageHost.replace(/^www\./, "");
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
};

function reallyVisible(a: Element): boolean {
  const win = a.ownerDocument.defaultView!;
  for (let e: Element | null = a; e; e = e.parentElement) {
    const cs = win.getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse")
      return false;
    if (parseFloat(cs.opacity || "1") < 0.3) return false;
    if (e.getAttribute("aria-hidden") === "true" || e.hasAttribute("hidden")) return false;
  }
  const r = a.getBoundingClientRect();
  const layout = a.ownerDocument.documentElement.getBoundingClientRect().width > 0;
  if (layout && (r.width < 8 || r.height < 8)) return false; // 1 px tricks
  const fs = parseFloat(win.getComputedStyle(a).fontSize);
  return !(fs > 0 && fs < 8);
}

/**
 * A link may be copied into a shortcut strip only if a person looking at the page would see it,
 * it goes to the same site, it reads as what it is, and it is not an action or a download.
 */
export function isSafeShortcut(a: Element, text: string, pageHost: string, base: string): boolean {
  const href = (a.getAttribute("href") ?? "").trim();
  if (!href || href === "#" || a.hasAttribute("download")) return false;
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (!sameSite(url.hostname.toLowerCase(), pageHost.toLowerCase())) return false;
  if (DOWNLOAD_EXT.test(url.pathname)) return false;
  if (RISKY_WORDS.test(url.pathname) || RISKY_WORDS.test(url.search) || RISKY_WORDS.test(text))
    return false;
  if (HIDDEN_CHARS.test(text) || HIDDEN_CHARS.test(href)) return false;
  if (URL_LIKE_TEXT.test(text)) return false; // text that looks like another address
  if (text.length < 2 || text.length > 30) return false;
  return reallyVisible(a);
}
