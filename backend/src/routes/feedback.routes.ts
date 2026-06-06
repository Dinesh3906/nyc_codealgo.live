import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.middleware';
import { sendFeedbackEmail } from '../services/mail.service';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

router.post('/submit', protect, (req, res, next) => {
  console.log('[DEBUG] Incoming feedback submission...');
  next();
}, upload.array('images', 3), async (req: any, res) => {
  try {
    console.log('[DEBUG] Body:', req.body);
    console.log('[DEBUG] Files received:', req.files?.length || 0);
    const { type, subject, message } = req.body;
    const { id: userId, email: userEmail, name: userName } = req.user;
    const files = req.files as Express.Multer.File[];

    // Ensure table exists with images column
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        type VARCHAR(50),
        subject VARCHAR(255),
        message TEXT,
        images TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Check if images column exists (in case table was created without it)
    try {
      await pool.query('SELECT images FROM feedback LIMIT 1');
    } catch (e) {
      await pool.query('ALTER TABLE feedback ADD COLUMN images TEXT AFTER message');
    }

    const imageUrls = files.map(file => `/uploads/feedback/${file.filename}`);
    const imagesJson = JSON.stringify(imageUrls);
    console.log(`[FEEDBACK] Received ${files.length} images. JSON: ${imagesJson}`);

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
    console.error('Feedback submission error:', error);
    res.status(500).json({ 
      message: 'Failed to send feedback', 
      error: error.message 
    });
  }
});

router.get('/', protect, async (req: any, res) => {
  try {
    if (req.user.email !== 'chalams115@gmail.com' && req.user.email !== 'sathvi2018@gmail.com') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        type VARCHAR(50),
        subject VARCHAR(255),
        message TEXT,
        images TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    const [feedbacks]: any = await pool.query(
      'SELECT f.*, u.name as userName, u.email as userEmail FROM feedback f LEFT JOIN user u ON f.userId = u.id ORDER BY f.createdAt DESC'
    );

    // Parse images JSON for each feedback safely
    const formattedFeedbacks = feedbacks.map((fb: any) => {
      let parsedImages = [];
      try {
        parsedImages = fb.images ? JSON.parse(fb.images) : [];
      } catch (e) {
        console.warn(`[FEEDBACK] Failed to parse images for feedback ${fb.id}:`, fb.images);
      }
      return {
        ...fb,
        images: parsedImages
      };
    });

    console.log(`[ADMIN] Fetched ${formattedFeedbacks.length} feedbacks.`);
    res.json(formattedFeedbacks);
  } catch (error: any) {
    console.error('Fetch feedback error details:', error);
    res.status(500).json({ message: 'Failed to fetch feedbacks', error: error.message });
  }
});

export default router;
