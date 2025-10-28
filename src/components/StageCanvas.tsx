import React from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer } from "react-konva";
import { usePlayStore } from "../app/store";
import type { EditorMode } from "../app/store";
import type { Id, XY, Play, Frame, ArrowKind } from "../app/types";
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

  const ensureArrowPermissions = React.useCallback(
    (kind: ArrowKind, tokenId: Id, possessionId: Id | undefined, play: Play): boolean => {
      const token = play.tokens.find((t) => t.id === tokenId);
      if (!token || token.kind === "BALL") return false;
      const hasBall = possessionId === tokenId;
      if (kind === "pass" || kind === "dribble") {
        return hasBall;
      }
      return !hasBall;
    },
    [],
  );

  const handleStageMouseDown = React.useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const state = usePlayStore.getState();
      const { editorMode } = state;

      const kind = getKindFromMode(editorMode);
      const target = e.target;
      const targetName = target?.name();
      const pos = pointerPosition(e);
      if (!pos) return;

      if (!kind) {
        const play = state.play;
        const curr = state.currentFrame();
        if (play && curr) {
          const clickedTokenId = tokenAt(pos, play, curr);
          if (clickedTokenId) {
            if (state.selectedTokenId !== clickedTokenId) {
              state.setSelectedToken(clickedTokenId);
            }
            state.setSelectedArrow(null);
            return;
          }
        }

        if (!target || !targetName || !targetName.startsWith("arrow-")) {
          state.setSelectedToken(null);
          state.setSelectedArrow(null);
        }
        return;
      }

      if (targetName && targetName.startsWith("arrow-")) {
        state.setSelectedArrow(targetName.replace("arrow-", ""));
        return;
      }

      const play = state.play;
      const curr = state.currentFrame();
      if (!play || !curr) {
        return;
      }

      const fromTokenId = state.selectedTokenId;
      const clickedTokenId = tokenAt(pos, play, curr);

      if (!fromTokenId) {
        if (clickedTokenId) {
          state.setSelectedToken(clickedTokenId);
          state.setSelectedArrow(null);
        }
        return;
      }

      if (!ensureArrowPermissions(kind, fromTokenId, play.possession, play)) {
        return;
      }

      const source = curr.tokens[fromTokenId];
      if (!source) {
        return;
      }

      if (kind === "pass") {
        const toTokenId = clickedTokenId;
        if (!toTokenId || toTokenId === fromTokenId) {
          return;
        }

        state.beginArrow(kind, fromTokenId, source);
        state.startArrowDrag();
        const targetPos = curr.tokens[toTokenId];
        if (targetPos) {
          state.updateArrowPreview(targetPos);
        }
        state.commitArrowToToken(toTokenId);
        return;
      }

      const dx = pos.x - source.x;
      const dy = pos.y - source.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 9) {
        return;
      }

      state.beginArrow(kind, fromTokenId, source);
      state.startArrowDrag();
      state.updateArrowPreview(pos);
      state.commitArrowToPoint(pos);
    },
    [ensureArrowPermissions],
  );

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const { selectedArrowId, deleteArrow } = usePlayStore.getState();
        if (selectedArrowId) {
          event.preventDefault();
          deleteArrow(selectedArrowId);
        }
      }
      if (event.key === "Escape") {
        const state = usePlayStore.getState();
        if (state.draftArrow.active) {
          state.cancelArrow();
        } else if (state.selectedArrowId) {
          state.setSelectedArrow(null);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="canvas-wrap" ref={ref} style={{ height }}>
      <Stage
        width={stageWidth}
        height={stageHeight}
        scale={{ x: scale, y: scale }}
        className="stage-root"
        onMouseDown={handleStageMouseDown}
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
