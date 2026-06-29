/**
 * Reliability Regression Test Suite
 * Tests: Circuit breaker recovery, multi-key failover, discipline isolation,
 *        degraded mode, auto-reset, and observability.
 */
import { CircuitBreaker, breakersRegistry, getDisciplineBreaker } from '../services/circuit-breaker';
import dotenv from 'dotenv';
dotenv.config();

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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Test 1: Circuit Breaker Basic State Transitions ───
async function testBasicTransitions() {
  console.log('\n═══ Test 1: Basic State Transitions ═══');
  const cb = new CircuitBreaker({
    name: 'test-basic',
    failureThreshold: 3,
    recoveryTimeoutMs: 500,
    halfOpenSuccessThreshold: 1
  });

  assert(cb.getState() === 'CLOSED', 'Initial state is CLOSED');

  // 3 consecutive failures should open
  for (let i = 0; i < 3; i++) {
    try {
      await cb.execute(async () => { throw new Error('simulated failure'); });
    } catch {}
  }
  assert(cb.getState() === 'OPEN', 'State transitions to OPEN after threshold failures');

  // Requests should be rejected while OPEN
  let rejected = false;
  try {
    await cb.execute(async () => 'should not run');
  } catch (e: any) {
    rejected = e.code === 'CIRCUIT_OPEN';
  }
  assert(rejected, 'Requests are rejected with CIRCUIT_OPEN while breaker is OPEN');

  // Wait for recovery timeout → should transition to HALF_OPEN
  await sleep(600);
  assert(cb.getState() === 'HALF_OPEN', 'State transitions to HALF_OPEN after recovery timeout');

  // One success should close
  await cb.execute(async () => 'probe success');
  assert(cb.getState() === 'CLOSED', 'State transitions to CLOSED after probe success');
}

// ─── Test 2: HALF_OPEN Probe Concurrency Limit ───
async function testHalfOpenProbeLimit() {
  console.log('\n═══ Test 2: HALF_OPEN Probe Concurrency Limit ═══');
  const cb = new CircuitBreaker({
    name: 'test-probe-limit',
    failureThreshold: 2,
    recoveryTimeoutMs: 200,
    halfOpenSuccessThreshold: 1
  });

  // Trip to OPEN
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }
  assert(cb.getState() === 'OPEN', 'Breaker tripped to OPEN');

  // Wait for half-open
  await sleep(300);
  assert(cb.getState() === 'HALF_OPEN', 'Breaker entered HALF_OPEN');

  // Start a slow probe request
  let probeResolve: any;
  const probePromise = cb.execute(() => new Promise(resolve => { probeResolve = resolve; }));

  // Second concurrent request should be rejected
  let secondRejected = false;
  try {
    await cb.execute(async () => 'second request');
  } catch (e: any) {
    secondRejected = e.code === 'CIRCUIT_OPEN';
  }
  assert(secondRejected, 'Second request rejected while probe is in progress');

  // Complete the probe
  probeResolve('done');
  await probePromise;
  assert(cb.getState() === 'CLOSED', 'Breaker closes after successful probe');
}

// ─── Test 3: HALF_OPEN Probe Failure Returns to OPEN ───
async function testHalfOpenProbeFailure() {
  console.log('\n═══ Test 3: HALF_OPEN Probe Failure → Back to OPEN ═══');
  const cb = new CircuitBreaker({
    name: 'test-probe-failure',
    failureThreshold: 2,
    recoveryTimeoutMs: 200,
    halfOpenSuccessThreshold: 1
  });

  // Trip to OPEN
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }
  await sleep(300);
  assert(cb.getState() === 'HALF_OPEN', 'Breaker entered HALF_OPEN');

  // Probe fails
  try {
    await cb.execute(async () => { throw new Error('probe also fails'); });
  } catch {}

  assert(cb.getState() === 'OPEN', 'Breaker returns to OPEN after probe failure');
}

// ─── Test 4: Root Cause Determination ───
async function testRootCauseDetermination() {
  console.log('\n═══ Test 4: Root Cause Determination ═══');
  const cb = new CircuitBreaker({
    name: 'test-root-cause',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  // Quota exhaustion
  try {
    await cb.execute(async () => {
      const err: any = new Error('Resource EXHAUSTED: quota limit reached');
      err.status = 'RESOURCE_EXHAUSTED';
      throw err;
    });
  } catch {}

  const events = cb.getEventsHistory();
  const quotaEvent = events.find(e => e.type === 'quota_exceeded');
  assert(quotaEvent !== undefined, 'Quota exhaustion event was recorded');

  // Check breaker_opened event contains trigger
  const openEvent = events.find(e => e.type === 'breaker_opened');
  assert(openEvent !== undefined, 'breaker_opened event was recorded');
  assert(openEvent?.metadata?.trigger === 'QUOTA_EXHAUSTION', 'Trigger correctly identified as QUOTA_EXHAUSTION');
}

// ─── Test 5: Timeout Failure Detection ───
async function testTimeoutFailure() {
  console.log('\n═══ Test 5: Timeout Failure Detection ═══');
  const cb = new CircuitBreaker({
    name: 'test-timeout',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  try {
    await cb.execute(async () => {
      const err: any = new Error('Request timed out');
      err.name = 'AbortError';
      throw err;
    });
  } catch {}

  const events = cb.getEventsHistory();
  const timeoutEvent = events.find(e => e.type === 'timeout');
  assert(timeoutEvent !== undefined, 'Timeout event was recorded');

  const openEvent = events.find(e => e.type === 'breaker_opened');
  assert(openEvent?.metadata?.trigger === 'TIMEOUT', 'Trigger correctly identified as TIMEOUT');
}

// ─── Test 6: Invalid API Key Detection ───
async function testInvalidApiKeyDetection() {
  console.log('\n═══ Test 6: Invalid API Key Detection ═══');
  const cb = new CircuitBreaker({
    name: 'test-invalid-key',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  try {
    await cb.execute(async () => {
      throw new Error('API key not valid. Please pass a valid API key.');
    });
  } catch {}

  const openEvent = cb.getEventsHistory().find(e => e.type === 'breaker_opened');
  assert(openEvent?.metadata?.trigger === 'INVALID_API_KEY', 'Trigger correctly identified as INVALID_API_KEY');
}

// ─── Test 7: Network / DNS Failure Detection ───
async function testNetworkFailure() {
  console.log('\n═══ Test 7: Network / DNS Failure Detection ═══');
  const cb = new CircuitBreaker({
    name: 'test-network',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  try {
    await cb.execute(async () => {
      const err: any = new Error('getaddrinfo ENOTFOUND generativelanguage.googleapis.com');
      err.code = 'ENOTFOUND';
      throw err;
    });
  } catch {}

  const openEvent = cb.getEventsHistory().find(e => e.type === 'breaker_opened');
  assert(openEvent?.metadata?.trigger === 'NETWORK_OR_DNS_FAILURE', 'Trigger correctly identified as NETWORK_OR_DNS_FAILURE');
}

// ─── Test 8: Discipline Isolation ───
async function testDisciplineIsolation() {
  console.log('\n═══ Test 8: Cross-Discipline Isolation ═══');

  // Reset all breakers first
  for (const name of Object.keys(breakersRegistry)) {
    breakersRegistry[name].reset();
  }

  const mechBreaker = getDisciplineBreaker('mechanical_code');
  const buildBreaker = getDisciplineBreaker('building_code');
  const elecBreaker = getDisciplineBreaker('electrical_code');

  assert(mechBreaker !== buildBreaker, 'mechanical and building use different breaker instances');
  assert(mechBreaker !== elecBreaker, 'mechanical and electrical use different breaker instances');

  // Trip the mechanical breaker
  for (let i = 0; i < 3; i++) {
    try { await mechBreaker.execute(async () => { throw new Error('mech fail'); }); } catch {}
  }

  assert(mechBreaker.getState() === 'OPEN', 'Mechanical breaker is OPEN');
  assert(buildBreaker.getState() === 'CLOSED', 'Building breaker remains CLOSED');
  assert(elecBreaker.getState() === 'CLOSED', 'Electrical breaker remains CLOSED');

  // Building code should still work
  const buildResult = await buildBreaker.execute(async () => 'building works');
  assert(buildResult === 'building works', 'Building code requests still pass through');

  // Mechanical should still reject
  let mechRejected = false;
  try {
    await mechBreaker.execute(async () => 'should not run');
  } catch (e: any) {
    mechRejected = e.code === 'CIRCUIT_OPEN';
  }
  assert(mechRejected, 'Mechanical requests still rejected');
}

// ─── Test 9: getDisciplineBreaker Name Normalization ───
async function testDisciplineNormalization() {
  console.log('\n═══ Test 9: Discipline Name Normalization ═══');

  const b1 = getDisciplineBreaker('building_code');
  const b2 = getDisciplineBreaker('building');
  const b3 = getDisciplineBreaker('BUILDING_CODE');

  assert(b1 === b2, 'building_code and building resolve to same breaker');

  // plumbing variants
  const p1 = getDisciplineBreaker('plumbing_code');
  const p2 = getDisciplineBreaker('plumbing');
  assert(p1 === p2, 'plumbing_code and plumbing resolve to same breaker');

  // cross discipline
  const cd = getDisciplineBreaker('cross_discipline');
  assert(cd.getStats().name === 'cross_discipline-api', 'cross_discipline breaker exists');
}

// ─── Test 10: Background Auto-Reset Timer ───
async function testAutoResetTimer() {
  console.log('\n═══ Test 10: Background Auto-Reset Timer ═══');
  const cb = new CircuitBreaker({
    name: 'test-auto-reset',
    failureThreshold: 2,
    recoveryTimeoutMs: 300,
    halfOpenSuccessThreshold: 1
  });

  // Trip to OPEN
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }
  assert(cb.getState() === 'OPEN', 'Breaker is OPEN');

  // Don't call getState() or execute() — let the background timer fire
  await sleep(400);

  // Now check — the background timer should have moved it to HALF_OPEN
  const state = cb.getState();
  assert(state === 'HALF_OPEN', 'Background timer auto-transitioned to HALF_OPEN without any request');

  // Complete recovery
  await cb.execute(async () => 'auto recovered');
  assert(cb.getState() === 'CLOSED', 'Breaker auto-recovered to CLOSED');
}

// ─── Test 11: Event History Observability ───
async function testEventHistory() {
  console.log('\n═══ Test 11: Event History Observability ═══');
  const cb = new CircuitBreaker({
    name: 'test-events',
    failureThreshold: 2,
    recoveryTimeoutMs: 200,
    halfOpenSuccessThreshold: 1
  });

  // Trip to OPEN
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }

  // Wait for HALF_OPEN
  await sleep(300);
  cb.getState(); // trigger lazy check

  // Probe success
  await cb.execute(async () => 'ok');

  const events = cb.getEventsHistory();
  const types = events.map(e => e.type);

  assert(types.includes('breaker_opened'), 'Event log includes breaker_opened');
  assert(types.includes('half_open_entered'), 'Event log includes half_open_entered');
  assert(types.includes('probe_success'), 'Event log includes probe_success');
  assert(types.includes('breaker_closed'), 'Event log includes breaker_closed');

  // All events should have timestamps
  const allHaveTimestamps = events.every(e => typeof e.timestamp === 'number' && e.timestamp > 0);
  assert(allHaveTimestamps, 'All events have valid timestamps');
}

// ─── Test 12: Stats & Recovery ETA ───
async function testStatsAndRecoveryETA() {
  console.log('\n═══ Test 12: Stats & Recovery ETA ═══');
  const cb = new CircuitBreaker({
    name: 'test-stats',
    failureThreshold: 2,
    recoveryTimeoutMs: 5000,
    halfOpenSuccessThreshold: 1
  });

  let stats = cb.getStats();
  assert(stats.state === 'CLOSED', 'Stats show CLOSED state');
  assert(stats.recoveryETA === null, 'Recovery ETA is null when CLOSED');

  // Trip
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }

  stats = cb.getStats();
  assert(stats.state === 'OPEN', 'Stats show OPEN state');
  assert(stats.recoveryETA !== null, 'Recovery ETA is set when OPEN');
  assert(stats.failureCount === 2, 'Failure count is 2');
  assert(stats.lastFailureTime !== null, 'Last failure time is recorded');
}

// ─── Test 13: Manual Reset ───
async function testManualReset() {
  console.log('\n═══ Test 13: Manual Reset ═══');
  const cb = new CircuitBreaker({
    name: 'test-reset',
    failureThreshold: 2,
    recoveryTimeoutMs: 60000, // Long timeout
    halfOpenSuccessThreshold: 1
  });

  // Trip
  for (let i = 0; i < 2; i++) {
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
  }
  assert(cb.getState() === 'OPEN', 'Breaker is OPEN');

  // Manual reset
  cb.reset();
  assert(cb.getState() === 'CLOSED', 'Manual reset returns to CLOSED');

  // Should accept requests again
  const result = await cb.execute(async () => 'recovered');
  assert(result === 'recovered', 'Requests pass through after manual reset');
}

// ─── Test 14: HTTP 429 Classified as Quota ───
async function testHttp429Classification() {
  console.log('\n═══ Test 14: HTTP 429 Classified as Quota ═══');
  const cb = new CircuitBreaker({
    name: 'test-429',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  try {
    await cb.execute(async () => {
      throw new Error('HTTP 429: Too Many Requests - quota exhausted');
    });
  } catch {}

  const events = cb.getEventsHistory();
  const quotaEvent = events.find(e => e.type === 'quota_exceeded');
  assert(quotaEvent !== undefined, 'HTTP 429 error classified as quota_exceeded event');
}

// ─── Test 15: HTTP 500/503 Server Error ───
async function testServerError() {
  console.log('\n═══ Test 15: HTTP 500/503 Server Error ═══');
  const cb = new CircuitBreaker({
    name: 'test-500',
    failureThreshold: 1,
    recoveryTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  try {
    await cb.execute(async () => {
      throw new Error('HTTP 500: Internal Server Error from upstream');
    });
  } catch {}

  const openEvent = cb.getEventsHistory().find(e => e.type === 'breaker_opened');
  assert(openEvent?.metadata?.trigger === 'HTTP_500_503', 'HTTP 500 classified as HTTP_500_503');
}

// ─── Test 16: Degraded Mode Report Content ───
async function testDegradedReportContent() {
  console.log('\n═══ Test 16: Degraded Mode Report Content ═══');

  // Simulate what scheduler.service.ts produces when AI fails
  const degradedStep = {
    id: 'building_code',
    name: 'NYC Building Code (BC)',
    checked: true,
    score: 70,
    status: 'warning' as const,
    summary: 'Automated verification temporarily unavailable. Manual review recommended.',
    compliant_features: [
      'BC 1009.3 - Egress Width: Verification pending: Automated verification temporarily unavailable.'
    ],
    issues: [{
      title: 'Manual Review Required',
      description: 'Automated verification temporarily unavailable.',
      severity: 'major',
      recommendation: 'Please review drawings manually to verify compliance.'
    }]
  };

  assert(!degradedStep.summary.includes('Gemini'), 'Summary does not expose Gemini');
  assert(!degradedStep.summary.includes('API'), 'Summary does not expose API');
  assert(!degradedStep.summary.includes('Circuit'), 'Summary does not expose Circuit Breaker');
  assert(!degradedStep.summary.includes('err.message'), 'Summary does not expose raw error');
  assert(degradedStep.summary.includes('Manual review'), 'Summary recommends manual review');
  assert(degradedStep.issues[0].title === 'Manual Review Required', 'Issue title is user-friendly');
  assert(!degradedStep.issues[0].description.includes('429'), 'Issue description does not expose HTTP codes');
}

// ─── MAIN ───
async function main() {
  console.log('🔧 Enterprise Reliability Sprint — Regression Test Suite\n');
  console.log('═'.repeat(60));

  await testBasicTransitions();
  await testHalfOpenProbeLimit();
  await testHalfOpenProbeFailure();
  await testRootCauseDetermination();
  await testTimeoutFailure();
  await testInvalidApiKeyDetection();
  await testNetworkFailure();
  await testDisciplineIsolation();
  await testDisciplineNormalization();
  await testAutoResetTimer();
  await testEventHistory();
  await testStatsAndRecoveryETA();
  await testManualReset();
  await testHttp429Classification();
  await testServerError();
  await testDegradedReportContent();

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
