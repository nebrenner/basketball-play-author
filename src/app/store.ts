import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Play, Token, Frame, Id, XY } from "./types";

export type EditorMode =
  | "select"
  | "arrow:cut"
  | "arrow:dribble"
  | "arrow:screen"
  | "arrow:pass"
  | "pan";

type StoreState = {
  // constants for stage logical size
  stageWidth: number;
  stageHeight: number;

  play: Play | null;
  editorMode: EditorMode;
  currentFrameIndex: number;

  // selectors
  currentFrame(): Frame | null;

  // actions
  setMode: (mode: EditorMode) => void;
  initDefaultPlay: (name?: string) => void;
  setTokenPosition: (tokenId: Id, xy: XY) => void;
};

const makeDefaultTokens = (): Token[] => [
  { id: "P1", kind: "P1", label: "1" },
  { id: "P2", kind: "P2", label: "2" },
  { id: "P3", kind: "P3", label: "3" },
  { id: "P4", kind: "P4", label: "4" },
  { id: "P5", kind: "P5", label: "5" },
  { id: "BALL", kind: "BALL", label: "●" },
];

// simple spread of initial positions across the half court
const defaultPositions = (W: number, H: number): Record<Id, XY> => ({
  P1: { x: W * 0.2, y: H * 0.6 },
  P2: { x: W * 0.35, y: H * 0.4 },
  P3: { x: W * 0.5, y: H * 0.3 },
  P4: { x: W * 0.65, y: H * 0.5 },
  P5: { x: W * 0.8, y: H * 0.6 },
  BALL: { x: W * 0.2, y: H * 0.6 }, // start with P1
});

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1000,
    stageHeight: 600,

    play: null,
    editorMode: "select",
    currentFrameIndex: 0,

    currentFrame() {
      const state = get();
      if (!state.play) return null;
      return state.play.frames[state.currentFrameIndex] ?? null;
    },

    setMode(mode) {
      set((s) => {
        s.editorMode = mode;
      });
    },

    initDefaultPlay(name = "New Play") {
      set((s) => {
        const W = s.stageWidth;
        const H = s.stageHeight;
        const tokens = makeDefaultTokens();
        const positions = defaultPositions(W, H);

        const frame0: Frame = {
          id: nanoid(),
          tokens: positions,
          arrows: [],
        };

        s.play = {
          id: nanoid(),
          meta: {
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          tokens,
          frames: [frame0],
          arrowsById: {},
          possession: "P1",
        };
        s.currentFrameIndex = 0;
        s.editorMode = "select";
      });
    },

    setTokenPosition(tokenId, xy) {
      set((s) => {
        if (!s.play) return;
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;
        frame.tokens[tokenId] = { x: xy.x, y: xy.y };
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },
  }))
);
