import React from "react";
import { Circle, Group, Line, Rect } from "react-konva";
import { usePlayStore } from "../../app/store";

const makeArcPoints = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  steps = 48,
) => {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = startAngle + ((endAngle - startAngle) * i) / steps;
    pts.push(cx + Math.cos(t) * radius, cy + Math.sin(t) * radius);
  }
  return pts;
};

const mirrorPoints = (points: number[], axisX: number) => {
  const mirrored: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    mirrored.push(2 * axisX - x, y);
  }
  return mirrored;
};

const CourtLayer: React.FC = () => {
  const W = usePlayStore((s) => s.stageWidth);
  const H = usePlayStore((s) => s.stageHeight);
  const courtType = usePlayStore((s) => s.courtType);

  const padding = Math.min(W, H) * 0.04;
  const lineColor = "#bfa57a";
  const surfaceColor = "#f3ead7";

  const courtWidth = W - padding * 2;
  const courtHeight = H - padding * 2;
  const left = padding;
  const top = padding;
  const centerX = left + courtWidth / 2;
  const centerY = top + courtHeight / 2;

  const laneDepth = courtWidth * 0.19;
  const laneWidth = courtHeight * 0.32;
  const laneTop = centerY - laneWidth / 2;
  const freeThrowRadius = laneWidth * 0.35;
  const rimOffset = laneDepth * 0.18;
  const boardOffset = laneDepth * 0.1;
  const hoopRadius = Math.min(courtWidth, courtHeight) * 0.014;
  const boardLength = laneWidth * 0.45;

  const rimXLeft = left + rimOffset;
  const rimXRight = left + courtWidth - rimOffset;
  const freeThrowLineLeft = left + laneDepth;
  const freeThrowLineRight = left + courtWidth - laneDepth;

  const threePointRadius = Math.sqrt((laneDepth - rimOffset) ** 2 + freeThrowRadius ** 2);
  const baselineDy = Math.sqrt(Math.max(threePointRadius ** 2 - rimOffset ** 2, 0));
  const baselineAngle = Math.atan2(baselineDy, -rimOffset);
  const threePointArcLeft = makeArcPoints(rimXLeft, centerY, threePointRadius, -baselineAngle, baselineAngle);
  const threePointArcRight = mirrorPoints(threePointArcLeft, centerX);

  const renderFullCourt = () => (
    <>
      <Line points={[centerX, top, centerX, top + courtHeight]} stroke={lineColor} strokeWidth={2} />
      <Circle x={centerX} y={centerY} radius={courtHeight * 0.16} stroke={lineColor} strokeWidth={2} />

      <Group>
        <Rect
          x={left}
          y={laneTop}
          width={laneDepth}
          height={laneWidth}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Circle x={freeThrowLineLeft} y={centerY} radius={freeThrowRadius} stroke={lineColor} strokeWidth={2} />
        <Line
          points={[left + boardOffset, centerY - boardLength / 2, left + boardOffset, centerY + boardLength / 2]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Circle x={rimXLeft} y={centerY} radius={hoopRadius} stroke={lineColor} strokeWidth={2} fill="#d97706" />
        <Line points={threePointArcLeft} stroke={lineColor} strokeWidth={2} />
      </Group>

      <Group>
        <Rect
          x={left + courtWidth - laneDepth}
          y={laneTop}
          width={laneDepth}
          height={laneWidth}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Circle x={freeThrowLineRight} y={centerY} radius={freeThrowRadius} stroke={lineColor} strokeWidth={2} />
        <Line
          points={[
            left + courtWidth - boardOffset,
            centerY - boardLength / 2,
            left + courtWidth - boardOffset,
            centerY + boardLength / 2,
          ]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Circle x={rimXRight} y={centerY} radius={hoopRadius} stroke={lineColor} strokeWidth={2} fill="#d97706" />
        <Line points={threePointArcRight} stroke={lineColor} strokeWidth={2} />
      </Group>
    </>
  );

  const renderHalfCourt = () => {
    const laneWidthHalf = courtWidth * 0.32;
    const laneLeft = centerX - laneWidthHalf / 2;
    const laneLength = courtHeight * 0.4;
    const rimOffsetHalf = laneLength * 0.18;
    const boardOffsetHalf = laneLength * 0.1;
    const freeThrowRadiusHalf = laneWidthHalf * 0.35;
    const hoopRadiusHalf = hoopRadius;
    const boardLengthHalf = laneWidthHalf * 0.45;

    const rimY = top + rimOffsetHalf;
    const boardY = top + boardOffsetHalf;
    const freeThrowLineY = top + laneLength;

    const threePointRadiusHalf = Math.abs(freeThrowLineY - freeThrowRadiusHalf - rimY);
    const baselineHalfWidth = Math.sqrt(Math.max(threePointRadiusHalf ** 2 - rimOffsetHalf ** 2, 0));
    const startAngle = Math.atan2(-rimOffsetHalf, -baselineHalfWidth);
    const endAngle = Math.atan2(-rimOffsetHalf, baselineHalfWidth);
    const threePointArcHalf = makeArcPoints(centerX, rimY, threePointRadiusHalf, startAngle, endAngle);

    return (
      <>
        <Rect x={laneLeft} y={top} width={laneWidthHalf} height={laneLength} stroke={lineColor} strokeWidth={2} />
        <Circle x={centerX} y={freeThrowLineY} radius={freeThrowRadiusHalf} stroke={lineColor} strokeWidth={2} />
        <Line
          points={[centerX - boardLengthHalf / 2, boardY, centerX + boardLengthHalf / 2, boardY]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Circle x={centerX} y={rimY} radius={hoopRadiusHalf} stroke={lineColor} strokeWidth={2} fill="#d97706" />
        <Line points={threePointArcHalf} stroke={lineColor} strokeWidth={2} />
      </>
    );
  };

  return (
    <Group listening={false}>
      <Rect x={left} y={top} width={courtWidth} height={courtHeight} stroke="#c5a880" strokeWidth={4} fill={surfaceColor} />
      {courtType === "full" ? renderFullCourt() : renderHalfCourt()}
    </Group>
  );
};

export default CourtLayer;
