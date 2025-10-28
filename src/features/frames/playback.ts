import Konva from "konva";
import { getTokenNode } from "../tokens/tokenRegistry";
import type { Id, XY } from "../../app/types";

export type PlayStepSpec = {
  moves: Array<{ id: Id; from: XY; to: XY }>;
  durationMs: number;
  ballMove?: { from: XY; to: XY } | null;
};

export function tweenMove(id: Id, from: XY, to: XY, durationMs: number): Promise<void> {
  const node = getTokenNode(id);
  if (!node) return Promise.resolve(); // nothing to animate
  // ensure starting pos (in case of drift)
  node.position({ x: from.x, y: from.y });

  return new Promise<void>((resolve) => {
    const tween = new Konva.Tween({
      node,
      x: to.x,
      y: to.y,
      duration: Math.max(0.01, durationMs / 1000),
      easing: Konva.Easings.EaseInOut,
      onFinish: () => resolve(),
    });
    tween.play();
  });
}

// Run a play step: tween all moved tokens concurrently, then resolve.
export async function runPlayStep(spec: PlayStepSpec): Promise<void> {
  const promises = spec.moves.map((m) => tweenMove(m.id, m.from, m.to, spec.durationMs));
  if (spec.ballMove) {
    promises.push(tweenMove("BALL", spec.ballMove.from, spec.ballMove.to, spec.durationMs));
  }
  await Promise.all(promises);
}
