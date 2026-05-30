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
          'SELECT id, name, email, subStatus, scanLimit, subPeriodEnd, introSubscriptionCount, trialClaimed FROM `user` WHERE id = ?',
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
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Not authorized, token failed', error: 'JWT_ERROR' });
  }
};
