import Konva from 'konva'

export type PlaybackOptions = {
  tweens: Konva.Tween[]
  onComplete?: () => void
}

export const playTweens = ({ tweens, onComplete }: PlaybackOptions) => {
  if (!tweens.length) {
    onComplete?.()
    return
  }

  let remaining = tweens.length
  tweens.forEach((tween) => {
    const previousFinish = tween.onFinish
    tween.onFinish = () => {
      previousFinish?.call(tween)
      remaining -= 1
      if (remaining === 0) {
        onComplete?.()
      }
    }
    tween.play()
  })
}
