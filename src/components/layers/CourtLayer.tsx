import React from "react";
import { Group, Rect, Line, Circle, Arc } from "react-konva";
import { usePlayStore } from "../../app/store";
import { COURT_PADDING } from "../../constants/court";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const makeArcPoints = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  steps = 48,
  dirX = 1,
  dirY = 1,
) => {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = startAngle + ((endAngle - startAngle) * i) / steps;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    pts.push(cx + cos * radius * dirX, cy + sin * radius * dirY);
  }
  return pts;
};

const CourtLayer: React.FC = () => {
  const W = usePlayStore((s) => s.stageWidth);
  const H = usePlayStore((s) => s.stageHeight);
  const courtType = usePlayStore((s) => s.courtType);

  const padding = COURT_PADDING;
  const lineColor = "#bfa57a";
  const courtWidth = W - padding * 2;
  const courtHeight = H - padding * 2;
  const left = padding;
  const top = padding;
  const centerX = left + courtWidth / 2;
  const centerY = top + courtHeight / 2;

  const rimRadius = 11;

  const renderFullKey = (side: "left" | "right") => {
    const baselineX = side === "left" ? left : left + courtWidth;
    const interiorDir = side === "left" ? 1 : -1;
    const halfCourtLength = courtWidth / 2;

    const laneDepth = halfCourtLength * 0.55;
    const laneHeight = courtHeight * 0.26;
    const laneTop = centerY - laneHeight / 2;
    const laneX = side === "left" ? baselineX : baselineX - laneDepth;
    const freeThrowLineX = baselineX + interiorDir * laneDepth;

    const rimOffset = courtWidth * 0.06;
    const boardOffset = courtWidth * 0.045;
    const rimX = baselineX + interiorDir * rimOffset;
    const boardX = baselineX + interiorDir * boardOffset;
    const boardHeight = courtHeight * 0.1;

    const freeThrowRadius = laneHeight * 0.5;
    const laneMarkLength = laneHeight * 0.08;
    const dashPositions = [0.5, 0.7, 0.9].map(
      (ratio) => baselineX + interiorDir * laneDepth * ratio,
    );
    const blockThickness = laneHeight * 0.06;
    const blockLength = laneDepth * 0.08;
    const blockOffset = laneDepth * 0.3;
    const blockCenterX = baselineX + interiorDir * blockOffset;
    const blockStartX = blockCenterX - blockLength / 2;
    const threePointCenterX = blockCenterX + interiorDir * (blockLength / 2);
    const threePointRadius =
      Math.abs(freeThrowLineX - threePointCenterX) + freeThrowRadius;
    const topThreeY = clamp(centerY - threePointRadius, top, top + courtHeight);
    const bottomThreeY = clamp(
      centerY + threePointRadius,
      top,
      top + courtHeight,
    );
    const threePointArcPoints = makeArcPoints(
      threePointCenterX,
      centerY,
      threePointRadius,
      -Math.PI / 2,
      Math.PI / 2,
      48,
      interiorDir,
      1,
    );

    return (
      <Group key={side}>
        <Rect
          x={laneX}
          y={laneTop}
          width={laneDepth}
          height={laneHeight}
          stroke={lineColor}
          strokeWidth={2}
          cornerRadius={6}
          fill="#f7e8c8"
          opacity={0.8}
        />
        <Line
          points={[freeThrowLineX, laneTop, freeThrowLineX, laneTop + laneHeight]}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Arc
          x={freeThrowLineX}
          y={centerY}
          innerRadius={freeThrowRadius}
          outerRadius={0}
          angle={180}
          rotation={side === "right" ? 90 : -90}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Arc
          x={freeThrowLineX}
          y={centerY}
          innerRadius={freeThrowRadius}
          outerRadius={0}
          angle={180}
          rotation={side === "right" ? -90 : 90}
          stroke={lineColor}
          strokeWidth={2}
          dash={[10, 6]}
        />
        <Line
          points={[boardX, centerY - boardHeight / 2, boardX, centerY + boardHeight / 2]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Line
          points={[boardX, centerY, rimX - interiorDir * rimRadius, centerY]}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Circle x={rimX} y={centerY} radius={rimRadius} stroke={lineColor} strokeWidth={3} fill="#d97706" />
        {dashPositions.map((x) => (
          <React.Fragment key={`full-dash-${side}-${x}`}>
            <Line
              points={[x, laneTop - laneMarkLength, x, laneTop]}
              stroke={lineColor}
              strokeWidth={2}
            />
            <Line
              points={[x, laneTop + laneHeight, x, laneTop + laneHeight + laneMarkLength]}
              stroke={lineColor}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
        <Rect
          x={blockStartX}
          y={laneTop - blockThickness}
          width={blockLength}
          height={blockThickness}
          fill="#f7e8c8"
          stroke={lineColor}
          strokeWidth={2}
        />
        <Rect
          x={blockStartX}
          y={laneTop + laneHeight}
          width={blockLength}
          height={blockThickness}
          fill="#f7e8c8"
          stroke={lineColor}
          strokeWidth={2}
        />
        <Line
          points={threePointArcPoints}
          stroke={lineColor}
          strokeWidth={2}
          closed={false}
          lineCap="round"
        />
        <Line
          points={[baselineX, topThreeY, threePointCenterX, topThreeY]}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Line
          points={[baselineX, bottomThreeY, threePointCenterX, bottomThreeY]}
          stroke={lineColor}
          strokeWidth={2}
        />
      </Group>
    );
  };

  const renderHalfCourt = () => {
    const baselineY = top;
    const laneWidthHalf = courtWidth * 0.26;
    const laneLeft = centerX - laneWidthHalf / 2;
    const laneLength = courtHeight * 0.65;
    const freeThrowLineY = baselineY + laneLength;
    const rimY = baselineY + courtWidth * 0.06;
    const boardY = baselineY + courtWidth * 0.045;
    const boardWidth = courtWidth * 0.1;
    const freeThrowRadiusHalf = laneWidthHalf * 0.5;
    const laneMarkLength = laneWidthHalf * 0.08;
    const verticalDashPositions = [0.5, 0.7, 0.9].map((ratio) => baselineY + laneLength * ratio);
    const halfBlockWidth = laneWidthHalf * 0.06;
    const halfBlockHeight = laneLength * 0.08;
    const halfBlockOffset = laneLength * 0.3;
    const blockYs = [
      baselineY + halfBlockOffset - halfBlockHeight / 2
    ];
    const threePointCenterY = blockYs[0] + halfBlockHeight;
    const threePointRadiusHalf = baselineY + laneLength - threePointCenterY + freeThrowRadiusHalf;
    const leftThreeX = centerX - threePointRadiusHalf;
    const rightThreeX = centerX + threePointRadiusHalf;

    const startAngle = Math.PI;
    const endAngle = 0;

    const threePointArcPoints = makeArcPoints(
      centerX,
      threePointCenterY,
      threePointRadiusHalf,
      startAngle,
      endAngle
    );

    return (
      <Group>
        <Line points={[left, baselineY, left + courtWidth, baselineY]} stroke={lineColor} strokeWidth={2} />
        <Rect
          x={laneLeft}
          y={baselineY}
          width={laneWidthHalf}
          height={laneLength}
          stroke={lineColor}
          strokeWidth={2}
          cornerRadius={6}
          fill="#f7e8c8"
          opacity={0.8}
        />
        <Line
          points={[laneLeft, freeThrowLineY, laneLeft + laneWidthHalf, freeThrowLineY]}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Arc
          x={centerX}
          y={freeThrowLineY}
          innerRadius={freeThrowRadiusHalf}
          outerRadius={0}
          angle={180}
          rotation={180}
          stroke={lineColor}
          strokeWidth={2}
          dash={[10, 10]}
        />
        <Arc
          x={centerX}
          y={freeThrowLineY}
          innerRadius={freeThrowRadiusHalf}
          outerRadius={0}
          angle={180}
          rotation={0}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Line points={threePointArcPoints} stroke={lineColor} strokeWidth={2} closed={false} lineCap="round" />
        <Line points={[leftThreeX, baselineY, leftThreeX, threePointCenterY]} stroke={lineColor} strokeWidth={2} />
        <Line points={[rightThreeX, baselineY, rightThreeX, threePointCenterY]} stroke={lineColor} strokeWidth={2} />
        {verticalDashPositions.map((y) => (
          <React.Fragment key={`half-dash-${y}`}>
            <Line
              points={[laneLeft - laneMarkLength, y, laneLeft, y]}
              stroke={lineColor}
              strokeWidth={2}
            />
            <Line
              points={[laneLeft + laneWidthHalf, y, laneLeft + laneWidthHalf + laneMarkLength, y]}
              stroke={lineColor}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
        {blockYs.map((blockY, idx) => (
          <React.Fragment key={`half-block-${idx}`}>
            <Rect
              x={laneLeft - halfBlockWidth}
              y={blockY}
              width={halfBlockWidth}
              height={halfBlockHeight}
              fill="#f7e8c8"
              stroke={lineColor}
              strokeWidth={2}
            />
            <Rect
              x={laneLeft + laneWidthHalf}
              y={blockY}
              width={halfBlockWidth}
              height={halfBlockHeight}
              fill="#f7e8c8"
              stroke={lineColor}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
        <Line
          points={[centerX - boardWidth/2, boardY, centerX + boardWidth/2, boardY]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Line points={[centerX, boardY, centerX, rimY - rimRadius]} stroke={lineColor} strokeWidth={2} />
        <Circle x={centerX} y={rimY} radius={rimRadius} stroke={lineColor} strokeWidth={3} fill="#d97706" />
      </Group>
    );
  };

  return (
    <Group listening={false}>
      <Rect
        x={left}
        y={top}
        width={courtWidth}
        height={courtHeight}
        stroke="#c5a880"
        strokeWidth={4}
        cornerRadius={8}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: H }}
        fillLinearGradientColorStops={[0, "#f7f0e1", 1, "#f3ead7"]}
      />

      {courtType === "full" ? (
        <>
          <Line points={[W / 2, top, W / 2, top + courtHeight]} stroke={lineColor} strokeWidth={2} />
          <Circle x={W / 2} y={centerY} radius={courtHeight * 0.1} stroke={lineColor} strokeWidth={2} />
          {renderFullKey("left")}
          {renderFullKey("right")}
        </>
      ) : (
        renderHalfCourt()
      )}
    </Group>
  );
};

export default CourtLayer;
