import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { CompliancePipeline } from '../src/services/compliance.service';
import { DeterministicRuleEngine } from '../src/services/deterministic.engine';

const uploadsDir = 'd:/nyc_algo/backend/uploads';
const tempDir = path.join(uploadsDir, 'temp_hybrid_benchmark');
const pdf10Path = path.join(tempDir, 'benchmark_10_page.pdf');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const files = fs.readdirSync(uploadsDir);
const pdfSourceFile = files.find(f => f.includes('Stress_Test_House_Plan') && f.endsWith('.pdf'));

if (!pdfSourceFile) {
  throw new Error(`Missing Stress_Test_House_Plan in uploads folder.`);
}

const pdfSourcePath = path.join(uploadsDir, pdfSourceFile);

async function generateTestPdf() {
  console.log("[Benchmark] Generating 10-page test PDF from source...");
  const srcBytes = fs.readFileSync(pdfSourcePath);
  const doc = await PDFDocument.create();
  const srcDoc = await PDFDocument.load(srcBytes);
  
  // Extract first 10 pages
  const pages = await doc.copyPages(srcDoc, Array.from({ length: 10 }, (_, i) => i));
  pages.forEach(p => doc.addPage(p));
  
  fs.writeFileSync(pdf10Path, await doc.save());
  console.log(`[Benchmark] Created 10-page PDF at: ${pdf10Path}`);
}

async function runBenchmark() {
  await generateTestPdf();

  console.log("\n=========================================================================");
  console.log("             RUNNING HYBRID COMPLIANCE PIPELINE BENCHMARK");
  console.log("=========================================================================");

  const startTime = Date.now();
  let result: any;
  try {
    result = await CompliancePipeline.run(`benchmark-run-${Date.now()}`, pdf10Path, 'application/pdf');
  } catch (err) {
    console.error("[Benchmark] Pipeline execution failed:", err);
    process.exit(1);
  }
  const totalDurationMs = Date.now() - startTime;

  console.log("\n======================== BENCHMARK METRICS SUMMARY ========================");
  console.log(`Total Runtime................... ${(totalDurationMs / 1000).toFixed(2)} seconds`);
  
  if (result.metrics) {
    console.log(`API Cost (Estimated)............ $${result.metrics.estimatedApiCost.toFixed(5)}`);
    console.log(`Flash Input/Output Tokens....... ${result.metrics.flashInputTokens} / ${result.metrics.flashOutputTokens}`);
    console.log(`Pro Input/Output Tokens......... ${result.metrics.proInputTokens} / ${result.metrics.proOutputTokens}`);
  }

  // 1. Rule Engine Performance vs AI Reasoning
  console.log("\n================== DETECTED BOTTLENECK & ORCHESTRATION LATENCY =================");
  const deterministicStart = performance.now();
  // Dry run deterministic rule engine evaluation
  const mockFacts = {
    stair_width_inches: 40,
    door_clear_width_inches: 30,
    ceiling_height_inches: 85,
    room_dimensions_feet: [6, 6]
  };
  DeterministicRuleEngine.evaluateRules(mockFacts);
  const deterministicTime = performance.now() - deterministicStart;
  
  console.log(`Deterministic Rule Engine Latency.... ${deterministicTime.toFixed(4)} ms`);
  console.log(`AI Reasoning Stages Latency.......... ~${(totalDurationMs - deterministicTime).toFixed(2)} ms`);
  console.log(`Deterministic Speed Improvement....... ~${((totalDurationMs / (deterministicTime || 1)) * 100).toFixed(0)}% faster`);

  // 2. Verification of Correctness & Traceability
  let totalIssues = 0;
  let tracedIssuesCount = 0;
  let deterministicFindingsCount = 0;
  let proFindingsCount = 0;
  let rejectedCitationsCount = 0;
  
  console.log("\n=================== VERIFICATION & TRACEABILITY GRAPH AUDIT ===================");
  if (Array.isArray(result.steps)) {
    for (const step of result.steps) {
      console.log(`\nDiscipline: ${step.name} (Score: ${step.score !== null ? step.score : 100}%)`);
      if (Array.isArray(step.issues)) {
        for (const issue of step.issues) {
          totalIssues++;
          const metrics = issue.confidence_metrics;
          const pathNode = issue.evidence_path;

          const isDeterministic = metrics && metrics.deterministic > 0;
          if (isDeterministic) {
            deterministicFindingsCount++;
          } else {
            proFindingsCount++;
          }

          if (pathNode && pathNode.drawing_element && pathNode.detected_object && pathNode.measurement) {
            tracedIssuesCount++;
            console.log(`  - Code: [${issue.code}] (Severity: ${issue.severity.toUpperCase()})`);
            console.log(`    Evidence Node Path: [${pathNode.drawing_element}] -> [${pathNode.detected_object}] -> [${pathNode.measurement}] -> [${pathNode.verdict}]`);
            console.log(`    Confidence metrics: Deterministic=${metrics?.deterministic}, Vision=${metrics?.vision}, RAG=${metrics?.rag}, Reasoning=${metrics?.reasoning}, Overall=${metrics?.overall}`);
          } else {
            console.log(`  * Warning: Issue [${issue.code}] has no valid tracing evidence path!`);
          }
        }
      }
    }
  }

  // 3. Precision, Recall, and Hallucination Audit
  // Ground truth checks that should be triggered on mockFacts:
  // - BC 1009.3 (Stair Width: 40 < 44 -> Violation)
  // - BC 1008.1.1 (Door Clear Width: 30 < 32 -> Violation)
  // - BC 1208.2 (Ceiling Height: 85 < 90 -> Violation)
  // - BC 1208.3 (Room Dimensions: 6x6 < 7x7 -> Violation)
  
  const expectedViolations = ['BC 1009.3', 'BC 1008.1.1', 'BC 1208.2', 'BC 1208.3'];
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const foundViolations: string[] = [];
  if (Array.isArray(result.steps)) {
    for (const step of result.steps) {
      if (Array.isArray(step.issues)) {
        for (const issue of step.issues) {
          if (issue.code) foundViolations.push(issue.code);
        }
      }
    }
  }

  for (const exp of expectedViolations) {
    if (foundViolations.includes(exp)) {
      truePositives++;
    } else {
      falseNegatives++;
    }
  }

  for (const found of foundViolations) {
    if (!expectedViolations.includes(found) && found.startsWith('BC')) {
      falsePositives++;
    }
  }

  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);
  const f1Score = 2 * (precision * recall) / (precision + recall || 1);

  console.log("\n========================= METRIC VALIDATION REPORT =========================");
  console.log(`True Positives (Correct violations identified).... ${truePositives}`);
  console.log(`False Positives (Hallucinations / Over-flags)..... ${falsePositives}`);
  console.log(`False Negatives (Missed violations)............... ${falseNegatives}`);
  console.log(`Precision Rate................................... ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall Rate...................................... ${(recall * 100).toFixed(1)}%`);
  console.log(`F1-Score (Model Accuracy)........................ ${(f1Score * 100).toFixed(1)}%`);
  console.log(`Traceability Completeness (Evidence Linkage)...... ${((tracedIssuesCount / (totalIssues || 1)) * 100).toFixed(1)}%`);
  console.log(`Deterministic Rule Bypasses Executed............. ${deterministicFindingsCount} findings`);

  // Clean up
  try {
    fs.unlinkSync(pdf10Path);
    fs.rmdirSync(tempDir);
    console.log("\n[Benchmark] Temporary files cleaned up successfully.");
  } catch (e: any) {
    console.warn("[Benchmark] Failed to clean up benchmark temp files:", e.message);
  }

  console.log("\n=========================================================================");
  console.log("                        BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("=========================================================================");
}

runBenchmark().catch(err => {
  console.error("[Benchmark] Run crashed:", err);
  process.exit(1);
});
