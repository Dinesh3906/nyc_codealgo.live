import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { JwtService } from '../services/jwt.service';

const generateToken = (id: string, email: string, tokenVersion: number = 1) => {
  return JwtService.signUserToken(id, email, tokenVersion);
};

export const registerSendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const [existingUsers]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    if (existingUsers.length > 0 && existingUsers[0].isVerified) {
      return res.status(400).json({ message: 'User already exists and is verified' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (existingUsers.length > 0) {
      // User exists but unverified, update their OTP
      await pool.query(
        'UPDATE `user` SET emailOtp = ?, emailOtpExpiry = ? WHERE email = ?',
        [otp, expiry, email]
      );
    } else {
      // New user registration step, insert placeholder record
      const id = uuidv4();
      const placeholderPassword = await bcrypt.hash(uuidv4(), 10); // temporary password placeholder
      await pool.query(
        'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit, isVerified, emailOtp, emailOtpExpiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, email, placeholderPassword, 'Unverified User', 'architect', 'free', 1, false, otp, expiry]
      );
    }

    const { sendOtpEmail } = require('../services/mail.service');
    await sendOtpEmail(email, otp);

    res.json({ message: 'Verification OTP sent successfully to your email.' });
  } catch (error: any) {
    console.error('Register Send OTP Error:', error);
    res.status(500).json({ message: 'Failed to send verification OTP.' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password, dob, phone, otp } = req.body;

  try {
    if (!email || !password || !name || !otp) {
      return res.status(400).json({ message: 'All fields and OTP are required' });
    }

    // Verify OTP
    const [users]: any = await pool.query(
      'SELECT * FROM `user` WHERE email = ? AND emailOtp = ? AND emailOtpExpiry > NOW()',
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update unverified user with full details and verify them
    await pool.query(
      'UPDATE `user` SET name = ?, password = ?, dob = ?, phone = ?, isVerified = 1, emailOtp = NULL, emailOtpExpiry = NULL WHERE email = ?',
      [name, hashedPassword, dob || null, phone || null, email]
    );

    const [updatedUsers]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    const user = updatedUsers[0];

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id, user.email, user.tokenVersion),
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        message: 'AWS RDS connection refused. Please verify that your database instance is running and your current IP is whitelisted.',
        error: error.message 
      });
    }
    
    // Check if it's a database error
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ 
        message: 'Database error. Please ensure the database is accessible and the user table is correctly set up.', 
        error: error.message 
      });
    }

    res.status(500).json({ 
      message: 'Registration failed. Please try again or contact support.', 
      error: 'Registration error' 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const [users]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id, user.email, user.tokenVersion),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login Error:', error);
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        message: 'AWS RDS connection refused. Please verify that your database instance is running and your current IP is whitelisted.',
        error: error.message 
      });
    }
    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Please check your DB settings.', 
        error: error.message 
      });
    }
    res.status(500).json({ 
      message: 'Error logging in. Please check your credentials.', 
      error: 'Login error' 
    });
  }
};

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

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const [users]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    if (users.length === 0) {
      // Security: Don't reveal if user exists, but we can't send email. 
      // For this specific app, we'll return success to prevent email enumeration.
      return res.json({ message: 'If an account exists with this email, you will receive an OTP shortly.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      'UPDATE `user` SET resetOtp = ?, resetOtpExpiry = ? WHERE email = ?',
      [otp, expiry, email]
    );

    const { sendOtpEmail } = require('../services/mail.service');
    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Failed to process request.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  try {
    const [users]: any = await pool.query(
      'SELECT * FROM `user` WHERE email = ? AND resetOtp = ? AND resetOtpExpiry > NOW()',
      [email, otp]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE `user` SET password = ?, tokenVersion = tokenVersion + 1, resetOtp = NULL, resetOtpExpiry = NULL WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

export const googleAuthRedirect = async (req: Request, res: Response) => {
  const isLocal = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
  const redirectUri = isLocal
    ? 'http://localhost:5000/api/auth/google/callback'
    : 'https://api.permitiq.live/api/auth/google/callback';

  const clientId = '782344767987-5kvji7i83jmo6qq0m1r59vpbns0elu62.apps.googleusercontent.com';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email`;
  
  res.redirect(authUrl);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  const isLocal = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
  const redirectUri = isLocal
    ? 'http://localhost:5000/api/auth/google/callback'
    : 'https://api.permitiq.live/api/auth/google/callback';
  const frontendUrl = isLocal ? 'http://localhost:3000' : 'https://nyccodes.permitiq.live';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=Google authentication failed`);
  }

  try {
    const clientId = '782344767987-5kvji7i83jmo6qq0m1r59vpbns0elu62.apps.googleusercontent.com';
    const clientSecret = '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';

    // 1. Exchange OAuth authorization code for Access Token
    const axios = require('axios');
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
      return res.redirect(`${frontendUrl}/login?error=Google did not return an email address`);
    }

    // 3. Find or Create User in RDS MySQL Database
    const [existingUsers]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
    let user = existingUsers[0];

    if (!user) {
      // User doesn't exist, create account
      const id = uuidv4();
      const randomPassword = await bcrypt.hash(uuidv4(), 10);
      await pool.query(
        'INSERT INTO `user` (id, email, password, name, role, subStatus, scanLimit, isVerified, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, email, randomPassword, name || 'Google User', 'architect', 'free', 1, true, 'google']
      );
      const [newUsers]: any = await pool.query('SELECT * FROM `user` WHERE email = ?', [email]);
      user = newUsers[0];
    } else {
      if (user.provider !== 'google') {
        await pool.query('UPDATE `user` SET provider = ? WHERE email = ?', ['google', email]);
        user.provider = 'google';
      }
      if (!user.isVerified) {
        // Mark existing unverified placeholder user as verified
        await pool.query('UPDATE `user` SET isVerified = 1 WHERE email = ?', [email]);
      }
    }

    // 4. Generate JWT and redirect back to frontend dashboard!
    const token = generateToken(user.id, user.email, user.tokenVersion);
    res.redirect(`${frontendUrl}/dashboard?token=${token}&id=${user.id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);

  } catch (error: any) {
    console.error('Google OAuth Error:', error);
    res.redirect(`${frontendUrl}/login?error=Google login failed due to a database or network error`);
  }
};
