import React from "react";
import { Group, Circle, Text } from "react-konva";
import { usePlayStore } from "../../app/store";

const TokenLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const setPos = usePlayStore((s) => s.setTokenPosition);

  if (!play || !curr) return null;

  const possessionId = play.possession ?? "P1";

  return (
    <Group>
      {play.tokens.map((t) => {
        const p = curr.tokens[t.id];
        if (!p) return null;
        const isBall = t.kind === "BALL";
        const radius = isBall ? 12 : 18;
        const fill = isBall ? "#222" : "#2d6cdf";
        const text = t.label;

        return (
          <Group
            key={t.id}
            x={p.x}
            y={p.y}
            draggable={true}
            onDragEnd={(e) => {
              const { x, y } = e.target.position();
              setPos(t.id, { x, y });
            }}
          >
            {/* possession ring for the current handler (optional visual) */}
            {t.id === possessionId && !isBall && (
              <Circle radius={radius + 6} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />
            )}
            <Circle radius={radius} fill={fill} shadowBlur={2} />
            <Text
              text={text}
              align="center"
              verticalAlign="middle"
              width={radius * 2}
              height={radius * 2}
              offsetX={radius}
              offsetY={radius}
              fontSize={isBall ? 14 : 16}
              fill={isBall ? "#f7f7f7" : "#fff"}
              fontStyle="bold"
            />
          </Group>
        );
      })}
    </Group>
  );
};

export default TokenLayer;
