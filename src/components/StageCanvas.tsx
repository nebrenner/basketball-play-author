import React from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer } from "react-konva";
import { usePlayStore } from "../app/store";
import type { ArrowKind, XY } from "../app/types";
import CourtLayer from "./layers/CourtLayer";
import ArrowLayer, { ArrowOverlayLayer } from "./layers/ArrowLayer";
import TokenLayer from "./layers/TokenLayer";
import "./../main.css";

const ARROW_LABELS: Record<ArrowKind, string> = {
  cut: "Cut",
  dribble: "Dribble",
  screen: "Screen",
  pass: "Pass",
};

const useContainerSize = () => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const measure = () => setWidth(node.clientWidth);
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === node) {
          const nextWidth = entry.contentRect.width;
          setWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
        }
      });
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

const StageCanvas: React.FC = () => {
  const { ref, width } = useContainerSize();
  const stageWidth = usePlayStore((s) => s.stageWidth);
  const stageHeight = usePlayStore((s) => s.stageHeight);
  const play = usePlayStore((s) => s.play);
  const currentFrame = usePlayStore((s) => s.currentFrame());
  const selectedTokenId = usePlayStore((s) => s.selectedTokenId);
  const setSelectedToken = usePlayStore((s) => s.setSelectedToken);
  const setSelectedArrow = usePlayStore((s) => s.setSelectedArrow);
  const createArrow = usePlayStore((s) => s.createArrow);
  const setStageRef = usePlayStore((s) => s.setStageRef);

  const hasWidth = width > 0;
  const scale = hasWidth ? width / stageWidth : 1;

  const selectedTokenPosition = React.useMemo<XY | null>(() => {
    if (!selectedTokenId || !currentFrame) return null;
    const pos = currentFrame.tokens[selectedTokenId];
    return pos ? { x: pos.x, y: pos.y } : null;
  }, [selectedTokenId, currentFrame]);

  const arrowFromSelected = React.useMemo(() => {
    if (!play || !currentFrame || !selectedTokenId) return null;
    for (const arrowId of currentFrame.arrows) {
      const arrow = play.arrowsById[arrowId];
      if (arrow?.from === selectedTokenId) {
        return arrow;
      }
    }
    return null;
  }, [play, currentFrame, selectedTokenId]);

  const allowedArrowKinds = React.useMemo<ArrowKind[]>(() => {
    if (!play || !selectedTokenId) return [];
    const token = play.tokens.find((t) => t.id === selectedTokenId);
    if (!token) return [];
    const hasBall = play.possession === selectedTokenId;
    return hasBall ? ["dribble", "pass"] : ["cut", "screen"];
  }, [play, selectedTokenId]);

  const isInteractiveTarget = React.useCallback((node: Konva.Node | null) => {
    let current: Konva.Node | null = node;
    while (current) {
      const name = current.name();
      if (name === "token-node" || name === "arrow-group" || name?.startsWith("arrow-")) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }, []);

  const handleStageMouseDown = React.useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isInteractiveTarget(e.target ?? null)) return;
      setSelectedToken(null);
      setSelectedArrow(null);
    },
    [isInteractiveTarget, setSelectedToken, setSelectedArrow],
  );

  const handleStageRef = React.useCallback(
    (node: Konva.Stage | null) => {
      setStageRef(node);
    },
    [setStageRef],
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
        if (state.selectedArrowId || state.selectedTokenId) {
          event.preventDefault();
          state.setSelectedArrow(null);
          state.setSelectedToken(null);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const padding = 8;
  const showArrowMenu = selectedTokenPosition && allowedArrowKinds.length > 0;
  const menuPosition = React.useMemo(() => {
    if (!selectedTokenPosition) return null;
    const left = padding + selectedTokenPosition.x * scale + 16;
    const top = padding + selectedTokenPosition.y * scale - 56;
    return {
      left,
      top: Math.max(padding, top),
    };
  }, [selectedTokenPosition, scale]);

  return (
    <div className="canvas-wrap" ref={ref}>
      {hasWidth ? (
        <>
          <Stage
            width={stageWidth}
            height={stageHeight}
            scale={{ x: scale, y: scale }}
            className="stage-root"
            onMouseDown={handleStageMouseDown}
            ref={handleStageRef}
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

            <Layer listening={false}>
              <ArrowOverlayLayer />
            </Layer>
          </Stage>

          {showArrowMenu && menuPosition && (
            <div className="arrow-menu" style={{ left: menuPosition.left, top: menuPosition.top }}>
              {allowedArrowKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={!!arrowFromSelected}
                  onClick={() => selectedTokenId && createArrow(kind, selectedTokenId)}
                  title={arrowFromSelected ? "Delete the existing arrow to add a new one" : undefined}
                >
                  {ARROW_LABELS[kind]}
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default StageCanvas;
