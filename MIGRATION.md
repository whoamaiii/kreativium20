Migration Notes

This document summarizes breaking changes and new APIs introduced in the latest iteration of the
analytics/ML stack.

Removals

- Removed DataPreprocessor from mlModels.ts
  - The legacy DataPreprocessor has been fully replaced by standalone, pure helpers in
    src/lib/dataPreprocessing.ts:
    - toMLSessions(entries)
    - prepareEmotionDataset(sessions, sequenceLength?)
    - prepareSensoryDataset(sessions)
  - Motivation: prevent data leakage and allow per-fold fitting inside cross-validation; simplify
    testing and re-use.

New configuration keys and defaults

- featureEngineering.normalization
  - clampToUnit: boolean (default: true)
  - minVariance: number (default: 1e-6)
- featureEngineering.timeEncoding
  - variant: 'sixFeatureV1' | 'none' (default: 'sixFeatureV1')
- enhancedAnalysis
  - predictionConfidenceThreshold: number (default: 0.6)
  - trendThreshold: number (default: 0.05)
  - minSampleSize: number (default: 12)
  - anomalyThreshold: number (default: 2.0) // robust z-score threshold
  - anomalySeverityLevels: { medium: number; high: number } (default: { medium: 2.5, high: 3.0 })
  - correlationSignificance: { low: number; moderate: number; high: number } (default: { low: 0.2,
    moderate: 0.4, high: 0.6 })
  - huber: { delta: number; maxIter: number; tol: number } (defaults: { delta: 1.345, maxIter: 50,
    tol: 1e-6 })
- timeWindows
  - shortTermDays: number (default: 14)
  - recentDataDays: number (default: 7)
  - defaultAnalysisDays: number (default: 30)
- alertSensitivity
  - anomalyMultiplier: number (default: 1)

Notes

- All modules must read runtime config via analyticsConfig.getConfig(). Do not hardcode thresholds.
  Provide safe fallbacks if a key is missing.

ModelDiagnosticsPanel (development-only)

- A lightweight developer panel to inspect and log evaluation runs and try time-series CV fold
  generation.
- File: src/components/dev/ModelDiagnosticsPanel.tsx
- Usage (DEV only):
  1. Ensure you run the app in development mode (Vite) and the panel is rendered in your dev tools
     page or wherever you include it.
  2. The panel is null in production builds by design.
  3. You can record synthetic runs and clear history. Data is stored in-memory and optionally in
     IndexedDB ('model-eval').
  4. The TS CV form lets you try rolling/expanding folds without loading the heavy ML code until
     needed.

Cross-Validation and preprocessing guidance

- Perform any data-fitting steps (normalizers, scalers) inside the fold loop, based only on the
  training split. Apply the fitted transform to the validation split to avoid leakage.
- Always create a fresh, untrained model per fold.

Schema versioning

- dataPreprocessing exports PREPROCESSING_SCHEMA_VERSION to tag outputs. Persist this alongside
  model metadata where applicable.
