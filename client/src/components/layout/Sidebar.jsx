import React, { useState } from 'react';
import { useAuth, ROLES } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert,
  History,
  DownloadCloud,
  Users,
  Lock,
  CheckCircle2,
  Leaf
} from 'lucide-react';

const ROLE_COLOR = {
  [ROLES.PI]:          { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  [ROLES.COORDINATOR]: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  [ROLES.MONITOR]:     { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  [ROLES.ETHICS]:      { bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-700 dark:text-teal-300',    dot: 'bg-teal-500' },
  [ROLES.PV]:          { bg: 'bg-rose-100 dark:bg-rose-900/40',    text: 'text-rose-700 dark:text-rose-300',    dot: 'bg-rose-500' },
  [ROLES.ADMIN]:       { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-600' },
  [ROLES.REGULATOR]:   { bg: 'bg-slate-100 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500' },
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();
  const [tooltip, setTooltip] = useState(null);

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard, roles: null,          desc: 'Overview & KPIs' },
    { id: 'trials',     label: 'Clinical Trials',     icon: FileSpreadsheet,  roles: null,          desc: 'CTRI-registered studies' },
    { id: 'safety',     label: 'Safety Monitoring',   icon: AlertTriangle,    roles: null,          desc: 'AE / SAE reports',
      badge: user?.designation === ROLES.PV ? 'PV Lead' : null },
    { id: 'deviations', label: 'Protocol Deviations', icon: ShieldAlert,
      roles: [ROLES.MONITOR, ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN, ROLES.REGULATOR],
      desc: 'GCP findings & CAPA',
      badge: user?.designation === ROLES.MONITOR ? 'GCP' : null,
      requiredRoles: 'Monitor, PI, Coordinator, Admin, Regulator' },
    { id: 'ethics',     label: 'Ethics Committee',    icon: ClipboardCheck,
      roles: [ROLES.ETHICS, ROLES.ADMIN, ROLES.REGULATOR],
      desc: 'IEC approvals',
      badge: user?.designation === ROLES.ETHICS ? 'IEC' : null,
      requiredRoles: 'Ethics Member, Admin, Regulator' },
    { id: 'audit',      label: 'Audit Trail',         icon: History,
      roles: [ROLES.ADMIN, ROLES.REGULATOR],
      desc: '21 CFR Part 11 logs',
      badge: 'Immutable',
      requiredRoles: 'Admin, Regulator' },
    { id: 'export',     label: 'Data Export',         icon: DownloadCloud,    roles: null,          desc: 'CDISC / FHIR datasets', badge: 'FHIR' },
    { id: 'users',      label: 'User Directory',      icon: Users,
      roles: [ROLES.ADMIN],
      desc: 'Accounts & roles',
      badge: 'Admin',
      requiredRoles: 'Institutional Admin only' },
  ];

  const isAllowed = (item) => !item.roles || item.roles.includes(user?.designation);

  const roleStyle = ROLE_COLOR[user?.designation] || ROLE_COLOR[ROLES.ADMIN];
  const avatarBg  = roleStyle.dot;
  const initials  = getInitials(user?.full_name || '');

  return (
    <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] transition-colors duration-300">

      {/* Nav items */}
      <nav className="flex-1 p-3 pt-4 space-y-0.5">
        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Navigation
        </p>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const allowed = isAllowed(item);

          if (!allowed) {
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setTooltip(item.id)}
                onMouseLeave={() => setTooltip(null)}
              >
                <button
                  onClick={() => onSelectTab(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium
                    text-slate-300 dark:text-slate-600 opacity-60 cursor-not-allowed
                    hover:bg-red-50 dark:hover:bg-red-950/20 hover:opacity-80 transition-all group"
                  aria-disabled="true"
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-700" />
                  <span className="flex-1 text-left truncate line-through decoration-dotted">{item.label}</span>
                  <Lock className="w-3 h-3 text-red-300 dark:text-red-700 shrink-0" />
                </button>

                {tooltip === item.id && (
                  <div className="absolute left-full top-1 ml-2 z-50 w-52 bg-slate-800 text-white text-[11px] rounded-xl shadow-2xl p-3 border border-slate-700 pointer-events-none">
                    <p className="text-red-400 font-semibold mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Access Restricted
                    </p>
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      Requires: <span className="text-amber-300 font-medium">{item.requiredRoles}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all group ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md tracking-wide shrink-0 ${
                  isActive
                    ? 'bg-emerald-900/60 text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User card at bottom */}
      <div className="p-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          {/* Avatar + name */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                {user?.department}
              </p>
            </div>
          </div>

          {/* Role badge */}
          <div className={`mt-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
            {user?.designation}
          </div>

          {/* Footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              GCP Verified
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Lock className="w-3 h-3" />
              RBAC ON
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
}
