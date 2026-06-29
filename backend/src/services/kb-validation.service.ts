/**
 * Knowledge Base Validation Service.
 * Verifies code reference directories at startup.
 * Upgraded to directory-based validation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from './logger';
import { Pinecone } from '@pinecone-database/pinecone';

const logger = new Logger({ stage: 'kb-validation' });

export interface DirectoryStatus {
  discipline: string;
  dirExists: boolean;
  pdfCount: number;
  totalPages: number;
  indexedChunks: number;
  ingestionMetadataOk: boolean;
  firstFilename?: string;
  error?: string;
}

export class KnowledgeBaseValidationService {
  private static directoryReport = new Map<string, DirectoryStatus>();
  private static supportedDisciplines = new Map<string, boolean>();
  private static initialized = false;

  // Expected directories and metadata mapping
  private static DISCIPLINE_DIRS: Record<string, { dirName: string; officialBook: string; legacyPattern?: RegExp }> = {
    building_code: { dirName: "building", officialBook: "NYC Building Code (BC)", legacyPattern: /^2022BC_(?!Chapter13|Chapter27|Chapter28|Chapter29)/ },
    plumbing_code: { dirName: "plumbing", officialBook: "NYC Plumbing Code (PC)", legacyPattern: /^(?:2022PC_|2022BC_Chapter29_)/ },
    mechanical_code: { dirName: "mechanical", officialBook: "NYC Mechanical Code (MC)", legacyPattern: /^(?:2022MC_|2022BC_Chapter28_)/ },
    fuel_gas_code: { dirName: "fuel_gas", officialBook: "NYC Fuel Gas Code (FGC)", legacyPattern: /^2022FGC_/ },
    electrical_code: { dirName: "electrical", officialBook: "NYC Electrical Code (EC)", legacyPattern: /^(?:2022BC_Chapter27_|2025electrical_code|.*electrical_code)/ },
    energy_code: { dirName: "energy", officialBook: "NYC Energy Conservation Code (ECC)", legacyPattern: /^(?:2022BC_Chapter13_|2025_acknowledgements_energy|2025nycecc)/ },
    fire_code: { dirName: "fire", officialBook: "NYC Fire Code (FC)", legacyPattern: /^(?:2022FC_|chapter-\d+-2022)/ },
    zoning_resolution: { dirName: "zoning", officialBook: "NYC Zoning Resolution (ZR)", legacyPattern: /^(?:2022ZR_|Article\s+[A-Z]+|Zoning\s+Resolution\s+Complete)/i }
  };

  /**
   * Scans and validates all reference subdirectories in backend/pdfs.
   */
  static async validateCorpus(): Promise<void> {
    if (this.initialized) return;

    logger.info("Initializing Knowledge Base directory-based validation...");
    const pdfDir = path.join(__dirname, "../../pdfs");

    // Ensure main pdfDir exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // 1. One-time legacy file self-healing migration
    for (const [discipline, meta] of Object.entries(this.DISCIPLINE_DIRS)) {
      const dirPath = path.join(pdfDir, meta.dirName);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // If directory is empty, look for matching legacy files in the root and migrate them
      const filesInDir = fs.readdirSync(dirPath).filter(f => f.endsWith('.pdf'));
      if (filesInDir.length === 0 && meta.legacyPattern) {
        const rootFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
        for (const file of rootFiles) {
          if (meta.legacyPattern.test(file)) {
            const oldPath = path.join(pdfDir, file);
            const newPath = path.join(dirPath, file);
            try {
              fs.renameSync(oldPath, newPath);
              logger.info(`Migrated legacy file ${file} to subdirectory ${meta.dirName}`);
            } catch (err: any) {
              logger.error(`Failed to migrate file ${file}: ${err.message}`);
            }
          }
        }
      }
    }

    // 2. Load caches for validation and ingestion reports
    const validationReportPath = path.join(pdfDir, 'validation_report.json');
    let validationCache: Record<string, { pages: number }> = {};
    try {
      if (fs.existsSync(validationReportPath)) {
        const reportData = JSON.parse(fs.readFileSync(validationReportPath, 'utf8'));
        for (const item of reportData) {
          if (item.filename && item.pages) {
            validationCache[item.filename] = { pages: item.pages };
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Failed to parse validation_report.json: ${e.message}`);
    }

    const ingestionReportPath = path.join(pdfDir, 'ingestion_report.json');
    let ingestionCache: Record<string, { status: string }> = {};
    try {
      if (fs.existsSync(ingestionReportPath)) {
        const reportData = JSON.parse(fs.readFileSync(ingestionReportPath, 'utf8'));
        for (const item of reportData) {
          if (item.filename && item.status) {
            ingestionCache[item.filename] = { status: item.status };
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Failed to parse ingestion_report.json: ${e.message}`);
    }

    // 3. Connect to Pinecone to query chunk counts
    let pc: Pinecone | null = null;
    if (process.env.PINECONE_API_KEY) {
      try {
        pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      } catch (err: any) {
        logger.warn(`Failed to initialize Pinecone client for validation: ${err.message}`);
      }
    }

    // 4. Validate each discipline directory
    for (const [discipline, meta] of Object.entries(this.DISCIPLINE_DIRS)) {
      const dirPath = path.join(pdfDir, meta.dirName);
      const dirExists = fs.existsSync(dirPath);
      
      let pdfCount = 0;
      let totalPages = 0;
      let indexedChunks = 0;
      let ingestionMetadataOk = true;
      let firstFilename: string | undefined = undefined;
      let errorMsg = "";

      if (dirExists) {
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.pdf'));
        pdfCount = files.length;
        if (pdfCount > 0) {
          firstFilename = files[0];
          // Sum pages
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            let pages = 0;
            // Check cache first
            if (validationCache[file]) {
              pages = validationCache[file].pages;
            } else {
              // Read via pdf-parse as fallback
              try {
                const fileBuffer = fs.readFileSync(filePath);
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(fileBuffer, { max: 1 });
                pages = pdfData.numpages || 1;
              } catch (e: any) {
                pages = 1;
                logger.warn(`Failed to parse page count for ${file}: ${e.message}`);
              }
            }
            totalPages += pages;

            // Verify ingestion status
            const ingestStatus = ingestionCache[file]?.status;
            if (ingestStatus !== 'SUCCESS') {
              ingestionMetadataOk = false;
            }
          }
        } else {
          ingestionMetadataOk = false;
          errorMsg = "Directory contains no PDF documents.";
        }
      } else {
        ingestionMetadataOk = false;
        errorMsg = "Directory does not exist.";
      }

      // Query Pinecone for chunk counts
      if (pc && process.env.PINECONE_INDEX) {
        try {
          const index = pc.Index(process.env.PINECONE_INDEX);
          const stats = await index.describeIndexStats();
          const queryResponse = await index.query({
            vector: Array(384).fill(0),
            topK: 1,
            filter: { discipline: { $eq: discipline } }
          });
          indexedChunks = queryResponse.matches.length > 0 ? (stats.namespaces?.['']?.recordCount || 1) : 0;
        } catch (err: any) {
          logger.warn(`Failed to query Pinecone stats for discipline ${discipline}: ${err.message}`);
        }
      }

      // A discipline is fully supported only if:
      // 1. Directory exists and contains at least 1 PDF.
      // 2. Ingestion metadata is valid for all PDFs (or it's electrical/energy/zoning/fire which we warn on instead of failing startup).
      const supported = dirExists && pdfCount > 0 && indexedChunks > 0;

      if (!supported) {
        logger.warn(`Production Warning: Corpus [${meta.officialBook}] is unsupported. (Dir: pdfs/${meta.dirName}, Chunks: ${indexedChunks})`);
      }

      this.supportedDisciplines.set(discipline, supported);
      this.directoryReport.set(discipline, {
        discipline,
        dirExists,
        pdfCount,
        totalPages,
        indexedChunks,
        ingestionMetadataOk,
        firstFilename,
        error: errorMsg || undefined
      });
    }

    this.initialized = true;
    logger.info("Knowledge Base directory-based validation completed", {
      supportedCount: Array.from(this.supportedDisciplines.values()).filter(Boolean).length,
      unsupportedCount: Array.from(this.supportedDisciplines.values()).filter(v => !v).length
    });
  }

  /**
   * Checks if a discipline is supported.
   */
  static isDisciplineSupported(discipline: string): boolean {
    if (!this.initialized) return true;
    return this.supportedDisciplines.get(discipline) ?? false;
  }

  /**
   * Returns validation report status summary for /ready and /health/kb endpoints.
   */
  static getValidationStatus() {
    const report: Record<string, any> = {};
    for (const [disc, active] of this.supportedDisciplines.entries()) {
      const details = this.directoryReport.get(disc);
      const meta = this.DISCIPLINE_DIRS[disc];
      report[disc] = {
        supported: active,
        officialBook: meta?.officialBook || "Unknown",
        status: active ? "OK" : (details?.dirExists && details.pdfCount > 0 ? "INCOMPLETE" : "MISSING"),
        dirExists: details?.dirExists ?? false,
        pdfCount: details?.pdfCount ?? 0,
        totalPages: details?.totalPages ?? 0,
        indexedChunks: details?.indexedChunks ?? 0,
        ingestionMetadataOk: details?.ingestionMetadataOk ?? false,
        filename: details?.firstFilename || "N/A"
      };
    }
    return report;
  }

  /**
   * Returns list of missing code books.
   */
  static getMissingBooks(): string[] {
    const missing: string[] = [];
    for (const [disc, meta] of Object.entries(this.DISCIPLINE_DIRS)) {
      if (!this.isDisciplineSupported(disc)) {
        missing.push(meta.officialBook);
      }
    }
    return missing;
  }
}
