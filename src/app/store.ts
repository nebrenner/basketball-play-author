import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type Konva from "konva";
import type { Draft } from "immer";
import type { Play, Token, Frame, Id, XY, ArrowKind, CourtType, Arrow } from "./types";
import { advanceFrame as computeNextFrame } from "../features/frames/frameEngine";
import { buildPlayStepSpec, runPlayStep } from "../features/frames/playback";
import { buildArrowPath } from "../features/arrows/arrowUtils";
import { ensureFrameGraph, findFrameById, buildPathToFrame, collectPlaybackOrder } from "../features/frames/frameGraph";
import { TOKEN_RADIUS } from "../features/tokens/tokenGeometry";
import { COURT_PADDING } from "../constants/court";
import { PlaySchema } from "./schema";

type PlayIndexEntry = { id: string; name: string; updatedAt: string };

type StoreState = {
  stageWidth: number;
  stageHeight: number;
  courtType: CourtType;

  play: Play | null;
  currentFrameIndex: number;
  currentBranchPath: Id[];
  storageRevision: number;
  snapToGrid: boolean;
  hasUnsavedChanges: boolean;
  selectedTokenId: Id | null;
  selectedArrowId: Id | null;
  stageRef: Konva.Stage | null;

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
  setCurrentFrameNote: (note: string) => void;
  setCurrentFrameTitle: (title: string) => void;

  // arrow authoring
  createArrow: (kind: ArrowKind, fromTokenId: Id) => void;
  updateArrowEndpoint: (arrowId: Id, point: XY) => void;
  updateArrowControlPoint: (arrowId: Id, point: XY) => void;
  deleteArrow: (arrowId: Id) => void;

  // frames
  advanceFrame: () => void;
  branchFrame: () => void;
  setCurrentFrameIndex: (i: number) => void;
  focusFrameById: (id: Id) => void;
  deleteLastFrame: () => void;

  // playback controls
  setSpeed: (mult: number) => void;
  stepForward: () => Promise<void>;
  playAnimation: () => Promise<void>;
  pauseAnimation: () => void;

  // stage
  setStageRef: (stage: Konva.Stage | null) => void;

  // persistence
  savePlay: () => void;
  savePlayAsCopy: () => void;
  loadPlay: (id: string) => boolean;
  importPlayData: (raw: unknown) => boolean;
  listLocalPlays: () => Array<{ id: string; name: string; updatedAt: string }>;
  deletePlay: (id: string) => void;
};

const markPlayDirty = (state: Draft<StoreState>, timestamp?: string) => {
  if (!state.play) return;
  state.play.meta.updatedAt = timestamp ?? new Date().toISOString();
  state.hasUnsavedChanges = true;
};

const makeDefaultTokens = (): Token[] => [
  { id: "P1", kind: "P1", label: "1" },
  { id: "P2", kind: "P2", label: "2" },
  { id: "P3", kind: "P3", label: "3" },
  { id: "P4", kind: "P4", label: "4" },
  { id: "P5", kind: "P5", label: "5" },
];

const OLD_COURT_PADDING = 10;

const defaultPositions = (W: number, H: number, courtType: CourtType): Record<Id, XY> => {
  const normalize = (value: number, total: number) => {
    const oldPlayable = total - OLD_COURT_PADDING * 2;
    if (oldPlayable <= 0) return value;
    const normalized = (value - OLD_COURT_PADDING) / oldPlayable;
    const clamped = Math.max(0, Math.min(1, normalized));
    return COURT_PADDING + clamped * (total - COURT_PADDING * 2);
  };

  const position = (rx: number, ry: number) => ({
    x: normalize(W * rx, W),
    y: normalize(H * ry, H),
  });

  if (courtType === "full") {
    return {
      P1: position(0.18, 0.5),
      P2: position(0.35, 0.32),
      P3: position(0.35, 0.68),
      P4: position(0.6, 0.4),
      P5: position(0.78, 0.62),
    } as Record<Id, XY>;
  }

  return {
    P1: position(0.48, 0.5),
    P2: position(0.4, 0.32),
    P3: position(0.4, 0.68),
    P4: position(0.64, 0.42),
    P5: position(0.72, 0.58),
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

const getFrameById = (play: Play | null, id: Id | null | undefined): Frame | null =>
  findFrameById(play ?? null, id ?? null) ?? null;

const clampFrameIndex = (path: Id[], index: number): number => {
  if (!path.length) return 0;
  return Math.max(0, Math.min(index, path.length - 1));
};

export const usePlayStore = create<StoreState>()(
  immer((set, get) => ({
    stageWidth: 1200,
    stageHeight: 760,
    courtType: "half",

    play: null,
    currentFrameIndex: 0,
    currentBranchPath: [],
    storageRevision: 0,
    snapToGrid: true,
    hasUnsavedChanges: false,
    selectedTokenId: null,
    selectedArrowId: null,
    stageRef: null,

    // playback
    isPlaying: false,
    speed: 1,
    baseDurationMs: 900,

    currentFrame() {
      const state = get();
      if (!state.play || !state.currentBranchPath.length) return null;
      const index = clampFrameIndex(state.currentBranchPath, state.currentFrameIndex);
      const frameId = state.currentBranchPath[index];
      return getFrameById(state.play, frameId);
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
          markPlayDirty(s);
        }
      });
    },

    initDefaultPlay(name = "New Play") {
      set((s) => {
        const W = s.stageWidth;
        const H = s.stageHeight;
        const tokens = makeDefaultTokens();
        const positions = defaultPositions(W, H, s.courtType);

        const frame0: Frame = {
          id: nanoid(),
          tokens: positions,
          arrows: [],
          possession: "P1",
          parentId: null,
          nextFrameIds: [],
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
          courtType: s.courtType,
        };
        ensureFrameGraph(s.play);
        s.currentFrameIndex = 0;
        s.currentBranchPath = [frame0.id];
        s.selectedTokenId = null;
        s.selectedArrowId = null;
        s.hasUnsavedChanges = false;
      });
    },

    setPlayName(name) {
      set((s) => {
        if (!s.play) return;
        if (s.play.meta.name === name) return;
        s.play.meta.name = name;
        markPlayDirty(s);
      });
    },

    setTokenPosition(tokenId, xy) {
      set((s) => {
        if (!s.play) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
        if (!frame) return;
        frame.tokens[tokenId] = snap({ x: xy.x, y: xy.y }, s.snapToGrid);
        markPlayDirty(s);
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
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
        if (!frame) return;
        s.play.possession = id ?? undefined;
        frame.possession = id ?? undefined;
        markPlayDirty(s);
      });
    },

    setCurrentFrameNote(note) {
      set((s) => {
        if (!s.play) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
        if (!frame) return;
        const value = note === "" ? undefined : note;
        if (frame.note === value) return;
        if (value === undefined) {
          delete frame.note;
        } else {
          frame.note = value;
        }
        markPlayDirty(s);
      });
    },

    setCurrentFrameTitle(title) {
      set((s) => {
        if (!s.play) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
        if (!frame) return;
        const raw = title;
        const value = raw.trim();
        if (!value) {
          if (frame.title === undefined) return;
          delete frame.title;
        } else if (frame.title === raw) {
          return;
        } else {
          frame.title = raw;
        }
        markPlayDirty(s);
      });
    },

    // ---- Arrow authoring ----
    createArrow(kind, fromTokenId) {
      set((s) => {
        if (!s.play) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
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
        const defaultDistance = 200;
        const edgePadding = TOKEN_RADIUS;
        const drawsRightByDefault = start.x + defaultDistance <= s.stageWidth - edgePadding;
        const rawEndX = drawsRightByDefault
          ? Math.min(start.x + defaultDistance, s.stageWidth - edgePadding)
          : Math.max(start.x - defaultDistance, edgePadding);
        const defaultEnd = snap({ x: rawEndX, y: start.y }, s.snapToGrid);
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
        markPlayDirty(s);
        s.selectedArrowId = id;
        s.selectedTokenId = null;
      });
    },

    updateArrowEndpoint(arrowId, point) {
      set((s) => {
        if (!s.play) return;
        const arrow = s.play.arrowsById[arrowId];
        if (!arrow) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
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

        markPlayDirty(s);
      });
    },

    updateArrowControlPoint(arrowId, point) {
      set((s) => {
        if (!s.play) return;
        const arrow = s.play.arrowsById[arrowId];
        if (!arrow) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
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
        markPlayDirty(s);
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
        markPlayDirty(s);
      });
    },

    // ---- Frames ----
    advanceFrame() {
      set((s) => {
        if (!s.play) return;
        if (!s.currentBranchPath.length) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const currentFrameId = s.currentBranchPath[index];
        const current = getFrameById(s.play, currentFrameId);
        if (!current) return;
        const next = computeNextFrame(s.play, current);
        if (!next) return;
        next.parentId = current.id;
        next.nextFrameIds = [];
        s.play.frames.push(next);
        const siblings = Array.isArray(current.nextFrameIds) ? current.nextFrameIds : [];
        if (!siblings.includes(next.id)) {
          current.nextFrameIds = [...siblings, next.id];
        }
        const basePath = s.currentBranchPath.slice(0, index + 1);
        basePath.push(next.id);
        s.currentBranchPath = basePath;
        s.currentFrameIndex = s.currentBranchPath.length - 1;
        s.play.possession = next.possession ?? undefined;
        markPlayDirty(s);
        s.selectedArrowId = null;
        s.selectedTokenId = null;
        const created = getFrameById(s.play, next.id);
        if (created) {
          created.arrows = [];
        }
      });
    },

    branchFrame() {
      set((s) => {
        const play = s.play;
        if (!play) return;
        if (!s.currentBranchPath.length) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        const currentFrameId = s.currentBranchPath[index];
        const current = getFrameById(play, currentFrameId);
        if (!current) return;

        const ensureSiblingsArray = (): Id[] => {
          if (!Array.isArray(current.nextFrameIds)) {
            current.nextFrameIds = [];
          }
          return current.nextFrameIds;
        };

        const createChild = (): Frame | null => {
          const next = computeNextFrame(play, current);
          if (!next) return null;
          next.parentId = current.id;
          next.nextFrameIds = [];
          play.frames.push(next);
          const siblings = ensureSiblingsArray();
          if (!siblings.includes(next.id)) {
            siblings.push(next.id);
          }
          const created = getFrameById(play, next.id);
          if (created) {
            created.arrows = [];
          }
          return next;
        };

        const first = createChild();
        const second = createChild();
        if (!first || !second) return;

        const basePath = s.currentBranchPath.slice(0, index + 1);
        basePath.push(first.id);
        s.currentBranchPath = basePath;
        s.currentFrameIndex = s.currentBranchPath.length - 1;
        play.possession = first.possession ?? undefined;
        markPlayDirty(s);
        s.selectedArrowId = null;
        s.selectedTokenId = null;
      });
    },

    setCurrentFrameIndex(i) {
      set((s) => {
        if (!s.play || !s.currentBranchPath.length) return;
        const clamped = clampFrameIndex(s.currentBranchPath, i);
        s.currentFrameIndex = clamped;
        const frameId = s.currentBranchPath[clamped];
        const frame = getFrameById(s.play, frameId);
        if (frame) {
          s.play.possession = frame.possession ?? undefined;
        }
      });
    },

    focusFrameById(id) {
      set((s) => {
        if (!s.play) return;
        ensureFrameGraph(s.play);
        const path = buildPathToFrame(s.play, id);
        if (!path || !path.length) return;
        s.currentBranchPath = path;
        s.currentFrameIndex = path.length - 1;
        const frame = getFrameById(s.play, id);
        if (frame) {
          s.play.possession = frame.possession ?? undefined;
        }
        s.selectedArrowId = null;
        s.selectedTokenId = null;
      });
    },

    deleteLastFrame() {
      set((s) => {
        if (!s.play || !s.currentBranchPath.length) return;
        const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
        if (index !== s.currentBranchPath.length - 1) return;
        const frameId = s.currentBranchPath[index];
        const frame = getFrameById(s.play, frameId);
        if (!frame) return;
        if ((frame.nextFrameIds ?? []).length > 0) return;
        if (!frame.parentId) return;
        s.play.frames = s.play.frames.filter((f) => f.id !== frame.id);
        const parent = getFrameById(s.play, frame.parentId);
        if (parent && Array.isArray(parent.nextFrameIds)) {
          parent.nextFrameIds = parent.nextFrameIds.filter((id) => id !== frame.id);
        }
        s.currentBranchPath = s.currentBranchPath.slice(0, -1);
        s.currentFrameIndex = s.currentBranchPath.length - 1;
        if (s.currentFrameIndex < 0) {
          s.currentFrameIndex = 0;
        }
        const currentFrameId =
          s.currentBranchPath.length > 0 ? s.currentBranchPath[s.currentBranchPath.length - 1] : null;
        const current = getFrameById(s.play, currentFrameId);
        if (current) {
          s.play.possession = current.possession ?? undefined;
        }
        markPlayDirty(s);
      });
    },

    // ---- Playback ----
    setSpeed(mult) {
      set((s) => { s.speed = Math.max(0.25, Math.min(mult, 4)); });
    },

    async stepForward() {
      const s = get();
      if (!s.play || !s.currentBranchPath.length) return;
      const index = clampFrameIndex(s.currentBranchPath, s.currentFrameIndex);
      const nextIndex = index + 1;
      if (nextIndex >= s.currentBranchPath.length) return;
      const fromId = s.currentBranchPath[index];
      const toId = s.currentBranchPath[nextIndex];
      const from = getFrameById(s.play, fromId);
      const to = getFrameById(s.play, toId);
      if (!from || !to) return;
      const durationMs = s.baseDurationMs / s.speed;

      const spec = buildPlayStepSpec(s.play, from, to, durationMs);
      await runPlayStep(spec);
      set((st) => {
        st.currentFrameIndex = nextIndex;
        if (st.play) {
          const target = getFrameById(st.play, toId);
          if (target) {
            st.play.possession = target.possession ?? undefined;
          }
        }
      });
    },

    async playAnimation() {
      if (get().isPlaying) return;
      set((s) => { s.isPlaying = true; });

      try {
        const startState = get();
        const play = startState.play;
        if (!play) return;
        const order = collectPlaybackOrder(play);
        if (order.length <= 1) return;
        const currentFrameId = startState.currentBranchPath.length
          ? startState.currentBranchPath[
              clampFrameIndex(startState.currentBranchPath, startState.currentFrameIndex)
            ]
          : order[0];
        let startIndex = order.indexOf(currentFrameId ?? order[0]);
        if (startIndex < 0) startIndex = 0;

        for (let i = startIndex; i < order.length - 1; i += 1) {
          if (!get().isPlaying) break;
          const state = get();
          const activePlay = state.play;
          if (!activePlay) break;
          const fromId = order[i];
          const toId = order[i + 1];
          const from = getFrameById(activePlay, fromId);
          const to = getFrameById(activePlay, toId);
          if (!from || !to) continue;
          const durationMs = state.baseDurationMs / state.speed;
          const spec = buildPlayStepSpec(activePlay, from, to, durationMs);
          await runPlayStep(spec);
          if (!get().isPlaying) break;
          set((st) => {
            if (!st.play) return;
            const target = getFrameById(st.play, toId);
            if (!target) return;
            st.play.possession = target.possession ?? undefined;
            const path = buildPathToFrame(st.play, toId);
            if (path) {
              st.currentBranchPath = path;
              st.currentFrameIndex = path.length - 1;
            }
          });
        }
      } finally {
        set((s) => { s.isPlaying = false; });
      }
    },

    pauseAnimation() {
      set((s) => { s.isPlaying = false; });
    },

    setStageRef(stage) {
      set({ stageRef: stage });
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
        s.hasUnsavedChanges = false;
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
        return get().importPlayData(data);
      } catch (e) {
        console.error("Load failed:", e);
        return false;
      }
    },

    importPlayData(raw: unknown) {
      try {
        const parsed = PlaySchema.parse(raw);
        ensureFrameGraph(parsed);
        const rootFrame = parsed.frames[0];
        const rootPath = rootFrame ? buildPathToFrame(parsed, rootFrame.id) ?? [rootFrame.id] : [];
        set((s) => {
          s.play = parsed;
          s.currentBranchPath = rootPath;
          s.currentFrameIndex = rootPath.length ? rootPath.length - 1 : 0;
          s.courtType = parsed.courtType ?? "half";
          s.selectedTokenId = null;
          s.selectedArrowId = null;
          const focusFrameId = rootPath.length ? rootPath[rootPath.length - 1] : rootFrame?.id;
          const firstFrame = focusFrameId ? getFrameById(parsed, focusFrameId) : rootFrame;
          s.play.possession = firstFrame?.possession ?? parsed.possession;
          s.hasUnsavedChanges = false;
        });
        return true;
      } catch (e) {
        console.error("Import failed:", e);
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
