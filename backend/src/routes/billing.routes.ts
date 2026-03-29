import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth.middleware';
import pool from '../db';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {}) : null;

const router = Router();

const resolveMonthlyLimit = (subStatus: string, scanLimit: any) => {
  const numericLimit = Number(scanLimit);
  if (Number.isFinite(numericLimit) && numericLimit > 0) {
    return numericLimit;
  }
  return subStatus === 'free' ? 2 : 10;
};

type PlanType = 'trial' | 'intro' | 'pro';
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
  if (plan === 'enterprise') return 'pro';
  if (plan === 'trial' || plan === 'intro' || plan === 'pro') return plan;
  return null;
};

const getPlanPricing = (planType: PlanType) => {
  if (planType === 'trial') {
    return { unitAmount: 100, productName: 'The Trial (Month 1 - Promo)' };
  }

  if (planType === 'intro') {
    return { unitAmount: 4999, productName: 'Intro Tier (Month 2)' };
  }

  return { unitAmount: 29900, productName: 'Pro Tier (Month 3+)' };
};

const getPlanEntitlement = (planType: PlanType) => {
  if (planType === 'trial') {
    return { status: 'trial', limit: 1 };
  }

  if (planType === 'intro') {
    return { status: 'intro', limit: 10 };
  }

  return { status: 'pro', limit: 10 };
};

const applyPlanUpgrade = async (
  userId: string,
  planType: PlanType,
  subscriptionId?: string | null,
  customerId?: string | null
) => {
  const { status, limit } = getPlanEntitlement(planType);
  const userColumns = await getUserColumns();
  const updates: string[] = ['subStatus = ?', 'scanLimit = ?'];
  const params: any[] = [status, limit];

  if (userColumns.has('subscriptionId')) {
    updates.push('subscriptionId = COALESCE(?, subscriptionId)');
    params.push(subscriptionId || null);
  }

  if (userColumns.has('stripeCustomerId')) {
    updates.push('stripeCustomerId = COALESCE(?, stripeCustomerId)');
    params.push(customerId || null);
  }

  params.push(userId);

  await pool.query(
    `UPDATE \`user\` SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return { status, limit };
};

// GET billing usage
router.get('/usage', protect, async (req: any, res) => {
  const { id: userId, subStatus, scanLimit } = req.user;

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [rows]: any = await pool.query(
      'SELECT COUNT(*) as count FROM `plan` WHERE userId = ? AND createdAt >= ?',
      [userId, startOfMonth]
    );
    const used = Number(rows[0]?.count || 0);

    res.json({
      status: subStatus,
      limit: resolveMonthlyLimit(subStatus, scanLimit),
      used,
      resetDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)
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

  if (!stripe) {
    return res.status(503).json({
      message: 'Stripe is not configured. Add STRIPE_SECRET_KEY in backend environment variables.'
    });
  }

  if (!email) {
    return res.status(400).json({ message: 'User email is required for checkout.' });
  }

  const planType = normalizePlanType(plan);
  if (!planType) {
    return res.status(400).json({ message: 'Invalid plan selected.' });
  }
  
  console.log(`[STRIPE] Creating checkout for: ${userId} (${email}), plan: ${planType}`);
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const { unitAmount, productName } = getPlanPricing(planType);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: productName },
          unit_amount: unitAmount,
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${frontendUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/billing?canceled=true`,
      client_reference_id: userId,
      customer_email: email,
      metadata: { userId, planType },
      // Metadata to help webhook
      subscription_data: {
        metadata: { userId, planType }
      }
    });

    if (!session.url) {
      return res.status(500).json({ message: 'Stripe did not return a checkout URL.' });
    }

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown Stripe error';
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? `Failed to create checkout session: ${detail}`
        : 'Failed to create checkout session.'
    });
  }
});

// POST confirm checkout session after redirect success
router.post('/confirm-session', protect, async (req: any, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured.' });
  }

  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'sessionId is required.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    const sessionUserId = session.client_reference_id || session.metadata?.userId;
    if (!sessionUserId || sessionUserId !== req.user.id) {
      return res.status(403).json({ message: 'Session does not belong to this user.' });
    }

    const isSettled =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required' ||
      session.status === 'complete';

    if (!isSettled) {
      return res.status(400).json({ message: 'Payment not completed yet.' });
    }

    let planType = normalizePlanType(session.metadata?.planType);

    if (!planType && session.subscription && typeof session.subscription !== 'string') {
      planType = normalizePlanType((session.subscription as any).metadata?.planType);
    }

    if (!planType) {
      return res.status(400).json({ message: 'Could not determine purchased plan.' });
    }

    const updated = await applyPlanUpgrade(
      req.user.id,
      planType,
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      typeof session.customer === 'string' ? session.customer : session.customer?.id
    );

    return res.json({
      message: 'Plan upgraded successfully.',
      status: updated.status,
      limit: updated.limit
    });
  } catch (error) {
    console.error('Failed to confirm checkout session:', error);
    return res.status(500).json({ message: 'Could not confirm checkout session.' });
  }
});

// POST STRIPE WEBHOOK
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured.' });
  }

  let event: any;
  try {
    if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString('utf8'));
    } else {
      event = req.body;
    }
  } catch {
    return res.status(400).json({ message: 'Invalid webhook payload.' });
  }

  if (!event?.type) {
    return res.status(400).json({ message: 'Invalid Stripe event.' });
  }

  console.log(`[STRIPE WEBHOOK] Received event: ${event.type}`);

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.userId;
    const planType = normalizePlanType(session.metadata?.planType);
    
    if (userId && planType) {
      await applyPlanUpgrade(
        userId,
        planType,
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        typeof session.customer === 'string' ? session.customer : session.customer?.id
      );
    }
  }

  // Handle recurring payments (Invoices)
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) {
      return res.json({ received: true });
    }

    const userColumns = await getUserColumns();
    if (!userColumns.has('subscriptionId')) {
      return res.json({ received: true });
    }
    
    // Find user by subscriptionId
    const [users]: any = await pool.query('SELECT * FROM `user` WHERE subscriptionId = ?', [subscriptionId]);
    const user = users[0];
    
    if (user) {
      const planType = normalizePlanType(user.subStatus) || 'pro';
      await applyPlanUpgrade(user.id, planType, subscriptionId, user.stripeCustomerId || null);
    }
  }

  res.json({ received: true });
});

export default router;
