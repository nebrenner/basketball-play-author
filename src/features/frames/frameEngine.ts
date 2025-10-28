import { nanoid } from "nanoid";
import type { Play, Frame, Id, XY, Arrow } from "../../app/types";

const clonePositions = (src: Record<Id, XY>) =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, { x: v.x, y: v.y }]));

export function advanceFrame(play: Play, currentIndex: number): Frame | null {
  const curr = play.frames[currentIndex];
  if (!curr) return null;

  const currPossession = curr.possession ?? play.possession;

  const next: Frame = {
    id: nanoid(),
    tokens: clonePositions(curr.tokens),
    arrows: [], // policy: new frame starts with no teaching arrows
    possession: currPossession,
  };

  let nextPossession: Id | undefined = currPossession;

  // Apply each arrow in this step to compute next positions
  for (const id of curr.arrows) {
    const a: Arrow | undefined = play.arrowsById[id];
    if (!a) continue;

    if (a.kind === "pass") {
      if (a.toTokenId && next.tokens[a.toTokenId]) {
        nextPossession = a.toTokenId;
      } else if (a.toPoint) {
        nextPossession = undefined;
      }
      continue;
    }

    // cut / dribble / screen move the source token to the endpoint
    if (a.toPoint) {
      next.tokens[a.from] = { x: a.toPoint.x, y: a.toPoint.y };
    }
  }

  next.possession = nextPossession;

  return next;
}
