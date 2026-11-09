type Op =
  | { kind: "attr"; el: Element; name: string; previous: string | null }
  | { kind: "node"; node: Node };

/**
 * Records every change the engine makes, so all of them can be undone in reverse order.
 * The engine never edits the page except through this class.
 */
export class Journal {
  private ops: Op[] = [];

  setAttr(el: Element, name: string, value: string): void {
    this.ops.push({ kind: "attr", el, name, previous: el.getAttribute(name) });
    el.setAttribute(name, value);
  }

  insert(parent: Node, node: Node): void {
    parent.appendChild(node);
    this.ops.push({ kind: "node", node });
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
