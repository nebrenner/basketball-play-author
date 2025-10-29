import { describe, expect, it } from "vitest";

import type { Frame, Play } from "../../app/types";
import { collectPlaybackOrder } from "./frameGraph";

describe("collectPlaybackOrder", () => {
  it("supports plays with frozen frames", () => {
    const root: Frame = {
      id: "root",
      tokens: {},
      arrows: [],
      parentId: null,
      nextFrameIds: undefined,
    };

    const child: Frame = {
      id: "child",
      tokens: {},
      arrows: [],
      parentId: "root",
      nextFrameIds: undefined,
    };

    const frozenPlay = Object.freeze({
      id: "play",
      meta: {
        name: "Test",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      tokens: [],
      frames: Object.freeze([Object.freeze(root), Object.freeze(child)]) as unknown as Frame[],
      arrowsById: {},
      possession: undefined,
      courtType: "half",
    }) as Play;

    const order = collectPlaybackOrder(frozenPlay);

    expect(order).toEqual(["root", "child", "root"]);
  });
});
