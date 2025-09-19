# Testing Documentation

## Overview

This project implements a comprehensive testing strategy covering unit tests, integration tests,
end-to-end tests, performance benchmarks, and bias detection. All tests are designed to ensure code
quality, reliability, and fairness in the analytics system.

## Test Structure

```
tests/
├── unit/                     # Unit tests for individual functions
├── integration/              # Integration tests for data flow
├── e2e/                      # End-to-end tests with Playwright
├── e2e-smoke/                # Quick smoke tests
├── performance/              # Performance benchmarks
├── bias/                     # Bias detection tests
└── setup files               # Test configuration

src/
├── components/__tests__/     # Component unit tests
├── hooks/__tests__/          # Hook unit tests
├── lib/__tests__/            # Library function tests
└── config/__tests__/         # Configuration tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npx vitest run path/to/test.spec.ts

# Run tests matching pattern
npx vitest run -- -t "pattern"
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Interactive coverage UI
npm run test:coverage:ui

# Watch mode with coverage
npm run test:coverage:watch
```

Coverage thresholds:

- Global: 85% lines, 80% branches
- src/lib/: 90% all metrics
- src/hooks/: 85% all metrics
- src/components/ui/: 80% lines, 75% branches

### Integration Tests

```bash
# Run integration tests
npm test tests/integration

# Specific integration suite
npx vitest run tests/integration/analytics_data_flow.test.ts
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time)
npm run e2e:install

# Run E2E tests
npm run e2e

# Interactive UI mode
npm run e2e:ui

# Debug mode
npm run e2e:debug

# Headless mode (CI)
npm run e2e:headless
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# With custom threshold (milliseconds)
CI_PERF_THRESHOLD_MS=2000 npm run test:performance
```

Default thresholds:

- Small dataset: < 150ms
- Medium dataset: < 750ms
- Large dataset: < 1500ms
- Memory usage: < 50MB

### Bias Detection Tests

```bash
# Run bias tests
npm run test:bias

# With custom tolerance
CI_BIAS_TOL=0.1 npm run test:bias
```

Default bias tolerance: 0.08 (8%)

## Test Categories

### 1. Unit Tests

Unit tests focus on individual components and functions in isolation:

- **UI Components**: Button, Card, Dialog, etc.
  - Rendering with different props
  - Interaction handling
  - Accessibility attributes
  - Style application

- **Hooks**: useLocalStorage, useAnalyticsWorker, etc.
  - State management
  - Side effects
  - Cleanup
  - Error handling

- **Utilities**: Data transformations, validation, formatting
  - Edge cases
  - Type safety
  - Performance

Example:

```typescript
describe('Button Component', () => {
  it('renders with correct variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('destructive');
  });
});
```

### 2. Integration Tests

Integration tests verify data flow and component interactions:

- **Analytics Pipeline**: Worker communication, data processing
- **State Management**: Context updates, store synchronization
- **API Integration**: Request/response handling, error recovery

Example:

```typescript
describe('Analytics Data Flow', () => {
  it('processes student data through pipeline', async () => {
    const result = await manager.analyzeStudent('student-1', sessions);
    expect(result.summary.totalSessions).toBe(sessions.length);
  });
});
```

### 3. End-to-End Tests

E2E tests simulate real user journeys:

- **Student Management**: CRUD operations, progress tracking
- **Analytics Dashboard**: Data visualization, filtering, exports
- **Report Generation**: Creating and scheduling reports
- **Accessibility**: Keyboard navigation, screen reader support

Example:

```typescript
test('complete student onboarding flow', async ({ page }) => {
  await page.click('[data-testid="add-student-btn"]');
  await page.fill('[name="name"]', 'New Student');
  await page.click('[type="submit"]');
  await expect(page.locator('text=New Student')).toBeVisible();
});
```

### 4. Performance Tests

Performance tests ensure the application meets speed requirements:

- **Data Processing**: Large dataset handling
- **Memory Management**: Leak detection, cleanup verification
- **Concurrent Operations**: Parallel processing efficiency
- **Cache Performance**: Lookup speed, invalidation

Metrics tracked:

- Execution time
- Memory usage
- Operations per second
- Scaling characteristics

### 5. Bias Detection Tests

Bias tests ensure fairness across different demographics:

- **Demographic Bias**: Gender, age, ethnicity, socioeconomic
- **Algorithmic Bias**: Pattern detection, recommendations
- **Temporal Bias**: Consistency over time
- **Intersectional Bias**: Multiple attribute combinations

Fairness metrics:

- Demographic parity
- Equal opportunity
- Equalized odds
- Individual fairness

## CI/CD Integration

Tests run automatically in CI pipeline:

1. **Pre-commit**: Linting via husky
2. **Pull Request**:
   - Unit tests with coverage
   - Integration tests
   - Type checking
   - Documentation validation
3. **Main Branch**:
   - Full test suite
   - Performance benchmarks
   - Bias detection
   - E2E tests

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, specific test descriptions
2. **Arrange-Act-Assert**: Structure tests consistently
3. **Isolation**: Each test should be independent
4. **Mocking**: Mock external dependencies appropriately
5. **Cleanup**: Always clean up resources in afterEach

### Test Data

1. **Factories**: Use factory functions for test data
2. **Fixtures**: Store complex test data in fixtures
3. **Seeds**: Use consistent seed data for reproducibility
4. **Edge Cases**: Test boundaries and error conditions

### Assertions

1. **Specific**: Use the most specific assertion available
2. **Multiple**: Test multiple aspects when relevant
3. **Async**: Properly handle async assertions
4. **Custom Matchers**: Create custom matchers for complex checks

## Debugging Tests

### Vitest UI

```bash
# Launch interactive UI
npx vitest --ui
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["vitest", "run", "${file}"],
  "console": "integratedTerminal"
}
```

### Playwright Inspector

```bash
# Debug E2E tests
npm run e2e:debug

# Generate trace on failure
PWDEBUG=1 npm run e2e
```

## Common Issues

### Flaky Tests

- Use proper wait strategies
- Avoid arbitrary timeouts
- Mock time-dependent operations
- Ensure proper cleanup

### Slow Tests

- Use test.concurrent for parallel execution
- Optimize test data generation
- Cache expensive operations
- Use focused tests during development

### Coverage Gaps

- Check coverage report: `coverage/index.html`
- Focus on critical paths
- Test error conditions
- Cover edge cases

## Test Maintenance

### Regular Tasks

- **Weekly**: Review flaky tests
- **Monthly**: Update test data
- **Quarterly**: Performance baseline review
- **Yearly**: Bias threshold evaluation

### Adding New Tests

1. Write test first (TDD)
2. Ensure it fails initially
3. Implement feature
4. Verify test passes
5. Check coverage impact
6. Update documentation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Coverage Reports](./coverage/index.html)

## Contact

For testing questions or improvements:

- Create an issue with `testing` label
- Review existing test patterns
- Consult team lead for architectural decisions
