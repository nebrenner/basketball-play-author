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

const segmentForDepth = (depth: number, index: number): string =>
  depth % 2 === 0 ? numberSegment(index) : letterSegment(index);

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

  const assign = (nodes: FrameTreeNode[], depth: number, prefix: string): void => {
    nodes.forEach((node, index) => {
      const segment = segmentForDepth(depth, index);
      const label = prefix ? `${prefix}${segment}` : segment;
      labels.set(node.frame.id, label);
      if (node.children.length > 0) {
        assign(node.children, depth + 1, label);
      }
    });
  };

  const sortedRoots = [...tree].sort((a, b) => {
    const indexA = play.frames.findIndex((frame) => frame.id === a.frame.id);
    const indexB = play.frames.findIndex((frame) => frame.id === b.frame.id);
    return indexA - indexB;
  });

  assign(sortedRoots, 0, "");

  return labels;
};
