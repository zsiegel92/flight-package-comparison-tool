# GoWild Decision Studio

Install dependencies with `pnpm install` (Node.js 20.19+ or 22.12+).

- `pnpm dev` starts the Vite development server.
- `pnpm build` writes the standalone production app to `dist/index.html`.
- `pnpm preview` serves the production build locally.
- `pnpm test` runs the calculation tests.
- `pnpm typecheck` checks the application and domain code.

The root `index.html` is Vite's HTML entry point. The React app and CSS live in
`src/`, and the app uses the calculation and presets in `src/domain/`.

Open `dist/index.html` directly in a browser to use the app offline, or serve
`dist/` over HTTP to deploy it.
