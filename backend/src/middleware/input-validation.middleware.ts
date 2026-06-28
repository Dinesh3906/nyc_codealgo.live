/**
 * Input validation middleware for PDF uploads and request sanitization.
 * Validates file integrity, enforces size limits, and sanitizes filenames.
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'input-validation' });

// PDF magic bytes: %PDF
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]);
const MAX_FILENAME_LENGTH = 255;
const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10) * 1024 * 1024;

/**
 * Validates that an uploaded file is actually a PDF by checking magic bytes.
 */
export function validatePdfFile(req: Request, res: Response, next: NextFunction) {
  const file = (req as any).file;
  if (!file) {
    return next(); // No file uploaded, let downstream handle
  }

  try {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      logger.warn('File exceeds maximum size limit', {
        stage: 'input-validation',
        latencyMs: file.size
      });
      // Clean up the uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(413).json({
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
      });
    }

    // Check magic bytes
    const fd = fs.openSync(file.path, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);

    if (!header.subarray(0, 4).equals(PDF_MAGIC_BYTES)) {
      logger.warn('File failed PDF magic byte validation', {
        stage: 'input-validation'
      });
      // Clean up invalid file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        message: 'Invalid file format. Only valid PDF files are accepted.'
      });
    }

    next();
  } catch (err) {
    logger.error('Error validating uploaded file', err);
    next(err);
  }
}

/**
 * Sanitizes filename to prevent path traversal and special character injection.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and traversal
  let clean = filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Windows forbidden chars
    .trim();

  // Truncate to max length
  if (clean.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(clean);
    clean = clean.substring(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  // Ensure non-empty
  if (!clean || clean === '') {
    clean = `upload_${Date.now()}.pdf`;
  }

  return clean;
}

/**
 * Validates and sanitizes request body parameters.
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction) {
  // Sanitize string fields recursively
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Remove null bytes
      obj[key] = obj[key].replace(/\0/g, '');
      // Trim excessive whitespace
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
