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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    // Fetch user using pool
    try {
      const [users]: any = await pool.query(
        'SELECT id, email, subStatus, scanLimit, subPeriodEnd, introSubscriptionCount, trialClaimed FROM `user` WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const user = users[0];
      req.user = user;
      next();
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({ message: 'Database connection failed. Please check your DB settings.', error: 'DB_CONNECTION_ERROR' });
    }
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Not authorized, token failed', error: 'JWT_ERROR' });
  }
};
