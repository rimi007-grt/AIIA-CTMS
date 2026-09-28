import React, { useState, useEffect } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  Users,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
  Lock,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export default function DashboardPage({ onNavigate }) {
  const { user, isPI, permissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [scope, setScope] = useState(isPI ? 'my' : 'all'); // 'my' vs 'all'

  const fetchKPIs = async (selectedScope) => {
    setLoading(true);
    try {
      const res = await api.getDashboardKPIs(selectedScope);
      setData(res);
    } catch (err) {
      console.error('Error loading dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs(scope);
  }, [scope]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading clinical trials intelligence...</p>
      </div>
    );
  }

  const { metrics, phaseData, statusData, trendData, alerts } = data || {
    metrics: {
      totalTrials: 0,
      activeTrials: 0,
      completedTrials: 0,
      totalEnrolled: 0,
      targetEnrolled: 0,
      enrollmentRate: 0,
      saeCount: 0,
      pendingEthics: 0,
      openDeviations: 0
    },
    phaseData: [],
    statusData: [],
    trendData: [],
    alerts: []
  };

  const getAlertBadgeClass = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'green':
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Trials Oversight Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time CTRI compliance metrics, subject recruitment progress & safety alerts
          </p>
        </div>

        {/* Role Scope Switcher for Principal Investigators */}
        {isPI && (
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setScope('my')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                scope === 'my'
                  ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              My Studies Only
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                scope === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              All Institute Studies
            </button>
          </div>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Trials */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Clinical Studies</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.activeTrials}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              of {metrics.totalTrials} registered
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-700 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.totalTrials > 0 ? (metrics.activeTrials / metrics.totalTrials) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{metrics.completedTrials} completed</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {Math.round((metrics.activeTrials / (metrics.totalTrials || 1)) * 100)}% active
              </span>
            </div>
          </div>
        </div>

        {/* Participant Enrollment vs Target */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Participants Enrolled</span>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalEnrolled.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / {metrics.targetEnrolled.toLocaleString()} target
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(metrics.enrollmentRate, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Sample Accrual</span>
              <span className="text-teal-700 dark:text-teal-400 font-semibold">
                {metrics.enrollmentRate}% Achieved
              </span>
            </div>
          </div>
        </div>

        {/* Serious Adverse Events (SAE) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Serious Adverse Events</span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-700 dark:text-red-400">
              {metrics.saeCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              under expedited PV tracking
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <span>24h DCGI Mandate</span>
            <button 
              onClick={() => onNavigate('safety')}
              className="text-emerald-800 dark:text-emerald-400 hover:underline font-medium flex items-center space-x-0.5"
            >
              <span>View Safety Log</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ethics & Protocol Oversight */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Ethics & Deviations</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <ClipboardCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.pendingEthics}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              IEC Pending
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <span>{metrics.openDeviations} open deviations</span>
            <button
              onClick={() => onNavigate('ethics')}
              className="text-emerald-800 dark:text-emerald-400 hover:underline font-medium flex items-center space-x-0.5"
            >
              <span>Review</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Enrollment Trend Over Time */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Cumulative Participant Enrollment Trend
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Monthly actual enrollment vs targeted recruitment trajectory
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-800"></span>
                <span className="text-slate-600 dark:text-slate-300">Enrolled</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-slate-500 dark:text-slate-400">Target</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    color: '#F8FAFC', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    border: 'none'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="enrolled" 
                  stroke="#0F5A47" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#0F5A47' }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#CBD5E1" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie / Donut Chart: Trials by Recruitment Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Trials by Recruitment Status
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Current operational state of research cohort
          </p>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    color: '#F8FAFC', 
                    borderRadius: '8px', 
                    fontSize: '11px' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Second Row: Bar Chart (Trials by Phase) & Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Trials by Phase */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Clinical Studies by Phase
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Distribution across clinical development pipeline
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis 
                  dataKey="phase" 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    color: '#F8FAFC', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    border: 'none'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="#0D9488" 
                  radius={[4, 4, 0, 0]} 
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ALERTS PANEL: Color-coded by urgency (Red/Amber/Green) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Upcoming Regulatory Deadlines & Safety Alerts</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Prioritized compliance milestones requiring investigator or administrative action
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {alerts.length} Active Notice{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active compliance alerts found. All study workflows on track.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs transition-all flex items-start justify-between space-x-3 ${getAlertBadgeClass(alert.urgency)}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold tracking-tight">
                        {alert.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-white/70 dark:bg-black/30 border border-current">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-black/40 shadow-2xs">
                      {alert.badge}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RBAC — Role Permissions Summary Card */}
      <RolePermissionsCard permissions={permissions} user={user} onNavigate={onNavigate} />

    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Role Permissions Summary — shows what the current role can/cannot do
// ──────────────────────────────────────────────────────────

const ALL_CAPABILITIES = [
  {
    key: 'canCreateTrial',
    label: 'Register / Edit Clinical Trials',
    tab: 'trials',
    allowed: [ROLES.PI, ROLES.COORDINATOR, ROLES.ADMIN],
  },
  {
    key: 'canReportAE',
    label: 'Report Adverse Events (AE/SAE)',
    tab: 'safety',
    allowed: [ROLES.PI, ROLES.COORDINATOR, ROLES.PV, ROLES.ADMIN],
  },
  {
    key: 'canFlagDeviation',
    label: 'Flag Protocol Deviations',
    tab: 'deviations',
    allowed: [ROLES.MONITOR, ROLES.PI, ROLES.ADMIN],
  },
  {
    key: 'canApproveEthics',
    label: 'Approve / Reject Ethics Submissions',
    tab: 'ethics',
    allowed: [ROLES.ETHICS, ROLES.ADMIN],
  },
  {
    key: 'canViewAudit',
    label: 'View Immutable Audit Trail (21 CFR Part 11)',
    tab: 'audit',
    allowed: [ROLES.ADMIN, ROLES.REGULATOR],
  },
  {
    key: 'canManageUsers',
    label: 'Manage Users & Assign Roles',
    tab: 'users',
    allowed: [ROLES.ADMIN],
  },
];

function RolePermissionsCard({ permissions, user, onNavigate }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Your Role Permissions</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Access control for:&nbsp;
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {user?.name}
            </span>
            &nbsp;·&nbsp;
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {user?.designation}
            </span>
          </p>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
          RBAC Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {ALL_CAPABILITIES.map((cap) => {
          const granted = permissions[cap.key];
          return (
            <div
              key={cap.key}
              className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-all ${
                granted
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                {granted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                )}
                <span className={granted ? 'font-medium' : 'line-through decoration-dotted'}>
                  {cap.label}
                </span>
              </div>
              {granted && (
                <button
                  onClick={() => onNavigate(cap.tab)}
                  className="ml-2 shrink-0 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-600">
        🔒 Greyed-out permissions are restricted for your role. Contact your Institutional Admin to request elevated access.
      </p>
    </div>
  );
}
