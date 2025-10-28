import { useEffect } from 'react'
import StageCanvas from '../components/StageCanvas'
import CourtLayer from '../components/layers/CourtLayer'
import TokenLayer from '../components/layers/TokenLayer'
import ArrowLayer from '../components/layers/ArrowLayer'
import Toolbar from '../components/ui/Toolbar'
import TimelineBar from '../components/ui/TimelineBar'
import { usePlayStore } from '../app/store'

export const EditorPage = () => {
  const currentPlay = usePlayStore((state) => state.currentPlay)
  const activeFrameIndex = usePlayStore((state) => state.activeFrameIndex)
  const createEmptyPlay = usePlayStore((state) => state.createEmptyPlay)

  useEffect(() => {
    if (!currentPlay) {
      createEmptyPlay('Practice Set')
    }
  }, [createEmptyPlay, currentPlay])

  return (
    <div className="editor-page">
      <Toolbar />
      {currentPlay ? (
        <>
          <StageCanvas>
            <CourtLayer />
            <ArrowLayer play={currentPlay} frameIndex={activeFrameIndex} />
            <TokenLayer play={currentPlay} frameIndex={activeFrameIndex} />
          </StageCanvas>
          <TimelineBar />
        </>
      ) : (
        <p>Initializing play...</p>
      )}
    </div>
  )
}

export default EditorPage
