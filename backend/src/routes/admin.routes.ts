import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { protect } from '../middleware/auth.middleware';
import { sendAdminOtpEmail, sendGiftCreditsEmail } from '../services/mail.service';

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
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(adminToken, secret) as any;

    if (!decoded.verifiedAdmin || decoded.email !== req.user.email || !ADMIN_EMAILS.includes(decoded.email)) {
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
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.query(
      'UPDATE `user` SET adminOtp = ?, adminOtpExpiry = ? WHERE id = ?',
      [otp, expiry, req.user.id]
    );

    await sendAdminOtpEmail(email, otp);
    res.json({ message: 'Security verification code has been sent to your administrator email.' });
  } catch (error) {
    console.error('Send Admin OTP Error:', error);
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
      'SELECT adminOtp, adminOtpExpiry FROM `user` WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    const { adminOtp, adminOtpExpiry } = users[0];

    if (!adminOtp || !adminOtpExpiry || new Date(adminOtpExpiry) < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (adminOtp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Clear OTP upon successful verification
    await pool.query(
      'UPDATE `user` SET adminOtp = NULL, adminOtpExpiry = NULL WHERE id = ?',
      [req.user.id]
    );

    // Generate short-lived admin session token (2 hours)
    const secret = process.env.JWT_SECRET || 'secret';
    const adminSessionToken = jwt.sign(
      { id: req.user.id, email: req.user.email, verifiedAdmin: true },
      secret,
      { expiresIn: '2h' }
    );

    res.json({ adminSessionToken });
  } catch (error) {
    console.error('Verify Admin OTP Error:', error);
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
        (SELECT COUNT(*) FROM \`plan\` p WHERE p.userId = u.id AND p.status IN ('analyzed', 'processing')) AS scansUsed
      FROM \`user\` u
      ORDER BY u.createdAt DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Fetch Admin Users Error:', error);
    res.status(500).json({ message: 'Failed to retrieve user directory.' });
  }
});

// @route   POST /api/admin/gift-credits
// @desc    Add scan credits to a user and trigger notification email
// @access  Private (Admins Only + Verified Session)
router.post('/gift-credits', protect, requireAdmin, verifyAdminSession, async (req: any, res: Response) => {
  const { email, credits } = req.body;

  if (!email || credits === undefined || credits === null) {
    return res.status(400).json({ message: 'User email and credits count are required.' });
  }

  const creditsNum = Number(credits);
  if (isNaN(creditsNum) || creditsNum <= 0) {
    return res.status(400).json({ message: 'Gift credits must be a positive number.' });
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

    // Update credits
    await pool.query(
      'UPDATE `user` SET scanLimit = scanLimit + ? WHERE id = ?',
      [creditsNum, user.id]
    );

    // Insert web notification for the gifted user
    await pool.query(
      'INSERT INTO `notification` (id, userId, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [
        uuidv4(), 
        user.id, 
        'Scan Credits Gifted', 
        `You have been gifted ${creditsNum} scan credits by CodeAlgo!`, 
        'gift'
      ]
    );

    // Send automated gifted credit notification email
    await sendGiftCreditsEmail(user.email, creditsNum);

    res.json({ 
      message: `Successfully gifted ${creditsNum} scan credits to ${email}.`,
      newLimit: user.scanLimit + creditsNum 
    });
  } catch (error) {
    console.error('Gift Credits Error:', error);
    res.status(500).json({ message: 'Failed to allocate gifted credits.' });
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
    console.error('Broadcast Notification Error:', error);
    res.status(500).json({ message: 'Failed to broadcast system notification.' });
  }
});

export default router;
