import React from "react";
import { Group, Rect, Line, Circle } from "react-konva";
import { usePlayStore } from "../../app/store";

const CourtLayer: React.FC = () => {
  const W = usePlayStore((s) => s.stageWidth);
  const H = usePlayStore((s) => s.stageHeight);

  // Minimal half-court guide: outer rect, midline, center circle
  const padding = 20;

  return (
    <Group listening={false}>
      <Rect
        x={padding}
        y={padding}
        width={W - padding * 2}
        height={H - padding * 2}
        stroke="#c5a880"
        strokeWidth={4}
        cornerRadius={8}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: H }}
        fillLinearGradientColorStops={[0, "#f7f0e1", 1, "#f3ead7"]}
      />
      <Line
        points={[W / 2, padding, W / 2, H - padding]}
        stroke="#bfa57a"
        dash={[8, 8]}
        strokeWidth={2}
      />
      <Circle
        x={W / 2}
        y={H / 2}
        radius={H * 0.1}
        stroke="#bfa57a"
        strokeWidth={2}
      />
    </Group>
  );
};

export default CourtLayer;
