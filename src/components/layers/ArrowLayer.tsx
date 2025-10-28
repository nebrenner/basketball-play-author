import React from "react";
import { Group, Arrow as KArrow, Line, Circle, Rect, Text } from "react-konva";
import { usePlayStore } from "../../app/store";
import type { Arrow as ArrowType, Id, XY, Frame, Play } from "../../app/types";
import { styleFor } from "../../features/arrows/arrowStyles";

const toFlatPoints = (points: XY[]): number[] => points.flatMap((p) => [p.x, p.y]);

const ArrowGlyph: React.FC<{ arrow: ArrowType; emphasize?: boolean }> = ({ arrow, emphasize }) => {
  const s = styleFor(arrow.kind);
  const pts: number[] = arrow.points.length > 1 ? toFlatPoints(arrow.points) : [];

  const common = {
    stroke: s.stroke,
    strokeWidth: emphasize ? s.strokeWidth + 1.5 : s.strokeWidth,
    dash: s.dash,
  } as const;

  return s.bezier ? (
    <Line
      name="arrow-shape"
      points={pts}
      {...common}
      bezier
      tension={0.4}
      shadowBlur={emphasize ? 8 : 0}
      shadowColor={s.stroke}
    />
  ) : (
    <KArrow
      name="arrow-shape"
      points={pts}
      {...common}
      fill={s.stroke}
      pointerLength={s.pointerLength}
      pointerWidth={s.pointerWidth}
      shadowBlur={emphasize ? 8 : 0}
      shadowColor={s.stroke}
    />
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
  if (arrow.toPoint) return arrow.toPoint;
  if (arrow.toTokenId) {
    const target = frame.tokens[arrow.toTokenId];
    if (target) return target;
  }
  const last = arrow.points[arrow.points.length - 1];
  return last ?? null;
};

const ArrowLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const draft = usePlayStore((s) => s.draftArrow);
  const selectedArrowId = usePlayStore((s) => s.selectedArrowId);
  const setSelectedArrow = usePlayStore((s) => s.setSelectedArrow);
  const updateArrowEndpoint = usePlayStore((s) => s.updateArrowEndpoint);
  const deleteArrow = usePlayStore((s) => s.deleteArrow);
  const editorMode = usePlayStore((s) => s.editorMode);

  if (!play || !curr) return null;

  const arrows: ArrowType[] = curr.arrows
    .map((id) => play.arrowsById[id])
    .filter((a): a is ArrowType => !!a);

  const handleSelect = (id: Id) => {
    setSelectedArrow(id);
  };

  const canEditArrow = (arrow: ArrowType) => arrow.kind !== "pass" && editorMode === "select";

  return (
    <Group>
      {arrows.map((arrow) => {
        const isSelected = arrow.id === selectedArrowId;
        const start = getArrowStart(arrow, curr, play);
        const end = getArrowEnd(arrow, curr);
        const canEdit = canEditArrow(arrow);
        const handlePoint = end ?? undefined;
        const midPoint = start && end ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : null;

        return (
          <Group
            key={arrow.id}
            name="arrow-group"
            onMouseDown={(ev) => {
              ev.cancelBubble = true;
              handleSelect(arrow.id);
            }}
          >
            <ArrowGlyph arrow={arrow} emphasize={isSelected} />

            {handlePoint && (
              <Circle
                name="arrow-handle"
                x={handlePoint.x}
                y={handlePoint.y}
                radius={6}
                fill={isSelected ? "#f8fafc" : "#cbd5f5"}
                stroke="#1e293b"
                strokeWidth={1}
                draggable={canEdit}
                onMouseDown={(ev) => {
                  ev.cancelBubble = true;
                  handleSelect(arrow.id);
                }}
                onDragMove={(ev) => {
                  if (!canEdit) return;
                  updateArrowEndpoint(arrow.id, { x: ev.target.x(), y: ev.target.y() });
                }}
                onDragEnd={(ev) => {
                  if (!canEdit) return;
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

      {draft.active && (
        <ArrowGlyph
          arrow={{
            id: "__draft__",
            from: draft.fromTokenId,
            toPoint: undefined,
            toTokenId: undefined,
            kind: draft.kind,
            points: draft.points,
          }}
        />
      )}
    </Group>
  );
};

export default ArrowLayer;
