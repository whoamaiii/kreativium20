// Cache key computation is centralized via buildInsightsCacheKey

/**
 * @file src/hooks/useAnalyticsWorker.ts
 * 
 * This hook encapsulates the logic for interacting with the analytics web worker.
 * It simplifies the process of creating, communicating with, and terminating the worker,
 * providing a clean, React-friendly interface for components to offload heavy computations.
 * Now enhanced with performance caching to avoid redundant calculations.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyticsData, AnalyticsResults, AnalyticsWorkerMessage } from '@/types/analytics';
import { usePerformanceCache } from './usePerformanceCache';
import { analyticsConfig } from '@/lib/analyticsConfig';
import { getValidatedConfig, validateAnalyticsRuntimeConfig } from '@/lib/analyticsConfigValidation';
import { buildInsightsCacheKey, buildInsightsTask } from '@/lib/analyticsManager';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { diagnostics } from '@/lib/diagnostics';
import { analyticsWorkerFallback } from '@/lib/analyticsWorkerFallback';
import { POC_MODE, DISABLE_ANALYTICS_WORKER } from '@/lib/env';
import type { Student } from '@/types/student';
import type { AnalyticsResultsAI } from '@/lib/analysis';
import { analyticsManager } from '@/lib/analyticsManager';

// -----------------------------------------------------------------------------
// Module-level singleton to prevent duplicate workers across multiple consumers
// -----------------------------------------------------------------------------
interface WorkerSingleton {
  worker: Worker | null;
  refs: number;
  ready: boolean;
  circuitUntil: number; // epoch ms; when > now, do not attempt worker usage
}

const singleton: WorkerSingleton = {
  worker: null,
  refs: 0,
  ready: false,
  circuitUntil: 0,
};

function nowMs(): number { return Date.now(); }
function isCircuitOpen(): boolean { return nowMs() < singleton.circuitUntil; }
function openCircuit(ms: number): void { singleton.circuitUntil = nowMs() + Math.max(0, ms); }

// Simple once-per-key dedupe for user-facing notifications
const onceWindow = new Map<string, number>();
function doOnce(key: string, ttlMs: number, fn: () => void) {
  const now = nowMs();
  const last = onceWindow.get(key) ?? 0;
  if (now - last > ttlMs) {
    onceWindow.set(key, now);
    try { fn(); } catch { /* noop */ }
  }
}

// Queue tasks until worker signals ready
const pendingTasks: MessageEvent['data'][] = [];
// Per-hook cleanup stack (listeners, timers)
const cleanupFns: Array<() => void> = [];

function flushQueuedTasks(): void {
  if (!singleton.worker || !singleton.ready) return;
  while (pendingTasks.length) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (singleton.worker as any).postMessage(pendingTasks.shift());
    } catch (e) {
      // If posting fails, stop flushing to avoid spin
      break;
    }
  }
}

async function ensureWorkerInitialized(): Promise<Worker | null> {
  if (POC_MODE || DISABLE_ANALYTICS_WORKER) return null;
  if (singleton.worker) return singleton.worker;
  if (isCircuitOpen()) return null;

  try {
    const mod = await import('@/workers/analytics.worker?worker');
    const WorkerCtor = (mod as unknown as { default: { new(): Worker } }).default;
    const worker = new WorkerCtor();

    // Attach handlers once at creation time
    worker.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
      // Any message implies liveness; mark ready when first progress received or on any first message
      if (!singleton.ready) {
        const msg = event.data as AnalyticsWorkerMessage | undefined;
        if (!msg || msg.type === 'progress' || msg.type === 'partial' || msg.type === 'complete' || msg.type === 'error') {
          singleton.ready = true;
          flushQueuedTasks();
        }
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      logger.error('[useAnalyticsWorker] Worker runtime error, switching to fallback', error);
      try {
        worker.terminate();
      } catch { /* noop */ }
      singleton.worker = null;
      singleton.ready = false;
      // Open circuit for 60s to avoid thrash
      openCircuit(60_000);
      // One-time user-facing toast per cooldown window (localized elsewhere if needed)
      doOnce('analytics_worker_failure', 60_000, () => {
        // i18n keys under analytics:worker
        try {
          // Dynamically import to avoid pulling react-i18next into this hook directly
          import('@/hooks/useTranslation').then(({ useTranslation }) => {
            const { t } = useTranslation('analytics');
            toast({
              title: t('worker.fallbackTitle'),
              description: t('worker.fallbackDescription'),
            });
          }).catch(() => {
            // Fallback to English strings if i18n not ready here
            toast({
              title: 'Analytics running in fallback mode',
              description: 'Background worker failed. Using safe fallback to keep the UI responsive.',
            });
          });
        } catch {
          toast({
            title: 'Analytics running in fallback mode',
            description: 'Background worker failed. Using safe fallback to keep the UI responsive.',
          });
        }
      });
    };

    singleton.worker = worker;
    singleton.ready = false; // will flip true on first onmessage
    logger.info('[useAnalyticsWorker] Analytics worker initialized successfully');
    return worker;
  } catch (error) {
    logger.error('[useAnalyticsWorker] Failed to initialize worker', error as Error);
    singleton.worker = null;
    // Shorter circuit on init failure
    openCircuit(15_000);
    return null;
  }
}

function retainWorker(): void {
  singleton.refs += 1;
}

function releaseWorker(): void {
  singleton.refs = Math.max(0, singleton.refs - 1);
  if (singleton.refs === 0 && singleton.worker) {
    try {
      logger.debug('[useAnalyticsWorker] Terminating analytics worker');
      singleton.worker.terminate();
    } catch { /* noop */ }
    singleton.worker = null;
    singleton.ready = false;
  }
}

// Define CacheStats type if not imported from usePerformanceCache
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  invalidations: number;
  hitRate: number;
  size: number;
  memoryUsage?: number;
}

interface CachedAnalyticsWorkerOptions {
  cacheTTL?: number;
  enableCacheStats?: boolean;
  precomputeOnIdle?: boolean;
  // Optional injection for tests or advanced cache control
  extractTagsFromData?: (data: AnalyticsData | AnalyticsResults) => string[];
}

interface UseAnalyticsWorkerReturn {
  results: AnalyticsResultsAI | null;
  isAnalyzing: boolean;
  error: string | null;
  runAnalysis: (data: AnalyticsData, options?: { useAI?: boolean; student?: Student }) => Promise<void>;
  precomputeCommonAnalytics: (dataProvider: () => AnalyticsData[]) => void;
  invalidateCacheForStudent: (studentId: string) => void;
  clearCache: () => void;
  cacheStats: CacheStats | null;
  cacheSize: number;
}

/**
 * @hook useAnalyticsWorker
 * 
 * A custom hook to manage the analytics web worker with integrated caching.
 * 
 * @param options Configuration options for caching and precomputation
 * @returns {object} An object containing:
 *  - `results`: The latest analysis results received from the worker or cache.
 *  - `isAnalyzing`: A boolean flag indicating if an analysis is currently in progress.
 *  - `error`: Any error message returned from the worker.
 *  - `runAnalysis`: A function to trigger a new analysis by posting data to the worker.
 *  - `cacheStats`: Performance statistics about cache usage (if enabled).
 *  - `clearCache`: Function to clear the analytics cache.
 *  - `invalidateCache`: Function to invalidate cache entries by tag or pattern.
 */
export const useAnalyticsWorker = (options: CachedAnalyticsWorkerOptions = {}): UseAnalyticsWorkerReturn => {
  // Resolve defaults from runtime analyticsConfig with safe fallbacks
  const liveCfgRaw = (() => { try { return analyticsConfig.getConfig(); } catch { return null; } })();
  const { config: liveCfg } = validateAnalyticsRuntimeConfig(liveCfgRaw ?? undefined);
  const resolvedTtl = typeof options.cacheTTL === 'number'
    ? options.cacheTTL
    : (liveCfg?.cache?.ttl ?? 300_000); // default 300s in ms
  const {
    cacheTTL = resolvedTtl,
    enableCacheStats = false,
    precomputeOnIdle = false
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(false);

  // Initialize performance cache with appropriate settings
  const cache = usePerformanceCache<AnalyticsResults>({
    maxSize: (liveCfg?.cache?.maxSize ?? 50), // Use runtime config; fallback to 50
    ttl: cacheTTL,
    enableStats: enableCacheStats,
    versioning: true // Enable versioning to invalidate on data structure changes
  });

  /**
   * Extracts tags from analytics data for cache invalidation
   * Allow override via options for testing
   */
  const defaultExtractTagsFromData = useCallback((data: AnalyticsData | AnalyticsResults): string[] => {
    const tags: string[] = ['analytics'];
    
    // Add student-specific tags if available
    if ('entries' in data && (data as any).entries?.length > 0) {
      const studentIds = Array.from(new Set((data as any).entries.map((e: any) => e.studentId)));
      tags.push(...studentIds.map(id => `student-${id}`));
    }

    // Add date-based tags for time-sensitive invalidation
    const now = new Date();
    tags.push(`analytics-${now.getFullYear()}-${now.getMonth() + 1}`);
    
    return tags;
  }, []);
  const extractTagsFn = options.extractTagsFromData ?? defaultExtractTagsFromData;

  useEffect(() => {
    let isMounted = true; // Race condition guard

    const init = async () => {
      if (POC_MODE || DISABLE_ANALYTICS_WORKER) {
        workerRef.current = null;
        setIsWorkerReady(false);
        // Inform user once per minute if worker is disabled via flag
        if (DISABLE_ANALYTICS_WORKER) {
          doOnce('analytics_worker_disabled', 60_000, () => {
            try {
              import('@/hooks/useTranslation').then(({ useTranslation }) => {
                const { t } = useTranslation('analytics');
                toast({
                  title: t('worker.disabledTitle'),
                  description: t('worker.disabledDescription'),
                });
              }).catch(() => {
                toast({
                  title: 'Analytics worker disabled',
                  description: 'Running analytics without a background worker (debug mode).',
                });
              });
            } catch {
              toast({
                title: 'Analytics worker disabled',
                description: 'Running analytics without a background worker (debug mode).',
              });
            }
          });
        }
        return;
      }
      if (isCircuitOpen()) {
        workerRef.current = null;
        setIsWorkerReady(false);
        return;
      }
      retainWorker();
      const worker = await ensureWorkerInitialized();
      if (!isMounted) {
        releaseWorker();
        return;
      }
      workerRef.current = worker;
      setIsWorkerReady(!!(singleton.ready && worker));

      // Attach per-hook message listener to consume results
      if (worker) {
        const onMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
          const data = event.data as AnalyticsWorkerMessage | undefined;
          if (!data) return;
          // Any inbound message means the worker is alive
          if (!singleton.ready) {
            singleton.ready = true;
            flushQueuedTasks();
          }

          // Reset watchdog on any message
          if (watchdogRef.current) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
          }

          // Handle message types
          try {
            switch (data.type) {
              case 'partial':
                // For now, do not merge partials into results to avoid flicker; could add later
                break;
              case 'complete':
                setResults(data.payload as unknown as AnalyticsResultsAI);
                setIsAnalyzing(false);
                setError(null);
                break;
              case 'error':
                setIsAnalyzing(false);
                setError(typeof (data as any).error === 'string' ? (data as any).error : 'Analytics worker error');
                // Provide minimal safe results to prevent UI crashes per rules
                setResults((prev) => prev ?? ({
                  patterns: [], correlations: [], environmentalCorrelations: [], predictiveInsights: [], anomalies: [], insights: ['Analytics temporarily unavailable.']
                } as AnalyticsResultsAI));
                break;
              case 'progress':
                // No-op: used for readiness/heartbeat
                break;
              default:
                break;
            }
          } catch (e) {
            logger.error('[useAnalyticsWorker] Failed handling worker message', e as Error);
          }
        };

        const onMessageError = (evt: MessageEvent) => {
          logger.error('[useAnalyticsWorker] messageerror from analytics worker', evt);
        };

        worker.addEventListener('message', onMessage as EventListener);
        worker.addEventListener('messageerror', onMessageError as EventListener);

        // Cleanup these listeners if this hook unmounts while worker persists
        cleanupFns.push(() => {
          try {
            worker.removeEventListener('message', onMessage as EventListener);
            worker.removeEventListener('messageerror', onMessageError as EventListener);
          } catch { /* noop */ }
        });
      }
    };

    init();

    return () => {
      isMounted = false;
      // Local cleanup only; singleton handles actual termination when refs reach 0
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      // Run any per-hook cleanup fns (like removing event listeners)
      while (cleanupFns.length) {
        try { (cleanupFns.pop() as () => void)(); } catch { /* noop */ }
      }
      releaseWorker();
    };
  // Stable on mount; do not re-init on cache identity churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Creates a cache key based on the analytics data using centralized helper
   */
  const createCacheKey = useCallback((data: AnalyticsData): string => {
    // Map AnalyticsData to ComputeInsightsInputs structure expected by cache key builder
    const inputs = {
      entries: data.entries,
      emotions: data.emotions,
      sensoryInputs: data.sensoryInputs,
      // goals are not available at this layer; omit for key purposes
    } as unknown as { entries: unknown[]; emotions: unknown[]; sensoryInputs: unknown[] };

    // Use live runtime config to ensure keys align across app and worker
    const cfg = getValidatedConfig();

    return buildInsightsCacheKey(inputs as any, { config: cfg });
  }, []);

  /**
   * Sends data to the worker to start a new analysis, checking cache first.
   * Supports AI analysis via analyticsManager when requested.
   */
  const runAnalysis = useCallback(async (data: AnalyticsData, options?: { useAI?: boolean; student?: Student }) => {
    const aiRequested = options?.useAI === true;
    const cacheKey = `${createCacheKey(data)}|ai=${aiRequested ? '1' : '0'}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      // Reduce logging verbosity - only log on first hit per key
      if (!cache.get(`_logged_${cacheKey}`)) {
        try {
          logger.debug('[useAnalyticsWorker] cache hit', { cacheKey });
          cache.set(`_logged_${cacheKey}`, true, ['logging'], 60000); // Log once per minute max
        } catch (err) {
          /* noop */
        }
      }
      setResults(cachedResult as AnalyticsResultsAI);
      setError(null);
      return;
    }

    // AI path: bypass worker and use analyticsManager with runtime toggle
    if (aiRequested) {
      setIsAnalyzing(true);
      setError(null);
      try {
        let studentObj: Student | undefined = options?.student;
        if (!studentObj) {
          const first = data.entries?.[0];
          if (first?.studentId) {
            studentObj = { id: first.studentId, name: 'Student', createdAt: new Date() } as Student;
          }
        }
        if (!studentObj) throw new Error('Missing student context for AI analysis');

        const res = await analyticsManager.getStudentAnalytics(studentObj, { useAI: true });
        setResults(res as AnalyticsResultsAI);
        const tags = Array.from(new Set([...(extractTagsFn(data) || []), `student-${studentObj.id}`, 'ai'])) as string[];
        cache.set(cacheKey, res as AnalyticsResultsAI, tags);
      } catch (err) {
        logger.error('[useAnalyticsWorker] AI analysis path failed', err);
        setError('AI analysis failed. Falling back to standard analytics.');
        try {
          const res = await analyticsWorkerFallback.processAnalytics(data, { useAI: false, student: options?.student });
          setResults(res as AnalyticsResultsAI);
          const tags = extractTagsFn(data);
          cache.set(cacheKey, res as AnalyticsResultsAI, tags);
        } catch (fallbackError) {
          logger.error('[useAnalyticsWorker] Fallback after AI failure also failed', fallbackError);
          setResults({
            patterns: [],
            correlations: [],
            environmentalCorrelations: [],
            predictiveInsights: [],
            anomalies: [],
            insights: ['Analytics temporarily unavailable.']
          } as AnalyticsResultsAI);
        }
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // If no worker available, use fallback
    if (!workerRef.current || DISABLE_ANALYTICS_WORKER) {
      // Only log fallback mode once per session
      if (!cache.get('_logged_fallback_mode')) {
        logger.debug('[useAnalyticsWorker] No worker available, using fallback');
        cache.set('_logged_fallback_mode', true, ['logging'], 3600000); // Log once per hour
      }
      setIsAnalyzing(true);
      setError(null);
      
      try {
        const results = (options?.useAI === undefined && options?.student === undefined)
          ? await analyticsWorkerFallback.processAnalytics(data)
          : await analyticsWorkerFallback.processAnalytics(data, { useAI: options?.useAI, student: options?.student });
        setResults(results as AnalyticsResultsAI);
        // Cache the results
        const tags = extractTagsFn(data);
        cache.set(cacheKey, results as AnalyticsResultsAI, tags);
      } catch (error) {
        logger.error('[useAnalyticsWorker] Fallback failed', error);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        setResults({
          patterns: [],
          correlations: [],
          environmentalCorrelations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        } as AnalyticsResultsAI);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // If not in cache, proceed with worker analysis
    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    // Start watchdog timeout to prevent indefinite spinner
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    // Determine timeout from config if available; fallback to 15s minimum 3s
    const cfg = getValidatedConfig();
    // Clamp watchdog timeout to a sane upper bound to avoid indefinite spinners.
    // Use config ttl as a hint but never exceed 20s; keep a 5s lower bound.
    const hint = cfg?.cache?.ttl ?? 15000;
    const timeoutMs = Math.min(20000, Math.max(5000, hint));
    watchdogRef.current = setTimeout(async () => {
      try {
        logger.error('[useAnalyticsWorker] watchdog timeout: worker did not respond, attempting fallback');
      } catch {
        /* noop */
      }
      diagnostics.logWorkerTimeout('analytics', timeoutMs);
      
      // Terminate unresponsive worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Attempt fallback processing
      try {
        const fallbackResults = (options?.useAI === undefined && options?.student === undefined)
          ? await analyticsWorkerFallback.processAnalytics(data)
          : await analyticsWorkerFallback.processAnalytics(data, { useAI: options?.useAI, student: options?.student });
        setResults(fallbackResults as AnalyticsResultsAI);
        const tags = extractTagsFn(data);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, tags);
        setError('Worker timeout - results computed using fallback mode.');
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback failed after watchdog timeout', fallbackError);
        setError('Analytics processing failed. Please try again.');
        // Set minimal results to prevent UI crash
        setResults({
          patterns: [],
          correlations: [],
          environmentalCorrelations: [],
          predictiveInsights: [],
          anomalies: [],
          insights: ['Analytics temporarily unavailable.']
        } as AnalyticsResultsAI);
      } finally {
        setIsAnalyzing(false);
      }
    }, timeoutMs);
    
    // Get current configuration (validated)
    const config = getValidatedConfig();

    // Rate limit worker posting logs
    const logKey = `_logged_worker_post_${new Date().getMinutes()}`;
    if (!cache.get(logKey)) {
      try {
        logger.debug('[useAnalyticsWorker] posting to worker (runAnalysis)', { hasConfig: !!config, cacheKey });
        cache.set(logKey, true, ['logging'], 60000); // Log at most once per minute
      } catch {
        /* noop */
      }
    }
    
    // Send data to worker with cache key and configuration
    try {
      // Build typed Insights task with centralized key, ttl, and tags
      const inputs = {
        entries: data.entries,
        emotions: data.emotions,
        sensoryInputs: data.sensoryInputs,
      } as const;
      const task = buildInsightsTask(inputs, {
        config,
        // Propagate tags derived from inputs so worker-side caches can invalidate by tag
        tags: extractTagsFn(data),
      });

      // Rate limit WORKER_MESSAGE logs
      const workerLogKey = `_logged_worker_message_${cacheKey}_${new Date().getMinutes()}`;
      if (!cache.get(workerLogKey)) {
        logger.debug('[WORKER_MESSAGE] Sending Insights/Compute task to analytics worker', {
          cacheKey: task.cacheKey,
          ttlSeconds: task.ttlSeconds,
          tagCount: task.tags?.length ?? 0,
          emotionsCount: data.emotions?.length || 0,
          sensoryInputsCount: data.sensoryInputs?.length || 0,
          entriesCount: data.entries?.length || 0
        });
        cache.set(workerLogKey, true, ['logging'], 60000); // Log once per minute per cache key
      }

      // If worker not available or circuit is open, queue or fallback
      if (!workerRef.current || isCircuitOpen()) {
        // If no worker at all, route to fallback immediately (do not queue unbounded)
        if (!singleton.worker) {
          throw new Error('Worker unavailable or circuit open');
        }
      }

      // If worker exists but is not ready yet, queue the task
      if (workerRef.current && !singleton.ready) {
        pendingTasks.push(task as unknown as MessageEvent['data']);
      } else if (workerRef.current) {
        workerRef.current.postMessage(task);
      } else {
        throw new Error('Worker reference missing');
      }
    } catch (postErr) {
      logger.error('[WORKER_MESSAGE] Failed to post message to worker, falling back to sync', { error: postErr });
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      
      // Fallback to synchronous processing
      try {
        const fallbackResults = (options?.useAI === undefined && options?.student === undefined)
          ? await analyticsWorkerFallback.processAnalytics(data)
          : await analyticsWorkerFallback.processAnalytics(data, { useAI: options?.useAI, student: options?.student });
        setResults(fallbackResults as AnalyticsResultsAI);
        const tags = extractTagsFn(data);
        cache.set(cacheKey, fallbackResults as AnalyticsResultsAI, tags);
        setError(null);
      } catch (fallbackError) {
        logger.error('[useAnalyticsWorker] Fallback processing failed after worker post error', fallbackError);
        setError('Analytics processing failed.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [cache, createCacheKey, extractTagsFn]);

  /**
   * Pre-compute analytics for common queries during idle time
   */
  const precomputeCommonAnalytics = useCallback((dataProvider: () => AnalyticsData[]) => {
    if (!precomputeOnIdle || !workerRef.current) return;

    const precompute = () => {
      const commonDataSets = dataProvider();
      const config = getValidatedConfig();
      
      commonDataSets.forEach((data, index) => {
        // Stagger the precomputation to avoid blocking
        setTimeout(() => {
          const cacheKey = createCacheKey(data);
          
          // Only compute if not already cached
          if (!cache.has(cacheKey)) {
            try {
        logger.debug('[useAnalyticsWorker] posting Insights/Compute task (precompute)', { hasConfig: !!config, cacheKey, idx: index });
            } catch {
              /* noop */
            }
            const task = buildInsightsTask({
              entries: data.entries,
              emotions: data.emotions,
              sensoryInputs: data.sensoryInputs,
            }, { config, tags: extractTagsFn(data) });
            workerRef.current?.postMessage(task);
          }
        }, index * 100); // 100ms between each precomputation
      });
    };

    // Use requestIdleCallback for precomputation
    if ('requestIdleCallback' in window) {
      idleCallbackRef.current = requestIdleCallback(precompute, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(precompute, 2000);
    }
  }, [precomputeOnIdle, cache, createCacheKey]);

  /**
   * Invalidate cache entries for a specific student
   */
  const invalidateCacheForStudent = useCallback((studentId: string) => {
    cache.invalidateByTag(`student-${studentId}`);
  }, [cache]);

  /**
   * Invalidate all analytics cache entries
   */
  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  /**
   * Subscribe to configuration changes to invalidate cache
   */
  useEffect(() => {
    const unsubscribe = analyticsConfig.subscribe((newConfig) => {
      if (newConfig.cache.invalidateOnConfigChange) {
        clearCache();
      }
    });

    return unsubscribe;
  }, [clearCache]);

  /**
   * Get current cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cache.stats;
  }, [cache]);

  return {
    results,
    isAnalyzing,
    error,
    runAnalysis,
    precomputeCommonAnalytics,
    invalidateCacheForStudent,
    clearCache,
    cacheStats: getCacheStats(),
    cacheSize: cache.size
  };
};
