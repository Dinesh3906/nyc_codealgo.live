import 'dotenv/config';

export interface ModelPricing {
  inputTokenRateUnder128k: number; // per token
  inputTokenRateOver128k: number;  // per token
  cachedInputRateUnder128k: number; // per token
  cachedInputRateOver128k: number;  // per token
  outputTokenRateUnder128k: number; // per token
  outputTokenRateOver128k: number;  // per token
}

export interface PipelineConfig {
  confidenceThreshold: number;
  complexityThreshold: 'low' | 'medium' | 'high';
  proPageLimit: number;
  cacheTTLMinutes: number;
  concurrencyLimit: number;
  geminiConcurrency: number;
  maxRetries: number;
  timeoutMs: number;
  supportedProDocTypes: string[];
  models: {
    flash: string;
    pro: string;
  };
  pricing: {
    flash: ModelPricing;
    pro: ModelPricing;
  };
}

const parsedWorkerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '8', 10);
const validatedWorkerConcurrency = (!isNaN(parsedWorkerConcurrency) && parsedWorkerConcurrency > 0) ? parsedWorkerConcurrency : 8;

const parsedGeminiConcurrency = parseInt(process.env.GEMINI_CONCURRENCY || '5', 10);
const validatedGeminiConcurrency = (!isNaN(parsedGeminiConcurrency) && parsedGeminiConcurrency > 0) ? parsedGeminiConcurrency : 5;

export const PIPELINE_CONFIG: PipelineConfig = {
  confidenceThreshold: parseFloat(process.env.ROUTER_CONFIDENCE_THRESHOLD || '0.75'),
  complexityThreshold: (process.env.ROUTER_COMPLEXITY_THRESHOLD || 'medium') as 'low' | 'medium' | 'high',
  proPageLimit: parseInt(process.env.ROUTER_PRO_PAGE_LIMIT || '10', 10),
  cacheTTLMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '30', 10),
  concurrencyLimit: validatedWorkerConcurrency,
  geminiConcurrency: validatedGeminiConcurrency,
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '5', 10),
  timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '120000', 10),
  
  supportedProDocTypes: (process.env.ROUTER_SUPPORTED_PRO_TYPES || 
    'floor_plan,cad,architectural_drawing,structural_engineering,mechanical_diagram,plumbing,electrical,hvac,fire_safety,blueprint'
  ).split(',').map(s => s.trim().toLowerCase()),

  models: {
    flash: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
    pro: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
  },

  pricing: {
    flash: {
      inputTokenRateUnder128k: 0.075 / 1_000_000,
      inputTokenRateOver128k: 0.15 / 1_000_000,
      cachedInputRateUnder128k: 0.01875 / 1_000_000,
      cachedInputRateOver128k: 0.0375 / 1_000_000,
      outputTokenRateUnder128k: 0.30 / 1_000_000,
      outputTokenRateOver128k: 0.60 / 1_000_000,
    },
    pro: {
      inputTokenRateUnder128k: 1.25 / 1_000_000,
      inputTokenRateOver128k: 2.50 / 1_000_000,
      cachedInputRateUnder128k: 0.3125 / 1_000_000,
      cachedInputRateOver128k: 0.625 / 1_000_000,
      outputTokenRateUnder128k: 5.00 / 1_000_000,
      outputTokenRateOver128k: 10.00 / 1_000_000,
    }
  }
};
