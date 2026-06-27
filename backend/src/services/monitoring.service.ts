import { PIPELINE_CONFIG, ModelPricing } from '../config/pipeline.config';
import { UsageMetadata } from './gemini.client';

export interface CompiledMetrics {
  flashInputTokens: number;
  flashOutputTokens: number;
  proInputTokens: number;
  proOutputTokens: number;
  cachedTokens: number;
  savedTokens: number; // tokens read from cache (saving standard input token cost)
  uploadReduction: number; // percentage bandwidth saved
  estimatedApiCost: number;
  costPerPage: number;
  costPerAudit: number;
  cacheHits: number;
  cacheMisses: number;
  cacheTTL: string;
}

export class MonitoringService {
  private static planMetricsRegistry: Map<string, {
    flashInputTokens: number;
    flashOutputTokens: number;
    proInputTokens: number;
    proOutputTokens: number;
    cachedTokens: number;
    savedTokens: number;
    cacheHits: number;
    cacheMisses: number;
    uploadBytesSaved: number;
    uploadBytesOriginal: number;
  }> = new Map();

  /**
   * Initializes or returns the metrics container for a plan.
   */
  private static getPlanMetrics(planId: string) {
    if (!this.planMetricsRegistry.has(planId)) {
      this.planMetricsRegistry.set(planId, {
        flashInputTokens: 0,
        flashOutputTokens: 0,
        proInputTokens: 0,
        proOutputTokens: 0,
        cachedTokens: 0,
        savedTokens: 0,
        cacheHits: 0,
        cacheMisses: 0,
        uploadBytesSaved: 0,
        uploadBytesOriginal: 0
      });
    }
    return this.planMetricsRegistry.get(planId)!;
  }

  /**
   * Track usage metadata returned by a Gemini API response.
   */
  static trackUsage(model: string, usage: UsageMetadata, planId?: string) {
    if (!planId) return;

    const metrics = this.getPlanMetrics(planId);
    const isPro = model.includes('pro');

    const promptTokens = usage.promptTokenCount || 0;
    const candidatesTokens = usage.candidatesTokenCount || 0;
    const cachedTokens = usage.cachedContentTokenCount || 0;

    // If cachedContentTokenCount is present, then those tokens were read from cache.
    // The promptTokens value is the total input size, which includes the cached tokens.
    // Therefore, the standard tokens charged are (promptTokens - cachedTokens).
    const nonCachedInputTokens = Math.max(0, promptTokens - cachedTokens);

    if (isPro) {
      metrics.proInputTokens += nonCachedInputTokens;
      metrics.proOutputTokens += candidatesTokens;
      metrics.cachedTokens += cachedTokens;
      metrics.savedTokens += cachedTokens;
    } else {
      metrics.flashInputTokens += nonCachedInputTokens;
      metrics.flashOutputTokens += candidatesTokens;
      metrics.cachedTokens += cachedTokens;
      metrics.savedTokens += cachedTokens;
    }

    console.log(`[Monitoring] Tracked ${isPro ? 'Pro' : 'Flash'} usage for plan ${planId}: ` +
      `Input: ${nonCachedInputTokens}, Output: ${candidatesTokens}, Cached Read: ${cachedTokens}`);
  }

  /**
   * Records a cache hit or miss.
   */
  static trackCacheEvent(planId: string, event: 'hit' | 'miss') {
    const metrics = this.getPlanMetrics(planId);
    if (event === 'hit') {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }
  }

  /**
   * Tracks upload bandwidth savings.
   */
  static trackUploadSavings(planId: string, originalBytes: number, actualBytesUploaded: number) {
    const metrics = this.getPlanMetrics(planId);
    metrics.uploadBytesOriginal += originalBytes;
    metrics.uploadBytesSaved += Math.max(0, originalBytes - actualBytesUploaded);
  }

  /**
   * Compiles and calculates final costs and statistics for a plan.
   */
  static compileMetrics(planId: string, pageCount: number): CompiledMetrics {
    const metrics = this.getPlanMetrics(planId);

    // Cost calculations
    const calculateCost = (input: number, output: number, cached: number, pricing: ModelPricing): number => {
      // Determine pricing tier (contexts above 128k use the higher rate)
      const totalCtx = input + cached;
      const isLarge = totalCtx > 128_000;
      
      const inputRate = isLarge ? pricing.inputTokenRateOver128k : pricing.inputTokenRateUnder128k;
      const cachedInputRate = isLarge ? pricing.cachedInputRateOver128k : pricing.cachedInputRateUnder128k;
      const outputRate = isLarge ? pricing.outputTokenRateOver128k : pricing.outputTokenRateUnder128k;

      return (input * inputRate) + (cached * cachedInputRate) + (output * outputRate);
    };

    const flashCost = calculateCost(
      metrics.flashInputTokens,
      metrics.flashOutputTokens,
      metrics.cachedTokens, // count cached tokens under Flash if they were processed by Flash
      PIPELINE_CONFIG.pricing.flash
    );

    // Note: Pro cached tokens are only tracked if Pro utilizes a cache
    const proCost = calculateCost(
      metrics.proInputTokens,
      metrics.proOutputTokens,
      0, // Pro cached tokens (we upload selected pages directly to Pro without caching them)
      PIPELINE_CONFIG.pricing.pro
    );

    const estimatedApiCost = flashCost + proCost;
    const pages = Math.max(1, pageCount);

    const originalBytes = metrics.uploadBytesOriginal || 1;
    const uploadReduction = Math.round((metrics.uploadBytesSaved / originalBytes) * 10000) / 100; // e.g. 98.25%

    const compiled: CompiledMetrics = {
      flashInputTokens: metrics.flashInputTokens,
      flashOutputTokens: metrics.flashOutputTokens,
      proInputTokens: metrics.proInputTokens,
      proOutputTokens: metrics.proOutputTokens,
      cachedTokens: metrics.cachedTokens,
      savedTokens: metrics.savedTokens,
      uploadReduction: Math.max(0, Math.min(100, uploadReduction)),
      estimatedApiCost: parseFloat(estimatedApiCost.toFixed(6)),
      costPerPage: parseFloat((estimatedApiCost / pages).toFixed(6)),
      costPerAudit: parseFloat(estimatedApiCost.toFixed(6)),
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      cacheTTL: `${PIPELINE_CONFIG.cacheTTLMinutes}m`
    };

    console.log(`[Monitoring] Compiled metrics for plan ${planId}:`, JSON.stringify(compiled, null, 2));

    // Clear registry entry to prevent memory leaks
    this.planMetricsRegistry.delete(planId);

    return compiled;
  }
}
