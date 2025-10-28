import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Play, Token, Frame, Id, XY, Arrow, ArrowKind, CourtType } from "./types";
import { advanceFrame as computeNextFrame } from "../features/frames/frameEngine";
import { runPlayStep } from "../features/frames/playback";
import { PlaySchema } from "./schema";

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
      kind: ArrowKind;
      fromTokenId: Id;
      points: XY[];
      hasStarted: boolean;
    }
  | { active: false };

type StoreState = {
  stageWidth: number;
  stageHeight: number;
  courtType: CourtType;

  play: Play | null;
  editorMode: EditorMode;
  currentFrameIndex: number;
  snapToGrid: boolean;
  selectedTokenId: Id | null;
  selectedArrowId: Id | null;

  draftArrow: DraftArrow;

  // playback
  isPlaying: boolean;
  speed: number;
  baseDurationMs: number;

  // selectors
  currentFrame(): Frame | null;

  // editor actions
  setMode: (mode: EditorMode) => void;
  setSnap: (value: boolean) => void;
  setCourtType: (type: CourtType) => void;
  initDefaultPlay: (name?: string) => void;
  setTokenPosition: (tokenId: Id, xy: XY) => void;
  setSelectedToken: (id: Id | null) => void;
  setSelectedArrow: (id: Id | null) => void;
  setPossession: (id: Id | null) => void;

  // arrow authoring
  beginArrow: (kind: ArrowKind, fromTokenId: Id, start: XY) => void;
  startArrowDrag: () => void;
  updateArrowPreview: (pt: XY) => void;
  commitArrowToPoint: (finalPoint: XY) => void;
  commitArrowToToken: (toTokenId: Id) => void;
  cancelArrow: () => void;
  updateArrowEndpoint: (arrowId: Id, point: XY) => void;
  deleteArrow: (arrowId: Id) => void;

  // frames
  advanceFrame: () => void;
  setCurrentFrameIndex: (i: number) => void;
  deleteLastFrame: () => void;

  // playback controls
  setSpeed: (mult: number) => void;
  stepForward: () => Promise<void>;
  playAnimation: () => Promise<void>;
  pauseAnimation: () => void;

  // persistence
  savePlay: () => void;
  loadPlay: (id: string) => boolean;
  listLocalPlays: () => Array<{ id: string; name: string; updatedAt: string }>;
};

const makeDefaultTokens = (): Token[] => [
  { id: "P1", kind: "P1", label: "1" },
  { id: "P2", kind: "P2", label: "2" },
  { id: "P3", kind: "P3", label: "3" },
  { id: "P4", kind: "P4", label: "4" },
  { id: "P5", kind: "P5", label: "5" },
  { id: "BALL", kind: "BALL", label: "●" },
];

const defaultPositions = (W: number, H: number, courtType: CourtType): Record<Id, XY> => {
  if (courtType === "full") {
    const full = {
      P1: { x: W * 0.18, y: H * 0.50 },
      P2: { x: W * 0.35, y: H * 0.32 },
      P3: { x: W * 0.35, y: H * 0.68 },
      P4: { x: W * 0.60, y: H * 0.40 },
      P5: { x: W * 0.78, y: H * 0.62 },
    } as Record<Id, XY>;
    return { ...full, BALL: { ...full.P1 } };
  }

  const half = {
    P1: { x: W * 0.48, y: H * 0.50 },
    P2: { x: W * 0.40, y: H * 0.32 },
    P3: { x: W * 0.40, y: H * 0.68 },
    P4: { x: W * 0.64, y: H * 0.42 },
    P5: { x: W * 0.72, y: H * 0.58 },
  } as Record<Id, XY>;

  return { ...half, BALL: { ...half.P1 } };
};

const snap = (xy: XY, enabled: boolean, grid = 10): XY =>
  enabled ? { x: Math.round(xy.x / grid) * grid, y: Math.round(xy.y / grid) * grid } : xy;

function localKey(id: string) { return `bpa.play.${id}`; }
function indexKey() { return `bpa.index`; }

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1000,
    stageHeight: 532,
    courtType: "half",

    play: null,
    editorMode: "select",
    currentFrameIndex: 0,
    snapToGrid: true,
    selectedTokenId: null,
    selectedArrowId: null,

    draftArrow: { active: false },

    // playback
    isPlaying: false,
    speed: 1,
    baseDurationMs: 900,

    currentFrame() {
      const state = get();
      if (!state.play) return null;
      return state.play.frames[state.currentFrameIndex] ?? null;
    },

    setMode(mode) {
      set((s) => {
        s.editorMode = mode;
        s.draftArrow = { active: false };
        s.selectedArrowId = null;
      });
    },

    setSnap(value) {
      set((s) => { s.snapToGrid = value; });
    },

    setCourtType(type) {
      set((s) => {
        if (s.courtType === type) return;
        s.courtType = type;
        if (s.play) {
          s.play.courtType = type;
          if (s.play.frames.length === 1) {
            s.play.frames[0].tokens = defaultPositions(s.stageWidth, s.stageHeight, type);
          }
          s.play.meta.updatedAt = new Date().toISOString();
        }
      });
    },

    initDefaultPlay(name = "New Play") {
      set((s) => {
        const W = s.stageWidth;
        const H = s.stageHeight;
        const tokens = makeDefaultTokens();
        const positions = defaultPositions(W, H, s.courtType);

        const frame0: Frame = { id: nanoid(), tokens: positions, arrows: [] };

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
          courtType: s.courtType,
        };
        s.currentFrameIndex = 0;
        s.editorMode = "select";
        s.draftArrow = { active: false };
        s.selectedTokenId = null;
        s.selectedArrowId = null;
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

    setSelectedToken(id) {
      set((s) => {
        s.selectedTokenId = id;
        if (id !== null) {
          s.selectedArrowId = null;
        }
      });
    },

    setSelectedArrow(id) {
      set((s) => {
        s.selectedArrowId = id;
        if (id !== null) {
          s.selectedTokenId = null;
        }
      });
    },

    setPossession(id) {
      set((s) => {
        if (!s.play) return;
        if (!id) {
          s.play.possession = undefined;
        } else {
          s.play.possession = id;
        }
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    // ---- Arrow authoring ----
    beginArrow(kind, fromTokenId, start) {
      set((s) => {
        s.draftArrow = { active: true, kind, fromTokenId, points: [start, start], hasStarted: false };
      });
    },

    startArrowDrag() {
      set((s) => {
        if (!s.draftArrow.active) return;
        s.draftArrow.hasStarted = true;
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
        const { kind, fromTokenId, points, hasStarted } = s.draftArrow;
        if (!hasStarted) {
          s.draftArrow = { active: false };
          return;
        }
        if (kind === "pass") return;
        const id = nanoid();
        const snapped = snap(finalPoint, s.snapToGrid);
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: snapped,
          toTokenId: undefined,
          kind,
          points: [...points.slice(0, -1), snapped],
        };
        s.play.arrowsById[id] = arrow;
        const frame = s.play.frames[s.currentFrameIndex];
        frame.arrows.push(id);
        s.draftArrow = { active: false };
        s.play.meta.updatedAt = new Date().toISOString();
        s.selectedArrowId = id;
      });
    },

    commitArrowToToken(toTokenId) {
      set((s) => {
        if (!s.play || !s.draftArrow.active) return;
        const { kind, fromTokenId, points, hasStarted } = s.draftArrow;
        if (!hasStarted) {
          s.draftArrow = { active: false };
          return;
        }
        if (kind !== "pass") return;
        const id = nanoid();
        const frame = s.play.frames[s.currentFrameIndex];
        const targetPos = frame?.tokens[toTokenId];
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: targetPos ? { x: targetPos.x, y: targetPos.y } : undefined,
          toTokenId,
          kind,
          points:
            points.length > 1
              ? [...points.slice(0, -1), targetPos ?? points[points.length - 1]]
              : targetPos
                ? [targetPos]
                : points,
        };
        s.play.arrowsById[id] = arrow;
        if (frame) {
          frame.arrows.push(id);
        }
        s.draftArrow = { active: false };
        s.play.possession = toTokenId;
        s.play.meta.updatedAt = new Date().toISOString();
        s.selectedArrowId = id;
      });
    },

    cancelArrow() {
      set((s) => {
        s.draftArrow = { active: false };
      });
    },

    updateArrowEndpoint(arrowId, point) {
      set((s) => {
        if (!s.play) return;
        const arrow = s.play.arrowsById[arrowId];
        if (!arrow) return;
        if (arrow.kind === "pass") return;
        const snapped = snap(point, s.snapToGrid);
        arrow.toPoint = { x: snapped.x, y: snapped.y };
        if (arrow.points.length) {
          arrow.points[arrow.points.length - 1] = arrow.toPoint;
        } else {
          arrow.points.push(arrow.toPoint);
        }
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    deleteArrow(arrowId) {
      set((s) => {
        if (!s.play) return;
        if (!s.play.arrowsById[arrowId]) return;
        delete s.play.arrowsById[arrowId];
        for (const frame of s.play.frames) {
          frame.arrows = frame.arrows.filter((id) => id !== arrowId);
        }
        if (s.selectedArrowId === arrowId) {
          s.selectedArrowId = null;
        }
        s.play.meta.updatedAt = new Date().toISOString();
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
        s.play.frames[s.currentFrameIndex].arrows = [];
      });
    },

    setCurrentFrameIndex(i) {
      set((s) => {
        if (!s.play) return;
        const clamped = Math.max(0, Math.min(i, s.play.frames.length - 1));
        s.currentFrameIndex = clamped;
      });
    },

    deleteLastFrame() {
      set((s) => {
        if (!s.play) return;
        if (s.play.frames.length <= 1) return;
        s.play.frames.pop();
        s.currentFrameIndex = Math.min(s.currentFrameIndex, s.play.frames.length - 1);
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    // ---- Playback ----
    setSpeed(mult) {
      set((s) => { s.speed = Math.max(0.25, Math.min(mult, 4)); });
    },

    async stepForward() {
      const s = get();
      if (!s.play) return;
      const i = s.currentFrameIndex;
      const next = i + 1;
      if (next >= s.play.frames.length) return;

      const from = s.play.frames[i];
      const to = s.play.frames[next];
      const durationMs = s.baseDurationMs / s.speed;

      const moves = Object.keys(to.tokens).flatMap((id) => {
        const a = from.tokens[id];
        const b = to.tokens[id];
        if (!a || !b) return [];
        if (a.x === b.x && a.y === b.y) return [];
        return [{ id, from: a, to: b }];
      });

      await runPlayStep({ moves, durationMs });
      set((st) => { st.currentFrameIndex = next; });
    },

    async playAnimation() {
      if (get().isPlaying) return;
      set((s) => { s.isPlaying = true; });

      try {
        while (get().isPlaying) {
          const s = get();
          if (!s.play) break;
          if (s.currentFrameIndex >= s.play.frames.length - 1) {
            set((st) => { st.isPlaying = false; });
            break;
          }
          await get().stepForward();
        }
      } finally {
        set((s) => { s.isPlaying = false; });
      }
    },

    pauseAnimation() {
      set((s) => { s.isPlaying = false; });
    },

    // ---- Persistence (LocalStorage) ----
    savePlay() {
      const s = get();
      const p = s.play;
      if (!p) return;
      const parsed = PlaySchema.safeParse(p);
      if (!parsed.success) {
        console.error("Save failed: invalid play", parsed.error);
        return;
      }
      localStorage.setItem(localKey(p.id), JSON.stringify(parsed.data));
      const idxRaw = localStorage.getItem(indexKey());
      const idx = idxRaw ? JSON.parse(idxRaw) as Array<{ id:string; name:string; updatedAt:string }> : [];
      const existing = idx.find((x) => x.id === p.id);
      if (existing) {
        existing.name = p.meta.name;
        existing.updatedAt = p.meta.updatedAt;
      } else {
        idx.push({ id: p.id, name: p.meta.name, updatedAt: p.meta.updatedAt });
      }
      localStorage.setItem(indexKey(), JSON.stringify(idx));
      console.info("Play saved:", p.id);
    },

    loadPlay(id: string) {
      const raw = localStorage.getItem(localKey(id));
      if (!raw) return false;
      try {
        const data = JSON.parse(raw);
        const parsed = PlaySchema.parse(data);
        set((s) => {
          s.play = parsed;
          s.currentFrameIndex = 0;
          s.editorMode = "select";
          s.draftArrow = { active: false };
          s.courtType = parsed.courtType ?? "half";
          s.selectedTokenId = null;
        });
        return true;
      } catch (e) {
        console.error("Load failed:", e);
        return false;
      }
    },

    listLocalPlays() {
      const raw = localStorage.getItem(indexKey());
      if (!raw) return [];
      try {
        const idx = JSON.parse(raw) as Array<{ id:string; name:string; updatedAt:string }>;
        return idx.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch {
        return [];
      }
    },
  }))
);
