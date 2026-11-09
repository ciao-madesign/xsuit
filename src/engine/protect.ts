// Protected elements are never touched (spec: passwords, payment, consent, authentication,
// transactions, account deletion). The check is conservative: when in doubt, protect.

const PROTECTED_SELECTORS = [
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
  'form[action*="delete-account" i]',
  '[id*="cookie" i]',
  '[id*="consent" i]',
  '[class*="cookie-banner" i]',
  '[class*="consent" i]',
  '[aria-label*="consent" i]',
];
const SELECTOR = PROTECTED_SELECTORS.join(",");

/** True if the element is protected, sits inside a protected area, or contains one. */
export function isProtected(el: Element): boolean {
  if (el.closest(SELECTOR)) return true; // itself or an ancestor
  return el.querySelector(SELECTOR) !== null; // contains protected content
}
