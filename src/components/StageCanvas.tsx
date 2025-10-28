import React from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer } from "react-konva";
import { usePlayStore } from "../app/store";
import type { EditorMode } from "../app/store";
import type { Id, XY, Play, Frame } from "../app/types";
import CourtLayer from "./layers/CourtLayer";
import ArrowLayer from "./layers/ArrowLayer";
import TokenLayer from "./layers/TokenLayer";
import "./../main.css";

const getKindFromMode = (mode: EditorMode) =>
  mode.startsWith("arrow:") ? (mode.split(":")[1] as "cut" | "dribble" | "screen" | "pass") : null;

const pointerPosition = (e: KonvaEventObject<MouseEvent>): XY | null => {
  const stage = e.target.getStage();
  const pos = stage?.getPointerPosition();
  if (!pos) return null;
  return { x: pos.x, y: pos.y };
};

const tokenAt = (xy: XY, play: Play, frame: Frame): Id | null => {
  const R = 20;
  for (const t of play.tokens) {
    const p = frame.tokens[t.id];
    if (!p) continue;
    const dx = p.x - xy.x;
    const dy = p.y - xy.y;
    if (dx * dx + dy * dy <= R * R) return t.id;
  }
  return null;
};

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

  const handleStageMouseDown = React.useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const state = usePlayStore.getState();
      const { editorMode } = state;

      if (editorMode === "select") {
        const target = e.target;
        if (!target || target.name() !== "token-node") {
          state.setSelectedToken(null);
        }
      }

      const kind = getKindFromMode(editorMode);
      if (!kind) return;

      const pos = pointerPosition(e);
      if (!pos) return;

      const play = state.play;
      const curr = state.currentFrame();
      if (!play || !curr) return;

      const fromId = state.selectedTokenId ?? tokenAt(pos, play, curr);
      if (!fromId) return;

      const source = curr.tokens[fromId];
      if (!source) return;

      if (state.selectedTokenId !== fromId) {
        state.setSelectedToken(fromId);
      }

      state.beginArrow(kind, fromId, source);
      state.updateArrowPreview(pos);
    },
    [],
  );

  const handleStageMouseMove = React.useCallback((e: KonvaEventObject<MouseEvent>) => {
    const state = usePlayStore.getState();
    if (!state.draftArrow.active) return;
    const pos = pointerPosition(e);
    if (!pos) return;
    state.updateArrowPreview(pos);
  }, []);

  const handleStageMouseUp = React.useCallback((e: KonvaEventObject<MouseEvent>) => {
    const state = usePlayStore.getState();
    const draft = state.draftArrow;
    if (!draft.active) return;

    const pos = pointerPosition(e);
    if (!pos) {
      state.cancelArrow();
      return;
    }

    const play = state.play;
    const curr = state.currentFrame();
    if (!play || !curr) {
      state.cancelArrow();
      return;
    }

    if (draft.kind === "pass") {
      const toId = tokenAt(pos, play, curr);
      if (toId) {
        state.commitArrowToToken(toId);
      } else {
        state.cancelArrow();
      }
    } else {
      state.commitArrowToPoint(pos);
    }
  }, []);

  const handleStageMouseLeave = React.useCallback(() => {
    const state = usePlayStore.getState();
    if (!state.draftArrow.active) return;
    state.cancelArrow();
  }, []);

  return (
    <div className="canvas-wrap" ref={ref} style={{ height }}>
      <Stage
        width={stageWidth}
        height={stageHeight}
        scale={{ x: scale, y: scale }}
        className="stage-root"
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
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
