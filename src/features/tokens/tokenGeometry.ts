import type { XY } from "../../app/types";

export const TOKEN_RADIUS = 18;
export const BALL_RADIUS = 6;
export const BALL_OFFSET_X = TOKEN_RADIUS * 0.85;
export const BALL_OFFSET_Y = -TOKEN_RADIUS * 0.85;

export function ballPositionFor(tokenPosition: XY): XY {
  return {
    x: tokenPosition.x + BALL_OFFSET_X,
    y: tokenPosition.y + BALL_OFFSET_Y,
  };
}
