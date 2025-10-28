import React from "react";
import { Group, Arrow as KArrow, Line } from "react-konva";
import { usePlayStore } from "../../app/store";
import type { Arrow as ArrowType } from "../../app/types";
import { styleFor } from "../../features/arrows/arrowStyles";

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
  const draft = usePlayStore((s) => s.draftArrow);

  if (!play || !curr) return null;

  // Collect arrows for this frame
  const arrows: ArrowType[] = curr.arrows
    .map((id) => play.arrowsById[id])
    .filter((a): a is ArrowType => !!a);

  return (
    <Group>
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
