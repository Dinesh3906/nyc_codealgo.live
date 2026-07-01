import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'pdf-splitter' });

export class PDFSplitter {
  private static tempDir = path.resolve('uploads/temp_pages/');

  static {
    // Ensure temp_pages directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extracts a single page from a source PDF and writes it as a new PDF.
   * pageNumber is 1-indexed.
   * Returns the absolute path of the created temporary PDF file.
   */
  static async extractPage(srcPdfPath: string, pageNumber: number): Promise<string> {
    const resolvedSrc = path.resolve(srcPdfPath);
    if (!fs.existsSync(resolvedSrc)) {
      throw new Error(`Source PDF not found at: ${resolvedSrc}`);
    }

    const destFileName = `page-${pageNumber}-${Date.now()}-${Math.round(Math.random() * 1000)}.pdf`;
    const destPath = path.join(this.tempDir, destFileName);

    try {
      const srcBytes = fs.readFileSync(resolvedSrc);
      const srcDoc = await PDFDocument.load(srcBytes);
      
      const pageIndex = pageNumber - 1;
      const totalPages = srcDoc.getPageCount();

      if (pageIndex < 0 || pageIndex >= totalPages) {
        throw new Error(`Page number ${pageNumber} is out of range. PDF only has ${totalPages} pages.`);
      }

      // Create new PDF document and copy the page
      const destDoc = await PDFDocument.create();
      const [copiedPage] = await destDoc.copyPages(srcDoc, [pageIndex]);
      destDoc.addPage(copiedPage);

      const destBytes = await destDoc.save();
      fs.writeFileSync(destPath, destBytes);

      logger.debug('Extracted PDF page', { pageNumber, bytes: destBytes.length });
      return destPath;
    } catch (err: any) {
      logger.error('Error extracting PDF page', err, { pageNumber });
      throw err;
    }
  }

  /**
   * Cleans up any file at the given path.
   */
  static cleanupPage(filePath: string) {
    try {
      const resolved = path.resolve(filePath);
      if (fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
        logger.debug('Cleaned up temporary PDF page');
      }
    } catch (e) {
      logger.warn('Failed to delete temporary PDF page');
    }
  }
}
