import { Stage } from 'react-konva'
import type { PropsWithChildren } from 'react'

const STAGE_WIDTH = 800
const STAGE_HEIGHT = 600

export const StageCanvas = ({ children }: PropsWithChildren) => {
  return (
    <Stage width={STAGE_WIDTH} height={STAGE_HEIGHT} style={{ background: '#f3f4f6' }}>
      {children}
    </Stage>
  )
}

export default StageCanvas
