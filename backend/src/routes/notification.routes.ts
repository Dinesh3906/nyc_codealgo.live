import { Router, Response } from 'express';
import pool from '../db';
import { protect } from '../middleware/auth.middleware';
import { Logger } from '../services/logger';

const router = Router();
const logger = new Logger({ stage: 'notification-routes' });

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user
// @access  Private
router.get('/', protect, async (req: any, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, title, message, type, isRead, createdAt FROM `notification` WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    logger.error('Fetch Notifications Error', error);
    res.status(500).json({ message: 'Failed to retrieve notifications.' });
  }
});

// @route   POST /api/notifications/read-all
// @desc    Mark all notifications as read for logged-in user
// @access  Private
router.post('/read-all', protect, async (req: any, res: Response) => {
  try {
    await pool.query(
      'UPDATE `notification` SET isRead = TRUE WHERE userId = ?',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    logger.error('Read All Notifications Error', error);
    res.status(500).json({ message: 'Failed to update notifications.' });
  }
});

// @route   POST /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Private
router.post('/:id/read', protect, async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const [result]: any = await pool.query(
      'UPDATE `notification` SET isRead = TRUE WHERE id = ? AND userId = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    logger.error('Read Single Notification Error', error);
    res.status(500).json({ message: 'Failed to update notification.' });
  }
});

export default router;
