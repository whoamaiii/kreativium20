# Implementation Guide

This guide documents the major infrastructure improvements implemented in the Sensory Compass
application.

## Table of Contents

1. [Centralized Logging](#centralized-logging)
2. [Mock Data Generation](#mock-data-generation)
3. [Async State Management](#async-state-management)
4. [Error Handling](#error-handling)
5. [AI-Powered Explanations](#ai-powered-explanations)
6. [PDF Export System](#pdf-export-system)
7. [Accessibility](#accessibility)
8. [Performance](#performance)

## Centralized Logging

### Overview

All direct `console.*` calls have been replaced with a centralized `Logger` service that respects
environment configurations.

### Configuration

Set these environment variables:

- `VITE_LOG_LEVEL`: Controls log verbosity (`debug`, `info`, `warn`, `error`, `none`)
- `VITE_DEBUG`: Enable debug mode (`true`/`false`)

### Usage

```typescript
import { logger } from '@/lib/logger';

// Instead of console.log
logger.debug('Debug message', { data });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Benefits

- No console logs in production by default
- Structured logging with consistent format
- Easy to enable debugging without code changes
- Future-ready for remote logging integration

## Mock Data Generation

### Overview

The mock data generator now creates realistic, validated data with proper UUID-based IDs and
scenario filtering.

### Features

- UUID-based IDs for all entities
- Scenario-based data generation (classroom, social, sensory overload)
- Full data validation before persistence
- Realistic environmental and social interaction data

### Usage

```typescript
import { loadScenarioDataToStorage } from '@/lib/mockDataGenerator';

// Load scenario-specific data
await loadScenarioDataToStorage('social-interaction', 'student-123');
```

### Validation

All generated data is validated using Zod schemas before being saved:

```typescript
const validationResult = validateTrackingEntry(entry);
if (!validationResult.isValid) {
  logger.error('Invalid entry', { errors: validationResult.errors });
}
```

## Async State Management

### Overview

The `useAsyncState` hook standardizes handling of asynchronous operations in UI components.

### Features

- Consistent loading, error, and success states
- Integration with global error handler
- Automatic error toast notifications
- Optional deferred execution

### Usage

```typescript
const { value, loading, error, execute } = useAsyncState(
  async (param: string) => {
    const result = await api.fetchData(param);
    return result;
  },
  {
    defer: true, // Don't execute immediately
    onSuccess: (data) => toast.success('Data loaded'),
    onError: (err) => console.error(err),
  },
);

// Later...
await execute('parameter');
```

## Error Handling

### Overview

A comprehensive error handling system with user-friendly messages and recovery strategies.

### Error Types

```typescript
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  ANALYTICS_ERROR = 'ANALYTICS_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  // ... more types
}
```

### Creating Errors

```typescript
// Use factory functions
const error = createValidationError('Invalid student data', {
  field: 'email',
  value: 'invalid',
});

// Or create directly
const error = new SensoryCompassError(ErrorType.STORAGE_ERROR, 'Failed to save data', {
  recoverable: true,
});
```

### Global Error Handler

```typescript
import { errorHandler } from '@/lib/errorHandler';

// Handle with toast and logging
await errorHandler.handle(error, {
  showToast: true,
  logError: true,
  onRetry: async () => {
    // Custom retry logic
  },
});
```

## AI-Powered Explanations

### Overview

Evidence-grounded explanations with proper validation and sanitization.

### Context Building

```typescript
const allowed = computeAllowedContexts({
  entries: trackingData,
  emotions: emotionData,
  sensoryInputs: sensoryData,
});
// Returns: { places: [...], activities: [...], triggers: [...] }
```

### Response Validation

```typescript
import { validateAIResponse } from '@/lib/evidence/validation';

const response = await openRouterClient.chatJSON(messages, {
  refine: (val) => validateAIResponse(val),
});
```

### Sanitization

```typescript
const sanitized = sanitizePlainNorwegian(aiText, allowedContexts);
// Removes markdown and replaces forbidden contexts
```

## PDF Export System

### Overview

Flexible PDF export with templates, quality settings, and accessibility features.

### Templates

- **Summary**: Concise overview with smaller charts
- **Detailed**: Comprehensive report with full data
- **Presentation**: Large visuals for projection

### Configuration

```typescript
const layoutConfig = getLayoutConfig('detailed');
// Returns: margins, font sizes, charts per page, etc.

const chartConfig = getChartConfig('high', 'colorblind-friendly');
// Returns: DPI, format (PNG/SVG), color palette
```

### Export Options

```typescript
export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  template: ExportTemplate;
  chartQuality: ChartQuality;
  colorScheme: ColorScheme;
  includeRawData: boolean;
}
```

### Chart Export

Charts are registered and exported at high quality:

```typescript
// In chart component
chartRegistry.register({
  id: 'emotion-trends',
  studentId: 'student-123',
  instance: echartsInstance,
  type: 'line',
});

// During export
const charts = chartRegistry.byStudent('student-123');
for (const chart of charts) {
  const svg = await chartExport.getSVG(chart.instance);
  // Add to PDF...
}
```

## Accessibility

### Export Dialog

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader announcements
- Focus management

### Chart Accessibility

```typescript
const description = getChartA11yDescription('bar', {
  title: 'Emotion Distribution',
  maxValue: 10,
  minValue: 0,
});
// Returns: "Bar chart showing Emotion Distribution. Highest value: 10, lowest value: 0."
```

### Color Schemes

- **Default**: Standard application colors
- **High Contrast**: Maximum contrast for visual impairments
- **Colorblind-Friendly**: Distinguishable colors for color blindness

## Performance

### Lazy Loading

PDF libraries are loaded on-demand:

```typescript
// Only loaded when PDF export is triggered
const { default: jsPDF } = await import('jspdf');
const { default: html2canvas } = await import('html2canvas');
```

### Memoization

Expensive computations are memoized:

```typescript
const memoizedPattern = useMemo(() => analyzePattern(data), [data]);
```

### Bundle Optimization

- Dynamic imports for heavy libraries
- Tree-shaking for unused code
- Code splitting by route

## Best Practices

1. **Always validate data** before persistence
2. **Use structured logging** instead of console
3. **Handle errors gracefully** with user-friendly messages
4. **Test accessibility** with screen readers
5. **Monitor bundle size** with build analysis
6. **Document API changes** in changelog

## Migration Guide

### From Console to Logger

```typescript
// Before
console.log('Processing', data);
console.error('Failed', error);

// After
logger.info('Processing', { data });
logger.error('Failed to process', error);
```

### From Try-Catch to useAsyncState

```typescript
// Before
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
try {
  setLoading(true);
  const result = await api.call();
  // handle result
} catch (e) {
  setError(e);
} finally {
  setLoading(false);
}

// After
const { value, loading, error, execute } = useAsyncState(() => api.call(), { defer: true });
```

## Testing

### Unit Tests

- Test error factories and validation
- Test sanitization functions
- Test export templates

### Integration Tests

- Test AI response handling
- Test PDF generation
- Test data flow consistency

### E2E Tests

- Test export dialog interaction
- Test accessibility features
- Test error recovery flows

## Troubleshooting

### Logging Issues

1. Check `VITE_LOG_LEVEL` environment variable
2. Verify logger import path
3. Check for remaining console calls

### Export Issues

1. Verify chart registration
2. Check browser compatibility for SVG export
3. Monitor memory usage for large datasets

### AI Explanation Issues

1. Verify API key is set
2. Check allowed contexts computation
3. Monitor token usage

## Future Enhancements

1. **Remote Logging**: Send logs to monitoring service
2. **Export Templates**: User-defined custom templates
3. **Batch Operations**: Export multiple students at once
4. **Offline Support**: Cache AI responses locally
5. **Advanced Analytics**: ML-powered insights

---

For questions or contributions, please refer to the main README.md.
