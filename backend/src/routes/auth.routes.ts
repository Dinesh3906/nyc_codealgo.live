import { Router } from 'express';
import { login, register, registerSendOtp, getMe, forgotPassword, resetPassword, googleAuthRedirect, googleAuthCallback } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);
router.post('/register-send-otp', registerSendOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

export default router;
