import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Play, Token, Frame, Id, XY, Arrow, ArrowKind, CourtType } from "./types";
import { advanceFrame as computeNextFrame } from "../features/frames/frameEngine";
import { runPlayStep } from "../features/frames/playback";
import { TOKEN_RADIUS, ballPositionFor } from "../features/tokens/tokenGeometry";
import { PlaySchema } from "./schema";

type StoreState = {
  stageWidth: number;
  stageHeight: number;
  courtType: CourtType;

  play: Play | null;
  currentFrameIndex: number;
  snapToGrid: boolean;
  selectedTokenId: Id | null;
  selectedArrowId: Id | null;

  // playback
  isPlaying: boolean;
  speed: number;
  baseDurationMs: number;

  // selectors
  currentFrame(): Frame | null;

  // editor actions
  setSnap: (value: boolean) => void;
  setCourtType: (type: CourtType) => void;
  initDefaultPlay: (name?: string) => void;
  setPlayName: (name: string) => void;
  setTokenPosition: (tokenId: Id, xy: XY) => void;
  setSelectedToken: (id: Id | null) => void;
  setSelectedArrow: (id: Id | null) => void;
  setPossession: (id: Id | null) => void;

  // arrow authoring
  createArrow: (kind: ArrowKind, fromTokenId: Id) => void;
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
  deletePlay: (id: string) => void;
};

const makeDefaultTokens = (): Token[] => [
  { id: "P1", kind: "P1", label: "1" },
  { id: "P2", kind: "P2", label: "2" },
  { id: "P3", kind: "P3", label: "3" },
  { id: "P4", kind: "P4", label: "4" },
  { id: "P5", kind: "P5", label: "5" },
];

const defaultPositions = (W: number, H: number, courtType: CourtType): Record<Id, XY> => {
  if (courtType === "full") {
    return {
      P1: { x: W * 0.18, y: H * 0.50 },
      P2: { x: W * 0.35, y: H * 0.32 },
      P3: { x: W * 0.35, y: H * 0.68 },
      P4: { x: W * 0.60, y: H * 0.40 },
      P5: { x: W * 0.78, y: H * 0.62 },
    } as Record<Id, XY>;
  }

  return {
    P1: { x: W * 0.48, y: H * 0.50 },
    P2: { x: W * 0.40, y: H * 0.32 },
    P3: { x: W * 0.40, y: H * 0.68 },
    P4: { x: W * 0.64, y: H * 0.42 },
    P5: { x: W * 0.72, y: H * 0.58 },
  } as Record<Id, XY>;
};

const snap = (xy: XY, enabled: boolean, grid = 10): XY =>
  enabled ? { x: Math.round(xy.x / grid) * grid, y: Math.round(xy.y / grid) * grid } : xy;

function localKey(id: string) { return `bpa.play.${id}`; }
function indexKey() { return `bpa.index`; }

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1200,
    stageHeight: 760,
    courtType: "half",

    play: null,
    currentFrameIndex: 0,
    snapToGrid: true,
    selectedTokenId: null,
    selectedArrowId: null,

    // playback
    isPlaying: false,
    speed: 1,
    baseDurationMs: 900,

    currentFrame() {
      const state = get();
      if (!state.play) return null;
      return state.play.frames[state.currentFrameIndex] ?? null;
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
            const frame = s.play.frames[0];
            frame.tokens = defaultPositions(s.stageWidth, s.stageHeight, type);
            frame.possession = frame.possession ?? s.play.possession;
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

        const frame0: Frame = { id: nanoid(), tokens: positions, arrows: [], possession: "P1" };

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
        s.selectedTokenId = null;
        s.selectedArrowId = null;
      });
    },

    setPlayName(name) {
      set((s) => {
        if (!s.play) return;
        if (s.play.meta.name === name) return;
        s.play.meta.name = name;
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
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;
        s.play.possession = id ?? undefined;
        frame.possession = id ?? undefined;
        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    // ---- Arrow authoring ----
    createArrow(kind, fromTokenId) {
      set((s) => {
        if (!s.play) return;
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;
        const start = frame.tokens[fromTokenId];
        if (!start) return;

        const existing = frame.arrows.find((arrowId) => {
          const a = s.play?.arrowsById[arrowId];
          return a?.from === fromTokenId;
        });
        if (existing) return;

        const id = nanoid();
        const startPoint = { x: start.x, y: start.y };
        const defaultEnd = snap({ x: start.x + 200, y: start.y }, s.snapToGrid);
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: defaultEnd,
          toTokenId: undefined,
          kind,
          points: [startPoint, defaultEnd],
        };
        s.play.arrowsById[id] = arrow;
        frame.arrows.push(id);
        s.play.meta.updatedAt = new Date().toISOString();
        s.selectedArrowId = id;
        s.selectedTokenId = null;
      });
    },

    updateArrowEndpoint(arrowId, point) {
      set((s) => {
        if (!s.play) return;
        const arrow = s.play.arrowsById[arrowId];
        if (!arrow) return;
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;

        const snapped = snap(point, s.snapToGrid);

        let toPoint = { x: snapped.x, y: snapped.y };
        let toTokenId: Id | undefined = undefined;

        if (arrow.kind === "pass") {
          const captureRadius = TOKEN_RADIUS * 1.2;
          const captureRadiusSq = captureRadius * captureRadius;
          for (const [tokenId, pos] of Object.entries(frame.tokens)) {
            if (tokenId === arrow.from) continue;
            const dx = pos.x - snapped.x;
            const dy = pos.y - snapped.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= captureRadiusSq) {
              toTokenId = tokenId;
              toPoint = { x: pos.x, y: pos.y };
              break;
            }
          }
        }

        arrow.toTokenId = toTokenId;
        arrow.toPoint = toPoint;

        const start = frame.tokens[arrow.from];
        if (start) {
          arrow.points = [
            { x: start.x, y: start.y },
            { x: arrow.toPoint.x, y: arrow.toPoint.y },
          ];
        } else if (arrow.points.length) {
          arrow.points[arrow.points.length - 1] = { x: arrow.toPoint.x, y: arrow.toPoint.y };
        } else {
          arrow.points.push({ x: arrow.toPoint.x, y: arrow.toPoint.y });
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
        s.play.possession = next.possession ?? undefined;
        s.play.meta.updatedAt = new Date().toISOString();
        s.play.frames[s.currentFrameIndex].arrows = [];
      });
    },

    setCurrentFrameIndex(i) {
      set((s) => {
        if (!s.play) return;
        const clamped = Math.max(0, Math.min(i, s.play.frames.length - 1));
        s.currentFrameIndex = clamped;
        const frame = s.play.frames[clamped];
        if (frame) {
          s.play.possession = frame.possession ?? undefined;
        }
      });
    },

    deleteLastFrame() {
      set((s) => {
        if (!s.play) return;
        if (s.play.frames.length <= 1) return;
        s.play.frames.pop();
        s.currentFrameIndex = Math.min(s.currentFrameIndex, s.play.frames.length - 1);
        const frame = s.play.frames[s.currentFrameIndex];
        if (frame) {
          s.play.possession = frame.possession ?? undefined;
        }
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

      const fromPossessionId = from.possession ?? s.play.possession ?? null;
      const toPossessionId = to.possession ?? fromPossessionId;
      let ballMove: { from: XY; to: XY } | null = null;

      if (fromPossessionId) {
        const fromPos = from.tokens[fromPossessionId];
        const toPos = toPossessionId ? to.tokens[toPossessionId] : undefined;
        if (fromPos && toPos) {
          const start = ballPositionFor(fromPos);
          const end = ballPositionFor(toPos);
          if (start.x !== end.x || start.y !== end.y) {
            ballMove = { from: start, to: end };
          }
        }
      }

      await runPlayStep({ moves, durationMs, ballMove });
      set((st) => {
        st.currentFrameIndex = next;
        if (st.play) {
          const frame = st.play.frames[next];
          if (frame) {
            st.play.possession = frame.possession ?? undefined;
          }
        }
      });
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
      const state = get();
      const current = state.play;
      if (!current) return;

      let name = current.meta.name?.trim() ?? "";
      if (!name) {
        const entered = window.prompt("Name this play:", current.meta.name || "New Play");
        name = entered?.trim() ?? "";
        if (!name) {
          console.info("Save cancelled: name is required");
          return;
        }
      }

      const updatedAt = new Date().toISOString();
      const finalName = name;
      set((s) => {
        if (!s.play) return;
        s.play.meta.name = finalName;
        s.play.meta.updatedAt = updatedAt;
      });

      const latest = get().play;
      if (!latest) return;
      const parsed = PlaySchema.safeParse(latest);
      if (!parsed.success) {
        console.error("Save failed: invalid play", parsed.error);
        return;
      }
      localStorage.setItem(localKey(parsed.data.id), JSON.stringify(parsed.data));
      const idxRaw = localStorage.getItem(indexKey());
      const idx = idxRaw ? JSON.parse(idxRaw) as Array<{ id:string; name:string; updatedAt:string }> : [];
      const existing = idx.find((x) => x.id === parsed.data.id);
      if (existing) {
        existing.name = parsed.data.meta.name;
        existing.updatedAt = parsed.data.meta.updatedAt;
      } else {
        idx.push({ id: parsed.data.id, name: parsed.data.meta.name, updatedAt: parsed.data.meta.updatedAt });
      }
      localStorage.setItem(indexKey(), JSON.stringify(idx));
      console.info("Play saved:", parsed.data.id);
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
          s.courtType = parsed.courtType ?? "half";
          s.selectedTokenId = null;
          s.selectedArrowId = null;
          const firstFrame = parsed.frames[0];
          s.play.possession = firstFrame?.possession ?? parsed.possession;
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

    deletePlay(id) {
      const raw = localStorage.getItem(indexKey());
      const idx = raw ? JSON.parse(raw) as Array<{ id:string; name:string; updatedAt:string }> : [];
      const next = idx.filter((entry) => entry.id !== id);
      if (next.length > 0) {
        localStorage.setItem(indexKey(), JSON.stringify(next));
      } else {
        localStorage.removeItem(indexKey());
      }
      localStorage.removeItem(localKey(id));
    },
  }))
);
