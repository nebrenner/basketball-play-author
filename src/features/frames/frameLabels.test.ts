import { describe, expect, it } from "vitest";
import type { Frame, Play } from "../../app/types";
import { computeStepLabels, defaultStepTitle } from "./frameLabels";

const createFrame = (
  id: string,
  parentId: string | null,
  nextFrameIds: string[] = [],
): Frame => ({
  id,
  tokens: {},
  arrows: [],
  parentId,
  nextFrameIds,
});

const createPlay = (frames: Frame[]): Play => ({
  id: "play-1",
  meta: { name: "Test", createdAt: "", updatedAt: "" },
  tokens: [],
  frames,
  arrowsById: {},
  courtType: "half",
});

describe("computeStepLabels", () => {
  it("assigns sequential numbers for a linear path", () => {
    const frames: Frame[] = [
      createFrame("f1", null, ["f2"]),
      createFrame("f2", "f1", ["f3"]),
      createFrame("f3", "f2", []),
    ];
    const play = createPlay(frames);

    const labels = computeStepLabels(play);

    expect(labels.get("f1")).toBe("1");
    expect(labels.get("f2")).toBe("2");
    expect(labels.get("f3")).toBe("3");
  });

  it("alternates letter and number segments through branches", () => {
    const frames: Frame[] = [
      createFrame("f1", null, ["f2"]),
      createFrame("f2", "f1", ["f3", "f4"]),
      createFrame("f3", "f2", ["f5"]),
      createFrame("f4", "f2", []),
      createFrame("f5", "f3", ["f6", "f7"]),
      createFrame("f6", "f5", []),
      createFrame("f7", "f5", []),
    ];
    const play = createPlay(frames);

    const labels = computeStepLabels(play);

    expect(labels.get("f1")).toBe("1");
    expect(labels.get("f2")).toBe("2");
    expect(labels.get("f3")).toBe("2a");
    expect(labels.get("f4")).toBe("2b");
    expect(labels.get("f5")).toBe("2a1");
    expect(labels.get("f6")).toBe("2a1a");
    expect(labels.get("f7")).toBe("2a1b");
  });

  it("integrates with defaultStepTitle to build labels", () => {
    const frames: Frame[] = [
      createFrame("f1", null, ["f2"]),
      createFrame("f2", "f1", ["f3", "f4"]),
      createFrame("f3", "f2", []),
      createFrame("f4", "f2", []),
    ];
    const play = createPlay(frames);
    const labels = computeStepLabels(play);

    const fallback = labels.get("f4") ?? "";
    expect(defaultStepTitle(fallback)).toBe("Step 2b");
  });
});
