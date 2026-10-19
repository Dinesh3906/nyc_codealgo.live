import { CookieOptions, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { JwtService } from '../services/jwt.service';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'auth-controller' });

// ─── Cookie Configuration ───

const sanitizeCookieDomain = (raw?: string, req?: Request): string | undefined => {
  let d = (raw || process.env.COOKIE_DOMAIN || '')?.trim().replace(/^["']|["']$/g, '');
  if (!d && req?.headers.host?.includes('codealgo.live')) {
    d = '.codealgo.live';
  }
  if (!d) return undefined;
  if (d.includes('://')) {
    try { d = new URL(d).hostname; } catch {}
  }
  d = d.split('/')[0].split(':')[0].trim();
  if (d.endsWith('codealgo.live')) return '.codealgo.live';
  if (!/^\.?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(d)) return undefined;
  return d;
};

const getGoogleClientId = (): string | undefined => process.env.GOOGLE_CLIENT_ID?.trim().replace(/^["']|["']$/g, '');
const getGoogleClientSecret = (): string | undefined => process.env.GOOGLE_CLIENT_SECRET?.trim().replace(/^["']|["']$/g, '');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

const normalizeEmail = (email: unknown): string | null => {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized) ? normalized : null;
};

const cleanText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
};

const validatePassword = (password: unknown): password is string => (
  typeof password === 'string' &&
  password.length >= 12 &&
  password.length <= 128
);

const getOAuthUrls = (req: Request) => {
  const isLocal = !IS_PRODUCTION && (req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1'));
  let apiBaseUrl: string;
  if (isLocal) {
    apiBaseUrl = 'http://localhost:5000';
  } else if (req.headers.host) {
    apiBaseUrl = `https://${req.headers.host}`;
  } else {
    apiBaseUrl = process.env.API_PUBLIC_URL || 'https://api-permitiq.codealgo.live';
  }

  const frontendUrl = isLocal
    ? 'http://localhost:3000'
    : (process.env.FRONTEND_URL || 'https://permitiq.codealgo.live');

  return {
    redirectUri: `${apiBaseUrl.replace(/\/$/, '')}/api/auth/google/callback`,
    frontendUrl: frontendUrl.replace(/\/$/, ''),
  };
};

const baseCookieOptions = (path: string, req?: Request): CookieOptions => {
  const domain = sanitizeCookieDomain(undefined, req);
  return {
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    domain: domain || undefined,
    path,
  };
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, csrfToken: string) {
  res.cookie('access_token', accessToken, {
    ...baseCookieOptions('/'),
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions('/api/auth'),
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.cookie('csrf_token', csrfToken, {
    ...baseCookieOptions('/'),
    httpOnly: false, // Must be readable by client JS to send in header
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', baseCookieOptions('/'));
  res.clearCookie('refresh_token', baseCookieOptions('/api/auth'));
  res.clearCookie('csrf_token', baseCookieOptions('/'));
  res.clearCookie('admin_session', baseCookieOptions('/'));
}

// ─── Helpers ───

const signTokenPair = (id: string, email: string, tokenVersion: number) => {
  const accessToken = JwtService.signUserToken(id, email, tokenVersion);
  const refreshToken = JwtService.signRefreshToken(id, email, tokenVersion);
  return { accessToken, refreshToken };
};

const hashRefreshToken = (refreshToken: string) => crypto.createHash('sha256').update(refreshToken).digest('hex');

const storeRefreshTokenHash = async (id: string, refreshToken: string) => {
  const hash = hashRefreshToken(refreshToken);
  await pool.query(
    'UPDATE `user` SET refreshTokenHash = ? WHERE id = ?',
    [hash, id]
  );
};

const issueAuthSession = async (res: Response, user: { id: string; email: string; tokenVersion?: number }) => {
  const { accessToken, refreshToken } = signTokenPair(user.id, user.email, user.tokenVersion || 1);
  await storeRefreshTokenHash(user.id, refreshToken);
  const csrfToken = crypto.randomBytes(32).toString('hex');
  setAuthCookies(res, accessToken, refreshToken, csrfToken);
};

// ─── Registration OTP ───

export const registerSendOtp = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);

  try {
    if (!email) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    // Check if user already exists — use generic response to prevent enumeration
    const [existingUsers]: any = await pool.query('SELECT id, isVerified FROM `user` WHERE email = ?', [email]);
    if (existingUsers.length > 0 && existingUsers[0].isVerified) {
      // Generic response — don't reveal account existence
      return res.json({ message: 'If this email is eligible, a verification OTP will be sent shortly.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (existingUsers.length > 0) {
      // User exists but unverified, update their OTP
      await pool.query(
        'UPDATE `user` SET emailOtp = ?, emailOtpExpiry = ?, otpAttempts = 0 WHERE email = ?',
        [hashedOtp, expiry, email]
      );
    } else {
      // New user registration step, insert placeholder record
      const id = uuidv4();
      const placeholderPassword = await bcrypt.hash(uuidv4(), 10);
      await pool.query(
        'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit, isVerified, emailOtp, emailOtpExpiry, otpAttempts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, email, placeholderPassword, 'Unverified User', 'architect', 'free', 1, false, hashedOtp, expiry, 0]
      );
    }

    if (!IS_PRODUCTION) {
      logger.info(`[DEV MODE] Verification OTP for ${email}: ${otp}`);
      console.log(`\n========================================\n[DEV MODE] OTP for ${email}: ${otp}\n========================================\n`);
    }

    try {
      const { sendOtpEmail } = require('../services/mail.service');
      await sendOtpEmail(email, otp);
    } catch (mailErr: any) {
      logger.warn('Failed to send OTP email via SMTP:', mailErr.message || mailErr);
      if (IS_PRODUCTION) {
        throw mailErr;
      }
    }

    res.json({ message: 'If this email is eligible, a verification OTP will be sent shortly.' });
  } catch (error: any) {
    logger.error('Register Send OTP Error', error);
    res.status(500).json({ message: 'Failed to send verification OTP.' });
  }
};

// ─── Registration ───

export const register = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const name = cleanText(req.body?.name, 120);
  const password = req.body?.password;
  const dob = cleanText(req.body?.dob, 30);
  const phone = cleanText(req.body?.phone, 30);
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

  try {
    if (!email || !name || !OTP_PATTERN.test(otp) || !validatePassword(password)) {
      return res.status(400).json({ message: 'Valid name, email, password, and OTP are required' });
    }

    // Verify OTP — fetch hashed OTP and compare
    const [users]: any = await pool.query(
      'SELECT id, emailOtp, emailOtpExpiry, otpAttempts, tokenVersion FROM `user` WHERE email = ? AND emailOtpExpiry > NOW()',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification OTP.' });
    }

    const user = users[0];

    // Check attempt limit
    if (user.otpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many OTP attempts. Please request a new code.' });
    }

    // Compare OTP
    const otpMatch = await bcrypt.compare(otp, user.emailOtp || '');
    if (!otpMatch) {
      await pool.query('UPDATE `user` SET otpAttempts = otpAttempts + 1 WHERE id = ?', [user.id]);
      return res.status(400).json({ message: 'Invalid or expired verification OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update unverified user with full details and verify them
    await pool.query(
      'UPDATE `user` SET name = ?, password = ?, dob = ?, phone = ?, isVerified = 1, emailOtp = NULL, emailOtpExpiry = NULL, otpAttempts = 0 WHERE email = ?',
      [name, hashedPassword, dob || null, phone || null, email]
    );

    const [updatedUsers]: any = await pool.query('SELECT id, name, email, role, tokenVersion FROM `user` WHERE email = ?', [email]);
    const updatedUser = updatedUsers[0];

    await issueAuthSession(res, { id: updatedUser.id, email: updatedUser.email, tokenVersion: updatedUser.tokenVersion });

    res.status(201).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role || 'user',
    });
  } catch (error: any) {
    logger.error('Registration Error', error);
    res.status(500).json({ message: 'Registration failed. Please try again or contact support.' });
  }
};

// ─── Login ───

export const login = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  try {
    const [users]: any = await pool.query('SELECT id, name, email, role, password, tokenVersion FROM `user` WHERE email = ?', [email]);
    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      await issueAuthSession(res, { id: user.id, email: user.email, tokenVersion: user.tokenVersion });

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    logger.error('Login Error', error);
    res.status(500).json({ message: 'Error logging in. Please check your credentials.' });
  }
};

// ─── Logout ───

export const logout = async (req: any, res: Response) => {
  try {
    // Increment token version to invalidate all existing tokens
    if (req.user?.id) {
      await pool.query(
        'UPDATE `user` SET tokenVersion = tokenVersion + 1, refreshTokenHash = NULL WHERE id = ?',
        [req.user.id]
      );
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout Error', error);
    clearAuthCookies(res);
    res.json({ message: 'Logged out.' });
  }
};

// ─── Refresh Token ───

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshTokenValue = (req as any).cookies?.refresh_token;

  if (!refreshTokenValue) {
    return res.status(401).json({ message: 'Refresh token missing.', code: 'MISSING_REFRESH_TOKEN' });
  }

  try {
    const decoded = JwtService.verifyRefreshToken(refreshTokenValue);

    // Fetch user to validate token version and current refresh token hash
    const [users]: any = await pool.query(
      'SELECT id, email, tokenVersion, refreshTokenHash FROM `user` WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = users[0];

    // Check token version matches
    if (decoded.tokenVersion !== user.tokenVersion) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session invalidated. Please log in again.', code: 'TOKEN_VERSION_MISMATCH' });
    }

    // Validate refresh token against hash stored in database (reuse detection)
    const incomingHash = hashRefreshToken(refreshTokenValue);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      logger.warn('Refresh token reuse detected. Revoking all sessions for user.', { userId: user.id });
      // Invalidate all tokens
      await pool.query(
        'UPDATE `user` SET tokenVersion = tokenVersion + 1, refreshTokenHash = NULL WHERE id = ?',
        [user.id]
      );
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Session expired or invalidated. Please log in again.', code: 'TOKEN_REUSE_DETECTED' });
    }

    // Atomic rotation: only the active hash may be replaced
    const { accessToken, refreshToken } = signTokenPair(user.id, user.email, user.tokenVersion);
    const nextHash = hashRefreshToken(refreshToken);
    const [rotationResult]: any = await pool.query(
      'UPDATE `user` SET refreshTokenHash = ? WHERE id = ? AND refreshTokenHash = ? AND tokenVersion = ?',
      [nextHash, user.id, incomingHash, user.tokenVersion]
    );

    if (!rotationResult.affectedRows) {
      await pool.query(
        'UPDATE `user` SET tokenVersion = tokenVersion + 1, refreshTokenHash = NULL WHERE id = ?',
        [user.id]
      );
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Session expired or invalidated. Please log in again.', code: 'TOKEN_REUSE_DETECTED' });
    }

    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, accessToken, refreshToken, csrfToken);

    res.json({ message: 'Token refreshed.' });
  } catch (error: any) {
    logger.warn('Refresh token verification failed', { error: error.message });
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Invalid refresh token. Please log in again.', code: 'INVALID_REFRESH_TOKEN' });
  }
};

// ─── Get Current User ───

export const getMe = async (req: any, res: Response) => {
  try {
    const [users]: any = await pool.query(
      'SELECT id, name, email, role, subStatus, createdAt FROM `user` WHERE id = ?',
      [req.user.id]
    );
    const user = users[0];
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error getting user profile' });
  }
};

// ─── Forgot Password ───

export const forgotPassword = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.json({ message: 'If an account exists with this email, you will receive an OTP shortly.' });
  }

  try {
    const [users]: any = await pool.query('SELECT id FROM `user` WHERE email = ?', [email]);
    if (users.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: 'If an account exists with this email, you will receive an OTP shortly.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      'UPDATE `user` SET resetOtp = ?, resetOtpExpiry = ?, otpAttempts = 0 WHERE email = ?',
      [hashedOtp, expiry, email]
    );

    if (!IS_PRODUCTION) {
      logger.info(`[DEV MODE] Password Reset OTP for ${email}: ${otp}`);
      console.log(`\n========================================\n[DEV MODE] Reset OTP for ${email}: ${otp}\n========================================\n`);
    }

    try {
      const { sendOtpEmail } = require('../services/mail.service');
      await sendOtpEmail(email, otp);
    } catch (mailErr: any) {
      logger.warn('Failed to send reset OTP email via SMTP:', mailErr.message || mailErr);
      if (IS_PRODUCTION) {
        throw mailErr;
      }
    }

    res.json({ message: 'If an account exists with this email, you will receive an OTP shortly.' });
  } catch (error) {
    logger.error('Forgot Password Error', error);
    res.status(500).json({ message: 'Failed to process request.' });
  }
};

// ─── Reset Password ───

export const resetPassword = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  const newPassword = req.body?.newPassword;

  if (!email || !OTP_PATTERN.test(otp) || !validatePassword(newPassword)) {
    return res.status(400).json({ message: 'Invalid or expired OTP.' });
  }

  try {
    const [users]: any = await pool.query(
      'SELECT id, resetOtp, resetOtpExpiry, otpAttempts FROM `user` WHERE email = ? AND resetOtpExpiry > NOW()',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const user = users[0];

    if (user.otpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many OTP attempts. Please request a new code.' });
    }

    const otpMatch = await bcrypt.compare(otp, user.resetOtp || '');
    if (!otpMatch) {
      await pool.query('UPDATE `user` SET otpAttempts = otpAttempts + 1 WHERE id = ?', [user.id]);
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE `user` SET password = ?, tokenVersion = tokenVersion + 1, refreshTokenHash = NULL, resetOtp = NULL, resetOtpExpiry = NULL, otpAttempts = 0 WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    logger.error('Reset Password Error', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

// ─── Google OAuth ───

export const googleAuthRedirect = async (req: Request, res: Response) => {
  try {
    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(503).json({ message: 'Google OAuth is not configured.' });
    }

    const { redirectUri, frontendUrl } = getOAuthUrls(req);

    // Generate OAuth state to prevent CSRF
    const state = crypto.randomBytes(32).toString('hex');
    res.cookie('oauth_state', state, {
      ...baseCookieOptions('/', req),
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email&state=${state}`;
    
    res.redirect(authUrl);
  } catch (err: any) {
    logger.error('Google Auth Redirect error', { message: err?.message, stack: err?.stack });
    const { frontendUrl } = getOAuthUrls(req);
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err?.message || 'Failed to initialize Google login')}`);
  }
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const { redirectUri, frontendUrl } = getOAuthUrls(req);

  // Validate OAuth state
  const savedState = (req as any).cookies?.oauth_state;
  if (!state || !savedState || state !== savedState) {
    return res.redirect(`${frontendUrl}/login?error=Invalid+OAuth+state.+Please+try+again.`);
  }
  // Clear state cookie
  res.clearCookie('oauth_state', baseCookieOptions('/'));

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=Google+authentication+failed`);
  }

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/login?error=Google+OAuth+not+configured`);
  }

  try {
    const axios = require('axios');

    // 1. Exchange OAuth authorization code for Access Token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenRes.data;

    // 2. Fetch User Profile using Access Token
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = normalizeEmail(userRes.data?.email);
    const name = cleanText(userRes.data?.name, 120) || 'Google User';

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=Google+did+not+return+an+email+address`);
    }

    // 3. Find or Create User in RDS MySQL Database
    const [existingUsers]: any = await pool.query('SELECT id, email, name, provider, isVerified, tokenVersion FROM `user` WHERE email = ?', [email]);
    let user = existingUsers[0];

    if (!user) {
      const id = uuidv4();
      const randomPassword = await bcrypt.hash(uuidv4(), 10);
      await pool.query(
        'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit, isVerified, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, email, randomPassword, name || 'Google User', 'architect', 'free', 1, true, 'google']
      );
      const [newUsers]: any = await pool.query('SELECT id, email, name, tokenVersion FROM `user` WHERE email = ?', [email]);
      user = newUsers[0];
    } else {
      if (user.provider !== 'google') {
        await pool.query('UPDATE `user` SET provider = ? WHERE email = ?', ['google', email]);
      }
      if (!user.isVerified) {
        await pool.query('UPDATE `user` SET isVerified = 1 WHERE email = ?', [email]);
      }
    }

    // 4. Set JWT in HttpOnly cookies — NEVER in URL
    await issueAuthSession(res, { id: user.id, email: user.email, tokenVersion: user.tokenVersion });

    // Redirect to dashboard with minimal, non-sensitive user info
    res.redirect(`${frontendUrl}/dashboard?oauth=success`);

  } catch (error: any) {
    const errorDetail = error?.response?.data?.error_description || error?.response?.data?.error || error?.message || 'Google login failed';
    logger.error('Google OAuth Error', {
      message: error?.message,
      detail: errorDetail,
      data: error?.response?.data,
      redirectUri,
    });
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorDetail)}`);
  }
};

export const debugGoogleConfig = async (req: Request, res: Response) => {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const { redirectUri, frontendUrl } = getOAuthUrls(req);

  if (!clientId || !clientSecret) {
    return res.json({
      configured: false,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri,
    });
  }

  try {
    const axios = require('axios');
    await axios.post('https://oauth2.googleapis.com/token', {
      code: 'probe_check_dummy',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    return res.json({ status: 'unexpected_success' });
  } catch (err: any) {
    const status = err.response?.status;
    const error = err.response?.data?.error;
    const errorDescription = err.response?.data?.error_description;
    return res.json({
      configured: true,
      clientIdPrefix: clientId.substring(0, 15) + '...',
      clientSecretPrefix: clientSecret.substring(0, 8) + '...',
      googleStatus: status,
      googleError: error,
      googleDescription: errorDescription,
      isSecretValid: error !== 'invalid_client',
      redirectUri,
      frontendUrl,
      host: req.headers.host,
    });
  }
};
