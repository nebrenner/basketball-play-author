import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const base = repoName ? `/${repoName}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
