export type Id = string
export type XY = { x: number; y: number }

export type PlayerKind = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'BALL'
export type ArrowKind = 'cut' | 'dribble' | 'screen' | 'pass'

export type Token = {
  id: Id
  kind: PlayerKind
  label: string
}

export type Frame = {
  id: Id
  tokens: Record<Id, XY>
  arrows: Id[]
  note?: string
}

export type Arrow = {
  id: Id
  from: Id
  toPoint?: XY
  toTokenId?: Id
  kind: ArrowKind
  points: XY[]
}

export type Play = {
  id: Id
  meta: {
    name: string
    createdAt: string
    updatedAt: string
  }
  tokens: Token[]
  frames: Frame[]
  arrowsById: Record<Id, Arrow>
  possession?: Id
}
