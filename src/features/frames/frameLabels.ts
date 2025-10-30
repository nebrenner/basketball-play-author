import type { Frame, Play } from "../../app/types";
import type { FrameTreeNode } from "./frameGraph";
import { buildFrameTree } from "./frameGraph";

const clampIndex = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);

const endsWithLetter = (value: string): boolean => /[a-z]$/i.test(value);
const hasLetter = (value: string): boolean => /[a-z]/i.test(value);

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

const nextSegment = (parentLabel: string, index: number): string => {
  if (endsWithLetter(parentLabel)) {
    return numberSegment(index);
  }
  return letterSegment(index);
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
  const orderIndex = new Map<Frame["id"], number>();
  play.frames.forEach((frame, index) => {
    orderIndex.set(frame.id, index + 1);
  });

  const labels = new Map<Frame["id"], string>();

  const assignNode = (node: FrameTreeNode, label: string) => {
    if (labels.has(node.frame.id)) return;
    labels.set(node.frame.id, label);

    if (!node.children.length) {
      return;
    }

    if (node.children.length > 1) {
      node.children.forEach((child, index) => {
        const childLabel = `${label}${nextSegment(label, index)}`;
        assignNode(child, childLabel);
      });
      return;
    }

    const [child] = node.children;
    if (!child) return;

    if (hasLetter(label)) {
      const childLabel = `${label}${nextSegment(label, 0)}`;
      assignNode(child, childLabel);
      return;
    }

    const sequential = orderIndex.get(child.frame.id);
    const childLabel = sequential ? String(sequential) : `${label}${nextSegment(label, 0)}`;
    assignNode(child, childLabel);
  };

  const sortedRoots = [...tree].sort((a, b) => {
    const indexA = orderIndex.get(a.frame.id) ?? 0;
    const indexB = orderIndex.get(b.frame.id) ?? 0;
    return indexA - indexB;
  });

  sortedRoots.forEach((root, index) => {
    const label = String(index + 1);
    assignNode(root, label);
  });

  return labels;
};
