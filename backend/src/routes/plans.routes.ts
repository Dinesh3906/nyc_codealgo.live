import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { protect } from '../middleware/auth.middleware';
import { checkUsageLimit } from '../middleware/usage.middleware';
import { CompliancePipeline } from '../services/compliance.service';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../app';

const router = Router();

// Ensure uploads directory exists
if (!fs.existsSync('uploads/')) {
  fs.mkdirSync('uploads/', { recursive: true });
}

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.dwg', '.dxf'];
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'image/vnd.dwg',
      'image/x-dwg',
      'application/dxf',
      'application/x-dxf',
      'image/vnd.dxf',
      'text/x-dxf',
      'text/dxf',
      'application/octet-stream'
    ];
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Images (PNG/JPG), and AutoCAD (DWG/DXF) are allowed.'));
    }
  }
});

router.post('/upload', protect, (req: any, res: any) => {
  upload.single('plan')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Now check usage limit AFTER file is uploaded
    return checkUsageLimit(req, res, async () => {
      const { id: userId } = req.user;
      const filePath = req.file.path;
      const fileName = req.file.originalname;

      try {
        // Create DB entry (status: processing)
        const planId = uuidv4();
        await pool.query(
          'INSERT INTO `plan` (id, userId, fileName, fileUrl, status) VALUES (?, ?, ?, ?, ?)',
          [planId, userId, fileName, filePath, 'processing']
        );

        const plan = { id: planId };

        // START ASYNC BACKGROUND PROCESS
        setImmediate(async () => {
          try {
            await CompliancePipeline.run(plan.id, filePath, req.file.mimetype);
          } catch (err) {
            console.error("Pipeline error:", err);
            await pool.query('UPDATE `plan` SET status = ? WHERE id = ?', ['failed', plan.id]);
            io.emit('analysis-status', { planId: plan.id, status: 'FAILED', error: "Scan processing failed." });
          }
        });

        res.status(202).json({ 
          message: 'Plan uploaded successfully. AI analysis started.', 
          planId: plan.id 
        });

      } catch (error) {
        res.status(500).json({ message: 'Upload error', error });
      }
    });
  });
});

// GET all plans for user
router.get('/', protect, async (req: any, res) => {
  const [plans]: any = await pool.query(
    "SELECT id, fileName, status, analysisResult, createdAt FROM `plan` WHERE userId = ? AND COALESCE(fileUrl, '') <> '' ORDER BY createdAt DESC",
    [req.user.id]
  );
  const parsedPlans = plans.map((p: any) => {
    let result = p.analysisResult;
    let depth = 0;
    while (typeof result === 'string' && depth < 5) {
      try { result = JSON.parse(result); } catch(e) { break; }
      depth++;
    }
    if (typeof result !== 'object' || result === null) result = {};
    return { ...p, analysisResult: result };
  });
  res.json(parsedPlans);
});

// GET single plan by ID
router.get('/:id', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT * FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
       return res.status(404).json({ message: 'Plan not found' });
    }

    let result = plan.analysisResult;
    let depth = 0;
    while (typeof result === 'string' && depth < 5) {
      try { result = JSON.parse(result); } catch(e) { break; }
      depth++;
    }
    if (typeof result !== 'object' || result === null) result = {};
    plan.analysisResult = result;

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plan' });
  }
});

// GET download plan file securely with user ownership check
router.get('/:id/download', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT * FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
       return res.status(404).json({ message: 'Plan not found' });
    }

    const absolutePath = path.resolve(plan.fileUrl);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Plan file not found on server.' });
    }

    res.sendFile(absolutePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading plan file.' });
  }
});

// PATCH update plan analysis result (resolve issues)
router.patch('/:id', protect, async (req: any, res) => {
  try {
    const { analysisResult } = req.body;
    const [existingPlans]: any = await pool.query(
      "SELECT * FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const existingPlan = existingPlans[0];
    if (!existingPlan || existingPlan.userId !== req.user.id) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await pool.query(
      'UPDATE `plan` SET analysisResult = ? WHERE id = ?',
      [JSON.stringify(analysisResult), req.params.id]
    );
    const [plans]: any = await pool.query(
      "SELECT * FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error updating plan' });
  }
});

// DELETE a plan
router.delete('/:id', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT * FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
       return res.status(404).json({ message: 'Plan not found' });
    }

    // Remove file from disk, but keep the DB row for strict monthly quota accounting.
    if (plan.fileUrl && fs.existsSync(plan.fileUrl)) {
      try {
        fs.unlinkSync(plan.fileUrl);
      } catch {
        // Ignore file cleanup failures.
      }
    }

    await pool.query('UPDATE `plan` SET fileUrl = ? WHERE id = ?', ['', req.params.id]);

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting plan' });
  }
});

export default router;
