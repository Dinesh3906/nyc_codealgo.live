import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { Logger } from './logger';

const logger = new Logger({ stage: 'routing-service' });

export interface PageRouteResult {
  page_number: number;
  type: string;
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  route: 'flash' | 'pro';
}

export class RoutingService {
  /**
   * Classifies all pages in the document and returns routing decisions.
   */
  static async routeDocument(
    planId: string,
    fileUri: string,
    mimeType: string,
    cacheName?: string,
    inlineData?: string,
    totalPages?: number
  ): Promise<PageRouteResult[]> {
    logger.debug('Starting page classification', { planId, totalPages });

    const systemPrompt = `You are a document classification and routing engine for architectural blueprints and engineering document packages.
Your task is to analyze the attached document and identify the category, complexity, and visual accuracy requirements for EACH page.

Choose page types ONLY from the following list:
- Text
- Tables
- Forms
- Reports
- Contracts
- Certificates
- OCR-heavy scans
- Architectural drawings
- Floor plans
- CAD
- Mechanical diagrams
- Plumbing
- Electrical
- HVAC
- Fire safety
- Structural engineering
- Mixed content

For each page, output:
1. page_number (1-indexed integer)
2. type (one of the categories above)
3. confidence (float between 0.0 and 1.0 indicating your classification confidence)
4. complexity (low, medium, high - based on layout density, symbols, and spatial details)

You MUST respond with a valid JSON array of objects, containing exactly these fields. Do NOT include markdown code fences or any text outside of the JSON.
Example format:
[
  {"page_number": 1, "type": "Text", "confidence": 0.99, "complexity": "low"},
  {"page_number": 2, "type": "Floor plans", "confidence": 0.96, "complexity": "high"}
]`;

    const classifyRange = async (startPage?: number, endPage?: number): Promise<any[]> => {
      const rangeText = (startPage !== undefined && endPage !== undefined)
        ? `from page ${startPage} to ${endPage}`
        : `in the attached document`;
      const userText = `Classify every page ${rangeText} and output a JSON array.`;

      const payload: any = {
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        }
      };

      const useCacheName = !!cacheName && (PIPELINE_CONFIG.models.flash === PIPELINE_CONFIG.models.pro);

      if (useCacheName) {
        payload.cached_content = cacheName;
        payload.contents = [{
          role: 'user',
          parts: [{
            text: `System Instructions:\n${systemPrompt}\n\nUser Request:\n${userText}`
          }]
        }];
      } else if (inlineData) {
        payload.contents = [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: inlineData } },
            { text: userText }
          ]
        }];
      } else {
        payload.contents = [{
          role: 'user',
          parts: [
            { fileData: { fileUri, mimeType } },
            { text: userText }
          ]
        }];
      }

      const requestPayload: any = { ...payload };
      if (!useCacheName) {
        requestPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await GeminiClient.requestWithRetry(
        PIPELINE_CONFIG.models.flash,
        requestPayload,
        false,
        undefined,
        planId
      );

      const rawResponse = response.text;
      const cleanJsonText = rawResponse.trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();
      
      const parsed = JSON.parse(cleanJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Routing response is not a JSON array');
      }
      return parsed;
    };

    let pageClassifications: any[] = [];

    try {
      if (totalPages && totalPages > 10) {
        const chunkSize = 10;
        const chunkPromises: Promise<any[]>[] = [];
        logger.debug('Parallelizing page classification', { planId, chunkSize, totalPages });
        for (let start = 1; start <= totalPages; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, totalPages);
          chunkPromises.push(classifyRange(start, end).catch(err => {
            logger.warn('Page classification chunk failed', { planId, start, end });
            return [];
          }));
        }

        const chunkResults = await Promise.all(chunkPromises);
        pageClassifications = chunkResults.flat();

        // If chunked classification returned empty result, fall back to single document classification.
        if (pageClassifications.length === 0) {
          logger.warn('Chunked page classification returned empty result; falling back', { planId });
          pageClassifications = await classifyRange();
        }
      } else {
        pageClassifications = await classifyRange();
      }
    } catch (err) {
      logger.error('Page classification failed', err, { planId });
      // Fallback: assume 1 page and route to Flash
      return [{
        page_number: 1,
        type: 'Mixed content',
        confidence: 0.5,
        complexity: 'medium',
        route: 'flash'
      }];
    }

    logger.debug('Classified pages', { planId, count: pageClassifications.length });

    // Apply Smart Escalation and cost limits
    const proCandidates: PageRouteResult[] = [];
    const flashRoutes: PageRouteResult[] = [];

    for (const item of pageClassifications) {
      const pageNum = parseInt(item.page_number, 10) || 1;
      const type = String(item.type || 'Mixed content');
      const confidence = parseFloat(item.confidence) || 0.5;
      const complexity = (item.complexity || 'medium') as 'low' | 'medium' | 'high';
      
      const normalizedType = type.toLowerCase().replace(/[\s_-]+/g, '_');
      
      // Check if page type matches Pro escalation list
      const isEscalationType = PIPELINE_CONFIG.supportedProDocTypes.some(
        t => normalizedType.includes(t) || t.includes(normalizedType)
      );

      let route: 'flash' | 'pro' = 'flash';
      if (isEscalationType) {
        // Escalate if confidence is high or complexity warrants detailed Pro visual reasoning
        if (confidence >= PIPELINE_CONFIG.confidenceThreshold || complexity === 'high' || complexity === 'medium') {
          route = 'pro';
        }
      }

      const routeResult: PageRouteResult = {
        page_number: pageNum,
        type,
        confidence,
        complexity,
        route
      };

      if (route === 'pro') {
        proCandidates.push(routeResult);
      } else {
        flashRoutes.push(routeResult);
      }
    }

    // Enforce Pro page limit
    if (proCandidates.length > PIPELINE_CONFIG.proPageLimit) {
      logger.warn('Escalated page count exceeds Pro page limit; demoting excess pages', {
        planId,
        candidateCount: proCandidates.length,
        limit: PIPELINE_CONFIG.proPageLimit,
      });

      // Sort candidate pages: highest complexity first, then highest confidence
      proCandidates.sort((a, b) => {
        const complexityWeight = { high: 3, medium: 2, low: 1 };
        const compDiff = complexityWeight[b.complexity] - complexityWeight[a.complexity];
        if (compDiff !== 0) return compDiff;
        return b.confidence - a.confidence;
      });

      // Keep top N on Pro, demote the rest to Flash
      const activeProPages = proCandidates.slice(0, PIPELINE_CONFIG.proPageLimit);
      const demotedPages = proCandidates.slice(PIPELINE_CONFIG.proPageLimit);

      demotedPages.forEach(p => {
        p.route = 'flash';
        flashRoutes.push(p);
      });

      logger.debug('Finalized Pro routing limit enforcement', {
        planId,
        activeProCount: activeProPages.length,
        demotedCount: demotedPages.length,
      });

      // Combine and return sorted by page number
      return [...activeProPages, ...demotedPages].sort((a, b) => a.page_number - b.page_number);
    }

    const finalRoutes = [...proCandidates, ...flashRoutes].sort((a, b) => a.page_number - b.page_number);
    
    logger.debug('Final page routes generated', { planId, routeCount: finalRoutes.length });

    return finalRoutes;
  }
}
