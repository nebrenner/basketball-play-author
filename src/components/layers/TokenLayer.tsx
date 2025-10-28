import { Circle, Group, Layer, Text } from 'react-konva'
import type { Play } from '../../app/types'

type TokenLayerProps = {
  play: Play
  frameIndex: number
}

export const TokenLayer = ({ play, frameIndex }: TokenLayerProps) => {
  const frame = play.frames[frameIndex]
  return (
    <Layer>
      {play.tokens.map((token) => {
        const position = frame.tokens[token.id]
        if (!position) return null
        const radius = token.kind === 'BALL' ? 12 : 18
        return (
          <Group key={token.id} x={position.x} y={position.y}>
            <Circle radius={radius} fill="#111827" />
            <Text x={-radius / 2} y={-8} text={token.label} fill="#f9fafb" fontSize={16} />
          </Group>
        )
      })}
    </Layer>
  )
}

export default TokenLayer
