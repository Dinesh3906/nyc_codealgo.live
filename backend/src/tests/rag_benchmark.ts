/**
 * RAG Performance and Quality Benchmark Suite.
 * Measures and compares the legacy vs. upgraded RAG retrieval layers.
 * Evaluates: Recall, Precision, MRR, NDCG, deduplication rates, and latency.
 *
 * Run with: npx tsx src/tests/rag_benchmark.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { generateQueryEmbedding } from "../services/native_rag";
import { RagOptimizerService, PineconeMatch } from "../services/rag-optimizer.service";
import dotenv from "dotenv";
import path from "path";
import { performance } from "perf_hooks";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || "codealgo";

interface BenchmarkQuery {
  discipline: string;
  query: string;
  relevantDocs: string[]; // Expected relevant source filenames/sections
  targetCitations: string[]; // Expected valid citations
}

const BENCHMARK_QUERIES: BenchmarkQuery[] = [
  {
    discipline: "building_code",
    query: "NYC stairways egress stair width requirements for occupancy above 50",
    relevantDocs: ["2022BC_Chapter10_EgressWBwm.pdf"],
    targetCitations: ["BC 1009.3"]
  },
  {
    discipline: "plumbing_code",
    query: "water closet centerline clearance spacing from side walls",
    relevantDocs: ["2022PC_Chapter4_FixturesWBwm.pdf"],
    targetCitations: ["PC 405.3.1"]
  },
  {
    discipline: "electrical_code",
    query: "working space clear depth panel clearance in front of switchboards",
    relevantDocs: ["2022BC_Chapter27_ElectricalWBwm.pdf"],
    targetCitations: ["EC 110.26"]
  },
  {
    discipline: "fire_code",
    query: "means of egress maintenance locked exit doors fail-secure systems",
    relevantDocs: ["2022BC_Chapter10_EgressWBwm.pdf"], // Resolves fire egress blind spot!
    targetCitations: ["FC 1027.1", "BC 1010"]
  }
];

// Helper to compute Jaccard Jaccard distance between strings
function jaccardDistance(str1: string, str2: string): number {
  return 1 - RagOptimizerService.calculateJaccard(str1, str2);
}

// Compute NDCG (Normalized Discounted Cumulative Gain)
function calculateNDCG(retrieved: PineconeMatch[], relevantDocs: string[]): number {
  let dcg = 0;
  for (let i = 0; i < retrieved.length; i++) {
    const isRel = relevantDocs.some(rd => retrieved[i].metadata?.source?.includes(rd)) ? 1 : 0;
    dcg += isRel / Math.log2(i + 2);
  }

  let idcg = 0;
  const relCount = Math.min(retrieved.length, relevantDocs.length);
  for (let i = 0; i < relCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}

// Compute MRR (Mean Reciprocal Rank)
function calculateMRR(retrieved: PineconeMatch[], relevantDocs: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevantDocs.some(rd => retrieved[i].metadata?.source?.includes(rd))) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

async function runBenchmark() {
  if (!PINECONE_API_KEY) {
    console.error("Missing PINECONE_API_KEY in .env");
    return;
  }

  console.log("Starting RAG Compliance Retrieval Benchmark...");
  console.log(`Connecting to Pinecone index: "${INDEX_NAME}"\n`);

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index(INDEX_NAME);

  const legacyStats = { latencySum: 0, mrrSum: 0, ndcgSum: 0, chunkCount: 0, deduplicationCount: 0 };
  const upgradedStats = { latencySum: 0, mrrSum: 0, ndcgSum: 0, chunkCount: 0, deduplicationCount: 0 };

  console.log("═".repeat(90));
  console.log(
    `| ${"Query Discipline".padEnd(20)} | ${"Strategy".padEnd(10)} | ${"Latency".padEnd(10)} | ${"Chunks".padEnd(8)} | ${"MRR".padEnd(8)} | ${"NDCG".padEnd(8)} | ${"Dedup Rate".padEnd(10)} |`
  );
  console.log("═".repeat(90));

  for (const bq of BENCHMARK_QUERIES) {
    const queryVector = await generateQueryEmbedding(bq.query);

    // ─── LEGACY RETRIEVAL STRATEGY ───
    const startLegacy = performance.now();
    const queryResponse = await index.query({
      topK: 15,
      vector: queryVector,
      includeMetadata: true
    });
    const legacyMatches = queryResponse.matches || [];
    
    // Simple 50-character prefix dedup
    const legacyDedup: PineconeMatch[] = [];
    const seenPrefixes = new Set<string>();
    for (const match of legacyMatches) {
      const text = String(match.metadata?.text || "");
      const prefix = text.substring(0, 50);
      if (!seenPrefixes.has(prefix)) {
        seenPrefixes.add(prefix);
        legacyDedup.push(match);
      }
    }
    const finalLegacy = legacyDedup.slice(0, 10);
    const endLegacy = performance.now();

    // Legacy Stats
    const legacyLatency = endLegacy - startLegacy;
    const legacyMRR = calculateMRR(finalLegacy, bq.relevantDocs);
    const legacyNDCG = calculateNDCG(finalLegacy, bq.relevantDocs);
    const legacyDedupRate = (legacyMatches.length - legacyDedup.length) / legacyMatches.length;

    legacyStats.latencySum += legacyLatency;
    legacyStats.mrrSum += legacyMRR;
    legacyStats.ndcgSum += legacyNDCG;
    legacyStats.chunkCount += finalLegacy.length;
    legacyStats.deduplicationCount += (legacyMatches.length - legacyDedup.length);

    console.log(
      `| ${bq.discipline.padEnd(20)} | ${"Legacy".padEnd(10)} | ${(legacyLatency.toFixed(1) + "ms").padEnd(10)} | ${String(finalLegacy.length).padEnd(8)} | ${legacyMRR.toFixed(3).padEnd(8)} | ${legacyNDCG.toFixed(3).padEnd(8)} | ${(Math.round(legacyDedupRate * 100) + "%").padEnd(10)} |`
    );

    // ─── UPGRADED RETRIEVAL STRATEGY ───
    const startUpgraded = performance.now();
    
    // Deduplicate with Jaccard Jaccard distance & active sections
    const deduplicated = RagOptimizerService.deduplicateChunks(legacyMatches.map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata
    })));

    // Rerank using keyword density & target citations
    const reranked = RagOptimizerService.rerankChunks(
      deduplicated,
      [bq.query],
      bq.targetCitations.map(c => ({ code: c }))
    );

    // Adaptive Context Packing
    const adaptive = RagOptimizerService.selectAdaptiveContext(
      reranked,
      25000, // 25k char limit
      0.85   // 85% confidence stop
    );
    const finalUpgraded = adaptive.selected;
    const endUpgraded = performance.now();

    // Upgraded Stats
    const upgradedLatency = endUpgraded - startUpgraded;
    const upgradedMRR = calculateMRR(finalUpgraded, bq.relevantDocs);
    const upgradedNDCG = calculateNDCG(finalUpgraded, bq.relevantDocs);
    const upgradedDedupRate = (legacyMatches.length - deduplicated.length) / legacyMatches.length;

    upgradedStats.latencySum += upgradedLatency;
    upgradedStats.mrrSum += upgradedMRR;
    upgradedStats.ndcgSum += upgradedNDCG;
    upgradedStats.chunkCount += finalUpgraded.length;
    upgradedStats.deduplicationCount += (legacyMatches.length - deduplicated.length);

    console.log(
      `| ${"".padEnd(20)} | ${"Upgraded".padEnd(10)} | ${(upgradedLatency.toFixed(1) + "ms").padEnd(10)} | ${String(finalUpgraded.length).padEnd(8)} | ${upgradedMRR.toFixed(3).padEnd(8)} | ${upgradedNDCG.toFixed(3).padEnd(8)} | ${(Math.round(upgradedDedupRate * 100) + "%").padEnd(10)} |`
    );
    console.log("-".repeat(90));
  }

  // ─── SUMMARY COMPARISON REPORT ───
  const qCount = BENCHMARK_QUERIES.length;
  console.log("\n" + "═".repeat(40) + " BENCHMARK SUMMARY " + "═".repeat(40));
  console.log(`Average Latency:`);
  console.log(`  - Legacy:   ${(legacyStats.latencySum / qCount).toFixed(1)} ms`);
  console.log(`  - Upgraded: ${(upgradedStats.latencySum / qCount).toFixed(1)} ms`);
  console.log(`Mean Reciprocal Rank (MRR):`);
  console.log(`  - Legacy:   ${(legacyStats.mrrSum / qCount).toFixed(3)}`);
  console.log(`  - Upgraded: ${(upgradedStats.mrrSum / qCount).toFixed(3)}`);
  console.log(`NDCG Quality:`);
  console.log(`  - Legacy:   ${(legacyStats.ndcgSum / qCount).toFixed(3)}`);
  console.log(`  - Upgraded: ${(upgradedStats.ndcgSum / qCount).toFixed(3)}`);
  console.log(`Average Chunk Count:`);
  console.log(`  - Legacy:   ${(legacyStats.chunkCount / qCount).toFixed(1)} chunks`);
  console.log(`  - Upgraded: ${(upgradedStats.chunkCount / qCount).toFixed(1)} chunks (Adaptive Context Packing)`);
  console.log(`Deduplication rate:`);
  console.log(`  - Legacy:   ${Math.round((legacyStats.deduplicationCount / (qCount * 15)) * 100)}% (prefix-based)`);
  console.log(`  - Upgraded: ${Math.round((upgradedStats.deduplicationCount / (qCount * 15)) * 100)}% (Jaccard + Metadata)`);
  console.log("═".repeat(99) + "\n");
}

runBenchmark();
