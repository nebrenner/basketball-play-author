import StageCanvas from '../components/StageCanvas'
import PlaybackControls from '../components/ui/PlaybackControls'
import { usePlayStore } from '../app/store'

export const PlaybackPage = () => {
  const play = usePlayStore((state) => state.play)

  if (!play) {
    return <p>No play selected for playback.</p>
  }

  return (
    <div className="playback-page">
      <StageCanvas />
      <PlaybackControls />
    </div>
  )
}

export default PlaybackPage
