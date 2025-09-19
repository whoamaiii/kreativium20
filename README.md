# Kreativium Beta v2

Modern Vite + React + TypeScript app with an accessible, analytics-driven UI and strong testing,
i18n, and performance practices.

---

## Quickstart

1. Install dependencies

```bash
npm install
```

1. Start the dev server (Vite on port 5173)

```bash
npm run dev
```

1. Build and preview locally

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18 + TypeScript
- Vite 7 + SWC
- Tailwind CSS + shadcn/ui patterns
- Testing: Vitest + Testing Library + Playwright
- i18n: i18next + resource bundles in `src/locales`

## Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Production build to `dist/`
- `npm run preview`: Serve the built app locally
- `npm run lint` / `npm run typecheck`: ESLint 9 + TS type checks
- `npm run test`: Unit/integration tests (Vitest)
- `npm run e2e`: Playwright end-to-end tests
- `npm run docs:check`: Prettier + markdownlint on docs
- `npm run seed:demo`: Seed demo content

## Project Structure

```text
src/
  components/     # Reusable UI components
  pages/          # Routed views
  lib/, utils/    # Shared logic and helpers
  config/         # Analytics and app config
  locales/        # i18n bundles
tests/
  e2e, unit, integration, performance
docs/             # Contributor and user docs
dist/             # Production build output
```

## Quality & CI Hints

- Keep functions small and focused; follow single-responsibility
- Prefer composition, hooks, and dependency injection for testability
- Run `npm run lint` and `npm run typecheck` before commits/PRs
- For analytics changes, run tests with coverage and update thresholds if needed

## Contributing

1. Create a topic branch from `main`
1. Commit using conventional style (e.g., `feat:`, `fix:`, `chore:`)
1. Open a PR and include screenshots/accessibility notes as relevant

## License

This project is licensed under the MIT License.

<!-- Detailed historical notes retained below for context. -->

## About

This project was imported from the kreativiumbeta2 local development environment. It contains:

- **Dist folder**: Built application artifacts ready for deployment
- **MLX Backend**: Python backend for machine learning inference
- **Public folder**: Static assets and model configurations

## Legacy Project Structure

```text
kreativiumbeta2/
├── dist/              # Built application
│   ├── assets/        # Bundled JavaScript and CSS
│   ├── models/        # Model configuration files
│   └── index.html     # Main application entry
├── mlx-backend/       # Python ML backend
│   └── models/        # MLX model files
└── public/            # Static assets
    └── models/        # Public model files
```

## Features

- **Sensory Tracking**: Comprehensive sensory input monitoring
- **Emotion Analytics**: Advanced emotion pattern analysis
- **AI Integration**: Gemma 3 270M model for insights
- **Report Generation**: Automated PDF reports
- **Real-time Analytics**: Live pattern detection

## Deployment

The `dist` folder contains the production-ready build that can be deployed to any static hosting
platform.

## Configuration

Model configurations are stored in `dist/models/gemma3-270m-it/` with:

- `config.json` - Model configuration
- `tokenizer_config.json` - Tokenizer settings

## Notes

- Large binary files (`*.onnx`, `*.bin`, `*.safetensors`) are excluded from git
- WASM files are excluded due to size constraints
- Python virtual environment is excluded from git

## Original Project

This is a continuation of the KreativiumV17 project, representing the beta v2 iteration with
enhanced ML capabilities and improved analytics.
