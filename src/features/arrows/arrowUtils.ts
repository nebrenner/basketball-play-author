import type { Arrow, Frame, XY } from "../../app/types";

const clonePoint = (point: XY): XY => ({ x: point.x, y: point.y });

const midpoint = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const CONTROL_EPSILON = 0.5;

const controlMatchesMidpoint = (start: XY, control: XY, end: XY): boolean => {
  const mid = midpoint(start, end);
  return Math.abs(control.x - mid.x) <= CONTROL_EPSILON && Math.abs(control.y - mid.y) <= CONTROL_EPSILON;
};

export const hasCustomCurve = (points: XY[]): boolean => {
  if (points.length < 3) return false;
  const start = points[0];
  const control = points[1];
  const end = points[points.length - 1];
  if (!start || !control || !end) return false;
  return !controlMatchesMidpoint(start, control, end);
};

export const getActiveArrows = (frame: Frame, arrowsById: Record<string, Arrow>): Arrow[] => {
  return frame.arrows
    .map((arrowId) => arrowsById[arrowId])
    .filter((arrow): arrow is Arrow => Boolean(arrow));
};

export const isPassArrow = (arrow: Arrow): boolean => arrow.kind === "pass";

export const buildArrowPath = (
  arrow: Arrow,
  opts: { start?: XY | null; end?: XY | null } = {}
): XY[] => {
  const startOverride = opts.start ?? null;
  const endOverride = opts.end ?? null;

  const base = arrow.points.length ? arrow.points.map(clonePoint) : [];
  const usesCustomCurve = hasCustomCurve(arrow.points);

  if (base.length === 0) {
    if (startOverride && endOverride) {
      return [clonePoint(startOverride), midpoint(startOverride, endOverride), clonePoint(endOverride)];
    }
    return base;
  }

  if (startOverride) {
    base[0] = clonePoint(startOverride);
  }

  if (endOverride) {
    base[base.length - 1] = clonePoint(endOverride);
  }

  if (base.length === 1) {
    if (startOverride && (base[0].x !== startOverride.x || base[0].y !== startOverride.y)) {
      base.unshift(clonePoint(startOverride));
    }
    if (endOverride && (base[base.length - 1].x !== endOverride.x || base[base.length - 1].y !== endOverride.y)) {
      base.push(clonePoint(endOverride));
    }
  }

  if (base.length >= 2) {
    const first = base[0];
    const last = base[base.length - 1];
    if (base.length === 2) {
      base.splice(1, 0, midpoint(first, last));
      return base;
    }

    if (!usesCustomCurve) {
      base[1] = midpoint(first, last);
    }

    return base;
  }

  if (startOverride && endOverride) {
    return [clonePoint(startOverride), midpoint(startOverride, endOverride), clonePoint(endOverride)];
  }

  return base;
};
