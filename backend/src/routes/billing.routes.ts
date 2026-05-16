import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth.middleware';
import pool from '../db';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_Sld4SjARAkmKx1';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'VCXoKOb3aPlPE6IF675AxkHT';
  return keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
};

const router = Router();

type PlanType = 'pack-1' | 'pack-11' | 'pack-12' | 'pack-55' | 'pack-65';
type UserColumnSet = Set<string>;
let userColumnCache: UserColumnSet | null = null;

const getUserColumns = async (): Promise<UserColumnSet> => {
  if (userColumnCache) {
    return userColumnCache;
  }

  const [rows]: any = await pool.query('SHOW COLUMNS FROM `user`');
  userColumnCache = new Set((rows || []).map((r: any) => String(r.Field)));
  return userColumnCache;
};

const normalizePlanType = (plan: any): PlanType | null => {
  if (plan === 'pack-1' || plan === 'pack-11' || plan === 'pack-12' || plan === 'pack-55' || plan === 'pack-65') return plan;
  return null;
};

const getPlanPricing = (planType: PlanType) => {
  if (planType === 'pack-1') return { unitAmount: 200, productName: '1 Upload Pack' };
  if (planType === 'pack-11' || planType === 'pack-12') return { unitAmount: 2000, productName: '12 Uploads Pack' };
  return { unitAmount: 10000, productName: '65 Uploads Pack' };
};

const getPlanEntitlement = (planType: PlanType) => {
  if (planType === 'pack-1') return { status: 'active', limit: 1 };
  if (planType === 'pack-11' || planType === 'pack-12') return { status: 'active', limit: 12 };
  return { status: 'active', limit: 65 };
};

const applyPlanUpgrade = async (
  userId: string,
  planType: PlanType,
  sessionId?: string | null
) => {
  const userColumns = await getUserColumns();
  const { status, limit: newLimit } = getPlanEntitlement(planType);
  
  const updates: string[] = ['subStatus = ?'];
  const params: any[] = [status];

  // Add purchased uploads to their existing limit
  updates.push('scanLimit = (CASE WHEN subStatus = "free" THEN 0 ELSE scanLimit END) + ?');
  params.push(newLimit);

  let query = `UPDATE \`user\` SET ${updates.join(', ')} WHERE id = ?`;
  params.push(userId);

  // ATOMIC GUARD: If sessionId is present, ensure we only update if it hasn't been handled.
  if (sessionId && userColumns.has('lastHandledSessionId')) {
    query += ' AND (lastHandledSessionId IS NULL OR lastHandledSessionId <> ?)';
    params.push(sessionId);
    query = query.replace('SET ', `SET lastHandledSessionId = ?, `);
    params.unshift(sessionId);
  }

  const [result]: any = await pool.query(query, params);

  // If already handled (affectedRows = 0), fetch current values to return accurate state
  if (result.affectedRows === 0) {
     const [users]: any = await pool.query('SELECT subStatus, scanLimit FROM `user\` WHERE id = ?', [userId]);
     return { status: users[0]?.subStatus || status, limit: users[0]?.scanLimit || newLimit };
  }

  return { status, limit: newLimit };
};

// GET billing usage
router.get('/usage', protect, async (req: any, res) => {
  const { id: userId, subStatus, scanLimit } = req.user;

  try {
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM `plan` WHERE userId = ? AND status IN ('analyzed', 'processing')",
      [userId]
    );
    const used = Number(rows[0]?.count || 0);

    res.json({
      status: subStatus,
      limit: Number(scanLimit) || 0,
      used
    });
  } catch (error) {
    console.error('Failed to fetch billing usage:', error);
    res.status(500).json({ message: 'Failed to load billing usage.' });
  }
});

// POST create checkout session
router.post('/create-checkout', protect, async (req: any, res) => {
  const { id: userId, email } = req.user;
  const { plan } = req.body || {};

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend environment variables.'
    });
  }

  if (!email) {
    return res.status(400).json({ message: 'User email is required for checkout.' });
  }

  const planType = normalizePlanType(plan);
  console.log(`[RAZORPAY] Received plan: "${plan}", normalized to: "${planType}"`);
  if (!planType) {
    return res.status(400).json({ message: 'Invalid plan selected.' });
  }
  
  console.log(`[RAZORPAY] Creating order for: ${userId} (${email}), plan: ${planType}`);
  
  const { unitAmount, productName } = getPlanPricing(planType);

  try {
    const options = {
      amount: unitAmount,
      currency: "USD",
      receipt: `receipt_${userId}_${Date.now()}`.slice(0, 40),
      notes: { userId, planType, productName }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: options.amount,
      currency: options.currency
    });
  } catch (error) {
    console.error('Razorpay error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown Razorpay error';
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? `Failed to create order: ${detail}`
        : 'Failed to create order.'
    });
  }
});

// POST confirm checkout session after redirect success
router.post('/confirm-session', protect, async (req: any, res) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({ message: 'Razorpay is not configured.' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Razorpay payment details are required.' });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature.' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);

    const sessionUserId = order.notes?.userId;
    if (!sessionUserId || sessionUserId !== req.user.id) {
      return res.status(403).json({ message: 'Order does not belong to this user.' });
    }

    const planType = normalizePlanType(order.notes?.planType);
    if (!planType) {
      return res.status(400).json({ message: 'Could not determine purchased plan.' });
    }

    const updated = await applyPlanUpgrade(
      req.user.id,
      planType,
      razorpay_order_id
    );

    return res.json({
      message: 'Plan upgraded successfully.',
      status: updated.status,
      limit: updated.limit
    });
  } catch (error) {
    console.error('Failed to confirm payment:', error);
    return res.status(500).json({ message: 'Could not confirm payment.' });
  }
});

// POST RAZORPAY WEBHOOK (Stubbed)
router.post('/webhook', async (req: Request, res: Response) => {
  // We rely on frontend signature verification for simplicity in this implementation.
  res.json({ received: true });
});

export default router;
