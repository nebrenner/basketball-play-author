import StageCanvas from '../components/StageCanvas'
import CourtLayer from '../components/layers/CourtLayer'
import TokenLayer from '../components/layers/TokenLayer'
import ArrowLayer from '../components/layers/ArrowLayer'
import PlaybackControls from '../components/ui/PlaybackControls'
import { usePlayStore } from '../app/store'

export const PlaybackPage = () => {
  const currentPlay = usePlayStore((state) => state.currentPlay)
  const activeFrameIndex = usePlayStore((state) => state.activeFrameIndex)

  if (!currentPlay) {
    return <p>No play selected for playback.</p>
  }

  return (
    <div className="playback-page">
      <StageCanvas>
        <CourtLayer />
        <ArrowLayer play={currentPlay} frameIndex={activeFrameIndex} />
        <TokenLayer play={currentPlay} frameIndex={activeFrameIndex} />
      </StageCanvas>
      <PlaybackControls />
    </div>
  )
}

export default PlaybackPage
