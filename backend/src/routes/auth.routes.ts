import { Router } from 'express';
import { login, register, registerSendOtp, getMe, forgotPassword, resetPassword, googleAuthRedirect, googleAuthCallback, logout, refreshAccessToken } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);
router.post('/register-send-otp', authLimiter, registerSendOtp);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', protect, getMe);

export default router;
