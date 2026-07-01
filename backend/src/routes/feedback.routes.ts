import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.middleware';
import { sendFeedbackEmail } from '../services/mail.service';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'feedback-routes' });
const router = Router();

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/feedback');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, JPEG and WEBP image files are allowed.'));
    }
  }
});

router.post('/submit', protect, upload.array('images', 3), async (req: any, res) => {
  try {
    const { type, subject, message } = req.body;
    const { id: userId, email: userEmail, name: userName } = req.user;
    const files = req.files as Express.Multer.File[];

    if (!type || !subject || !message) {
      return res.status(400).json({ message: 'Type, subject, and message are required.' });
    }

    const imageUrls = files.map(file => `/uploads/feedback/${file.filename}`);
    const imagesJson = JSON.stringify(imageUrls);
    
    logger.info('Feedback submission received', { userId, imageCount: files.length });

    // Save to DB
    const feedbackId = uuidv4();
    await pool.query(
      'INSERT INTO `feedback` (id, userId, type, subject, message, images) VALUES (?, ?, ?, ?, ?, ?)',
      [feedbackId, userId, type, subject, message, imagesJson]
    );

    // Send Email (using memory storage-like attachments from files)
    await sendFeedbackEmail({
      type,
      subject,
      message,
      userEmail,
      userName,
      attachments: files.map(f => ({
        filename: f.originalname,
        content: fs.readFileSync(f.path)
      }))
    });

    res.json({ message: 'Feedback sent successfully' });
  } catch (error: any) {
    logger.error('Feedback submission error', error);
    res.status(500).json({ 
      message: 'Failed to send feedback'
    });
  }
});

router.get('/', protect, async (req: any, res) => {
  try {
    if (req.user.email !== 'chalams115@gmail.com' && req.user.email !== 'sathvi2018@gmail.com') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const [feedbacks]: any = await pool.query(
      'SELECT f.id, f.userId, f.type, f.subject, f.message, f.images, f.createdAt, u.name as userName, u.email as userEmail FROM feedback f LEFT JOIN user u ON f.userId = u.id ORDER BY f.createdAt DESC'
    );

    // Parse images JSON for each feedback safely
    const formattedFeedbacks = feedbacks.map((fb: any) => {
      let parsedImages = [];
      try {
        parsedImages = fb.images ? JSON.parse(fb.images) : [];
      } catch (e) {
        logger.warn(`Failed to parse images for feedback ${fb.id}`, { images: fb.images });
      }
      return {
        id: fb.id,
        userId: fb.userId,
        type: fb.type,
        subject: fb.subject,
        message: fb.message,
        images: parsedImages,
        createdAt: fb.createdAt,
        userName: fb.userName,
        userEmail: fb.userEmail
      };
    });

    logger.info('Admin fetched feedbacks', { count: formattedFeedbacks.length });
    res.json(formattedFeedbacks);
  } catch (error: any) {
    logger.error('Fetch feedback error details', error);
    res.status(500).json({ message: 'Failed to fetch feedbacks' });
  }
});

export default router;
