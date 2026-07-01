import { GeminiClient } from './gemini.client';
import { Logger } from './logger';
import { metrics } from './metrics.service';

const logger = new Logger({ stage: 'provider-service' });

export interface ProviderStats {
  successes: number;
  failures: number;
  quotaExhausted: boolean;
  coolDownUntil: number;
}

export class AiProviderService {
  private static auditStats: Record<string, { successfulCalls: number; failedCalls: number; providersUsed: Set<string>; aiExecuted: boolean }> = {};

  static startAuditTracking(planId: string) {
    this.auditStats[planId] = {
      successfulCalls: 0,
      failedCalls: 0,
      providersUsed: new Set<string>(),
      aiExecuted: false
    };
  }

  static recordSuccessfulCall(planId: string, provider: string) {
    if (!this.auditStats[planId]) this.startAuditTracking(planId);
    this.auditStats[planId].successfulCalls++;
    this.auditStats[planId].providersUsed.add(provider);
    this.auditStats[planId].aiExecuted = true;
  }

  static recordFailedCall(planId: string, provider: string) {
    if (!this.auditStats[planId]) this.startAuditTracking(planId);
    this.auditStats[planId].failedCalls++;
    this.auditStats[planId].providersUsed.add(provider);
  }

  static getAuditTracking(planId: string) {
    const stats = this.auditStats[planId] || {
      successfulCalls: 0,
      failedCalls: 0,
      providersUsed: new Set<string>(),
      aiExecuted: false
    };
    return {
      aiExecuted: stats.aiExecuted,
      providersUsed: Array.from(stats.providersUsed),
      successfulCalls: stats.successfulCalls,
      failedCalls: stats.failedCalls
    };
  }

  static endAuditTracking(planId: string) {
    delete this.auditStats[planId];
  }

  private static providerStats: Record<string, ProviderStats> = {
    gemini: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    openrouter: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    groq: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    openai: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    anthropic: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    vertex: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    azure: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 },
    deepseek: { successes: 0, failures: 0, quotaExhausted: false, coolDownUntil: 0 }
  };

  private static providerPriority = [
    'gemini',
    'openrouter',
    'groq',
    'openai',
    'anthropic',
    'vertex',
    'azure',
    'deepseek'
  ];

  static getStats() {
    const stats: Record<string, any> = {};
    for (const p of Object.keys(this.providerStats)) {
      stats[p] = {
        ...this.providerStats[p],
        coolDownRemainingMs: Math.max(0, this.providerStats[p].coolDownUntil - Date.now()),
        hasKey: this.hasApiKey(p)
      };
    }
    // Sync Gemini status with GeminiClient project status
    stats.gemini.quotaExhausted = GeminiClient.isProjectQuotaExhausted();
    stats.gemini.coolDownUntil = Math.max(stats.gemini.coolDownUntil, Date.now() + GeminiClient.getProjectCoolDownRemainingMs());
    return stats;
  }

  static getPriorityList(): string[] {
    return this.providerPriority;
  }

  static setPriorityList(priority: string[]) {
    this.providerPriority = priority;
  }

  private static hasApiKey(provider: string): boolean {
    switch (provider) {
      case 'gemini':
        const rawKeys = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY || '';
        return rawKeys.trim().length > 0;
      case 'openrouter':
        return !!process.env.OPENROUTER_API_KEY;
      case 'groq':
        return !!process.env.GROQ_API_KEY;
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'azure':
        return !!process.env.AZURE_OPENAI_API_KEY;
      case 'deepseek':
        return !!process.env.DEEPSEEK_API_KEY;
      case 'vertex':
        return !!process.env.VERTEX_API_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      default:
        return false;
    }
  }

  static isCoolingDown(provider: string): boolean {
    if (provider === 'gemini' && GeminiClient.isProjectQuotaExhausted()) {
      return true;
    }
    return Date.now() < this.providerStats[provider].coolDownUntil;
  }

  static coolDown(provider: string, delayMs = 60000) {
    this.providerStats[provider].coolDownUntil = Date.now() + delayMs;
    this.providerStats[provider].quotaExhausted = true;
    logger.warn(`Provider [${provider}] cooled down for ${delayMs}ms due to quota exhaustion.`);
  }

  static resetCoolDowns() {
    for (const p of Object.keys(this.providerStats)) {
      this.providerStats[p].coolDownUntil = 0;
      this.providerStats[p].quotaExhausted = false;
    }
    GeminiClient.resetProjectQuota();
  }

  /**
   * Helper to convert a Gemini-style prompt payload into a simple user text message
   */
  private static extractPromptText(payload: any): { system: string; user: string } {
    let system = '';
    let user = '';

    if (payload.systemInstruction?.parts) {
      system = payload.systemInstruction.parts.map((p: any) => p.text || '').join('\n');
    }
    if (payload.contents) {
      const userParts: string[] = [];
      for (const msg of payload.contents) {
        if (msg.role === 'user' || !msg.role) {
          for (const part of msg.parts) {
            if (part.text) {
              userParts.push(part.text);
            }
          }
        }
      }
      user = userParts.join('\n');
    }

    return { system, user };
  }

  /**
   * Dispatches to a specific AI provider API
   */
  static async executePrompt(
    provider: string,
    model: string,
    payload: any,
    planId?: string,
    discipline?: string
  ): Promise<{ text: string; provider: string; model: string }> {
    logger.info(`Routing prompt to [${provider}] for discipline: ${discipline || 'generic'}`);
    
    // Check cooldown
    if (this.isCoolingDown(provider)) {
      throw new Error(`Provider [${provider}] is in cooldown due to quota exhaustion.`);
    }

    const { system, user } = this.extractPromptText(payload);

    try {
      let responseText = '';
      let actualModel = model;

      switch (provider) {
        case 'gemini': {
          const res = await GeminiClient.requestWithRetry(model, payload, false, undefined, planId, discipline);
          responseText = res.text;
          break;
        }
        case 'openrouter': {
          const key = process.env.OPENROUTER_API_KEY;
          if (!key) throw new Error('OPENROUTER_API_KEY is not set');
          actualModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro';

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: actualModel,
              messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: user }
              ]
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            if (res.status === 429) {
              this.coolDown('openrouter');
            }
            throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
          }

          const data: any = await res.json();
          responseText = data.choices?.[0]?.message?.content || '';
          break;
        }
        case 'groq': {
          const key = process.env.GROQ_API_KEY;
          if (!key) throw new Error('GROQ_API_KEY is not set');
          actualModel = 'llama3-70b-8192';

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: actualModel,
              messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: user }
              ]
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            if (res.status === 429) {
              this.coolDown('groq');
            }
            throw new Error(`Groq API error ${res.status}: ${errText}`);
          }

          const data: any = await res.json();
          responseText = data.choices?.[0]?.message?.content || '';
          break;
        }
        case 'openai': {
          const key = process.env.OPENAI_API_KEY;
          if (!key) {
            throw new Error('OPENAI_API_KEY is not configured');
          }
          actualModel = 'gpt-4o';
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: actualModel,
              messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: user }
              ]
            })
          });
          if (!res.ok) {
            if (res.status === 429) this.coolDown('openai');
            throw new Error(`OpenAI API error ${res.status}`);
          }
          const data: any = await res.json();
          responseText = data.choices?.[0]?.message?.content || '';
          break;
        }
        case 'anthropic': {
          const key = process.env.ANTHROPIC_API_KEY;
          if (!key) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
          }
          actualModel = 'claude-3-5-sonnet-latest';
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: actualModel,
              max_tokens: 4096,
              system: system || undefined,
              messages: [{ role: 'user', content: user }]
            })
          });
          if (!res.ok) {
            if (res.status === 429) this.coolDown('anthropic');
            throw new Error(`Anthropic API error ${res.status}`);
          }
          const data: any = await res.json();
          responseText = data.content?.[0]?.text || '';
          break;
        }
        case 'vertex':
        case 'azure':
        case 'deepseek': {
          const key = process.env[`${provider.toUpperCase()}_API_KEY`];
          if (!key) {
            throw new Error(`${provider.toUpperCase()}_API_KEY is not configured`);
          }
          // Real HTTP integrations for Deepseek or Azure OpenAI if keys are present
          const url = provider === 'deepseek' 
            ? 'https://api.deepseek.com/chat/completions' 
            : `https://${process.env.AZURE_OPENAI_RESOURCE}.openai.azure.com/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-15-preview`;
          
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(provider === 'deepseek' ? { 'Authorization': `Bearer ${key}` } : { 'api-key': key })
            },
            body: JSON.stringify({
              model: provider === 'deepseek' ? 'deepseek-chat' : undefined,
              messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: user }
              ]
            })
          });
          if (!res.ok) {
            if (res.status === 429) this.coolDown(provider);
            throw new Error(`${provider.toUpperCase()} API error ${res.status}`);
          }
          const data: any = await res.json();
          responseText = data.choices?.[0]?.message?.content || '';
          break;
        }
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      this.providerStats[provider].successes++;
      metrics.incrementCounter('nyc_provider_calls_total', { provider, status: 'success' });
      if (planId) {
        this.recordSuccessfulCall(planId, provider);
      }
      return { text: responseText, provider, model: actualModel };
    } catch (err: any) {
      this.providerStats[provider].failures++;
      metrics.incrementCounter('nyc_provider_calls_total', { provider, status: 'failure' });
      if (planId) {
        this.recordFailedCall(planId, provider);
      }

      // Check if error was due to project exhaustion (re-throw to abort early)
      if (err.code === 'PROJECT_EXHAUSTED' || err.message?.includes('PROJECT_EXHAUSTED') || err.message?.includes('project quota')) {
        this.coolDown('gemini', GeminiClient.getProjectCoolDownRemainingMs() || 60000);
      }

      logger.error(`Provider [${provider}] execution failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Loops through prioritized providers to execute a request, bypassing exhausted ones
   */
  static async executePromptWithFailover(
    payload: any,
    planId?: string,
    discipline?: string,
    primaryModel = 'gemini-2.5-pro'
  ): Promise<{ text: string; provider: string; model: string }> {
    let lastError: any = null;

    for (const provider of this.providerPriority) {
      if (!this.hasApiKey(provider)) {
        continue;
      }

      if (this.isCoolingDown(provider)) {
        logger.warn(`Skipping provider [${provider}] due to active quota cooldown.`);
        continue;
      }

      try {
        const result = await this.executePrompt(provider, primaryModel, payload, planId, discipline);
        return result;
      } catch (err: any) {
        lastError = err;
        logger.warn(`Provider [${provider}] failed, attempting next available fallback...`);
        // If it is PROJECT_EXHAUSTED, Gemini is immediately cooled down, and the loop goes to the next provider
      }
    }

    throw new Error(`All configured AI providers failed. Last error: ${lastError?.message || lastError}`);
  }
}
