# SensoryTracker Onboarding Guide

## Executive Summary

SensoryTracker is a FERPA-compliant React-based web application designed for special education
teachers to track and analyze student sensory processing patterns and emotional responses. Built
with TypeScript, React 18, and Vite, the application features advanced data visualization, real-time
analytics, and machine learning capabilities, all while maintaining strict privacy standards and
offline-first functionality.

---

## What the Project Does

SensoryTracker enables special education teachers to:

- **Track Student Behaviors**: Record real-time observations of emotions (happy, anxious,
  frustrated) and sensory inputs (visual, auditory, tactile, proprioceptive, vestibular) with
  intensity scales
- **Analyze Patterns**: Identify correlations between sensory inputs and emotional states through
  advanced analytics and ML-powered insights
- **Generate Reports**: Create comprehensive PDF, CSV, and JSON reports for IEP meetings and parent
  conferences
- **Support Evidence-Based Decisions**: Use predictive insights and confidence metrics to inform
  educational strategies
- **Work Offline**: All data stored locally in browser storage (LocalStorage/IndexedDB) ensuring
  FERPA compliance and privacy

The application is organized into six main functional areas:

- Dashboard: Overview of tracked students, daily statistics, quick access to tracking
- Student Management: Student profiles, grade information, progress monitoring
- Tracking: Real-time session recording for emotions, sensory inputs, environmental factors
- Analytics: Data visualization, pattern analysis, confidence metrics, trend identification
- Settings: Language preferences (Norwegian/English), data management, privacy controls
- Common: Shared interface elements, navigation, system-wide utilities

## Technology Stack

### Core Runtime and Build

- **Node.js**: JavaScript runtime (v18+ required, ES2020 target)
- **Vite 5.4.1**: Build tool with React SWC plugin for fast HMR, optimized chunking
- **TypeScript 5.5.3**: Primary language with strict mode enabled
- **React 18.3.1**: UI framework with functional components and hooks

### Styling and UI Components

- **Tailwind CSS 3.4.11**: Utility-first CSS framework with tailwindcss-animate
- **Radix UI**: Comprehensive primitive components with built-in accessibility
- **class-variance-authority (cva)**: Component variant management
- **clsx & tailwind-merge**: Conditional class construction without conflicts

### Data Visualization

- **ECharts 5.6.0**: Primary charting with echarts-for-react wrapper
- **Recharts 3.1.1**: Secondary charts for simpler visualizations
- **Three.js**: 3D graphics with React Three Fiber and Drei
- **Nivo Heatmap**: Specialized heatmap visualizations

### State Management and Data

- **TanStack Query 5.56.2**: Server state management and caching
- **React Context API**: Cross-component state sharing
- **React Hook Form 7.53.0**: Form state management with Zod validation

### Advanced Features

- **TensorFlow.js 4.22.0**: Machine learning analytics
- **Web Workers**: Background processing for analytics and ML
- **i18next**: Internationalization (Norwegian/English)
- **jsPDF & html2canvas**: PDF generation and screenshots

### Testing Infrastructure

- **Vitest 3.2.4**: Unit and integration testing with React Testing Library
- **Playwright 1.54.2**: E2E testing with accessibility checks (axe-core)
- **Lighthouse CI**: Performance auditing
- **Custom bias testing**: Analytics fairness validation

## Scripts and How to Use Them

### Development Scripts

```bash
npm run dev              # Start dev server (http://127.0.0.1:5173)
npm run build            # Build for production
npm run build:dev        # Build for development
npm run build:analyze    # Build and analyze bundle size
npm run preview          # Preview production build (http://127.0.0.1:4173)
```

### Testing Scripts

```bash
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run with coverage report
npm run test:ui          # Open Vitest UI
npm run test:performance # Run performance test suite
npm run test:bias        # Run bias detection tests
npm run test:all         # Run all tests with gates
npm run test:ci          # CI test suite (includes E2E)
```

### Code Quality Scripts

```bash
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
```

### E2E Testing Scripts

```bash
npm run e2e:install      # Install Playwright browsers (run once)
npm run e2e              # Run E2E tests
npm run e2e:ui           # Open Playwright UI
npm run e2e:debug        # Debug E2E tests
npm run e2e:headless     # Run E2E headless (CI mode)
```

### Performance Scripts

```bash
npm run lighthouse       # Run Lighthouse audit
npm run lighthouse:view  # View Lighthouse results
```

## Project Structure and Key Modules

### Analytics overview

- Use orchestrator named exports from `src/lib/analyticsManager` for cache keys and summaries:
  - `buildInsightsCacheKey`, `buildInsightsTask`, `getInsights`
- Profiles are managed by `src/lib/analyticsProfiles.ts` (no direct localStorage access in feature
  code).
- Mock/demo data seeding is opt-in via `src/lib/mock/mockSeeders.ts` and never automatic.

```
src/
├── components/           # All React components
│   ├── ui/              # Reusable UI primitives (Radix + Tailwind)
│   ├── optimized/       # Performance-critical components
│   ├── lazy/            # Lazy-loaded components
│   ├── charts/          # Chart components and utilities
│   ├── analysis/        # Analytics components
│   └── layouts/         # Layout components
├── hooks/               # Custom React hooks
│   ├── useAnalyticsWorker.ts    # Analytics processing
│   ├── useMLTrainingWorker.ts   # ML operations
│   ├── useAsyncHandler.ts       # Async state management
│   └── useOptimizedMemo.ts      # Performance optimization
├── lib/                 # Utilities and business logic
│   ├── analyticsConfig.ts       # Runtime configuration
│   ├── logger.ts                # Central logging utility
│   ├── dataStorage.ts           # LocalStorage abstraction
│   ├── dataValidation.ts        # Data validation utilities
│   └── echartsCore.ts           # Optimized ECharts imports
├── pages/               # Route components
│   ├── Dashboard.tsx            # Main dashboard
│   ├── StudentProfile.tsx      # Student details
│   ├── TrackStudent.tsx         # Tracking interface
│   └── AddStudent.tsx           # Student management
├── types/               # TypeScript type definitions
│   ├── student.ts               # Student data types
│   ├── analytics.ts             # Analytics types
│   └── charts.ts                # Chart configuration types
├── workers/             # Web Workers
│   ├── analytics.worker.ts      # Analytics processing
│   └── mlTraining.worker.ts     # ML model training
├── i18n/                # Internationalization
│   └── index.ts                 # i18n configuration
└── utils/               # Utility functions
    └── accessibility.ts         # A11y helpers
```

### Key Modules

- **Analytics System**: analyticsConfig.ts, useAnalyticsWorker.ts, analyticsManager.ts
- **Data Management**: dataStorage.ts, dataValidation.ts, mockDataGenerator.ts
- **Visualization**: ChartKit.ts, EChartContainer.tsx, InteractiveDataVisualization.tsx
- **Performance**: VirtualScrollArea.tsx, useOptimizedMemo.ts, analyticsWorkerFallback.ts

## Performance and Accessibility Considerations

### Performance Optimizations

**Code Splitting Strategy**

- Manual chunks for optimal bundle sizes
- Lazy loading for heavy components (3D, charts)
- Dynamic imports for infrequently visited routes

**React Optimizations**

- React.memo for pure components rendering frequently
- useMemo for expensive calculations
- useCallback for stable function references
- Virtual scrolling for long lists (VirtualScrollArea)

**Worker-Based Processing**

- Analytics computations in web workers
- ML training in background threads
- Progress reporting with small payload envelopes
- Cache management with TTL and LRU eviction

**Chart Performance**

- ECharts core imports only (reduced bundle)
- Tooltip rendering to body (appendToBody=true)
- Disabled transition animations (transitionDuration=0)
- Stable component keys to prevent remounts

### Accessibility (WCAG 2.1 AA Compliance)

**Core Requirements**

- Skip links and live regions
- Proper heading hierarchy (h1 → h6)
- Landmark roles (main, nav, aside)
- Focus management and trapping in modals
- Keyboard navigation support

**Form Accessibility**

- Labels for all inputs
- Descriptions via aria-describedby
- aria-invalid on errors
- Error announcements to screen readers

**Visual Accessibility**

- Color contrast meeting AA standards (4.5:1 normal, 3:1 large text)
- Color paired with text/icons for status
- Dyslexia-friendly fonts
- Respect reduced motion preferences

## Internationalization and Localization

### Configuration

- **Library**: react-i18next
- **Default Language**: Norwegian (nb)
- **Fallback Language**: English (en)
- **Namespaces**: common, dashboard, student, tracking, analytics, settings

### Implementation

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('dashboard');
  return <h1>{t('title')}</h1>;
};
```

### Language Management

- Persisted to sensoryTracker_language in localStorage
- Date/time formatting aligned to selected language
- Number formatting follows locale conventions
- Switch with changeLanguage('nb'|'en')

## Data Privacy and Storage

### Privacy First Design

- **No Cloud Storage**: All data stored locally in browser
- **FERPA Compliant**: Meets educational privacy requirements
- **Offline First**: Full functionality without internet
- **User Control**: Complete data export/import/deletion

### Storage Architecture

- **LocalStorage**: User preferences, settings, language selection
- **IndexedDB**: Student profiles, session data, analytics results
- **Session Storage**: Temporary form data, navigation state

### Data Management

- **Export Formats**: PDF (reports), CSV (spreadsheets), JSON (backup)
- **Import/Export**: Complete data backup and restore functionality
- **Data Retention**: No automatic deletion, manual cleanup tools provided

## Build Configuration and Bundling

### Vite Configuration

**Path Aliases**

```typescript
// @ alias maps to src/
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
```

**Manual Chunks Strategy**

```javascript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  'vendor-charts': ['echarts-for-react'],
  'vendor-echarts-core': ['./src/lib/echartsCore.ts'],
  'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
  'interactive-viz': ['./src/components/InteractiveDataVisualization.tsx'],
  'viz-3d': ['./src/components/Visualization3D.tsx'],
  'timeline-viz': ['./src/components/TimelineVisualization.tsx']
}
```

### TypeScript Configuration

- Strict mode with all strict flags enabled
- noImplicitAny, noUnusedParameters, noUnusedLocals
- strictNullChecks, noImplicitReturns
- Project references for app, node, and scripts

## Testing Setup

### Unit and Integration Testing (Vitest)

- Environment: jsdom
- Coverage provider: v8
- Coverage thresholds: 80% lines, 80% functions, 75% branches
- React Testing Library for component testing

### E2E Testing (Playwright)

- Browsers: Chrome, Firefox, Safari, Mobile Chrome
- Base URL: http://127.0.0.1:4173
- Trace on retry, video on failure
- Accessibility testing with axe-core

### Performance Gates

- Lighthouse Performance score: 90+
- Lighthouse Accessibility score: 95+
- First Contentful Paint: <1500ms
- Largest Contentful Paint: <2500ms
- Cumulative Layout Shift: <0.1
- Total Blocking Time: <300ms
- Bundle size: <500KB for initial route

### Bias Gates

- Demographic parity within threshold
- Equal opportunity across attributes
- No hardcoded thresholds (use config)
- Synthetic data testing for fairness

## Environment and Runtime Nuances

### Required Environment

- Node.js: v18.0.0+ (v20.x recommended)
- npm: v9.0.0+
- Modern browsers with ES2020 support

### Environment Variables

```bash
# Core configuration
VITE_USE_MOCK=false              # Enable mock data mode
VITE_API_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000

# Feature flags
VITE_FEATURE_3D_VIZ=true
VITE_FEATURE_ML_ANALYTICS=true
VITE_FEATURE_EXPORT=true

# Performance tuning
VITE_WORKER_POOL_SIZE=4
VITE_ANALYTICS_CACHE_TTL=3600
```

### Runtime Configuration

- Never hardcode thresholds
- Load from analyticsConfig
- Provide safe fallbacks
- Handle missing config gracefully

### Worker Management

- Always use provided hooks (useAnalyticsWorker, useMLTrainingWorker)
- Never create raw workers without cleanup
- Clean up intervals, timeouts, and listeners in useEffect
- Monitor for memory leaks

### Key Generation

```typescript
// Never use array indices as keys
items.map((item) => (
  <ItemComponent key={item.id} {...item} />
));
```

## Quickstart Terminal Steps

### Initial Setup (5 minutes)

```bash
# 1. Clone the repository
git clone [repository-url]
cd sensory-tracker

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Start development server
npm run dev

# 5. Open browser to http://127.0.0.1:5173
```

### Development Workflow

```bash
# Start with mock data
echo "VITE_USE_MOCK=true" >> .env
npm run dev

# Run tests during development
npm run test          # Watch mode
npm run test:coverage # Coverage report

# Type check your changes
npm run typecheck

# Lint your code
npm run lint
```

### Testing Workflow

```bash
# Install E2E browsers (one time)
npm run e2e:install

# Run full test suite
npm run test:all

# Run specific test types
npm run test:performance
npm run test:bias
npm run e2e:ui
```

### Production Build

```bash
# Build for production
npm run build

# Analyze bundle size
npm run build:analyze

# Preview production build
npm run preview

# Run Lighthouse audit
npm run lighthouse
```

## Appendix: Code Conventions and Rules

### TypeScript Rules

- **Explicit Typing**: All function parameters and return values typed
- **No any types**: Use unknown if needed
- **Props interfaces**: Define for all components
- **Named exports only**: Exception for pages
- **Strict Compiler Settings**: Never weaken tsconfig flags (strict, noImplicitAny,
  noUnusedLocals/Parameters, noImplicitReturns, strictNullChecks)

### Component Rules

- **Functional Components Only**: Use hooks, no class components
- **Props Management**: Define narrow props with clear responsibilities
- **Keep functions pure**: Avoid mutations when possible - copy first
- **Single Responsibility**: Every component should have one reason to change

### Styling Rules (Tailwind Only)

- **No Inline Styles**: Use Tailwind classes only
- **Component Variants**: Use CVA for variant management
- **Theme Variables**: Use CSS variables from src/index.css (HSL)
- **Reuse UI Primitives**: Use components from src/components/ui
- **Glass Effects**: Use .glass-card, .shadow-\*, gradient utilities where designed

### Hook Rules

- **Never Call Conditionally**: Always call at top level
- **Include Dependencies**: Satisfy react-hooks/exhaustive-deps
- **Cleanup Effects**: Always return cleanup functions
- **No async in render**: No async, subscriptions, or DOM mutations inside render

### i18n Requirements

- **All User Text**: Must use react-i18next namespaces (common, dashboard, student, tracking,
  analytics, settings)
- **Use useTranslation()**: Add missing keys to both nb and en
- **Date/Time Formatting**: Use formatDate/formatDateTime helpers aligned to current language
- **Language Persistence**: Store in sensoryTracker_language localStorage key

### Error Handling

- **Use ErrorBoundary**: Wrap features with error boundaries
- **Handle Async Errors**: Try/catch with user-friendly messages
- **Central Logger**: Never use console.log/warn/error directly - use logger utility
- **Show concise user errors**: Log normalized, rich diagnostics for developers
- **Analytics failures**: Return minimal safe results to prevent UI crashes

### Worker Rules

- **Use Provided Hooks**: useAnalyticsWorker, useMLTrainingWorker - never create raw workers
- **Clean Up Resources**: Always terminate workers in cleanup
- **Small Payloads**: Send typed messages with partial/progress/complete/error envelopes
- **Cache Management**: Include counts and input hashes in cache keys; purge by TTL and LRU

### Accessibility Checklist

- **Skip Links**: Include skip link to main content with focus management
- **Live Regions**: Use aria-live for dynamic content updates
- **Heading Hierarchy**: Maintain proper h1→h6 structure
- **Landmarks**: Use proper roles (main, nav, aside)
- **Input Labels**: All inputs need labels, aria-describedby, and aria-invalid on error
- **Color Pairing**: Always pair color with text or icons for status
- **Contrast**: Ensure AA standards (4.5:1 normal, 3:1 large text)
- **Focus Trapping**: Use Radix primitives with proper aria labels

### Chart Configuration (ECharts)

- **Container Settings**: appendToBody=true, transitionDuration=0, confine=true
- **Emphasis**: Disable emphasis dimming; keep series fully visible
- **Stable Keys**: Use stable component keys to avoid remount on hover
- **Container Overflow**: Set to visible to prevent hover issues
- **Use ChartKit**: For consistent defaults and hover behavior

### Performance Rules

- **Memoization Strategy**: React.memo, useMemo, useCallback only for proven hot paths
- **Virtual Scrolling**: Use VirtualScrollArea for lists > 100 items with fixed heights
- **Dynamic Imports**: Lazy load heavy components and infrequently visited routes
- **Manual Chunking**: Respect Vite strategy (charting, 3D, large visualization modules)
- **Reduced Motion**: Never override [data-reduce-motion=true] behavior
- **ECharts Config**: Use minimal core imports, disable heavy filters in tooltips

### Data Source and Mock Management

- **Mock Data Control**: Use VITE_USE_MOCK environment variable ("1", "true", "yes")
- **No Hardcoded Paths**: Route through data source abstraction
- **MockDataLoader**: Use documented scenario loaders to seed data
- **Clear Mock Keys**: Only clear project mock keys, not arbitrary localStorage

### Analytics Configuration

- **Runtime Config**: Read via analyticsConfig; never hardcode thresholds or insights logic
- **Safe Fallbacks**: Provide defaults when config absent
- **Testing Gates**: Source thresholds from analyticsConfig
- **When analytics fails**: Return minimal safe results and notify via toast once

### Data Privacy Rules

- **No Cloud Storage**: All data stays in browser storage
- **No External APIs**: For student data
- **Mock Data**: Use VITE_USE_MOCK for development
- **FERPA Compliant**: Meets educational privacy requirements

### Path Aliases and Imports

- **Use @ Alias**: For internal modules per Vite/TypeScript config
- **Avoid Deep Paths**: No deep relative paths like ../../../
- **Proper Structure**: Place utilities in src/lib, types in src/types, UI in src/components/ui

### Clean Code Principles

- **Leave code cleaner**: Approach each file with the rule to leave it cleaner than you found it
- **Clarity and Simplicity**: Avoid overly complex or "clever" solutions
- **DRY Principle**: Abstract and reuse code where appropriate
- **Descriptive Naming**: Use descriptive function and variable names
- **Handle Error States**: At top of functions; keep branches shallow

---

This comprehensive guide provides the foundation for working with the SensoryTracker project. The
codebase prioritizes accessibility, performance, and privacy while maintaining clean, maintainable
code following React and TypeScript best practices.

**Remember: Leave the code cleaner than you found it.**
