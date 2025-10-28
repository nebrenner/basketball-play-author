import Konva from "konva";
import { getTokenNode } from "../tokens/tokenRegistry";
import type { Id, XY } from "../../app/types";

export type PlayStepMove = { id: Id; from: XY; to: XY; path?: XY[] };

export type PlayStepSpec = {
  moves: PlayStepMove[];
  durationMs: number;
  ballMove?: { from: XY; to: XY; path?: XY[] } | null;
};

const clonePoint = (point: XY): XY => ({ x: point.x, y: point.y });

const sanitisePath = (path: XY[] | undefined, from: XY, to: XY): XY[] | null => {
  if (!path || path.length < 2) return null;
  const normalised = path.map(clonePoint);
  normalised[0] = clonePoint(from);
  normalised[normalised.length - 1] = clonePoint(to);
  if (normalised.length === 2) {
    normalised.splice(1, 0, {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    });
  }
  return normalised;
};

const deCasteljau = (points: XY[], t: number): XY => {
  if (points.length === 1) {
    return points[0];
  }
  const next: XY[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    next.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
    });
  }
  return deCasteljau(next, t);
};

export function tweenMove(id: Id, from: XY, to: XY, durationMs: number, path?: XY[]): Promise<void> {
  const node = getTokenNode(id);
  if (!node) return Promise.resolve(); // nothing to animate
  // ensure starting pos (in case of drift)
  node.position({ x: from.x, y: from.y });

  const normalisedPath = sanitisePath(path, from, to);
  if (!normalisedPath) {
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

  return new Promise<void>((resolve) => {
    const layer = node.getLayer();
    if (!layer) {
      node.position({ x: to.x, y: to.y });
      resolve();
      return;
    }

    const duration = Math.max(10, durationMs);
    const animation = new Konva.Animation((frame) => {
      const time = Math.min(duration, frame.time ?? 0);
      const progress = duration === 0 ? 1 : Math.min(1, time / duration);
      const pos = deCasteljau(normalisedPath, progress);
      node.position({ x: pos.x, y: pos.y });
      if (progress >= 1) {
        animation.stop();
        node.position({ x: to.x, y: to.y });
        resolve();
      }
    }, layer);

    animation.start();
  });
}

// Run a play step: tween all moved tokens concurrently, then resolve.
export async function runPlayStep(spec: PlayStepSpec): Promise<void> {
  const promises = spec.moves.map((m) => tweenMove(m.id, m.from, m.to, spec.durationMs, m.path));
  if (spec.ballMove) {
    promises.push(tweenMove("BALL", spec.ballMove.from, spec.ballMove.to, spec.durationMs, spec.ballMove.path));
  }
  await Promise.all(promises);
}
