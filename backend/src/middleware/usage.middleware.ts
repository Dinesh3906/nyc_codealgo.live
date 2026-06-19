import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db';

const pdfParse = require('pdf-parse');

export const checkUsageLimit = async (req: any, res: Response, next: NextFunction) => {
  const { id: userId, subStatus, scanLimit, pagesUsed } = req.user;

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
      filePages = Number(pdfData.numpages) || 1;
      console.log(`[USAGE MIDDLEWARE] PDF file detected. Page count: ${filePages}`);
    } catch (parseErr) {
      console.error('[USAGE MIDDLEWARE] Failed to parse PDF page count. Defaulting to 1 page.', parseErr);
      filePages = 1;
    }
  } else {
    console.log(`[USAGE MIDDLEWARE] Non-PDF file detected (${fileExt}). Defaulting to 1 page.`);
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

    console.log(`[USAGE MIDDLEWARE] Atomically deducted ${filePages} pages for user ${userId}. New pagesUsed will be loaded in next auth check.`);
    
    // Save pages count on the request object for use in routes (to insert into plan table)
    req.filePages = filePages;

    next();
  } catch (error) {
    console.error('Usage limit check failed:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({ message: 'Could not validate usage limit.' });
  }
};
