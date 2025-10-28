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

const PlaybackControls: React.FC = () => {
  const isPlaying = usePlayStore((s) => s.isPlaying);
  const play = usePlayStore((s) => s.playAnimation);
  const pause = usePlayStore((s) => s.pauseAnimation);
  const step = usePlayStore((s) => s.stepForward);
  const speed = usePlayStore((s) => s.speed);
  const setSpeed = usePlayStore((s) => s.setSpeed);
  const canStep = usePlayStore((s) => {
    const p = s.play;
    const i = s.currentFrameIndex;
    return !!p && i < p.frames.length - 1;
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #1e293b" }}>
      {!isPlaying ? (
        <Btn onClick={play} title="Play">Play ▶</Btn>
      ) : (
        <Btn onClick={pause} title="Pause">Pause ⏸</Btn>
      )}
      <Btn onClick={step} disabled={!canStep} title="Step one frame">Step ➜</Btn>

      <div style={{ width: 1, height: 20, background: "#1e293b", margin: "0 8px" }} />

      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
        Speed
        <select
          value={String(speed)}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{ background: "#0b1220", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 6, padding: "4px 6px"}}
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
      </label>
    </div>
  );
};

export default PlaybackControls;
