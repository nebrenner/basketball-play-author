import type { ArrowKind } from "../../app/types";

export const styleFor = (kind: ArrowKind) => {
  switch (kind) {
    case "cut":
      return { stroke: "#eab308", strokeWidth: 3, dash: undefined as number[] | undefined, pointerLength: 12, pointerWidth: 12, bezier: false };
    case "dribble":
      return { stroke: "#22d3ee", strokeWidth: 3, dash: [8, 8], pointerLength: 12, pointerWidth: 12, bezier: false };
    case "screen":
      // draw as solid line with arrowhead; add T-cap separately if desired
      return { stroke: "#86efac", strokeWidth: 3, dash: undefined, pointerLength: 12, pointerWidth: 12, bezier: false };
    case "pass":
      // curved dashed arc
      return { stroke: "#f472b6", strokeWidth: 3, dash: [12, 8], pointerLength: 12, pointerWidth: 12, bezier: true };
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(`Unhandled arrow kind: ${exhaustiveCheck}`);
    }
  }
};
