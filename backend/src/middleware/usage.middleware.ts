import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import pool from '../db';

export const checkUsageLimit = async (req: any, res: Response, next: NextFunction) => {
  const { id: userId, subStatus, scanLimit } = req.user;

  // Only enforce after multer runs and a real upload exists.
  if (!req.file) {
    return next();
  }

  // Free users get 0 scans — they must subscribe first
  const limit = Number(scanLimit) > 0 ? Number(scanLimit) : (subStatus === 'free' ? 0 : 10);

  // Block free users immediately — no plan = no upload
  if (subStatus === 'free' || limit === 0) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(402).json({
      message: 'You need an active plan to upload and scan. Subscribe to get started!',
      code: 'NO_PLAN',
      limit: 0,
      current: 0
    });
  }

  // Check subscription expiry
  if (req.user.subPeriodEnd) {
    const expiry = new Date(req.user.subPeriodEnd);
    if (expiry < new Date()) {
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(402).json({
        message: 'Your plan has expired. Please renew your subscription to continue.',
        code: 'PLAN_EXPIRED'
      });
    }
  }

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
        message: 'Scan limit reached for your current plan. You can subscribe again to add 12 more scans instantly, or wait until next month for your limit to reset.',
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
