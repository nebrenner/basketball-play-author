import React from "react";
import { usePlayStore } from "../../app/store";

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active, children, ...rest }) => (
  <button
    {...rest}
    style={{
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #374151",
      background: active ? "#1f2937" : "#0b1220",
      color: "#e5e7eb",
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    {children}
  </button>
);

const Toolbar: React.FC = () => {
  const mode = usePlayStore((s) => s.editorMode);
  const setMode = usePlayStore((s) => s.setMode);
  const next = usePlayStore((s) => s.advanceFrame);
  const snap = usePlayStore((s) => s.snapToGrid);
  const setSnap = usePlayStore((s) => s.setSnap);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #1e293b" }}>
      <Btn active={mode === "select"} onClick={() => setMode("select")}>Select</Btn>
      <Btn active={mode === "arrow:cut"} onClick={() => setMode("arrow:cut")}>Cut</Btn>
      <Btn active={mode === "arrow:dribble"} onClick={() => setMode("arrow:dribble")}>Dribble</Btn>
      <Btn active={mode === "arrow:screen"} onClick={() => setMode("arrow:screen")}>Screen</Btn>
      <Btn active={mode === "arrow:pass"} onClick={() => setMode("arrow:pass")}>Pass</Btn>

      <div style={{ width: 1, height: 20, background: "#1e293b", margin: "0 8px" }} />

      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
        <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
        Snap
      </label>

      <div style={{ flex: 1 }} />

      <Btn onClick={next} title="Advance to next frame by applying current arrows">Next Step ➜</Btn>
    </div>
  );
};

export default Toolbar;
