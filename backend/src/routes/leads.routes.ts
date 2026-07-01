import { Router } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware';
import { Logger } from '../services/logger';

const router = Router();
const logger = new Logger({ stage: 'leads-routes' });

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many lead submissions. Please try again later.' },
});

router.use(leadLimiter);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{7,30}$/;
const ALLOWED_PROJECT_TYPES = new Set(['residential', 'commercial']);

const cleanText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
};

const optionalCleanText = (value: unknown, maxLength: number, fallback: string | null = null): string | null => {
  if (value === undefined || value === null || value === '') return fallback;
  return cleanText(value, maxLength);
};

// POST new lead
router.post('/', async (req, res) => {
  const { name, email, organization } = req.body;

  const safeName = cleanText(name, 120);
  const safeEmail = cleanText(email, 254)?.toLowerCase();
  const safeOrganization = optionalCleanText(organization, 160, 'Independent');

  if (!safeName || !safeEmail || !EMAIL_PATTERN.test(safeEmail) || !safeOrganization) {
    return res.status(400).json({ message: 'Valid name and email are required' });
  }

  try {
    const newLeadId = uuidv4();
    await pool.query(
      'INSERT INTO `lead` (id, name, email, organization) VALUES (?, ?, ?, ?)',
      [newLeadId, safeName, safeEmail, safeOrganization]
    );

    res.status(201).json({ success: true, message: 'Lead captured successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
       // Unique constraint check if needed, though email isn't strictly unique in schema
       return res.status(400).json({ message: 'Lead already exists' });
    }
    logger.error('Lead creation error', error);
    res.status(500).json({ message: 'Failed to capture lead' });
  }
});

// POST user submits a contractor lead
router.post('/submit-lead', protect, async (req: any, res) => {
  const { phone, description, projectType } = req.body;

  const safePhone = cleanText(phone, 30);
  const safeDescription = cleanText(description, 2000);
  const safeProjectType = typeof projectType === 'string' && ALLOWED_PROJECT_TYPES.has(projectType)
    ? projectType
    : 'residential';

  if (!safePhone || !PHONE_PATTERN.test(safePhone) || !safeDescription) {
    return res.status(400).json({ message: 'Valid phone and description are required' });
  }

  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO contractor_lead (id, userId, phone, description, projectType) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, safePhone, safeDescription, safeProjectType]
    );

    res.status(201).json({ success: true, message: 'Lead submitted successfully' });
  } catch (error) {
    logger.error('Lead submission error', error);
    res.status(500).json({ message: 'Failed to submit lead' });
  }
});

// POST contractor signup
router.post('/contractor-signup', async (req: any, res) => {
  const { name, companyName, services, email, phone } = req.body;

  const safeName = cleanText(name, 120);
  const safeCompanyName = cleanText(companyName, 160);
  const safeServices = cleanText(services, 2000);
  const safeEmail = optionalCleanText(email, 254);
  const safePhone = optionalCleanText(phone, 30);

  if (
    !safeName ||
    !safeCompanyName ||
    !safeServices ||
    (safeEmail && !EMAIL_PATTERN.test(safeEmail.toLowerCase())) ||
    (safePhone && !PHONE_PATTERN.test(safePhone))
  ) {
    return res.status(400).json({ message: 'Valid contractor details are required' });
  }

  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO contractor_signup (id, name, companyName, services, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [id, safeName, safeCompanyName, safeServices, safeEmail?.toLowerCase() || null, safePhone || null]
    );

    res.status(201).json({ success: true, message: 'Contractor signed up successfully' });
  } catch (error) {
    logger.error('Contractor signup error', error);
    res.status(500).json({ message: 'Failed to sign up contractor' });
  }
});

export default router;
