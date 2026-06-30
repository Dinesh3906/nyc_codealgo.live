/**
 * Ingestion Script for NYC Code PDFs with Rich Metadata Schema.
 * Extracts text page-by-page, parses chapter/section info, computes source hashes,
 * generates local embeddings (Xenova/all-MiniLM-L6-v2), and uploads to Pinecone.
 *
 * Run with: npx tsx scripts/ingest_code.ts <path_to_pdf>
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import dotenv from "dotenv";
import * as pdfjs from "pdfjs-dist";
import { pipeline } from "@xenova/transformers";

dotenv.config({ path: path.join(__dirname, "../.env") });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || "permitiq";

// Metadata Schema Structure
export interface RichChunkMetadata {
  text: string;
  source: string;
  code_family: string;
  code_edition: string;
  chapter?: string;
  section?: string;
  page_number: number;
  keywords: string;
  discipline: string;
  effective_date: string;
  revision: string;
  source_hash: string;
  chunk_index: number;
}

let embeddingModel: any = null;

async function initEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embeddingModel;
}

async function getEmbedding(text: string): Promise<number[]> {
  const model = await initEmbeddingModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data) as number[];
}

function parseFilenameDetails(filePath: string) {
  const name = path.basename(filePath);
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

  let family = "Building Code";
  let edition = "2022";
  let discipline = "building_code";
  let chapter = "";

  if (name.startsWith("2022BC_")) {
    family = "Building Code";
    discipline = "building_code";
  } else if (name.startsWith("2022PC_")) {
    family = "Plumbing Code";
    discipline = "plumbing_code";
  } else if (name.startsWith("2022MC_")) {
    family = "Mechanical Code";
    discipline = "mechanical_code";
  } else if (name.startsWith("2022FGC_")) {
    family = "Fuel Gas Code";
    discipline = "fuel_gas_code";
  } else if (name.startsWith("2022GAP_")) {
    family = "General Administrative Provisions";
    discipline = "general_administrative";
  } else if (name.toLowerCase().includes("electrical_code")) {
    family = "Electrical Code";
    discipline = "electrical_code";
    edition = "2025";
  }

  // Fallback check by directory path
  if (family === "Building Code" && edition === "2022" && discipline === "building_code") {
    if (normalizedPath.includes('/fire/')) {
      family = "Fire Code";
      discipline = "fire_code";
      edition = "2022";
    } else if (normalizedPath.includes('/energy/')) {
      family = "Energy Conservation Code";
      discipline = "energy_code";
      edition = "2025";
    } else if (normalizedPath.includes('/zoning/')) {
      family = "Zoning Resolution";
      discipline = "zoning_resolution";
      edition = "2026";
    } else if (normalizedPath.includes('/electrical/')) {
      family = "Electrical Code";
      discipline = "electrical_code";
      edition = "2025";
    }
  }

  // Extract chapter number (e.g. Chapter07 -> 7)
  const chapMatch = name.match(/Chapter(\d+)/i);
  if (chapMatch) {
    chapter = parseInt(chapMatch[1], 10).toString();
  } else if (name.includes("Appendix")) {
    const appMatch = name.match(/Appendix([A-Z])/i);
    if (appMatch) {
      chapter = `Appendix ${appMatch[1]}`;
    }
  }

  return { family, edition, discipline, chapter };
}

async function ingestPdf(filePath: string) {
  if (!PINECONE_API_KEY) {
    throw new Error("Missing PINECONE_API_KEY in .env");
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const filename = path.basename(absolutePath);
  const safeIdPrefix = filename.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_\-]/g, "_");
  console.log(`Starting ingestion of ${filename}...`);

  // Compute source hash (MD5)
  const fileBuffer = fs.readFileSync(absolutePath);
  const sourceHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
  console.log(`Source Hash: ${sourceHash}`);

  const { family, edition, discipline, chapter } = parseFilenameDetails(absolutePath);

  // Extract text using PDFJS
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer), verbosity: 0 });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index(INDEX_NAME);

  // Clean up existing records for this source to prevent duplicate chunks
  console.log(`Cleaning up existing vectors for source: ${filename}...`);
  try {
    await index.deleteMany({ source: filename });
    console.log("✓ Existing vectors cleaned.");
  } catch (err: any) {
    console.log(`No existing vectors cleaned: ${err.message}`);
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });

  let totalUploaded = 0;

  // Smarter Chunking: segment by logical section markers
  const segmentBySections = (text: string): { section?: string; text: string }[] => {
    // Regex matches section markers like "SECTION 1009", "BC 1009.3", "1009.3.1", "SECTION EC 80", or "ARTICLE 110"
    const sectionStartRegex = /\b((?:BC|PC|MC|FGC|EC|ECC|ZR|SECTION|ARTICLE)\s+(?:EC\s+)?\d+(?:\.\d+)*|\b\d{3,4}\.\d+(?:\.\d+)*)\b/gi;

    const segments: { section?: string; text: string }[] = [];
    let match;
    let lastIndex = 0;
    let currentSection = "";

    while ((match = sectionStartRegex.exec(text)) !== null) {
      if (lastIndex < match.index) {
        segments.push({
          section: currentSection || undefined,
          text: text.substring(lastIndex, match.index).trim()
        });
      }
      currentSection = match[1];
      lastIndex = match.index;
    }

    if (lastIndex < text.length) {
      segments.push({
        section: currentSection || undefined,
        text: text.substring(lastIndex).trim()
      });
    }

    // Filter out empty segments and sub-chunk overly large sections
    const finalSegments: { section?: string; text: string }[] = [];
    const maxSegmentLength = 1500;

    for (const seg of segments) {
      if (seg.text.length < 50) continue;

      if (seg.text.length > maxSegmentLength) {
        // Sub-chunk by paragraphs to keep section boundaries intact
        const paragraphs = seg.text.split("\n");
        let currentChunk = "";
        for (const p of paragraphs) {
          if (currentChunk.length + p.length > maxSegmentLength) {
            if (currentChunk.trim().length > 50) {
              finalSegments.push({ section: seg.section, text: currentChunk.trim() });
            }
            currentChunk = p;
          } else {
            currentChunk += "\n" + p;
          }
        }
        if (currentChunk.trim().length > 50) {
          finalSegments.push({ section: seg.section, text: currentChunk.trim() });
        }
      } else {
        finalSegments.push(seg);
      }
    }

    return finalSegments;
  };

  let currentChapter = chapter;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ").trim();

    if (pageText.length < 50) continue;

    // Track active chapter/article dynamically from the page text
    const pageChapterMatch = pageText.match(/CHAPTER\s+(\d+)/i);
    if (pageChapterMatch) {
      currentChapter = `Chapter ${pageChapterMatch[1]}`;
    }

    // Segment page text by section structures
    const segments = segmentBySections(pageText);
    console.log(`Page ${pageNum}: Split into ${segments.length} structural segments`);

    const records = [];
    let chunkIdx = 0;

    for (const seg of segments) {
      // Find keywords
      const keywords = seg.text.match(/[a-zA-Z]{5,}/g)?.slice(0, 10).join(", ") || "";

      // Try to find cross-references (citations to other code sections)
      const refMatches = seg.text.match(/\b(?:BC|PC|MC|FGC|EC|ECC|ZR|SECTION|ARTICLE)\s+(?:EC\s+)?\d+(?:\.\d+)*\b/gi) || [];
      const crossRefs = Array.from(new Set(refMatches)).join(", ");

      const metadata: RichChunkMetadata = {
        text: seg.text.substring(0, 40000), // cap metadata limit
        source: filename,
        code_family: family,
        code_edition: edition,
        chapter: currentChapter || undefined,
        section: seg.section || undefined,
        page_number: pageNum,
        keywords: keywords + (crossRefs ? ", references: " + crossRefs : ""),
        discipline,
        effective_date: edition === "2025" ? "2025-12-21" : "2022-11-07",
        revision: "Original",
        source_hash: sourceHash,
        chunk_index: chunkIdx++
      };

      // Generate embedding
      const vector = await getEmbedding(seg.text);

      records.push({
        id: `${safeIdPrefix}_p${pageNum}_c${chunkIdx}_${Date.now()}`,
        values: vector,
        metadata: metadata as any
      });
    }

    if (records.length > 0) {
      await index.upsert(records);
      totalUploaded += records.length;
      console.log(`Uploaded ${records.length} chunks for page ${pageNum}`);
    }
  }

  if (totalUploaded === 0) {
    console.log(`No text extracted from ${filename}. Creating a placeholder chunk to register ingestion...`);
    const metadata: RichChunkMetadata = {
      text: `This document (${filename}) does not contain extractable text content (it may be empty, reserved, or scanned without OCR).`,
      source: filename,
      code_family: family,
      code_edition: edition,
      chapter: chapter || undefined,
      section: undefined,
      page_number: 1,
      keywords: "empty, reserved, placeholder, no-text",
      discipline,
      effective_date: edition === "2025" ? "2025-12-21" : "2022-11-07",
      revision: "Original",
      source_hash: sourceHash,
      chunk_index: 0
    };

    const vector = await getEmbedding(metadata.text);
    await index.upsert([{
      id: `${safeIdPrefix}_placeholder_${Date.now()}`,
      values: vector,
      metadata: metadata as any
    }]);
    totalUploaded = 1;
    console.log(`Uploaded placeholder chunk for ${filename}.`);
  }

  console.log(`Ingestion completed successfully. Uploaded ${totalUploaded} chunks from ${filename}.`);
}

// CLI entry point
if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.log("Usage: npx tsx scripts/ingest_code.ts <path_to_pdf>");
    process.exit(1);
  }
  ingestPdf(fileArg).catch(console.error);
}
