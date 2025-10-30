import type { Frame } from "../../app/types";

const clampIndex = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 1);

export const defaultStepTitle = (stepNumber: number): string => `Step ${clampIndex(stepNumber)}`;

export const formatStepTitle = (frame: Frame | null | undefined, stepNumber: number): string => {
  const title = frame?.title?.trim();
  if (title && title.length > 0) {
    return title;
  }
  return defaultStepTitle(stepNumber);
};
