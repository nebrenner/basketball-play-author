import React from "react";
import { usePlayStore } from "../../app/store";
import { exportAnimationAsVideo, exportCurrentFrameAsImage } from "../../features/export/exporters";

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
  const canExport = usePlayStore((s) => Boolean(s.stageRef && s.play && s.play.frames.length > 0));
  const [pending, setPending] = React.useState<null | "image" | "video">(null);

  const handleExportImage = React.useCallback(async () => {
    if (pending) return;
    setPending("image");
    try {
      await exportCurrentFrameAsImage();
    } catch (error) {
      console.error("Failed to export image", error);
    } finally {
      setPending(null);
    }
  }, [pending]);

  const handleExportVideo = React.useCallback(async () => {
    if (pending) return;
    setPending("video");
    try {
      await exportAnimationAsVideo();
    } catch (error) {
      console.error("Failed to export video", error);
    } finally {
      setPending(null);
    }
  }, [pending]);
  const canStep = usePlayStore((s) => {
    const path = s.currentBranchPath;
    const i = s.currentFrameIndex;
    return path.length > 0 && i < path.length - 1;
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      <Btn
        onClick={handleExportImage}
        disabled={!canExport || pending !== null}
        title="Download the current frame as a PNG"
      >
        Export Image
      </Btn>

      <Btn
        onClick={handleExportVideo}
        disabled={!canExport || pending !== null}
        title="Record the full animation as a WebM video"
      >
        Export Video
      </Btn>
    </div>
  );
};

export default PlaybackControls;
