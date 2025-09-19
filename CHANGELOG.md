## 0.2.0 - 2025-08-14

### Changed

- Analytics refactor: centralized cache keys and worker task builder
  - Added buildInsightsCacheKey and buildInsightsTask in src/lib/insights/task.ts for deterministic
    keys, TTL resolution from runtime config, and typed worker envelopes with tags.
  - useAnalyticsWorker now integrates cache-key builder, watchdog timeout with fallback processing,
    partial/progress handling, and rate-limited logging.
  - analyticsManager reads cache TTL from analyticsConfig.cache.ttl and consistently returns minimal
    safe results on failures.
- UI toast de-duplication: enforce single concurrent toast via TOAST_LIMIT = 1 in
  src/hooks/use-toast.ts; recommend updating existing toasts instead of adding new ones for repeated
  classes of errors.

### Added

- Documentation: docs/analytics.md with analyticsManager API examples, guidance on using
  useAnalyticsWorker with buildInsightsTask, and error handling/toast deduping expectations.

### Deprecated

- Reading cache TTL from legacy locations (e.g., ANALYTICS_CONFIG.analytics.CACHE_TTL). Use
  analyticsConfig.cache.ttl instead.

### Breaking Changes

- If your code relied on legacy TTL keys or posted raw analytics worker messages without a cacheKey,
  you must migrate to the new analyticsConfig.cache.ttl and include cacheKey generated via
  buildInsightsCacheKey (or use buildInsightsTask).

## 0.1.1 - 2025-08-13

### Security

- **CRITICAL**: Resolved all 17 npm security vulnerabilities (13 high, 4 moderate)
- **Removed**: Unused `@tensorflow/tfjs-vis` package eliminating entire vega vulnerability chain
- **Added**: Security overrides for transitive dependencies:
  - `esbuild >= 0.24.3` (fixes development server vulnerability)
  - `d3-color >= 3.1.0` (fixes ReDoS vulnerability)
  - `node-fetch >= 2.6.7` (fixes security header forwarding)
- **Updated**: Core dependencies
  - `vite@7.1.2` (latest, includes security patches)
  - `@tensorflow/tfjs@4.22.0` (latest)

### Performance

- **Improved**: Bundle size reduction from removing unused visualization dependencies
- **Enhanced**: Build speed with updated esbuild

### Documentation

- **Added**: Comprehensive security remediation report (`artifacts/security-remediation.md`)
- **Added**: PreprocessingPipeline module with serialization and versioning for reproducible data
  transforms

## 0.1.0 - 2025-08-08

- Chart hover behavior hardened in `src/components/charts/EChartContainer.tsx` and
  `src/components/charts/ChartKit.ts`.
  - Disabled series dimming on hover (`emphasis.disabled`, `focus: 'none'`, opaque `blur` state).
  - Tooltip stability improvements (`appendToBody`, zero transition duration) and container overflow
    visibility.
  - Rationale: prevent perception that the chart "disappears" when hovering; keep all lines fully
    visible.

### Security

- **CRITICAL**: Resolved all 17 npm security vulnerabilities (13 high, 4 moderate)
- **Removed**: Unused `@tensorflow/tfjs-vis` package eliminating entire vega vulnerability chain
- **Added**: Security overrides for transitive dependencies:
  - `esbuild >= 0.24.3` (fixes development server vulnerability)
  - `d3-color >= 3.1.0` (fixes ReDoS vulnerability)
  - `node-fetch >= 2.6.7` (fixes security header forwarding)
- **Updated**: Core dependencies
  - `vite@7.1.2` (latest, includes security patches)
  - `@tensorflow/tfjs@4.22.0` (latest)

### Performance

- **Improved**: Bundle size reduction from removing unused visualization dependencies
- **Enhanced**: Build speed with updated esbuild

### Documentation

- **Added**: Comprehensive security remediation report (`artifacts/security-remediation.md`)
- **Added**: PreprocessingPipeline module with serialization and versioning for reproducible data
  transforms

## 0.1.0 - 2025-08-08

- Chart hover behavior hardened in `src/components/charts/EChartContainer.tsx` and
  `src/components/charts/ChartKit.ts`.
  - Disabled series dimming on hover (`emphasis.disabled`, `focus: 'none'`, opaque `blur` state).
  - Tooltip stability improvements (`appendToBody`, zero transition duration) and container overflow
    visibility.
  - Rationale: prevent perception that the chart "disappears" when hovering; keep all lines fully
    visible.
