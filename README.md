# GoWild Decision Studio

Install dependencies with `pnpm install` (Node.js 20.19+ or 22.12+).

- `pnpm dev` starts the Vite development server.
- `pnpm build` produces the offline standalone file `dist/index.html`.
- `pnpm preview` serves the production build locally.
- `pnpm test` runs the calculation tests; `pnpm typecheck` checks the extracted domain code.

The current application is still embedded in `index.html`. Vite reloads the page when that file changes; component-level hot module replacement will become available as the UI is migrated into modules. The extracted domain code is not yet connected to the interface. The original prior attempt is retained separately.
