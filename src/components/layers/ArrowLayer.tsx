import { Arrow as KonvaArrow, Layer, Line } from 'react-konva'
import type { Play } from '../../app/types'
import { arrowStyles } from '../../features/arrows/arrowStyles'
import { getActiveArrows, isPassArrow } from '../../features/arrows/arrowUtils'

export type ArrowLayerProps = {
  play: Play
  frameIndex: number
}

export const ArrowLayer = ({ play, frameIndex }: ArrowLayerProps) => {
  const frame = play.frames[frameIndex]
  const arrows = getActiveArrows(frame, play.arrowsById)

  return (
    <Layer listening={false}>
      {arrows.map((arrow) => {
        const style = arrowStyles[arrow.kind]
        if (isPassArrow(arrow) && arrow.points.length >= 4) {
          return (
            <Line
              key={arrow.id}
              points={arrow.points.flatMap((point) => [point.x, point.y])}
              stroke={style.stroke}
              dash={style.dash}
              bezier
              tension={0.5}
              strokeWidth={3}
            />
          )
        }

        const points = arrow.points.flatMap((point) => [point.x, point.y])
        return (
          <KonvaArrow
            key={arrow.id}
            points={points}
            stroke={style.stroke}
            dash={style.dash}
            pointerLength={style.hasArrowHead ? 10 : 0}
            pointerWidth={style.hasArrowHead ? 10 : 0}
            strokeWidth={3}
          />
        )
      })}
    </Layer>
  )
}

export default ArrowLayer
