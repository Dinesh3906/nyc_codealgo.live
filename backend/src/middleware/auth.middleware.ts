import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { Logger } from '../services/logger';
import { JwtService } from '../services/jwt.service';

const logger = new Logger({ stage: 'auth' });

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.', code: 'MISSING_TOKEN' });
  }

  let decoded: any;
  try {
    decoded = JwtService.verifyUserToken(token);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError' && error.message.includes('signature')) {
      return res.status(401).json({ message: 'Session expired after security update. Please sign in again.', code: 'SECRET_ROTATED' });
    }
    if (error.name === 'JsonWebTokenError' && error.message.includes('jwt malformed')) {
      return res.status(401).json({ message: 'Malformed authentication token.', code: 'MALFORMED_TOKEN' });
    }
    return res.status(401).json({ message: 'Malformed authentication token.', code: 'MALFORMED_TOKEN' });
  }

  try {
    // Fetch user using pool with simple retry for AWS stability
    let users: any = [];
    let attempts = 0;
    while (attempts < 2) {
      try {
        const [rows]: any = await pool.query(
          'SELECT id, name, email, subStatus, scanLimit, pagesUsed, subPeriodEnd, introSubscriptionCount, trialClaimed, tokenVersion FROM `user` WHERE id = ?',
          [decoded.id]
        );
        users = rows;
        break;
      } catch (dbError) {
        attempts++;
        if (attempts >= 2) {
          logger.error('Database error in auth middleware after retries:', dbError);
          return res.status(500).json({ message: 'Database connection failed. Please check your DB settings.', error: 'DB_CONNECTION_ERROR' });
        }
        logger.warn(`Auth DB retry ${attempts}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // Check token version consistency
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session expired after security update. Please sign in again.', code: 'TOKEN_VERSION_MISMATCH' });
    }

    // On-Demand Monthly Reset Logic
    const now = new Date();
    if (user.subPeriodEnd && now > new Date(user.subPeriodEnd)) {
      try {
        const currentPeriodEnd = new Date(user.subPeriodEnd);
        const nextPeriodEnd = new Date(currentPeriodEnd);
        while (nextPeriodEnd < now) {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        }

        let newScanLimit = user.scanLimit;
        if (user.subStatus === 'subscribed') {
          newScanLimit = 15000;
        } else if (user.subStatus === 'free') {
          newScanLimit = 0;
        }

        logger.info(`[AUTH MIDDLEWARE] Billing period expired for user ${user.id}. Resetting pagesUsed to 0, setting scanLimit to ${newScanLimit}, nextPeriodEnd to ${nextPeriodEnd}`);
        await pool.query(
          'UPDATE `user` SET pagesUsed = 0, scanLimit = ?, subPeriodEnd = ? WHERE id = ?',
          [newScanLimit, nextPeriodEnd, user.id]
        );
        
        user.pagesUsed = 0;
        user.scanLimit = newScanLimit;
        user.subPeriodEnd = nextPeriodEnd;
      } catch (resetErr) {
        logger.error('[AUTH MIDDLEWARE] Failed to reset monthly pages balance:', resetErr);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Unexpected error in auth middleware:', error);
    return res.status(500).json({ message: 'Internal server error during authentication.' });
  }
};
