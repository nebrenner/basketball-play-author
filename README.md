# Basketball Play Author

A Vite + React + TypeScript application for diagramming basketball plays and replaying them step-by-step. The app uses Konva for canvas rendering, Zustand + Immer for state management, and Zod for runtime validation of saved plays.

## Getting Started

```bash
npm install
npm run dev
```

Open the development server URL (typically http://localhost:5173) to access the editor.

## Project Structure

```
src/
  app/            # Shared store, schemas, and domain types
  components/     # Canvas layers and UI widgets
  features/       # Arrow, frame, and token helpers
  pages/          # High-level editor and playback screens
  assets/         # Static court artwork and related assets
```

## Key Libraries

- **Konva + react-konva**: Canvas rendering for the court, tokens, and arrows.
- **Zustand + Immer**: Lightweight state management with immutable updates.
- **Zod**: Runtime validation primitives for persisted play data.
- **nanoid**: Stable ID generation across frames and tokens.

## Available Scripts

- `npm run dev` – Start the development server.
- `npm run build` – Generate a production build.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint checks.

## Next Steps

- Implement arrow drawing interactions and frame advancement.
- Persist plays to local storage or IndexedDB.
- Add playback animations using `Konva.Tween` for smooth transitions.
