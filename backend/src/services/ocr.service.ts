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
      const data = await pdf(dataBuffer, { max: 10 });
      let text = data.text || "";

      // IF TEXT IS WEAK (Likely a scanned blueprint)
      if (text.trim().length < 50) {
        console.warn("[OCR] PDF Parse yields very little text. It might be a scanned image.");
        return "WARNING: This PDF appears to be a scanned image. For 100% accuracy, please upload a direct PDF export or high-resolution PNG/JPG images instead.";
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


