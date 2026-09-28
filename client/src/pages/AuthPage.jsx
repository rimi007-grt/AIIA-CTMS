import React, { useState } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  ShieldCheck,
  KeyRound,
  Mail,
  User,
  Building,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lock,
  RefreshCw,
  Stethoscope,
  Briefcase
} from 'lucide-react';

export default function AuthPage() {
  const { login, register, demoLogin } = useAuth();
  
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDesignation, setRegDesignation] = useState(ROLES.PI);
  const [regDepartment, setRegDepartment] = useState('Kayachikitsa');
  const [regOrg, setRegOrg] = useState('All India Institute of Ayurveda, New Delhi');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: enter email, 2: enter code & new pass

  const departments = [
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

  const demoAccounts = [
    {
      role: ROLES.PI,
      title: 'Principal Investigator (PI)',
      name: 'Dr. Anand Vaidya',
      email: 'pi.vaidya@aiia.gov.in',
      desc: 'Can create & update trials, view own study KPIs, report AEs'
    },
    {
      role: ROLES.COORDINATOR,
      title: 'Study Coordinator',
      name: 'Pooja Sharma',
      email: 'coordinator.sharma@aiia.gov.in',
      desc: 'Manage subject enrollment, coordinate trial workflows'
    },
    {
      role: ROLES.MONITOR,
      title: 'Clinical Monitor',
      name: 'Vikram Kapoor',
      email: 'monitor.kapoor@aiia.gov.in',
      desc: 'GCP compliance audits & flag protocol deviations'
    },
    {
      role: ROLES.ETHICS,
      title: 'Ethics Committee Member',
      name: 'Prof. H.C. Verma',
      email: 'ethics.verma@aiia.gov.in',
      desc: 'Institutional Ethics Committee approval & oversight'
    },
    {
      role: ROLES.PV,
      title: 'Pharmacovigilance Officer',
      name: 'Dr. Shalini Joshi',
      email: 'pv.joshi@aiia.gov.in',
      desc: 'Adverse event tracking, MedDRA coding & safety analytics'
    },
    {
      role: ROLES.ADMIN,
      title: 'Institutional Admin',
      name: 'Directorate AIIA',
      email: 'admin@aiia.gov.in',
      desc: 'Full administrative access, user directory & audit trail'
    },
    {
      role: ROLES.REGULATOR,
      title: 'Regulator (Read-Only)',
      name: 'Dr. Rajesh Bhushan',
      email: 'regulator.ayush@gov.in',
      desc: 'Read-only access to national trial registries & compliance'
    }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
        designation: regDesignation,
        department: regDepartment,
        organization: regOrg
      });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (role) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin({ role });
    } catch (err) {
      setError(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setDemoCode(res.demo_code);
      setResetStep(2);
      setSuccess('Verification code generated. Enter code below to set new password.');
    } catch (err) {
      setError(err.message || 'Failed to request reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: forgotEmail,
        reset_code: resetCodeInput,
        new_password: newPassword
      });
      setSuccess(res.message);
      setTimeout(() => {
        setActiveTab('login');
        setResetStep(1);
        setSuccess('Password updated successfully. You can now log in.');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F7F5] via-[#EBF2EE] to-[#E2EBE5] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Top Banner / Government Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Smart India Hackathon 2026 • Problem Statement SIH26046</span>
        </div>

        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              AIIA Clinical Trials Dashboard
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Clinical Trial Management System (CTMS) • All India Institute of Ayurveda
            </p>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
          
          {/* Tabs */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6 text-xs font-medium">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-md transition-all ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-md transition-all ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              New Registration (RBAC)
            </button>
            <button
              onClick={() => { setActiveTab('forgot'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-md transition-all ${
                activeTab === 'forgot'
                  ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Forgot Password
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN TAB */}
          {activeTab === 'login' && (
            <div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. pi.vaidya@aiia.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your CTMS password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Secure CTMS Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick 1-Click Demo Login Personas */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Demo Sign-In (For SIH Evaluators)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">1-Click Auth</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {demoAccounts.map(demo => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => handleDemoSignIn(demo.role)}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 text-left transition-all group"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                        {demo.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                        {demo.name}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {demo.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REGISTER TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Chander"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. dr.ramesh@aiia.gov.in"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value={ROLES.PI}>Principal Investigator (PI)</option>
                    <option value={ROLES.COORDINATOR}>Study Coordinator</option>
                    <option value={ROLES.MONITOR}>Clinical Monitor</option>
                    <option value={ROLES.ETHICS}>Ethics Committee Member</option>
                    <option value={ROLES.PV}>Pharmacovigilance Officer</option>
                    <option value={ROLES.ADMIN}>Institutional Admin</option>
                    <option value={ROLES.REGULATOR}>Regulator (read-only access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Organization / Site Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regOrg}
                    onChange={(e) => setRegOrg(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <strong>RBAC Notice:</strong> Your permissions (trial creation, ethics review, safety reporting, audit view) will be configured automatically based on your selected Designation.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create CTMS Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD TAB */}
          {activeTab === 'forgot' && (
            <div className="space-y-4">
              {resetStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Enter the email address registered with your AIIA CTMS account. A 6-digit verification code will be generated for password reset.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. pi.vaidya@aiia.gov.in"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    {loading ? 'Processing...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  {demoCode && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                      <strong>Demo Reset Code: </strong>
                      <span className="font-mono text-sm tracking-widest font-bold ml-1">{demoCode}</span>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                        (Simulated SMS/Email gateway code)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value)}
                      placeholder="Enter the 6-digit code"
                      className="w-full px-3 py-2 text-xs font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    {loading ? 'Updating Password...' : 'Reset Password & Proceed'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
        All India Institute of Ayurveda • Ministry of Ayush, Government of India
      </div>

    </div>
  );
}
