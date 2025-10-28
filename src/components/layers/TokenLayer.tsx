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
  onSelect: (tokenId: Id) => void;
  isSelected: boolean;
  draggable: boolean;
};

const TokenNode: React.FC<TokenNodeProps> = ({ token, position, possessionId, onDragEnd, onSelect, isSelected, draggable }) => {
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
      name="token-node"
      draggable={draggable}
      onMouseDown={() => onSelect(token.id)}
      onDragStart={() => onSelect(token.id)}
      onDragEnd={(e) => {
        const { x, y } = e.target.position();
        onDragEnd(token.id, { x, y });
      }}
    >
      {token.id === possessionId && !isBall && (
        <Circle radius={radius + 6} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />
      )}
      {isSelected && (
        <Circle
          radius={radius + 10}
          stroke={isBall ? "#f59e0b" : "#f97316"}
          strokeWidth={2}
          opacity={0.6}
        />
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
  const mode = usePlayStore((s) => s.editorMode);
  const selectedTokenId = usePlayStore((s) => s.selectedTokenId);
  const setSelectedToken = usePlayStore((s) => s.setSelectedToken);

  if (!play || !curr) return null;

  const possessionId = play.possession ?? "P1";
  const draggable = mode === "select";

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
            onSelect={setSelectedToken}
            isSelected={selectedTokenId === token.id}
            draggable={draggable}
          />
        );
      })}
    </Group>
  );
};

export default TokenLayer;
