import React from "react";
import { Group, Circle, Text } from "react-konva";
import type Konva from "konva";
import { usePlayStore } from "../../app/store";
import { registerTokenNode } from "../../features/tokens/tokenRegistry";
import type { Id, Token, XY } from "../../app/types";

type TokenNodeProps = {
  token: Token;
  position: XY;
  possessionId: Id | null;
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

  const radius = 18;
  const fill = "#2d6cdf";
  const hasBall = possessionId === token.id;

  return (
    <Group
      ref={ref}
      x={position.x}
      y={position.y}
      name="token-node"
      draggable={draggable}
      onMouseDown={(ev) => {
        ev.cancelBubble = true;
        onSelect(token.id);
      }}
      onDragStart={(ev) => {
        ev.cancelBubble = true;
        onSelect(token.id);
      }}
      onDragEnd={(e) => {
        const { x, y } = e.target.position();
        onDragEnd(token.id, { x, y });
      }}
    >
      {isSelected && (
        <Circle
          radius={radius + 10}
          stroke="#f97316"
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
        fontSize={16}
        fill="#fff"
        fontStyle="bold"
      />
      {hasBall && (
        <Circle
          radius={6}
          x={radius * 0.85}
          y={-radius * 0.85}
          fill="#f59e0b"
          stroke="#fef08a"
          strokeWidth={1}
        />
      )}
    </Group>
  );
};

const TokenLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const setPos = usePlayStore((s) => s.setTokenPosition);
  const selectedTokenId = usePlayStore((s) => s.selectedTokenId);
  const setSelectedToken = usePlayStore((s) => s.setSelectedToken);

  if (!play || !curr) return null;

  const possessionId = play.possession ?? null;
  const draggable = true;

  return (
    <Group>
      {play.tokens.map((token) => {
        if (token.kind === "BALL") return null;
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
