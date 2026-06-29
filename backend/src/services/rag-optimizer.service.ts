/**
 * RagOptimizerService — Enterprise-Grade Compliance Retrieval System
 *
 * Implements:
 * 1. Jaccard Similarity Deduplication
 * 2. Section/Chapter fallback parser (extract from text if missing)
 * 3. BM25-like Keyword Density and Code Reference Reranker
 * 4. Adaptive Retrieval (confidence threshold and token budgeting)
 * 5. Citation Validation (verifying LLM citations against RAG context)
 * 6. Explainable Retrieval Trace Registry
 */

import { Logger } from './logger';

const logger = new Logger({ stage: 'rag-optimizer' });

export interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: {
    text?: string;
    source?: string;
    code_family?: string;
    code_edition?: string;
    chapter?: string;
    section?: string;
    page_number?: number;
    keywords?: string;
    discipline?: string;
    source_hash?: string;
    [key: string]: any;
  };
}

export interface ExplainableAuditTrace {
  stepId: string;
  rawRetrievalCount: number;
  deduplicatedCount: number;
  retrievedChunks: {
    source: string;
    section: string;
    page: number;
    score: number;
    rerankScore: number;
  }[];
  finalValidatedCitations: string[];
  rejectedCitations: string[];
}

export class RagOptimizerService {
  private static traceRegistry = new Map<string, ExplainableAuditTrace[]>();

  /**
   * Resets or registers trace registry for a plan run.
   */
  static startTrace(planId: string) {
    this.traceRegistry.set(planId, []);
  }

  /**
   * Retrieves all trace records for a plan run.
   */
  static getTraces(planId: string): ExplainableAuditTrace[] {
    return this.traceRegistry.get(planId) || [];
  }

  /**
   * Registers a trace for a specific step.
   */
  static registerTrace(planId: string, trace: ExplainableAuditTrace) {
    const traces = this.traceRegistry.get(planId) || [];
    traces.push(trace);
    this.traceRegistry.set(planId, traces);
  }

  /**
   * Helper to parse section/chapter from chunk text when missing.
   */
  static parseFallbackSection(text: string): { chapter?: string; section?: string } {
    // Look for standard code citation patterns (e.g. BC 1009.3, PC 405.3.1, 110.26)
    const sectionMatch = text.match(/\b([A-Z]{2,4}\s+\d+\.\d+(\.\d+)?|\d+\.\d+(\.\d+)?)\b/);
    const chapterMatch = text.match(/Chapter\s+(\d+|[A-Z])/i);

    return {
      section: sectionMatch ? sectionMatch[1] : undefined,
      chapter: chapterMatch ? chapterMatch[1] : undefined
    };
  }

  /**
   * Calculates Jaccard similarity coefficient between two strings.
   */
  static calculateJaccard(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/\W+/).filter(t => t.length > 3));
    const tokens2 = new Set(str2.toLowerCase().split(/\W+/).filter(t => t.length > 3));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Deduplicates retrieved chunks using semantic (Jaccard) and identical-metadata constraints.
   */
  static deduplicateChunks(matches: PineconeMatch[]): PineconeMatch[] {
    const uniqueMatches: PineconeMatch[] = [];

    for (const match of matches) {
      const text = match.metadata?.text || "";
      if (!text || text.trim().length < 20) continue;

      const source = match.metadata?.source || "";
      const page = match.metadata?.page_number || match.metadata?.pages || 0;
      const sourceHash = match.metadata?.source_hash || "";

      // Fallback metadata parsing
      const { section } = this.parseFallbackSection(text);
      const activeSection = match.metadata?.section || section || "";

      let isDuplicate = false;

      for (const existing of uniqueMatches) {
        const extText = existing.metadata?.text || "";
        const extSource = existing.metadata?.source || "";
        const extPage = existing.metadata?.page_number || existing.metadata?.pages || 0;
        const extSourceHash = existing.metadata?.source_hash || "";
        
        const { section: extSec } = this.parseFallbackSection(extText);
        const extActiveSection = existing.metadata?.section || extSec || "";

        // Check 1: Identical section and source
        if (activeSection !== "" && activeSection === extActiveSection && source === extSource) {
          isDuplicate = true;
          break;
        }

        // Check 2: Identical page and source hash
        if (sourceHash !== "" && sourceHash === extSourceHash && page === extPage && page !== 0) {
          isDuplicate = true;
          break;
        }

        // Check 3: Semantic Jaccard overlap (> 75%)
        const jaccard = this.calculateJaccard(text, extText);
        if (jaccard > 0.75) {
          isDuplicate = true;
          break;
        }

        // Check 4: Same-page near-identical chunks (> 50% overlap)
        if (page === extPage && page !== 0 && jaccard > 0.50) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueMatches.push(match);
      }
    }

    return uniqueMatches;
  }

  /**
   * BM25-like Keyword Density and Code Reference Reranker.
   */
  static rerankChunks(
    matches: PineconeMatch[],
    queries: string[],
    stepCodes: { code: string }[]
  ): { match: PineconeMatch; rerankScore: number }[] {
    return matches.map(match => {
      const text = match.metadata?.text || "";
      const score = match.score || 0;
      let boost = 0;

      // Extract search tokens from queries
      const queryTokens = queries.flatMap(q => q.toLowerCase().split(/\W+/).filter(t => t.length > 3));

      // Calculate term frequency boost
      const textLower = text.toLowerCase();
      let matchCount = 0;
      for (const token of queryTokens) {
        if (textLower.includes(token)) {
          matchCount++;
        }
      }
      const tfScore = matchCount / Math.max(1, queryTokens.length);
      boost += tfScore * 0.3; // Up to 0.3 boost for keyword matching

      // Code reference boost: if chunk contains or matches target code sections of interest
      for (const target of stepCodes) {
        const targetClean = target.code.replace(/\s+/g, "").toLowerCase();
        const textClean = text.replace(/\s+/g, "").toLowerCase();
        
        const { section } = this.parseFallbackSection(text);
        const activeSection = (match.metadata?.section || section || "").replace(/\s+/g, "").toLowerCase();

        if (activeSection !== "" && activeSection.includes(targetClean)) {
          boost += 0.5; // Big boost for exact section match
        } else if (textClean.includes(targetClean)) {
          boost += 0.2; // Moderate boost for text containing code reference
        }
      }

      return {
        match,
        rerankScore: score + boost
      };
    }).sort((a, b) => b.rerankScore - a.rerankScore);
  }

  /**
   * Maximal Marginal Relevance (MMR) Reranking.
   * Maximizes relevance while minimizing redundancy by penalizing high similarity with already-selected documents.
   */
  static mmrRerank(
    ranked: { match: PineconeMatch; rerankScore: number }[],
    limit = 15,
    lambda = 0.6
  ): { match: PineconeMatch; rerankScore: number }[] {
    if (ranked.length === 0) return [];
    
    const selected: { match: PineconeMatch; rerankScore: number }[] = [ranked[0]];
    const remaining = ranked.slice(1);
    
    while (selected.length < limit && remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance = candidate.rerankScore;
        
        let maxSimilarity = 0;
        for (const sel of selected) {
          const sim = this.calculateJaccard(
            candidate.match.metadata?.text || "",
            sel.match.metadata?.text || ""
          );
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
          }
        }
        
        const score = lambda * relevance - (1 - lambda) * maxSimilarity;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      
      if (bestIdx !== -1) {
        selected.push(remaining[bestIdx]);
        remaining.splice(bestIdx, 1);
      } else {
        break;
      }
    }
    
    return selected;
  }

  /**
   * Adaptive Retrieval: retrieve chunks until confidence score or token budget is reached.
   */
  static selectAdaptiveContext(
    ranked: { match: PineconeMatch; rerankScore: number }[],
    maxCharLimit = 30000,
    confidenceThreshold = 0.85
  ): { selected: PineconeMatch[]; charCount: number; cumulativeConfidence: number } {
    const selected: PineconeMatch[] = [];
    let charCount = 0;
    let cumulativeConfidence = 0;

    const maxScore = ranked[0]?.rerankScore || 1.0;

    const pageCounts = new Map<number, number>();
    const sectionCounts = new Map<string, number>();
    const firstPassSelectedIndices = new Set<number>();

    // Pass 1: Select diverse chunks (max 2 chunks per page and max 2 chunks per section)
    for (let i = 0; i < ranked.length; i++) {
      const item = ranked[i];
      const text = item.match.metadata?.text || "";
      const textLen = text.length;

      const page = item.match.metadata?.page_number || item.match.metadata?.pages || 0;
      const { section } = this.parseFallbackSection(text);
      const activeSection = item.match.metadata?.section || section || "";

      const pCount = pageCounts.get(page) || 0;
      const sCount = sectionCounts.get(activeSection) || 0;

      if (page !== 0 && pCount >= 2) continue;
      if (activeSection !== "" && sCount >= 2) continue;

      if (charCount + textLen > maxCharLimit) {
        break;
      }

      selected.push(item.match);
      charCount += textLen;
      firstPassSelectedIndices.add(i);

      if (page !== 0) pageCounts.set(page, pCount + 1);
      if (activeSection !== "") sectionCounts.set(activeSection, sCount + 1);

      const confidenceContribution = item.rerankScore / maxScore;
      cumulativeConfidence = Math.min(1.0, cumulativeConfidence + (confidenceContribution * 0.15));

      if (cumulativeConfidence >= confidenceThreshold && selected.length >= 4) {
        break;
      }
    }

    // Pass 2: Fill in remaining budget with remaining top-ranked chunks (ignoring diversity limits)
    if (cumulativeConfidence < confidenceThreshold && charCount < maxCharLimit) {
      for (let i = 0; i < ranked.length; i++) {
        if (firstPassSelectedIndices.has(i)) continue;

        const item = ranked[i];
        const text = item.match.metadata?.text || "";
        const textLen = text.length;

        if (charCount + textLen > maxCharLimit) {
          break;
        }

        selected.push(item.match);
        charCount += textLen;

        const confidenceContribution = item.rerankScore / maxScore;
        cumulativeConfidence = Math.min(1.0, cumulativeConfidence + (confidenceContribution * 0.15));

        if (cumulativeConfidence >= confidenceThreshold && selected.length >= 4) {
          break;
        }
      }
    }

    return {
      selected,
      charCount,
      cumulativeConfidence
    };
  }

  /**
   * Parses and validates citations in Gemini's response against retrieved chunks.
   * If citation does not match any retrieved chunks, flags it as validation failure.
   */
  static validateCitations(
    geminiResponseText: string,
    retrieved: PineconeMatch[]
  ): { validatedResponse: string; validatedCitations: string[]; rejectedCitations: string[] } {
    const validatedCitations: string[] = [];
    const rejectedCitations: string[] = [];

    // Extract all citations from Gemini text (e.g. BC 1009.3, PC 405.3.1, FC 1027.1, 110.26)
    const citationRegex = /\b([A-Z]{2,4}\s+\d+\.\d+(\.\d+)?|\b\d+\.\d+(\.\d+)?)\b/g;
    const citations = Array.from(new Set(geminiResponseText.match(citationRegex) || []));

    // Gather allowed code families, editions, and sections from retrieved chunks
    const allowedFamilies = new Set<string>();
    const allowedEditions = new Set<string>();
    const retrievedSections = new Set<string>();

    for (const match of retrieved) {
      const text = match.metadata?.text || "";
      
      const family = match.metadata?.code_family || "";
      if (family) allowedFamilies.add(family.toLowerCase());

      const edition = match.metadata?.code_edition || "";
      if (edition) allowedEditions.add(edition);

      const { section } = this.parseFallbackSection(text);
      const activeSection = match.metadata?.section || section || "";
      if (activeSection) {
        retrievedSections.add(activeSection.replace(/\s+/g, "").toLowerCase());
      }
      
      // Index section numbers found inside the text of retrieved chunks
      const textCitations = text.match(/\b([A-Z]{2,4}\s+\d+\.\d+(\.\d+)?|\b\d+\.\d+(\.\d+)?)\b/g) || [];
      textCitations.forEach(tc => retrievedSections.add(tc.replace(/\s+/g, "").toLowerCase()));
    }

    let modifiedText = geminiResponseText;

    for (const citation of citations) {
      const normCitation = citation.replace(/\s+/g, "").toLowerCase();
      let isSupported = false;

      // Extract family prefix from citation (e.g. "BC", "PC", "FC")
      const familyPrefixMatch = citation.match(/^([A-Z]{2,4})/i);
      const familyPrefix = familyPrefixMatch ? familyPrefixMatch[1].toLowerCase() : "";

      // Enforce family-specific mapping if family is present in RAG metadata
      if (familyPrefix && allowedFamilies.size > 0) {
        let familyMatches = false;
        for (const fam of allowedFamilies) {
          if (
            (familyPrefix === "bc" && fam.includes("building")) ||
            (familyPrefix === "pc" && fam.includes("plumbing")) ||
            (familyPrefix === "mc" && fam.includes("mechanical")) ||
            (familyPrefix === "fgc" && fam.includes("fuel")) ||
            (familyPrefix === "ec" && fam.includes("electrical")) ||
            (familyPrefix === "fc" && fam.includes("fire")) ||
            (familyPrefix === "zr" && fam.includes("zoning"))
          ) {
            familyMatches = true;
            break;
          }
        }
        if (!familyMatches) {
          rejectedCitations.push(citation);
          const replacement = `${citation} [⚠️ Code Family Mismatch in RAG context]`;
          modifiedText = modifiedText.split(citation).join(replacement);
          continue;
        }
      }

      // Verify if citation exists in the retrieved sections or text
      for (const section of retrievedSections) {
        if (section.includes(normCitation) || normCitation.includes(section)) {
          isSupported = true;
          break;
        }
      }

      if (isSupported) {
        validatedCitations.push(citation);
      } else {
        rejectedCitations.push(citation);
        const replacement = `${citation} [⚠️ Citation Unverified in RAG context]`;
        modifiedText = modifiedText.split(citation).join(replacement);
      }
    }

    if (rejectedCitations.length > 0) {
      logger.warn(`Citation validation: rejected ${rejectedCitations.length} unverified citations`, {
        rejectedCitations
      });
    }

    return {
      validatedResponse: modifiedText,
      validatedCitations,
      rejectedCitations
    };
  }
}
