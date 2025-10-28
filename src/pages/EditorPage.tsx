import { useEffect } from 'react'
import StageCanvas from '../components/StageCanvas'
import Toolbar from '../components/ui/Toolbar'
import TimelineBar from '../components/ui/TimelineBar'
import { usePlayStore } from '../app/store'

export const EditorPage = () => {
  const play = usePlayStore((state) => state.play)
  const initDefaultPlay = usePlayStore((state) => state.initDefaultPlay)

  useEffect(() => {
    if (!play) {
      initDefaultPlay('Practice Set')
    }
  }, [initDefaultPlay, play])

  return (
    <div className="editor-page">
      <Toolbar />
      {play ? (
        <>
          <StageCanvas />
          <TimelineBar />
        </>
      ) : (
        <p>Initializing play...</p>
      )}
    </div>
  )
}

export default EditorPage
