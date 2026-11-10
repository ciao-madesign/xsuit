// An adapter selector can point at ANY element. Before xsuit treats an element as a component it
// checks that the element could really be one. A selector aimed at the wrong thing (by mistake or
// on purpose) is ignored instead of being given a role it does not have.

import type { Component } from "../rules/types";

const words = (el: Element) => (el.textContent ?? "").trim().split(/\s+/).filter(Boolean).length;

export function plausible(component: Component, el: Element): boolean {
  const doc = el.ownerDocument;
  if (el === doc.documentElement || el === doc.body || el === doc.head) return false;
  if (el.closest("[data-xsuit-ui]")) return false;
  // One block must not be (nearly) the whole page.
  const total = words(doc.body ?? doc.documentElement);
  if (total >= 40 && words(el) > total * 0.85) return false;
  switch (component) {
    case "search-box":
      return (
        el.matches("input, textarea") ||
        el.querySelector(
          'input:not([type=hidden]), textarea, [contenteditable], [role="searchbox"], [role="combobox"]',
        ) !== null ||
        /search/i.test(el.localName)
      );
    case "primary-nav":
      return el.querySelectorAll("a[href]").length >= 3;
    case "video-player":
      return (
        el.matches("video, iframe") ||
        el.querySelector("video, iframe") !== null ||
        /player/i.test(`${el.id} ${el.className}`)
      );
    case "article-body":
      return words(el) >= 40;
    default:
      return true;
  }
}
