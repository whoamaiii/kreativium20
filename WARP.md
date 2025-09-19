# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 1) Commonly used commands

- Dev server: npm run dev (Vite dev at http://127.0.0.1:5173)
- Build: npm run build (standard) and npm run build:poc (POC mode with heavy features stubbed)
- Preview: npm run preview and npm run preview:poc (serves http://127.0.0.1:4173)
- Lint: npm run lint
- Typecheck: npm run typecheck
- Unit tests: npm test (watch) and npm test -- --run (single pass)
- Run a single test file: npx vitest run path/to/test.spec.ts
- Run a single test name: npx vitest run -- -t "test name substring"
- Config test only: npm run test:config
- Performance tests: npm run test:performance (override threshold locally via
  CI_PERF_THRESHOLD_MS=1200 npm run test:performance)
- Bias tests: npm run test:bias (override via CI_BIAS_TOL=0.05 npm run test:bias)
- E2E tests: npm run e2e (starts preview in POC mode automatically via Playwright config);
  UI/debug/headless variants: npm run e2e:ui, npm run e2e:debug, npm run e2e:headless; first-time
  browser install: npm run e2e:install
- Lighthouse CI: npm run lighthouse and npm run lighthouse:view
- i18n scanning/report: npm run i18n:scan, npm run i18n:check, npm run i18n:report
- Demo data seed: npm run seed:demo
- Local storage reset (project-scoped): npm run reset-storage, npm run reset-storage:all, npm run
  reset-storage:dry
- Bundle analysis: npm run analyze (build then open artifacts/bundle-stats.html at :3001)
- Pre-PR verification: npm run prepare-local-pr

## 2) Environment/modes and gotchas

- Vite modes: default dev/prod. POC mode activates via either MODE=poc (e.g., vite --mode poc or npm
  run dev:poc/build:poc/preview:poc) or VITE_POC_MODE=true. In POC mode, heavy modules are stubbed
  via vite.config.ts aliases:
  - '@/workers/analytics.worker' -> lightweight stub
  - '@/components/Visualization3D' -> no-op stub
- Browser echo and component tagger are enabled in development unless disabled with env:
  BROWSER_ECHO=0 or COMPONENT_TAGGER=0.
- Mock data toggle (per project rule): set VITE_USE_MOCK=1 (or NEXT_PUBLIC_USE_MOCK=1) to source
  mock data via src/data/source.ts.
- Analytics dev override: VITE_ANALYTICS_DEV_OVERRIDE=1 lowers thresholds and clears caches on
  startup in dev; see docs/ENVIRONMENT_VARIABLES.md and src/lib/analyticsConfigOverride.ts.

## 3) High-level architecture (big-picture wiring across files, not a file listing)

- Build and aliasing: Vite config defines '@' -> ./src. Manual chunking groups heavy deps into
  dedicated chunks: charts (echarts, recharts), 3d (three, r3f, drei), ml (@tensorflow/tfjs), i18n
  (i18next, react-i18next). Respect these chunks when adding large libs to keep bundle splits
  stable.
- Testing stack: Vitest with jsdom and multiple setup files loaded before tests
  (tests/setup.polyfills.ts, tests/setup.dom.ts, tests/setup.radix.ts, src/setupTests.ts,
  tests/setup.ts). E2E uses Playwright; its webServer step builds and previews in POC mode by
  default.
- Internationalization: react-i18next used; lint rules enforce no literal UI strings in JSX. Add
  strings to i18n namespaces and use t()/Trans. Use scripts under scripts/i18n for scanning and
  offender reports.
- Analytics runtime configuration: Do not hardcode thresholds. Read/modify via analyticsConfig
  manager (see docs/CONFIGURATION_SCHEMA.md and src/lib/analyticsConfig.ts). Provide safe fallbacks;
  caches invalidate on config change.
- Workers and performance: Long-running analytics/ML tasks are offloaded to web workers (see
  src/workers). Create/terminate workers via hooks to avoid leaks. Avoid main-thread blocking.
- Charts behavior: Centralized ECharts defaults in EChartContainer and ChartKit enforce no hover
  dimming and append tooltips to body; container overflow visible. Keep keys stable to avoid remount
  on hover. See docs/CHART_HOVER_BEHAVIOR.md.
- UI/Styling: Tailwind CSS utilities only; avoid inline styles (eslint rule enforces; Radix
  exceptions must be annotated). Prefer shadcn-style primitives in src/components/ui with consistent
  variants/sizes.
- Strict TypeScript: tsconfig.\* enables strict flags; lint rules require explicit types on exports,
  no console in app code, stable keys (no array indices), hooks not conditional, and cleanup of
  effects.

## 4) Repository conventions and directory responsibilities (essential ones only)

- Aliases: import internal modules with '@' (configured in Vite/TS). Avoid deep relative paths.
- Layout: Components under src/components (ui/, lazy/, optimized/). Hooks in src/hooks. Business
  logic/utils in src/lib. Shared types in src/types. Workers in src/workers. Keep feature boundaries
  and avoid cross-feature imports that break encapsulation.
- Logging: Use the central logger (src/lib/logger.ts); console calls are disallowed in shipped code
  by ESLint, except in scripts/tests.
- i18n: All user-facing text must come from react-i18next namespaces (common, dashboard, student,
  tracking, analytics, settings). Use useTranslation() and add missing keys to nb and en.
- Caching/analytics: Use provided cache-key builders and workers; include counts and input hashes in
  cache keys; purge via TTL/LRU tags.

## 5) CI expectations (actionable locally)

- The CI pipeline runs: lint, docs check (markdownlint+prettier), typecheck, unit tests, config
  tests, performance tests (CI_PERF_THRESHOLD_MS default 1500), bias tests (CI_BIAS_TOL default
  0.08), build, and Playwright E2E. You can reproduce locally with the scripts above; override
  thresholds using the same env vars.

## 6) Ports and URLs

- Dev: http://127.0.0.1:5173
- Preview: http://127.0.0.1:4173
