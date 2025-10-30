import type { Frame, Id, Play } from "../../app/types";

export type FrameTreeNode = {
  frame: Frame;
  children: FrameTreeNode[];
};

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

function cloneFrameForGraph(frame: Frame): Frame {
  return {
    ...frame,
    nextFrameIds: Array.isArray(frame.nextFrameIds) ? [...frame.nextFrameIds] : [],
    parentId: frame.parentId ?? null,
  };
}

function clonePlayForGraph(play: Play): Play {
  return {
    ...play,
    frames: play.frames.map(cloneFrameForGraph),
  };
}

function needsCloneForGraph(play: Play): boolean {
  return play.frames.some((frame) => Object.isFrozen(frame));
}

export function collectPlaybackOrder(play: Play): Id[] {
  const workingPlay = needsCloneForGraph(play) ? clonePlayForGraph(play) : play;
  ensureFrameGraph(workingPlay);
  const root = getRootFrame(workingPlay);
  if (!root) return [];

  const order: Id[] = [root.id];
  const byId = new Map<Id, Frame>();
  for (const frame of workingPlay.frames) {
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

function buildChildLookup(play: Play) {
  const byId = new Map<Id, Frame>();
  const children = new Map<Id, Frame[]>();

  for (const frame of play.frames) {
    byId.set(frame.id, frame);
    children.set(frame.id, []);
  }

  const roots: Frame[] = [];

  for (const frame of play.frames) {
    const parentId = frame.parentId ?? null;
    if (parentId && byId.has(parentId)) {
      children.get(parentId)?.push(frame);
    } else {
      roots.push(frame);
    }
  }

  for (const frame of play.frames) {
    const directChildren = children.get(frame.id);
    if (!directChildren || !directChildren.length) continue;

    const order: Frame[] = [];
    const seen = new Set<Id>();
    const nextIds = Array.isArray(frame.nextFrameIds) ? frame.nextFrameIds : [];

    for (const id of nextIds) {
      const child = byId.get(id);
      if (!child) continue;
      if (!directChildren.includes(child)) continue;
      if (seen.has(child.id)) continue;
      order.push(child);
      seen.add(child.id);
    }

    if (seen.size !== directChildren.length) {
      const remaining = directChildren
        .filter((child) => !seen.has(child.id))
        .sort((a, b) => {
          const indexA = play.frames.indexOf(a);
          const indexB = play.frames.indexOf(b);
          return indexA - indexB;
        });
      for (const child of remaining) {
        order.push(child);
        seen.add(child.id);
      }
    }

    children.set(frame.id, order);
  }

  const sortedRoots = Array.from(new Set(roots)).sort((a, b) => {
    const indexA = play.frames.indexOf(a);
    const indexB = play.frames.indexOf(b);
    return indexA - indexB;
  });

  return { byId, children, roots: sortedRoots };
}

export function buildFrameTree(play: Play): FrameTreeNode[] {
  if (!play.frames.length) return [];

  const { children, roots } = buildChildLookup(play);
  const visited = new Set<Id>();

  const buildNode = (frame: Frame): FrameTreeNode => {
    if (visited.has(frame.id)) {
      return { frame, children: [] };
    }
    visited.add(frame.id);
    const nextChildren = children.get(frame.id) ?? [];
    return {
      frame,
      children: nextChildren.map(buildNode),
    };
  };

  return roots.map(buildNode);
}
