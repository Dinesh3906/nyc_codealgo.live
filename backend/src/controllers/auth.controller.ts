import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { JwtService } from '../services/jwt.service';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'auth-controller' });

// ─── Cookie Configuration ───

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. '.codealgo.live'
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth', // Only sent to auth endpoints
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { domain: COOKIE_DOMAIN, path: '/' });
  res.clearCookie('refresh_token', { domain: COOKIE_DOMAIN, path: '/api/auth' });
}

// ─── Helpers ───

const generateTokens = (id: string, email: string, tokenVersion: number) => {
  const accessToken = JwtService.signUserToken(id, email, tokenVersion);
  const refreshToken = JwtService.signRefreshToken(id, email, tokenVersion);
  return { accessToken, refreshToken };
};

// ─── Registration OTP ───

export const registerSendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
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

    const { sendOtpEmail } = require('../services/mail.service');
    await sendOtpEmail(email, otp);

    res.json({ message: 'If this email is eligible, a verification OTP will be sent shortly.' });
  } catch (error: any) {
    logger.error('Register Send OTP Error', error);
    res.status(500).json({ message: 'Failed to send verification OTP.' });
  }
};

// ─── Registration ───

export const register = async (req: Request, res: Response) => {
  const { name, email, password, dob, phone, otp } = req.body;

  try {
    if (!email || !password || !name || !otp) {
      return res.status(400).json({ message: 'All fields and OTP are required' });
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

    const [updatedUsers]: any = await pool.query('SELECT id, name, email, tokenVersion FROM `user` WHERE email = ?', [email]);
    const updatedUser = updatedUsers[0];

    const { accessToken, refreshToken } = generateTokens(updatedUser.id, updatedUser.email, updatedUser.tokenVersion || 1);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (error: any) {
    logger.error('Registration Error', error);
    res.status(500).json({ message: 'Registration failed. Please try again or contact support.' });
  }
};

// ─── Login ───

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const [users]: any = await pool.query('SELECT id, name, email, password, tokenVersion FROM `user` WHERE email = ?', [email]);
    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.tokenVersion || 1);
      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
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
      await pool.query('UPDATE `user` SET tokenVersion = tokenVersion + 1 WHERE id = ?', [req.user.id]);
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

    // Fetch user to validate token version
    const [users]: any = await pool.query(
      'SELECT id, email, tokenVersion FROM `user` WHERE id = ?',
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

    // Issue new tokens (rotation)
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.tokenVersion);
    setAuthCookies(res, accessToken, refreshToken);

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
  const { email } = req.body;

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

    const { sendOtpEmail } = require('../services/mail.service');
    await sendOtpEmail(email, otp);

    res.json({ message: 'If an account exists with this email, you will receive an OTP shortly.' });
  } catch (error) {
    logger.error('Forgot Password Error', error);
    res.status(500).json({ message: 'Failed to process request.' });
  }
};

// ─── Reset Password ───

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

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
      'UPDATE `user` SET password = ?, tokenVersion = tokenVersion + 1, resetOtp = NULL, resetOtpExpiry = NULL, otpAttempts = 0 WHERE email = ?',
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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Google OAuth is not configured.' });
  }

  const isLocal = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
  const redirectUri = isLocal
    ? 'http://localhost:5000/api/auth/google/callback'
    : 'https://api-permitiq.codealgo.live/api/auth/google/callback';

  // Generate OAuth state to prevent CSRF
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email&state=${state}`;
  
  res.redirect(authUrl);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const isLocal = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
  const redirectUri = isLocal
    ? 'http://localhost:5000/api/auth/google/callback'
    : 'https://api-permitiq.codealgo.live/api/auth/google/callback';
  const frontendUrl = isLocal ? 'http://localhost:3000' : 'https://permitiq.codealgo.live';

  // Validate OAuth state
  const savedState = (req as any).cookies?.oauth_state;
  if (!state || !savedState || state !== savedState) {
    return res.redirect(`${frontendUrl}/login?error=Invalid+OAuth+state.+Please+try+again.`);
  }
  // Clear state cookie
  res.clearCookie('oauth_state', { path: '/' });

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=Google+authentication+failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

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

    const { email, name } = userRes.data;

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
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.tokenVersion || 1);
    setAuthCookies(res, accessToken, refreshToken);

    // Redirect to dashboard with minimal, non-sensitive user info
    res.redirect(`${frontendUrl}/dashboard?oauth=success&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);

  } catch (error: any) {
    logger.error('Google OAuth Error', error);
    res.redirect(`${frontendUrl}/login?error=Google+login+failed`);
  }
};
