import type { Node } from "konva/lib/Node";

// Simple module-level registry to find Konva nodes by token id for tweening
const reg = new Map<string, Node>();

export function registerTokenNode(tokenId: string, node: Node | null) {
  if (!node) {
    reg.delete(tokenId);
    return;
  }
  reg.set(tokenId, node);
}

export function getTokenNode(tokenId: string): Node | null {
  return reg.get(tokenId) || null;
}

export function clearRegistry() {
  reg.clear();
}
