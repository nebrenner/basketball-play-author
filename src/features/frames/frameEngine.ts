import type { Frame, Play, XY } from '../../app/types'

export const moveTokenToPoint = (frame: Frame, tokenId: string, point: XY): Frame => ({
  ...frame,
  tokens: {
    ...frame.tokens,
    [tokenId]: point,
  },
})

export const applyFrameToPlay = (play: Play, frame: Frame): Play => ({
  ...play,
  frames: play.frames.map((existingFrame) => (existingFrame.id === frame.id ? frame : existingFrame)),
  meta: {
    ...play.meta,
    updatedAt: new Date().toISOString(),
  },
})
