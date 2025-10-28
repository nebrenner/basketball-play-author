import React from "react";
import StageCanvas from "./components/StageCanvas";
import { usePlayStore } from "./app/store";
import "./main.css";
import Toolbar from "./components/ui/Toolbar";

const App: React.FC = () => {
  const play = usePlayStore((s) => s.play);
  const init = usePlayStore((s) => s.initDefaultPlay);

  React.useEffect(() => {
    if (!play) init("Demo Play");
  }, [play, init]);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Basketball Play Author (MVP)</h1>
      </header>
      <Toolbar />
      <main className="app-main">
        <StageCanvas />
      </main>
    </div>
  );
};

export default App;
