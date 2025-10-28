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
  const saveCopy = usePlayStore((s) => s.savePlayAsCopy);
  const list = usePlayStore((s) => s.listLocalPlays);
  const load = usePlayStore((s) => s.loadPlay);
  const setPlayName = usePlayStore((s) => s.setPlayName);
  const deletePlay = usePlayStore((s) => s.deletePlay);
  const storageRevision = usePlayStore((s) => s.storageRevision);
  const [plays, setPlays] = React.useState(() => list());

  React.useEffect(() => {
    setPlays(list());
  }, [list, storageRevision]);
  const [selectedPlayId, setSelectedPlayId] = React.useState<string>("");

  React.useEffect(() => {
    if (!play) init("Demo Play");
  }, [play, init]);

  React.useEffect(() => {
    if (!selectedPlayId) return;
    if (!plays.find((p) => p.id === selectedPlayId)) {
      setSelectedPlayId("");
    }
  }, [plays, selectedPlayId]);

  const handleSave = React.useCallback(() => {
    save();
  }, [save]);

  const handleSaveCopy = React.useCallback(() => {
    saveCopy();
  }, [saveCopy]);

  const handleLoad = React.useCallback(() => {
    if (!selectedPlayId) return;
    load(selectedPlayId);
  }, [load, selectedPlayId]);

  const handleDelete = React.useCallback(() => {
    if (!selectedPlayId) return;
    const target = plays.find((p) => p.id === selectedPlayId);
    const name = target?.name || "this play";
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deletePlay(selectedPlayId);
    setSelectedPlayId("");
  }, [deletePlay, plays, selectedPlayId]);

  return (
    <div className="app-root">
      <header className="app-header" style={{ display: "flex", alignItems: "center", padding: 8 }}>
        <h1 style={{ margin: 0, fontSize: 16 }}>Basketball Play Author</h1>
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={play?.meta.name ?? ""}
            onChange={(e) => setPlayName(e.target.value)}
            placeholder="Play name"
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#e5e7eb",
              minWidth: 180,
            }}
          />
          <button
            onClick={handleSave}
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
          <button
            onClick={handleSaveCopy}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            Save Copy
          </button>
          <select
            value={selectedPlayId}
            onChange={(e) => setSelectedPlayId(e.target.value)}
            style={{
              background: "#0b1220",
              color: "#e5e7eb",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "4px 6px",
              minWidth: 160,
            }}
          >
            <option value="" disabled>
              Saved plays
            </option>
            {plays.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || "(untitled play)"}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoad}
            disabled={!selectedPlayId}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: selectedPlayId ? "#0b1220" : "#111827",
              color: "#e5e7eb",
              opacity: selectedPlayId ? 1 : 0.5,
              cursor: selectedPlayId ? "pointer" : "not-allowed",
            }}
          >
            Load
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedPlayId}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #7f1d1d",
              background: selectedPlayId ? "#450a0a" : "#111827",
              color: "#fca5a5",
              opacity: selectedPlayId ? 1 : 0.5,
              cursor: selectedPlayId ? "pointer" : "not-allowed",
            }}
          >
            Delete
          </button>
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
