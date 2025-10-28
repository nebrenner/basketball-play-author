import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Play, Token, Frame, Id, XY, Arrow, ArrowKind, CourtType } from "./types";
import { advanceFrame as computeNextFrame } from "../features/frames/frameEngine";
import { runPlayStep } from "../features/frames/playback";
import { buildArrowPath } from "../features/arrows/arrowUtils";
import { TOKEN_RADIUS, ballPositionFor } from "../features/tokens/tokenGeometry";
import { PlaySchema } from "./schema";

type PlayIndexEntry = { id: string; name: string; updatedAt: string };

type StoreState = {
  stageWidth: number;
  stageHeight: number;
  courtType: CourtType;

  play: Play | null;
  currentFrameIndex: number;
  storageRevision: number;
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
  updateArrowControlPoint: (arrowId: Id, point: XY) => void;
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
  savePlayAsCopy: () => void;
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

function readIndex(): PlayIndexEntry[] {
  const raw = localStorage.getItem(indexKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlayIndexEntry[];
  } catch {
    return [];
  }
}

function writeIndex(entries: PlayIndexEntry[]) {
  if (entries.length > 0) {
    localStorage.setItem(indexKey(), JSON.stringify(entries));
  } else {
    localStorage.removeItem(indexKey());
  }
}

function persistPlay(play: Play) {
  localStorage.setItem(localKey(play.id), JSON.stringify(play));
  const idx = readIndex();
  const existing = idx.find((x) => x.id === play.id);
  if (existing) {
    existing.name = play.meta.name;
    existing.updatedAt = play.meta.updatedAt;
  } else {
    idx.push({ id: play.id, name: play.meta.name, updatedAt: play.meta.updatedAt });
  }
  writeIndex(idx);
}

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1200,
    stageHeight: 760,
    courtType: "half",

    play: null,
    currentFrameIndex: 0,
    storageRevision: 0,
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
        const defaultControl = {
          x: (startPoint.x + defaultEnd.x) / 2,
          y: (startPoint.y + defaultEnd.y) / 2,
        };
        const arrow: Arrow = {
          id,
          from: fromTokenId,
          toPoint: defaultEnd,
          toTokenId: undefined,
          kind,
          points: [startPoint, defaultControl, defaultEnd],
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

        const start = frame.tokens[arrow.from] ?? arrow.points[0] ?? arrow.toPoint;
        const path = buildArrowPath(arrow, { start, end: arrow.toPoint });
        if (path.length >= 1) {
          path[0] = { x: start.x, y: start.y };
        }
        const lastIndex = path.length - 1;
        if (lastIndex >= 0) {
          path[lastIndex] = { x: arrow.toPoint.x, y: arrow.toPoint.y };
        }
        arrow.points = path;

        s.play.meta.updatedAt = new Date().toISOString();
      });
    },

    updateArrowControlPoint(arrowId, point) {
      set((s) => {
        if (!s.play) return;
        const arrow = s.play.arrowsById[arrowId];
        if (!arrow) return;
        const frame = s.play.frames[s.currentFrameIndex];
        if (!frame) return;

        const snapped = snap(point, s.snapToGrid);

        const start = frame.tokens[arrow.from] ?? arrow.points[0] ?? snapped;
        const end = arrow.toPoint ?? arrow.points[arrow.points.length - 1] ?? snapped;

        const path = buildArrowPath(arrow, { start, end });
        if (path.length < 3) {
          path.splice(1, 0, { x: snapped.x, y: snapped.y });
        } else {
          path[1] = { x: snapped.x, y: snapped.y };
        }

        arrow.points = path;
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

      const arrowsInFrame = from.arrows
        .map((arrowId) => s.play?.arrowsById[arrowId])
        .filter((arrow): arrow is Arrow => Boolean(arrow));

      const tokenPaths = new Map<Id, XY[]>();
      for (const arrow of arrowsInFrame) {
        if (arrow.kind === "pass") continue;
        const startPos = from.tokens[arrow.from];
        const endPos = to.tokens[arrow.from];
        if (!startPos || !endPos) continue;
        tokenPaths.set(arrow.from, buildArrowPath(arrow, { start: startPos, end: endPos }));
      }

      const moves = Object.keys(to.tokens).flatMap((id) => {
        const a = from.tokens[id];
        const b = to.tokens[id];
        if (!a || !b) return [];
        if (a.x === b.x && a.y === b.y) return [];
        const path = tokenPaths.get(id);
        return [{ id, from: a, to: b, path }];
      });

      const fromPossessionId = from.possession ?? s.play.possession ?? null;
      const toPossessionId = to.possession ?? fromPossessionId;
      let ballMove: { from: XY; to: XY; path?: XY[] } | null = null;

      const passArrowForBall = arrowsInFrame.find(
        (arrow) => arrow.kind === "pass" && arrow.from === fromPossessionId
      );

      if (passArrowForBall) {
        const startPos = from.tokens[passArrowForBall.from];
        const endPosCandidate = passArrowForBall.toTokenId
          ? to.tokens[passArrowForBall.toTokenId]
          : passArrowForBall.toPoint;
        if (startPos && endPosCandidate) {
          const path = buildArrowPath(passArrowForBall, { start: startPos, end: endPosCandidate });
          if (path.length >= 2) {
            const ballPath = path.map((pt) => ballPositionFor(pt));
            const fromBall = ballPath[0];
            const toBall = ballPath[ballPath.length - 1];
            if (fromBall && toBall && (fromBall.x !== toBall.x || fromBall.y !== toBall.y)) {
              ballMove = { from: fromBall, to: toBall, path: ballPath };
            }
          }
        }
      }

      if (fromPossessionId) {
        const fromPos = from.tokens[fromPossessionId];
        const toPos = toPossessionId ? to.tokens[toPossessionId] : undefined;
        if (fromPos && toPos) {
          const start = ballPositionFor(fromPos);
          const end = ballPositionFor(toPos);
          if (!ballMove && (start.x !== end.x || start.y !== end.y)) {
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
      persistPlay(parsed.data);
      set((s) => {
        s.storageRevision += 1;
      });
      console.info("Play saved:", parsed.data.id);
    },

    savePlayAsCopy() {
      const state = get();
      const current = state.play;
      if (!current) return;

      const baseName = current.meta.name?.trim() || "New Play";
      const suggestedName = `${baseName} Copy`;
      const entered = window.prompt("Name this copied play:", suggestedName);
      const name = entered?.trim();
      if (!name) {
        console.info("Copy cancelled: name is required");
        return;
      }

      const cloned = JSON.parse(JSON.stringify(current)) as Play;
      const now = new Date().toISOString();
      cloned.id = nanoid();
      cloned.meta = {
        ...cloned.meta,
        name,
        createdAt: now,
        updatedAt: now,
      };

      const parsed = PlaySchema.safeParse(cloned);
      if (!parsed.success) {
        console.error("Copy failed: invalid play", parsed.error);
        return;
      }

      persistPlay(parsed.data);
      set((s) => {
        s.storageRevision += 1;
      });
      console.info("Play copied:", parsed.data.id);
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
      return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    deletePlay(id) {
      const idx = readIndex();
      const next = idx.filter((entry) => entry.id !== id);
      const changed = next.length !== idx.length;
      writeIndex(next);
      localStorage.removeItem(localKey(id));
      if (changed) {
        set((s) => {
          s.storageRevision += 1;
        });
      }
    },
  }))
);
