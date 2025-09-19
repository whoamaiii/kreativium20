# React Performance Optimization Guide

## 🎯 Performance Optimization Strategy

This guide provides comprehensive patterns and best practices for optimizing React application
performance, based on analysis of the current codebase.

## 📊 Current Performance Issues Identified

### Critical Issues (Immediate Action Required)

1. **setState in loops** - Causes multiple re-renders and performance degradation
2. **Nested map operations** - O(n²) complexity in several components
3. **Large inline functions in JSX** - Recreated on every render
4. **Missing memoization** - Components with complex props lack React.memo
5. **Unmemoized expensive calculations** - Heavy computations in render path

### High Priority Issues

- Excessive useEffect hooks (5+ in single components)
- Array index as React key
- Missing virtualization for large lists
- Synchronous I/O operations in render path

## 🚀 Optimization Patterns

### 1. Component Memoization

#### ❌ Before (Current Issue)

```tsx
// Component without memoization
export const StudentCard = ({ student, data, onUpdate }) => {
  // Component re-renders on every parent render
  return <div>...</div>;
};
```

#### ✅ After (Optimized)

```tsx
import { memo } from 'react';

export const StudentCard = memo(
  ({ student, data, onUpdate }) => {
    return <div>...</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison for deep equality if needed
    return (
      prevProps.student.id === nextProps.student.id &&
      prevProps.data.length === nextProps.data.length
    );
  },
);
```

### 2. Expensive Calculations with useMemo

#### ❌ Before (Current Issue in CorrelationHeatmap)

```tsx
const chartData = factors.map((factor1) => ({
  id: factor1,
  data: factors.map((factor2) => ({
    x: factor2,
    y: calculateCorrelation(factor1, factor2),
  })),
}));
```

#### ✅ After (Optimized)

```tsx
const chartData = useMemo(() => {
  return factors.map((factor1) => ({
    id: factor1,
    data: factors.map((factor2) => ({
      x: factor2,
      y: calculateCorrelation(factor1, factor2),
    })),
  }));
}, [factors]); // Only recalculate when factors change
```

### 3. Event Handler Optimization

#### ❌ Before (Current Issue in GoalManager)

```tsx
<Button
  onClick={() => {
    const title = prompt('Milestone title:');
    const description = prompt('Milestone description:');
    if (title && description) {
      addMilestone(goal.id, title, description, new Date());
    }
  }}
>
  Add Milestone
</Button>
```

#### ✅ After (Optimized)

```tsx
const handleAddMilestone = useCallback(
  (goalId: string) => {
    const title = prompt('Milestone title:');
    const description = prompt('Milestone description:');
    if (title && description) {
      addMilestone(goalId, title, description, new Date());
    }
  },
  [addMilestone],
);

// In JSX
<Button onClick={() => handleAddMilestone(goal.id)}>Add Milestone</Button>;
```

### 4. Prevent setState in Loops

#### ❌ Before (Critical Issue)

```tsx
for (let i = 0; i < items.length; i++) {
  setProgress((i / items.length) * 100);
  processItem(items[i]);
}
```

#### ✅ After (Optimized)

```tsx
// Batch state updates
const updates = items.map((item, i) => ({
  progress: (i / items.length) * 100,
  result: processItem(item),
}));
setProgress(100);
setResults(updates);
```

### 5. Virtual Scrolling for Large Lists

#### ❌ Before (Performance Issue)

```tsx
{
  items.map((item) => <ItemComponent key={item.id} item={item} />);
}
```

#### ✅ After (Using VirtualScrollArea)

```tsx
<VirtualScrollArea
  items={items}
  itemHeight={60}
  containerHeight={600}
  renderItem={(item, index) => <ItemComponent key={item.id} item={item} />}
  overscan={10}
/>
```

### 6. Optimize Nested Maps (O(n²) Complexity)

#### ❌ Before (Critical Issue)

```tsx
const result = array1.map((item1) => array2.map((item2) => expensiveOperation(item1, item2)));
```

#### ✅ After (Optimized with Memoization)

```tsx
const operationCache = useMemo(() => {
  const cache = new Map();
  array1.forEach((item1) => {
    array2.forEach((item2) => {
      const key = `${item1.id}-${item2.id}`;
      cache.set(key, expensiveOperation(item1, item2));
    });
  });
  return cache;
}, [array1, array2]);

const result = useMemo(
  () =>
    array1.map((item1) =>
      array2.map((item2) => {
        const key = `${item1.id}-${item2.id}`;
        return operationCache.get(key);
      }),
    ),
  [array1, array2, operationCache],
);
```

### 7. Lazy Load Heavy Components

#### ✅ Implementation

```tsx
import { lazy, Suspense } from 'react';

const Visualization3D = lazy(() => import('./components/Visualization3D'));

// In component
<Suspense fallback={<LoadingSpinner />}>
  {showVisualization && <Visualization3D data={data} />}
</Suspense>;
```

### 8. Web Worker for Heavy Computations

#### ✅ Implementation (Already in use, extend pattern)

```tsx
// Use existing useAnalyticsWorker pattern
const { results, isAnalyzing, runAnalysis } = useAnalyticsWorker({
  precomputeOnIdle: true, // Enable idle-time precomputation
});

// Offload heavy calculations
useEffect(() => {
  if (largeDataset) {
    runAnalysis(largeDataset); // Runs in worker thread
  }
}, [largeDataset, runAnalysis]);
```

## 📈 Performance Monitoring

### Custom Performance Hook

```tsx
import { useEffect, useRef } from 'react';

export function useRenderTime(componentName: string) {
  const renderCount = useRef(0);
  const renderTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current++;
    const startTime = performance.now();

    return () => {
      renderTime.current = performance.now() - startTime;
      if (renderTime.current > 16) {
        // Longer than one frame
        console.warn(
          `[Perf] ${componentName} render #${renderCount.current}: ${renderTime.current.toFixed(2)}ms`,
        );
      }
    };
  });
}
```

### React DevTools Profiler Integration

```tsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  if (actualDuration > 16) {
    console.warn(`[Profiler] ${id} (${phase}): ${actualDuration.toFixed(2)}ms`);
  }
}

<Profiler id="AnalyticsDashboard" onRender={onRenderCallback}>
  <AnalyticsDashboard {...props} />
</Profiler>;
```

## 🎯 Component-Specific Optimizations

### AnalyticsDashboard

- ✅ Already using memo and useCallback
- ⚠️ Optimize data normalization with useMemo
- ⚠️ Consider splitting into smaller sub-components

### GoalManager

- ❌ Large inline functions in onClick handlers
- ❌ Missing memoization for callbacks
- 🔧 Need to extract and memoize event handlers

### Visualization3D

- ❌ O(n²) complexity in data processing
- ❌ Large component (552 LOC) needs splitting
- 🔧 Consider using React.lazy for code splitting

### CorrelationHeatmap

- ❌ Missing component memoization
- ❌ Expensive calculation without useMemo
- ❌ Nested map operations (O(n²))

## 📋 Implementation Checklist

### Immediate Actions (Week 1)

- [ ] Add React.memo to all presentational components
- [ ] Fix setState in loops (critical performance issue)
- [ ] Memoize expensive calculations with useMemo
- [ ] Extract inline functions from JSX

### Short-term (Week 2-3)

- [ ] Implement virtual scrolling for lists > 50 items
- [ ] Optimize nested map operations
- [ ] Add performance monitoring hooks
- [ ] Split large components (> 300 LOC)

### Long-term (Month 1-2)

- [ ] Implement code splitting for routes
- [ ] Extend web worker usage for all heavy computations
- [ ] Add performance budgets and CI checks
- [ ] Implement React Suspense for data fetching

## 📊 Performance Metrics to Track

1. **Time to Interactive (TTI)** - Target: < 3 seconds
2. **First Contentful Paint (FCP)** - Target: < 1.5 seconds
3. **Component Render Time** - Target: < 16ms (60 FPS)
4. **Bundle Size** - Monitor with `npm run analyze`
5. **Memory Usage** - Monitor in Chrome DevTools

## 🛠️ Tools and Commands

```bash
# Analyze bundle size
npm run analyze

# Run performance tests
npm run test:performance

# Check for performance regressions
CI_PERF_THRESHOLD_MS=1200 npm run test:performance

# Profile with React DevTools
# Install React Developer Tools extension
# Use Profiler tab to record and analyze renders
```

## 📚 Additional Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

## 🚨 Anti-Patterns to Avoid

1. **Never use array index as key** in dynamic lists
2. **Avoid anonymous functions** in JSX props
3. **Don't mutate state directly**
4. **Avoid excessive DOM manipulation**
5. **Don't fetch data in render methods**
6. **Avoid deep component nesting** (> 7 levels)

## 📈 Expected Performance Improvements

After implementing these optimizations:

- 🎯 40-60% reduction in unnecessary re-renders
- ⚡ 30-50% improvement in initial load time
- 📊 50-70% reduction in memory usage for large datasets
- 🚀 Smooth 60 FPS interactions

---

_Last Updated: 2025-08-20_ _For questions or improvements, please update this guide as patterns
evolve._
