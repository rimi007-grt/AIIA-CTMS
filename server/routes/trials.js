const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

// CTRI Number standard format: CTRI/YYYY/MM/NNNNNN (Official ICMR/CTRI Registry)

// GET all trials with search, filters, sorting & RBAC awareness
router.get('/', authenticateToken, (req, res) => {
  try {
    const {
      search,
      status,
      phase,
      department,
      pi,
      stage,
      sort_by = 'created_at',
      order = 'DESC',
      scope // 'my' or 'all'
    } = req.query;

    let query = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM adverse_events ae WHERE ae.trial_id = t.id) AS ae_count,
        (SELECT COUNT(*) FROM adverse_events ae WHERE ae.trial_id = t.id AND ae.seriousness = 'SAE') AS sae_count,
        (SELECT COUNT(*) FROM protocol_deviations pd WHERE pd.trial_id = t.id) AS deviation_count
      FROM trials t
      WHERE 1=1
    `;
    const params = [];

    // RBAC: If user is PI and asks for their own or default scope is 'my' when PI
    if (req.user.designation === ROLES.PI && scope === 'my') {
      query += ` AND (t.pi_id = ? OR LOWER(t.pi_name) LIKE LOWER(?))`;
      params.push(req.user.id, `%${req.user.full_name}%`);
    }

    // Search filter across titles, CTRI number, condition, intervention
    if (search) {
      query += ` AND (
        LOWER(t.ctri_number) LIKE LOWER(?) OR
        LOWER(t.public_title) LIKE LOWER(?) OR
        LOWER(t.scientific_title) LIKE LOWER(?) OR
        LOWER(t.health_condition) LIKE LOWER(?) OR
        LOWER(t.intervention) LIKE LOWER(?) OR
        LOWER(t.pi_name) LIKE LOWER(?)
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (status && status !== 'All') {
      query += ` AND t.recruitment_status = ?`;
      params.push(status);
    }

    if (phase && phase !== 'All') {
      query += ` AND t.phase = ?`;
      params.push(phase);
    }

    if (department && department !== 'All') {
      query += ` AND t.department = ?`;
      params.push(department);
    }

    if (pi && pi !== 'All') {
      query += ` AND LOWER(t.pi_name) LIKE LOWER(?)`;
      params.push(`%${pi}%`);
    }

    if (stage && stage !== 'All') {
      query += ` AND t.current_stage = ?`;
      params.push(stage);
    }

    // Allowed sort columns
    const allowedSorts = ['created_at', 'current_enrollment', 'public_title', 'phase', 'recruitment_status'];
    const sortCol = allowedSorts.includes(sort_by) ? `t.${sort_by}` : 't.created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortCol} ${sortDir}`;

    const trials = db.prepare(query).all(...params);
    res.json({ trials, count: trials.length });
  } catch (err) {
    console.error('Error fetching trials:', err);
    res.status(500).json({ error: 'Failed to retrieve clinical trials.' });
  }
});

// GET single trial detail with complete lifecycle, AEs, deviations & audit logs
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const trial = db.prepare(`
      SELECT t.*, u.full_name as pi_full_name, u.email as pi_email
      FROM trials t
      LEFT JOIN users u ON t.pi_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!trial) {
      return res.status(404).json({ error: 'Clinical trial not found.' });
    }

    // Linked Adverse Events
    const adverseEvents = db.prepare(`
      SELECT ae.*, u.full_name as reported_by_name
      FROM adverse_events ae
      LEFT JOIN users u ON ae.reported_by = u.id
      WHERE ae.trial_id = ?
      ORDER BY ae.event_date DESC
    `).all(req.params.id);

    // Linked Protocol Deviations
    const protocolDeviations = db.prepare(`
      SELECT pd.*, u.full_name as flagged_by_name
      FROM protocol_deviations pd
      LEFT JOIN users u ON pd.flagged_by = u.id
      WHERE pd.trial_id = ?
      ORDER BY pd.created_at DESC
    `).all(req.params.id);

    // Linked Audit Trail
    const auditLogs = db.prepare(`
      SELECT * FROM audit_log
      WHERE (entity_affected = 'TRIAL' AND entity_id = ?)
         OR (entity_affected = 'ETHICS' AND entity_id = ?)
      ORDER BY timestamp DESC
    `).all(trial.ctri_number, trial.ctri_number);

    res.json({
      trial,
      adverseEvents,
      protocolDeviations,
      auditLogs
    });
  } catch (err) {
    console.error('Error fetching trial detail:', err);
    res.status(500).json({ error: 'Failed to retrieve trial details.' });
  }
});

// CREATE a new trial (PI, Coordinator, Admin)
router.post(
  '/',
  authenticateToken,
  requireRole([ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]),
  (req, res) => {
    try {
      const {
        ctri_number,
        public_title,
        scientific_title,
        pi_name,
        department,
        site_name,
        ethics_status = 'Submitted',
        ethics_approval_date,
        ethics_notes,
        dcgi_approval = 'Yes',
        health_condition,
        study_type = 'Interventional',
        phase = 'Phase 2',
        intervention,
        comparator,
        target_sample_size_india,
        target_sample_size_total,
        current_enrollment = 0,
        recruitment_status = 'Open to recruitment',
        date_of_first_enrollment,
        estimated_duration,
        current_stage = 'Ethics Approval'
      } = req.body;

      if (!public_title || !health_condition || !intervention || !comparator || !estimated_duration) {
        return res.status(400).json({ error: 'Missing mandatory CTRI trial information.' });
      }

      // CTRI Validation: Must be entered and verified against official registry format
      if (!ctri_number || !ctri_number.trim()) {
        return res.status(400).json({
          error: 'Official CTRI Number is mandatory. Please enter the registration number assigned by the Clinical Trials Registry - India (e.g. CTRI/2026/01/089412).'
        });
      }

      const ctriRegex = /^CTRI\/\d{4}\/\d{2,3}\/\d{6}$/i;
      const finalCtri = ctri_number.trim().toUpperCase();
      if (!ctriRegex.test(finalCtri)) {
        return res.status(400).json({
          error: 'Invalid CTRI format. Official registration numbers must match format: CTRI/YYYY/MM/NNNNNN (e.g. CTRI/2026/01/089412).'
        });
      }

      const existing = db.prepare('SELECT id FROM trials WHERE ctri_number = ?').get(finalCtri);
      if (existing) {
        return res.status(409).json({ error: `Trial with CTRI number ${finalCtri} already exists in registry database.` });
      }

      const assignedPiName = pi_name || req.user.full_name;
      const assignedPiId = req.user.designation === ROLES.PI ? req.user.id : null;
      const assignedDept = department || req.user.department || 'Clinical Research';
      const assignedSite = site_name || req.user.organization || 'All India Institute of Ayurveda, New Delhi';

      const insert = db.prepare(`
        INSERT INTO trials (
          ctri_number, public_title, scientific_title, pi_name, pi_id, department, site_name,
          ethics_status, ethics_approval_date, ethics_notes, dcgi_approval, health_condition,
          study_type, phase, intervention, comparator, target_sample_size_india, target_sample_size_total,
          current_enrollment, recruitment_status, date_of_first_enrollment, estimated_duration,
          current_stage, created_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `);

      const result = insert.run(
        finalCtri,
        public_title,
        scientific_title || public_title,
        assignedPiName,
        assignedPiId,
        assignedDept,
        assignedSite,
        ethics_status,
        ethics_approval_date || null,
        ethics_notes || null,
        dcgi_approval,
        health_condition,
        study_type,
        phase,
        intervention,
        comparator,
        Number(target_sample_size_india) || 100,
        Number(target_sample_size_total) || Number(target_sample_size_india) || 100,
        Number(current_enrollment) || 0,
        recruitment_status,
        date_of_first_enrollment || null,
        estimated_duration,
        current_stage,
        req.user.id
      );

      const newTrialId = result.lastInsertRowid;

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'CREATE',
        entityAffected: 'TRIAL',
        entityId: finalCtri,
        details: `Registered new trial: ${public_title} (${finalCtri})`,
        ipAddress: req.ip
      });

      res.status(201).json({
        message: 'Clinical trial registered successfully',
        trialId: newTrialId,
        ctri_number: finalCtri
      });
    } catch (err) {
      console.error('Error creating trial:', err);
      res.status(500).json({ error: 'Failed to create trial.' });
    }
  }
);

// UPDATE trial details (PI, Coordinator, Admin)
router.put(
  '/:id',
  authenticateToken,
  requireRole([ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]),
  (req, res) => {
    try {
      const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(req.params.id);
      if (!trial) {
        return res.status(404).json({ error: 'Trial not found' });
      }

      // If user is PI, ensure they only edit their own trials (unless Admin)
      if (req.user.designation === ROLES.PI && trial.pi_id && trial.pi_id !== req.user.id) {
        return res.status(403).json({ error: 'You are only authorized to update trials for which you are the PI.' });
      }

      const {
        public_title,
        scientific_title,
        pi_name,
        department,
        site_name,
        health_condition,
        study_type,
        phase,
        intervention,
        comparator,
        target_sample_size_india,
        target_sample_size_total,
        current_enrollment,
        recruitment_status,
        date_of_first_enrollment,
        estimated_duration,
        current_stage,
        dcgi_approval
      } = req.body;

      const update = db.prepare(`
        UPDATE trials SET
          public_title = COALESCE(?, public_title),
          scientific_title = COALESCE(?, scientific_title),
          pi_name = COALESCE(?, pi_name),
          department = COALESCE(?, department),
          site_name = COALESCE(?, site_name),
          health_condition = COALESCE(?, health_condition),
          study_type = COALESCE(?, study_type),
          phase = COALESCE(?, phase),
          intervention = COALESCE(?, intervention),
          comparator = COALESCE(?, comparator),
          target_sample_size_india = COALESCE(?, target_sample_size_india),
          target_sample_size_total = COALESCE(?, target_sample_size_total),
          current_enrollment = COALESCE(?, current_enrollment),
          recruitment_status = COALESCE(?, recruitment_status),
          date_of_first_enrollment = COALESCE(?, date_of_first_enrollment),
          estimated_duration = COALESCE(?, estimated_duration),
          current_stage = COALESCE(?, current_stage),
          dcgi_approval = COALESCE(?, dcgi_approval),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      update.run(
        public_title,
        scientific_title,
        pi_name,
        department,
        site_name,
        health_condition,
        study_type,
        phase,
        intervention,
        comparator,
        target_sample_size_india !== undefined ? Number(target_sample_size_india) : null,
        target_sample_size_total !== undefined ? Number(target_sample_size_total) : null,
        current_enrollment !== undefined ? Number(current_enrollment) : null,
        recruitment_status,
        date_of_first_enrollment,
        estimated_duration,
        current_stage,
        dcgi_approval,
        req.params.id
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'UPDATE',
        entityAffected: 'TRIAL',
        entityId: trial.ctri_number,
        details: `Updated trial parameters for ${trial.ctri_number}`,
        ipAddress: req.ip
      });

      res.json({ message: 'Trial updated successfully.' });
    } catch (err) {
      console.error('Error updating trial:', err);
      res.status(500).json({ error: 'Failed to update trial details.' });
    }
  }
);

// UPDATE trial lifecycle stage (Ethics Approval → CTRI Registration → Site Activation → Enrollment → Data Collection → Trial Closeout)
router.put(
  '/:id/stage',
  authenticateToken,
  requireRole([ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]),
  (req, res) => {
    try {
      const { stage } = req.body;
      const validStages = [
        'Ethics Approval',
        'CTRI Registration',
        'Site Activation',
        'Enrollment',
        'Data Collection',
        'Trial Closeout'
      ];

      if (!validStages.includes(stage)) {
        return res.status(400).json({ error: 'Invalid lifecycle stage name.' });
      }

      const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(req.params.id);
      if (!trial) return res.status(404).json({ error: 'Trial not found' });

      db.prepare('UPDATE trials SET current_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        stage,
        req.params.id
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'UPDATE',
        entityAffected: 'TRIAL',
        entityId: trial.ctri_number,
        details: `Advanced lifecycle stage to: '${stage}' from '${trial.current_stage}'`,
        ipAddress: req.ip
      });

      res.json({ message: `Trial lifecycle stage transitioned to ${stage}.`, current_stage: stage });
    } catch (err) {
      console.error('Error advancing stage:', err);
      res.status(500).json({ error: 'Failed to update lifecycle stage.' });
    }
  }
);

// ETHICS REVIEW: Ethics Committee Member or Admin approves/rejects ethics status
router.put(
  '/:id/ethics',
  authenticateToken,
  requireRole([ROLES.ETHICS, ROLES.ADMIN]),
  (req, res) => {
    try {
      const { status, approval_date, notes } = req.body;

      if (!['Approved', 'Rejected', 'Submitted', 'Not submitted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid ethics review decision.' });
      }

      const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(req.params.id);
      if (!trial) return res.status(404).json({ error: 'Trial not found' });

      db.prepare(`
        UPDATE trials SET 
          ethics_status = ?,
          ethics_approval_date = ?,
          ethics_notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        status,
        status === 'Approved' ? (approval_date || new Date().toISOString().split('T')[0]) : null,
        notes || '',
        req.params.id
      );

      logAudit({
        userId: req.user.id,
        userName: req.user.full_name,
        userRole: req.user.designation,
        actionType: 'APPROVE',
        entityAffected: 'ETHICS',
        entityId: trial.ctri_number,
        details: `Ethics Committee action: status set to '${status}'. Reviewer comments: ${notes || 'None'}`,
        ipAddress: req.ip
      });

      res.json({
        message: `Ethics review decision recorded: ${status}`,
        ethics_status: status
      });
    } catch (err) {
      console.error('Error updating ethics review:', err);
      res.status(500).json({ error: 'Failed to record ethics review.' });
    }
  }
);

// DELETE trial (Admin only)
router.delete('/:id', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  try {
    const trial = db.prepare('SELECT * FROM trials WHERE id = ?').get(req.params.id);
    if (!trial) return res.status(404).json({ error: 'Trial not found' });

    db.prepare('DELETE FROM trials WHERE id = ?').run(req.params.id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.designation,
      actionType: 'DELETE',
      entityAffected: 'TRIAL',
      entityId: trial.ctri_number,
      details: `Deleted trial: ${trial.public_title} (${trial.ctri_number})`,
      ipAddress: req.ip
    });

    res.json({ message: 'Trial deleted successfully.' });
  } catch (err) {
    console.error('Error deleting trial:', err);
    res.status(500).json({ error: 'Failed to delete trial.' });
  }
});

module.exports = router;
