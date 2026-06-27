import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { RoutingService } from '../services/routing.service';
import { GeminiCacheManager } from '../services/gemini.cache';
import { MonitoringService } from '../services/monitoring.service';
import { PDFSplitter } from '../utils/pdf.splitter';
import fs from 'fs';
import path from 'path';

// Programmatic testing helper assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ Pass: ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Enterprise Pipeline Test Suite...\n');

  // Test 1: Configuration Verification
  console.log('Test 1: Configuration Verification');
  try {
    assert(PIPELINE_CONFIG.confidenceThreshold === 0.75, 'confidenceThreshold defaults to 0.75');
    assert(PIPELINE_CONFIG.proPageLimit === 10, 'proPageLimit defaults to 10');
    assert(PIPELINE_CONFIG.models.flash === 'gemini-2.5-flash', 'Flash model name maps correctly');
    assert(PIPELINE_CONFIG.pricing.flash.inputTokenRateUnder128k === 0.075 / 1000000, 'Flash input token rate calculated correctly');
  } catch (e: any) {
    console.error('  ✗ Fail in Test 1:', e.message);
    process.exit(1);
  }

  // Test 2: Cost Calculation and Monitoring Metrics
  console.log('\nTest 2: Cost Calculation and Monitoring Metrics');
  try {
    const planId = 'test-plan-' + Date.now();
    
    // Simulate some Gemini calls for Flash and Pro
    MonitoringService.trackUsage(
      'gemini-2.5-flash',
      {
        promptTokenCount: 150000,
        candidatesTokenCount: 5000,
        totalTokenCount: 155000,
        cachedContentTokenCount: 120000
      },
      planId
    );

    MonitoringService.trackUsage(
      'gemini-2.5-pro',
      {
        promptTokenCount: 30000,
        candidatesTokenCount: 2000,
        totalTokenCount: 32000,
        cachedContentTokenCount: 0
      },
      planId
    );

    // Track a cache hit and cache miss
    MonitoringService.trackCacheEvent(planId, 'miss');
    MonitoringService.trackCacheEvent(planId, 'hit');
    MonitoringService.trackCacheEvent(planId, 'hit');

    // Track upload savings: original 2MB, actual 2MB uploaded (since it's a miss), plus page splits (total original 4MB, actual 2MB because of caching)
    MonitoringService.trackUploadSavings(planId, 2000000, 2000000); // initial upload
    MonitoringService.trackUploadSavings(planId, 2000000, 0); // cache hit (no re-upload)

    const compiled = MonitoringService.compileMetrics(planId, 10);

    // Assert values
    assert(compiled.flashInputTokens === 30000, 'Flash input tokens excluding cache count is 30,000');
    assert(compiled.cachedTokens === 120000, 'Cached tokens matches 120,000');
    assert(compiled.proInputTokens === 30000, 'Pro input tokens is 30,000');
    assert(compiled.proOutputTokens === 2000, 'Pro output tokens is 2,000');
    assert(compiled.cacheHits === 2, 'Cache hits equals 2');
    assert(compiled.cacheMisses === 1, 'Cache misses equals 1');
    assert(compiled.uploadReduction === 50, 'Upload savings ratio is 50%');

    // Verify estimated cost (Flat pricing check)
    // Flash Cost: (30000 * 0.15/1M) + (120000 * 0.0375/1M) + (5000 * 0.60/1M) = 0.0045 + 0.0045 + 0.003 = $0.012
    // Pro Cost: (30000 * 1.25/1M) + (2000 * 5.00/1M) = 0.0375 + 0.010 = $0.0475
    // Total: 0.012 + 0.0475 = $0.0595
    assert(Math.abs(compiled.estimatedApiCost - 0.0595) < 0.0001, `Estimated API cost (${compiled.estimatedApiCost}) is correct (~$0.0595)`);
  } catch (e: any) {
    console.error('  ✗ Fail in Test 2:', e.message);
    process.exit(1);
  }

  // Test 3: PDF Splitter Directory Check
  console.log('\nTest 3: PDF Splitter Utility Check');
  try {
    // Force loading the PDFSplitter module to execute its static initializer
    const tempDir = (PDFSplitter as any).tempDir || path.resolve('uploads/temp_pages/');
    assert(fs.existsSync(tempDir), 'Temporary pages directory is automatically created');
  } catch (e: any) {
    console.error('  ✗ Fail in Test 3:', e.message);
    process.exit(1);
  }

  console.log('\n🎉 All unit and architectural tests completed successfully!');
}

runTests().catch(err => {
  console.error('Fatal testing exception:', err);
  process.exit(1);
});
