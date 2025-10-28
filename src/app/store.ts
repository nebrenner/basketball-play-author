import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Arrow, Frame, Play, PlayerKind, Token, XY } from './types'

type PlayStoreState = {
  currentPlay: Play | null
  activeFrameIndex: number
  createEmptyPlay: (name: string) => void
  setActiveFrameIndex: (index: number) => void
  addFrame: () => void
}

const createInitialTokens = (): Token[] => {
  return [1, 2, 3, 4, 5].map((label): Token => ({
    id: nanoid(),
    kind: `P${label}` as PlayerKind,
    label: String(label),
  }))
}

const createInitialFrame = (tokens: Token[]): Frame => ({
  id: nanoid(),
  tokens: tokens.reduce<Record<string, XY>>((acc, token, index) => {
    acc[token.id] = { x: 100 + index * 40, y: 100 }
    return acc
  }, {}),
  arrows: [],
})

const buildEmptyPlay = (name: string): Play => {
  const playerTokens = createInitialTokens()
  const ballToken: Token = { id: nanoid(), kind: 'BALL', label: '●' }
  const tokens: Token[] = [...playerTokens, ballToken]
  const frame = createInitialFrame(tokens)
  const now = new Date().toISOString()
  return {
    id: nanoid(),
    meta: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    tokens,
    frames: [frame],
    arrowsById: {} as Record<string, Arrow>,
    possession: ballToken.id,
  }
}

export const usePlayStore = create<PlayStoreState>()(
  immer((set) => ({
    currentPlay: null,
    activeFrameIndex: 0,
    createEmptyPlay: (name: string) =>
      set(() => ({
        currentPlay: buildEmptyPlay(name),
        activeFrameIndex: 0,
      })),
    setActiveFrameIndex: (index: number) =>
      set((state) => {
        if (!state.currentPlay) return
        state.activeFrameIndex = Math.min(Math.max(index, 0), state.currentPlay.frames.length - 1)
      }),
    addFrame: () =>
      set((state) => {
        if (!state.currentPlay) return
        const lastFrame = state.currentPlay.frames[state.currentPlay.frames.length - 1]
        const newFrame: Frame = {
          ...lastFrame,
          id: nanoid(),
          arrows: [],
          tokens: { ...lastFrame.tokens },
        }
        state.currentPlay.frames.push(newFrame)
        state.activeFrameIndex = state.currentPlay.frames.length - 1
        state.currentPlay.meta.updatedAt = new Date().toISOString()
      }),
  }))
)
