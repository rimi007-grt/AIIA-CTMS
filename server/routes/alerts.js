const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { sendNotificationToRole } = require('../notifications');

// Seed default alert rules if empty
function seedDefaultAlertRules() {
  const count = db.prepare('SELECT COUNT(*) as count FROM alert_rules').get().count;
  if (count === 0) {
    const defaultRules = [
      {
        rule_name: 'Expedited SAE 24h Clock Warning',
        metric_name: 'sae_unreported_hours',
        operator: '>=',
        threshold_value: 18.0,
        recipient_role: ROLES.PV || 'Pharmacovigilance Officer',
        severity: 'red'
      },
      {
        rule_name: 'Protocol Deviation Surge Alert',
        metric_name: 'trial_open_deviations',
        operator: '>=',
        threshold_value: 3.0,
        recipient_role: ROLES.MONITOR,
        severity: 'amber'
      },
      {
        rule_name: 'IEC Approval Renewal Imminent (30-day notice)',
        metric_name: 'ethics_expiry_days_remaining',
        operator: '<=',
        threshold_value: 30.0,
        recipient_role: ROLES.ETHICS,
        severity: 'amber'
      },
      {
        rule_name: 'Critical Study Enrollment Stagnation',
        metric_name: 'enrollment_percentage',
        operator: '<=',
        threshold_value: 20.0,
        recipient_role: ROLES.PI,
        severity: 'green'
      }
    ];

    const insert = db.prepare(`
      INSERT INTO alert_rules (rule_name, metric_name, operator, threshold_value, recipient_role, severity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    defaultRules.forEach(r => insert.run(r.rule_name, r.metric_name, r.operator, r.threshold_value, r.recipient_role, r.severity));
  }
}

seedDefaultAlertRules();

// GET all alert rules
router.get('/rules', authenticateToken, (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM alert_rules ORDER BY id ASC').all();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create custom alert rule (Admin, Monitor, Leadership)
router.post('/rules', authenticateToken, requireRole([ROLES.ADMIN, ROLES.MONITOR, ROLES.REGULATOR]), (req, res) => {
  try {
    const { rule_name, metric_name, operator, threshold_value, recipient_role, severity } = req.body;
    if (!rule_name || !metric_name || threshold_value === undefined || !recipient_role) {
      return res.status(400).json({ error: 'rule_name, metric_name, threshold_value, and recipient_role are mandatory.' });
    }

    const stmt = db.prepare(`
      INSERT INTO alert_rules (rule_name, metric_name, operator, threshold_value, recipient_role, severity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const result = stmt.run(rule_name, metric_name, operator || '>=', Number(threshold_value), recipient_role, severity || 'amber');

    logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'CREATE_ALERT_RULE',
      entityAffected: 'ALERT_RULE',
      entityId: String(result.lastInsertRowid),
      fieldName: 'threshold_value',
      newVal: threshold_value,
      reasonForChange: `Admin defined new KPI alert threshold: ${rule_name}`,
      details: `Created rule ${rule_name} on ${metric_name} ${operator} ${threshold_value} for ${recipient_role}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update rule threshold / status
router.put('/rules/:id', authenticateToken, requireRole([ROLES.ADMIN, ROLES.MONITOR]), (req, res) => {
  try {
    const { id } = req.params;
    const { threshold_value, is_active, severity } = req.body;

    const existing = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Alert rule not found.' });

    db.prepare(`
      UPDATE alert_rules
      SET threshold_value = COALESCE(?, threshold_value),
          is_active = COALESCE(?, is_active),
          severity = COALESCE(?, severity)
      WHERE id = ?
    `).run(threshold_value !== undefined ? Number(threshold_value) : null, is_active !== undefined ? Number(is_active) : null, severity || null, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'UPDATE_ALERT_RULE',
      entityAffected: 'ALERT_RULE',
      entityId: String(id),
      fieldName: 'threshold_value',
      oldVal: existing.threshold_value,
      newVal: threshold_value !== undefined ? threshold_value : existing.threshold_value,
      reasonForChange: 'Institutional KPI alert rule configuration modified',
      details: `Updated rule #${id} (${existing.rule_name})`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Alert rule updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE rule
router.delete('/rules/:id', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
    res.json({ success: true, message: 'Alert rule deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
