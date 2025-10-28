import type { ArrowKind } from '../../app/types'

type ArrowStyle = {
  stroke: string
  dash?: number[]
  hasArrowHead?: boolean
}

export const arrowStyles: Record<ArrowKind, ArrowStyle> = {
  cut: {
    stroke: '#1f2937',
    hasArrowHead: true,
  },
  dribble: {
    stroke: '#2563eb',
    dash: [8, 8],
    hasArrowHead: true,
  },
  screen: {
    stroke: '#065f46',
  },
  pass: {
    stroke: '#f97316',
    dash: [12, 8],
    hasArrowHead: true,
  },
}
