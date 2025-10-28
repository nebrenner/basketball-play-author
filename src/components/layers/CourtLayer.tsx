import React from "react";
import { Group, Rect, Line, Circle, Arc } from "react-konva";
import { usePlayStore } from "../../app/store";

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

  const padding = 20;
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

    const laneDepth = halfCourtLength * 0.65;
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

    const laneMarkLength = laneDepth * 0.08;
    const blockWidth = laneDepth * 0.06;
    const blockHeight = laneHeight * 0.08;
    const blockOffset = laneHeight * 0.3;
    const dashPositions = [0.5, 0.7, 0.9].map((ratio) => laneTop + laneHeight * ratio);
    const blockPositions = [
      laneTop + blockOffset - blockHeight / 2,
      laneTop + laneHeight - blockOffset - blockHeight / 2,
    ];

    const threePointRadius = courtHeight * 0.38;
    const threePointBreak = courtWidth * 0.12;
    const cornerDistance = threePointBreak - rimOffset;
    const cosTheta = clamp(cornerDistance / threePointRadius, -1, 1);
    const theta = Math.acos(cosTheta);
    const cornerYOffset = Math.sin(theta) * threePointRadius;
    const topY = centerY - cornerYOffset;
    const bottomY = centerY + cornerYOffset;

    const threePointArcPoints = makeArcPoints(
      rimX,
      centerY,
      threePointRadius,
      -theta,
      theta,
      64,
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
          innerRadius={freeThrowRadius - 1}
          outerRadius={freeThrowRadius + 1}
          angle={180}
          rotation={side === "left" ? 90 : -90}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Arc
          x={freeThrowLineX}
          y={centerY}
          innerRadius={freeThrowRadius - 1}
          outerRadius={freeThrowRadius + 1}
          angle={180}
          rotation={side === "left" ? -90 : 90}
          stroke={lineColor}
          strokeWidth={2}
          dash={[10, 6]}
        />
        {dashPositions.map((y) => (
          <React.Fragment key={`${side}-dash-${y}`}>
            <Line
              points={[laneX - laneMarkLength, y, laneX, y]}
              stroke={lineColor}
              strokeWidth={2}
            />
            <Line
              points={[laneX + laneDepth, y, laneX + laneDepth + laneMarkLength, y]}
              stroke={lineColor}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
        {blockPositions.map((blockY, idx) => (
          <React.Fragment key={`${side}-block-${idx}`}>
            <Rect
              x={laneX - blockWidth}
              y={blockY}
              width={blockWidth}
              height={blockHeight}
              fill="#f7e8c8"
              stroke={lineColor}
              strokeWidth={2}
            />
            <Rect
              x={laneX + laneDepth}
              y={blockY}
              width={blockWidth}
              height={blockHeight}
              fill="#f7e8c8"
              stroke={lineColor}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
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
        <Line
          points={[baselineX + interiorDir * threePointBreak, topY, baselineX + interiorDir * threePointBreak, bottomY]}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Line points={threePointArcPoints} stroke={lineColor} strokeWidth={2} />
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
    const threePointRadiusHalf = courtWidth * 0.38;
    const threePointCenterY = blockYs[0] + halfBlockHeight;
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
    //const breakY = baselineY + threePointBreakHalf;
    //const sinTheta = clamp((breakY - rimY) / threePointRadiusHalf, -1, 1);
    //const theta = Math.asin(sinTheta);
    //const cornerXOffset = Math.cos(theta) * threePointRadiusHalf;

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
          innerRadius={freeThrowRadiusHalf - 1}
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
          innerRadius={freeThrowRadiusHalf - 1}
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
          <Circle x={W / 2} y={centerY} radius={courtHeight * 0.18} stroke={lineColor} strokeWidth={2} />
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
