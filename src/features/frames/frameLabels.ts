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

type StepSegment = {
  type: "number" | "letter";
  index: number;
};

const segmentTypeForDepth = (depth: number): StepSegment["type"] =>
  depth % 2 === 0 ? "number" : "letter";

const formatSegments = (segments: StepSegment[]): string =>
  segments
    .map((segment) =>
      segment.type === "number" ? numberSegment(segment.index) : letterSegment(segment.index),
    )
    .join("");

const nextLinearSegments = (segments: StepSegment[]): StepSegment[] => {
  if (segments.length === 0) {
    return [{ type: "number", index: 0 }];
  }

  const last = segments[segments.length - 1];
  if (last.type === "number") {
    return [...segments.slice(0, -1), { ...last, index: last.index + 1 }];
  }

  return [...segments, { type: "number", index: 0 }];
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

  const assignBranch = (nodes: FrameTreeNode[], depth: number, prefix: StepSegment[]): void => {
    nodes.forEach((node, index) => {
      const type = segmentTypeForDepth(depth);
      const segments: StepSegment[] = [...prefix, { type, index }];
      assignLinear(node, segments);
    });
  };

  const assignLinear = (node: FrameTreeNode, segments: StepSegment[]): void => {
    labels.set(node.frame.id, formatSegments(segments));

    const { children } = node;
    if (children.length === 0) {
      return;
    }

    if (children.length > 1) {
      assignBranch(children, segments.length, segments);
      return;
    }

    const [child] = children;
    assignLinear(child, nextLinearSegments(segments));
  };

  const sortedRoots = [...tree].sort((a, b) => {
    const indexA = play.frames.findIndex((frame) => frame.id === a.frame.id);
    const indexB = play.frames.findIndex((frame) => frame.id === b.frame.id);
    return indexA - indexB;
  });

  assignBranch(sortedRoots, 0, []);

  return labels;
};
