import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  UserCheck,
  Cpu,
  Zap,
  RotateCcw,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [actionStats, setActionStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification state
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        search,
        entity: entityFilter,
        action: actionFilter
      });
      setLogs(res.logs || []);
      setTotalLogs(res.totalLogs || 0);
      setActionStats(res.actionStats || []);
    } catch (err) {
      console.error('Error loading audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [search, entityFilter, actionFilter]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    setActionMessage('');
    try {
      const res = await api.verifyAudit();
      setVerificationResult(res);
    } catch (e) {
      setActionMessage('Verification service error.');
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperAttack = async () => {
    try {
      await api.tamperAuditTest();
      await loadAudit();
      const res = await api.verifyAudit();
      setVerificationResult(res);
      setActionMessage('⚠️ Tampering Attack Injected! Recalculation failed SHA-256 seal.');
    } catch (e) {
      setActionMessage('Failed to run tamper simulation.');
    }
  };

  const handleRestoreChain = async () => {
    try {
      await api.restoreAudit();
      await loadAudit();
      const res = await api.verifyAudit();
      setVerificationResult(res);
      setActionMessage('✅ Cryptographic hash-chain integrity successfully restored.');
    } catch (e) {
      setActionMessage('Failed to restore ledger.');
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'DELETE':
        return 'bg-red-50 text-red-800 border-red-300';
      case 'APPROVE':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'FLAG':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'LOGIN':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'EXPORT':
        return 'bg-teal-50 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const isChainIntact = verificationResult ? verificationResult.is_chain_intact : true;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Immutable Regulatory Audit Trail (21 CFR Part 11 ALCOA+ Standard)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographically sealed SHA-256 hash-chain transaction ledger: <code className="font-mono text-emerald-700 dark:text-emerald-400">curr_hash = SHA256(prev_hash || timestamp || action || payload)</code>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow transition active:scale-95 cursor-pointer"
          >
            <Cpu className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Verifying...' : 'Verify Cryptographic Integrity'}</span>
          </button>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Total Logged Events: {totalLogs}
          </span>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isChainIntact 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 animate-pulse'
        }`}>
          <div className="flex items-center space-x-3">
            {isChainIntact ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                {isChainIntact 
                  ? 'Cryptographic Hash-Chain Intact (100% Sealed & Authentic)' 
                  : 'CRITICAL ALERT: Tampering Detected in Cryptographic Audit Chain!'}
              </h4>
              <p className="text-[11px] opacity-90 mt-0.5">
                Validated {verificationResult.total_records_checked} sequential records. Every SHA-256 hash recalculation verified against ALCOA+ principles.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleTamperAttack}
              className="px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/80 hover:bg-red-200 text-red-800 dark:text-red-200 font-bold text-[11px] border border-red-300 dark:border-red-700 transition flex items-center space-x-1 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              <span>Simulate Tamper</span>
            </button>
            {!isChainIntact && (
              <button
                onClick={handleRestoreChain}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] border border-emerald-500 transition flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Chain</span>
              </button>
            )}
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
          {actionMessage}
        </div>
      )}

      {/* Action Breakdown Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {actionStats.map(stat => (
          <div key={stat.action_type} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">{stat.action_type}</span>
            <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{stat.count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-2 items-center justify-between text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, details, entity ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Entities</option>
            <option value="TRIAL">Clinical Trial</option>
            <option value="ADVERSE_EVENT">Adverse Event</option>
            <option value="PROTOCOL_DEVIATION">Protocol Deviation</option>
            <option value="ETHICS">Ethics Review</option>
            <option value="USER">User Account</option>
            <option value="SYSTEM">System Event</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="FLAG">FLAG</option>
            <option value="EXPORT">EXPORT</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
            Querying immutable cryptographic audit log...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Block #</th>
                  <th className="py-3 px-3">Timestamp (UTC)</th>
                  <th className="py-3 px-3">User & Role</th>
                  <th className="py-3 px-3">Action Type</th>
                  <th className="py-3 px-3">Entity & ID</th>
                  <th className="py-3 px-3">Cryptographic SHA-256 Hash Link</th>
                  <th className="py-3 px-3">Transaction Details</th>
                  <th className="py-3 px-3">ALCOA+ Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {logs.map(log => {
                  const reportItem = verificationResult?.report?.find(r => r.log_id === log.id);
                  const isTampered = reportItem && reportItem.status !== 'VALID';

                  return (
                    <tr key={log.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${isTampered ? 'bg-red-50/50 dark:bg-red-950/30' : ''}`}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        #{log.id}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.user_name}</div>
                        <div className="text-[10px] text-slate-400">{log.user_role}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadge(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{log.entity_affected}</span>
                        {log.entity_id && (
                          <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">
                            {log.entity_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] max-w-xs break-all">
                        {log.curr_hash ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-400 text-[9px] truncate">Prev: {log.prev_hash || 'Genesis (0000...)'}</div>
                            <div className="text-emerald-700 dark:text-emerald-400 font-bold truncate">Curr: {log.curr_hash}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Legacy Hash Linked</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-sm">
                        <p className="line-clamp-2">{log.details}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isTampered ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span>TAMPERED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ALCOA+ Sealed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
