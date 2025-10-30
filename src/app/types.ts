export type Id = string;
export type XY = { x: number; y: number };

export type PlayerKind = "P1" | "P2" | "P3" | "P4" | "P5";
export type ArrowKind = "cut" | "dribble" | "screen" | "pass";

export type CourtType = "half" | "full";

export type Token = {
  id: Id; // stable across frames
  kind: PlayerKind;
  label: string; // "1".."5" or "●"
};

export type Frame = {
  id: Id;
  tokens: Record<Id, XY>; // token positions at this frame
  arrows: Id[]; // which arrows to render during this step
  title?: string;
  note?: string;
  possession?: Id;
  parentId?: Id | null;
  nextFrameIds?: Id[];
};

export type Arrow = {
  id: Id;
  from: Id; // source token id
  toPoint?: XY; // endpoint (cut/dribble/screen)
  toTokenId?: Id; // pass target
  kind: ArrowKind;
  points: XY[]; // path points (start/control/end) for rendering and animation
};

export type Play = {
  id: Id;
  meta: { name: string; createdAt: string; updatedAt: string };
  tokens: Token[]; // roster (six tokens)
  frames: Frame[]; // frame[0] is initial placement
  arrowsById: Record<Id, Arrow>; // arrows authored for frames
  possession?: Id; // which player holds the ball (token id)
  courtType: CourtType;
};
