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
const getAdminCookieDomain = (): string | undefined => {
  let d = process.env.COOKIE_DOMAIN?.trim().replace(/^[\"']|[\"']$/g, '');
  if (!d) return undefined;
  if (d.includes('://')) {
    try { d = new URL(d).hostname; } catch {}
  }
  d = d.split('/')[0].split(':')[0].trim();
  if (d.endsWith('codealgo.live')) return '.codealgo.live';
  return d;
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OTP_PATTERN = /^\d{6}$/;
const NOTIFICATION_TYPES = new Set(['info', 'news', 'update', 'alert']);

const cleanText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
};

const normalizeEmail = (value: unknown): string | null => {
  const email = cleanText(value, 254)?.toLowerCase();
  return email && EMAIL_PATTERN.test(email) ? email : null;
};

const router = Router();
// Helper middleware to check if user is in authorized admin list
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Authorized administrators only.' });
  }
  next();
};

// Middleware to verify the short-lived admin OTP session token
const verifyAdminSession = (req: any, res: Response, next: NextFunction) => {
  const adminToken = req.cookies?.admin_session;
  
  if (!adminToken) {
    return res.status(401).json({ message: 'Verification required. Admin OTP token missing.' });
  }

  try {
    const decoded = JwtService.verifyAdminToken(adminToken);

    if (decoded.email !== req.user.email) {
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

    try {
      await sendAdminOtpEmail(email, otp);
    } catch (mailError) {
      logger.error('Failed to send admin OTP email. Printing OTP to server logs for manual fallback:', mailError);
    }

    // Always print to logger for administrative diagnostics and emergency manual bypass
    logger.info(`[SECURITY ALERT] Admin OTP code generated: ${otp} for email: ${email}`);

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
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

  if (!OTP_PATTERN.test(otp)) {
    return res.status(400).json({ message: 'A valid 6-digit verification OTP is required.' });
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

    res.cookie('admin_session', adminSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: getAdminCookieDomain(),
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      path: '/',
    });

    res.json({ verified: true });
  } catch (error) {
    logger.error('Verify Admin OTP Error', error);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
});

// @route   GET /api/admin/session
// @desc    Confirm the short-lived admin OTP session is still valid
// @access  Private (Admins Only + Verified Session)
router.get('/session', protect, requireAdmin, verifyAdminSession, (req: any, res: Response) => {
  res.json({
    verified: true,
    expiresAt: req.adminSession?.exp ? req.adminSession.exp * 1000 : null,
  });
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
  const email = normalizeEmail(req.body?.email);
  const pagesNum = Number(req.body?.pages);

  if (!email || !Number.isInteger(pagesNum) || pagesNum < 1 || pagesNum > 1000) {
    return res.status(400).json({ message: 'A valid target email and 1-1000 gift pages are required.' });
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
  const title = cleanText(req.body?.title, 120);
  const message = cleanText(req.body?.message, 2000);
  const notifType = typeof req.body?.type === 'string' && NOTIFICATION_TYPES.has(req.body.type)
    ? req.body.type
    : 'info';

  if (!title || !message) {
    return res.status(400).json({ message: 'Notification title and message are required.' });
  }

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

  if (!UUID_PATTERN.test(userId)) {
    return res.status(400).json({ message: 'A valid user id is required.' });
  }

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
