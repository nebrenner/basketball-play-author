import React from "react";
import { Group, Arrow as KArrow, Line, Circle, Rect, Text } from "react-konva";
import { usePlayStore } from "../../app/store";
import type { Arrow as ArrowType, Id, XY, Frame, Play } from "../../app/types";
import { styleFor } from "../../features/arrows/arrowStyles";
import { buildArrowPath, hasCustomCurve } from "../../features/arrows/arrowUtils";

const toFlatPoints = (points: XY[]): number[] => points.flatMap((p) => [p.x, p.y]);

const toBezierRenderablePoints = (points: XY[]): XY[] => {
  if (points.length !== 3) return points;
  const [start, control, end] = points;
  const control1 = {
    x: start.x + (control.x - start.x) * (2 / 3),
    y: start.y + (control.y - start.y) * (2 / 3),
  };
  const control2 = {
    x: end.x + (control.x - end.x) * (2 / 3),
    y: end.y + (control.y - end.y) * (2 / 3),
  };
  return [start, control1, control2, end];
};

const WAVY_SAMPLE_SPACING = 18;
const WAVY_AMPLITUDE = 6;

const applyWavyEffect = (points: XY[]): XY[] => {
  if (points.length < 2) return points;

  const samples: XY[] = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.hypot(dx, dy);
    if (segmentLength === 0) continue;

    const steps = Math.max(2, Math.round(segmentLength / WAVY_SAMPLE_SPACING));
    const nx = -dy / segmentLength;
    const ny = dx / segmentLength;

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = prev.x + dx * t;
      const y = prev.y + dy * t;
      accumulated += segmentLength / steps;
      const offset = Math.sin((accumulated / WAVY_SAMPLE_SPACING) * Math.PI) * WAVY_AMPLITUDE;
      samples.push({ x: x + nx * offset, y: y + ny * offset });
    }
  }

  // Ensure the final sample matches the original end point precisely.
  samples[samples.length - 1] = points[points.length - 1];

  return samples;
};

const ArrowGlyph: React.FC<{ arrow: ArrowType; emphasize?: boolean; points: XY[] }> = ({ arrow, emphasize, points }) => {
  const s = styleFor(arrow.kind);
  const curved = hasCustomCurve(points);
  const renderable = curved
    ? toBezierRenderablePoints(points)
    : points.length >= 2
      ? [points[0], points[points.length - 1]]
      : points;

  const withEffects = s.pathEffect === "wavy" && !curved ? applyWavyEffect(renderable) : renderable;
  const pts: number[] = withEffects.length > 1 ? toFlatPoints(withEffects) : [];

  const strokeWidth = emphasize ? s.strokeWidth + 1.5 : s.strokeWidth;
  const common = {
    stroke: s.stroke,
    strokeWidth,
    dash: s.dash,
    shadowBlur: emphasize ? 8 : 0,
    shadowColor: s.stroke,
  } as const;

  if (s.drawPointer) {
    const useBezier = curved && withEffects.length > 2 && s.pathEffect !== "wavy";
    return (
      <KArrow
        name="arrow-shape"
        points={pts}
        {...common}
        fill={s.stroke}
        pointerLength={s.pointerLength ?? 12}
        pointerWidth={s.pointerWidth ?? 12}
        bezier={useBezier}
      />
    );
  }

  const tDecoration = () => {
    if (!s.tCap || withEffects.length < 2) return null;
    const tip = withEffects[withEffects.length - 1];
    const prev = withEffects[withEffects.length - 2];
    const dx = tip.x - prev.x;
    const dy = tip.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const crossCenter = {
      x: tip.x - ux * s.tCap.offset,
      y: tip.y - uy * s.tCap.offset,
    };
    const halfWidth = s.tCap.width / 2;
    return (
      <Line
        name="arrow-screen-cap"
        points={[
          crossCenter.x + nx * halfWidth,
          crossCenter.y + ny * halfWidth,
          crossCenter.x - nx * halfWidth,
          crossCenter.y - ny * halfWidth,
        ]}
        {...common}
      />
    );
  };

  return (
    <>
      <Line name="arrow-shape" points={pts} {...common} />
      {tDecoration()}
    </>
  );
};

const getArrowStart = (arrow: ArrowType, frame: Frame, play: Play): XY | null => {
  const fromToken = frame.tokens[arrow.from];
  if (fromToken) return fromToken;
  const firstPoint = arrow.points[0];
  if (firstPoint) return firstPoint;
  const tokenMeta = play.tokens.find((t) => t.id === arrow.from);
  if (tokenMeta && frame.tokens[tokenMeta.id]) return frame.tokens[tokenMeta.id]!;
  return null;
};

const getArrowEnd = (arrow: ArrowType, frame: Frame): XY | null => {
  if (arrow.toTokenId) {
    const target = frame.tokens[arrow.toTokenId];
    if (target) return target;
  }
  if (arrow.toPoint) return arrow.toPoint;
  const last = arrow.points[arrow.points.length - 1];
  return last ?? null;
};

const ArrowLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const selectedArrowId = usePlayStore((s) => s.selectedArrowId);
  const setSelectedArrow = usePlayStore((s) => s.setSelectedArrow);
  const updateArrowEndpoint = usePlayStore((s) => s.updateArrowEndpoint);
  const updateArrowControlPoint = usePlayStore((s) => s.updateArrowControlPoint);
  const deleteArrow = usePlayStore((s) => s.deleteArrow);

  if (!play || !curr) return null;

  const arrows: ArrowType[] = curr.arrows
    .map((id) => play.arrowsById[id])
    .filter((a): a is ArrowType => !!a);

  const handleSelect = (id: Id) => {
    setSelectedArrow(id);
  };

  return (
    <Group>
      {arrows.map((arrow) => {
        const isSelected = arrow.id === selectedArrowId;
        const start = getArrowStart(arrow, curr, play);
        const end = getArrowEnd(arrow, curr);
        const renderPoints = buildArrowPath(arrow, { start, end });
        const endPoint = renderPoints[renderPoints.length - 1];
        const controlPoint = renderPoints.length >= 3 ? renderPoints[1] : null;
        const midPoint =
          start && end
            ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
            : null;

        return (
          <Group
            key={arrow.id}
            name="arrow-group"
            onMouseDown={(ev) => {
              ev.cancelBubble = true;
              handleSelect(arrow.id);
            }}
          >
            <ArrowGlyph arrow={arrow} emphasize={isSelected} points={renderPoints} />

            {controlPoint && (
              <Circle
                name="arrow-curve-handle"
                x={controlPoint.x}
                y={controlPoint.y}
                radius={6}
                fill={isSelected ? "#fcd34d" : "#fde68a"}
                stroke="#b45309"
                strokeWidth={1}
                draggable={isSelected}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  handleSelect(arrow.id);
                }}
                onDragMove={(ev) => {
                  updateArrowControlPoint(arrow.id, { x: ev.target.x(), y: ev.target.y() });
                }}
                onDragEnd={(ev) => {
                  updateArrowControlPoint(arrow.id, { x: ev.target.x(), y: ev.target.y() });
                }}
              />
            )}

            {endPoint && (
              <Circle
                name="arrow-handle"
                x={endPoint.x}
                y={endPoint.y}
                radius={6}
                fill={isSelected ? "#f8fafc" : "#cbd5f5"}
                stroke="#1e293b"
                strokeWidth={1}
                draggable={isSelected}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  handleSelect(arrow.id);
                }}
                onDragMove={(ev) => {
                  updateArrowEndpoint(arrow.id, { x: ev.target.x(), y: ev.target.y() });
                }}
                onDragEnd={(ev) => {
                  updateArrowEndpoint(arrow.id, { x: ev.target.x(), y: ev.target.y() });
                }}
              />
            )}

            {isSelected && midPoint && (
              <Group
                name="arrow-delete"
                x={midPoint.x + 12}
                y={midPoint.y - 12}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  deleteArrow(arrow.id);
                }}
              >
                <Rect width={48} height={24} fill="rgba(15,23,42,0.85)" cornerRadius={6} stroke="#ef4444" strokeWidth={1} />
                <Text
                  width={48}
                  height={24}
                  text="Delete"
                  align="center"
                  verticalAlign="middle"
                  fill="#fca5a5"
                  fontSize={12}
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
};

export default ArrowLayer;
