import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Play, Token, Frame, Id, XY, Arrow } from "./types";
import { advanceFrame as computeNextFrame } from "../features/frames/frameEngine";

export type EditorMode =
  | "select"
  | "arrow:cut"
  | "arrow:dribble"
  | "arrow:screen"
  | "arrow:pass"
  | "pan";

type DraftArrow =
  | {
      active: true;
      kind: "cut" | "dribble" | "screen" | "pass";
      fromTokenId: Id;
      points: XY[]; // first point is start (token center), last is current mouse
    }
  | { active: false };

type StoreState = {
  // stage logical size
  stageWidth: number;
  stageHeight: number;

  play: Play | null;
  editorMode: EditorMode;
  currentFrameIndex: number;
  snapToGrid: boolean;

  draftArrow: DraftArrow;

  // selectors
  currentFrame(): Frame | null;

  // actions
  setMode: (mode: EditorMode) => void;
  setSnap: (value: boolean) => void;
  initDefaultPlay: (name?: string) => void;
  setTokenPosition: (tokenId: Id, xy: XY) => void;

  // arrow authoring
  beginArrow: (kind: DraftArrow["kind"], fromTokenId: Id, start: XY) => void;
  updateArrowPreview: (pt: XY) => void;
  commitArrowToPoint: (finalPoint: XY) => void; // cut/dribble/screen
  commitArrowToToken: (toTokenId: Id) => void; // pass
  cancelArrow: () => void;

  // frames
  advanceFrame: () => void; // creates next frame from current + arrows
};

const makeDefaultTokens = (): Token[] => [
  { id: "P1", kind: "P1", label: "1" },
  { id: "P2", kind: "P2", label: "2" },
  { id: "P3", kind: "P3", label: "3" },
  { id: "P4", kind: "P4", label: "4" },
  { id: "P5", kind: "P5", label: "5" },
  { id: "BALL", kind: "BALL", label: "●" },
];

const defaultPositions = (W: number, H: number): Record<Id, XY> => ({
  P1: { x: W * 0.2, y: H * 0.6 },
  P2: { x: W * 0.35, y: H * 0.4 },
  P3: { x: W * 0.5, y: H * 0.3 },
  P4: { x: W * 0.65, y: H * 0.5 },
  P5: { x: W * 0.8, y: H * 0.6 },
  BALL: { x: W * 0.2, y: H * 0.6 },
});

const snap = (xy: XY, enabled: boolean, grid = 10): XY =>
  enabled ? { x: Math.round(xy.x / grid) * grid, y: Math.round(xy.y / grid) * grid } : xy;

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1000,
    stageHeight: 600,

    play: null,
    editorMode: "select",
    currentFrameIndex: 0,
    snapToGrid: true,

    draftArrow: { active: false },

    currentFrame() {
      const state = get();
      if (!state.play) return null;
      return state.play.frames[state.currentFrameIndex] ?? null;
    },

    setMode(mode) {
      set((s) => {
        s.editorMode = mode;
        s.draftArrow = { active: false };
      });
    },

    setSnap(value) {
      set((s) => {
        s.snapToGrid = value;
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
        s.draftArrow = { active: false };
      });
    },

    setTokenPosition(tokenId, xy) {
      set((s) => {
        if (!s.play) return;
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;
        frame.tokens[tokenId] = snap({ x: xy.x, y: xy.y }, s.snapToGrid);
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    // ---- Arrow authoring ----
    beginArrow(kind, fromTokenId, start) {
      set((s) => {
        s.draftArrow = { active: true, kind, fromTokenId, points: [start, start] };
      });
    },

    updateArrowPreview(pt) {
      set((s) => {
        if (!s.draftArrow.active) return;
        const arr = s.draftArrow.points;
        arr[arr.length - 1] = pt;
      });
    },

    commitArrowToPoint(finalPoint) {
      set((s) => {
        if (!s.play || !s.draftArrow.active) return;
        const { kind, fromTokenId, points } = s.draftArrow;
        if (kind === "pass") return; // wrong commit function for pass
        const id = nanoid();
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: finalPoint,
          toTokenId: undefined,
          kind,
          points: [...points.slice(0, -1), finalPoint],
        };
        s.play.arrowsById[id] = arrow;

        const frame = s.play.frames[s.currentFrameIndex];
        frame.arrows.push(id);

        s.draftArrow = { active: false };
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    commitArrowToToken(toTokenId) {
      set((s) => {
        if (!s.play || !s.draftArrow.active) return;
        const { kind, fromTokenId, points } = s.draftArrow;
        if (kind !== "pass") return; // only for pass
        const id = nanoid();
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: undefined,
          toTokenId,
          kind,
          points,
        };
        s.play.arrowsById[id] = arrow;

        const frame = s.play.frames[s.currentFrameIndex];
        frame.arrows.push(id);

        s.draftArrow = { active: false };
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    cancelArrow() {
      set((s) => {
        s.draftArrow = { active: false };
      });
    },

    // ---- Frames ----
    advanceFrame() {
      set((s) => {
        if (!s.play) return;
        const next = computeNextFrame(s.play, s.currentFrameIndex);
        if (!next) return;
        s.play.frames.push(next);
        s.currentFrameIndex = s.play.frames.length - 1;
        s.play.meta.updatedAt = new Date().toISOString();

        // policy: clear arrows in the new frame (teaching arrows are per-step)
        s.play.frames[s.currentFrameIndex].arrows = [];
      });
    },
  }))
);
