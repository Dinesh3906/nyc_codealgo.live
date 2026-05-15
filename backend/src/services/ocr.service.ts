import { createWorker } from 'tesseract.js';
import fs from 'fs';
// @ts-ignore
const pdf = require('pdf-parse');

export class OCRService {
  /**
   * Extract text from a file (PDF or Image)
   */
  static async extractText(filePath: string, fileType: string): Promise<string> {
    if (fileType.includes('pdf')) {
      return this.extractFromPDF(filePath);
    } else if (fileType.includes('image')) {
      return this.extractFromImage(filePath);
    } else {
      return "ERROR: Unsupported file format. Please upload PDF or Image (PNG/JPG).";
    }
  }

  static async extractFromPDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    
    try {
      // Extract up to 20 pages for deeper analysis
      const data = await pdf(dataBuffer, { max: 20 });
      let text = data.text || "";

      // IF TEXT IS WEAK (Likely a scanned blueprint)
      if (text.trim().length < 100) {
        console.warn("[OCR] PDF Parse yields very little text. It might be a scanned image.");
        // In a real production env, we'd convert PDF to image and OCR it here.
        // For now, we return the warning + any sparse text found.
        return `[SYSTEM WARNING: This PDF appears to be a scanned image and may require higher-level vision analysis for full accuracy.]\n\n${this.cleanText(text)}`;
      }

      return this.cleanText(text);
    } catch (error) {
       console.error("[OCR] PDF Error:", error);
       return "FAILED TO EXTRACT TEXT FROM PDF.";
    }
  }

  static async extractFromImage(filePath: string | Buffer): Promise<string> {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return this.cleanText(text || "No text found in image.");
  }

  private static cleanText(text: string): string {
    return text
      .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable characters
      .replace(/\s+/g, " ")           // Normalize whitespace
      .replace(/\n+/g, "\n")          // Normalize newlines
      .trim();
  }
}


