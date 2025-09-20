import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Suspense } from "react";
import { AnalyticsSettings } from "@/components/AnalyticsSettings";
import { LazyChartsPanel } from '@/components/lazy/LazyChartsPanel';
import { LazyPatternsPanel } from '@/components/lazy/LazyPatternsPanel';
import { LazyCorrelationsPanel } from '@/components/lazy/LazyCorrelationsPanel';
import { LazyAlertsPanel } from '@/components/lazy/LazyAlertsPanel';
import {
  TrendingUp,
  Brain,
  Eye,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Settings,
} from "lucide-react";
import { Student, TrackingEntry, EmotionEntry, SensoryEntry } from "@/types/student";
import { useAnalyticsWorker } from "@/hooks/useAnalyticsWorker";
import { analyticsManager } from "@/lib/analyticsManager";
import { useTranslation } from "@/hooks/useTranslation";
import { analyticsExport } from "@/lib/analyticsExport";
import type { ExportFormat } from '@/types/analytics';
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "./ErrorBoundary";
import { useSyncedTabParam } from '@/hooks/useSyncedTabParam';
import { Badge } from '@/components/ui/badge';
import { useAsyncState } from '@/hooks/useAsyncState';
import { ExportDialog, type ExportOptions } from '@/components/ExportDialog';

// Typed tab keys to avoid stringly-typed errors

// Centralized mapping of tabs to i18n keys and data-testids
// Labels come from the analytics namespace: analytics.tabs.*
// moved to ./analyticsTabs to satisfy react-refresh rule
import { TABS } from './analyticsTabs';

/**
 * @interface AnalyticsDashboardProps
 * Props for the AnalyticsDashboard component.
 * @property {Student} student - The student object for context.
 * @property {object} filteredData - The pre-filtered data to be analyzed.
 */
interface AnalyticsDashboardProps {
  student: Student;
  filteredData: {
    entries: TrackingEntry[];
    emotions: EmotionEntry[];
    sensoryInputs: SensoryEntry[];
  };
  useAI?: boolean;
}

/**
 * @component AnalyticsDashboard
 * 
 * A dashboard component responsible for displaying the results of a student's data analysis.
 * 
 * This component has been refactored to be primarily presentational. It offloads all
 * heavy computation to a web worker via the `useAnalyticsWorker` hook. This ensures
 * the UI remains responsive, even when analyzing large datasets.
 * 
 * It no longer handles its own data filtering; instead, it receives `filteredData`
 * as a prop from a parent component, ensuring a single source of truth.
 */
export const AnalyticsDashboard = memo(({
  student,
  filteredData = { entries: [], emotions: [], sensoryInputs: [] },
  useAI = false,
}: AnalyticsDashboardProps) => {
  // All hooks must be called at the top level, not inside try-catch
  const { tStudent, tAnalytics, tCommon } = useTranslation();
  const exportState = useAsyncState<void>(null, { autoResetMs: 1000, showErrorToast: false });
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  
  // Always call hook at top level - hooks cannot be inside try-catch
  const { results, isAnalyzing, runAnalysis, invalidateCacheForStudent } = useAnalyticsWorker({ precomputeOnIdle: false });

  // Dev-only guard
  const isDevSeedEnabled = (() => {
    try {
      // Vite-style envs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env: any = (import.meta as any)?.env ?? {};
      return Boolean(env?.DEV || env?.MODE === 'development' || env?.VITE_ENABLE_DEV_SEED === 'true');
    } catch {
      return false;
    }
  })();

  const handleSeedDemo = useCallback(async () => {
    setIsSeeding(true);
    try {
      const mod = await import('@/lib/mock/mockSeeders');
      const { seedDemoData } = mod as typeof import('@/lib/mock/mockSeeders');
      const { totalStudentsAffected, totalEntriesCreated } = await seedDemoData({ forExistingStudents: true, createNewStudents: 1, batchesPerStudent: 1 });
      toast.success(String(tAnalytics('dev.seed.success', { students: totalStudentsAffected, entries: totalEntriesCreated })));
      // Invalidate analysis cache for this student and re-run to reflect new data if provided by parent
      invalidateCacheForStudent(student.id);
      runAnalysis(filteredData);
    } catch (e) {
      logger.error('[AnalyticsDashboard] Demo seed failed', { error: e });
      toast.error(String(tAnalytics('dev.seed.failure')));
    } finally {
      setIsSeeding(false);
    }
  }, [filteredData, invalidateCacheForStudent, runAnalysis, student.id, tAnalytics]);

  // Effect to trigger the analysis in the worker whenever the filtered data changes.
  useEffect(() => {
    // Normalize incoming filteredData timestamps to Date instances for charts/UI safety
    const normalize = (d: typeof filteredData) => {
      const coerce = (v: unknown): Date => {
        try {
          if (v instanceof Date && !isNaN(v.getTime())) return v;
          if (typeof v === 'string' || typeof v === 'number') {
            const dt = new Date(v);
            return isNaN(dt.getTime()) ? new Date() : dt;
          }
          return new Date();
        } catch (error) {
          logger.error(`Error coercing timestamp: ${String(v)} - ${(error as Error)?.message ?? String(error)}`);
          return new Date();
        }
      };
      
      try {
        return {
          entries: (d.entries || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
          emotions: (d.emotions || []).map(e => ({ ...e, timestamp: coerce(e.timestamp) })),
          sensoryInputs: (d.sensoryInputs || []).map(s => ({ ...s, timestamp: coerce(s.timestamp) })),
        };
      } catch (error) {
        logger.error(`Error normalizing filteredData: ${(error as Error)?.message ?? String(error)}`);
        return {
          entries: [],
          emotions: [],
          sensoryInputs: []
        };
      }
    };
    
    if (filteredData && filteredData.entries) {
      runAnalysis(normalize(filteredData));
    }
    // Ensure student analytics exists for all students, including new and mock
    analyticsManager.initializeStudentAnalytics(student.id);
  }, [student.id, filteredData, runAnalysis, useAI, student]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Component cleanup noop to satisfy no-empty
      void 0;
    };
  }, []);

  // useMemo hooks to prevent re-calculating derived data on every render.
  const patterns = useMemo(() => results?.patterns || [], [results]);
  const correlations = useMemo(() => results?.correlations || [], [results]);
  // const environmentalCorrelations = useMemo(() => results?.environmentalCorrelations || results?.correlations || [], [results]);
  const insights = useMemo(() => results?.insights || [], [results]);

  // Decouple visualization rendering from worker readiness to avoid spinners.
  // Charts render immediately using filteredData while analysis updates other tabs.

  // Export handler with useCallback for performance
  const doExport = useCallback(async (format: ExportFormat, opts?: Partial<ExportOptions>) => {
    try {
      setIsExporting(true);
      setExportProgress(5);
      await exportState.run(async () => {
      const dateRange = {
        start: filteredData.entries.length > 0
          ? filteredData.entries.reduce((min, entry) => {
              const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
              const minTime = min instanceof Date ? min : new Date(min);
              return entryTime < minTime ? entryTime : minTime;
            }, filteredData.entries[0].timestamp)
          : new Date(),
        end: filteredData.entries.length > 0
          ? filteredData.entries.reduce((max, entry) => {
              const entryTime = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
              const maxTime = max instanceof Date ? max : new Date(max);
              return entryTime > maxTime ? entryTime : maxTime;
            }, filteredData.entries[0].timestamp)
          : new Date()
      };

      setExportProgress(20);
      const exportData = {
        student,
        dateRange,
        data: filteredData,
        analytics: {
          patterns,
          correlations,
          insights,
          predictiveInsights: results?.predictiveInsights || [],
          anomalies: results?.anomalies || []
        },
        charts: format === 'pdf' && visualizationRef.current
          ? [{
              element: visualizationRef.current,
              title: String(tAnalytics('export.chartTitle'))
            }]
          : undefined,
        chartExports: format === 'pdf'
          ? await (async () => {
              try {
                const regs = (await import('@/lib/chartRegistry')).chartRegistry.all();
                if (!regs || regs.length === 0) {
                  toast.error(String(tAnalytics('export.noCharts')));
                  return [];
                }
                // Prefer charts matching the current student and overlapping date range
                const selected = regs
                  .filter(r => !r.studentId || r.studentId === student.id)
                  .filter(r => {
                    if (!r.dateRange) return true;
                    // simple overlap check
                    const s = r.dateRange.start.getTime();
                    const e = r.dateRange.end.getTime();
                    const ds = (dateRange.start as Date).getTime();
                    const de = (dateRange.end as Date).getTime();
                    return !(e < ds || s > de);
                  })
                  .slice(0, 6);
                setExportProgress(40);
                const items = await Promise.all(selected.map(async r => {
                  const methods = r.getMethods();
                  const dataURL = methods.getImage({ pixelRatio: 2, backgroundColor: '#ffffff' });
                  const svgString = methods.getSVG();
                  return {
                    title: r.title,
                    type: r.type,
                    // pass through metadata when we later add smarter layout/selection
                    // filters: r.filters,
                    // dateRange: r.dateRange,
                    dataURL: dataURL,
                    svgString: svgString,
                  };
                }));
                const filtered = items.filter(i => i.dataURL || i.svgString);
                if (filtered.length === 0) {
                  toast.error(String(tAnalytics('export.noCharts')));
                }
                return filtered;
              } catch (e) {
                logger.error(`Failed to collect chart exports: ${(e as Error)?.message ?? String(e)}`);
                toast.error(String(tAnalytics('export.noCharts')));
                return [];
              }
            })()
          : undefined
      };

           setExportProgress(65);
           await analyticsExport.exportTo(format, exportData, { pdf: { chartQuality: (opts as any)?.chartQuality } });
           setExportProgress(100);
           switch (format) {
             case 'pdf':
               toast.success(String(tAnalytics('export.success.pdf')));
               break;
             case 'csv':
               toast.success(String(tAnalytics('export.success.csv')));
               break;
             case 'json':
               toast.success(String(tAnalytics('export.success.json')));
               break;
           }
      });
        } catch (error) {
          logger.error(`Export failed: ${(error as Error)?.message ?? String(error)}`);
          toast.error(String(tAnalytics('export.failure')));
        }
      finally {
        setIsExporting(false);
      }
      }, [filteredData, student, patterns, correlations, insights, results, tAnalytics, exportState]);

  const handleExport = useCallback((format: ExportFormat) => {
    if (format === 'pdf') {
      setExportDialogOpen(true);
      return;
    }
    void doExport(format);
  }, [doExport]);

  // Icons and color helpers inlined where needed; unused utilities removed

// Track active tab synced with URL
  // URL-synced hook for persistence across reloads and deep links
  const [activeTab, setActiveTab] = useSyncedTabParam({ debounceMs: 150, paramKey: 'tab', defaultTab: 'charts' });

  // Live region for announcing tab changes
  const [liveMessage, setLiveMessage] = useState<string>("");
  useEffect(() => {
    try {
      logger.debug('[AnalyticsDashboard] Active tab changed', { studentId: student.id, tab: activeTab });
    } catch { void 0; }
    const current = TABS.find(t => t.key === activeTab);
    if (current) {
      const label = String(tAnalytics(current.labelKey));
      setLiveMessage(label);
    }
  }, [activeTab, tAnalytics, student.id]);

  return (
    <ErrorBoundary>
      {/* Skip link for keyboard users */}
      <a
        href="#analytics-tabpanel"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
      >
        {String(tAnalytics('skipToContent'))}
      </a>
      <section role="region" aria-labelledby="analytics-dashboard-title" className="space-y-6">
      {/* Hidden live region for announcing tab changes */}
      <div id="analytics-live-region" className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {liveMessage}
      </div>
      {/* Header card, displays the student's name and export options. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="analytics-dashboard-title">
            {String(tAnalytics('dashboard.title', { name: student.name }))}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* AI/Heuristic indicator */}
            <Badge variant={useAI ? 'default' : 'secondary'} data-testid="ai-mode-badge" aria-label={useAI ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' })) : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))}>
              {useAI ? String(tAnalytics('ai.mode.ai', { defaultValue: 'AI' })) : String(tAnalytics('ai.mode.heuristic', { defaultValue: 'Heuristic' }))}
            </Badge>
            {isDevSeedEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                aria-label={String(tAnalytics('dev.seed.aria'))}
                title={String(tAnalytics('dev.seed.button'))}
              >
                {isSeeding ? String(tAnalytics('dev.seed.seeding')) : String(tAnalytics('dev.seed.button'))}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              aria-label={String(tCommon('settings'))}
              title={String(tCommon('settings'))}
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{String(tCommon('settings'))}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exportState.isLoading} aria-label={String(tCommon('export'))} title={String(tCommon('export'))}>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{exportState.isLoading ? String(tCommon('exporting')) : String(tCommon('export'))}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  disabled={exportState.isLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsPdf'))}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  disabled={exportState.isLoading}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsCsv'))}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('json')}
                  disabled={exportState.isLoading}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  {String(tCommon('exportAsJson'))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Summary cards providing a quick overview of the data volume. */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tAnalytics('metrics.totalSessions'))}</p>
                <p className="text-2xl font-bold">{filteredData.entries.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.emotionsTracked'))}</p>
                <p className="text-2xl font-bold">{filteredData.emotions.length}</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tStudent('interface.sensoryInputs'))}</p>
                <p className="text-2xl font-bold">{filteredData.sensoryInputs.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{String(tAnalytics('metrics.patternsFound'))}</p>
                <p className="text-2xl font-bold">{patterns.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Metadata Summary */}
      {results?.ai && (
        <Card>
          <CardContent className="pt-4" data-testid="ai-metadata">
            <div className="flex flex-wrap gap-4 text-sm">
              {results.ai.provider && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.provider', { defaultValue: 'Provider' }))}: </span>
                  <span data-testid="ai-provider">{String(results.ai.provider)}</span>
                </div>
              )}
              {results.ai.model && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.model', { defaultValue: 'Model' }))}: </span>
                  <span data-testid="ai-model">{String(results.ai.model)}</span>
                </div>
              )}
              {(results.ai.confidence?.overall != null) && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.confidence', { defaultValue: 'Confidence' }))}: </span>
                  <span data-testid="ai-confidence">{Math.round((results.ai.confidence.overall || 0) * 100)}%</span>
                </div>
              )}
              {typeof results.ai.latencyMs === 'number' && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.latency', { defaultValue: 'Latency' }))}: </span>
                  <span data-testid="ai-latency">{String(results.ai.latencyMs)} ms</span>
                </div>
              )}
              {Array.isArray(results.ai.dataLineage) && results.ai.dataLineage.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.lineage', { defaultValue: 'Data Lineage' }))}: </span>
                  <span data-testid="ai-lineage-count">{results.ai.dataLineage.length}</span>
                </div>
              )}
              {Array.isArray(results.ai.caveats) && results.ai.caveats.length > 0 && (
                <div>
                  <span className="text-muted-foreground">{String(tAnalytics('ai.meta.caveats', { defaultValue: 'Caveats' }))}: </span>
                  <span data-testid="ai-caveats-count">{results.ai.caveats.length}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main tabbed interface for displaying detailed analysis results. */}
      <Tabs value={activeTab} onValueChange={setActiveTab as (v: string) => void} className="w-full">
        <TabsList className="grid w-full grid-cols-4 relative z-10" aria-label={String(tAnalytics('tabs.label'))}>
          {TABS.map(({ key, labelKey, testId, ariaLabelKey }) => (
            <TabsTrigger
              key={key}
              value={key}
              aria-label={ariaLabelKey ? String(tAnalytics(ariaLabelKey)) : String(tAnalytics(labelKey))}
              data-testid={testId}
            >
              {String(tAnalytics(labelKey))}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent id="analytics-tabpanel" value="charts" className="space-y-6" tabIndex={-1}>
          <div ref={visualizationRef}>
            <ErrorBoundary showToast={false}>
              <Suspense fallback={<div className="h-[360px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={'states.analyzing'} />}> 
                <LazyChartsPanel studentName={student.name} filteredData={filteredData} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6" aria-busy={isAnalyzing}>
          <ErrorBoundary showToast={false}>
            <Suspense fallback={<div className="h-[280px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={'states.analyzing'} />}> 
              <LazyPatternsPanel filteredData={filteredData} useAI={useAI} student={student} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <ErrorBoundary showToast={false}>
            <Suspense fallback={<div className="h-[420px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={'states.analyzing'} />}> 
              <LazyCorrelationsPanel filteredData={filteredData} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <ErrorBoundary showToast={false}>
            <Suspense fallback={<div className="h-[200px] rounded-xl border bg-card motion-safe:animate-pulse" aria-label={'states.analyzing'} />}> 
              <LazyAlertsPanel filteredData={filteredData} studentId={student.id} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Analytics Settings Dialog */}
      {showSettings && (
        <AnalyticsSettings
          onConfigChange={() => {
            // Invalidate cache for this student when config changes
            invalidateCacheForStudent(student.id);
            // Re-run analysis with new configuration
            runAnalysis(filteredData);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      </section>
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        defaultFormat="pdf"
        onConfirm={(opts) => { setExportDialogOpen(true); void doExport(opts.format, opts); }}
        inProgress={isExporting}
        progressPercent={exportProgress}
        onCancel={() => { setIsExporting(false); setExportDialogOpen(false); }}
        closeOnConfirm={false}
      />
    </ErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.student.name === nextProps.student.name &&
    prevProps.filteredData.entries.length === nextProps.filteredData.entries.length &&
    prevProps.filteredData.emotions.length === nextProps.filteredData.emotions.length &&
    prevProps.filteredData.sensoryInputs.length === nextProps.filteredData.sensoryInputs.length &&
    prevProps.useAI === nextProps.useAI &&
    // Check timestamp of first entry to detect data changes
    (prevProps.filteredData.entries.length === 0 || 
     nextProps.filteredData.entries.length === 0 ||
     (() => {
       try {
         const prevTimestamp = prevProps.filteredData.entries[0]?.timestamp;
         const nextTimestamp = nextProps.filteredData.entries[0]?.timestamp;
         
         // Handle various timestamp formats
         const prevTime = prevTimestamp instanceof Date ? prevTimestamp.getTime() : 
                          typeof prevTimestamp === 'string' || typeof prevTimestamp === 'number' ? new Date(prevTimestamp).getTime() : 0;
         const nextTime = nextTimestamp instanceof Date ? nextTimestamp.getTime() : 
                          typeof nextTimestamp === 'string' || typeof nextTimestamp === 'number' ? new Date(nextTimestamp).getTime() : 0;
         
         return prevTime === nextTime;
       } catch (error) {
         logger.error(`Error comparing timestamps in AnalyticsDashboard memo: ${(error as Error)?.message ?? String(error)}`);
         return false;
       }
     })())
  );
});
