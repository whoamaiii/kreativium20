# Test Suite Guide

This document explains the structure of the test suite, what each section covers, and how to run
targeted subsets including performance and visual snapshot tests.

- Test Runner: Vitest (jsdom for component tests)
- Setup: see vitest.config.ts (setupFiles include polyfills and Radix UI shims)

Sections and coverage

- Unit tests (src/lib/**, src/hooks/**)
  - Algorithmic/statistics functions (e.g., pearsonCorrelation, huberRegression)
  - Configuration schemas/validators (analytics.config)
  - Utilities (uuid, hash, cache keys)
  - Hooks (useAnalyticsWorker including worker fallback)
- Component tests (src/components/\*\*)
  - AnalyticsDashboard: loading state, worker invocation on mount
  - AnalyticsDashboard tabs: lazy mounting, URL param sync, accessibility (live region, skip link)
  - Environmental correlations: fallback-vs-worker parity sanity
  - InteractiveDataVisualization: charts container presence, counts; user interactions via userEvent
- Integration tests (tests/integration/\*\*)
  - Model training worker E2E (sensory) with tfjs CPU backend
  - Data leakage detection pipelines and schema evolution
- Performance tests (targeted)
  - See tests/unit/dataTransformations.performance.test.ts
- Visual snapshot-like tests (lightweight DOM structure checks)
  - See tests/unit/visualSnapshot.test.tsx

Running tests

- Full suite (recommended): npm test

- Run a single file: npx vitest run path/to/file.test.ts

- Filter by name pattern: npx vitest run --testNamePattern "tabs|dashboard"

- Performance tests (run only perf suite): npx vitest run
  tests/unit/dataTransformations.performance.test.ts

- Visual snapshot checks: npx vitest run tests/unit/visualSnapshot.test.tsx

- Show coverage (if enabled in project): npx vitest run --coverage

Conventions and best practices

- Prefer userEvent for interactions; await UI updates with findBy\*/waitFor.
- Avoid relying on animated/portal content; Radix Portal/Presence are shimmed in tests.
- Keep components vs. integration concerns separated:
  - src/components/AnalyticsDashboard.test.tsx: loading/analysis trigger
  - src/components/**tests**/AnalyticsDashboard.tabs.test.tsx: tab behavior, lazy mounting, URL
    sync, a11y

Maintaining test focus

- If adding dashboard tests for tab interactions or URL sync, place them in
  AnalyticsDashboard.tabs.test.tsx.
- If adding worker initiation/prop-driven tests, place them in AnalyticsDashboard.test.tsx.
- For heavy or flaky UI concerns (timing/animation), prefer adding stable selectors and avoid strict
  timing assumptions.

Handling React act(...) warnings

- Prefer userEvent over fireEvent for interactions and await the result:
  - await user.click(button); then await findBy... or use waitFor(() => ...)
- Avoid programmatic state updates in tests; if needed, wrap them in act(() => setState(...)).
- Prefer findBy\* queries (auto-wait) or wrap assertions that depend on async effects in waitFor.
- Timers: when mocking timers, ensure any code that schedules micro/macro-tasks is flushed (await
  Promise.resolve(); or vi.runAllTimers()). Restore real timers after.
- Animations/portals: we mock Radix Portal/Presence in tests to render inline and avoid
  mount/unmount animations.
- Transitions: the setup sets prefers-reduced-motion via matchMedia to reduce animation churn.
- Don’t assert immediately after opening modals/menus; wait for their role/name to appear (e.g.,
  await findByRole('dialog', { name: /.../i })).
- If a third-party component triggers background state changes, place assertions inside waitFor and
  avoid assuming immediate DOM updates.
