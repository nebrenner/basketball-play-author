import React from "react";
import StageCanvas from "./components/StageCanvas";
import FrameMetadataEditor from "./components/ui/FrameMetadataEditor";
import FrameNoteEditor from "./components/ui/FrameNoteEditor";
import FrameTreePanel from "./components/ui/FrameTreePanel";
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
  const importPlayData = usePlayStore((s) => s.importPlayData);
  const hasUnsavedChanges = usePlayStore((s) => s.hasUnsavedChanges);
  const [plays, setPlays] = React.useState(() => list());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmDiscardChanges = React.useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm("You have unsaved changes. Continue without saving?");
  }, [hasUnsavedChanges]);

  const handleSave = React.useCallback(() => {
    save();
  }, [save]);

  const handleSaveCopy = React.useCallback(() => {
    const newId = saveCopy();
    if (newId) {
      setSelectedPlayId(newId);
    }
  }, [saveCopy, setSelectedPlayId]);

  const handleLoad = React.useCallback(() => {
    if (!selectedPlayId) return;
    if (!confirmDiscardChanges()) return;
    load(selectedPlayId);
  }, [confirmDiscardChanges, load, selectedPlayId]);

  const handleDelete = React.useCallback(() => {
    if (!selectedPlayId) return;
    const target = plays.find((p) => p.id === selectedPlayId);
    const name = target?.name || "this play";
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deletePlay(selectedPlayId);
    setSelectedPlayId("");
  }, [deletePlay, plays, selectedPlayId]);

  const handleExport = React.useCallback(() => {
    if (!play) return;
    const serialized = JSON.stringify(play, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safeName = play.meta.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, "")
      .replace(/\s+/g, "-");
    const filename = `${safeName || "play"}.json`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [play]);

  const handleImportClick = React.useCallback(() => {
    if (!confirmDiscardChanges()) return;
    fileInputRef.current?.click();
  }, [confirmDiscardChanges]);

  const handleCreateNew = React.useCallback(() => {
    if (!confirmDiscardChanges()) return;
    init();
    setSelectedPlayId("");
  }, [confirmDiscardChanges, init]);

  const handleImport = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === "string" ? reader.result : "";
          const data = JSON.parse(text);
          const ok = importPlayData(data);
          if (!ok) {
            window.alert("Import failed. Please ensure the file is a valid exported play.");
          }
        } catch (error) {
          console.error("Import failed:", error);
          window.alert("Import failed. Please ensure the file is a valid exported play.");
        } finally {
          event.target.value = "";
        }
      };
      reader.onerror = (err) => {
        console.error("Import failed:", err);
        window.alert("Import failed while reading the file.");
        event.target.value = "";
      };
      reader.readAsText(file);
    },
    [importPlayData],
  );

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
          <button
            onClick={handleCreateNew}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            New Play
          </button>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Snap: On</span>
          <button
            onClick={handleExport}
            disabled={!play}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: play ? "#0b1220" : "#111827",
              color: "#e5e7eb",
              opacity: play ? 1 : 0.5,
              cursor: play ? "pointer" : "not-allowed",
            }}
          >
            Export
          </button>
          <button
            onClick={handleImportClick}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImport}
          />
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
        <div className="play-surface">
          <FrameMetadataEditor />
          <div className="play-layout">
            <div className="play-main">
              <StageCanvas />
              <FrameNoteEditor />
            </div>
            <FrameTreePanel />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
