import fs from 'fs';
import path from 'path';
import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { MonitoringService } from './monitoring.service';

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  cachedContentTokenCount?: number;
}

export interface GeminiResponse {
  text: string;
  usageMetadata?: UsageMetadata;
  model: string;
}

export class GeminiClient {
  private static apiKeys: string[] = [];
  private static keyIndex = 0;

  static {
    const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
    this.apiKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
    if (this.apiKeys.length === 0) {
      console.warn('[GeminiClient] WARNING: No Gemini API keys found in environment. Please set GOOGLE_AI_STUDIO_KEY.');
    }
  }

  /**
   * Retrieves the current API key and advances the rotation index.
   */
  private static getApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured. Set GOOGLE_AI_STUDIO_KEY in .env.');
    }
    const key = this.apiKeys[this.keyIndex % this.apiKeys.length];
    this.keyIndex++;
    return key;
  }

  /**
   * Uploads a file using the Google Gemini File API (Resumable Protocol).
   * Polls the file status until the state is ACTIVE.
   */
  static async uploadFile(filePath: string, mimeType: string, displayName: string): Promise<any> {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at: ${resolvedPath}`);
    }

    const fileStats = fs.statSync(resolvedPath);
    const fileSize = fileStats.size;
    const apiKey = this.getApiKey();

    console.log(`[GeminiClient] Initiating upload for ${displayName} (${fileSize} bytes)...`);

    // Step 1: Start Resumable Upload
    const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: displayName }
      })
    });

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      throw new Error(`Failed to initiate Gemini upload: ${initResponse.statusText} (${errText})`);
    }

    const uploadUrl = initResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Gemini File API did not return x-goog-upload-url header.');
    }

    // Step 2: Upload file bytes
    console.log(`[GeminiClient] Transferring bytes for ${displayName}...`);
    const fileStream = fs.readFileSync(resolvedPath);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': fileSize.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: fileStream
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`Failed to upload bytes to Gemini: ${uploadResponse.statusText} (${errText})`);
    }

    const uploadResult: any = await uploadResponse.json();
    const fileInfo = uploadResult.file;
    const fileResourceName = fileInfo.name; // e.g. files/xxxxxx
    console.log(`[GeminiClient] Upload complete. File resource: ${fileResourceName}. Processing status: ${fileInfo.state}`);

    // Step 3: Poll File status until ACTIVE
    let state = fileInfo.state;
    let pollAttempts = 0;
    const maxPollAttempts = 30;

    while (state === 'PROCESSING' && pollAttempts < maxPollAttempts) {
      pollAttempts++;
      console.log(`[GeminiClient] Polling status for ${fileResourceName} (attempt ${pollAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${apiKey}`;
      const pollResponse = await fetch(pollUrl);
      if (pollResponse.ok) {
        const pollResult: any = await pollResponse.json();
        state = pollResult.state;
        if (state === 'ACTIVE') {
          console.log(`[GeminiClient] File ${fileResourceName} is ACTIVE and ready.`);
          return pollResult;
        } else if (state === 'FAILED') {
          throw new Error(`Gemini File processing failed for ${displayName}.`);
        }
      }
    }

    if (state !== 'ACTIVE') {
      throw new Error(`Gemini File processing timed out for ${displayName} (state is ${state}).`);
    }

    return fileInfo;
  }

  /**
   * Deletes a file from Gemini File API.
   */
  static async deleteFile(fileResourceName: string): Promise<boolean> {
    try {
      const apiKey = this.getApiKey();
      const url = `https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${apiKey}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        console.log(`[GeminiClient] Deleted Gemini file: ${fileResourceName}`);
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`[GeminiClient] Non-critical error deleting file ${fileResourceName}:`, e);
      return false;
    }
  }

  /**
   * Executes a Gemini API call with retries and key rotation.
   */
  static async requestWithRetry(
    model: string,
    payload: any,
    stream = false,
    onChunk?: (text: string) => void,
    planId?: string
  ): Promise<GeminiResponse> {
    const maxRetries = PIPELINE_CONFIG.maxRetries;
    let attempt = 0;
    const baseModelName = model.startsWith('models/') ? model : `models/${model}`;

    while (attempt <= maxRetries) {
      attempt++;
      const apiKey = this.getApiKey();
      const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
      const url = `https://generativelanguage.googleapis.com/v1beta/${baseModelName}:${action}&key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PIPELINE_CONFIG.timeoutMs);

      try {
        console.log(`[GeminiClient] Sending request to ${model} (Attempt ${attempt}/${maxRetries + 1})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errText = await response.text();
          console.warn(`[GeminiClient] API Error ${status}: ${errText}`);

          if (status === 429) {
            const delay = 6000 * Math.pow(1.5, attempt) + Math.random() * 2000;
            console.log(`[GeminiClient] Rate limit hit. Backing off for ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (status === 500 || status === 503) {
            const delay = 8000 * attempt + Math.random() * 2000;
            console.log(`[GeminiClient] Server error. Backing off for ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Other client errors, retry with backoff but don't loop forever if key is bad
            const delay = 4000 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          continue;
        }

        if (stream) {
          let accumulatedText = "";
          let lastUsageMetadata: UsageMetadata | undefined;
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body reader not available.');
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6).trim();
                if (!dataStr || dataStr === '[DONE]') continue;

                try {
                  const chunk = JSON.parse(dataStr);
                  const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (text) {
                    accumulatedText += text;
                    if (onChunk) onChunk(text);
                  }
                  if (chunk.usageMetadata) {
                    lastUsageMetadata = chunk.usageMetadata;
                  }
                } catch {
                  // Skip invalid chunks
                }
              }
            }
          }

          // Trigger monitoring tracking
          if (lastUsageMetadata) {
            MonitoringService.trackUsage(model, lastUsageMetadata, planId);
          }

          return {
            text: accumulatedText,
            usageMetadata: lastUsageMetadata,
            model
          };
        } else {
          const result: any = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const usageMetadata: UsageMetadata | undefined = result.usageMetadata;

          if (usageMetadata) {
            MonitoringService.trackUsage(model, usageMetadata, planId);
          }

          return {
            text,
            usageMetadata,
            model
          };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(`[GeminiClient] Request exception (Attempt ${attempt}): ${err.message || err}`);
        const delay = 4000 * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Gemini Client failed after ${maxRetries} retries.`);
  }
}
