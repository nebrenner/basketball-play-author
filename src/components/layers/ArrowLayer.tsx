import React from "react";
import { Group, Arrow as KArrow, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { usePlayStore } from "../../app/store";
import type { EditorMode } from "../../app/store";
import type { Id, XY, Arrow as ArrowType } from "../../app/types";
import { styleFor } from "../../features/arrows/arrowStyles";

const getKindFromMode = (mode: EditorMode) => {
  if (mode.startsWith("arrow:")) {
    return mode.split(":")[1] as "cut" | "dribble" | "screen" | "pass";
  }
  return null;
};

const ArrowGlyph: React.FC<{ arrow: ArrowType }> = ({ arrow }) => {
  const s = styleFor(arrow.kind);
  const pts: number[] =
    arrow.points.length > 1
      ? arrow.points.flatMap((p) => [p.x, p.y])
      : [];

  // For "screen", you may render a small T-cap near the end; MVP keeps it simple.
  return s.bezier ? (
    <Line points={pts} stroke={s.stroke} strokeWidth={s.strokeWidth} dash={s.dash} tension={0.4} bezier />
  ) : (
    <KArrow
      points={pts}
      stroke={s.stroke}
      fill={s.stroke}
      strokeWidth={s.strokeWidth}
      dash={s.dash}
      pointerLength={s.pointerLength}
      pointerWidth={s.pointerWidth}
    />
  );
};

const ArrowLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const mode = usePlayStore((s) => s.editorMode);

  const beginArrow = usePlayStore((s) => s.beginArrow);
  const updatePreview = usePlayStore((s) => s.updateArrowPreview);
  const commitPoint = usePlayStore((s) => s.commitArrowToPoint);
  const commitToken = usePlayStore((s) => s.commitArrowToToken);
  const cancel = usePlayStore((s) => s.cancelArrow);

  const draft = usePlayStore((s) => s.draftArrow);

  if (!play || !curr) return null;

  const kind = getKindFromMode(mode);

  // Hit-testing: find token under mouse (for pass commit)
  const tokenAt = (xy: XY): Id | null => {
    // cheap O(n) test: distance < radius. Tokens radius (non-ball) ~ 18; ball 12 -> use 20.
    const R = 20;
    for (const t of play.tokens) {
      const p = curr.tokens[t.id];
      if (!p) continue;
      const dx = p.x - xy.x;
      const dy = p.y - xy.y;
      if (dx * dx + dy * dy <= R * R) return t.id;
    }
    return null;
  };

  const pointerPosition = (e: KonvaEventObject<MouseEvent>): XY | null => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x, y: pos.y };
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!kind) return;
    // start only when clicking on a token (source)
    const pos = pointerPosition(e);
    if (!pos) return;

    // find the nearest token under cursor
    const fromId = tokenAt(pos);
    if (!fromId) return;
    beginArrow(kind, fromId, pos);
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!draft.active) return;
    const pos = pointerPosition(e);
    if (!pos) return;
    updatePreview(pos);
  };

  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (!draft.active) return;
    const pos = pointerPosition(e);
    if (!pos) return;

    if (draft.kind === "pass") {
      const toId = tokenAt(pos);
      if (toId) {
        commitToken(toId);
      } else {
        cancel(); // invalid target -> cancel
      }
    } else {
      commitPoint(pos);
    }
  };

  // Attach event handlers to the Konva group so we only listen while in arrow mode
  const eventHandlers = kind
    ? {
        onMouseDown: handleStageMouseDown,
        onMouseMove: handleStageMouseMove,
        onMouseUp: handleStageMouseUp,
      }
    : {};

  // Collect arrows for this frame
  const arrows: ArrowType[] = curr.arrows
    .map((id) => play.arrowsById[id])
    .filter((a): a is ArrowType => !!a);

  return (
    <Group {...eventHandlers}>
      {arrows.map((a) => (
        <ArrowGlyph key={a.id} arrow={a} />
      ))}

      {/* Draft/ghost arrow preview */}
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
