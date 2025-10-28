import { Layer, Rect } from 'react-konva'

export const CourtLayer = () => {
  return (
    <Layer listening={false}>
      <Rect width={800} height={600} fill="#e5e7eb" stroke="#d1d5db" strokeWidth={2} cornerRadius={16} />
    </Layer>
  )
}

export default CourtLayer
