const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, logAudit } = require('../db');
const { JWT_SECRET, ROLES, authenticateToken } = require('../middleware/auth');
const { notifyByRole } = require('../notifications');

// Available roles for registration
const VALID_ROLES = [
  'Principal Investigator (PI)',
  'Study Coordinator',
  'Clinical Monitor',
  'Ethics Committee Member',
  'Pharmacovigilance Officer',
  'Institutional Admin',
  'Regulator'
];

const VALID_DEPARTMENTS = [
  'Kayachikitsa',
  'Panchakarma',
  'Dravyaguna',
  'Clinical Research',
  'Pharmacovigilance',
  'Shalya Tantra',
  'Shalakya Tantra',
  'Prasuti & Stri Roga',
  'Kaumarbhritya (Pediatrics)',
  'Rasa Shastra & Bhaishajya Kalpana',
  'Institutional Ethics Committee',
  'Administration & Regulatory Directorate'
];

// Register user
router.post('/register', (req, res) => {
  try {
    const { full_name, email, password, designation, department, organization } = req.body;

    if (!full_name || !email || !password || !designation || !department) {
      return res.status(400).json({ error: 'All mandatory fields must be provided.' });
    }

    if (!VALID_ROLES.includes(designation)) {
      return res.status(400).json({ error: `Invalid role selected. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const org = organization || 'All India Institute of Ayurveda, New Delhi';

    const insert = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, designation, department, organization)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(full_name, email.toLowerCase(), password_hash, designation, department, org);
    const userId = result.lastInsertRowid;

    const token = jwt.sign(
      {
        id: userId,
        full_name,
        email: email.toLowerCase(),
        designation,
        department,
        organization: org
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit({
      userId,
      userName: full_name,
      userRole: designation,
      actionType: 'CREATE',
      entityAffected: 'USER',
      entityId: userId,
      details: `New user registration for ${full_name} (${designation}) in ${department}`,
      ipAddress: req.ip
    });

    // Notify admins about new user
    notifyByRole(ROLES.ADMIN, {
      message: `ℹ️ New user account created: ${full_name} (${designation}, ${department}). Review and activate as needed.`,
      priority: 'info',
      relatedType: 'user',
      relatedId: userId
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        full_name,
        email: email.toLowerCase(),
        designation,
        department,
        organization: org
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        designation: user.designation,
        department: user.department,
        organization: user.organization
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit({
      userId: user.id,
      userName: user.full_name,
      userRole: user.designation,
      actionType: 'LOGIN',
      entityAffected: 'USER',
      entityId: user.id,
      details: `User logged in successfully from IP ${req.ip}`,
      ipAddress: req.ip
    });

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        designation: user.designation,
        department: user.department,
        organization: user.organization
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during sign in.' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, full_name, email, designation, department, organization, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({ user });
});

// Demo accounts list for 1-click login during evaluations
router.get('/demo-users', (req, res) => {
  const demoUsers = db.prepare(`
    SELECT id, full_name, email, designation, department, organization
    FROM users
    ORDER BY id ASC
  `).all();

  res.json({ demoUsers });
});

// 1-click Demo Login
router.post('/demo-login', (req, res) => {
  const { role, email } = req.body;
  let user;

  if (email) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  } else if (role) {
    user = db.prepare('SELECT * FROM users WHERE designation = ? LIMIT 1').get(role);
  }

  if (!user) {
    user = db.prepare('SELECT * FROM users LIMIT 1').get();
  }

  const token = jwt.sign(
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      designation: user.designation,
      department: user.department,
      organization: user.organization
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logAudit({
    userId: user.id,
    userName: user.full_name,
    userRole: user.designation,
    actionType: 'LOGIN',
    entityAffected: 'USER',
    entityId: user.id,
    details: `1-Click Demo session initiated for ${user.designation}`,
    ipAddress: req.ip
  });

  res.json({
    message: `Logged in as demo persona: ${user.designation}`,
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      designation: user.designation,
      department: user.department,
      organization: user.organization
    }
  });
});

// Forgot Password Flow (Demo & Functional with Reset Code)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    return res.status(404).json({ error: 'No user registered with this email.' });
  }

  // Generate 6-digit verification code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO password_resets (email, reset_code, expires_at)
    VALUES (?, ?, ?)
  `).run(email.toLowerCase(), resetCode, expiresAt);

  logAudit({
    userId: user.id,
    userName: user.full_name,
    userRole: user.designation,
    actionType: 'UPDATE',
    entityAffected: 'USER',
    entityId: user.id,
    details: `Password reset request submitted for ${email}`,
    ipAddress: req.ip
  });

  res.json({
    message: 'Verification code generated for password reset.',
    demo_code: resetCode, // Returned for instant demo testing
    expires_in: '15 minutes'
  });
});

// Reset Password with verification code
router.post('/reset-password', (req, res) => {
  const { email, reset_code, new_password } = req.body;

  if (!email || !reset_code || !new_password) {
    return res.status(400).json({ error: 'Email, code, and new password are required.' });
  }

  const record = db.prepare(`
    SELECT * FROM password_resets 
    WHERE LOWER(email) = LOWER(?) AND reset_code = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `).get(email, reset_code);

  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired password reset verification code.' });
  }

  const password_hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)').run(password_hash, email);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

  logAudit({
    userId: null,
    userName: email,
    userRole: 'Self-Service',
    actionType: 'UPDATE',
    entityAffected: 'USER',
    entityId: email,
    details: 'Password successfully updated via reset verification code.',
    ipAddress: req.ip
  });

  res.json({ message: 'Password has been reset successfully. You may now sign in with your new password.' });
});

module.exports = {
  router,
  VALID_ROLES,
  VALID_DEPARTMENTS
};
