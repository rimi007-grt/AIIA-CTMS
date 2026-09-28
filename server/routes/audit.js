const express = require('express');
const router = express.Router();
const { db, verifyAuditIntegrity, GENESIS_HASH } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const crypto = require('crypto');

// GET cryptographic verification status
router.get('/verify', authenticateToken, (req, res) => {
  try {
    const result = verifyAuditIntegrity();
    res.json(result);
  } catch (err) {
    console.error('Audit verification error:', err);
    res.status(500).json({ error: 'Failed to verify audit chain integrity.' });
  }
});

// POST simulate tamper attack for evaluation demo
router.post('/tamper-test', authenticateToken, (req, res) => {
  try {
    const firstRow = db.prepare('SELECT id, details FROM audit_log ORDER BY id ASC LIMIT 1').get();
    if (firstRow) {
      db.prepare(`UPDATE audit_log SET details = details || ' [TAMPERED]' WHERE id = ?`).run(firstRow.id);
      res.json({ status: 'tampered', message: 'Simulated tampering injected into block #' + firstRow.id });
    } else {
      res.status(404).json({ error: 'No audit records to tamper' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST restore chain integrity
router.post('/restore', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY id ASC').all();
    let prev = GENESIS_HASH;

    for (const r of rows) {
      let cleanDetails = (r.details || '').replace(' [TAMPERED]', '');
      const rawString = `${prev}|${r.timestamp}|${r.action_type}|${r.entity_affected}|${r.entity_id || ''}|${r.user_name}|${cleanDetails}`;
      const newCurr = crypto.createHash('sha256').update(rawString).digest('hex');

      db.prepare(`UPDATE audit_log SET details = ?, prev_hash = ?, curr_hash = ? WHERE id = ?`).run(
        cleanDetails, prev, newCurr, r.id
      );
      prev = newCurr;
    }
    res.json({ status: 'success', message: 'Cryptographic audit ledger integrity restored.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET audit logs with filters (Admin only, or Regulator for compliance audit)
router.get(
  '/',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.REGULATOR]),
  (req, res) => {
    try {
      const { entity, action, user, search, limit = 100 } = req.query;

      let query = `SELECT * FROM audit_log WHERE 1=1`;
      const params = [];

      if (entity && entity !== 'All') {
        query += ` AND entity_affected = ?`;
        params.push(entity);
      }

      if (action && action !== 'All') {
        query += ` AND action_type = ?`;
        params.push(action);
      }

      if (user && user !== 'All') {
        query += ` AND LOWER(user_name) LIKE LOWER(?)`;
        params.push(`%${user}%`);
      }

      if (search) {
        query += ` AND (
          LOWER(user_name) LIKE LOWER(?) OR
          LOWER(details) LIKE LOWER(?) OR
          LOWER(entity_id) LIKE LOWER(?) OR
          LOWER(ip_address) LIKE LOWER(?)
        )`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      query += ` ORDER BY id DESC LIMIT ?`;
      params.push(Number(limit) || 100);

      const logs = db.prepare(query).all(...params);

      // Summary statistics for audit page
      const totalLogs = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count;
      const actionStats = db.prepare(`
        SELECT action_type, COUNT(*) as count 
        FROM audit_log 
        GROUP BY action_type
      `).all();

      res.json({ logs, totalLogs, actionStats });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      res.status(500).json({ error: 'Failed to retrieve audit trail.' });
    }
  }
);

module.exports = router;
