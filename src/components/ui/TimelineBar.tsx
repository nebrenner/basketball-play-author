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

  const total = play?.frames.length ?? 0;
  if (!play) return null;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Btn onClick={() => setIndex(Math.max(0, idx - 1))} disabled={idx <= 0}>◀ Prev</Btn>
      <div style={{ color: "#cbd5e1", fontSize: 13 }}>Frame {idx + 1} / {total}</div>
      <Btn onClick={() => setIndex(Math.min(total - 1, idx + 1))} disabled={idx >= total - 1}>Next ▶</Btn>

      <div style={{ flex: 1 }} />
      <Btn onClick={deleteLast} disabled={total <= 1} title="Delete last frame (keeps at least 1)">Delete Last</Btn>
    </div>
  );
};

export default TimelineBar;
