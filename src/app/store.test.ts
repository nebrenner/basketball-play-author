import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayStore } from './store'

describe('usePlayStore', () => {
  beforeEach(() => {
    usePlayStore.setState({ currentPlay: null, activeFrameIndex: 0 })
  })

  it('creates an empty play with a default frame and tokens', () => {
    const { createEmptyPlay } = usePlayStore.getState()

    createEmptyPlay('Test Play')
    const { currentPlay, activeFrameIndex } = usePlayStore.getState()

    expect(currentPlay).not.toBeNull()
    expect(currentPlay?.frames).toHaveLength(1)
    expect(currentPlay?.tokens).toHaveLength(6)
    expect(activeFrameIndex).toBe(0)
  })

  it('adds a new frame and advances the active frame index', () => {
    const { createEmptyPlay, addFrame } = usePlayStore.getState()

    createEmptyPlay('Test Play')
    addFrame()
    const { currentPlay, activeFrameIndex } = usePlayStore.getState()

    expect(currentPlay?.frames).toHaveLength(2)
    expect(activeFrameIndex).toBe(1)
  })
})
