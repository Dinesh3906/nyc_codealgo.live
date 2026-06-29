/**
 * Quota and AI Provider Regression Test Suite
 */
import fs from 'fs';
import path from 'path';

// Create dummy PDF to satisfy readFileSync
if (!fs.existsSync('scratch')) {
  fs.mkdirSync('scratch', { recursive: true });
}
fs.writeFileSync('scratch/simulated.pdf', '%PDF-1.4 dummy content');

// Mock pdf-parse module in require cache
const mockPdfParse = async () => ({ text: 'mock text', numpages: 1 });
require.cache[require.resolve('pdf-parse')] = {
  id: require.resolve('pdf-parse'),
  filename: require.resolve('pdf-parse'),
  loaded: true,
  path: '',
  paths: [],
  children: [],
  exports: mockPdfParse
} as any;

// Mock native_rag module in require cache BEFORE requiring scheduler.service
const nativeRag = require('../services/native_rag');
const mockNativeRag = { ...nativeRag };
mockNativeRag.semanticSearchPlan = async () => 'mock filtered text';
require.cache[require.resolve('../services/native_rag')] = {
  id: require.resolve('../services/native_rag'),
  filename: require.resolve('../services/native_rag'),
  loaded: true,
  path: '',
  paths: [],
  children: [],
  exports: mockNativeRag
} as any;

import { GeminiClient } from '../services/gemini.client';
import { AiProviderService } from '../services/provider.service';
import { CompliancePipeline } from '../services/compliance.service';
import { SchedulerService } from '../services/scheduler.service';
import { GeminiCacheManager } from '../services/gemini.cache';
import { RoutingService } from '../services/routing.service';

import dotenv from 'dotenv';
dotenv.config();

GeminiCacheManager.getOrCreateCache = async () => ({
  cacheName: 'mock-cache',
  fileUri: 'mock-uri',
  fileResourceName: 'mock-resource',
  isCached: true
});

RoutingService.routeDocument = async () => [
  { page_number: 1, type: 'architectural_drawing', route: 'pro' }
];

(SchedulerService as any).extractPlanFacts = async () => ({
  facts: { occupant_load: 100 },
  globalFacts: { city: 'New York', state: 'NY', jurisdiction: 'NYC', document_type: 'Construction Documents' },
  visionConfidence: 0.9
});

(SchedulerService as any).runCrossDisciplineValidation = async () => [];

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  } else {
    passed++;
    console.log(`  ✓ Pass: ${message}`);
  }
}

// ─── Test 1: Google Error Parsing (Task 1) ───
async function testErrorParsing() {
  console.log('\n═══ Test 1: Per-Key vs Per-Project Quota Detection ═══');
  
  const projectExhaustedJson = JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          "violations": [
            {
              "description": "GenerateRequestsPerDayPerProjectPerModel exceeded for project 12345"
            }
          ]
        },
        {
          "@type": "type.googleapis.com/google.rpc.RetryInfo",
          "retryDelay": "15s"
        }
      ]
    }
  });

  const parsedProject = GeminiClient.parseGoogleError(projectExhaustedJson);
  assert(parsedProject.isProjectExhausted === true, 'Correctly flags GenerateRequestsPerDayPerProjectPerModel as project exhausted');
  assert(parsedProject.retryDelayMs === 15000, 'Correctly parses 15s retryDelay into 15000ms');

  const perKey429Json = JSON.stringify({
    error: {
      code: 429,
      message: "Resource has been exhausted (e.g. queries per minute).",
      status: "RESOURCE_EXHAUSTED"
    }
  });

  const parsedPerKey = GeminiClient.parseGoogleError(perKey429Json);
  assert(parsedPerKey.isProjectExhausted === false, 'Per-key 429 is NOT flagged as project exhausted');
}

// ─── Test 2: Gemini PROJECT_EXHAUSTED Abort (Task 2) ───
async function testProjectExhaustedAbort() {
  console.log('\n═══ Test 2: Project Exhausted Immediately Aborts Retries ═══');
  
  GeminiClient.resetProjectQuota();
  assert(GeminiClient.isProjectQuotaExhausted() === false, 'Initially project quota is not exhausted');

  const projectExhaustedJson = JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      details: [
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          "violations": [{ description: "GenerateContentInputTokensPerModelPerDay is exhausted" }]
        },
        {
          "@type": "type.googleapis.com/google.rpc.RetryInfo",
          "retryDelay": "4.5s"
        }
      ]
    }
  });

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => projectExhaustedJson
  } as any);

  let errorThrown: any = null;
  try {
    await GeminiClient.requestWithRetry('gemini-2.5-pro', { contents: [{ role: 'user', parts: [{ text: 'test' }] }] });
  } catch (err: any) {
    errorThrown = err;
  }

  global.fetch = originalFetch;

  assert(errorThrown !== null, 'Gemini request fails');
  assert(errorThrown.code === 'PROJECT_EXHAUSTED', 'Error code is PROJECT_EXHAUSTED');
  assert(GeminiClient.isProjectQuotaExhausted() === true, 'Project is marked as exhausted');
  assert(GeminiClient.getProjectCoolDownRemainingMs() > 0, 'Project has cooldown remaining');
}

// ─── Test 3: Provider Failover Switching (Task 4) ───
async function testProviderFailover() {
  console.log('\n═══ Test 3: Provider Failover Switching ═══');
  
  AiProviderService.resetCoolDowns();

  AiProviderService.coolDown('gemini', 5000);
  assert(AiProviderService.isCoolingDown('gemini') === true, 'Gemini is cooled down');

  AiProviderService.setPriorityList(['gemini', 'openai', 'groq']);

  const result = await AiProviderService.executePromptWithFailover(
    { contents: [{ role: 'user', parts: [{ text: 'simulate' }] }] },
    'test-plan',
    'building'
  );

  assert(result.provider === 'openai', 'Automatically failed over to openai');
  assert(result.text.includes('OpenAI Mock Analysis') || result.text.includes('compliant'), 'Returned openai response content');
}

// ─── Test 4: Degradation Mode Scoring Suppression (Task 3 & 6) ───
async function testDegradationScoring() {
  console.log('\n═══ Test 4: Honest Degradation & Score Suppression ═══');

  AiProviderService.resetCoolDowns();
  const list = AiProviderService.getPriorityList();
  for (const p of list) {
    AiProviderService.coolDown(p, 10000);
  }

  const planId = 'test-degraded-plan-id';
  
  const originalQuery = require('../db').default.query;
  const dbQueries: any[] = [];
  require('../db').default.query = async (sql: string, params: any[]) => {
    dbQueries.push({ sql, params });
    if (sql.includes('SELECT status')) {
      return [[{ status: 'queued' }]];
    }
    return [{ affectedRows: 1 }];
  };

  let pipelineResult: any = null;
  try {
    pipelineResult = await CompliancePipeline.run(planId, 'scratch/simulated.pdf', 'application/pdf');
  } catch (err: any) {
    console.error('Error during run:', err);
  }

  require('../db').default.query = originalQuery;
  AiProviderService.resetCoolDowns();

  assert(pipelineResult !== null, 'CompliancePipeline completes successfully in degraded mode');
  assert(pipelineResult.status === 'manual_review', 'Status is set to manual_review');
  assert(pipelineResult.score === null, 'Compliance score is suppressed (null)');
  assert(pipelineResult.compliant === null, 'Overall Pass/Fail status is suppressed (null)');
  assert(pipelineResult.aiVerification === 'Unavailable', 'AI Verification is set to Unavailable');
  assert(pipelineResult.deterministicChecks === 'Completed', 'Deterministic Checks is set to Completed');
  assert(pipelineResult.reason === 'AI quota unavailable during audit.', 'Reason is set to AI quota unavailable during audit.');
  
  const meta = pipelineResult.auditMetadata;
  assert(meta !== undefined, 'Audit metadata is included');
  assert(meta.aiExecuted === false, 'auditMetadata tracks aiExecuted = false');
  assert(meta.successfulLlmCalls === 0, 'successfulLlmCalls is 0');
}

// ─── MAIN RUNNER ───
async function runAll() {
  console.log('🤖 Starting Quota and Failover Regression Tests...');
  console.log('═'.repeat(60));

  await testErrorParsing();
  await testProjectExhaustedAbort();
  await testProviderFailover();
  await testDegradationScoring();

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);

  if (failed > 0) {
    console.log('\n❌ REGRESSION TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL REGRESSION TESTS PASSED');
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
