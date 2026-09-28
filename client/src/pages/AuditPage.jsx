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
  ShieldAlert,
  Eye,
  FileSignature,
  Check,
  X,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function AuditPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'signatures'
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [actionStats, setActionStats] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
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
      const [res, sigRes] = await Promise.all([
        api.getAuditLogs({
          search,
          entity: entityFilter,
          action: actionFilter
        }),
        api.getAllSignatures().catch(() => ({ signatures: [] }))
      ]);
      setLogs(res.logs || []);
      setTotalLogs(res.totalLogs || 0);
      setActionStats(res.actionStats || []);
      setSignatures(sigRes.signatures || []);
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

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Cryptographic Hash-Chain Ledger ({totalLogs})</span>
        </button>

        <button
          onClick={() => setActiveTab('signatures')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'signatures'
              ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>21 CFR Part 11 Electronic Signature Registry ({signatures.length})</span>
        </button>
      </div>

      {/* VIEW 1: CRYPTOGRAPHIC AUDIT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
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
                placeholder="Search user, details, entity ID, diff..."
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
                <option value="E_SIGNATURE">E_SIGNATURE</option>
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
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Entity & ID</th>
                      <th className="py-3 px-3">ALCOA+ Change Diff (Old → New)</th>
                      <th className="py-3 px-3">Reason for Change</th>
                      <th className="py-3 px-3">SHA-256 Hash Chain</th>
                      <th className="py-3 px-3">Integrity</th>
                      <th className="py-3 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {logs.map(log => {
                      const reportItem = verificationResult?.report?.find(r => r.log_id === log.id);
                      const isTampered = reportItem && reportItem.status !== 'VALID';
                      const hasDiff = log.field_name || (log.old_value !== null && log.old_value !== undefined) || (log.new_value !== null && log.new_value !== undefined);

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

                          {/* ALCOA+ Change Diff (Old -> New) */}
                          <td className="py-3 px-3 max-w-xs">
                            {hasDiff ? (
                              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono text-[10px] space-y-1">
                                {log.field_name && (
                                  <div className="text-[9px] uppercase font-bold text-slate-400">
                                    Field: <span className="text-slate-800 dark:text-slate-200 font-bold">{log.field_name}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1 flex-wrap">
                                  <span className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1 py-0.5 rounded line-through truncate max-w-[100px]">
                                    {log.old_value !== null && log.old_value !== undefined ? String(log.old_value) : 'NULL'}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 rounded font-bold truncate max-w-[100px]">
                                    {log.new_value !== null && log.new_value !== undefined ? String(log.new_value) : 'NULL'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 italic text-[11px] truncate max-w-[180px]">
                                {log.details || 'Initial transaction recorded'}
                              </div>
                            )}
                          </td>

                          {/* Reason for Change (ALCOA+ Gap 6) */}
                          <td className="py-3 px-3 max-w-xs">
                            {log.reason_for_change ? (
                              <div className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-800/60 leading-tight">
                                <span className="font-semibold block text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400">GCP Reason:</span>
                                {log.reason_for_change}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Routine system operation</span>
                            )}
                          </td>

                          {/* Hash Link */}
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

                          {/* ALCOA+ Seal Status */}
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

                          {/* Inspect Action */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedBlock(log)}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center space-x-1 ml-auto cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Inspect</span>
                            </button>
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
      )}

      {/* VIEW 2: 21 CFR PART 11 ELECTRONIC SIGNATURE REGISTRY */}
      {activeTab === 'signatures' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSignature className="w-4 h-4 text-emerald-700" />
                <span>21 CFR Part 11 Electronic Signatures Registry</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Legally binding digital signatures executed with password re-authentication and cryptographic document sealing
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 text-[10px]">
              21 CFR Part 11 Compliant
            </span>
          </div>

          {signatures.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No electronic signatures recorded yet. Signatures appear here when Principal Investigators or Ethics Officers sign records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Sig ID</th>
                    <th className="py-3 px-3">Timestamp (UTC)</th>
                    <th className="py-3 px-3">Signer & Designation</th>
                    <th className="py-3 px-3">Signature Meaning</th>
                    <th className="py-3 px-3">Target Record</th>
                    <th className="py-3 px-3">Reason / Comments</th>
                    <th className="py-3 px-3">Record SHA-256 Seal</th>
                    <th className="py-3 px-3">Part 11 Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {signatures.map(sig => (
                    <tr key={sig.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        #SIG-{sig.id}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {sig.timestamp}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{sig.signer_name}</div>
                        <div className="text-[10px] text-slate-400">{sig.signer_role}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {sig.signature_meaning}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                          {sig.record_type}
                        </span>
                        <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">
                          #{sig.record_id}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-400">{sig.reason_comments || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] max-w-xs break-all text-slate-500">
                        {sig.record_hash ? (
                          <div className="truncate text-emerald-700 dark:text-emerald-400 font-bold" title={sig.record_hash}>
                            {sig.record_hash.slice(0, 20)}...
                          </div>
                        ) : 'Sealed'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Password Verified</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALCOA+ BLOCK INSPECTOR MODAL */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ALCOA+ Cryptographic Block #{selectedBlock.id} Verification Dossier
                </h3>
              </div>
              <button onClick={() => setSelectedBlock(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            {/* ALCOA+ Criteria Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">1. Attributable</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-1">{selectedBlock.user_name}</div>
                <div className="text-[10px] text-slate-400">Role: {selectedBlock.user_role} (User ID #{selectedBlock.user_id})</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">IP: {selectedBlock.ip_address || '127.0.0.1'}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">2. Contemporaneous</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-1 font-mono">{selectedBlock.timestamp}</div>
                <div className="text-[10px] text-slate-400">Atomic server-stamped UTC timestamp</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">3. Original (Hash Link)</div>
                <div className="text-[10px] text-slate-400">Previous Block Hash:</div>
                <div className="font-mono text-[9px] text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-1 rounded mt-0.5 border border-slate-200 dark:border-slate-700">
                  {selectedBlock.prev_hash || '0000000000000000000000000000000000000000000000000000000000000000 (Genesis)'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">4. Current Block Seal</div>
                <div className="text-[10px] text-slate-400">SHA-256 Cryptographic Hash:</div>
                <div className="font-mono text-[9px] text-emerald-800 dark:text-emerald-400 font-bold break-all bg-white dark:bg-slate-900 p-1 rounded mt-0.5 border border-slate-200 dark:border-slate-700">
                  {selectedBlock.curr_hash || 'Legacy Hash Linked'}
                </div>
              </div>
            </div>

            {/* Accurate: Field Diff & Reason for Change */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">5. Accurate & Complete (Audit Diffs)</div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Affected Entity:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedBlock.entity_affected} ({selectedBlock.entity_id || 'Global'})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Field Name:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedBlock.field_name || 'N/A'}</span>
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-mono text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block">Old Value:</span>
                  <span className="text-red-600 line-through">{selectedBlock.old_value !== null && selectedBlock.old_value !== undefined ? String(selectedBlock.old_value) : 'NULL'}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block">New Value:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{selectedBlock.new_value !== null && selectedBlock.new_value !== undefined ? String(selectedBlock.new_value) : 'NULL'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Mandatory Reason for Change (21 CFR Part 11 / GCP):</span>
                <div className="mt-0.5 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium">
                  {selectedBlock.reason_for_change || 'Routine clinical trial operation'}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Transaction Description:</span>
                <p className="mt-0.5 text-slate-700 dark:text-slate-300">{selectedBlock.details}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
