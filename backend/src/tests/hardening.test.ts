import { GeminiCacheManager } from '../services/gemini.cache';
import { GeminiClient } from '../services/gemini.client';
import { DeterministicRuleEngine } from '../services/deterministic.engine';
import { RagOptimizerService, PineconeMatch } from '../services/rag-optimizer.service';
import { PIPELINE_CONFIG } from '../config/pipeline.config';
import dotenv from 'dotenv';
dotenv.config();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ Pass: ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Hardening Sprint Regression Test Suite...\n');

  // Test 1: Cache Mismatch Validation & Bypass
  console.log('Test 1: Cache Mismatch Validation & Bypass');
  try {
    const planId = 'test-cache-mismatch-' + Date.now();
    const cacheName = 'projects/test-project/locations/us-central1/cachedContents/test-cache-123';
    const originalModel = 'models/gemini-2.5-pro';
    const requestModel = 'models/gemini-2.5-flash';
    const testFileUri = 'https://example.com/test-file';
    
    // Register the cache using our newly added registerCache method
    GeminiClient.registerCache(cacheName, originalModel, testFileUri, undefined);

    // Formulate a payload that references this cache
    const payload = {
      cached_content: cacheName,
      contents: [{
        role: 'user',
        parts: [{ text: 'System Instructions:\nAnalyze drawings\n\nUser Request:\nValidate door width' }]
      }]
    };

    const originalFetch = global.fetch;
    let capturedPayload: any = null;
    
    global.fetch = (async (url: string, options: any) => {
      if (url.includes('generateContent')) {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Test response' }] } }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 }
          })
        } as any;
      }
      return { ok: true } as any;
    }) as any;

    try {
      await GeminiClient.requestWithRetry(requestModel, payload, false, undefined, planId);
      
      assert(capturedPayload !== null, 'Request payload was intercepted');
      assert(!('cached_content' in capturedPayload), 'cached_content was bypassed/deleted from the payload');
      assert(capturedPayload.contents[0].parts.length === 2, 'Payload contents now has 2 parts (rebuilt)');
      assert(capturedPayload.contents[0].parts[0].fileData.fileUri === testFileUri, 'Payload has restored the correct fileUri');
      assert(capturedPayload.contents[0].parts[1].text.includes('Validate door width'), 'Payload preserves the user prompt');
    } finally {
      global.fetch = originalFetch;
    }
  } catch (e: any) {
    console.error('  ✗ Fail in Test 1:', e);
    process.exit(1);
  }

  // Test 2: Deterministic Rule Engine Intercepts Null Inputs
  console.log('\nTest 2: Deterministic Rule Engine Intercepts Null Inputs');
  try {
    const facts: any = {
      stair_width_inches: null,
      occupant_load: 100
    };
    
    const results = DeterministicRuleEngine.evaluateRules(facts);
    const stairResult = results.find(r => r.code === 'BC 1009.3');
    
    assert(stairResult !== undefined, 'Stair width rule was evaluated');
    assert(stairResult?.verdict === 'not_applicable', 'Stair width rule verdict is not_applicable/skipped due to null');
    assert(!!stairResult?.explanation?.includes('Unable to verify. Reason: Dimension not present on drawing.'), 'Stair width explanation correctly specifies dimension not present');
    assert(stairResult?.deduction_percentage === 0, 'Zero deductions are made for missing parameters');
  } catch (e: any) {
    console.error('  ✗ Fail in Test 2:', e);
    process.exit(1);
  }

  // Test 3: RAG Semantic Deduplication (Same-Page)
  console.log('\nTest 3: RAG Semantic Deduplication (Same-Page)');
  try {
    const rawMatches: PineconeMatch[] = [
      {
        id: '1',
        score: 0.9,
        metadata: {
          text: 'This is the first sentence about elevator shafts and fire partitions.',
          source: 'BC Section 707',
          page_number: 10,
          source_hash: 'hash-1'
        }
      },
      {
        id: '2',
        score: 0.85,
        metadata: {
          text: 'This is the first sentence about elevator shafts and fire partitions in detail.',
          source: 'BC Section 707',
          page_number: 10,
          source_hash: 'hash-1'
        }
      },
      {
        id: '3',
        score: 0.8,
        metadata: {
          text: 'Totally unique section about plumbing fixture spacing.',
          source: 'PC Section 403',
          page_number: 12,
          source_hash: 'hash-2'
        }
      }
    ];

    const deduplicated = RagOptimizerService.deduplicateChunks(rawMatches);
    assert(deduplicated.length === 2, 'Deduplicated raw matches to 2 unique chunks (removed duplicate same-page chunk)');
    assert(deduplicated[0].id === '1', 'Kept chunk with higher retrieval score');
    assert(deduplicated[1].id === '3', 'Kept unique plumbing section chunk');
  } catch (e: any) {
    console.error('  ✗ Fail in Test 3:', e);
    process.exit(1);
  }

  console.log('\n🎉 All regression tests passed successfully!');
}

runTests();
