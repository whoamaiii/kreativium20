// Read environment via import.meta.env; avoid hard coupling to env named exports for testability
import { logger } from '@/lib/logger';

export interface AiConfig {
  // Global enable flag for AI analysis features
  enabled: boolean;

  // Model + sampling controls
  modelName: string;
  temperature: number; // [0,2]
  maxTokens: number;   // > 0
  topP: number;        // (0,1]

  // Network + safety
  timeoutMs: number;       // request timeout
  allowedModels: string[]; // whitelist of allowed model IDs
  apiKey?: string;         // provider key (e.g., OpenRouter)
  baseUrl?: string;        // OpenAI-compatible base URL (e.g., OpenRouter or local LM Studio)
  localOnly?: boolean;     // Force local-only usage
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Canonical list of allowed models for validation (independent of runtime fallback behavior)
export const CANONICAL_ALLOWED_MODELS = [
  'gpt-5',
  'gpt-4o-mini',
  'gpt-4o',
  'claude-3.5-sonnet',
  // Vendor-prefixed model IDs used by OpenRouter
  'openai/gpt-5-mini',
  'openai/gpt-4o-mini'
] as const;

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: (() => { try { const v = ((import.meta as any)?.env?.VITE_AI_ANALYSIS_ENABLED ?? '').toString().toLowerCase(); return v === '1' || v === 'true' || v === 'yes'; } catch { return false; } })(),
  modelName: (() => { try { const v = (import.meta as any)?.env?.VITE_AI_MODEL_NAME; return typeof v === 'string' && v.trim().length > 0 ? v : 'gpt-4o-mini'; } catch { return 'gpt-4o-mini'; } })(),
  temperature: (() => { try { const raw = (import.meta as any)?.env?.VITE_AI_TEMPERATURE; const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw); return clamp(Number.isFinite(n) ? n : 0.2, 0, 2); } catch { return 0.2; } })(),
  maxTokens: (() => { try { const raw = (import.meta as any)?.env?.VITE_AI_MAX_TOKENS; const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw); return Number.isFinite(n) && n > 0 ? n : 1024; } catch { return 1024; } })(),
  topP: 1.0,
  timeoutMs: 30_000,
  allowedModels: Array.from(new Set([
    (() => { try { const v = (import.meta as any)?.env?.VITE_AI_MODEL_NAME; return typeof v === 'string' && v.trim().length > 0 ? v : 'gpt-4o-mini'; } catch { return 'gpt-4o-mini'; } })(),
    'gpt-5',
    'gpt-5-mini',
    'gpt-4o-mini',
    'gpt-4o',
    'claude-3.5-sonnet',
    'openai/gpt-5-mini',
  ])),
  apiKey: (() => { try { const v = (import.meta as any)?.env?.VITE_OPENROUTER_API_KEY; return typeof v === 'string' && v.trim().length > 0 ? v : undefined; } catch { return undefined; } })(),
  baseUrl: undefined,
  localOnly: (() => { try { const v = ((import.meta as any)?.env?.VITE_AI_LOCAL_ONLY ?? '').toString().toLowerCase(); return v === '1' || v === 'true' || v === 'yes'; } catch { return false; } })(),
};

/**
 * Load AI configuration using environment defaults with optional runtime overrides.
 * Priority: overrides > env defaults.
 */
export function loadAiConfig(overrides?: Partial<AiConfig>): AiConfig {
  // Re-read live Vite env each call to avoid stale defaults after .env changes/HMR
  const env: Record<string, unknown> = (import.meta as any)?.env ?? {};
  const toBool = (v: unknown) => {
    const s = (v ?? '').toString().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  };
  const enabled = toBool(env.VITE_AI_ANALYSIS_ENABLED);
  const modelName = typeof env.VITE_AI_MODEL_NAME === 'string' && env.VITE_AI_MODEL_NAME.trim().length > 0
    ? (env.VITE_AI_MODEL_NAME as string)
    : DEFAULT_AI_CONFIG.modelName;
  const apiKey = typeof env.VITE_OPENROUTER_API_KEY === 'string' && (env.VITE_OPENROUTER_API_KEY as string).trim().length > 0
    ? (env.VITE_OPENROUTER_API_KEY as string)
    : undefined;
  const baseUrl = typeof env.VITE_AI_BASE_URL === 'string' && (env.VITE_AI_BASE_URL as string).trim().length > 0
    ? (env.VITE_AI_BASE_URL as string)
    : 'https://openrouter.ai/api/v1';
  const localOnly = (() => {
    const v = (env.VITE_AI_LOCAL_ONLY ?? '').toString().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || AI_LOCAL_ONLY;
  })();

  const runtimeBase: AiConfig = {
    ...DEFAULT_AI_CONFIG,
    enabled,
    modelName,
    apiKey,
    baseUrl,
    localOnly,
  };

  const merged: AiConfig = {
    ...runtimeBase,
    ...overrides,
  } as AiConfig;

  // Normalize/guard values
  merged.temperature = clamp(Number(merged.temperature ?? DEFAULT_AI_CONFIG.temperature), 0, 2);
  const maxTok = Number(merged.maxTokens ?? DEFAULT_AI_CONFIG.maxTokens);
  merged.maxTokens = Number.isFinite(maxTok) && maxTok > 0 ? maxTok : DEFAULT_AI_CONFIG.maxTokens;
  const topP = Number(merged.topP ?? DEFAULT_AI_CONFIG.topP);
  merged.topP = Number.isFinite(topP) ? clamp(topP, 0, 1) : DEFAULT_AI_CONFIG.topP;
  merged.timeoutMs = Number.isFinite(Number(merged.timeoutMs)) && Number(merged.timeoutMs) > 0
    ? Number(merged.timeoutMs)
    : DEFAULT_AI_CONFIG.timeoutMs;

  if (!Array.isArray(merged.allowedModels) || merged.allowedModels.length === 0) {
    merged.allowedModels = [...DEFAULT_AI_CONFIG.allowedModels];
  } else {
    // Ensure model names are strings and unique
    merged.allowedModels = Array.from(new Set(
      merged.allowedModels.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    ));
  }

  // If apiKey is an empty string, normalize to undefined for downstream checks
  if (typeof merged.apiKey === 'string' && merged.apiKey.trim() === '') {
    merged.apiKey = undefined;
  }

  if (typeof merged.baseUrl !== 'string' || merged.baseUrl.trim() === '') {
    merged.baseUrl = 'https://openrouter.ai/api/v1';
  }

  // Validate modelName against allowedModels (case-insensitive).
  // Accept vendor-prefixed IDs by stripping known prefixes during comparison.
  try {
    const normalize = (m: string) => m.replace(/^openai\//i, '').toLowerCase();
    const allowedLc = new Set((merged.allowedModels || []).map(m => normalize(m)));
    const modelLc = normalize(merged.modelName || '');
    if (!allowedLc.has(modelLc)) {
      const fallback = merged.allowedModels[0] || 'gpt-5';
      logger.warn('[aiConfig.loadAiConfig] Invalid modelName; falling back', {
        requested: merged.modelName,
        allowed: merged.allowedModels,
        fallback,
      });
      merged.modelName = fallback;
    }
  } catch {
    // Fail-soft: if anything goes wrong, ensure a sensible default
    if (!merged.modelName || typeof merged.modelName !== 'string') {
      merged.modelName = 'gpt-5';
    }
  }

return merged;
}

// --- Startup validation utilities ---
/** Minimum length guard for OpenRouter API keys (basic heuristic). */
export const MIN_OPENROUTER_API_KEY_LENGTH = 20;

/** Retrieve the current list of allowed models using live env. */
export function getAllowedModels(): string[] {
  try {
    return loadAiConfig().allowedModels || DEFAULT_AI_CONFIG.allowedModels;
  } catch {
    return DEFAULT_AI_CONFIG.allowedModels;
  }
}

/** Case-insensitive model name validation against allowed models. */
export function isValidModelName(modelName: string): boolean {
  try {
    const allowed = getAllowedModels().map(m => (m || '').toLowerCase());
    return allowed.includes((modelName || '').toLowerCase());
  } catch {
    return false;
  }
}

/** Return specific errors for model name validation. */
export function getModelValidationErrors(modelName: string): string[] {
  const errs: string[] = [];
  const name = (modelName || '').trim();
  if (name.length === 0) errs.push('AI model name is required');
  if (!isValidModelName(name)) errs.push(`Model "${name}" is not in the allowed models list`);
  return errs;
}

/** Basic API key format validation. */
export function isValidApiKey(apiKey: string | null | undefined): boolean {
  const s = (apiKey || '').trim();
  if (s.length < MIN_OPENROUTER_API_KEY_LENGTH) return false;
  // Heuristic pattern check (non-strict): key should have at least one hyphen or underscore
  if (!/[A-Za-z0-9]([-_][A-Za-z0-9])+/i.test(s)) return false;
  return true;
}

/** Detailed API key validation errors. */
export function getApiKeyValidationErrors(apiKey: string | null | undefined): string[] {
  const errs: string[] = [];
  const s = (apiKey || '').trim();
  if (s.length < MIN_OPENROUTER_API_KEY_LENGTH) errs.push(`API key too short (min ${MIN_OPENROUTER_API_KEY_LENGTH} chars)`);
  if (!/[A-Za-z0-9]([-_][A-Za-z0-9])+/i.test(s)) errs.push('API key format appears invalid');
  return errs;
}
