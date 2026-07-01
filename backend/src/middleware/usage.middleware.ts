import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db';
import { Logger } from '../services/logger';

const pdfParse = require('pdf-parse');
const logger = new Logger({ stage: 'usage-middleware' });

const clampPages = (value: number) => Math.min(Math.max(Number(value) || 1, 1), 10000);

export const checkUsageLimit = async (req: any, res: Response, next: NextFunction) => {
  const { id: userId, scanLimit, pagesUsed } = req.user;

  // Only enforce after multer runs and a real upload exists.
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  // 1. Determine number of pages
  let filePages = 1;
  if (fileExt === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      filePages = clampPages(Number(pdfData.numpages));
      logger.info('PDF page count parsed', { pages: filePages });
    } catch (parseErr) {
      logger.warn('Failed to parse PDF page count. Defaulting to 1 page.');
      filePages = 1;
    }
  } else {
    logger.warn('Unexpected non-PDF upload reached usage middleware.');
  }

  const limit = Number(scanLimit) > 0 ? Number(scanLimit) : 0;
  const currentUsed = Number(pagesUsed) || 0;

  // Block free users or those with no limit immediately
  if (limit === 0) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(402).json({
      message: 'You need to purchase pages or a subscription plan to scan plans.',
      code: 'NO_PLAN',
      limit: 0,
      current: 0,
      requested: filePages
    });
  }

  // Pre-check limit in memory
  if (currentUsed + filePages > limit) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(402).json({
      message: `You have reached your limit. This upload requires ${filePages} pages, but you only have ${Math.max(0, limit - currentUsed)} pages remaining. Please purchase a top-up to continue scanning.`,
      code: 'LIMIT_REACHED',
      limit,
      current: currentUsed,
      requested: filePages
    });
  }

  try {
    // ATOMIC GUARD: Update pagesUsed atomically and ensure it doesn't exceed scanLimit
    const [result]: any = await pool.query(
      'UPDATE `user` SET pagesUsed = pagesUsed + ? WHERE id = ? AND pagesUsed + ? <= scanLimit',
      [filePages, userId, filePages]
    );

    if (result.affectedRows === 0) {
      // Concurrency check failed or limit exceeded
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(402).json({
        message: 'Insufficient page balance. Please purchase a top-up to continue scanning.',
        code: 'LIMIT_REACHED',
        limit,
        current: currentUsed,
        requested: filePages
      });
    }

    logger.info('Usage pages deducted', { userId, pages: filePages });
    
    // Save pages count on the request object for use in routes (to insert into plan table)
    req.filePages = filePages;

    next();
  } catch (error) {
    logger.error('Usage limit check failed', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({ message: 'Could not validate usage limit.' });
  }
};
