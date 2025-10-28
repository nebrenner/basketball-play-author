import React from "react";
import { Group, Circle, Text } from "react-konva";
import type Konva from "konva";
import { usePlayStore } from "../../app/store";
import { registerTokenNode } from "../../features/tokens/tokenRegistry";
import type { Id, Token, XY } from "../../app/types";

type TokenNodeProps = {
  token: Token;
  position: XY;
  possessionId: Id;
  onDragEnd: (tokenId: Id, xy: XY) => void;
};

const TokenNode: React.FC<TokenNodeProps> = ({ token, position, possessionId, onDragEnd }) => {
  const ref = React.useRef<Konva.Group | null>(null);

  React.useEffect(() => {
    registerTokenNode(token.id, ref.current);
    return () => registerTokenNode(token.id, null);
  }, [token.id]);

  const isBall = token.kind === "BALL";
  const radius = isBall ? 12 : 18;
  const fill = isBall ? "#222" : "#2d6cdf";

  return (
    <Group
      ref={ref}
      x={position.x}
      y={position.y}
      draggable={true}
      onDragEnd={(e) => {
        const { x, y } = e.target.position();
        onDragEnd(token.id, { x, y });
      }}
    >
      {token.id === possessionId && !isBall && (
        <Circle radius={radius + 6} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />
      )}
      <Circle radius={radius} fill={fill} shadowBlur={2} />
      <Text
        text={token.label}
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
};

const TokenLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const setPos = usePlayStore((s) => s.setTokenPosition);

  if (!play || !curr) return null;

  const possessionId = play.possession ?? "P1";

  return (
    <Group>
      {play.tokens.map((token) => {
        const position = curr.tokens[token.id];
        if (!position) return null;
        return (
          <TokenNode
            key={token.id}
            token={token}
            position={position}
            possessionId={possessionId}
            onDragEnd={setPos}
          />
        );
      })}
    </Group>
  );
};

export default TokenLayer;
