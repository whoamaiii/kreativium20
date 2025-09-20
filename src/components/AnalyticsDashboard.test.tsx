import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrackingEntry, EmotionEntry, SensoryEntry } from '@/types/student';
import { render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useAnalyticsWorker } from '@/hooks/useAnalyticsWorker';
import type { Mock } from 'vitest';

vi.mock('@/hooks/useAnalyticsWorker', () => ({
  useAnalyticsWorker: vi.fn(),
}));

// Scope: loading state and worker invocation only; tab behaviors live in __tests__/AnalyticsDashboard.tabs.test.tsx
describe('AnalyticsDashboard', () => {
  const mockRunAnalysis = vi.fn();
  const mockInvalidateCache = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard with loading state', () => {
    (useAnalyticsWorker as unknown as Mock).mockReturnValue({
      results: null,
      isAnalyzing: true,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    const student = { id: 's1', name: 'Test Student' } as unknown as import('@/types/student').Student;
    render(<AnalyticsDashboard student={student} filteredData={{ entries: [], emotions: [], sensoryInputs: [] }} />);

    // Expect at least one analyzing indicator present (aria-label on Suspense fallbacks)
    const analyzingEls = screen.queryAllByLabelText('states.analyzing');
    expect(analyzingEls.length).toBeGreaterThan(0);
  });


  it('should call runAnalysis on mount with filtered data', () => {
    (useAnalyticsWorker as unknown as Mock).mockReturnValue({
      results: null,
      isAnalyzing: false,
      error: null,
      runAnalysis: mockRunAnalysis,
      invalidateCacheForStudent: mockInvalidateCache,
    });

    const filteredData: { entries: TrackingEntry[]; emotions: EmotionEntry[]; sensoryInputs: SensoryEntry[] } = {
      entries: [{ id: '1', studentId: 's1', timestamp: new Date(), value: 1, emotions: [], sensoryInputs: [] } as unknown as TrackingEntry],
      emotions: [],
      sensoryInputs: [],
    };

    const student = { id: 's1', name: 'Test Student' } as unknown as import('@/types/student').Student;
    render(<AnalyticsDashboard student={student} filteredData={filteredData} />);

    expect(mockRunAnalysis).toHaveBeenCalledWith(filteredData);
  });
});

