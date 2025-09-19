# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Kreativium Beta v2 is a sensory tracking and analytics platform for special education professionals,
built with React, TypeScript, and Vite. The application features advanced AI integration for pattern
analysis and report generation.

## Key Commands

### Development

```bash
npm run dev                 # Start development server at 127.0.0.1:5173
npm run dev:poc             # Start in POC mode (lighter bundle, stubs heavy modules)
npm run build               # Production build
npm run build:dev          # Development build
npm run build:poc          # POC build with reduced features
npm run preview            # Preview production build at 127.0.0.1:4173
```

### Code Quality

```bash
npm run lint               # Run ESLint
npm run typecheck          # TypeScript type checking (no emit)
npm run precommit:lint     # Run lint-staged (for pre-commit)
```

### Testing

```bash
npm test                   # Run all Vitest tests
npm run test:config        # Test analytics config specifically
npm run test:performance   # Run performance tests
npm run test:bias          # Run bias testing suite
npm run e2e                # Run Playwright E2E tests (requires build)
npm run e2e:ui            # Run Playwright with UI mode
npm run e2e:debug         # Debug Playwright tests
npm run e2e:a11y          # Run accessibility smoke tests
```

### Internationalization

```bash
npm run i18n:scan          # Scan for untranslated strings
npm run i18n:check         # Check translation key differences
npm run lint:locales       # Validate locale files
```

### Utilities

```bash
npm run reset-storage      # Reset local storage
npm run analyze            # Build and analyze bundle size
npm run seed:demo          # Seed demo data
```

## Architecture

### Core Structure

- **src/pages/** - Route-level components (Dashboard, Profile, Analytics, DevTools, KreativiumAI)
- **src/components/** - Reusable UI components using shadcn/ui primitives
- **src/lib/** - Core business logic and utilities
- **src/hooks/** - Custom React hooks for state management and features
- **src/workers/** - Web Workers for heavy computations (analytics, ML training, reports)
- **src/locales/** - i18n translations (en, nb, nn, sv)

### Key Systems

#### AI Integration

- **src/lib/ai/** - OpenRouter client for LLM integration
- **src/lib/analysis/** - Heuristic and LLM analysis engines
- **src/lib/evidence/** - Evidence indexing and keyword extraction
- Environment-based feature flags control AI features

#### Analytics System

- **src/workers/analytics.worker.ts** - Main analytics processing
- **src/lib/analyticsManager.ts** - Analytics orchestration with AI support
- **src/hooks/useAnalyticsWorker.ts** - React hook for worker communication
- Web Workers handle heavy processing to keep UI responsive

#### State Management

- React Query for server state
- Local hooks for component state
- Context providers for global features (auth, theme)

### Environment Configuration

- Uses Vite's env system with .env files
- Runtime environment validation in src/lib/runtimeEnv.ts
- AI features controlled by VITE_ENABLE_AI_ANALYSIS flag

### Testing Strategy

- **Vitest** for unit/integration tests with jsdom environment
- **Playwright** for E2E testing (builds POC version by default)
- Test files colocated with source or in tests/ directory
- Setup files handle polyfills and DOM mocking

### Build Modes

- **production** - Full features, optimized bundle
- **development** - Development features, source maps
- **poc** - Proof of concept mode with stubs for heavy modules

### Path Aliases

- **@/** resolves to src/ directory
- Used consistently throughout the codebase

## Important Patterns

### Worker Communication

Workers use postMessage API with typed message handlers. Always check worker availability before
posting messages.

### Component Lazy Loading

Heavy components like AnalyticsDashboard use React.lazy with Suspense boundaries for code splitting.

### Error Boundaries

Critical UI sections wrapped in error boundaries to prevent full app crashes.

### Accessibility

Components follow WCAG guidelines using Radix UI primitives with proper ARIA attributes.
