import { usePlayStore } from '../../app/store'

export const TimelineBar = () => {
  const currentPlay = usePlayStore((state) => state.currentPlay)
  const activeFrameIndex = usePlayStore((state) => state.activeFrameIndex)
  const setActiveFrameIndex = usePlayStore((state) => state.setActiveFrameIndex)

  if (!currentPlay) return null

  return (
    <div className="timeline-bar">
      {currentPlay.frames.map((frame, index) => (
        <button
          key={frame.id}
          type="button"
          className={index === activeFrameIndex ? 'active' : ''}
          onClick={() => setActiveFrameIndex(index)}
        >
          Step {index + 1}
        </button>
      ))}
    </div>
  )
}

export default TimelineBar
