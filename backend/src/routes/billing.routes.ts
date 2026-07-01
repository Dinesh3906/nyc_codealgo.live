import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth.middleware';
import pool from '../db';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'billing' });

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    logger.error('Razorpay API credentials missing');
    throw new Error("FATAL: Razorpay API credentials are missing!");
  }

  return { keyId, keySecret };
};

const getRazorpay = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
};

const router = Router();

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

const getPlanPricing = (planType: string, pages: number = 0) => {
  if (planType === 'monthly-15k') {
    return { unitAmount: 50000, productName: 'Monthly Subscription (15,000 Pages)' };
  }
  if (planType === 'custom-topup') {
    // 5 cents per page
    const amount = pages * 5;
    return { unitAmount: amount, productName: `Custom Page Top-up (${pages} Pages)` };
  }
  return { unitAmount: 0, productName: 'Unknown Plan' };
};

const applyPagesPurchase = async (
  userId: string,
  planType: string,
  purchasedPages: number,
  sessionId?: string | null
) => {
  const userColumns = await getUserColumns();
  const now = new Date();
  
  // Set subscription end date to exactly 1 month from now
  const subPeriodEnd = new Date();
  subPeriodEnd.setMonth(subPeriodEnd.getMonth() + 1);

  let query = '';
  let params: any[] = [];

  if (planType === 'monthly-15k') {
    query = 'UPDATE `user` SET subStatus = ?, scanLimit = 15000, pagesUsed = 0, subPeriodEnd = ? WHERE id = ?';
    params = ['subscribed', subPeriodEnd, userId];
  } else if (planType === 'custom-topup') {
    // For custom top-up: add pages to their scanLimit, do NOT reset pagesUsed.
    // If they do not have a subPeriodEnd or it has expired, initialize a new 1-month period.
    query = 'UPDATE `user` SET scanLimit = scanLimit + ?, subPeriodEnd = COALESCE(CASE WHEN subPeriodEnd > NOW() THEN subPeriodEnd ELSE ? END, ?) WHERE id = ?';
    params = [purchasedPages, subPeriodEnd, subPeriodEnd, userId];
  } else {
    throw new Error('Invalid plan type for page purchase');
  }

  // ATOMIC GUARD: If sessionId is present, ensure we only update if it hasn't been handled.
  if (sessionId && userColumns.has('lastHandledSessionId')) {
    query += ' AND (lastHandledSessionId IS NULL OR lastHandledSessionId <> ?)';
    params.push(sessionId);
    query = query.replace('SET ', `SET lastHandledSessionId = ?, `);
    params.unshift(sessionId);
  }

  const [result]: any = await pool.query(query, params);

  const [users]: any = await pool.query('SELECT subStatus, scanLimit, pagesUsed, subPeriodEnd FROM `user` WHERE id = ?', [userId]);
  return users[0];
};

// GET billing usage
router.get('/usage', protect, async (req: any, res) => {
  const { subStatus, scanLimit, pagesUsed, email, name } = req.user;

  try {
    res.json({
      status: subStatus,
      limit: Number(scanLimit) || 0,
      used: Number(pagesUsed) || 0,
      email,
      name
    });
  } catch (error) {
    logger.error('Failed to fetch billing usage', error);
    res.status(500).json({ message: 'Failed to load billing usage.' });
  }
});

// POST validate coupon
router.post('/validate-coupon', protect, async (req: any, res) => {
  const { code, planId } = req.body;
  
  // No coupons are live yet. This list will be populated by the admin in the future.
  const coupons: any = {
    // 'CODE': DiscountAmount
  };

  const discount = coupons[code.toUpperCase()];
  if (discount !== undefined) {
    res.json({ valid: true, discount: discount });
  } else {
    res.status(400).json({ valid: false, message: 'Invalid coupon code' });
  }
});

// POST create checkout session
router.post('/create-checkout', protect, async (req: any, res) => {
  const { id: userId, email } = req.user;
  const { plan, pages } = req.body || {};

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend environment variables.'
    });
  }

  if (!email) {
    return res.status(400).json({ message: 'User email is required for checkout.' });
  }

  if (plan !== 'monthly-15k' && plan !== 'custom-topup') {
    return res.status(400).json({ message: 'Invalid plan selected.' });
  }

  const pagesCount = plan === 'monthly-15k' ? 15000 : parseInt(pages);
  if (isNaN(pagesCount) || pagesCount <= 0) {
    return res.status(400).json({ message: 'Invalid page count requested.' });
  }

  if (plan === 'custom-topup' && pagesCount < 100) {
    return res.status(400).json({ message: 'Minimum custom top-up is 100 pages.' });
  }
  
  logger.info('Creating Razorpay order', { userId, plan, pages: pagesCount });
  
  const { unitAmount: baseAmount, productName } = getPlanPricing(plan, pagesCount);
  const { couponCode } = req.body || {};
  
  let finalAmount = baseAmount;
  if (couponCode) {
    // No coupons are live yet. 
    const coupons: any = {};
    const discountAmount = coupons[couponCode.toUpperCase()] || 0;
    finalAmount = Math.max(0, baseAmount - discountAmount);
    logger.info('Coupon applied', { discountAmount, finalAmount });
  }

  try {
    const options = {
      amount: finalAmount,
      currency: "USD",
      receipt: `receipt_${userId}_${Date.now()}`.slice(0, 40),
      notes: { 
        userId, 
        planType: plan, 
        pages: String(pagesCount), 
        productName, 
        couponCode: couponCode || 'NONE' 
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      keyId: getRazorpayConfig().keyId
    });
  } catch (error) {
    logger.error('Razorpay order creation error', error);
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
    const { keySecret } = getRazorpayConfig();
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    logger.info('Verifying Razorpay signature', { orderId: razorpay_order_id });

    if (expectedSignature !== razorpay_signature) {
      logger.warn('Razorpay signature mismatch', { orderId: razorpay_order_id });
      return res.status(400).json({ message: 'Invalid payment signature.' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    logger.info('Razorpay order fetched', { orderId: order.id, status: order.status });

    const sessionUserId = order.notes?.userId;
    if (!sessionUserId || String(sessionUserId) !== String(req.user.id)) {
      logger.warn('Razorpay user mismatch on order confirmation');
      return res.status(403).json({ message: 'Order does not belong to this user.' });
    }

    const planType = String(order.notes?.planType || '');
    const pagesCount = parseInt(String(order.notes?.pages || '0'));

    if (planType !== 'monthly-15k' && planType !== 'custom-topup') {
      return res.status(400).json({ message: 'Could not determine purchased plan.' });
    }

    const updated = await applyPagesPurchase(
      req.user.id,
      planType,
      pagesCount,
      razorpay_order_id
    );

    return res.json({
      message: 'Plan upgraded successfully.',
      status: updated.subStatus,
      limit: updated.scanLimit,
      used: updated.pagesUsed
    });
  } catch (error) {
    logger.error('Failed to confirm payment', error);
    return res.status(500).json({ message: 'Could not confirm payment.' });
  }
});

// POST RAZORPAY WEBHOOK — Signature-verified server-to-server payment confirmation
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      logger.error('Razorpay webhook secret not configured');
      return res.status(503).json({ received: false });
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({ received: false });
    }

    // Verify HMAC signature
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      logger.warn('Webhook signature verification failed');
      return res.status(400).json({ received: false });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const eventType = event?.event;

    logger.info('Razorpay webhook received', { eventType });

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event?.payload?.payment?.entity;
      const orderId = payment?.order_id;

      if (!orderId) {
        logger.warn('Webhook missing order ID');
        return res.json({ received: true });
      }

      // Fetch order details from Razorpay
      const razorpay = getRazorpay();
      if (!razorpay) {
        return res.status(503).json({ received: false });
      }

      const order = await razorpay.orders.fetch(orderId);
      const userId = order.notes?.userId ? String(order.notes.userId) : '';
      const planType = order.notes?.planType ? String(order.notes.planType) : '';
      const pagesCount = parseInt(String(order.notes?.pages || '0'));

      if (!userId || (planType !== 'monthly-15k' && planType !== 'custom-topup')) {
        logger.warn('Webhook order has invalid metadata', { orderId });
        return res.json({ received: true });
      }

      // Apply purchase idempotently (orderId acts as idempotency key)
      await applyPagesPurchase(userId, planType, pagesCount, orderId);
      logger.info('Webhook purchase applied', { userId, planType, pages: pagesCount, orderId });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    // Always return 200 to prevent Razorpay retries on our errors
    res.json({ received: true });
  }
});

export default router;
