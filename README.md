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

## Deployment

Automated deployments to GitHub Pages run through the `Deploy to GitHub Pages` workflow located in `.github/workflows/deploy.yml`. To enable publishing from your fork or repository:

1. Push the workflow file to your default branch (`main` by default).
2. In GitHub, navigate to **Settings → Pages** for the repository.
3. Under **Build and deployment**, choose **Source: GitHub Actions**. GitHub will automatically connect the workflow and create a `github-pages` environment.
4. Trigger a deployment by pushing to `main` or running the workflow manually from the **Actions** tab. The site will be available at `https://<your-username>.github.io/<repository-name>/` once the run finishes.

The Vite configuration automatically adjusts the `base` path during GitHub Actions builds using the repository name, so no additional manual configuration is required for assets to resolve correctly.

## Next Steps

- Implement arrow drawing interactions and frame advancement.
- Persist plays to local storage or IndexedDB.
- Add playback animations using `Konva.Tween` for smooth transitions.
