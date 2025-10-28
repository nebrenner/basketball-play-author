import { z } from 'zod'

export const xySchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const tokenSchema = z.object({
  id: z.string(),
  kind: z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'BALL']),
  label: z.string(),
})

export const frameSchema = z.object({
  id: z.string(),
  tokens: z.record(z.string(), xySchema),
  arrows: z.array(z.string()),
  note: z.string().optional(),
})

export const arrowSchema = z.object({
  id: z.string(),
  from: z.string(),
  toPoint: xySchema.optional(),
  toTokenId: z.string().optional(),
  kind: z.enum(['cut', 'dribble', 'screen', 'pass']),
  points: z.array(xySchema),
})

export const playSchema = z.object({
  id: z.string(),
  meta: z.object({
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  tokens: z.array(tokenSchema),
  frames: z.array(frameSchema),
  arrowsById: z.record(z.string(), arrowSchema),
  possession: z.string().optional(),
})

export type PlaySchema = z.infer<typeof playSchema>
