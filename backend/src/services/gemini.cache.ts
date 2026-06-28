import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { MonitoringService } from './monitoring.service';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface CacheEntry {
  fileUri: string;
  fileResourceName: string;
  cacheName?: string; // projects/.../cachedContents/...
  expiresAt: number;  // timestamp in ms
  inlineData?: string;
}

export class GeminiCacheManager {
  // Map planId -> CacheEntry
  private static caches: Map<string, CacheEntry> = new Map();

  /**
   * Gets an existing valid cache or uploads the file and creates a new cache.
   * Gracefully falls back to non-cached mode if caching fails (e.g. token count too low).
   */
  static async getOrCreateCache(
    planId: string,
    filePath: string,
    mimeType: string
  ): Promise<{ cacheName?: string; fileUri: string; fileResourceName: string; isCached: boolean; inlineData?: string }> {
    
    const now = Date.now();
    const existing = this.caches.get(planId);

    // If cache exists and is still valid
    if (existing && existing.expiresAt > now) {
      MonitoringService.trackCacheEvent(planId, 'hit');
      console.log(`[GeminiCacheManager] Cache hit for plan ${planId}. Cache name: ${existing.cacheName}`);
      return {
        cacheName: existing.cacheName,
        fileUri: existing.fileUri,
        fileResourceName: existing.fileResourceName,
        isCached: !!existing.cacheName,
        inlineData: existing.inlineData
      };
    }

    // Cache miss
    MonitoringService.trackCacheEvent(planId, 'miss');
    console.log(`[GeminiCacheManager] Cache miss for plan ${planId}. Checking if cache is needed...`);

    // Estimate tokens and bytes to decide if we should cache
    const { tokens, bytes } = await this.estimateTokensAndBytes(filePath);
    const shouldCache = bytes > 2 * 1024 * 1024 || tokens > 2048;

    if (!shouldCache) {
      console.log(`[GeminiCacheManager] Skipping Context Cache and File API upload for plan ${planId} (Size: ${(bytes / 1024 / 1024).toFixed(2)}MB, Est. Tokens: ${tokens}). Using direct inline data.`);
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

    console.log(`[GeminiCacheManager] Context Cache is required. Uploading document to File API...`);
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

      console.log(`[GeminiCacheManager] Creating Context Cache for ${fileResourceName} (model: ${baseModelName}, ttl: ${ttlSeconds}s)...`);

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
        console.log(`[GeminiCacheManager] Context Cache created successfully: ${cacheName}`);
      } else {
        const errText = await response.text();
        console.warn(`[GeminiCacheManager] Failed to create Context Cache: ${response.status} ${response.statusText}. ` +
          `Falling back to non-cached direct inline data. Error: ${errText}`);
        
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
      console.warn(`[GeminiCacheManager] Cache creation exception: ${e.message || e}. Falling back to non-cached direct inline data.`);
      
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

    const expiresAt = now + PIPELINE_CONFIG.cacheTTLMinutes * 60 * 1000;
    const entry: CacheEntry = {
      fileUri,
      fileResourceName,
      cacheName,
      expiresAt
    };

    this.caches.set(planId, entry);

    return {
      cacheName,
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
        console.log(`[GeminiCacheManager] Cache TTL refreshed for ${entry.cacheName}`);
        return true;
      }
    } catch (e) {
      console.warn(`[GeminiCacheManager] Failed to touch cache:`, e);
    }
    return false;
  }

  /**
   * Cleans up the files and cached content associated with a plan.
   */
  static async cleanup(planId: string): Promise<void> {
    const entry = this.caches.get(planId);
    if (!entry) return;

    console.log(`[GeminiCacheManager] Cleaning up cache/files for plan ${planId}...`);

    // 1. Delete Cached Content (REST API)
    if (entry.cacheName) {
      try {
        const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKeys.split(',').map(k => k.trim()).filter(Boolean)[0] || '';
        const url = `https://generativelanguage.googleapis.com/v1beta/${entry.cacheName}?key=${apiKey}`;
        await fetch(url, { method: 'DELETE' });
        console.log(`[GeminiCacheManager] Deleted Context Cache: ${entry.cacheName}`);
      } catch (e) {
        console.warn(`[GeminiCacheManager] Non-critical error deleting cache ${entry.cacheName}:`, e);
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
      console.warn("[GeminiCacheManager] Failed to parse PDF text for token estimation:", e);
    }

    let visualTokens = 0;
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      // Assume 258 tokens per page for visual layout reasoning fallback
      visualTokens = pageCount * 258;
    } catch (e) {
      console.warn("[GeminiCacheManager] Failed to count pages for token estimation:", e);
      const estPages = Math.max(1, Math.round(bytes / 500000));
      visualTokens = estPages * 258;
    }

    const tokens = textTokens + visualTokens;
    return { tokens, bytes };
  }
}
