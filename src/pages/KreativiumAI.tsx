import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Play, RefreshCw, Database, Clock, Info, AlertTriangle, Loader2, Download, Share2, Clipboard as ClipboardIcon } from 'lucide-react';
import { dataStorage } from '@/lib/dataStorage';
import type { Student } from '@/types/student';
import { LLMAnalysisEngine } from '@/lib/analysis/llmAnalysisEngine';
import type { AnalyticsResultsAI, TimeRange } from '@/lib/analysis/analysisEngine';
import { loadAiConfig } from '@/lib/aiConfig';
import { openRouterClient } from '@/lib/ai/openrouterClient';
import { logger } from '@/lib/logger';
import { Toggle } from '@/components/ui/toggle';
import { computeComparisonRange, formatComparisonPeriodLabel, type ComparisonMode } from '@/lib/analysis/dateHelpers';
import { ComparisonSummary } from '@/components/ComparisonSummary';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAiReportText, downloadPdfFromText } from '@/lib/ai/exportAiReport';
import { aiMetrics } from '@/lib/ai/metrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { announceToScreenReader } from '@/utils/accessibility';
import { resolveSources } from '@/lib/evidence';
import type { EvidenceSource } from '@/lib/evidence';

type Preset = 'all' | '7d' | '30d' | '90d';

type DataQualityBuckets = Record<'morning' | 'afternoon' | 'evening', number>;

interface DataQualitySummary {
  total: number;
  last: Date | null;
  daysSince: number | null;
  completeness: number;
  balance: number;
  buckets: DataQualityBuckets;
  avgIntensity: number | null;
}

interface ConcreteTimeRange extends TimeRange {
  start: Date;
  end: Date;
}

function computeRange(preset: Preset): ConcreteTimeRange | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  start.setDate(now.getDate() - days);
  return {
    start,
    end,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function toConcreteTimeRange(range: TimeRange): ConcreteTimeRange {
  const start = range.start instanceof Date ? range.start : new Date(range.start);
  const end = range.end instanceof Date ? range.end : new Date(range.end);
  return {
    start,
    end,
    timezone: range.timezone,
  };
}

function formatRangeCacheKey(range: ConcreteTimeRange | undefined): string {
  if (!range) return 'all';
  return `${range.start.toISOString()}_${range.end.toISOString()}`;
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString();
}

function getToolbarStorageKey(students: Student[], currentStudentId: string, range: ConcreteTimeRange | undefined): string {
  const studentName = students.find((st) => st.id === currentStudentId)?.name || 'elev';
  const normalizedStudent = studentName.toLowerCase();
  const rangeLabel = range
    ? `${formatDateForDisplay(range.start)}_${formatDateForDisplay(range.end)}`.toLowerCase()
    : 'alle';
  return `ai_toolbar_last_${normalizedStudent}_${rangeLabel}`;
}

function computeDataQualityMetrics(studentId: string, timeframe?: ConcreteTimeRange): DataQualitySummary | null {
  try {
    if (!studentId) return null;
    const entriesAll = dataStorage.getEntriesForStudent(studentId) || [];
    const start = timeframe?.start;
    const end = timeframe?.end;
    const inRange = start || end
      ? entriesAll.filter((entry) => {
          const timestamp = entry.timestamp.getTime();
          const startMs = start ? start.getTime() : -Infinity;
          const endMs = end ? end.getTime() : Infinity;
          return timestamp >= startMs && timestamp <= endMs;
        })
      : entriesAll;
    const total = inRange.length;
    const last = inRange[0]?.timestamp || null;
    const daysSince = last ? Math.max(0, Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))) : null;
    const completeCount = inRange.filter(e => (e.emotions?.length || 0) > 0 && (e.sensoryInputs?.length || 0) > 0).length;
    const completeness = total > 0 ? Math.round((completeCount / total) * 100) : 0;
    const buckets: DataQualityBuckets = { morning: 0, afternoon: 0, evening: 0 };
    let totalIntensity = 0;
    let intensityCount = 0;
    for (const e of inRange) {
      const h = e.timestamp.getHours();
      if (h < 12) buckets.morning++;
      else if (h < 16) buckets.afternoon++;
      else buckets.evening++;
      
      // Calculate average intensity from emotions
      if (e.emotions?.length) {
        for (const emotion of e.emotions) {
          if (typeof emotion.intensity === 'number') {
            totalIntensity += emotion.intensity;
            intensityCount++;
          }
        }
      }
    }
    const counts = Object.values(buckets);
    const max = counts.length ? Math.max(...counts) : 0;
    const min = counts.length ? Math.min(...counts) : 0;
    const balance = max > 0 ? Math.round((min / max) * 100) : 0;
    const avgIntensity = intensityCount > 0 ? totalIntensity / intensityCount : null;
    return { total, last, daysSince, completeness, balance, buckets, avgIntensity };
  } catch {
    return null;
  }
}

export default function KreativiumAI(): JSX.Element {
  const { tAnalytics } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [preset, setPreset] = useState<Preset>('30d');
  const [isTesting, setIsTesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBaseline, setIsAnalyzingBaseline] = useState(false);
  const [error, setError] = useState<string>('');
  const [results, setResults] = useState<AnalyticsResultsAI | null>(null);
  const [baselineResults, setBaselineResults] = useState<AnalyticsResultsAI | null>(null);
  // const [lastModelUsed, setLastModelUsed] = useState<string>('');
  const [fromUiCache, setFromUiCache] = useState<boolean>(false);
  const resultsCacheRef = useRef<Map<string, { current: AnalyticsResultsAI, baseline: AnalyticsResultsAI | null }>>(new Map());
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<'previous' | 'lastMonth' | 'lastYear'>('previous');
  const [toolbarLast, setToolbarLast] = useState<{ type: 'copy' | 'pdf' | 'share' | null; at: number | null }>({ type: null, at: null });
  const [iepSafeMode, setIepSafeMode] = useState<boolean>(true);  // Default ON for safety
  const [resolvedSources, setResolvedSources] = useState<Map<string, EvidenceSource>>(new Map());

  // Clear cache when IEP mode changes
  useEffect(() => {
    setResults(null);
    setBaselineResults(null);
    resultsCacheRef.current.clear();
  }, [iepSafeMode]);

  const ai = loadAiConfig();
  const isLocal = (() => {
    const url = ai.baseUrl || '';
    const quick = url.includes('localhost') || url.includes('127.0.0.1');
    if (quick) return true;
    try {
      const u = new URL(url);
      const h = (u.hostname || '').toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1') return true;
      if (/^10\./.test(h)) return true;
      if (/^192\.168\./.test(h)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
      return Boolean(ai.localOnly);
    } catch {
      return Boolean(ai.localOnly) || quick;
    }
  })();

  // Cosmetic model label: always show "Kreativium-AI" as requested
  const displayModelName = 'Kreativium-AI';

  useEffect(() => {
    try {
      const s = dataStorage.getStudents();
      setStudents(s);
      if (s.length && !studentId) setStudentId(s[0].id);
    } catch (e) {
      logger.error('[KreativiumAI] load students failed', e as Error);
      setStudents([]);
    }
  }, []);

  const timeframe = useMemo<ConcreteTimeRange | undefined>(() => computeRange(preset), [preset]);

  const cacheKey = useMemo(() => {
    const rangeKey = formatRangeCacheKey(timeframe);
    const cmp = compareEnabled && timeframe ? `|cmp:${compareMode}` : '';
    return `${studentId || 'none'}|${preset}|${rangeKey}${cmp}|iep:${iepSafeMode ? 'on' : 'off'}`;
  }, [studentId, preset, timeframe, compareEnabled, compareMode, iepSafeMode]);

  // Persist toolbar last action per student+range in session
  useEffect(() => {
    try {
      const key = getToolbarStorageKey(students, studentId, timeframe);
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { type: 'copy' | 'pdf' | 'share' | null; at: number | null };
        if (saved && typeof saved.at === 'number') setToolbarLast(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, timeframe?.start, timeframe?.end]);

  useEffect(() => {
    try {
      const key = getToolbarStorageKey(students, studentId, timeframe);
      sessionStorage.setItem(key, JSON.stringify(toolbarLast));
    } catch {}
  }, [toolbarLast, studentId, timeframe?.start, timeframe?.end, students]);

  const dataQuality = useMemo(() => computeDataQualityMetrics(studentId, timeframe), [studentId, timeframe]);

  const baselineDataQuality = useMemo(() => {
    if (!compareEnabled || !timeframe) return null;
    const baselineRange = toConcreteTimeRange(computeComparisonRange(timeframe, compareMode));
    return computeDataQualityMetrics(studentId, baselineRange);
  }, [studentId, compareEnabled, timeframe, compareMode]);

  const hasSmallBaseline = useMemo(() => {
    if (!baselineDataQuality) return false;
    // Threshold: less than 5 data points for small baseline warning
    const minimumDataPoints = 5;
    return baselineDataQuality.total < minimumDataPoints;
  }, [baselineDataQuality]);

  async function testAI() {
    setIsTesting(true);
    setError('');
    try {
      const resp = await openRouterClient.chat([
        { role: 'system', content: 'Svar kun på norsk. Vær kort.' },
        { role: 'user', content: 'Si kun ordet: pong' },
      ], { modelName: ai.modelName, baseUrl: ai.baseUrl, timeoutMs: 10_000, maxTokens: 8, temperature: 0, localOnly: ai.localOnly ?? false });
      setResults(null);
      // Model name is displayed via displayModelName; keep minimal state
      if (!resp?.content?.toLowerCase().includes('pong')) {
        setError('AI svarte, men ikke som forventet. Sjekk modell og base URL.');
      }
    } catch (e) {
      setError((e as Error)?.message || 'Kunne ikke kontakte AI.');
    } finally {
      setIsTesting(false);
    }
  }

  async function analyze() {
    if (!studentId) {
      setError('Velg en elev først.');
      return;
    }
    setError('');
    setResults(null);
    setBaselineResults(null);
    
    // UI cache first - check before setting loading states
    const uiHit = resultsCacheRef.current.get(cacheKey);
    if (uiHit) {
      setResults(uiHit.current);
      setBaselineResults(uiHit.baseline);
      setFromUiCache(true);
      // try { if ((uiHit.current as any)?.ai?.model) setLastModelUsed((uiHit.current as any).ai.model as string); } catch {}
      return;
    }
    
    setIsAnalyzing(true);
    setIsAnalyzingBaseline(compareEnabled);
    try {
      const engine = new LLMAnalysisEngine();
      // Current analysis
      const currentPromise = engine.analyzeStudent(studentId, timeframe as any, { 
        includeAiMetadata: true,
        aiProfile: iepSafeMode ? 'iep' : 'default'
      });

      // Baseline if enabled and timeframe provided
      let baselinePromise: Promise<AnalyticsResultsAI | null> | null = null;
      if (compareEnabled && timeframe) {
        const baselineRange = computeComparisonRange(timeframe as any, compareMode);
        baselinePromise = engine
          .analyzeStudent(studentId, baselineRange as any, { 
            includeAiMetadata: true,
            aiProfile: iepSafeMode ? 'iep' : 'default'
          })
          .then((b) => {
            // Treat empty baseline as null for UI clarity
            const totalLen = (b?.patterns?.length || 0) + (b?.correlations?.length || 0) + ((b as any)?.insights?.length || 0);
            return totalLen === 0 ? null : b;
          })
          .catch(() => null);
      }

      const [res, base] = await Promise.all([currentPromise, baselinePromise ?? Promise.resolve(null)]);
      setResults(res);
      setBaselineResults(base);
      resultsCacheRef.current.set(cacheKey, { current: res, baseline: base });
      setFromUiCache(false);
      // if ((res as any)?.ai?.model) setLastModelUsed((res as any).ai.model as string);
    } catch (e) {
      setError((e as Error)?.message || 'Analyse feilet.');
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingBaseline(false);
    }
  }

  async function refreshAnalyze() {
    if (!studentId) {
      setError('Velg en elev først.');
      return;
    }
    setIsAnalyzing(true);
    setIsAnalyzingBaseline(compareEnabled);
    setError('');
    try {
      const engine = new LLMAnalysisEngine();
      const currentPromise = engine.analyzeStudent(studentId, timeframe as any, { 
        includeAiMetadata: true, 
        bypassCache: true,
        aiProfile: iepSafeMode ? 'iep' : 'default'
      });

      let baselinePromise: Promise<AnalyticsResultsAI | null> | null = null;
      if (compareEnabled && timeframe) {
        const baselineRange = computeComparisonRange(timeframe as any, compareMode);
        baselinePromise = engine
          .analyzeStudent(studentId, baselineRange as any, { 
            includeAiMetadata: true, 
            bypassCache: true,
            aiProfile: iepSafeMode ? 'iep' : 'default'
          })
          .then((b) => {
            const totalLen = (b?.patterns?.length || 0) + (b?.correlations?.length || 0) + ((b as any)?.insights?.length || 0);
            return totalLen === 0 ? null : b;
          })
          .catch(() => null);
      }

      const [res, base] = await Promise.all([currentPromise, baselinePromise ?? Promise.resolve(null)]);
      setResults(res);
      setBaselineResults(base);
      resultsCacheRef.current.set(cacheKey, { current: res, baseline: base });
      setFromUiCache(false);
      // if ((res as any)?.ai?.model) setLastModelUsed((res as any).ai.model as string);
    } catch (e) {
      setError((e as Error)?.message || 'Analyse feilet.');
    } finally {
      setIsAnalyzing(false);
      setIsAnalyzingBaseline(false);
    }
  }

  // Resolve evidence sources when results change
  useEffect(() => {
    async function resolveInterventionSources() {
      if (!results?.suggestedInterventions?.length) return;
      
      const allSourceIds = new Set<string>();
      for (const intervention of results.suggestedInterventions) {
        if (intervention.sources?.length) {
          for (const id of (intervention.sources || [])) {
            if (typeof id === 'string' && id.trim()) {
              allSourceIds.add(id.trim());
            }
          }
        }
      }
      
      if (allSourceIds.size === 0) return;
      
      try {
        const resolved = await resolveSources(Array.from(allSourceIds));
        const sourceMap = new Map(resolved.map(s => [s.id, s]));
        setResolvedSources(sourceMap);
      } catch (e) {
        logger.error('[KreativiumAI] Failed to resolve sources', e as Error);
      }
    }
    
    resolveInterventionSources();
  }, [results]);

  async function handleCopyReport() {
    try {
      if (!results) return;
      const text = await formatAiReportText(results, { includeMetadata: true });
      await navigator.clipboard.writeText(text);
      try { announceToScreenReader(String(tAnalytics('interface.copyReportAnnounce'))); } catch {}
      setToolbarLast({ type: 'copy', at: Date.now() });
    } catch {}
  }

  async function handleDownloadPDF() {
    try {
      if (!results) return;
      const text = await formatAiReportText(results, { includeMetadata: true });
      const student = students.find(s => s.id === studentId)?.name || 'elev';
      const sanitize = (s: string) => s.replace(/[^\p{L}0-9\s_-]+/gu, '').trim().replace(/\s+/g, '_');
      const studentSafe = sanitize(student);
      const rangeSafe = timeframe ? `${(timeframe.start as Date).toLocaleDateString()}_${(timeframe.end as Date).toLocaleDateString()}`.replace(/\s+/g,'') : 'alle';
      await downloadPdfFromText(text, `kreativium_${studentSafe}_${rangeSafe}.pdf`);
      try { announceToScreenReader(String(tAnalytics('interface.downloadPdfAnnounce'))); } catch {}
      setToolbarLast({ type: 'pdf', at: Date.now() });
    } catch {}
  }

  async function handleShare() {
    try {
      if (!results) return;
      const text = await formatAiReportText(results);
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Kreativium‑AI rapport', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      try { announceToScreenReader(String(tAnalytics('interface.shareAnnounce'))); } catch {}
      setToolbarLast({ type: 'share', at: Date.now() });
    } catch {}
  }

  // Safe truncation for multi-byte characters
  const truncateGrapheme = (str: string, max: number): string => {
    if (!str || str.length <= max) return str;
    
    try {
      // Use Intl.Segmenter if available for proper grapheme cluster handling
      if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const segmenter = new (Intl as any).Segmenter('nb', { granularity: 'grapheme' });
        const segments = Array.from(segmenter.segment(str));
        return segments.slice(0, max).map((s: any) => s.segment).join('');
      }
    } catch {}
    
    // Fallback to Array.from for better multi-byte support than slice
    return Array.from(str).slice(0, max).join('');
  };

  // Component for rendering evidence source chips
  const SourceChip = React.memo(({ sourceId }: { sourceId: string }) => {
    const source = resolvedSources.get(sourceId);
    if (!source) return null;
    
    const truncatedTitle = truncateGrapheme(source.title, 20);
    const needsTitleEllipsis = source.title.length > 20;
    const excerpt = source.shortExcerpt 
      ? truncateGrapheme(source.shortExcerpt, 100) + (source.shortExcerpt.length > 100 ? '...' : '')
      : '';
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background border cursor-pointer hover:bg-accent transition-colors"
            aria-label={`Åpne kilde: ${source.title}`}
          >
            {truncatedTitle}{needsTitleEllipsis && '...'}
          </a>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{source.title}</p>
          {excerpt && <p className="text-xs mt-1">{excerpt}</p>}
          {source.year && <p className="text-xs text-muted-foreground mt-1">År: {source.year}</p>}
        </TooltipContent>
      </Tooltip>
    );
  });

  const studentSelectLabelId = React.useId();
  const studentSelectTriggerId = React.useId();
  const presetSelectLabelId = React.useId();
  const presetSelectTriggerId = React.useId();
  const compareToggleId = React.useId();
  const iepToggleId = React.useId();

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      {/* Aria-live region for screen reader announcements */}
      <div 
        className="sr-only" 
        aria-live="polite"
        aria-atomic="true"
      >
        {isAnalyzing && 'Analyserer...'}
        {isAnalyzingBaseline && 'Analyserer sammenligningsperiode...'}
        {!isAnalyzing && !isAnalyzingBaseline && results && 'Analyse fullført'}
      </div>
      <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Kreativium‑AI</h1>
              <p className="text-sm text-muted-foreground">Lokal LLM for mønstre, korrelasjoner og tiltak</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modell: <code>{displayModelName}</code> {fromUiCache && (<span className="ml-2 inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 border border-muted-foreground/30">• {tAnalytics('interface.fromUiCache')}</span>)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <Badge variant="outline">{(isLocal || (ai as any).localOnly) ? 'Local model' : 'Remote'}</Badge>
            <Badge variant="outline">{displayModelName}</Badge>
            </div>
          </div>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardContent className="p-6 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label
                id={studentSelectLabelId}
                className="block text-sm text-muted-foreground mb-1"
                htmlFor={studentSelectTriggerId}
              >
                Elev
              </label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger
                  id={studentSelectTriggerId}
                  className="w-full"
                  aria-labelledby={studentSelectLabelId}
                >
                  <SelectValue placeholder="Velg elev" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                id={presetSelectLabelId}
                className="block text-sm text-muted-foreground mb-1"
                htmlFor={presetSelectTriggerId}
              >
                Tidsrom
              </label>
              <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
                <SelectTrigger
                  id={presetSelectTriggerId}
                  className="w-full"
                  aria-labelledby={presetSelectLabelId}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Siste 7 dager</SelectItem>
                  <SelectItem value="30d">Siste 30 dager</SelectItem>
                  <SelectItem value="90d">Siste 90 dager</SelectItem>
                  <SelectItem value="all">Hele historikken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground" htmlFor={compareToggleId}>
                  {tAnalytics('interface.comparePeriods')}
                </label>
                <Toggle
                  id={compareToggleId}
                  aria-label={tAnalytics('interface.comparePeriods')}
                  pressed={compareEnabled}
                  onPressedChange={(v) => { setCompareEnabled(Boolean(v)); if (!v) setBaselineResults(null); }}
                  disabled={!studentId || !timeframe}
                  variant="outline"
                  size="sm"
                >
                  {compareEnabled ? 'På' : 'Av'}
                </Toggle>
                <div className="ml-auto min-w-[12rem]">
                  <Select
                    value={compareMode}
                    onValueChange={(v) => setCompareMode(v as any)}
                    disabled={!compareEnabled || !studentId || !timeframe}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder={tAnalytics('interface.comparisonMode')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous">{tAnalytics('interface.previousPeriod')}</SelectItem>
                      <SelectItem value="lastMonth">{tAnalytics('interface.sameLastMonth')}</SelectItem>
                      <SelectItem value="lastYear">{tAnalytics('interface.sameLastYear')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm text-muted-foreground" htmlFor={iepToggleId}>
                  IEP-trygg modus
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle
                        id={iepToggleId}
                        aria-label="IEP-trygg modus"
                        pressed={iepSafeMode}
                        onPressedChange={(v) => {
                          setIepSafeMode(Boolean(v));
                          announceToScreenReader(v ? 'IEP-trygg modus aktivert' : 'IEP-trygg modus deaktivert');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {iepSafeMode ? 'På' : 'Av'}
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>IEP-trygg modus sikrer pedagogiske anbefalinger</p>
                      <p className="text-xs">uten medisinske/kliniske råd</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={testAI} disabled={isTesting} className="w-1/2">
                  <RefreshCw className="h-4 w-4 mr-2" />Test AI
                </Button>
                <Button onClick={analyze} disabled={isAnalyzing || !studentId} className="w-1/2">
                  <Play className="h-4 w-4 mr-2" />Kjør analyse
                </Button>
                <Button onClick={refreshAnalyze} variant="secondary" disabled={isAnalyzing || !studentId} className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />Oppdater (forbi cache)
                </Button>
                {compareEnabled && isAnalyzingBaseline && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Sammenligning...
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Card */}
        {studentId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Datakvalitet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/90">
              {dataQuality ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Datapunkter</div>
                    <div className="font-medium">{dataQuality.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sist registrert</div>
                    <div className="font-medium">{dataQuality.last ? dataQuality.last.toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Dager siden</div>
                    <div className="font-medium">{dataQuality.daysSince ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fullstendighet</div>
                    <div className="font-medium">{dataQuality.completeness}%</div>
                  </div>
                  <div className="sm:col-span-4">
                    <div className="text-xs text-muted-foreground mb-1">Balanse (tid på dagen)</div>
                    <div className="flex items-center gap-2">
                      {(['morning','afternoon','evening'] as const).map((k, i) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{k === 'morning' ? 'morgen' : k === 'afternoon' ? 'etterm.' : 'kveld'}</span>
                          <span className="text-[11px]">{(dataQuality.buckets as any)[k]}</span>
                          {i < 2 && <span className="text-muted-foreground/40">•</span>}
                        </div>
                      ))}
                      <span className="ml-auto text-[11px] text-muted-foreground">score: {dataQuality.balance}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" />Ingen data funnet for valgt periode.</div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-4 text-destructive text-sm">{error}</CardContent>
          </Card>
        )}

        {!results && !error && (isTesting || isAnalyzing) && (
          <div className="grid grid-cols-1 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Export & Share Toolbar */}
            <Card>
              <CardContent className="p-4 flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label={String(tAnalytics('interface.toolbarCopyAria'))} onClick={handleCopyReport}>
                        <ClipboardIcon className="h-4 w-4 mr-2" />{String(tAnalytics('interface.toolbarCopy'))}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{String(tAnalytics('interface.toolbarCopyTooltip'))}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label={String(tAnalytics('interface.toolbarPdfAria'))} onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />{String(tAnalytics('interface.toolbarPdf'))}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{String(tAnalytics('interface.toolbarPdfTooltip'))}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label={String(tAnalytics('interface.toolbarShareAria'))} onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-2" />{String(tAnalytics('interface.toolbarShare'))}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{String(tAnalytics('interface.toolbarShareTooltip'))}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {toolbarLast.at && (
                  <span className="text-[11px] text-muted-foreground ml-1">
                    {String(tAnalytics('interface.lastExportShort'))}: {toolbarLast.type?.toUpperCase()} {new Date(toolbarLast.at).toLocaleTimeString()}
                  </span>
                )}
              </CardContent>
            </Card>
            {compareEnabled && timeframe && (
              <ComparisonSummary
                current={results}
                baseline={baselineResults}
                mode={compareMode}
                currentLabel={`${(timeframe.start as Date).toLocaleDateString()} – ${(timeframe.end as Date).toLocaleDateString()}`}
                baselineLabel={baselineResults ? formatComparisonPeriodLabel(computeComparisonRange(timeframe as any, compareMode), compareMode) : tAnalytics('interface.noDataInComparisonPeriod')}
                studentName={students.find(s => s.id === studentId)?.name || ''}
                currentBalance={dataQuality?.balance}
                baselineBalance={baselineDataQuality?.balance}
                currentAvgIntensity={dataQuality?.avgIntensity}
                baselineAvgIntensity={baselineDataQuality?.avgIntensity}
                hasSmallBaseline={hasSmallBaseline}
              />
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Nøkkelfunn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(results as any)?.keyFindings?.length ? (
                  <ul className="list-disc pl-5 text-sm text-foreground/90">
                    {(results as any).keyFindings.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Ingen nøkkelfunn rapportert.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Mønstre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.patterns?.length ? results.patterns.map((p, idx) => (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.pattern || 'Mønster'}</div>
                      {typeof (p as any).impact === 'string' && (
                        <Badge variant="outline">{String((p as any).impact)}</Badge>
                      )}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  </div>
                )) : <p className="text-sm text-muted-foreground">Ingen mønstre identifisert.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Tiltak og anbefalinger</CardTitle>
              </CardHeader>
              <TooltipProvider>
              <CardContent className="space-y-3">
                {(results as any)?.suggestedInterventions?.length ? (
                  <ul className="space-y-3">
                    {(results as any).suggestedInterventions.map((s: any, i: number) => (
                      <li key={i} className="rounded-md border p-3">
                        <div className="font-medium">{s.title}</div>
                        {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                        {Array.isArray(s.actions) && s.actions.length > 0 && (
                          <ul className="list-disc pl-5 mt-2 text-sm">
                            {s.actions.map((a: string, j: number) => <li key={j}>{a}</li>)}
                          </ul>
                        )}
                        {s.sources?.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground mr-2">Källor:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.sources.map((sourceId: string, idx: number) => (
                                <SourceChip key={idx} sourceId={sourceId} />
                              ))}
                            </div>
                          </div>
                        )}
                        {(s.expectedImpact || s.timeHorizon || s.tier) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.expectedImpact && <Badge variant="outline">{s.expectedImpact}</Badge>}
                            {s.timeHorizon && <Badge variant="outline">{s.timeHorizon}</Badge>}
                            {s.tier && <Badge variant="outline">{s.tier}</Badge>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Ingen anbefalinger rapportert.</p>}
              </CardContent>
              </TooltipProvider>
            </Card>

            {results.ai && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />AI‑metadata • <span className="font-normal text-muted-foreground">{displayModelName}</span>
                    {(((results.ai.usage as any)?.cacheReadTokens ?? 0) > 0 || (Array.isArray(results.ai.caveats) && results.ai.caveats.some(c => /cache/i.test(String(c))))) && (
                      <Badge variant="outline">{tAnalytics('interface.fromCache')}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <div>Modell: {results.ai.model}</div>
                  {results.ai.latencyMs != null && <div>Latens: {Math.round(results.ai.latencyMs)} ms</div>}
                  {results.ai.usage && (
                    <div>Tokens: prompt {results.ai.usage.promptTokens ?? 0} • completion {results.ai.usage.completionTokens ?? 0} • total {results.ai.usage.totalTokens ?? 0}</div>
                  )}
                  {results.ai.usage && (((results.ai.usage as any).cacheReadTokens ?? 0) > 0 || ((results.ai.usage as any).cacheWriteTokens ?? 0) > 0) && (
                    <div>Cache: read {(results.ai.usage as any).cacheReadTokens ?? 0} • write {(results.ai.usage as any).cacheWriteTokens ?? 0}</div>
                  )}
                  {(() => { try { const s = aiMetrics.summary(); const pct = Math.round((s.jsonValidity || 0) * 100); return <div>JSON‑gyldighet (global): {pct}%</div>; } catch { return null; } })()}
                  {Array.isArray(results.ai.caveats) && results.ai.caveats.length > 0 && (
                    <div>Forbehold: {results.ai.caveats.join('; ')}</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
