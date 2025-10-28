import React from "react";
import { usePlayStore } from "../../app/store";

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active, children, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled}
    style={{
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #374151",
      background: disabled ? "#111827" : active ? "#1f2937" : "#0b1220",
      color: disabled ? "#64748b" : "#e5e7eb",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 13,
      opacity: disabled ? 0.5 : 1,
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
  const courtType = usePlayStore((s) => s.courtType);
  const setCourtType = usePlayStore((s) => s.setCourtType);
  const selectedTokenId = usePlayStore((s) => s.selectedTokenId);
  const play = usePlayStore((s) => s.play);

  const possessionId = play?.possession ?? null;
  const selectedToken = React.useMemo(
    () => play?.tokens.find((t) => t.id === selectedTokenId) ?? null,
    [play, selectedTokenId],
  );
  const isPlayer = selectedToken && selectedToken.kind !== "BALL";
  const hasBall = isPlayer && selectedTokenId === possessionId;
  const canCutOrScreen = isPlayer && !hasBall;
  const canDribbleOrPass = isPlayer && !!hasBall;
  const possessionLabel = React.useMemo(() => {
    if (!play || !play.possession) return "—";
    const token = play.tokens.find((t) => t.id === play.possession);
    return token?.label ?? play.possession;
  }, [play]);

  const handleMode = (nextMode: typeof mode, allowed: boolean) => {
    if (!allowed) return;
    setMode(nextMode);
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #1e293b" }}>
      <Btn active={mode === "select"} onClick={() => setMode("select")}>Select</Btn>
      <Btn
        active={mode === "arrow:cut"}
        disabled={!canCutOrScreen}
        onClick={() => handleMode("arrow:cut", !!canCutOrScreen)}
      >
        Cut
      </Btn>
      <Btn
        active={mode === "arrow:dribble"}
        disabled={!canDribbleOrPass}
        onClick={() => handleMode("arrow:dribble", !!canDribbleOrPass)}
      >
        Dribble
      </Btn>
      <Btn
        active={mode === "arrow:screen"}
        disabled={!canCutOrScreen}
        onClick={() => handleMode("arrow:screen", !!canCutOrScreen)}
      >
        Screen
      </Btn>
      <Btn
        active={mode === "arrow:pass"}
        disabled={!canDribbleOrPass}
        onClick={() => handleMode("arrow:pass", !!canDribbleOrPass)}
      >
        Pass
      </Btn>

      {play && (
        <span style={{ color: "#cbd5e1", fontSize: 12, paddingLeft: 4 }}>
          Ball: {possessionLabel}
        </span>
      )}

      <div style={{ width: 1, height: 20, background: "#1e293b", margin: "0 8px" }} />

      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
        <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
        Snap
      </label>

      <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
        <span>Court</span>
        <select
          value={courtType}
          onChange={(e) => setCourtType(e.target.value as typeof courtType)}
          style={{
            background: "#0b1220",
            color: "#e5e7eb",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 13,
          }}
        >
          <option value="half">Half Court</option>
          <option value="full">Full Court</option>
        </select>
      </div>

      <div style={{ flex: 1 }} />

      <Btn onClick={next} title="Advance to next frame by applying current arrows">Next Step ➜</Btn>
    </div>
  );
};

export default Toolbar;
