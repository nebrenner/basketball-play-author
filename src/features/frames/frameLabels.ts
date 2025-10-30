import type { Frame, Play } from "../../app/types";
import type { FrameTreeNode } from "./frameGraph";
import { buildFrameTree } from "./frameGraph";

const clampIndex = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);

const numberSegment = (index: number): string => String(index + 1);

const letterSegment = (index: number): string => {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(97 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

const normalizeStepId = (stepId: string | number): string => {
  if (typeof stepId === "number") {
    return String(clampIndex(stepId));
  }
  const trimmed = stepId.trim();
  return trimmed.length > 0 ? trimmed : "1";
};

export const defaultStepTitle = (stepId: string | number): string => `Step ${normalizeStepId(stepId)}`;

export const formatStepTitle = (frame: Frame | null | undefined, stepId: string | number): string => {
  const title = frame?.title?.trim();
  if (title && title.length > 0) {
    return title;
  }
  return defaultStepTitle(stepId);
};

export const computeStepLabels = (play: Play | null | undefined): Map<Frame["id"], string> => {
  if (!play || !play.frames.length) {
    return new Map();
  }

  const tree = buildFrameTree(play);
  const labels = new Map<Frame["id"], string>();
  const nextIndex = new Map<number, number>();

  const takeIndex = (depth: number): number => {
    const current = nextIndex.get(depth) ?? 0;
    nextIndex.set(depth, current + 1);
    return current;
  };

  const segmentForDepth = (depth: number, index: number): string => {
    if (depth % 2 === 1) {
      return numberSegment(index);
    }
    return letterSegment(index);
  };

  type LabelContext = {
    segments: string[];
    depth: number;
  };

  const setLabel = (node: FrameTreeNode, segments: string[]): void => {
    if (labels.has(node.frame.id)) return;
    labels.set(node.frame.id, segments.join(""));
  };

  const assignChildren = (node: FrameTreeNode, context: LabelContext): void => {
    const children = node.children;
    if (!children.length) return;

    if (children.length > 1) {
      const nextDepth = context.depth + 1;
      const childContexts = children.map((child) => {
        const index = takeIndex(nextDepth);
        const childSegments = [...context.segments, segmentForDepth(nextDepth, index)];
        setLabel(child, childSegments);
        return { child, context: { segments: childSegments, depth: nextDepth } };
      });
      childContexts.forEach(({ child, context: childContext }) => assignChildren(child, childContext));
      return;
    }

    const [child] = children;
    if (!child) return;

    const index = takeIndex(context.depth);
    const childSegments = [...context.segments];
    childSegments[context.depth - 1] = segmentForDepth(context.depth, index);
    setLabel(child, childSegments);
    assignChildren(child, { segments: childSegments, depth: context.depth });
  };

  const sortedRoots = [...tree].sort((a, b) => {
    const indexA = play.frames.findIndex((frame) => frame.id === a.frame.id);
    const indexB = play.frames.findIndex((frame) => frame.id === b.frame.id);
    return indexA - indexB;
  });

  sortedRoots.forEach((root) => {
    const depth = 1;
    const index = takeIndex(depth);
    const segments = [segmentForDepth(depth, index)];
    setLabel(root, segments);
    assignChildren(root, { segments, depth });
  });

  return labels;
};
