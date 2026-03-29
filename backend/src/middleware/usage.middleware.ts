import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import pool from '../db';

export const checkUsageLimit = async (req: any, res: Response, next: NextFunction) => {
  const { id: userId, subStatus, scanLimit } = req.user;

  // Only enforce after multer runs and a real upload exists.
  if (!req.file) {
    return next();
  }

  const limit = Number(scanLimit) > 0 ? Number(scanLimit) : (subStatus === 'free' ? 2 : 10);

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [rows]: any = await pool.query(
      'SELECT COUNT(*) as count FROM `plan` WHERE userId = ? AND createdAt >= ?',
      [userId, startOfMonth]
    );
    const planCount = Number(rows[0]?.count || 0);

    if (planCount >= limit) {
      // Remove the just-uploaded file when quota is exceeded.
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors; quota response is still authoritative.
        }
      }

      return res.status(402).json({
        message: 'Monthly limit reached. Please upgrade or wait for next month.',
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
