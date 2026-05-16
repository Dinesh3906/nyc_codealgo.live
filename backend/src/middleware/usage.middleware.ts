import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import pool from '../db';

export const checkUsageLimit = async (req: any, res: Response, next: NextFunction) => {
  const { id: userId, subStatus, scanLimit } = req.user;

  // Only enforce after multer runs and a real upload exists.
  if (!req.file) {
    return next();
  }

  // Free users get 0 scans — they must buy a pack first
  const limit = Number(scanLimit) > 0 ? Number(scanLimit) : 0;

  // Block free users immediately
  if (limit === 0) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(402).json({
      message: 'You need to purchase an upload pack to scan plans.',
      code: 'NO_PLAN',
      limit: 0,
      current: 0
    });
  }

  try {
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM `plan` WHERE userId = ? AND status IN ('analyzed', 'processing')",
      [userId]
    );
    const planCount = Number(rows[0]?.count || 0);

    if (planCount >= limit) {
      // Remove the just-uploaded file when quota is exceeded.
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors
        }
      }

      return res.status(402).json({
        message: 'You have reached your upload limit. Please purchase an upload pack to continue scanning.',
        code: 'LIMIT_REACHED',
        limit,
        current: planCount
      });
    }

    next();
  } catch (error) {
    console.error('Usage limit check failed:', error);
    return res.status(500).json({ message: 'Could not validate usage limit.' });
  }
};
