import React, { useState, useRef, useEffect } from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  Leaf,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Sparkles,
  Settings
} from 'lucide-react';

// Role → avatar background color
const ROLE_AVATAR_COLOR = {
  [ROLES.PI]:          'bg-blue-600',
  [ROLES.COORDINATOR]: 'bg-purple-600',
  [ROLES.MONITOR]:     'bg-orange-500',
  [ROLES.ETHICS]:      'bg-teal-600',
  [ROLES.PV]:          'bg-rose-600',
  [ROLES.ADMIN]:       'bg-emerald-700',
  [ROLES.REGULATOR]:   'bg-slate-600',
};

// Role → short label shown in demo switcher pill
const ROLE_SHORT = {
  [ROLES.PI]:          'PI',
  [ROLES.COORDINATOR]: 'Coord.',
  [ROLES.MONITOR]:     'Monitor',
  [ROLES.ETHICS]:      'Ethics',
  [ROLES.PV]:          'PV',
  [ROLES.ADMIN]:       'Admin',
  [ROLES.REGULATOR]:   'Regulator',
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Navbar({ onNavigate, currentTab }) {
  const { user, logout, demoLogin, theme, toggleTheme } = useAuth();
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [switching, setSwitching] = useState(null); // role string being switched to
  const dropdownRef = useRef(null);

  const demoRoles = [
    { label: 'Principal Investigator', sub: 'Kayachikitsa Dept.', role: ROLES.PI },
    { label: 'Study Coordinator', sub: 'Clinical Research', role: ROLES.COORDINATOR },
    { label: 'Clinical Monitor', sub: 'GCP Monitoring Unit', role: ROLES.MONITOR },
    { label: 'Ethics Committee Member', sub: 'Institutional Ethics Committee', role: ROLES.ETHICS },
    { label: 'Pharmacovigilance Officer', sub: 'Safety Surveillance', role: ROLES.PV },
    { label: 'Institutional Admin', sub: 'AIIA Directorate', role: ROLES.ADMIN },
    { label: 'Regulator', sub: 'Ayush Regulatory Cell', role: ROLES.REGULATOR },
  ];

  // Close on outside click
  useEffect(() => {
    if (!showDemoDropdown) return;
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDemoDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDemoDropdown]);

  const handleRoleSwitch = async (role) => {
    try {
      setSwitching(role);
      await demoLogin({ role });
      setShowDemoDropdown(false);
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setSwitching(null);
    }
  };

  const avatarColor = ROLE_AVATAR_COLOR[user?.designation] || 'bg-emerald-700';
  const initials = getInitials(user?.full_name || '');

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Logo ── */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors">
              <Leaf className="w-5 h-5 text-amber-300" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  AIIA CTMS
                </span>
                <span className="hidden md:inline px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                  SIH26046
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                All India Institute of Ayurveda
              </p>
            </div>
          </button>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Demo Persona Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDemoDropdown(v => !v)}
                disabled={!!switching}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all"
                title="Switch demo persona"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline font-semibold">Demo:</span>
                <span className="font-medium text-amber-800 dark:text-amber-300 max-w-[80px] truncate hidden md:inline">
                  {ROLE_SHORT[user?.designation] || '—'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-600 transition-transform ${showDemoDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDemoDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b border-amber-100 dark:border-amber-900/40">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Role Switcher — Try any persona
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      UI adapts instantly to each role's permissions
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {demoRoles.map(item => {
                      const isActive = user?.designation === item.role;
                      const isLoading = switching === item.role;
                      const color = ROLE_AVATAR_COLOR[item.role] || 'bg-slate-500';
                      return (
                        <button
                          key={item.role}
                          onClick={() => handleRoleSwitch(item.role)}
                          disabled={!!switching}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                            {isLoading ? (
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              item.label.split(' ').map(w => w[0]).join('').slice(0,2)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{item.sub}</p>
                          </div>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light'
                ? <Moon className="w-4 h-4" />
                : <Sun className="w-4 h-4 text-amber-400" />
              }
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User avatar + name */}
            <div className="hidden lg:flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-700 ml-1">
              <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0`}>
                {initials}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                  {user?.full_name}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate max-w-[120px]">
                  {user?.department}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
