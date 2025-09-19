# Repository Guidelines

## Project Structure & Module Organization

Kreativium Beta v2 runs on Vite, React, and TypeScript. Core source lives in `src/`, with
`components/` for UI primitives, `pages/` for routed views, `lib/` and `utils/` for shared logic,
`config/` for analytics settings, and `locales/` for i18n bundles. App-facing docs and helpers
reside in `src/docs/` and `src/tests/`. End-to-end, integration, and specialty suites live in
`tests/` (see `tests/unit`, `tests/e2e`, `tests/performance`). Production artifacts land in `dist/`,
long-lived reports in `artifacts/`, automation helpers in `scripts/`, and contributor references in
`docs/`.

## Build, Test & Development Commands

Install dependencies with `npm install`. Use `npm run dev` for the Vite dev server (port 5173) and
`npm run build` to emit the production bundle into `dist/`. `npm run preview` serves the build
locally. Run `npm run lint` (ESLint 9 + TypeScript) and `npm run typecheck` before pushing. Unit and
integration suites use `npm run test`; targeted runs include `npm run test:config`,
`npm run test:performance`, and `npm run test:bias`. Execute Playwright suites with `npm run e2e` or
`npm run e2e:a11y`. Markdown and docs checks run via `npm run docs:check`, while seed data for demos
comes from `npm run seed:demo`.

## Coding Style & Naming Conventions

Write modern TypeScript with React hooks and Tailwind. Use two-space indentation, trailing commas
where TypeScript defaults apply, and prefer `PascalCase` for React components, `camelCase` for
helpers/hooks, and kebab-case filenames (e.g. `sensor-panel.tsx`). Import shared utilities through
aliases like `@/lib`. Let ESLint autofix via `npx lint-staged` or `npm run lint -- --fix`, and
format Markdown with `npm run docs:format`. Avoid ad-hoc styling—compose classes with `cn` helpers
and tokens from `tailwind.config.ts`.

## Testing Guidelines

Unit tests co-locate with source in `src/**/__tests__` or `src/tests`, while cross-cutting suites
belong under `tests/`. Follow the `*.test.ts(x)` pattern and keep fixtures in `tests/utils`. Use
Testing Library idioms (`screen.findBy...`). Run `npm run test -- --coverage` when touching
analytics logic and update `tests/TEST_COVERAGE_REPORT.md` if thresholds change. For e2e updates,
sync selectors with `tests/e2e/utils`. Keep Playwright recordings out of git; rely on deterministic
actions.

## Commit & Pull Request Guidelines

Commits follow a light Conventional Commit style (`feat:`, `fix:`, `chore:`) as seen in `git log`.
Keep subject lines imperative and under 72 characters, with technical context in the body. Before
opening a PR, run `npm run prepare-local-pr`, link relevant issues, and review
`docs/PR_CHECKLIST.md` for screenshots, accessibility notes, and analytics diffs. Reference new
scripts or configs in `docs/CONFIGURATION_SCHEMA.md` when they change.
