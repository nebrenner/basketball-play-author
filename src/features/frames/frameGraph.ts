import type { Frame, Id, Play } from "../../app/types";

export function findFrameById(play: Play | null, id: Id | null | undefined): Frame | undefined {
  if (!play || !id) return undefined;
  return play.frames.find((frame) => frame.id === id);
}

export function ensureFrameGraph(play: Play): void {
  if (!play.frames.length) return;
  const byId = new Map<Id, Frame>();
  for (const frame of play.frames) {
    byId.set(frame.id, frame);
    frame.nextFrameIds = Array.isArray(frame.nextFrameIds) ? [...frame.nextFrameIds] : [];
    frame.parentId = frame.parentId ?? null;
  }

  const root = play.frames[0];
  if (root) {
    root.parentId = null;
  }

  for (let i = 1; i < play.frames.length; i += 1) {
    const frame = play.frames[i];
    if (!frame.parentId || !byId.has(frame.parentId) || frame.parentId === frame.id) {
      frame.parentId = play.frames[i - 1]?.id ?? null;
    }
  }

  for (const frame of play.frames) {
    frame.nextFrameIds = [];
  }

  for (const frame of play.frames) {
    const parentId = frame.parentId ?? null;
    if (!parentId) continue;
    const parent = byId.get(parentId);
    if (!parent) continue;
    if (!Array.isArray(parent.nextFrameIds)) {
      parent.nextFrameIds = [];
    }
    if (!parent.nextFrameIds.includes(frame.id)) {
      parent.nextFrameIds.push(frame.id);
    }
  }

  for (const frame of play.frames) {
    if (!Array.isArray(frame.nextFrameIds)) {
      frame.nextFrameIds = [];
      continue;
    }
    const unique = Array.from(new Set(frame.nextFrameIds));
    frame.nextFrameIds = unique;
  }
}

export function buildPathToFrame(play: Play, targetId: Id): Id[] | null {
  const byId = new Map<Id, Frame>();
  for (const frame of play.frames) {
    byId.set(frame.id, frame);
  }

  const path: Id[] = [];
  let current = byId.get(targetId);
  const seen = new Set<Id>();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    path.push(current.id);
    const parentId = current.parentId ?? null;
    if (!parentId) break;
    current = byId.get(parentId);
  }

  if (!path.length) return null;
  return path.reverse();
}

function getRootFrame(play: Play): Frame | null {
  if (!play.frames.length) return null;
  const root = play.frames.find((frame) => !frame.parentId) ?? play.frames[0];
  return root ?? null;
}

export function collectPlaybackOrder(play: Play): Id[] {
  ensureFrameGraph(play);
  const root = getRootFrame(play);
  if (!root) return [];

  const order: Id[] = [root.id];
  const byId = new Map<Id, Frame>();
  for (const frame of play.frames) {
    byId.set(frame.id, frame);
  }

  const visit = (frame: Frame) => {
    const children = (frame.nextFrameIds ?? [])
      .map((id) => byId.get(id))
      .filter((child): child is Frame => Boolean(child));
    for (const child of children) {
      order.push(child.id);
      visit(child);
      order.push(frame.id);
    }
  };

  visit(root);
  return order;
}
