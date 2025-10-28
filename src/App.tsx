import React from "react";
import StageCanvas from "./components/StageCanvas";
import { usePlayStore } from "./app/store";
import "./main.css";
import Toolbar from "./components/ui/Toolbar";
import PlaybackControls from "./components/ui/PlaybackControls";
import TimelineBar from "./components/ui/TimelineBar";

const App: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const init = usePlayStore((s) => s.initDefaultPlay);
  const save = usePlayStore((s) => s.savePlay);
  const list = usePlayStore((s) => s.listLocalPlays);
  const load = usePlayStore((s) => s.loadPlay);

  React.useEffect(() => {
    if (!play) init("Demo Play");
  }, [play, init]);

  return (
    <div className="app-root">
      <header className="app-header" style={{ display: "flex", alignItems: "center", padding: 8 }}>
        <h1 style={{ margin: 0, fontSize: 16 }}>Basketball Play Author (MVP)</h1>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 8,
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={save}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            Save
          </button>
          <select
            onChange={(e) => e.target.value && load(e.target.value)}
            style={{
              background: "#0b1220",
              color: "#e5e7eb",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "4px 6px",
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Load...
            </option>
            {list().map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Toolbar />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 8,
          borderBottom: "1px solid #1e293b",
        }}
      >
        <PlaybackControls />
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <TimelineBar />
        </div>
      </div>

      <main className="app-main">
        <StageCanvas />
      </main>
    </div>
  );
};

export default App;
