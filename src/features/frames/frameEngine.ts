import { nanoid } from "nanoid";
import type { Play, Frame, Id, XY, Arrow } from "../../app/types";

const clonePositions = (src: Record<Id, XY>) =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [k, { x: v.x, y: v.y }]));

export function advanceFrame(play: Play, currentIndex: number): Frame | null {
  const curr = play.frames[currentIndex];
  if (!curr) return null;

  const next: Frame = {
    id: nanoid(),
    tokens: clonePositions(curr.tokens),
    arrows: [], // policy: new frame starts with no teaching arrows
  };

  // Apply each arrow in this step to compute next positions
  for (const id of curr.arrows) {
    const a: Arrow | undefined = play.arrowsById[id];
    if (!a) continue;

    if (a.kind === "pass") {
      // move BALL to target token; shift possession to target
      if (a.toTokenId) {
        const toPos = next.tokens[a.toTokenId];
        if (toPos) {
          next.tokens["BALL"] = { x: toPos.x, y: toPos.y };
          // NOTE: possession is kept on Play.meta level; UI can update separately if desired
        }
      }
    } else {
      // cut / dribble / screen move the source token to the endpoint
      if (a.toPoint) {
        next.tokens[a.from] = { x: a.toPoint.x, y: a.toPoint.y };
      }
    }
  }

  return next;
}
