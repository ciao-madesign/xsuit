// Reading through shadow DOM. Many sites build parts of the page as web components whose content
// lives in a shadow root, which plain querySelector cannot see. For SAFETY this matters most: a
// password field or payment form inside a shadow root must still be found, otherwise xsuit could
// treat such a page as harmless. Reading is allowed for open roots and, where the browser lets an
// extension, closed ones. WRITING is limited to open roots (see apply.ts).

export const MAX_ROOTS = 100;
const MAX_SCANNED = 30000;

type DomApi = { openOrClosedShadowRoot?: (el: Element) => ShadowRoot | null };

/** The shadow root of an element if one can be read (open, or closed via the extension API). */
export function shadowRootOf(el: Element): ShadowRoot | null {
  if (el.shadowRoot) return el.shadowRoot;
  if (!el.localName.includes("-")) return null; // only custom elements are probed for closed roots
  try {
    const dom = (globalThis as unknown as { chrome?: { dom?: DomApi } }).chrome?.dom;
    return dom?.openOrClosedShadowRoot?.(el) ?? null;
  } catch {
    return null;
  }
}

const cache = new WeakMap<Document, ShadowRoot[]>();

/** Forget the cached list of shadow roots. Called at the start of every analysis / engine run. */
export function resetShadowCache(doc: Document): void {
  cache.delete(doc);
}

/** Every readable shadow root in the document (nested ones included), scanned once per run. */
function allRoots(doc: Document): ShadowRoot[] {
  const hit = cache.get(doc);
  if (hit) return hit;
  const found: ShadowRoot[] = [];
  const queue: ParentNode[] = [doc];
  let scanned = 0;
  while (queue.length && found.length < MAX_ROOTS) {
    const node = queue.shift()!;
    for (const el of node.querySelectorAll("*")) {
      if (++scanned > MAX_SCANNED) break;
      const sr = shadowRootOf(el);
      if (sr) {
        found.push(sr);
        queue.push(sr);
        if (found.length >= MAX_ROOTS) break;
      }
    }
  }
  cache.set(doc, found);
  return found;
}

/** True if `el` is `ancestor` or sits below it, also across shadow boundaries. */
function composedContains(ancestor: Node, el: Element): boolean {
  for (let cur: Element | null = el; cur; cur = parentDeep(cur)) if (cur === ancestor) return true;
  return false;
}

/** Every readable shadow root below `root` (nested ones included). Instant on pages without any. */
export function shadowRootsUnder(root: ParentNode): ShadowRoot[] {
  const doc = root.nodeType === 9 ? (root as Document) : (root as Node).ownerDocument;
  if (!doc) return [];
  const all = allRoots(doc);
  if (all.length === 0 || root === doc) return all;
  return all.filter((sr) => composedContains(root as Node, sr.host));
}

/** querySelectorAll through shadow roots. */
export function deepQueryAll(root: ParentNode, selector: string, roots?: ShadowRoot[]): Element[] {
  const out = [...root.querySelectorAll(selector)];
  for (const sr of roots ?? shadowRootsUnder(root)) out.push(...sr.querySelectorAll(selector));
  return out;
}

/** First match under `root`, looking through shadow roots. */
export function deepQuery(root: ParentNode, selector: string): Element | null {
  const own = root.querySelector(selector);
  if (own) return own;
  for (const sr of shadowRootsUnder(root)) {
    const hit = sr.querySelector(selector);
    if (hit) return hit;
  }
  return null;
}

/** closest() that continues from a shadow root to its host. */
export function closestDeep(el: Element, selector: string): Element | null {
  for (let cur: Element | null = el; cur;) {
    const hit = cur.closest(selector);
    if (hit) return hit;
    const rootNode = cur.getRootNode();
    cur = rootNode instanceof ShadowRoot ? rootNode.host : null;
  }
  return null;
}

/** The element, or the host when the element is the top of a shadow tree. */
export const parentDeep = (el: Element): Element | null =>
  el.parentElement ??
  (el.getRootNode() instanceof ShadowRoot ? (el.getRootNode() as ShadowRoot).host : null);

export const isInShadow = (el: Element): boolean => el.getRootNode() instanceof ShadowRoot;
