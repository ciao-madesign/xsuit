type Op =
  | { kind: "attr"; el: Element; name: string; previous: string | null; tag?: string }
  | { kind: "node"; node: Node; tag?: string };

/**
 * Records every change the engine makes, so all of them can be undone in reverse order.
 * The engine never edits the page except through this class.
 */
export class Journal {
  private ops: Op[] = [];

  /** `tag` groups changes (one rule) so a single rule can be undone without touching the others. */
  setAttr(el: Element, name: string, value: string, tag?: string): void {
    this.ops.push({ kind: "attr", el, name, previous: el.getAttribute(name), tag });
    el.setAttribute(name, value);
  }

  insert(parent: Node, node: Node, tag?: string): void {
    parent.appendChild(node);
    this.ops.push({ kind: "node", node, tag });
  }

  /** Inserts `node` right before `ref` (used for structural changes; undone by removal). */
  insertBefore(parent: Node, node: Node, ref: Node, tag?: string): void {
    parent.insertBefore(node, ref);
    this.ops.push({ kind: "node", node, tag });
  }

  /** Undoes only the changes made under `tag`, newest first. */
  rollbackTag(tag: string): void {
    const keep: Op[] = [];
    for (const op of [...this.ops].reverse()) {
      if (op.tag !== tag) {
        keep.unshift(op);
        continue;
      }
      if (op.kind === "attr") {
        if (op.previous === null) op.el.removeAttribute(op.name);
        else op.el.setAttribute(op.name, op.previous);
      } else op.node.parentNode?.removeChild(op.node);
    }
    this.ops = keep;
  }

  get size(): number {
    return this.ops.length;
  }

  rollback(): void {
    for (const op of this.ops.reverse()) {
      if (op.kind === "attr") {
        if (op.previous === null) op.el.removeAttribute(op.name);
        else op.el.setAttribute(op.name, op.previous);
      } else op.node.parentNode?.removeChild(op.node);
    }
    this.ops = [];
  }
}
