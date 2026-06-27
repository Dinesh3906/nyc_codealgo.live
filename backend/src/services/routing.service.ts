import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';

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
    cacheName?: string
  ): Promise<PageRouteResult[]> {
    console.log(`[RoutingService] Starting classification for plan ${planId}...`);

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

    // Construct the request payload
    const payload: any = {
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    };

    if (cacheName) {
      payload.cached_content = cacheName;
      payload.contents = [{
        role: 'user',
        parts: [{
          text: 'Classify every page in the cached document and output a JSON array.'
        }]
      }];
    } else {
      payload.contents = [{
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: mimeType
            }
          },
          {
            text: 'Classify every page in the attached document and output a JSON array.'
          }
        ]
      }];
    }

    // Call Gemini 2.5 Flash for classification
    let rawResponse = "";
    try {
      const response = await GeminiClient.requestWithRetry(
        PIPELINE_CONFIG.models.flash,
        {
          ...payload,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        },
        false,
        undefined,
        planId
      );
      rawResponse = response.text;
    } catch (err) {
      console.error(`[RoutingService] Page classification failed:`, err);
      // Fallback: assume 1 page and route to Flash
      return [{
        page_number: 1,
        type: 'Mixed content',
        confidence: 0.5,
        complexity: 'medium',
        route: 'flash'
      }];
    }

    // Parse the routing JSON
    let pageClassifications: any[] = [];
    try {
      const cleanJsonText = rawResponse.trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();
      
      pageClassifications = JSON.parse(cleanJsonText);
      if (!Array.isArray(pageClassifications)) {
        throw new Error('Routing response is not a JSON array');
      }
    } catch (parseErr) {
      console.error(`[RoutingService] Failed to parse routing JSON. Raw output: "${rawResponse}"`, parseErr);
      // Fallback: default to Flash for page 1
      return [{
        page_number: 1,
        type: 'Mixed content',
        confidence: 0.5,
        complexity: 'medium',
        route: 'flash'
      }];
    }

    console.log(`[RoutingService] Classified ${pageClassifications.length} pages:`);

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
      console.warn(`[RoutingService] WARNING: Escalated pages count (${proCandidates.length}) ` +
        `exceeds Pro page limit (${PIPELINE_CONFIG.proPageLimit}). Demoting excess pages to Flash.`);

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

      console.log(`[RoutingService] Active Pro pages: ${activeProPages.map(p => p.page_number).join(', ')}`);
      console.log(`[RoutingService] Demoted to Flash: ${demotedPages.map(p => p.page_number).join(', ')}`);

      // Combine and return sorted by page number
      return [...activeProPages, ...demotedPages].sort((a, b) => a.page_number - b.page_number);
    }

    const finalRoutes = [...proCandidates, ...flashRoutes].sort((a, b) => a.page_number - b.page_number);
    
    finalRoutes.forEach(r => {
      console.log(`  Page ${r.page_number}: Type: ${r.type}, Route: ${r.route.toUpperCase()} (Complexity: ${r.complexity})`);
    });

    return finalRoutes;
  }
}
