/**
 * Knowledge Base Validation Service.
 * Verifies code reference PDF files at startup.
 * Checks checksums, readability, page counts, and determines discipline support.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from './logger';

const logger = new Logger({ stage: 'kb-validation' });

export interface DocumentStatus {
  filename: string;
  expectedDiscipline: string;
  exists: boolean;
  checksum?: string;
  pages?: number;
  readable: boolean;
  error?: string;
}

export class KnowledgeBaseValidationService {
  private static documentRegistry = new Map<string, DocumentStatus>();
  private static supportedDisciplines = new Map<string, boolean>();
  private static initialized = false;

  // Expected file patterns for official publications
  private static REQUIRED_PATTERNS: Record<string, { pattern: RegExp; officialBook: string }> = {
    building_code: { pattern: /^2022BC_/, officialBook: "NYC Building Code (BC)" },
    plumbing_code: { pattern: /^2022PC_/, officialBook: "NYC Plumbing Code (PC)" },
    mechanical_code: { pattern: /^2022MC_/, officialBook: "NYC Mechanical Code (MC)" },
    fuel_gas_code: { pattern: /^2022FGC_/, officialBook: "NYC Fuel Gas Code (FGC)" },
    energy_code: { pattern: /^2022BC_Chapter13_/, officialBook: "NYC Energy Conservation Code (ECC)" },
    electrical_code: { pattern: /^2022BC_Chapter27_/, officialBook: "NYC Electrical Code (EC)" },
    fire_code: { pattern: /^2022FC_/, officialBook: "NYC Fire Code (FC)" },
    zoning_resolution: { pattern: /^2022ZR_/, officialBook: "NYC Zoning Resolution (ZR)" }
  };

  /**
   * Scans and validates all reference PDFs in the folder.
   */
  static async validateCorpus(): Promise<void> {
    if (this.initialized) return;

    logger.info("Initializing Knowledge Base corpus validation...");
    const pdfDir = path.join(__dirname, "../../pdfs");

    let allFiles: string[] = [];
    try {
      if (fs.existsSync(pdfDir)) {
        allFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
      } else {
        logger.error(`PDF directory not found at: ${pdfDir}`, new Error("Directory missing"));
      }
    } catch (e: any) {
      logger.error(`Failed to read PDF directory: ${e.message}`, e);
    }

    // Process required patterns
    for (const [discipline, meta] of Object.entries(this.REQUIRED_PATTERNS)) {
      const matches = allFiles.filter(f => meta.pattern.test(f));
      
      if (matches.length === 0) {
        logger.error(`Production Error: Official reference book [${meta.officialBook}] is missing from corpus!`, new Error(`Missing files for pattern: ${meta.pattern}`));
        this.supportedDisciplines.set(discipline, false);
        this.documentRegistry.set(discipline, {
          filename: `${meta.officialBook} (Expected Pattern: ${meta.pattern.source})`,
          expectedDiscipline: discipline,
          exists: false,
          readable: false,
          error: "Required official code book PDF is missing."
        });
        continue;
      }

      // Check first match readability and metadata
      const file = matches[0];
      const filePath = path.join(pdfDir, file);
      let readable = false;
      let checksum = "";
      let pages = 0;
      let errorMsg = "";

      try {
        const fileBuffer = fs.readFileSync(filePath);
        checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Verify pdf readability by trying to parse header/pages
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileBuffer, { max: 1 }); // only parse page 1
        pages = pdfData.numpages || 1;
        readable = true;
      } catch (err: any) {
        errorMsg = err.message || String(err);
        logger.error(`Readability validation failed for ${file}`, err);
      }

      this.documentRegistry.set(file, {
        filename: file,
        expectedDiscipline: discipline,
        exists: true,
        checksum,
        pages,
        readable,
        error: errorMsg || undefined
      });

      // Enable discipline only if readable and files exist
      this.supportedDisciplines.set(discipline, readable);
    }

    this.initialized = true;
    logger.info("Knowledge Base validation completed", {
      supportedCount: Array.from(this.supportedDisciplines.values()).filter(Boolean).length,
      unsupportedCount: Array.from(this.supportedDisciplines.values()).filter(v => !v).length
    });
  }

  /**
   * Checks if a discipline is supported (all expected files exist and are readable).
   */
  static isDisciplineSupported(discipline: string): boolean {
    if (!this.initialized) return true; // Fail-safe default before validation finishes
    return this.supportedDisciplines.get(discipline) ?? false;
  }

  /**
   * Returns validation report status summary for /health and /ready endpoints.
   */
  static getValidationStatus() {
    const report: Record<string, any> = {};
    for (const [disc, active] of this.supportedDisciplines.entries()) {
      const match = Array.from(this.documentRegistry.values()).find(d => d.expectedDiscipline === disc);
      report[disc] = {
        supported: active,
        officialBook: this.REQUIRED_PATTERNS[disc]?.officialBook || "Unknown",
        status: active ? "OK" : (match?.exists ? "UNREADABLE" : "MISSING"),
        filename: match?.filename || "N/A",
        pages: match?.pages || 0,
        checksum: match?.checksum || "N/A"
      };
    }
    return report;
  }

  /**
   * Returns list of missing code books.
   */
  static getMissingBooks(): string[] {
    const missing: string[] = [];
    for (const [disc, meta] of Object.entries(this.REQUIRED_PATTERNS)) {
      if (!this.isDisciplineSupported(disc)) {
        missing.push(meta.officialBook);
      }
    }
    return missing;
  }
}
