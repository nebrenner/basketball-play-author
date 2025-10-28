import React from "react";
import { Group, Rect, Line, Circle, Arc } from "react-konva";
import { usePlayStore } from "../../app/store";

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
  const centerY = top + courtHeight / 2;

  const laneDepth = courtWidth * 0.19;
  const laneHeight = courtHeight * 0.32;
  const laneTop = centerY - laneHeight / 2;
  const freeThrowRadius = courtHeight * 0.12;
  const restrictedRadius = courtHeight * 0.08;
  const rimOffset = laneDepth * 0.28;
  const boardOffset = laneDepth * 0.18;
  const rimRadius = 8;

  const renderKey = (side: "left" | "right") => {
    const baselineX = side === "left" ? left : left + courtWidth;
    const laneX = side === "left" ? baselineX : baselineX - laneDepth;
    const freeThrowLineX = side === "left" ? baselineX + laneDepth : baselineX - laneDepth;
    const rimX = baselineX + (side === "left" ? rimOffset : -rimOffset);
    const boardX = baselineX + (side === "left" ? boardOffset : -boardOffset);
    const frontRotation = side === "left" ? 90 : -90;
    const backRotation = side === "left" ? -90 : 90;
    const supportPoints =
      side === "left"
        ? [boardX, centerY, rimX - rimRadius, centerY]
        : [boardX, centerY, rimX + rimRadius, centerY];

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
          rotation={frontRotation}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Arc
          x={freeThrowLineX}
          y={centerY}
          innerRadius={freeThrowRadius - 1}
          outerRadius={freeThrowRadius + 1}
          angle={180}
          rotation={backRotation}
          stroke={lineColor}
          strokeWidth={2}
          dash={[10, 6]}
        />
        <Arc
          x={rimX}
          y={centerY}
          innerRadius={restrictedRadius - 1}
          outerRadius={restrictedRadius + 1}
          angle={180}
          rotation={frontRotation}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Line
          points={[boardX, centerY - 22, boardX, centerY + 22]}
          stroke={lineColor}
          strokeWidth={3}
        />
        <Line points={supportPoints} stroke={lineColor} strokeWidth={2} />
        <Circle x={rimX} y={centerY} radius={rimRadius} stroke={lineColor} strokeWidth={3} fill="#d97706" />
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
          {renderKey("left")}
        </>
      ) : (
        <>
          <Line points={[left, top, left, top + courtHeight]} stroke={lineColor} strokeWidth={2} dash={[10, 6]} />
          <Arc
            x={left}
            y={centerY}
            innerRadius={courtHeight * 0.18 - 1}
            outerRadius={courtHeight * 0.18 + 1}
            angle={180}
            rotation={-90}
            stroke={lineColor}
            strokeWidth={2}
          />
        </>
      )}

      {renderKey("right")}
    </Group>
  );
};

export default CourtLayer;
