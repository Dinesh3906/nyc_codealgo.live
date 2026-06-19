import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      console.error("FATAL SECURITY BREACH: JWT_SECRET environment variable is missing in production!");
      return res.status(500).json({ message: "Internal Server Configuration Error." });
    }
    const decoded = jwt.verify(token, secret || 'secret') as any;
    
    // Fetch user using pool with simple retry for AWS stability
    let users: any = [];
    let attempts = 0;
    while (attempts < 2) {
      try {
        const [rows]: any = await pool.query(
          'SELECT id, name, email, subStatus, scanLimit, pagesUsed, subPeriodEnd, introSubscriptionCount, trialClaimed FROM `user` WHERE id = ?',
          [decoded.id]
        );
        users = rows;
        break;
      } catch (dbError) {
        attempts++;
        if (attempts >= 2) {
          console.error('Database error in auth middleware after retries:', dbError);
          return res.status(500).json({ message: 'Database connection failed. Please check your DB settings.', error: 'DB_CONNECTION_ERROR' });
        }
        console.warn(`Auth DB retry ${attempts}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

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

        console.log(`[AUTH MIDDLEWARE] Billing period expired for user ${user.id}. Resetting pagesUsed to 0, setting scanLimit to ${newScanLimit}, nextPeriodEnd to ${nextPeriodEnd}`);
        await pool.query(
          'UPDATE `user` SET pagesUsed = 0, scanLimit = ?, subPeriodEnd = ? WHERE id = ?',
          [newScanLimit, nextPeriodEnd, user.id]
        );
        
        user.pagesUsed = 0;
        user.scanLimit = newScanLimit;
        user.subPeriodEnd = nextPeriodEnd;
      } catch (resetErr) {
        console.error('[AUTH MIDDLEWARE] Failed to reset monthly pages balance:', resetErr);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Not authorized, token failed', error: 'JWT_ERROR' });
  }
};
