const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications — fetch notifications for the logged-in user
router.get('/', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(req.user.id, limit);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id).count;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// PATCH /api/notifications/read-all — mark all notifications as read for user
router.patch('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// DELETE /api/notifications/:id — delete a specific notification
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!notif) return res.status(404).json({ error: 'Notification not found.' });

    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

module.exports = router;
