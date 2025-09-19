# Analytics: Future Enhancements (Non-Blocking)

This document outlines planned, non-breaking enhancements to the analytics/insights layer. These
items improve i18n, formatting consistency, and reduce duplicated config resolution in callers.

Scope: documentation only. No behavior change yet.

---

1. Transition InsightOutput to StructuredInsight[] integrated with i18n

Current state

- InsightOutput = string[] (see src/types/insights.ts).
- StructuredInsight type already exists but is not the primary output.

Goal

- Migrate InsightOutput => StructuredInsight[] and render insights using react-i18next with params
  for interpolation.

Proposed shape

- src/types/insights.ts already defines:
  - interface StructuredInsight { key: string; params?: Record<string, unknown>; severity?: 'info' |
    'success' | 'warning' | 'danger' }

i18n keys

- Namespace: analytics
- Keys: analytics.insight.\* (keep stable, composable names)
  - analytics.insight.patternDetected
  - analytics.insight.limitedData
  - analytics.insight.noTrackingData
  - analytics.insight.highCorrelation
  - analytics.insight.trendIncreasing
  - analytics.insight.trendDecreasing

Examples

- { key: 'analytics.insight.patternDetected', params: { pattern: 'morning-anxiety', confidence: 0.78
  }, severity: 'warning' }
- { key: 'analytics.insight.limitedData', params: { sessions: 3, min: 5 }, severity: 'info' }

UI integration

- Components resolve copy via tAnalytics(key, params) and style by severity.
- Severity mapping suggestion:
  - info => neutral/secondary emphasis
  - success => positive/green tokens (paired with icon per a11y rule)
  - warning => amber/orange emphasis
  - danger => destructive/red emphasis

Migration plan (incremental)

- Step A: Dual output behind a feature flag in generateInsights: build StructuredInsight[] in
  parallel with existing strings; keep strings as the returned type to avoid UI churn.
- Step B: Add render adapters in UI panels (EnhancedPersonalizedInsights, PatternsPanel) that accept
  either string[] or StructuredInsight[].
- Step C: Flip default to StructuredInsight[] and deprecate plain strings.

Acceptance criteria

- All user-facing copy comes from analytics namespace (see rule hbuFGtAy...).
- No hardcoded text in insights logic; only i18n keys + params.
- Tests cover key presence in both nb and en locales for new insight keys.

---

2. Centralize percent formatting and date utilities

Context

- We already provide locale-aware format helpers from the translation hook (useTranslation):
  formatDate, formatDateTime, formatNumber.

Plan

- Add a small formatting helper that wraps NumberFormat percent style consistently and re-export
  date helpers from the hook where needed. Do not introduce new global date utils; prefer existing
  helpers to honor active language (see rule E9BuTDKV...).

Suggested utility API (non-breaking proposal)

- src/lib/format.ts
  - export function formatPercent(value: number, digits: number = 0, localeFrom?: string): string
    - Uses Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits,
      maximumFractionDigits: digits })
  - Re-export or import useTranslation().formatDate / formatDateTime in components and worker
    adapters where needed.

Usage guidance

- In UI: call const { formatDate, formatDateTime } = useTranslation(); then use directly.
- In non-React modules (workers/logic): accept locale as a parameter or resolve via config -> pass
  to formatPercent.

Acceptance criteria

- No ad-hoc toFixed() percent formatting in analytics.
- Dates and percent representations are stable across UI and exports.

---

3. Single generateAnalyticsSummary wrapper to reduce duplicate config resolution

Problem

- Multiple callers independently invoke analyticsConfig.getConfig(), calculate metrics, and generate
  insights, increasing overhead and risk of drift.

Proposal

- Introduce a single façade function that: resolves config once, runs calculations, composes
  insights, and returns a compact, cache-friendly summary.

Proposed API (non-breaking)

- Location: src/lib/insights/unified.ts (or new src/lib/analyticsSummary.ts)
- export interface AnalyticsSummary { insights: StructuredInsight[] | string[]; // dual during
  migration confidence: number; hasMinimumData: boolean; tags?: string[]; // for cache invalidation
  computedAt: string; // ISO }
- export async function generateAnalyticsSummary(inputs: { entries: TrackingEntry[]; emotions:
  EmotionEntry[]; sensoryInputs: SensoryEntry[]; goals?: Goal[]; }, options?: {
  useStructuredInsights?: boolean; locale?: 'nb' | 'en'; cfg?: AnalyticsConfiguration }):
  Promise<AnalyticsSummary>

Implementation notes

- Internally, call computeInsights (src/lib/insights/unified.ts) which already centralizes config
  fallback; surface only the subset needed by UI.
- Respect rule j9uSCDpf...: never hardcode thresholds; always read via analyticsConfig.
- Keep payload small per bpP9eeEv...: send partial/progress/complete envelopes if this runs in a
  worker.

Acceptance criteria

- Call sites need only one import to get summary (optional migration).
- Verified no duplicate analyticsConfig.getConfig() calls in hot paths.

---

Open questions / decisions

- Should severity be strictly derived by rule confidence/thresholds or set by individual rules?
  Recommendation: derive via normalized score bands in config to keep consistent UI emphasis.
- Where to house formatting helpers used by workers (no React)? Recommendation: small pure helpers
  in src/lib/format.ts that accept a locale string, while UI continues to use useTranslation() for
  date/number.

Testing considerations

- Add unit tests that:
  - Assert structured insight keys exist in locales.
  - Verify severity mapping logic with boundary conditions.
  - Validate formatPercent against nb-NO and en-US.
  - Ensure generateAnalyticsSummary resolves config once per call (spy on
    analyticsConfig.getConfig()).

Non-goals (for now)

- Changing storage schemas or cache keys.
- Introducing new ML providers or model configs.

Rollout

- Behind a feature flag in config.features (e.g., enableStructuredInsights, enableSummaryFacade)
  defaulting to false.

References

- src/types/insights.ts: StructuredInsight, InsightOutput
- src/lib/insights.ts: calculateConfidence, generateInsights
- src/lib/insights/unified.ts: computeInsights façade
- i18n rules and helpers: src/hooks/useTranslation.ts, locales/nb/analytics.json,
  locales/en/analytics.json
