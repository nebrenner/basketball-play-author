import EditorPage from './pages/EditorPage'
import PlaybackPage from './pages/PlaybackPage'

export const appRoutes = [
  { path: '/', element: <EditorPage /> },
  { path: '/playback', element: <PlaybackPage /> },
]
