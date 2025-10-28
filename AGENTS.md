# Agent Guidelines for `basketball-play-author`

## General Rules
- Use TypeScript strict mode assumptions when editing `.ts` and `.tsx` files.
- Prefer functional React components and hooks. Avoid class components.
- Keep styling lightweight; rely on utility classes defined in `src/main.css` when possible.
- When adding Konva shapes, keep rendering logic declarative and avoid mutating nodes directly.
- Organize new features within the existing folder structure (`app`, `components`, `features`, `pages`).
- Run `npm run lint` to check code quality before submitting changes.
- Run `npm test` to execute the Vitest suite; add or update tests alongside functional changes.

## PR Message Expectations
- Summaries should highlight high-level changes (structure, store updates, UI scaffolding).
- Testing section should list any commands run, or note if no automated tests were executed.
