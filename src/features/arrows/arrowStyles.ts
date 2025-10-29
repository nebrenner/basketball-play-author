import type { ArrowKind } from "../../app/types";

export type ArrowStyle = {
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  /** Whether the main glyph should include an arrow head. */
  drawPointer: boolean;
  pointerLength?: number;
  pointerWidth?: number;
  /** Optional decorative T-cap dimensions for screen arrows. */
  tCap?: { width: number; offset: number };
  /** Optional path effects (e.g. dribble wave). */
  pathEffect?: "wavy";
};

export const styleFor = (kind: ArrowKind): ArrowStyle => {
  switch (kind) {
    case "cut":
      return {
        stroke: "#000000",
        strokeWidth: 3,
        dash: undefined,
        drawPointer: true,
        pointerLength: 12,
        pointerWidth: 12,
      };
    case "dribble":
      return {
        stroke: "#000000",
        strokeWidth: 3,
        dash: undefined,
        drawPointer: true,
        pointerLength: 12,
        pointerWidth: 12,
        pathEffect: "wavy",
      };
    case "screen":
      return {
        stroke: "#000000",
        strokeWidth: 3,
        dash: undefined,
        drawPointer: false,
        tCap: { width: 28, offset: 0 },
      };
    case "pass":
      return {
        stroke: "#000000",
        strokeWidth: 3,
        dash: [2, 10],
        drawPointer: true,
        pointerLength: 12,
        pointerWidth: 12,
      };
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(`Unhandled arrow kind: ${exhaustiveCheck}`);
    }
  }
};
