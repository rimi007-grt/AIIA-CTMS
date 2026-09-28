const { db } = require('./db');

// ─────────────────────────────────────────────────────────────
// Notification helper — creates a notification row in the DB
// and optionally broadcasts via Socket.io in real time
// ─────────────────────────────────────────────────────────────

let _io = null; // Socket.io server instance (set after server boot)

function setIO(io) {
  _io = io;
}

/**
 * createNotification
 * @param {object} opts
 *  - userId       : target user's DB id
 *  - message      : notification text
 *  - priority     : 'critical' | 'warning' | 'info'
 *  - relatedType  : 'trial' | 'ae' | 'user' | 'system'
 *  - relatedId    : numeric id of the related entity (optional)
 */
function createNotification({ userId, message, priority = 'info', relatedType = 'system', relatedId = null }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, message, priority, related_type, related_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(userId, message, priority, relatedType, relatedId || null);

    // Real-time push: emit to the specific user's socket room
    if (_io) {
      const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
      _io.to(`user:${userId}`).emit('notification', notif);
    }

    return result.lastInsertRowid;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * notifyUsers — bulk helper, sends same notification to multiple users
 */
function notifyUsers(userIds, opts) {
  const ids = [...new Set(userIds.filter(Boolean))];
  ids.forEach(uid => createNotification({ ...opts, userId: uid }));
}

/**
 * notifyByRole — notify all users matching a designation
 */
function notifyByRole(designation, opts) {
  try {
    const users = db.prepare('SELECT id FROM users WHERE designation = ?').all(designation);
    users.forEach(u => createNotification({ ...opts, userId: u.id }));
  } catch (err) {
    console.error('notifyByRole failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// SCHEDULED CHECKS — run periodically (every 6 hours in prod,
// every 30 seconds on first boot for seeding demo alerts)
// ─────────────────────────────────────────────────────────────

function runScheduledChecks() {
  console.log('[Notifications] Running scheduled deadline checks...');

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // ── 1. Ethics approval expiry (7-day warning) ──────────────
    const ethicsExpiring = db.prepare(`
      SELECT t.id, t.ctri_number, t.public_title, t.pi_id, t.ethics_approval_date
      FROM trials t
      WHERE t.ethics_approval_date IS NOT NULL
        AND t.recruitment_status != 'Closed'
        AND date(t.ethics_approval_date, '+1 year') BETWEEN date(?) AND date(?, '+7 days')
    `).all(todayStr, todayStr);

    ethicsExpiring.forEach(trial => {
      const expiryDate = new Date(trial.ethics_approval_date);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      const msg = `⚠️ Ethics approval for "${trial.public_title}" (${trial.ctri_number}) expires in ${daysLeft} day(s). Renewal submission required.`;

      // Notify PI
      if (trial.pi_id) createNotification({ userId: trial.pi_id, message: msg, priority: 'warning', relatedType: 'trial', relatedId: trial.id });
      // Notify all Ethics members
      notifyByRole('Ethics Committee Member', { message: msg, priority: 'warning', relatedType: 'trial', relatedId: trial.id });
    });

    // ── 2. Enrollment lagging behind target (<40%) ──────────────
    const laggingTrials = db.prepare(`
      SELECT t.id, t.ctri_number, t.public_title, t.pi_id,
             t.current_enrollment, t.target_sample_size_india,
             CAST(t.current_enrollment AS REAL) / t.target_sample_size_india AS ratio
      FROM trials t
      WHERE t.recruitment_status = 'Open to recruitment'
        AND t.target_sample_size_india > 0
        AND CAST(t.current_enrollment AS REAL) / t.target_sample_size_india < 0.40
    `).all();

    laggingTrials.forEach(trial => {
      const pct = Math.round(trial.ratio * 100);
      const msg = `📉 Enrollment for "${trial.public_title}" (${trial.ctri_number}) is lagging at ${pct}% of target. Recruitment action required.`;
      if (trial.pi_id) createNotification({ userId: trial.pi_id, message: msg, priority: 'warning', relatedType: 'trial', relatedId: trial.id });
    });

    // ── 3. Overdue SAE reporting ────────────────────────────────
    // SAE must be reported within 24h; flag if >20h (approaching) or overdue
    const overdueSAEs = db.prepare(`
      SELECT ae.id, ae.patient_id, ae.trial_id, ae.event_date, ae.seriousness,
             t.ctri_number, t.public_title, t.pi_id
      FROM adverse_events ae
      JOIN trials t ON t.id = ae.trial_id
      WHERE ae.seriousness = 'SAE'
        AND ae.reporting_status != 'On-Time'
    `).all();

    overdueSAEs.forEach(ae => {
      const msg = `🚨 OVERDUE SAE: Patient ${ae.patient_id} on trial ${ae.ctri_number} has an unreported SAE (event date: ${ae.event_date}). DCGI 24h deadline exceeded.`;
      if (ae.pi_id) createNotification({ userId: ae.pi_id, message: msg, priority: 'critical', relatedType: 'ae', relatedId: ae.id });
      notifyByRole('Pharmacovigilance Officer', { message: msg, priority: 'critical', relatedType: 'ae', relatedId: ae.id });
      notifyByRole('Institutional Admin', { message: msg, priority: 'critical', relatedType: 'ae', relatedId: ae.id });
    });

    console.log(`[Notifications] Checks done — ethics: ${ethicsExpiring.length}, lagging: ${laggingTrials.length}, overdue SAE: ${overdueSAEs.length}`);
  } catch (err) {
    console.error('[Notifications] Scheduled check error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// SEED — generate initial demo notifications on first run
// ─────────────────────────────────────────────────────────────

function seedDemoNotifications() {
  try {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;
    if (existingCount > 0) return; // already seeded

    console.log('[Notifications] Seeding initial demo notifications...');

    // Fetch users by role to target correctly
    const allUsers = db.prepare('SELECT id, designation FROM users').all();
    const byRole = {};
    allUsers.forEach(u => {
      if (!byRole[u.designation]) byRole[u.designation] = [];
      byRole[u.designation].push(u.id);
    });

    const allAdmins    = byRole['Institutional Admin'] || [];
    const allPI        = byRole['Principal Investigator (PI)'] || [];
    const allPV        = byRole['Pharmacovigilance Officer'] || [];
    const allEthics    = byRole['Ethics Committee Member'] || [];
    const allMonitors  = byRole['Clinical Monitor'] || [];
    const allRegulators= byRole['Regulator'] || [];

    const getTrials = db.prepare('SELECT id, ctri_number, public_title, pi_id FROM trials LIMIT 6').all();

    // ── Demo notifications (seeded, different timestamps) ─────
    const demoNotifs = [
      // Critical — SAE unreported
      ...allPI.map(uid => ({ userId: uid, message: `🚨 CRITICAL: SAE reported for Patient AY-001 on ${getTrials[0]?.ctri_number || 'CTRI-2024-001'}. DCGI 24h reporting deadline in 3 hours. Immediate action required.`, priority: 'critical', relatedType: 'ae' })),
      ...allPV.map(uid => ({ userId: uid, message: `🚨 CRITICAL: New SAE filed on ${getTrials[0]?.ctri_number || 'CTRI-2024-001'}. Patient AY-001. MedDRA: Hepatotoxicity. Pharmacovigilance review mandatory within 24h.`, priority: 'critical', relatedType: 'ae' })),
      ...allAdmins.map(uid => ({ userId: uid, message: `🚨 SAE Alert: New Serious Adverse Event reported on trial ${getTrials[0]?.ctri_number || 'CTRI-2024-001'}. Expedited DCGI reporting initiated.`, priority: 'critical', relatedType: 'ae' })),

      // Warning — Ethics renewal
      ...allEthics.map(uid => ({ userId: uid, message: `⚠️ Ethics approval for "${getTrials[1]?.public_title || 'Ashwagandha Phase II'}" expires in 6 days. IEC renewal submission required.`, priority: 'warning', relatedType: 'trial', relatedId: getTrials[1]?.id })),
      ...allPI.map(uid => ({ userId: uid, message: `⚠️ Enrollment lagging on ${getTrials[2]?.ctri_number || 'CTRI-2024-003'}: only 34% of target reached. Site activation needed.`, priority: 'warning', relatedType: 'trial', relatedId: getTrials[2]?.id })),
      ...allMonitors.map(uid => ({ userId: uid, message: `⚠️ Overdue Monitoring Visit: ${getTrials[3]?.ctri_number || 'CTRI-2024-004'} — scheduled monitoring not completed. CAPA required.`, priority: 'warning', relatedType: 'trial', relatedId: getTrials[3]?.id })),

      // Info — routine
      ...allAdmins.map(uid => ({ userId: uid, message: `ℹ️ New user account created: Dr. Priya Verma (Study Coordinator) registered and pending activation.`, priority: 'info', relatedType: 'user' })),
      ...allPI.map(uid => ({ userId: uid, message: `ℹ️ Trial ${getTrials[4]?.ctri_number || 'CTRI-2024-005'} has been approved by the Ethics Committee. Study can proceed to enrollment phase.`, priority: 'info', relatedType: 'trial', relatedId: getTrials[4]?.id })),
      ...allRegulators.map(uid => ({ userId: uid, message: `ℹ️ CTRI registration for ${getTrials[5]?.ctri_number || 'CTRI-2024-006'} is due for annual update. Submission deadline: 7 days.`, priority: 'warning', relatedType: 'trial', relatedId: getTrials[5]?.id })),
      ...allPV.map(uid => ({ userId: uid, message: `ℹ️ Monthly Pharmacovigilance Summary: 3 new AEs (1 SAE) reported this month. All within DCGI timelines.`, priority: 'info', relatedType: 'system' })),
    ];

    demoNotifs.forEach(n => createNotification(n));
    console.log(`[Notifications] Seeded ${demoNotifs.length} demo notifications.`);
  } catch (err) {
    console.error('[Notifications] Seed error:', err.message);
  }
}

module.exports = { setIO, createNotification, notifyUsers, notifyByRole, runScheduledChecks, seedDemoNotifications };
