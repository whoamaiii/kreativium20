# PR Draft: feat: runtime-tunable analytics via analyticsConfig

- Base: kreatiiviumbeta2-branch
- Head: feat/worker-unified-insights-cachekey
- Status: BLOCKED
- Blocked by:
  - Task 2: Fix Mock Data Generator
    - Implement scenario filtering logic
    - Replace Date.now() with UUID library for ID generation
    - Remove or implement the unused generateTrendValue function
    - Add data validation before storage
    - Implement progressive data generation for better performance
  - Task 5: Performance Optimizations
    - Selective React.memo/useMemo/useCallback
    - Virtual scrolling for large lists
    - Lazy loading for routes/components
    - Code splitting and bundle optimizations (respecting manualChunks)

## Description

Enables analytics behavior to be tuned at runtime via analyticsConfig with safe fallbacks when
configuration is absent.

- Reads thresholds and insights logic exclusively from analyticsConfig per rule
  j9uSCDpfelMppSyEbbTVzl.
- Uses central logger (no console.\* in shipped code) per rule PL50ymsKrLCbMBvU0HF3gx.
- User-facing text aligned with react-i18next namespaces per rule hbuFGtAyhjHx7xEyG8mZ9Y.
- Performance: respects reduced motion, virtualization, and code-splitting rules.
- Analytics failure returns minimal safe results and notifies once per rule CSKuRS54IMUwXlLCRqunSl.

## Release notes (to include on merge)

- Behavior is now tunable at runtime via analyticsConfig settings.
- All thresholds and insights read from analyticsConfig with safe fallbacks when config is absent.
- No hardcoded thresholds; behavior changes can be applied without redeploying.
- On analytics failure, minimal safe results are returned and a single toast notification is shown.

## Open items (blockers)

- Task 2 completion confirmation
- Task 5 completion confirmation

## How to open a PR later (optional)

Once ready to publish remotely, run:

- gh pr create --title "feat: runtime-tunable analytics via analyticsConfig" \
  --body-file .github/drafts/feat-runtime-analytics.md \
  --base kreatiiviumbeta2-branch --head feat/worker-unified-insights-cachekey --draft

After opening the PR, add a blocking label and comment:

- gh pr edit --add-label blocked
- gh pr comment --body "Blocked pending completion confirmation of Task 2 and Task 5."
