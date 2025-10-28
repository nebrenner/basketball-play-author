import { usePlayStore } from '../../app/store'

export const Toolbar = () => {
  const createEmptyPlay = usePlayStore((state) => state.createEmptyPlay)
  return (
    <div className="toolbar">
      <button type="button" onClick={() => createEmptyPlay('Untitled Play')}>
        New Play
      </button>
    </div>
  )
}

export default Toolbar
