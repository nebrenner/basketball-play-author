import type { Arrow, Frame } from '../../app/types'

export const getActiveArrows = (frame: Frame, arrowsById: Record<string, Arrow>): Arrow[] => {
  return frame.arrows.map((arrowId) => arrowsById[arrowId]).filter(Boolean)
}

export const isPassArrow = (arrow: Arrow): boolean => arrow.kind === 'pass'
