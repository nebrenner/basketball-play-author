import { usePlayStore } from '../../app/store'

export const PlaybackControls = () => {
  const activeFrameIndex = usePlayStore((state) => state.activeFrameIndex)
  const currentPlay = usePlayStore((state) => state.currentPlay)
  const setActiveFrameIndex = usePlayStore((state) => state.setActiveFrameIndex)

  if (!currentPlay) return null

  const atStart = activeFrameIndex === 0
  const atEnd = activeFrameIndex === currentPlay.frames.length - 1

  return (
    <div className="playback-controls">
      <button type="button" onClick={() => setActiveFrameIndex(0)} disabled={atStart}>
        ⏮
      </button>
      <button type="button" onClick={() => setActiveFrameIndex(activeFrameIndex - 1)} disabled={atStart}>
        ◀
      </button>
      <button type="button" onClick={() => setActiveFrameIndex(activeFrameIndex + 1)} disabled={atEnd}>
        ▶
      </button>
      <button type="button" onClick={() => setActiveFrameIndex(currentPlay.frames.length - 1)} disabled={atEnd}>
        ⏭
      </button>
    </div>
  )
}

export default PlaybackControls
