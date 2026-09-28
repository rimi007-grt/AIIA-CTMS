const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

// GET all users (Admin only)
router.get('/', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.designation, u.department, u.organization, u.created_at,
        (SELECT COUNT(*) FROM trials t WHERE t.pi_id = u.id) as assigned_trials_count,
        (SELECT COUNT(*) FROM adverse_events ae WHERE ae.reported_by = u.id) as reported_ae_count
      FROM users u
      ORDER BY u.id ASC
    `).all();

    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve user registry.' });
  }
});

// UPDATE user role/designation (Admin only)
router.put('/:id/role', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  try {
    const { designation, department } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`
      UPDATE users SET 
        designation = COALESCE(?, designation),
        department = COALESCE(?, department)
      WHERE id = ?
    `).run(designation, department, req.params.id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.designation,
      actionType: 'UPDATE',
      entityAffected: 'USER',
      entityId: user.email,
      details: `Modified role/department of ${user.full_name} to ${designation || user.designation} (${department || user.department})`,
      ipAddress: req.ip
    });

    res.json({ message: 'User role updated successfully.' });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

module.exports = router;
