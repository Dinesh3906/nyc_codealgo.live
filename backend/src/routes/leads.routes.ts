import { Router } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST new lead
router.post('/', async (req, res) => {
  const { name, email, organization } = req.body;

  if (!email || !name) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    const newLeadId = uuidv4();
    await pool.query(
      'INSERT INTO `lead` (id, name, email, organization) VALUES (?, ?, ?, ?)',
      [newLeadId, name, email, organization || 'Independent']
    );

    res.status(201).json({ success: true, message: 'Lead captured successfully', leadId: newLeadId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
       // Unique constraint check if needed, though email isn't strictly unique in schema
       return res.status(400).json({ message: 'Lead already exists' });
    }
    console.error('Lead creation error:', error);
    res.status(500).json({ message: 'Failed to capture lead' });
  }
});

// POST user submits a contractor lead
router.post('/submit-lead', async (req: any, res) => {
  const { phone, description, projectType, userId } = req.body;

  if (!phone || !description) {
    return res.status(400).json({ message: 'Phone and description are required' });
  }

  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO contractor_lead (id, userId, phone, description, projectType) VALUES (?, ?, ?, ?, ?)',
      [id, userId || null, phone, description, projectType || 'residential']
    );

    res.status(201).json({ success: true, message: 'Lead submitted successfully', leadId: id });
  } catch (error) {
    console.error('Lead submission error:', error);
    res.status(500).json({ message: 'Failed to submit lead' });
  }
});

// POST contractor signup
router.post('/contractor-signup', async (req: any, res) => {
  const { name, companyName, services, email, phone } = req.body;

  if (!name || !companyName || !services) {
    return res.status(400).json({ message: 'Name, company name, and services are required' });
  }

  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO contractor_signup (id, name, companyName, services, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, companyName, services, email || null, phone || null]
    );

    res.status(201).json({ success: true, message: 'Contractor signed up successfully', contractorId: id });
  } catch (error) {
    console.error('Contractor signup error:', error);
    res.status(500).json({ message: 'Failed to sign up contractor' });
  }
});

export default router;
