import React from "react";
import { usePlayStore } from "../../app/store";

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
  const play = usePlayStore((s) => s.play);
  const setIndex = usePlayStore((s) => s.setCurrentFrameIndex);
  const deleteLast = usePlayStore((s) => s.deleteLastFrame);
  const advanceFrame = usePlayStore((s) => s.advanceFrame);

  const total = play?.frames.length ?? 0;
  if (!play) return null;
  const atFirst = idx <= 0;
  const atLast = idx >= total - 1;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Btn onClick={() => setIndex(0)} disabled={atFirst} title="Jump to first frame">
        ⏮ First
      </Btn>
      <Btn onClick={() => setIndex(Math.max(0, idx - 1))} disabled={atFirst}>
        ◀ Prev
      </Btn>
      <div style={{ color: "#cbd5e1", fontSize: 13 }}>Frame {idx + 1} / {total}</div>
      <Btn onClick={() => setIndex(Math.min(total - 1, idx + 1))} disabled={atLast}>
        Next ▶
      </Btn>
      <Btn onClick={() => setIndex(Math.max(0, total - 1))} disabled={atLast} title="Jump to last frame">
        Last ⏭
      </Btn>

      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={deleteLast} disabled={total <= 1} title="Delete last frame (keeps at least 1)">
          Delete Last
        </Btn>
        <Btn onClick={advanceFrame} title="Advance to next frame by applying current arrows">
          Next Step ➜
        </Btn>
      </div>
    </div>
  );
};

export default TimelineBar;
