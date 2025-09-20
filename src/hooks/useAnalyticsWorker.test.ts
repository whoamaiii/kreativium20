import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Force non-POC mode so the worker is initialized in tests
vi.mock('@/lib/env', () => ({ POC_MODE: false, DISABLE_ANALYTICS_WORKER: false }));

import { useAnalyticsWorker } from './useAnalyticsWorker';

// Mock the worker used by the hook (note the ?worker suffix)
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
let lastWorker: any = null;

vi.mock('@/workers/analytics.worker?worker', () => {
  class MockWorker {
    onmessage: (e: any) => void = () => {};
    onmessageerror: (e: any) => void = () => {};
    postMessage = mockPostMessage;
    terminate = mockTerminate;
    private listeners = new Map<string, (e: any) => void>();
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- store instance so tests can inspect mocked worker
      lastWorker = this;
    }
    addEventListener(event: string, handler: (e: any) => void) {
      this.listeners.set(event, handler);
    }
    removeEventListener(event: string) {
      this.listeners.delete(event);
    }
    // Helpers to simulate messages via the classic properties
    // When tests call worker.onmessage(...), the hook should still pick it up because we forward to listeners
    set onmessageSetter(fn: (e: any) => void) {
      this.onmessage = fn;
      this.listeners.set('message', fn);
    }
    set onmessageerrorSetter(fn: (e: any) => void) {
      this.onmessageerror = fn;
      this.listeners.set('messageerror', fn);
    }
  }
  // Also support CJS default
  return { __esModule: true, default: MockWorker, __getLastWorker: () => lastWorker } as any;
});

describe('useAnalyticsWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAnalyticsWorker());

    expect(result.current.results).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call postMessage with the correct data when runAnalysis is called', async () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testData = { entries: [], emotions: [], sensoryInputs: [] };

    // Allow the init effect to run
    await new Promise(r => setTimeout(r, 0));

    // Wait until the mocked worker has been constructed
    const mod: any = await import('@/workers/analytics.worker?worker');
    let tries = 0;
    while (!mod.__getLastWorker() && tries < 20) {
      await new Promise(r => setTimeout(r, 5));
      tries++;
    }
    // Mark worker as ready so queued tasks flush immediately
    const worker = mod.__getLastWorker();
    worker.onmessage({ data: { type: 'progress', progress: { stage: 'ready', percent: 1 } } });

    await act(async () => {
      await result.current.runAnalysis(testData);
    });

    await waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalled();
    });
    // We now send a typed Insights/Compute task envelope to the worker
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'Insights/Compute',
      payload: expect.any(Object),
      cacheKey: expect.any(String),
      ttlSeconds: expect.any(Number),
    }));
    expect(result.current.error).toBeNull();
  });

  it('should update state on successful analysis', async () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testResults = { patterns: [], correlations: [], environmentalCorrelations: [], insights: [] };

    // Wait for worker
    const mod: any = await import('@/workers/analytics.worker?worker');
    let worker = mod.__getLastWorker();
    let tries = 0;
    while (!worker && tries < 20) {
      await new Promise(r => setTimeout(r, 5));
      worker = mod.__getLastWorker();
      tries++;
    }

    // Simulate ready then complete message
    await act(async () => {
      worker.onmessage({ data: { type: 'progress', progress: { stage: 'ready', percent: 1 } } });
      worker.onmessage({ data: { type: 'complete', payload: testResults } });
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(testResults);
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should update state on analysis error', async () => {
    const { result } = renderHook(() => useAnalyticsWorker());
    const testError = { message: 'Test Error' } as any;

    // Simulate an error message from the mocked worker
    const mod: any = await import('@/workers/analytics.worker?worker');
    const worker = mod.__getLastWorker();
    await act(async () => {
      worker.onmessage({ data: { type: 'progress', progress: { stage: 'ready', percent: 1 } } });
      worker.onmessage({ data: { type: 'error', error: testError } });
    });

    await waitFor(() => {
      expect(result.current.results).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toEqual(testError);
    });
  });

  it('should terminate the worker on unmount', async () => {
    const { unmount } = renderHook(() => useAnalyticsWorker());

    // Wait for worker
    const mod: any = await import('@/workers/analytics.worker?worker');
    let tries = 0;
    while (!mod.__getLastWorker() && tries < 10) {
      await new Promise(r => setTimeout(r, 0));
      tries++;
    }

    await act(async () => {
      unmount();
    });

    await waitFor(() => {
      expect(mockTerminate).toHaveBeenCalled();
    });
  });
});
