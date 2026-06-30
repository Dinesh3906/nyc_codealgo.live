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
  limits: { fileSize: 35 * 1024 * 1024 }, // 35MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf'];
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  }
});

router.get('/debug-list', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT id, userId, fileName, status, analysisResult, createdAt FROM plan ORDER BY createdAt DESC LIMIT 3');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});


router.post('/count-pages', protect, upload.single('plan'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();

  try {
    let pages = 1;
    if (fileExt === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      
      try {
        // Method 1: pdf-lib (robust, fast, ignores encryption/corrupt segments)
        const { PDFDocument } = require('pdf-lib');
        const pdfDoc = await PDFDocument.load(dataBuffer, { 
          ignoreEncryption: true,
          throwOnInvalidObject: false 
        });
        pages = pdfDoc.getPageCount() || 1;
      } catch (pdfLibErr) {
        console.warn('[CountPages] pdf-lib failed, trying pdf-parse fallback...', pdfLibErr);
        try {
          // Method 2: pdf-parse
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(dataBuffer);
          pages = Number(pdfData.numpages) || 1;
        } catch (pdfParseErr) {
          console.warn('[CountPages] pdf-parse failed, trying regex catalog fallback...', pdfParseErr);
          try {
            // Method 3: Regex match of PDF pages catalog (very fast and immune to structure errors)
            const pdfString = dataBuffer.toString('binary');
            const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
            if (pageMatches && pageMatches.length > 0) {
              pages = pageMatches.length;
            } else {
              pages = 1;
            }
          } catch (regexErr) {
            console.error('[CountPages] All counting methods failed:', regexErr);
            pages = 1;
          }
        }
      }
    }

    // Clean up file immediately
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ pages });
  } catch (err) {
    console.error('Failed to count pages on backend:', err);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    // Return 200 with pages: 1 as the ultimate safe fallback instead of throwing a blocking 500 error
    res.json({ pages: 1 });
  }
});

router.post('/upload', protect, (req: any, res: any) => {
  upload.single('plan')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 35MB.' });
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

      let selectedSteps: string[] | undefined = undefined;
      console.log("[UPLOAD ROUTE] req.body.steps:", req.body.steps);
      console.log("[UPLOAD ROUTE] typeof req.body.steps:", typeof req.body.steps);
      if (req.body.steps) {
        try {
          const parsed = JSON.parse(req.body.steps);
          if (Array.isArray(parsed)) {
            selectedSteps = parsed.map((s: any) => String(s));
          }
        } catch (e) {
          if (typeof req.body.steps === 'string') {
            selectedSteps = req.body.steps.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }
      console.log("[UPLOAD ROUTE] parsed selectedSteps:", selectedSteps);

      try {
        // Create DB entry (status: queued)
        const planId = uuidv4();
        await pool.query(
          'INSERT INTO `plan` (id, userId, fileName, fileUrl, status, pages, mimetype, selectedSteps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            planId,
            userId,
            fileName,
            filePath,
            'queued',
            req.filePages || 1,
            req.file.mimetype,
            selectedSteps ? JSON.stringify(selectedSteps) : null
          ]
        );

        res.status(202).json({
          message: 'Plan uploaded successfully. AI analysis queued.',
          planId: planId
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
      try { result = JSON.parse(result); } catch (e) { break; }
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
      try { result = JSON.parse(result); } catch (e) { break; }
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
