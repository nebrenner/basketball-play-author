import { beforeEach, describe, expect, it } from "vitest";
import { usePlayStore } from "./store";

describe("usePlayStore", () => {
  beforeEach(() => {
    usePlayStore.setState(() => ({
      play: null,
      currentFrameIndex: 0,
      editorMode: "select",
      draftArrow: { active: false },
    }));
  });

  it("initializes a default play with a starting frame and tokens", () => {
    const { initDefaultPlay } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    const state = usePlayStore.getState();

    expect(state.play).not.toBeNull();
    expect(state.play?.frames).toHaveLength(1);
    expect(Object.keys(state.play?.frames[0]?.tokens ?? {})).toHaveLength(6);
    expect(state.currentFrameIndex).toBe(0);
  });

  it("adds a computed frame and advances the active frame index", () => {
    const { initDefaultPlay, advanceFrame } = usePlayStore.getState();

    initDefaultPlay("Test Play");
    advanceFrame();
    const state = usePlayStore.getState();

    expect(state.play?.frames).toHaveLength(2);
    expect(state.currentFrameIndex).toBe(1);
  });
});
