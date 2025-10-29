import React from "react";
import { usePlayStore } from "../../app/store";

const Toolbar: React.FC = () => {
  const courtType = usePlayStore((s) => s.courtType);
  const setCourtType = usePlayStore((s) => s.setCourtType);
  const tokens = usePlayStore((s) => s.play?.tokens ?? []);
  const possessionId = usePlayStore((s) => {
    const play = s.play;
    if (!play) return null;
    const frame = play.frames[s.currentFrameIndex];
    return frame?.possession ?? play.possession ?? null;
  });
  const setPossession = usePlayStore((s) => s.setPossession);

  const handlePossessionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPossession(value ? value : null);
  };

  const possessionValue = possessionId ?? "";

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#cbd5e1", fontSize: 13 }}>
        <span>Ball Handler</span>
        <select
          value={possessionValue}
          onChange={handlePossessionChange}
          style={{
            background: "#0b1220",
            color: "#e5e7eb",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 13,
            minWidth: 120,
          }}
        >
          <option value="">-- Choose Player --</option>
          {tokens.map((token) => (
            <option key={token.id} value={token.id}>
              {token.label}
            </option>
          ))}
        </select>
      </div>

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
    </div>
  );
};

export default Toolbar;
