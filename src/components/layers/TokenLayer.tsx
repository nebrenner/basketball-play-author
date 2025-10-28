import React from "react";
import { Group, Circle, Text } from "react-konva";
import type Konva from "konva";
import { usePlayStore } from "../../app/store";
import { registerTokenNode } from "../../features/tokens/tokenRegistry";
import type { Id, Token, XY } from "../../app/types";
import { BALL_RADIUS, TOKEN_RADIUS, ballPositionFor } from "../../features/tokens/tokenGeometry";

type TokenNodeProps = {
  token: Token;
  position: XY;
  onDragEnd: (tokenId: Id, xy: XY) => void;
  onSelect: (tokenId: Id) => void;
  isSelected: boolean;
  draggable: boolean;
};

const TokenNode: React.FC<TokenNodeProps> = ({ token, position, onDragEnd, onSelect, isSelected, draggable }) => {
  const ref = React.useRef<Konva.Group | null>(null);

  React.useEffect(() => {
    registerTokenNode(token.id, ref.current);
    return () => registerTokenNode(token.id, null);
  }, [token.id]);

  const radius = TOKEN_RADIUS;
  const fill = "#2d6cdf";

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
    </Group>
  );
};

const BallOverlay: React.FC<{ position: XY | null }> = ({ position }) => {
  const ref = React.useRef<Konva.Circle | null>(null);

  React.useEffect(() => {
    registerTokenNode("BALL", ref.current);
    return () => registerTokenNode("BALL", null);
  }, []);

  const point = position ? ballPositionFor(position) : null;

  return (
    <Circle
      ref={ref}
      radius={BALL_RADIUS}
      x={point?.x ?? 0}
      y={point?.y ?? 0}
      visible={!!position}
      fill="#f59e0b"
      stroke="#fef08a"
      strokeWidth={1}
      shadowBlur={4}
      listening={false}
    />
  );
};

const TokenLayer: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const curr = usePlayStore((s) => s.currentFrame());
  const setPos = usePlayStore((s) => s.setTokenPosition);
  const selectedTokenId = usePlayStore((s) => s.selectedTokenId);
  const setSelectedToken = usePlayStore((s) => s.setSelectedToken);

  if (!play || !curr) return null;

  const possessionId = curr.possession ?? play.possession ?? null;
  const ballPosition = possessionId ? curr.tokens[possessionId] ?? null : null;
  const draggable = true;

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
            onDragEnd={setPos}
            onSelect={setSelectedToken}
            isSelected={selectedTokenId === token.id}
            draggable={draggable}
          />
        );
      })}
      <BallOverlay position={ballPosition} />
    </Group>
  );
};

export default TokenLayer;
