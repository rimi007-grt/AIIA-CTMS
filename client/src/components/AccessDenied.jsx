import React from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { ShieldX, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';

// Map each route to the roles that can access it
const ROUTE_ROLE_MAP = {
  dashboard:   { label: 'KPI Dashboard',          roles: 'All roles' },
  trials:      { label: 'Clinical Trials',         roles: 'All roles' },
  safety:      { label: 'Safety (AE / SAE)',       roles: 'All roles' },
  deviations:  { label: 'Protocol Deviations',     roles: 'Monitor, PI, Coordinator, Admin, Regulator' },
  ethics:      { label: 'Ethics Committee',        roles: 'Ethics Committee Member, Admin, Regulator' },
  audit:       { label: 'Audit Trail',             roles: 'Institutional Admin, Regulator' },
  export:      { label: 'Data Export (CDISC)',     roles: 'All roles' },
  users:       { label: 'User Directory',          roles: 'Institutional Admin only' },
};

// What each role IS allowed to do
const ROLE_CAPABILITIES = {
  [ROLES.PI]: [
    'Register & manage clinical trials',
    'Report Adverse Events (AE/SAE)',
    'Flag Protocol Deviations',
    'View Safety & Monitoring data',
    'Export CDISC / FHIR datasets',
  ],
  [ROLES.COORDINATOR]: [
    'Register & manage clinical trials',
    'Report Adverse Events (AE/SAE)',
    'View Safety & Monitoring data',
    'Export CDISC / FHIR datasets',
  ],
  [ROLES.MONITOR]: [
    'View all clinical trials',
    'Flag & resolve Protocol Deviations',
    'View Safety data',
    'Export CDISC / FHIR datasets',
  ],
  [ROLES.ETHICS]: [
    'Review IEC Ethics submissions',
    'Approve / Reject / Defer ethics decisions',
    'View trial overview & safety data',
    'Export CDISC / FHIR datasets',
  ],
  [ROLES.PV]: [
    'View all trials',
    'Report Adverse Events (AE/SAE)',
    'Monitor pharmacovigilance compliance',
    'Export CDISC / FHIR datasets',
  ],
  [ROLES.ADMIN]: [
    'Full access to ALL modules',
    'Manage user accounts & roles',
    'View immutable Audit Trail (21 CFR Part 11)',
    'Approve ethics, report AEs, flag deviations',
  ],
  [ROLES.REGULATOR]: [
    'Read-only view of all trials & safety data',
    'View Protocol Deviations',
    'View Ethics Committee decisions',
    'View immutable Audit Trail',
    'Export CDISC / FHIR datasets',
  ],
};

export default function AccessDenied({ page, onBack }) {
  const { user } = useAuth();
  const routeInfo = ROUTE_ROLE_MAP[page] || { label: page, roles: 'Authorised users only' };
  const capabilities = ROLE_CAPABILITIES[user?.designation] || [];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Icon block */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 mb-6">
        <ShieldX className="w-10 h-10 text-red-500 dark:text-red-400" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
        Access Restricted
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md">
        Your role does not have permission to view the&nbsp;
        <span className="font-semibold text-slate-700 dark:text-slate-200">{routeInfo.label}</span>
        &nbsp;module.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
        {/* Who can access */}
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Required Access
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {routeInfo.roles}
          </p>
          <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your current role:&nbsp;
              <span className="font-semibold text-red-600 dark:text-red-400">
                {user?.designation}
              </span>
            </p>
          </div>
        </div>

        {/* What you CAN do */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Your Permissions
            </span>
          </div>
          <ul className="space-y-1.5">
            {capabilities.map((cap, i) => (
              <li key={i} className="flex items-start space-x-1.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-600">
        Contact your Institutional Admin to request elevated access.
      </p>
    </div>
  );
}
