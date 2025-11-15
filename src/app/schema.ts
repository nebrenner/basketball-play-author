import { z } from "zod";

export const XYSchema = z.object({ x: z.number(), y: z.number() });
export const IdSchema = z.string().min(1);

export const PlayerKindSchema = z.enum(["P1","P2","P3","P4","P5"]);
export const ArrowKindSchema = z.enum(["cut","dribble","screen","pass"]);
export const CourtTypeSchema = z.enum(["half", "full"]);

export const TokenSchema = z.object({
  id: IdSchema,
  kind: PlayerKindSchema,
  label: z.string().min(1),
});

export const FrameSchema = z.object({
  id: IdSchema,
  tokens: z.record(IdSchema, XYSchema),
  arrows: z.array(IdSchema),
  title: z.string().min(1).optional(),
  note: z.string().optional(),
  possession: IdSchema.optional(),
  parentId: IdSchema.nullable().optional(),
  nextFrameIds: z.array(IdSchema).optional(),
});

export const ArrowSchema = z.object({
  id: IdSchema,
  from: IdSchema,
  toPoint: XYSchema.optional(),
  toTokenId: IdSchema.optional(),
  kind: ArrowKindSchema,
  points: z.array(XYSchema),
});

export const PlaySchema = z.object({
  id: IdSchema,
  meta: z.object({
    name: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  tokens: z.array(TokenSchema),
  frames: z.array(FrameSchema).min(1),
  arrowsById: z.record(IdSchema, ArrowSchema),
  possession: IdSchema.optional(),
  courtType: CourtTypeSchema.optional().default("half"),
});

export type PlayDTO = z.infer<typeof PlaySchema>;

export const PlayCollectionSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  plays: z.array(PlaySchema),
});

export type PlayCollectionDTO = z.infer<typeof PlayCollectionSchema>;
