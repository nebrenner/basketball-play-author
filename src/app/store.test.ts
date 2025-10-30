import { beforeEach, describe, expect, it } from "vitest";
import { usePlayStore } from "./store";

const currentFrameOf = (state: ReturnType<typeof usePlayStore.getState>) => {
  const play = state.play;
  if (!play || state.currentBranchPath.length === 0) return null;
  const frameId = state.currentBranchPath[state.currentFrameIndex];
  return play.frames.find((frame) => frame.id === frameId) ?? null;
};

describe("usePlayStore", () => {
  beforeEach(() => {
    usePlayStore.setState(() => ({
      play: null,
      currentFrameIndex: 0,
      currentBranchPath: [],
      courtType: "half",
    }));
  });

  it("initializes a default play with a starting frame and tokens", () => {
    const { initDefaultPlay } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    const state = usePlayStore.getState();

    expect(state.play).not.toBeNull();
    expect(state.play?.frames).toHaveLength(1);
    expect(state.currentBranchPath).toHaveLength(1);
    expect(Object.keys(state.play?.frames[0]?.tokens ?? {})).toHaveLength(5);
    expect(state.play?.frames[0]?.possession).toBe("P1");
    expect(state.currentFrameIndex).toBe(0);
  });

  it("adds a computed frame and advances the active frame index", () => {
    const { initDefaultPlay, advanceFrame } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    advanceFrame();
    const state = usePlayStore.getState();

    expect(state.play?.frames).toHaveLength(2);
    expect(state.currentFrameIndex).toBe(1);
    expect(state.currentBranchPath).toHaveLength(2);
  });

  it("creates a new branch when advancing from an earlier step", () => {
    const { initDefaultPlay, advanceFrame, setCurrentFrameIndex } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    advanceFrame();

    const stateAfterFirstAdvance = usePlayStore.getState();
    const firstBranchChildId = stateAfterFirstAdvance.currentBranchPath[1];

    setCurrentFrameIndex(0);
    usePlayStore.getState().advanceFrame();

    const stateAfterBranch = usePlayStore.getState();
    const rootFrame = stateAfterBranch.play?.frames[0];
    expect(rootFrame?.nextFrameIds).toHaveLength(2);
    expect(stateAfterBranch.play?.frames).toHaveLength(3);
    expect(stateAfterBranch.currentBranchPath).toHaveLength(2);
    expect(stateAfterBranch.currentFrameIndex).toBe(1);
    const newChildId = stateAfterBranch.currentBranchPath[1];
    expect(newChildId).not.toBe(firstBranchChildId);
  });

  it("captures pass targets and hands off possession on advance", () => {
    const { initDefaultPlay } = usePlayStore.getState();

    initDefaultPlay("Test Play");

    const createArrow = usePlayStore.getState().createArrow;
    createArrow("pass", "P1");

    const stateAfterArrow = usePlayStore.getState();
    const arrowId = stateAfterArrow.selectedArrowId;
    expect(arrowId).not.toBeNull();
    const frame = currentFrameOf(stateAfterArrow);
    const targetPos = frame?.tokens.P2;
    expect(targetPos).toBeDefined();

    if (!arrowId || !targetPos) throw new Error("failed to create pass arrow");

    usePlayStore.getState().updateArrowEndpoint(arrowId, targetPos);

    const afterEndpoint = usePlayStore.getState();
    expect(afterEndpoint.play?.arrowsById[arrowId]?.toTokenId).toBe("P2");

    afterEndpoint.advanceFrame();

    const afterAdvance = usePlayStore.getState();
    expect(afterAdvance.play?.frames).toHaveLength(2);
    const newFrame = currentFrameOf(afterAdvance);
    expect(newFrame?.possession).toBe("P2");
  });

  it("allows setting the starting possession to a different player", () => {
    const { initDefaultPlay, setPossession } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    setPossession("P3");

    const state = usePlayStore.getState();
    const frame = currentFrameOf(state);

    expect(state.play?.possession).toBe("P3");
    expect(frame?.possession).toBe("P3");
  });

  it("updates the default frame when switching court types", () => {
    const { initDefaultPlay } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    const before = usePlayStore.getState();
    const beforeP1X = before.play?.frames[0]?.tokens.P1?.x ?? 0;

    usePlayStore.getState().setCourtType("full");
    const after = usePlayStore.getState();

    expect(after.courtType).toBe("full");
    expect(after.play?.courtType).toBe("full");
    expect(after.play?.frames[0]?.tokens.P1?.x).not.toBeCloseTo(beforeP1X);
  });

  it("lets the user set custom step labels", () => {
    const { initDefaultPlay, setCurrentFrameTitle } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    setCurrentFrameTitle("Opening Alignment");

    let state = usePlayStore.getState();
    let frame = currentFrameOf(state);
    expect(frame?.title).toBe("Opening Alignment");

    // Blank strings should clear the value
    setCurrentFrameTitle("   ");
    state = usePlayStore.getState();
    frame = currentFrameOf(state);
    expect(frame?.title).toBeUndefined();
  });

  it("creates two children when branching from the current step", () => {
    const { initDefaultPlay, branchFrame } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    branchFrame();

    const state = usePlayStore.getState();
    const play = state.play;
    expect(play?.frames).toHaveLength(3);

    const rootFrame = play?.frames[0];
    expect(rootFrame?.nextFrameIds).toHaveLength(2);

    const [firstChildId, secondChildId] = rootFrame?.nextFrameIds ?? [];
    expect(firstChildId).toBeDefined();
    expect(secondChildId).toBeDefined();
    expect(firstChildId).not.toBe(secondChildId);

    const firstChild = play?.frames.find((frame) => frame.id === firstChildId);
    const secondChild = play?.frames.find((frame) => frame.id === secondChildId);
    expect(firstChild?.parentId).toBe(rootFrame?.id ?? null);
    expect(secondChild?.parentId).toBe(rootFrame?.id ?? null);

    expect(state.currentBranchPath.length).toBe(2);
    expect(state.currentBranchPath[1]).toBe(firstChildId);
  });
});
