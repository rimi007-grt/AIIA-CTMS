const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

// GET protocol deviations with filter
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trial_id, severity, status } = req.query;

    let query = `
      SELECT pd.*, 
        t.public_title as trial_title,
        t.ctri_number,
        u.full_name as flagged_by_name
      FROM protocol_deviations pd
      JOIN trials t ON pd.trial_id = t.id
      LEFT JOIN users u ON pd.flagged_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.designation === ROLES.PI && req.query.scope === 'my') {
      query += ` AND (t.pi_id = ? OR LOWER(t.pi_name) LIKE LOWER(?))`;
      params.push(req.user.id, `%${req.user.full_name}%`);
    }

    if (trial_id && trial_id !== 'All') {
      query += ` AND pd.trial_id = ?`;
      params.push(trial_id);
    }

    if (severity && severity !== 'All') {
      query += ` AND pd.severity = ?`;
      params.push(severity);
    }

    if (status && status !== 'All') {
      query += ` AND pd.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY pd.created_at DESC`;

    const deviations = db.prepare(query).all(...params);
    res.json({ deviations, count: deviations.length });
  } catch (err) {
    console.error('Error fetching deviations:', err);
    res.status(500).json({ error: 'Failed to retrieve protocol deviations.' });
  }
});

// CREATE a protocol deviation (Clinical Monitor, PI, Admin)
router.post(
  '/',
  authenticateToken,
  requireRole([ROLES.MONITOR, ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]),
  (req, res) => {
    try {
      const {
        trial_id,
        patient_id,
        deviation_type,
        description,
        severity = 'Minor',
        action_taken
      } = req.body;

      if (!trial_id || !deviation_type || !description) {
        return res.status(400).json({ error: 'Trial, Deviation Type and Description are required.' });
      }

      const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(trial_id);
      if (!trial) return res.status(404).json({ error: 'Trial not found' });

      const todayStr = new Date().toISOString().split('T')[0];

      const insert = db.prepare(`
        INSERT INTO protocol_deviations (
          trial_id, patient_id, deviation_type, description, severity,
          action_taken, status, flagged_by, flagged_date
        ) VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?)
      `);

      const result = insert.run(
        trial_id,
        patient_id ? patient_id.trim().toUpperCase() : null,
        deviation_type,
        description,
        severity,
        action_taken || '',
        req.user.id,
        todayStr
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'FLAG',
        entityAffected: 'PROTOCOL_DEVIATION',
        entityId: patient_id || trial.ctri_number,
        details: `Flagged ${severity} deviation: ${deviation_type} in trial ${trial.ctri_number}`,
        ipAddress: req.ip
      });

      res.status(201).json({
        message: 'Protocol deviation flagged successfully.',
        deviationId: result.lastInsertRowid
      });
    } catch (err) {
      console.error('Error logging deviation:', err);
      res.status(500).json({ error: 'Failed to log protocol deviation.' });
    }
  }
);

// UPDATE / RESOLVE protocol deviation
router.put(
  '/:id',
  authenticateToken,
  requireRole([ROLES.MONITOR, ROLES.PI, ROLES.ADMIN]),
  (req, res) => {
    try {
      const { status, action_taken } = req.body;
      const dev = db.prepare('SELECT pd.*, t.ctri_number FROM protocol_deviations pd JOIN trials t ON pd.trial_id = t.id WHERE pd.id = ?').get(req.params.id);
      if (!dev) return res.status(404).json({ error: 'Protocol deviation record not found.' });

      db.prepare(`
        UPDATE protocol_deviations SET
          status = COALESCE(?, status),
          action_taken = COALESCE(?, action_taken)
        WHERE id = ?
      `).run(status, action_taken, req.params.id);

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'UPDATE',
        entityAffected: 'PROTOCOL_DEVIATION',
        entityId: dev.patient_id || dev.ctri_number,
        details: `Updated deviation status to '${status || dev.status}'`,
        ipAddress: req.ip
      });

      res.json({ message: 'Deviation updated successfully.' });
    } catch (err) {
      console.error('Error updating deviation:', err);
      res.status(500).json({ error: 'Failed to update deviation.' });
    }
  }
);

module.exports = router;
