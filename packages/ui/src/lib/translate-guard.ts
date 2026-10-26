/**
 * Browser page translation (Safari / Chrome «Translate») swaps the text nodes
 * React owns for its own. On the next update React tries to remove or insert
 * next to a node that is no longer where it left it and the page crashes:
 * "NotFoundError: The object can not be found here" (Safari) / "Failed to
 * execute 'removeChild' on 'Node'" (Chrome) — seen on /shop, 2026-10-26.
 * The usual workaround (facebook/react#11538): make those two DOM calls
 * forgiving when the node has moved. Installed once, before the app renders.
 */
export function guardDomAgainstTranslation() {
  if (typeof Node === "undefined") return;
  const proto = Node.prototype as Node & { __bachTranslateGuard?: boolean };
  if (proto.__bachTranslateGuard) return;
  proto.__bachTranslateGuard = true;

  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };

  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref) as T;
  };
}
