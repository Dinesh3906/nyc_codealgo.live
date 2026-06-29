/**
 * Re-indexing Script — Purges Pinecone database and re-indexes all 113 PDFs
 * using the new Rich Metadata Schema and logical structural segmenter.
 *
 * Run with: npx tsx scripts/reindex_all.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: path.join(__dirname, "../.env") });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || "codealgo";

async function runReindexing() {
  if (!PINECONE_API_KEY) {
    console.error("Missing PINECONE_API_KEY in .env");
    process.exit(1);
  }

  console.log("=== NYC COMPLIANCE ENGINE RE-INDEXING ===");
  console.log(`Index Target: ${INDEX_NAME}`);

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index(INDEX_NAME);

  // 1. Purge legacy index records
  console.log("\nPurging legacy vector records...");
  try {
    const stats = await index.describeIndexStats();
    console.log(`Current record count: ${stats.totalRecordCount}`);
    
    // Purge the namespace
    await index.deleteAll();
    console.log("✓ Legacy index purged successfully.");
  } catch (err: any) {
    console.error("✗ Failed to purge index. It might be already empty or in-creation.", err.message);
  }

  function scanDirectoryRecursively(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        scanDirectoryRecursively(filePath, fileList);
      } else if (file.endsWith('.pdf')) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  // 2. Fetch corpus PDF inventory
  const pdfDir = path.join(__dirname, "../pdfs");
  if (!fs.existsSync(pdfDir)) {
    console.error(`PDF corpus folder not found at: ${pdfDir}`);
    process.exit(1);
  }

  const files = scanDirectoryRecursively(pdfDir);
  console.log(`\nFound ${files.length} PDFs to index.`);

  let successCount = 0;
  let failCount = 0;

  // 3. Process indexing file-by-file
  // Note: We use the single-file ingest script we built
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = path.relative(pdfDir, filePath);
    console.log(`\n[${i + 1}/${files.length}] Indexing: ${relativePath}...`);
    
    try {
      execSync(`npx tsx scripts/ingest_code.ts "${filePath}"`, { stdio: "inherit" });
      successCount++;
    } catch (e: any) {
      console.error(`✗ Failed to index ${relativePath}:`, e.message);
      failCount++;
    }
  }

  console.log("\n========================================");
  console.log("RE-INDEXING JOB COMPLETED");
  console.log(`Successful: ${successCount}`);
  console.log(`Failed:     ${failCount}`);
  console.log("========================================\n");
}

runReindexing().catch(console.error);
