import React from "react";
import { usePlayStore } from "../../app/store";
import { findFrameById } from "../../features/frames/frameGraph";
import { computeStepLabels, formatStepTitle } from "../../features/frames/frameLabels";

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #374151",
      background: "#0b1220",
      color: "#e5e7eb",
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    {children}
  </button>
);

const TimelineBar: React.FC = () => {
  const idx = usePlayStore((s) => s.currentFrameIndex);
  const path = usePlayStore((s) => s.currentBranchPath);
  const play = usePlayStore((s) => s.play);
  const setIndex = usePlayStore((s) => s.setCurrentFrameIndex);
  const deleteCurrent = usePlayStore((s) => s.deleteLastFrame);
  const advanceFrame = usePlayStore((s) => s.advanceFrame);
  const branchFrame = usePlayStore((s) => s.branchFrame);

  const currentFrameId = path[idx];
  const stepLabels = computeStepLabels(play);

  const orderIndex = new Map<string, number>();
  play?.frames.forEach((frame, index) => {
    orderIndex.set(frame.id, index + 1);
  });

  const pathDescriptors = path.map((frameId, index) => {
    const frame = findFrameById(play, frameId);
    const branchCount = frame?.nextFrameIds?.length ?? 0;
    const defaultId = stepLabels.get(frameId) ?? orderIndex.get(frameId) ?? index + 1;
    const label = formatStepTitle(frame ?? undefined, defaultId);
    return { id: frameId, index, branchCount, label };
  });

  const frameAtCursor = play ? findFrameById(play, currentFrameId) : null;
  const canDeleteCurrent = (() => {
    if (!frameAtCursor) return false;
    if (!frameAtCursor.parentId) return false;
    if (idx !== path.length - 1) return false;
    return (frameAtCursor.nextFrameIds ?? []).length === 0;
  })();

  if (!play || path.length === 0) return null;

  const total = path.length;
  const atFirst = idx <= 0;
  const atLast = idx >= total - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={() => setIndex(0)} disabled={atFirst} title="Jump to first step">
          ⏮ First
        </Btn>
        <Btn onClick={() => setIndex(Math.max(0, idx - 1))} disabled={atFirst}>
          ◀ Prev
        </Btn>
        <div style={{ color: "#cbd5e1", fontSize: 13 }}>Step {idx + 1} / {total}</div>
        <Btn onClick={() => setIndex(Math.min(total - 1, idx + 1))} disabled={atLast}>
          Next ▶
        </Btn>
        <Btn onClick={() => setIndex(Math.max(0, total - 1))} disabled={atLast} title="Jump to last step">
          Last ⏭
        </Btn>

        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            onClick={deleteCurrent}
            disabled={!canDeleteCurrent}
            title={
              canDeleteCurrent
                ? "Delete this step (only allowed for leaf steps)"
                : "Only leaf steps can be deleted"
            }
          >
            Delete Step
          </Btn>
          <Btn onClick={branchFrame} title="Create two new steps branching from the current frame">
            Branch Step ⤴
          </Btn>
          <Btn onClick={advanceFrame} title="Create a new step branching from the current frame">
            New Step ➜
          </Btn>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ color: "#cbd5e1", fontSize: 13 }}>Path:</span>
        {pathDescriptors.map(({ id, index, branchCount, label }) => (
          <Btn
            key={id}
            onClick={() => setIndex(index)}
            disabled={index === idx}
            title={
              branchCount > 1
                ? `${branchCount} branches start from this step`
                : index === idx
                  ? "Currently focused"
                  : "Jump to this step"
            }
          >
            {index === idx ? `● ${label}` : label}
            {branchCount > 1 ? ` (${branchCount})` : ""}
          </Btn>
        ))}
      </div>
    </div>
  );
};

export default TimelineBar;
