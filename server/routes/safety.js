const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { createNotification, notifyByRole } = require('../notifications');

// MedDRA terms sample library (Ayurvedic integrative & clinical terms)
const MEDDRA_TERMS = [
  { code: '10018043', term: 'Gastrointestinal - Hyperacidity (Amlapitta)' },
  { code: '10028813', term: 'Nausea and Emesis (Chhardi)' },
  { code: '10019211', term: 'Cephalea / Headache (Shiroruk)' },
  { code: '10037087', term: 'Cutaneous Pruritus / Itching (Kandu)' },
  { code: '10012735', term: 'Loose Stools / Diarrhea (Atisara)' },
  { code: '10041285', term: 'Somnolence / Excessive Drowsiness (Nidradhikya)' },
  { code: '10013649', term: 'Dizziness / Vertigo (Bhrama)' },
  { code: '10020084', term: 'Elevated Transaminases / Hepatotoxicity (Kamala)' },
  { code: '10001367', term: 'Abdominal Cramps / Colic (Udarashoola)' },
  { code: '10002198', term: 'Allergic Dermatitis / Rash (Kotha)' },
  { code: '10033557', term: 'Palpitations / Tachycardia (Hrid-drava)' },
  { code: '10016558', term: 'Fatigue and Asthenia (Klama / Daurbalya)' },
  { code: '10002855', term: 'Anaphylactoid Reaction (Teevrahita)' },
  { code: '10038359', term: 'Acute Renal Impairment (Mutrakrichhra)' },
  { code: '10022118', term: 'Hypoglycemic Episode (Kshudhadhikya)' },
  { code: '10013946', term: 'Dryness of Mouth (Mukhashosha)' },
  { code: '10019059', term: 'Joint Stiffness / Arthralgia (Sandhigraha)' },
  { code: '10021428', term: 'Insomnia exacerbation (Anidra)' }
];

// Helper to calculate reporting deadline & overdue status
function computeCompliance(eventDateStr, reportDateStr, seriousness) {
  const eventDate = new Date(eventDateStr);
  const reportDate = new Date(reportDateStr || Date.now());
  const diffHours = (reportDate - eventDate) / (1000 * 60 * 60);

  // Regulatory standards (DCGI / CDSCO / GCP):
  // SAE: Initial report within 24 hours (1 day), detailed report within 14 days
  // Non-serious AE: within 7 days (168 hours)
  const maxHours = seriousness === 'SAE' ? 24 : 168;
  const isOverdue = diffHours > maxHours;

  const deadlineDate = new Date(eventDate.getTime() + maxHours * 60 * 60 * 1000);

  return {
    isOverdue,
    reportingStatus: isOverdue ? 'Overdue' : 'On-Time',
    hoursElapsed: Math.round(diffHours),
    deadlineHours: maxHours,
    deadlineDate: deadlineDate.toISOString()
  };
}

// GET list of MedDRA terms
router.get('/meddra-terms', authenticateToken, (req, res) => {
  res.json({ meddraTerms: MEDDRA_TERMS });
});

// GET all adverse events with filtering
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trial_id, severity, seriousness, status, search } = req.query;

    let query = `
      SELECT ae.*, 
        t.public_title as trial_title,
        t.ctri_number,
        t.pi_name,
        u.full_name as reported_by_name
      FROM adverse_events ae
      JOIN trials t ON ae.trial_id = t.id
      LEFT JOIN users u ON ae.reported_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC: If user is PI and scope is own trials
    if (req.user.designation === ROLES.PI && req.query.scope === 'my') {
      query += ` AND (t.pi_id = ? OR LOWER(t.pi_name) LIKE LOWER(?))`;
      params.push(req.user.id, `%${req.user.full_name}%`);
    }

    if (trial_id && trial_id !== 'All') {
      query += ` AND ae.trial_id = ?`;
      params.push(trial_id);
    }

    if (severity && severity !== 'All') {
      query += ` AND ae.severity = ?`;
      params.push(severity);
    }

    if (seriousness && seriousness !== 'All') {
      query += ` AND ae.seriousness = ?`;
      params.push(seriousness);
    }

    if (status && status !== 'All') {
      query += ` AND ae.reporting_status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (
        LOWER(ae.patient_id) LIKE LOWER(?) OR
        LOWER(ae.event_description) LIKE LOWER(?) OR
        LOWER(ae.meddra_term) LIKE LOWER(?) OR
        LOWER(t.ctri_number) LIKE LOWER(?)
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY ae.event_date DESC, ae.created_at DESC`;

    const rawAERecords = db.prepare(query).all(...params);

    // Enrich with dynamic countdown calculations
    const adverseEvents = rawAERecords.map(item => {
      const comp = computeCompliance(item.event_date, item.report_date, item.seriousness);
      return {
        ...item,
        compliance_calc: comp
      };
    });

    res.json({ adverseEvents, count: adverseEvents.length });
  } catch (err) {
    console.error('Error fetching adverse events:', err);
    res.status(500).json({ error: 'Failed to retrieve adverse events.' });
  }
});

// GET Safety Dashboard KPIs
router.get('/kpis', authenticateToken, (req, res) => {
  try {
    let filterClause = '';
    const params = [];

    if (req.user.designation === ROLES.PI && req.query.scope === 'my') {
      filterClause = ` WHERE ae.trial_id IN (SELECT id FROM trials WHERE pi_id = ? OR LOWER(pi_name) LIKE LOWER(?))`;
      params.push(req.user.id, `%${req.user.full_name}%`);
    }

    // Counts by seriousness
    const totalEvents = db.prepare(`SELECT COUNT(*) as count FROM adverse_events ae ${filterClause}`).get(...params).count;
    const totalSAE = db.prepare(`SELECT COUNT(*) as count FROM adverse_events ae ${filterClause ? filterClause + ' AND' : 'WHERE'} ae.seriousness = 'SAE'`).get(...params).count;
    const totalAE = totalEvents - totalSAE;

    // Counts by severity
    const severityCounts = db.prepare(`
      SELECT ae.severity, COUNT(*) as count
      FROM adverse_events ae
      ${filterClause}
      GROUP BY ae.severity
    `).all(...params);

    // Counts by reporting status
    const statusCounts = db.prepare(`
      SELECT ae.reporting_status, COUNT(*) as count
      FROM adverse_events ae
      ${filterClause}
      GROUP BY ae.reporting_status
    `).all(...params);

    // Counts by trial (top 6 trials by event count)
    const byTrial = db.prepare(`
      SELECT t.ctri_number, t.public_title, 
        COUNT(ae.id) as total_events,
        SUM(CASE WHEN ae.seriousness = 'SAE' THEN 1 ELSE 0 END) as sae_count,
        SUM(CASE WHEN ae.reporting_status = 'Overdue' THEN 1 ELSE 0 END) as overdue_count
      FROM trials t
      JOIN adverse_events ae ON t.id = ae.trial_id
      ${filterClause}
      GROUP BY t.id
      ORDER BY total_events DESC
      LIMIT 8
    `).all(...params);

    // Causality distribution
    const causalityCounts = db.prepare(`
      SELECT ae.causality, COUNT(*) as count
      FROM adverse_events ae
      ${filterClause}
      GROUP BY ae.causality
    `).all(...params);

    res.json({
      totalEvents,
      totalSAE,
      totalAE,
      severityCounts,
      statusCounts,
      byTrial,
      causalityCounts
    });
  } catch (err) {
    console.error('Error fetching safety KPIs:', err);
    res.status(500).json({ error: 'Failed to retrieve safety KPIs.' });
  }
});

// CREATE Adverse Event / Serious Adverse Event Report
router.post(
  '/',
  authenticateToken,
  requireRole([ROLES.PI, ROLES.COORDINATOR, ROLES.PV, ROLES.ADMIN]),
  (req, res) => {
    try {
      const {
        patient_id,
        trial_id,
        event_description,
        severity = 'Mild',
        seriousness = 'AE',
        event_date,
        report_date,
        meddra_code,
        meddra_term,
        outcome = 'Recovering',
        causality = 'Possible',
        action_taken
      } = req.body;

      if (!patient_id || !trial_id || !event_description || !event_date || !meddra_term) {
        return res.status(400).json({ error: 'Patient ID, Trial, Description, Event Date and MedDRA Term are required.' });
      }

      const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(trial_id);
      if (!trial) {
        return res.status(404).json({ error: 'Associated clinical trial was not found.' });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const finalReportDate = report_date || todayStr;

      // Auto-compute compliance
      const comp = computeCompliance(event_date, finalReportDate, seriousness);

      const insert = db.prepare(`
        INSERT INTO adverse_events (
          patient_id, trial_id, event_description, severity, seriousness,
          event_date, report_date, meddra_code, meddra_term, outcome,
          causality, reporting_status, reported_by, action_taken
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      const result = insert.run(
        patient_id.trim().toUpperCase(),
        trial_id,
        event_description,
        severity,
        seriousness,
        event_date,
        finalReportDate,
        meddra_code || '10000000',
        meddra_term,
        outcome,
        causality,
        comp.reportingStatus,
        req.user.id,
        action_taken || ''
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'CREATE',
        entityAffected: 'ADVERSE_EVENT',
        entityId: patient_id.trim().toUpperCase(),
        details: `Reported ${seriousness} (${severity}) for trial ${trial.ctri_number}. Term: ${meddra_term}. Status: ${comp.reportingStatus}`,
        ipAddress: req.ip
      });

      // ── Fire notifications ───────────────────────────────────
      const aeId = result.lastInsertRowid;
      const isSAE = seriousness === 'SAE';

      // Notify trial's PI
      if (trial.pi_id) {
        createNotification({
          userId: trial.pi_id,
          message: isSAE
            ? `🚨 URGENT SAE: Patient ${patient_id.trim().toUpperCase()} on ${trial.ctri_number} — ${meddra_term}. DCGI 24h reporting mandatory.`
            : `⚠️ New AE reported: Patient ${patient_id.trim().toUpperCase()} on ${trial.ctri_number} — ${meddra_term} (${severity}).`,
          priority: isSAE ? 'critical' : 'warning',
          relatedType: 'ae',
          relatedId: aeId
        });
      }

      // Notify all Pharmacovigilance Officers
      notifyByRole(ROLES.PV, {
        message: isSAE
          ? `🚨 SAE Alert: ${trial.ctri_number} — Patient ${patient_id.trim().toUpperCase()}, ${meddra_term}. Expedited PV review required within 24h.`
          : `ℹ️ New AE filed on ${trial.ctri_number}: Patient ${patient_id.trim().toUpperCase()}, ${meddra_term} (${severity}).`,
        priority: isSAE ? 'critical' : 'info',
        relatedType: 'ae',
        relatedId: aeId
      });

      // SAE also notifies all Admins
      if (isSAE) {
        notifyByRole(ROLES.ADMIN, {
          message: `🚨 SAE Reported on ${trial.ctri_number} — Patient ${patient_id.trim().toUpperCase()}. MedDRA: ${meddra_term}. Severity: ${severity}. Regulatory notification initiated.`,
          priority: 'critical',
          relatedType: 'ae',
          relatedId: aeId
        });
      }
      // ── End notifications ─────────────────────────────────────

      res.status(201).json({
        message: `${seriousness} report filed successfully. Compliance status: ${comp.reportingStatus}`,
        aeId: result.lastInsertRowid,
        compliance: comp
      });
    } catch (err) {
      console.error('Error reporting AE/SAE:', err);
      res.status(500).json({ error: 'Failed to record adverse event report.' });
    }
  }
);

// UPDATE Adverse Event (e.g. PV review, causality change, outcome update)
router.put(
  '/:id',
  authenticateToken,
  requireRole([ROLES.PV, ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]),
  (req, res) => {
    try {
      const existing = db.prepare('SELECT ae.*, t.ctri_number FROM adverse_events ae JOIN trials t ON ae.trial_id = t.id WHERE ae.id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Adverse event record not found.' });

      const {
        outcome,
        causality,
        action_taken,
        severity,
        reporting_status
      } = req.body;

      db.prepare(`
        UPDATE adverse_events SET
          outcome = COALESCE(?, outcome),
          causality = COALESCE(?, causality),
          action_taken = COALESCE(?, action_taken),
          severity = COALESCE(?, severity),
          reporting_status = COALESCE(?, reporting_status)
        WHERE id = ?
      `).run(
        outcome,
        causality,
        action_taken,
        severity,
        reporting_status,
        req.params.id
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'UPDATE',
        entityAffected: 'ADVERSE_EVENT',
        entityId: existing.patient_id,
        details: `Safety update: Outcome=${outcome || existing.outcome}, Causality=${causality || existing.causality}`,
        ipAddress: req.ip
      });

      res.json({ message: 'Safety record updated successfully.' });
    } catch (err) {
      console.error('Error updating AE:', err);
      res.status(500).json({ error: 'Failed to update adverse event record.' });
    }
  }
);

module.exports = router;
