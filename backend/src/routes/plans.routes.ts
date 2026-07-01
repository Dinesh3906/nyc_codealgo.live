import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { protect } from '../middleware/auth.middleware';
import { checkUsageLimit } from '../middleware/usage.middleware';
import { validatePdfFile, sanitizeFilename } from '../middleware/input-validation.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { CompliancePipeline } from '../services/compliance.service';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../app';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'plans-routes' });
const router = Router();

// Ensure uploads directory exists
if (!fs.existsSync('uploads/')) {
  fs.mkdirSync('uploads/', { recursive: true });
}

// Multer Storage Config — UUID filenames prevent path traversal and information leakage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (was 1GB)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf'];
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  }
});

// DEBUG ENDPOINT REMOVED — was unauthenticated, exposed plan data

router.post('/count-pages', protect, upload.single('plan'), validatePdfFile, async (req: any, res: any) => {
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
        const { PDFDocument } = require('pdf-lib');
        const pdfDoc = await PDFDocument.load(dataBuffer, { 
          ignoreEncryption: true,
          throwOnInvalidObject: false 
        });
        pages = pdfDoc.getPageCount() || 1;
      } catch (pdfLibErr) {
        logger.warn('pdf-lib failed, trying pdf-parse fallback');
        try {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(dataBuffer);
          pages = Number(pdfData.numpages) || 1;
        } catch (pdfParseErr) {
          logger.warn('pdf-parse failed, trying regex catalog fallback');
          try {
            const pdfString = dataBuffer.toString('binary');
            const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
            if (pageMatches && pageMatches.length > 0) {
              pages = pageMatches.length;
            } else {
              pages = 1;
            }
          } catch (regexErr) {
            logger.error('All counting methods failed', regexErr);
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
    logger.error('Failed to count pages', err);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    res.json({ pages: 1 });
  }
});

router.post('/upload', protect, uploadLimiter, (req: any, res: any) => {
  upload.single('plan')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 25MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate PDF magic bytes
    return validatePdfFile(req, res, async () => {
      // Now check usage limit AFTER file is uploaded and validated
      return checkUsageLimit(req, res, async () => {
        const { id: userId } = req.user;
        const filePath = req.file.path;
        const fileName = sanitizeFilename(req.file.originalname);

        let selectedSteps: string[] | undefined = undefined;
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

        try {
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
          logger.error('Upload DB error', error);
          res.status(500).json({ message: 'Upload error' });
        }
      });
    });
  });
});

// GET all plans for user — explicit columns (no SELECT *)
router.get('/', protect, async (req: any, res) => {
  try {
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
  } catch (error) {
    logger.error('Error fetching plans', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
});

// GET single plan by ID — explicit columns (no SELECT *)
router.get('/:id', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT id, userId, fileName, status, analysisResult, pages, mimetype, selectedSteps, createdAt FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Remove userId from response (not needed by client)
    delete plan.userId;

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
    logger.error('Error fetching plan', error);
    res.status(500).json({ message: 'Error fetching plan' });
  }
});

// GET download plan file securely with ownership check + path traversal guard
router.get('/:id/download', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT id, userId, fileUrl, fileName FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const absolutePath = path.resolve(plan.fileUrl);
    // Path traversal guard: ensure file is within uploads directory
    const uploadsDir = path.resolve('uploads');
    const relativePath = path.relative(uploadsDir, absolutePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Plan file not found on server.' });
    }

    res.sendFile(absolutePath);
  } catch (error) {
    logger.error('Download error', error);
    res.status(500).json({ message: 'Error downloading plan file.' });
  }
});

// PATCH update plan — only allow specific field updates, NOT full analysisResult replacement
router.patch('/:id', protect, async (req: any, res) => {
  try {
    const { resolvedIssueIds } = req.body;
    
    const [existingPlans]: any = await pool.query(
      "SELECT id, userId, analysisResult FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const existingPlan = existingPlans[0];
    if (!existingPlan || existingPlan.userId !== req.user.id) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Only allow marking specific issues as resolved (not full report replacement)
    if (resolvedIssueIds && Array.isArray(resolvedIssueIds)) {
      let currentResult = existingPlan.analysisResult;
      let depth = 0;
      while (typeof currentResult === 'string' && depth < 5) {
        try { currentResult = JSON.parse(currentResult); } catch (e) { break; }
        depth++;
      }
      if (typeof currentResult !== 'object' || currentResult === null) currentResult = {};

      // Mark resolved issues
      if (!currentResult.resolvedIssueIds) {
        currentResult.resolvedIssueIds = [];
      }
      currentResult.resolvedIssueIds = [...new Set([...currentResult.resolvedIssueIds, ...resolvedIssueIds])];

      await pool.query(
        'UPDATE `plan` SET analysisResult = ? WHERE id = ?',
        [JSON.stringify(currentResult), req.params.id]
      );
    }

    const [plans]: any = await pool.query(
      "SELECT id, fileName, status, analysisResult, createdAt FROM `plan` WHERE id = ?",
      [req.params.id]
    );
    res.json(plans[0]);
  } catch (error) {
    logger.error('Error updating plan', error);
    res.status(500).json({ message: 'Error updating plan' });
  }
});

// DELETE a plan
router.delete('/:id', protect, async (req: any, res) => {
  try {
    const [plans]: any = await pool.query(
      "SELECT id, userId, fileUrl FROM `plan` WHERE id = ? AND COALESCE(fileUrl, '') <> ''",
      [req.params.id]
    );
    const plan = plans[0];

    if (!plan || plan.userId !== req.user.id) {
      return res.status(404).json({ message: 'Plan not found' });
    }

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
    logger.error('Error deleting plan', error);
    res.status(500).json({ message: 'Error deleting plan' });
  }
});

export default router;
