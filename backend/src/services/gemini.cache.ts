import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { MonitoringService } from './monitoring.service';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { Logger } from './logger';

const logger = new Logger({ stage: 'gemini-cache' });

interface CacheEntry {
  fileUri: string;
  fileResourceName: string;
  cacheName?: string; // projects/.../cachedContents/...
  cacheModel?: string;
  expiresAt: number;  // timestamp in ms
  inlineData?: string;
}

export class GeminiCacheManager {
  // Map planId -> CacheEntry
  private static caches: Map<string, CacheEntry> = new Map();

  /**
   * Helper to retrieve a CacheEntry for runtime cache bypass payload rebuilding.
   */
  static getCacheEntry(planId: string): CacheEntry | undefined {
    return this.caches.get(planId);
  }

  /**
   * Gets an existing valid cache or uploads the file and creates a new cache.
   * Gracefully falls back to non-cached mode if caching fails (e.g. token count too low).
   */
  static async getOrCreateCache(
    planId: string,
    filePath: string,
    mimeType: string
  ): Promise<{ cacheName?: string; cacheModel?: string; fileUri: string; fileResourceName: string; isCached: boolean; inlineData?: string }> {
    
    const now = Date.now();
    const existing = this.caches.get(planId);

    // If cache exists and is still valid
    if (existing && existing.expiresAt > now) {
      MonitoringService.trackCacheEvent(planId, 'hit');
      logger.debug('Cache hit', { planId, isCached: !!existing.cacheName });
      if (existing.cacheName && existing.cacheModel) {
        GeminiClient.registerCache(existing.cacheName, existing.cacheModel, existing.fileUri, existing.inlineData);
      }
      return {
        cacheName: existing.cacheName,
        cacheModel: existing.cacheModel,
        fileUri: existing.fileUri,
        fileResourceName: existing.fileResourceName,
        isCached: !!existing.cacheName,
        inlineData: existing.inlineData
      };
    }

    // Cache miss
    MonitoringService.trackCacheEvent(planId, 'miss');
    logger.debug('Cache miss', { planId });

    // Estimate tokens and bytes to decide if we should cache
    const { tokens, bytes } = await this.estimateTokensAndBytes(filePath);
    const shouldCache = bytes > 2 * 1024 * 1024 || tokens > 2048;

    if (!shouldCache) {
      logger.debug('Skipping context cache for small document', { planId, bytes, tokens });
      const inlineData = fs.readFileSync(filePath).toString('base64');
      const expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
      const entry: CacheEntry = {
        fileUri: "",
        fileResourceName: "",
        cacheName: undefined,
        expiresAt,
        inlineData
      };
      this.caches.set(planId, entry);

      return {
        cacheName: undefined,
        fileUri: "",
        fileResourceName: "",
        isCached: false,
        inlineData
      };
    }

    logger.debug('Context cache required; uploading document to file API', { planId });
    const originalFileStats = fs.statSync(filePath);
    const originalBytes = originalFileStats.size;

    const fileInfo = await GeminiClient.uploadFile(filePath, mimeType, `plan-${planId}`);
    const fileUri = fileInfo.uri;
    const fileResourceName = fileInfo.name;

    // Track upload metrics
    MonitoringService.trackUploadSavings(planId, originalBytes, originalBytes);

    let cacheName: string | undefined;
    let isCached = false;

    // Attempt to create Context Cache
    try {
      const ttlSeconds = PIPELINE_CONFIG.cacheTTLMinutes * 60;
      const model = PIPELINE_CONFIG.models.pro;
      const baseModelName = model.startsWith('models/') ? model : `models/${model}`;
      
      const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
      const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
      const apiKey = apiKeys[0] || ''; // Use first key for cache creation

      logger.debug('Creating context cache', { planId, model: baseModelName, ttlSeconds });

      const cacheUrl = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`;
      const response = await fetch(cacheUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: baseModelName,
          display_name: `cache-plan-${planId}`,
          contents: [
            {
              role: 'user',
              parts: [{
                fileData: {
                  fileUri: fileUri,
                  mimeType: mimeType
                }
              }]
            }
          ],
          ttl: `${ttlSeconds}s`
        })
      });

      if (response.ok) {
        const cacheResult: any = await response.json();
        cacheName = cacheResult.name; // projects/.../locations/.../cachedContents/xxxx
        isCached = true;
        logger.debug('Context cache created', { planId });
        GeminiClient.registerCache(cacheName, baseModelName, fileUri, undefined);
      } else {
        await response.text();
        logger.warn('Failed to create context cache; falling back to inline data', { planId, status: response.status });
        
        // Fall back to inline data on cache creation failure
        const inlineData = fs.readFileSync(filePath).toString('base64');
        const expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
        const entry: CacheEntry = {
          fileUri: "",
          fileResourceName: "",
          cacheName: undefined,
          expiresAt,
          inlineData
        };
        this.caches.set(planId, entry);
        return {
          cacheName: undefined,
          fileUri: "",
          fileResourceName: "",
          isCached: false,
          inlineData
        };
      }
    } catch (e: any) {
      logger.warn('Cache creation exception; falling back to inline data', { planId });
      
      const inlineData = fs.readFileSync(filePath).toString('base64');
      const expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
      const entry: CacheEntry = {
        fileUri: "",
        fileResourceName: "",
        cacheName: undefined,
        expiresAt,
        inlineData
      };
      this.caches.set(planId, entry);
      return {
        cacheName: undefined,
        fileUri: "",
        fileResourceName: "",
        isCached: false,
        inlineData
      };
    }

    const baseModelName = PIPELINE_CONFIG.models.pro.startsWith('models/') 
      ? PIPELINE_CONFIG.models.pro 
      : `models/${PIPELINE_CONFIG.models.pro}`;

    const expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
    const entry: CacheEntry = {
      fileUri,
      fileResourceName,
      cacheName,
      cacheModel: baseModelName,
      expiresAt
    };

    this.caches.set(planId, entry);

    return {
      cacheName,
      cacheModel: baseModelName,
      fileUri,
      fileResourceName,
      isCached
    };
  }

  /**
   * Refreshes the TTL of an active cache.
   */
  static async touchCache(planId: string): Promise<boolean> {
    const entry = this.caches.get(planId);
    if (!entry || !entry.cacheName) return false;

    try {
      const now = Date.now();
      const ttlSeconds = PIPELINE_CONFIG.cacheTTLMinutes * 60;
      const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
      const apiKey = rawKeys.split(',').map(k => k.trim()).filter(Boolean)[0] || '';

      const url = `https://generativelanguage.googleapis.com/v1beta/${entry.cacheName}?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ttl: `${ttlSeconds}s`
        })
      });

      if (response.ok) {
        entry.expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
        this.caches.set(planId, entry);
        logger.debug('Cache TTL refreshed', { planId });
        return true;
      }
    } catch (e) {
      logger.warn('Failed to touch cache', { planId });
    }
    return false;
  }

  /**
   * Cleans up the files and cached content associated with a plan.
   */
  static async cleanup(planId: string): Promise<void> {
    const entry = this.caches.get(planId);
    if (!entry) return;

    logger.debug('Cleaning up cache/files', { planId });

    // 1. Delete Cached Content (REST API)
    if (entry.cacheName) {
      try {
        const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKeys.split(',').map(k => k.trim()).filter(Boolean)[0] || '';
        const url = `https://generativelanguage.googleapis.com/v1beta/${entry.cacheName}?key=${apiKey}`;
        await fetch(url, { method: 'DELETE' });
        logger.debug('Deleted context cache', { planId });
      } catch (e) {
        logger.warn('Non-critical error deleting cache', { planId });
      }
    }

    // 2. Delete File from File API
    if (entry.fileResourceName) {
      await GeminiClient.deleteFile(entry.fileResourceName);
    }

    this.caches.delete(planId);
  }

  /**
   * Estimates total token count (text + visual) and measures file size.
   */
  private static async estimateTokensAndBytes(filePath: string): Promise<{ tokens: number; bytes: number }> {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;

    let textTokens = 0;
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text || "";
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      textTokens = Math.round(words * 1.33);
    } catch (e) {
      logger.warn('Failed to parse PDF text for token estimation');
    }

    let visualTokens = 0;
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      // Assume 258 tokens per page for visual layout reasoning fallback
      visualTokens = pageCount * 258;
    } catch (e) {
      logger.warn('Failed to count pages for token estimation');
      const estPages = Math.max(1, Math.round(bytes / 500000));
      visualTokens = estPages * 258;
    }

    const tokens = textTokens + visualTokens;
    return { tokens, bytes };
  }
}
