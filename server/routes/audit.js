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

// POST e-signature (21 CFR Part 11 & GCP Data Integrity Compliant)
const bcrypt = require('bcryptjs');

router.post('/e-sign', authenticateToken, (req, res) => {
  try {
    const { password, recordType, recordId, signatureMeaning, reasonComments, recordData } = req.body;
    
    if (!password || !recordType || !recordId || !signatureMeaning) {
      return res.status(400).json({ error: 'Password re-authentication, record type, record ID, and signature meaning are mandatory.' });
    }

    // 1. Re-authenticate user credentials
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-Signature Re-Authentication Failed: Invalid password.' });
    }

    // 2. Cryptographic hash of the record being signed
    const recordPayload = typeof recordData === 'object' ? JSON.stringify(recordData) : (recordData || `${recordType}:${recordId}`);
    const recordHash = crypto.createHash('sha256').update(recordPayload).digest('hex');

    // 3. Store e-signature
    const insertSig = db.prepare(`
      INSERT INTO e_signatures (record_type, record_id, user_id, signer_name, signer_role, signature_meaning, record_hash, reason_comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertSig.run(
      recordType,
      String(recordId),
      user.id,
      user.full_name,
      user.designation,
      signatureMeaning,
      recordHash,
      reasonComments || 'Verified and digitally signed under GCP Guidelines'
    );

    // 4. Log to ALCOA+ Audit Trail
    const { logAudit } = require('../db');
    logAudit({
      userId: user.id,
      userName: user.full_name,
      userRole: user.designation,
      actionType: 'E_SIGNATURE',
      entityAffected: recordType,
      entityId: String(recordId),
      fieldName: 'e_signature_status',
      oldVal: 'UNSIGNED',
      newVal: `SIGNED_${signatureMeaning.toUpperCase()}`,
      reasonForChange: `21 CFR Part 11 Digital Sign-off: ${signatureMeaning} - ${reasonComments || ''}`,
      details: `Digitally signed by ${user.full_name} (${user.designation}) with hash ${recordHash.slice(0, 16)}...`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      signatureId: result.lastInsertRowid,
      signerName: user.full_name,
      signerRole: user.designation,
      signatureMeaning,
      recordHash,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('E-signature error:', err);
    res.status(500).json({ error: 'Failed to record electronic signature: ' + err.message });
  }
});

// GET all recent e-signatures
router.get('/signatures', authenticateToken, (req, res) => {
  try {
    const signatures = db.prepare(`
      SELECT * FROM e_signatures ORDER BY id DESC LIMIT 100
    `).all();
    res.json({ signatures, totalSignatures: signatures.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET e-signatures for a record
router.get('/signatures/:recordType/:recordId', authenticateToken, (req, res) => {
  try {
    const { recordType, recordId } = req.params;
    const signatures = db.prepare(`
      SELECT * FROM e_signatures WHERE record_type = ? AND record_id = ? ORDER BY id DESC
    `).all(recordType, String(recordId));
    res.json(signatures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
