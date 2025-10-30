import React from "react";
import { usePlayStore } from "../../app/store";
import type { FrameTreeNode } from "../../features/frames/frameGraph";
import { buildFrameTree } from "../../features/frames/frameGraph";
import { computeStepLabels, formatStepTitle } from "../../features/frames/frameLabels";

const TreeBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  style,
  type = "button",
  ...rest
}) => (
  <button
    {...rest}
    type={type}
    style={{
      width: "100%",
      textAlign: "left",
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #374151",
      background: rest.disabled ? "#1f2937" : "#0b1220",
      color: "#e5e7eb",
      cursor: rest.disabled ? "default" : "pointer",
      fontSize: 13,
      ...style,
    }}
  >
    {children}
  </button>
);

const FrameTreePanel: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const focusFrame = usePlayStore((s) => s.focusFrameById);
  const idx = usePlayStore((s) => s.currentFrameIndex);
  const path = usePlayStore((s) => s.currentBranchPath);

  const currentFrameId = path[idx];
  const pathSet = React.useMemo(() => new Set(path), [path]);
  const stepLabels = React.useMemo(() => computeStepLabels(play), [play]);

  const orderIndex = React.useMemo(() => {
    const entries = new Map<string, number>();
    play?.frames.forEach((frame, index) => {
      entries.set(frame.id, index + 1);
    });
    return entries;
  }, [play]);

  const tree: FrameTreeNode[] = React.useMemo(() => (play ? buildFrameTree(play) : []), [play]);

  const renderTree = (nodes: FrameTreeNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const frame = node.frame;
      const stepId = stepLabels.get(frame.id);
      const defaultId = stepId ?? orderIndex.get(frame.id) ?? depth + 1;
      const label = formatStepTitle(frame, defaultId);
      const isActive = frame.id === currentFrameId;
      const isOnPath = pathSet.has(frame.id);
      const branchCount = frame.nextFrameIds?.length ?? 0;
      const segments = typeof stepId === "string" ? stepId.match(/[a-z]+|\d+/gi) : null;
      const displayDepth = segments ? Math.max(segments.length - 1, 0) : depth;
      return (
        <div key={frame.id} className="frame-tree-item" style={{ marginLeft: displayDepth * 14 }}>
          <TreeBtn
            onClick={() => focusFrame(frame.id)}
            disabled={isActive}
            title={
              isActive
                ? "Currently focused"
                : isOnPath
                  ? "Jump to this frame"
                  : "Follow this branch"
            }
          >
            {isActive ? `● ${label}` : label}
            {branchCount > 1 ? ` (${branchCount})` : ""}
            {isOnPath && !isActive ? " ✓" : ""}
          </TreeBtn>
          {node.children.length > 0 ? <div className="frame-tree-children">{renderTree(node.children, depth + 1)}</div> : null}
        </div>
      );
    });

  if (!play) {
    return null;
  }

  return (
    <div className="frame-tree-panel">
      <div className="frame-tree-header">
        <h2>Frame Tree</h2>
        <span>{play.frames.length} steps</span>
      </div>
      <div className="frame-tree-scroll">
        {tree.length > 0 ? (
          <div className="frame-tree-list">{renderTree(tree)}</div>
        ) : (
          <div className="frame-tree-empty">No frames available.</div>
        )}
      </div>
    </div>
  );
};

export default FrameTreePanel;
