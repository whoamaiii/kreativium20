# Pre-PR Checklist (Local)

Use this checklist before opening or merging the PR for "feat: runtime-tunable analytics via
analyticsConfig".

Blocking tasks

- [ ] Task 2: Fix Mock Data Generator is complete
  - [ ] Scenario filtering logic implemented
  - [ ] Date.now() replaced with UUID for ID generation
  - [ ] Unused generateTrendValue function removed or implemented
  - [ ] Data validation before storage added
  - [ ] Progressive data generation implemented (performance)
- [ ] Task 5: Performance Optimizations are complete
  - [ ] Selective React.memo/useMemo/useCallback applied
  - [ ] Virtual scrolling for large lists in place as needed
  - [ ] Lazy loading for routes/components
  - [ ] Code splitting and bundle optimizations (respecting manualChunks)

Artifacts

- [ ] Draft PR body exists at .github/drafts/feat-runtime-analytics.md
- [ ] Local blockers ledger exists at docs/PR_BLOCKERS.md
- [ ] Unreleased changelog entry exists at CHANGELOG_UNRELEASED.md

Quality gates

- [ ] Lint passes (npm run lint)
- [ ] Type-check passes (npm run typecheck)
- [ ] Docs lint passes (npm run docs:lint)
- [ ] Unit tests relevant to analytics pass (npm run test or targeted run)

Optional (when ready to open PR remotely)

- [ ] Use the prepared draft body from .github/drafts/feat-runtime-analytics.md
- [ ] Add blocked label and a comment referencing Task 2 and Task 5
