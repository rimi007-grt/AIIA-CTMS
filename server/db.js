const path = require('path');
const dbPath = path.join(__dirname, 'ctms.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (e) {
  // Seamless fallback to Node.js built-in SQLite (Node 22.5+)
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.pragma = (sql) => {
    try {
      db.exec(`PRAGMA ${sql};`);
    } catch (_) {}
  };
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      organization TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ctri_number TEXT UNIQUE NOT NULL,
      public_title TEXT NOT NULL,
      scientific_title TEXT NOT NULL,
      pi_name TEXT NOT NULL,
      pi_id INTEGER,
      department TEXT NOT NULL,
      site_name TEXT NOT NULL,
      ethics_status TEXT NOT NULL DEFAULT 'Submitted',
      ethics_approval_date TEXT,
      ethics_notes TEXT,
      dcgi_approval TEXT NOT NULL DEFAULT 'Yes',
      health_condition TEXT NOT NULL,
      study_type TEXT NOT NULL DEFAULT 'Interventional',
      phase TEXT NOT NULL DEFAULT 'Phase 2',
      intervention TEXT NOT NULL,
      comparator TEXT NOT NULL,
      target_sample_size_india INTEGER NOT NULL,
      target_sample_size_total INTEGER NOT NULL,
      current_enrollment INTEGER NOT NULL DEFAULT 0,
      recruitment_status TEXT NOT NULL DEFAULT 'Open to recruitment',
      date_of_first_enrollment TEXT,
      estimated_duration TEXT NOT NULL,
      current_stage TEXT NOT NULL DEFAULT 'Enrollment',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pi_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS adverse_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      trial_id INTEGER NOT NULL,
      event_description TEXT NOT NULL,
      severity TEXT NOT NULL,
      seriousness TEXT NOT NULL,
      event_date TEXT NOT NULL,
      report_date TEXT NOT NULL,
      meddra_code TEXT NOT NULL,
      meddra_term TEXT NOT NULL,
      outcome TEXT DEFAULT 'Recovered',
      causality TEXT DEFAULT 'Possible',
      reporting_status TEXT DEFAULT 'On-Time',
      reported_by INTEGER,
      action_taken TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trial_id) REFERENCES trials(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS protocol_deviations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trial_id INTEGER NOT NULL,
      patient_id TEXT,
      deviation_type TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      action_taken TEXT,
      status TEXT DEFAULT 'Open',
      flagged_by INTEGER,
      flagged_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trial_id) REFERENCES trials(id) ON DELETE CASCADE,
      FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_affected TEXT NOT NULL,
      entity_id TEXT,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      reason_for_change TEXT,
      details TEXT,
      ip_address TEXT,
      prev_hash TEXT,
      curr_hash TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT '>',
      threshold_value REAL NOT NULL,
      recipient_role TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'amber',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subject_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trial_id INTEGER NOT NULL,
      subject_pseudonym TEXT NOT NULL,
      consent_version TEXT NOT NULL DEFAULT 'v1.0',
      consent_date TEXT NOT NULL,
      is_audio_video_consented INTEGER NOT NULL DEFAULT 0,
      consent_status TEXT NOT NULL DEFAULT 'Active',
      withdrawal_date TEXT,
      withdrawal_reason TEXT,
      purpose_limitation TEXT NOT NULL DEFAULT 'Protocol Specific Research Only',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trial_id) REFERENCES trials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dpdp_breach_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_date TEXT NOT NULL,
      nature_of_breach TEXT NOT NULL,
      affected_data_principals INTEGER NOT NULL DEFAULT 0,
      root_cause TEXT NOT NULL,
      containment_action TEXT NOT NULL,
      reported_to_cert_in INTEGER NOT NULL DEFAULT 1,
      cert_in_ack_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS e_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      signer_name TEXT NOT NULL,
      signer_role TEXT NOT NULL,
      signature_meaning TEXT NOT NULL,
      record_hash TEXT NOT NULL,
      reason_comments TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cdisc_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trial_id INTEGER NOT NULL,
      usubjid TEXT UNIQUE NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      race TEXT NOT NULL DEFAULT 'ASIAN',
      armcd TEXT NOT NULL,
      vital_bp TEXT DEFAULT '120/80',
      vital_pulse INTEGER DEFAULT 72,
      vital_temp REAL DEFAULT 36.8,
      vital_visit TEXT DEFAULT 'VISIT 1',
      exposure_treatment TEXT NOT NULL,
      exposure_dose REAL NOT NULL,
      exposure_unit TEXT NOT NULL,
      exposure_date TEXT NOT NULL,
      FOREIGN KEY (trial_id) REFERENCES trials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      reset_code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'info',
      related_type TEXT DEFAULT 'system',
      related_id INTEGER DEFAULT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure columns exist on legacy audit_log tables
  const cols = db.prepare("PRAGMA table_info(audit_log)").all().map(c => c.name);
  if (!cols.includes('old_value')) db.exec("ALTER TABLE audit_log ADD COLUMN old_value TEXT");
  if (!cols.includes('new_value')) db.exec("ALTER TABLE audit_log ADD COLUMN new_value TEXT");
  if (!cols.includes('reason_for_change')) db.exec("ALTER TABLE audit_log ADD COLUMN reason_for_change TEXT");
  if (!cols.includes('field_name')) db.exec("ALTER TABLE audit_log ADD COLUMN field_name TEXT");
  if (!cols.includes('prev_hash')) db.exec("ALTER TABLE audit_log ADD COLUMN prev_hash TEXT");
  if (!cols.includes('curr_hash')) db.exec("ALTER TABLE audit_log ADD COLUMN curr_hash TEXT");
}

initSchema();

const crypto = require('crypto');
const GENESIS_HASH = '0'.repeat(64);

function logAudit({ userId, userName, userRole, actionType, entityAffected, entityId, fieldName, oldVal, newVal, reasonForChange, details, ipAddress }) {
  try {
    const lastRow = db.prepare('SELECT curr_hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
    const prevHash = lastRow?.curr_hash || GENESIS_HASH;
    const nowIso = new Date().toISOString();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');
    const oldValStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : (oldVal !== undefined && oldVal !== null ? String(oldVal) : '');
    const newValStr = typeof newVal === 'object' ? JSON.stringify(newVal) : (newVal !== undefined && newVal !== null ? String(newVal) : '');
    const reasonStr = reasonForChange || '';
    const fieldStr = fieldName || '';
    
    const rawString = `${prevHash}|${nowIso}|${actionType}|${entityAffected}|${entityId || ''}|${fieldStr}|${oldValStr}|${newValStr}|${reasonStr}|${userName || 'System'}|${detailsStr}`;
    const currHash = crypto.createHash('sha256').update(rawString).digest('hex');

    const stmt = db.prepare(`
      INSERT INTO audit_log (
        user_id, user_name, user_role, action_type, entity_affected, entity_id,
        field_name, old_value, new_value, reason_for_change, details, ip_address,
        prev_hash, curr_hash, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId || null,
      userName || 'System',
      userRole || 'System',
      actionType,
      entityAffected,
      entityId ? String(entityId) : null,
      fieldStr || null,
      oldValStr || null,
      newValStr || null,
      reasonStr || null,
      detailsStr,
      ipAddress || '127.0.0.1',
      prevHash,
      currHash,
      nowIso
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}


function verifyAuditIntegrity() {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id ASC').all();
  let isIntact = true;
  const report = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const expectedPrev = i > 0 ? (rows[i - 1].curr_hash || GENESIS_HASH) : GENESIS_HASH;
    const prevMatches = !row.prev_hash || row.prev_hash === expectedPrev;

    const rawWithDiff = `${row.prev_hash || expectedPrev}|${row.timestamp}|${row.action_type}|${row.entity_affected}|${row.entity_id || ''}|${row.field_name || ''}|${row.old_value || ''}|${row.new_value || ''}|${row.reason_for_change || ''}|${row.user_name}|${row.details || ''}`;
    const rawOld = `${row.prev_hash || expectedPrev}|${row.timestamp}|${row.action_type}|${row.entity_affected}|${row.entity_id || ''}|${row.user_name}|${row.details || ''}`;
    const hashWithDiff = crypto.createHash('sha256').update(rawWithDiff).digest('hex');
    const hashOld = crypto.createHash('sha256').update(rawOld).digest('hex');
    const recalculated = row.curr_hash === hashOld ? hashOld : hashWithDiff;
    const hashMatches = !row.curr_hash || row.curr_hash === hashWithDiff || row.curr_hash === hashOld;

    const valid = prevMatches && hashMatches;
    if (!valid) isIntact = false;

    report.push({
      log_id: row.id,
      timestamp: row.timestamp,
      action_type: row.action_type,
      entity_affected: row.entity_affected,
      entity_id: row.entity_id,
      prev_hash: row.prev_hash || expectedPrev,
      curr_hash: row.curr_hash || recalculated,
      prev_hash_match: prevMatches,
      hash_verified: hashMatches,
      status: valid ? 'VALID' : 'TAMPERED'
    });
  }

  return { is_chain_intact: isIntact, total_records_checked: rows.length, report };
}

module.exports = { db, logAudit, verifyAuditIntegrity, GENESIS_HASH };

