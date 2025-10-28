import React from "react";
import { Stage, Layer } from "react-konva";
import { usePlayStore } from "../app/store";
import CourtLayer from "./layers/CourtLayer";
import ArrowLayer from "./layers/ArrowLayer";
import TokenLayer from "./layers/TokenLayer";
import "./../main.css";

const useContainerSize = () => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const resize = () => {
      if (ref.current) setWidth(ref.current.clientWidth);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return { ref, width };
};

const StageCanvas: React.FC = () => {
  const { ref, width } = useContainerSize();
  const stageWidth = usePlayStore((s) => s.stageWidth);
  const stageHeight = usePlayStore((s) => s.stageHeight);

  // maintain aspect ratio; scale to container width
  const scale = width > 0 ? width / stageWidth : 1;
  const height = stageHeight * scale;

  return (
    <div className="canvas-wrap" ref={ref} style={{ height }}>
      <Stage
        width={stageWidth}
        height={stageHeight}
        scale={{ x: scale, y: scale }}
        className="stage-root"
      >
        <Layer listening={false}>
          <CourtLayer />
        </Layer>

        <Layer>
          <ArrowLayer />
        </Layer>

        <Layer>
          <TokenLayer />
        </Layer>
      </Stage>
    </div>
  );
};

export default StageCanvas;
