import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { protect } from '../middleware/auth.middleware';
import { JwtService } from '../services/jwt.service';
import { sendAdminOtpEmail, sendGiftPagesEmail } from '../services/mail.service';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'admin-routes' });

const router = Router();
const ADMIN_EMAILS = ['chalams115@gmail.com', 'sathvi2018@gmail.com'];

// Helper middleware to check if user is in authorized admin list
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Access denied. Authorized administrators only.' });
  }
  next();
};

// Middleware to verify the short-lived admin OTP session token
const verifyAdminSession = (req: any, res: Response, next: NextFunction) => {
  const adminToken = req.headers['x-admin-token'] as string;
  
  if (!adminToken) {
    return res.status(401).json({ message: 'Verification required. Admin OTP token missing.' });
  }

  try {
    const decoded = JwtService.verifyAdminToken(adminToken);

    if (decoded.email !== req.user.email || !ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ message: 'Invalid or expired admin session.' });
    }

    req.adminSession = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Please re-authenticate via OTP.' });
  }
};

// @route   POST /api/admin/send-otp
// @desc    Generate and send OTP to admin email
// @access  Private (Admins Only)
router.post('/send-otp', protect, requireAdmin, async (req: any, res: Response) => {
  const email = req.user.email;

  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.query(
      'UPDATE `user` SET adminOtp = ?, adminOtpExpiry = ?, adminOtpAttempts = 0 WHERE id = ?',
      [hashedOtp, expiry, req.user.id]
    );

    await sendAdminOtpEmail(email, otp);
    res.json({ message: 'Security verification code has been sent to your administrator email.' });
  } catch (error) {
    logger.error('Send Admin OTP Error', error);
    res.status(500).json({ message: 'Failed to generate verification code.' });
  }
});

// @route   POST /api/admin/verify-otp
// @desc    Verify OTP and return an admin session token
// @access  Private (Admins Only)
router.post('/verify-otp', protect, requireAdmin, async (req: any, res: Response) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'Verification OTP is required.' });
  }

  try {
    const [users]: any = await pool.query(
      'SELECT adminOtp, adminOtpExpiry, adminOtpAttempts FROM `user` WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    const { adminOtp, adminOtpExpiry, adminOtpAttempts } = users[0];

    if (!adminOtp || !adminOtpExpiry || new Date(adminOtpExpiry) < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Check attempt limit
    if (adminOtpAttempts >= 5) {
      // Clear OTP to force re-send
      await pool.query(
        'UPDATE `user` SET adminOtp = NULL, adminOtpExpiry = NULL, adminOtpAttempts = 0 WHERE id = ?',
        [req.user.id]
      );
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    // Compare hashed OTP
    const otpMatch = await bcrypt.compare(otp, adminOtp);
    if (!otpMatch) {
      await pool.query(
        'UPDATE `user` SET adminOtpAttempts = COALESCE(adminOtpAttempts, 0) + 1 WHERE id = ?',
        [req.user.id]
      );
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Clear OTP upon successful verification
    await pool.query(
      'UPDATE `user` SET adminOtp = NULL, adminOtpExpiry = NULL, adminOtpAttempts = 0 WHERE id = ?',
      [req.user.id]
    );

    // Generate short-lived admin session token (2 hours)
    const adminSessionToken = JwtService.signAdminToken(req.user.id, req.user.email);

    res.json({ adminSessionToken });
  } catch (error) {
    logger.error('Verify Admin OTP Error', error);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
});

// @route   GET /api/admin/users
// @desc    Get complete users database with plans metadata
// @access  Private (Admins Only + Verified Session)
router.get('/users', protect, requireAdmin, verifyAdminSession, async (req: any, res: Response) => {
  try {
    const [users]: any = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        COALESCE(u.provider, 'email') as provider, 
        u.scanLimit, 
        u.createdAt,
        u.pagesUsed AS pagesUsed
      FROM \`user\` u
      ORDER BY u.createdAt DESC
    `);

    res.json(users);
  } catch (error) {
    logger.error('Fetch Admin Users Error', error);
    res.status(500).json({ message: 'Failed to retrieve user directory.' });
  }
});

// @route   POST /api/admin/gift-pages
// @desc    Add page limit to a user and trigger notification email
// @access  Private (Admins Only + Verified Session)
router.post('/gift-pages', protect, requireAdmin, verifyAdminSession, async (req: any, res: Response) => {
  const { email, pages } = req.body;

  if (!email || pages === undefined || pages === null) {
    return res.status(400).json({ message: 'User email and pages count are required.' });
  }

  const pagesNum = Number(pages);
  if (isNaN(pagesNum) || pagesNum <= 0) {
    return res.status(400).json({ message: 'Gift pages must be a positive number.' });
  }

  try {
    // Check if target user exists
    const [targetUsers]: any = await pool.query(
      'SELECT id, email, scanLimit FROM `user` WHERE email = ?',
      [email]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({ message: 'Target user account not found.' });
    }

    const user = targetUsers[0];

    // Update pages limit (scanLimit column)
    await pool.query(
      'UPDATE `user` SET scanLimit = scanLimit + ? WHERE id = ?',
      [pagesNum, user.id]
    );

    // Insert web notification for the gifted user
    await pool.query(
      'INSERT INTO `notification` (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(), 
        user.id, 
        'Pages Gifted', 
        `You have been gifted ${pagesNum} pages by PermitIQ by Aureon!`, 
        'gift'
      ]
    );

    // Send automated gifted pages notification email
    await sendGiftPagesEmail(user.email, pagesNum);

    res.json({ 
      message: `Successfully gifted ${pagesNum} pages to ${email}.`,
      newLimit: user.scanLimit + pagesNum 
    });
  } catch (error) {
    logger.error('Gift Pages Error', error);
    res.status(500).json({ message: 'Failed to allocate gifted pages.' });
  }
});

// @route   POST /api/admin/broadcast-notification
// @desc    Send a system-wide notification to all users
// @access  Private (Admins Only + Verified Session)
router.post('/broadcast-notification', protect, requireAdmin, verifyAdminSession, async (req: any, res: Response) => {
  const { title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Notification title and message are required.' });
  }

  const notifType = type || 'info'; // 'info', 'news', 'update', 'alert'

  try {
    const [users]: any = await pool.query('SELECT id FROM `user`');
    
    if (users.length === 0) {
      return res.json({ message: 'No registered users to receive the broadcast.' });
    }

    // Insert notification for all users in parallel
    const insertPromises = users.map((u: any) => {
      return pool.query(
        'INSERT INTO `notification` (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), u.id, title, message, notifType]
      );
    });

    await Promise.all(insertPromises);

    res.json({ message: `Broadcast sent successfully to ${users.length} users.` });
  } catch (error) {
    logger.error('Broadcast Notification Error', error);
    res.status(500).json({ message: 'Failed to broadcast system notification.' });
  }
});

// @route   POST /api/admin/users/:id/revoke
// @desc    Revoke user active sessions by incrementing their tokenVersion
// @access  Private (Admins Only + Verified Session)
router.post('/users/:id/revoke', protect, requireAdmin, verifyAdminSession, async (req: any, res: Response) => {
  const userId = req.params.id;

  try {
    const [result]: any = await pool.query(
      'UPDATE `user` SET tokenVersion = tokenVersion + 1 WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: `Successfully revoked all sessions for user ${userId}.` });
  } catch (error) {
    logger.error('Revoke User Session Error', error);
    res.status(500).json({ message: 'Failed to revoke user session.' });
  }
});

export default router;
