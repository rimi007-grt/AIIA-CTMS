const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

// Seed realistic consent & DPDP records if empty
function seedConsentData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM subject_consents').get().count;
  if (count === 0) {
    const trial = db.prepare('SELECT id FROM trials LIMIT 1').get();
    const trialId = trial ? trial.id : 1;

    const sampleConsents = [
      {
        trial_id: trialId,
        subject_pseudonym: 'SUBJ-KAYA-001',
        consent_version: 'v2.1',
        consent_date: '2026-01-15',
        is_audio_video_consented: 1,
        consent_status: 'Active',
        purpose_limitation: 'AIIA Chittodvega Anxiety Protocol v2.1 Only'
      },
      {
        trial_id: trialId,
        subject_pseudonym: 'SUBJ-KAYA-002',
        consent_version: 'v2.1',
        consent_date: '2026-01-18',
        is_audio_video_consented: 1,
        consent_status: 'Active',
        purpose_limitation: 'AIIA Chittodvega Anxiety Protocol v2.1 Only'
      },
      {
        trial_id: trialId,
        subject_pseudonym: 'SUBJ-KAYA-003',
        consent_version: 'v2.0',
        consent_date: '2026-02-01',
        is_audio_video_consented: 0,
        consent_status: 'Withdrawn',
        withdrawal_date: '2026-02-20',
        withdrawal_reason: 'Subject relocated out of National Capital Region (NCR)',
        purpose_limitation: 'Protocol Specific Research Only'
      },
      {
        trial_id: trialId,
        subject_pseudonym: 'SUBJ-PANCHA-010',
        consent_version: 'v1.3',
        consent_date: '2026-03-05',
        is_audio_video_consented: 1,
        consent_status: 'Active',
        purpose_limitation: 'Panchakarma OA Knee Clinical Protocol Only'
      }
    ];

    const insertC = db.prepare(`
      INSERT INTO subject_consents (trial_id, subject_pseudonym, consent_version, consent_date, is_audio_video_consented, consent_status, withdrawal_date, withdrawal_reason, purpose_limitation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    sampleConsents.forEach(c => insertC.run(
      c.trial_id, c.subject_pseudonym, c.consent_version, c.consent_date,
      c.is_audio_video_consented, c.consent_status, c.withdrawal_date || null,
      c.withdrawal_reason || null, c.purpose_limitation
    ));

    // Seed DPDP breach log
    const breachCount = db.prepare('SELECT COUNT(*) as count FROM dpdp_breach_log').get().count;
    if (breachCount === 0) {
      db.prepare(`
        INSERT INTO dpdp_breach_log (incident_date, nature_of_breach, affected_data_principals, root_cause, containment_action, reported_to_cert_in, cert_in_ack_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        '2026-02-14 03:15:00',
        'Unauthorized API brute force attempt on unauthenticated probe route',
        0,
        'External IP port scan blocked by AWS WAF & rate limiter',
        'Firewall IP banned globally; zero data exfiltration verified',
        1,
        'CERTIN-INC-2026-08941'
      );
    }
  }
}

seedConsentData();

// GET all consents
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trial_id, status } = req.query;
    let query = `
      SELECT sc.*, t.ctri_number, t.public_title
      FROM subject_consents sc
      JOIN trials t ON sc.trial_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (trial_id) {
      query += ` AND sc.trial_id = ?`;
      params.push(trial_id);
    }
    if (status && status !== 'All') {
      query += ` AND sc.consent_status = ?`;
      params.push(status);
    }
    query += ` ORDER BY sc.id DESC`;

    const consents = db.prepare(query).all(...params);
    const stats = {
      total: consents.length,
      active: consents.filter(c => c.consent_status === 'Active').length,
      withdrawn: consents.filter(c => c.consent_status === 'Withdrawn').length,
      avConsented: consents.filter(c => c.is_audio_video_consented === 1).length
    };

    res.json({ consents, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new consent record
router.post('/', authenticateToken, requireRole([ROLES.PI, ROLES.CO_I, ROLES.COORDINATOR]), (req, res) => {
  try {
    const { trial_id, subject_pseudonym, consent_version, consent_date, is_audio_video_consented, purpose_limitation } = req.body;
    if (!trial_id || !subject_pseudonym || !consent_date) {
      return res.status(400).json({ error: 'trial_id, subject_pseudonym, and consent_date are mandatory.' });
    }

    const stmt = db.prepare(`
      INSERT INTO subject_consents (trial_id, subject_pseudonym, consent_version, consent_date, is_audio_video_consented, consent_status, purpose_limitation)
      VALUES (?, ?, ?, ?, ?, 'Active', ?)
    `);
    const result = stmt.run(
      trial_id,
      subject_pseudonym.trim().toUpperCase(),
      consent_version || 'v1.0',
      consent_date,
      is_audio_video_consented ? 1 : 0,
      purpose_limitation || 'Protocol Specific Clinical Research Only'
    );

    logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'INFORMED_CONSENT_RECORDED',
      entityAffected: 'SUBJECT_CONSENT',
      entityId: subject_pseudonym.trim().toUpperCase(),
      fieldName: 'consent_status',
      newVal: 'Active',
      reasonForChange: `DPDP & Indian GCP Subject Consent Recorded (${consent_version})`,
      details: `Consent recorded for ${subject_pseudonym}. AV Consent: ${is_audio_video_consented ? 'Yes' : 'No'}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST withdraw consent (DPDP Act Section 6 Compliance)
router.post('/:id/withdraw', authenticateToken, requireRole([ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN]), (req, res) => {
  try {
    const { id } = req.params;
    const { withdrawal_reason, withdrawal_date } = req.body;

    const existing = db.prepare('SELECT * FROM subject_consents WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Consent record not found.' });

    const now = withdrawal_date || new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE subject_consents
      SET consent_status = 'Withdrawn',
          withdrawal_date = ?,
          withdrawal_reason = ?
      WHERE id = ?
    `).run(now, withdrawal_reason || 'Voluntary subject withdrawal', id);

    logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'CONSENT_WITHDRAWN',
      entityAffected: 'SUBJECT_CONSENT',
      entityId: existing.subject_pseudonym,
      fieldName: 'consent_status',
      oldVal: 'Active',
      newVal: 'Withdrawn',
      reasonForChange: `DPDP Act 2023 Section 6 Right to Withdraw: ${withdrawal_reason || 'Subject request'}`,
      details: `Subject ${existing.subject_pseudonym} withdrew consent on ${now}. Further prospective data collection ceased immediately.`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Consent successfully revoked per DPDP Act guidelines.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET DPDP & CERT-In breach register
router.get('/dpdp/breach-log', authenticateToken, requireRole([ROLES.ADMIN, ROLES.REGULATOR, ROLES.MONITOR]), (req, res) => {
  try {
    const breaches = db.prepare('SELECT * FROM dpdp_breach_log ORDER BY id DESC').all();
    res.json(breaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
