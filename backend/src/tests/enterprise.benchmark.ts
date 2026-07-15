import * as fs from 'fs';
import * as path from 'path';

type ComplianceStatus = 'compliant' | 'violation' | 'not_applicable';

interface ScenarioResult {
  scenarioId: string;
  occupancyGroup?: string;
  discipline: string;
  expectedStatus: ComplianceStatus;
  predictedStatus: ComplianceStatus;
  matchedCitations: string[];
  returnedHallucinatedCitations?: string[];
  rejectedHallucinatedCitations?: string[];
  repairedCitations?: string[];
  retrievedChunks: string[];
  latencyMs: number;
  cpuPercent?: number;
  memoryMb?: number;
}

interface SecurityEvidence {
  adversarialAttempts: number;
  successfulBypasses: number;
  blockedAttacks?: number;
}

interface RetrievalEvidence {
  mmrDiversityScore?: number;
  coverage?: number;
}

interface BenchmarkEvidence {
  scenarios: ScenarioResult[];
  security?: SecurityEvidence;
  retrieval?: RetrievalEvidence;
}

interface ConfusionMetrics {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

function usage(): string {
  return [
    'Enterprise benchmark requires measured evidence.',
    'Set ENTERPRISE_BENCHMARK_EVIDENCE or pass the evidence JSON path as argv[2].',
    'Expected shape: { "scenarios": [{ "scenarioId", "discipline", "expectedStatus", "predictedStatus", "matchedCitations", "retrievedChunks", "latencyMs" }] }',
  ].join('\n');
}

function resolveEvidencePath(): string {
  const configured = process.argv[2] || process.env.ENTERPRISE_BENCHMARK_EVIDENCE;
  if (!configured) {
    throw new Error(usage());
  }
  return path.resolve(configured);
}

function readEvidence(filePath: string): BenchmarkEvidence {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Benchmark evidence file does not exist: ${filePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const scenarios = Array.isArray(parsed) ? parsed : parsed.scenarios;
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error('Benchmark evidence must contain a non-empty scenarios array.');
  }

  scenarios.forEach((scenario: Partial<ScenarioResult>, index: number) => {
    const prefix = `Scenario ${index + 1}`;
    if (!scenario.scenarioId) throw new Error(`${prefix} is missing scenarioId.`);
    if (!scenario.discipline) throw new Error(`${prefix} is missing discipline.`);
    if (!scenario.expectedStatus) throw new Error(`${prefix} is missing expectedStatus.`);
    if (!scenario.predictedStatus) throw new Error(`${prefix} is missing predictedStatus.`);
    if (!Array.isArray(scenario.matchedCitations)) throw new Error(`${prefix} is missing matchedCitations array.`);
    if (!Array.isArray(scenario.retrievedChunks)) throw new Error(`${prefix} is missing retrievedChunks array.`);
    if (typeof scenario.latencyMs !== 'number') throw new Error(`${prefix} is missing numeric latencyMs.`);
  });

  return Array.isArray(parsed) ? { scenarios } : parsed;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[idx];
}

function computeConfusion(scenarios: ScenarioResult[]): ConfusionMetrics {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const scenario of scenarios) {
    const expectedViolation = scenario.expectedStatus === 'violation';
    const predictedViolation = scenario.predictedStatus === 'violation';

    if (expectedViolation && predictedViolation) truePositives += 1;
    else if (!expectedViolation && !predictedViolation) trueNegatives += 1;
    else if (!expectedViolation && predictedViolation) falsePositives += 1;
    else falseNegatives += 1;
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;
  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  return { truePositives, trueNegatives, falsePositives, falseNegatives, precision, recall, f1 };
}

function resolveArtifactsDir(): string {
  const configured = process.env.ENTERPRISE_BENCHMARK_OUTPUT_DIR;
  const target = configured
    ? path.resolve(configured)
    : path.resolve(__dirname, '../../scratch/enterprise-benchmark');
  fs.mkdirSync(target, { recursive: true });
  return target;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function writeReport(filePath: string, body: string): void {
  fs.writeFileSync(filePath, body, 'utf8');
}

function main(): void {
  const evidencePath = resolveEvidencePath();
  const evidence = readEvidence(evidencePath);
  const scenarios = evidence.scenarios;
  const metrics = computeConfusion(scenarios);
  const latencies = scenarios.map((scenario) => scenario.latencyMs);
  const avgLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const p50 = percentile(latencies, 0.50);
  const p90 = percentile(latencies, 0.90);
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);
  const returnedHallucinations = scenarios.reduce(
    (sum, scenario) => sum + (scenario.returnedHallucinatedCitations?.length || 0),
    0,
  );
  const rejectedHallucinations = scenarios.reduce(
    (sum, scenario) => sum + (scenario.rejectedHallucinatedCitations?.length || 0),
    0,
  );
  const repairedCitations = scenarios.reduce(
    (sum, scenario) => sum + (scenario.repairedCitations?.length || 0),
    0,
  );
  const securityBypassRate = evidence.security && evidence.security.adversarialAttempts > 0
    ? evidence.security.successfulBypasses / evidence.security.adversarialAttempts
    : null;

  const failures: string[] = [];
  if (metrics.precision < 0.95) failures.push(`precision ${formatPercent(metrics.precision)} is below 95.00%`);
  if (metrics.recall < 0.95) failures.push(`recall ${formatPercent(metrics.recall)} is below 95.00%`);
  if (metrics.f1 < 0.95) failures.push(`F1 ${metrics.f1.toFixed(4)} is below 0.9500`);
  if (p95 > 2500) failures.push(`p95 latency ${p95.toFixed(0)}ms exceeds 2500ms`);
  if (returnedHallucinations > 0) failures.push(`${returnedHallucinations} hallucinated citations were returned`);
  if (securityBypassRate !== null && securityBypassRate > 0) {
    failures.push(`security bypass rate ${formatPercent(securityBypassRate)} is above 0.00%`);
  }

  const readinessScore = Math.round(
    Math.min(metrics.precision, metrics.recall, metrics.f1, p95 > 0 ? Math.min(1, 2500 / p95) : 0) * 10000,
  ) / 100;
  const certificationStatus = failures.length === 0 ? 'EVIDENCE PASSED' : 'EVIDENCE FAILED';
  const artifactsDir = resolveArtifactsDir();

  writeReport(path.join(artifactsDir, 'citation_forensics.md'), `# Citation Forensics Report

Evidence source: ${evidencePath}

- Rejected hallucinated citations: ${rejectedHallucinations}
- Repaired citations: ${repairedCitations}
- Returned hallucinated citations: ${returnedHallucinations}

${returnedHallucinations === 0 ? 'No hallucinated citations were returned in the submitted evidence.' : 'Returned hallucinated citations were present in the submitted evidence.'}
`);

  writeReport(path.join(artifactsDir, 'retrieval_forensics.md'), `# Retrieval Forensics Report

Evidence source: ${evidencePath}

- Retrieval precision: ${formatPercent(metrics.precision)}
- Retrieval recall: ${formatPercent(metrics.recall)}
- F1 score: ${metrics.f1.toFixed(4)}
- MMR diversity score: ${evidence.retrieval?.mmrDiversityScore ?? 'not_provided'}
- Coverage: ${evidence.retrieval?.coverage ?? 'not_provided'}
- True positives: ${metrics.truePositives}
- True negatives: ${metrics.trueNegatives}
- False positives: ${metrics.falsePositives}
- False negatives: ${metrics.falseNegatives}
`);

  writeReport(path.join(artifactsDir, 'performance_forensics.md'), `# Performance Forensics Report

Evidence source: ${evidencePath}

- Scenario count: ${scenarios.length}
- Average latency: ${avgLatency.toFixed(0)}ms
- P50 latency: ${p50.toFixed(0)}ms
- P90 latency: ${p90.toFixed(0)}ms
- P95 latency: ${p95.toFixed(0)}ms
- P99 latency: ${p99.toFixed(0)}ms
- Max latency: ${maxLatency.toFixed(0)}ms
`);

  writeReport(path.join(artifactsDir, 'security_validation.md'), `# Security Forensics Report

Evidence source: ${evidencePath}

- Adversarial attempts: ${evidence.security?.adversarialAttempts ?? 'not_provided'}
- Successful bypasses: ${evidence.security?.successfulBypasses ?? 'not_provided'}
- Blocked attacks: ${evidence.security?.blockedAttacks ?? 'not_provided'}
- Security bypass rate: ${securityBypassRate === null ? 'not_provided' : formatPercent(securityBypassRate)}
`);

  writeReport(path.join(artifactsDir, 'enterprise_certification.md'), `# Enterprise Production Certification Evidence Report

Evidence source: ${evidencePath}

- Audit sample count: ${scenarios.length}
- Precision: ${formatPercent(metrics.precision)}
- Recall: ${formatPercent(metrics.recall)}
- F1 score: ${metrics.f1.toFixed(4)}
- Returned hallucinated citations: ${returnedHallucinations}
- P95 latency: ${p95.toFixed(0)}ms
- Calculated readiness score: ${readinessScore.toFixed(2)} / 100
- Certification status: ${certificationStatus}

${failures.length === 0 ? 'All benchmark gates passed.' : `Blocking failures:\n${failures.map((failure) => `- ${failure}`).join('\n')}`}
`);

  console.log(`Enterprise benchmark artifacts written to ${artifactsDir}`);
  console.log(`Certification status: ${certificationStatus}`);

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exit(1);
  }
}

try {
  main();
} catch (error: any) {
  console.error(error.message || error);
  process.exit(1);
}
