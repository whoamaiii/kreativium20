# Analytics Guide

This document explains how to work with the analytics system after the refactor. It covers the
analyticsManager service API, how to use the useAnalyticsWorker hook together with
buildInsightsTask/buildInsightsCacheKey, and the expected error handling and UI toast de-duplication
behavior.

- Audience: application developers integrating analytics into components and services
- Related rules: useAnalyticsWorker with cache keys and TTL; reuse results instead of re-computing.
  When analytics fails, return minimal safe results to prevent UI crashes; notify via toast once,
  not repeatedly.

## Contents

- analyticsManager API overview with examples
- Using useAnalyticsWorker with buildInsightsTask and buildInsightsCacheKey
- Error handling and toast de-duplication expectations
- Migration notes and breaking changes

---

## Orchestrator utilities

New orchestrator-style named exports are available from `src/lib/analyticsManager` and should be
preferred over the old singleton for new code.

- buildInsightsCacheKey(inputs, options): string
  - Deterministic keys driven by counts and timestamps; order-insensitive.
- buildInsightsTask(inputs, options): Insights/Compute task envelope
  - Includes cacheKey, ttlSeconds (resolved from runtime config), and tags.
- getInsights(inputs, options): Promise<AnalyticsResult>
  - Returns a minimal, stable summary shape (counts + diagnostics) for UI and caching layers.

Example

```
import { buildInsightsCacheKey, buildInsightsTask, getInsights } from '@/lib/analyticsManager';

const inputs = { entries, emotions, sensoryInputs, goals };
const cacheKey = buildInsightsCacheKey(inputs, { tags: ['student-123'] });
const task = buildInsightsTask(inputs, { tags: ['student-123'] });
const summary = await getInsights(inputs, { ttlSeconds: 600, tags: ['student-123'] });
```

### Profiles

Profiles are now managed by `src/lib/analyticsProfiles.ts`:

- `initializeStudentProfile(studentId)`
- `getProfileMap()` returns a Map of profiles
- `saveProfiles()` persists the map back to storage

The legacy singleton still exposes `initializeStudentAnalytics` and keeps the existing status API
for backward compatibility, but profile persistence is delegated to the profiles module internally.

### Mock data seeding

Mock/demo seeding is not performed by the analytics manager anymore. Use
`src/lib/mock/mockSeeders.ts` instead and call it explicitly from dev tools or tests.

```
import { seedDemoData } from '@/lib/mock/mockSeeders';
await seedDemoData({ forExistingStudents: true, createNewStudents: 1, batchesPerStudent: 2 });
```

---

## analyticsManager API

The analyticsManager is a singleton service that orchestrates analytics for students. It manages
profiles, caching with TTL, and delegates computation to the unified insights module.

Import:

- import { analyticsManager, ensureUniversalAnalyticsInitialization } from '@/lib/analyticsManager'

Key methods and examples:

1. ensureUniversalAnalyticsInitialization()

- Ensures profiles exist for all students and reads minimum data thresholds. Does not seed mock data
  or warm caches automatically.

Example:

- await ensureUniversalAnalyticsInitialization()

2. initializeStudentAnalytics(studentId: string)

- Idempotently creates an analytics profile for a student. Safe to call multiple times.

Example:

- analyticsManager.initializeStudentAnalytics(student.id)

3. getStudentAnalytics(student)

- Returns fresh AnalyticsResults (internal TTL caching removed). Updates profile health metrics.
  Callers should cache using cache keys + their own cache layer.

Example:

- const results = await analyticsManager.getStudentAnalytics(student)
- console.log(results.patterns.length, results.insights.length)

4. triggerAnalyticsForStudent(student)

- Clears cache for the student and recomputes analytics.

Example:

- await analyticsManager.triggerAnalyticsForStudent(student)

5. triggerAnalyticsForAllStudents()

- Recomputes analytics for all students. Uses Promise.allSettled to avoid cascading failures.

Example:

- await analyticsManager.triggerAnalyticsForAllStudents()

6. getAnalyticsStatus()

- Returns an array with per-student status: isInitialized, lastAnalyzed, healthScore, etc.

Example:

- const status = analyticsManager.getAnalyticsStatus()
- status.forEach(s => console.log(s.studentId, s.healthScore))

7. clearCache(studentId?)

- Clears analytics cache globally or for a single student.

Example:

- analyticsManager.clearCache() // all
- analyticsManager.clearCache(student.id) // just one student

Notes:

- Profiles are persisted in localStorage using STORAGE_KEYS.analyticsProfiles.
- TTL and cache size are read from runtime analyticsConfig with safe fallbacks.

---

## Using useAnalyticsWorker with buildInsightsTask/buildInsightsCacheKey

Heavy analytics computations run in a Web Worker when available. The useAnalyticsWorker hook
encapsulates worker lifecycle, caching and fallbacks. Cache keys should be built deterministically
using the shared helpers.

Core pieces:

- useAnalyticsWorker from 'src/hooks/useAnalyticsWorker'
- buildInsightsTask and buildInsightsCacheKey from 'src/lib/analyticsManager'

When to use which:

- Components: Prefer useAnalyticsWorker; it already integrates cache, TTL, fallback, watchdog, and
  message handling (progress/partial/complete/error).
- Services or manual worker usage: Use buildInsightsTask to construct a typed task envelope to post
  to the worker (or to a fallback queue).

A) Component example using useAnalyticsWorker

- import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker'

Example:

- const { results, isAnalyzing, error, runAnalysis, invalidateCacheForStudent } =
  useAnalyticsWorker({ enableCacheStats: true })
- useEffect(() => { if (entries.length) { runAnalysis({ entries, emotions, sensoryInputs }) } },
  [entries, emotions, sensoryInputs, runAnalysis])
- if (error) return <ErrorWrapper message={t('analytics:error_generic')} />
- return <Charts data={results} />

Notes:

- The hook internally builds cache keys via buildInsightsCacheKey to ensure consistent
  deduplication.
- The hook rate-limits logs and enforces a single progress watchdog to avoid indefinite spinners.

B) Manual worker usage with buildInsightsTask

- import { buildInsightsTask } from '@/lib/insights/task'

Example:

- const inputs = { entries, emotions, sensoryInputs, goals }
- const task = buildInsightsTask(inputs, { config, tags: ['student-' + studentId], ttlSeconds: 300
  })
- worker.postMessage({ ...task.payload, cacheKey: task.cacheKey })

Notes:

- The hook supports precomputeCommonAnalytics for idle-time priming of common queries. If you
  schedule your own tasks, reuse buildInsightsCacheKey to avoid cache fragmentation.

---

## Error handling expectations and toast de-duplication

Error handling principles:

- Fail-soft: if analytics generation fails, always return a minimal, safe AnalyticsResults structure
  to prevent UI crashes. analyticsManager.generateAnalytics does this by returning arrays and a
  typed error code.
- Keep user-facing errors concise, localized (react-i18next), and deduplicate notifications.
- Log rich diagnostics via the central logger with normalized error objects.

Where these are implemented:

- analyticsManager: try/catch around generation; logs error and returns safe empty structure with
  error code (e.g., 'ANALYTICS_GENERATION_FAILED').
- useAnalyticsWorker: watchdog with fallback to synchronous processing, partial updates support, and
  consistent error paths. When fallback is used, results are still provided and a single error
  message is set in state.

UI toast de-duplication strategy:

- Central toast utility (src/hooks/use-toast.ts) enforces a global TOAST_LIMIT = 1. This prevents
  toast spam by limiting concurrent toasts.
- Rate-limit logging and messages: the hook stores ephemeral keys (e.g., _logged_\* items) in the
  cache to log or notify at most once per time window.
- Recommended: when showing analytics-related toasts, reuse a stable toast ID per event class and
  update existing toasts rather than enqueueing new ones. Example pattern:
  - const { toast, dismiss } = useToast()
  - const id = 'analytics-error'
  - toast({ id, title: t('analytics:error_title'), description: t('analytics:error_body') })
  - Later, dispatch an UPDATE_TOAST action to modify the same toast instead of creating another.

Developer guidance:

- Never loop or rethrow in a way that causes repeated toasts; throttle retry prompts and use the
  single-toast limit.
- Announce one toast for a given analytics failure class per session unless the user takes a new
  action.
- Keep payloads small when posting to workers; use the typed envelopes and minimal config subset.

---

## Migration notes and breaking changes

Summary of changes in this refactor:

- Centralized cache key helpers for insights in src/lib/insights/task.ts:
  - buildInsightsCacheKey: deterministic keys based on counts, timestamps, and a minimal config
    subset.
  - buildInsightsTask: constructs a typed worker task with tags and ttlSeconds derived from runtime
    config.
- useAnalyticsWorker now uses shared cache keys and adds watchdog fallback, partial updates, and
  rate-limited logging.
- analyticsManager reads TTL from analyticsConfig.cache.ttl (previous ad-hoc locations deprecated)
  and returns safe results on failures.
- Toast system enforces TOAST_LIMIT = 1 to dedupe UI notifications.

Potential breaking changes:

- Config change: cache TTL is now read from analyticsConfig.cache.ttl. If you previously relied on
  ANALYTICS_CONFIG.analytics.CACHE_TTL (or other legacy keys), update your config to the new key.
  DEFAULT_ANALYTICS_CONFIG already exposes cache.ttl.
- Worker message shape: when using manual workers, prefer posting typed tasks created by
  buildInsightsTask or, at minimum, include cacheKey built via buildInsightsCacheKey. Direct posting
  of raw data without a cacheKey may bypass caching and deduplication.

Recommended updates for consumers:

- Prefer the useAnalyticsWorker hook in UI components. For non-React or service contexts, use
  buildInsightsTask to communicate with workers.
- On error paths, render minimal states and show a single toast message per action. Use i18n keys in
  the analytics namespace.
- Use analyticsManager.initializeStudentAnalytics when accessing or creating profiles to ensure
  idempotent setup.

Questions or follow-ups:

- If additional API examples are needed (e.g., precomputeCommonAnalytics usage or custom cache tag
  strategies), add them to this document in a new section.
