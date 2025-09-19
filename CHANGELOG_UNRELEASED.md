# Unreleased

## feat: Comprehensive Infrastructure Improvements

### Centralized Logging System

- Implemented centralized `Logger` service to replace direct `console.*` usage
- Added environment-based log levels via `VITE_LOG_LEVEL` and `VITE_DEBUG`
- Removed console logs from production builds while maintaining debug capabilities
- Updated all modules to use structured logging with appropriate log levels

### Enhanced Mock Data Generation

- Fixed mock data generator to use proper UUID-based IDs
- Added scenario-based filtering for realistic data patterns
- Integrated data validation to ensure all generated entries are valid
- Improved social interaction and environmental data generation

### Standardized Async State Management

- Created `useAsyncState` hook for consistent loading/error/success states
- Integrated with global error handler for unified error reporting
- Applied to export operations and other async UI flows
- Reduced boilerplate across components

### Robust Error Handling Framework

- Enhanced `SensoryCompassError` with user-friendly messages and recoverability flags
- Implemented global `ErrorHandler` with toast notifications and retry capabilities
- Added factory functions for common error scenarios
- Integrated React Error Boundary support

### Evidence-Grounded AI Explanations

- Implemented sanitization of AI responses based on allowed contexts
- Added centralized JSON validation for AI responses
- Enhanced explanation chat with proper context filtering
- Added unit tests for sanitization and integration tests for consistency

### Advanced PDF Export System

- Created flexible template system (summary/detailed/presentation)
- Added configurable chart quality (standard/high/print)
- Implemented accessible color schemes (default/high-contrast/colorblind-friendly)
- Added layout configuration with proper margins and pagination
- Integrated ECharts native export for high-quality vector graphics

### Accessibility and Internationalization

- Enhanced export dialog with proper ARIA attributes and keyboard navigation
- Added comprehensive i18n support for all new UI elements
- Implemented screen reader-friendly descriptions for charts
- Added focus management and semantic HTML structure

### Performance Optimizations

- Implemented lazy loading for PDF export libraries (jsPDF, html2canvas)
- Added memoization for expensive computations
- Optimized bundle size through dynamic imports
- Reduced initial load time for analytics features

## feat: Explanation Dock + Chat + Data Readiness + Full-history retrieval

- Replaced hover popup with a persistent dock (desktop) and sheet (mobile).
- Added grounded AI chat with strict rules, markdown sanitization, copy per message, and per-pattern
  threads.
- Introduced data readiness indicator for social-trigger questions and dev seeder for demo data.
- Chat context now scans the full student history (not just recent), aggregates top
  places/activities/triggers, and includes social examples from both evidence and structured
  tracking fields.
- Documented behavior and thresholds in `docs/ANALYTICS_PATTERN_EXPLANATIONS.md`.

## fix: prevent Patterns explanation popup from clipping under tabs

- Introduced overlay z-index utility tokens in `src/index.css` (`.z-overlay`,
  `.z-overlay-elevated`).
- Updated `PatternsPanel` explanation `HoverCardContent` to use `.z-overlay-elevated`.
- Documented the overlay layering policy in `docs/ACCESSIBILITY.md` to avoid future magic z-index
  values.

## feat: runtime-tunable analytics via analyticsConfig

- Behavior is now tunable at runtime via analyticsConfig settings.
- All thresholds and insights logic read from analyticsConfig with safe fallbacks when configuration
  is absent.
- No hardcoded thresholds; behavior can be changed without redeploying.
- On analytics failure, minimal safe results are returned and a single toast notification is shown.

Note: This entry will be moved to CHANGELOG.md upon merge when Task 2 and Task 5 are confirmed
complete.
