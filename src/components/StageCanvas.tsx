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
  const dragSeed = React.useRef<{ kind: ArrowKind; fromId: Id; start: XY } | null>(null);

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
      if (!pos) {
        dragSeed.current = null;
        return;
      }

      if (!kind) {
        const play = state.play;
        const curr = state.currentFrame();
        if (play && curr) {
          const clickedTokenId = tokenAt(pos, play, curr);
          if (clickedTokenId) {
            if (state.selectedTokenId !== clickedTokenId) {
              state.setSelectedToken(clickedTokenId);
            }
            dragSeed.current = null;
            return;
          }
        }

        if (!target || (!targetName || !targetName.startsWith("arrow-"))) {
          state.setSelectedToken(null);
          state.setSelectedArrow(null);
        }
        dragSeed.current = null;
        return;
      }

      if (targetName && targetName.startsWith("arrow-")) {
        dragSeed.current = null;
        return;
      }

      const play = state.play;
      const curr = state.currentFrame();
      if (!play || !curr) {
        dragSeed.current = null;
        return;
      }

      const clickedTokenId = tokenAt(pos, play, curr);
      if (clickedTokenId) {
        if (state.selectedTokenId !== clickedTokenId) {
          state.setSelectedToken(clickedTokenId);
        }
        state.setSelectedArrow(null);
      } else {
        state.setSelectedToken(null);
        state.setSelectedArrow(null);
      }

      if (!clickedTokenId) {
        dragSeed.current = null;
        return;
      }

      if (!ensureArrowPermissions(kind, clickedTokenId, play.possession, play)) {
        dragSeed.current = null;
        return;
      }

      const source = curr.tokens[clickedTokenId];
      if (!source) {
        dragSeed.current = null;
        return;
      }

      dragSeed.current = { kind, fromId: clickedTokenId, start: source };
      state.beginArrow(kind, clickedTokenId, source);
      state.startArrowDrag();
      state.updateArrowPreview(source);
    },
    [ensureArrowPermissions],
  );

  const handleStageMouseMove = React.useCallback((e: KonvaEventObject<MouseEvent>) => {
    const state = usePlayStore.getState();
    const pos = pointerPosition(e);
    if (!pos) return;

    const draft = state.draftArrow;
    if (draft.active) {
      state.updateArrowPreview(pos);
      return;
    }
  }, []);

  const handleStageMouseUp = React.useCallback((e: KonvaEventObject<MouseEvent>) => {
    const state = usePlayStore.getState();
    const draft = state.draftArrow;
    if (!draft.active) {
      dragSeed.current = null;
      return;
    }

    const pos = pointerPosition(e);
    if (!pos) {
      state.cancelArrow();
      dragSeed.current = null;
      return;
    }

    const play = state.play;
    const curr = state.currentFrame();
    if (!play || !curr) {
      state.cancelArrow();
      dragSeed.current = null;
      return;
    }

    const start = dragSeed.current?.start ?? draft.points[0];
    const minDistanceSq = 9;

    if (draft.kind === "pass") {
      const toId = tokenAt(pos, play, curr);
      if (toId && toId !== draft.fromTokenId) {
        state.updateArrowPreview(pos);
        state.commitArrowToToken(toId);
      } else {
        state.cancelArrow();
      }
    } else {
      if (start) {
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistanceSq) {
          state.cancelArrow();
          dragSeed.current = null;
          return;
        }
      }
      state.updateArrowPreview(pos);
      state.commitArrowToPoint(pos);
    }
    dragSeed.current = null;
  }, []);

  const handleStageMouseLeave = React.useCallback(() => {
    const state = usePlayStore.getState();
    if (state.draftArrow.active) {
      state.cancelArrow();
    }
    dragSeed.current = null;
  }, []);

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
