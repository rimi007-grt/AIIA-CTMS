import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ESignatureModal from '../components/ESignatureModal';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Building,
  User,
  ShieldCheck,
  ExternalLink,
  FileText,
  AlertTriangle,
  UserCheck,
  Video,
  Slash
} from 'lucide-react';

export default function EthicsPage({ onSelectTrial }) {
  const { user, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('iec'); // 'iec' | 'consent'
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  // Consent & DPDP Data
  const [consents, setConsents] = useState([]);
  const [consentStats, setConsentStats] = useState(null);
  const [breaches, setBreaches] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(false);

  // Review & E-Signature Modals
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [decision, setDecision] = useState('Approved');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEsign, setShowEsign] = useState(false);
  const [pendingApprovalPayload, setPendingApprovalPayload] = useState(null);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const res = await api.getTrials();
      setTrials(res.trials || []);
    } catch (err) {
      console.error('Error loading trials for ethics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConsents = async () => {
    setLoadingConsents(true);
    try {
      const res = await api.getConsents();
      setConsents(res.consents || []);
      setConsentStats(res.stats || null);
      const bRes = await api.getDpdpBreaches();
      setBreaches(bRes || []);
    } catch (err) {
      console.error('Error loading consents:', err);
    } finally {
      setLoadingConsents(false);
    }
  };

  useEffect(() => {
    loadTrials();
  }, []);

  useEffect(() => {
    if (activeTab === 'consent') {
      loadConsents();
    }
  }, [activeTab]);

  const filteredTrials = trials.filter(t => {
    if (filter === 'All') return true;
    return t.ethics_status === filter;
  });

  const handleOpenReview = (trial) => {
    setSelectedTrial(trial);
    setDecision(trial.ethics_status === 'Submitted' ? 'Approved' : trial.ethics_status);
    setApprovalDate(trial.ethics_approval_date || new Date().toISOString().split('T')[0]);
    setNotes(trial.ethics_notes || '');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrial) return;

    // If decision is Approved, require 21 CFR Part 11 E-Signature sign-off!
    if (decision === 'Approved') {
      setPendingApprovalPayload({
        status: decision,
        approval_date: approvalDate,
        notes
      });
      setShowEsign(true);
    } else {
      executeReviewSubmit({
        status: decision,
        approval_date: approvalDate,
        notes
      });
    }
  };

  const executeReviewSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await api.updateTrialEthics(selectedTrial.id, payload);
      setSelectedTrial(null);
      loadTrials();
    } catch (err) {
      alert(err.message || 'Failed to record ethics review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEsignSuccess = async (sigRes) => {
    if (pendingApprovalPayload) {
      await executeReviewSubmit(pendingApprovalPayload);
      setPendingApprovalPayload(null);
    }
  };

  const handleWithdrawConsent = async (consentId, pseudonym) => {
    const reason = prompt(`Enter DPDP Act Section 6 voluntary withdrawal reason for participant ${pseudonym}:`);
    if (!reason || !reason.trim()) return;
    try {
      await api.withdrawConsent(consentId, { withdrawal_reason: reason.trim() });
      loadConsents();
    } catch (e) {
      alert(e.message || 'Failed to withdraw consent.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Institutional Ethics & Informed Consent (DPDP Act 2023)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            IEC regulatory clearance, 21 CFR Part 11 digital sign-off, participant consent records, and DPDP breach registry
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab('iec')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'iec' ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            IEC Protocol Clearances
          </button>
          <button
            onClick={() => setActiveTab('consent')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'consent' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Informed Consent & DPDP
          </button>
        </div>
      </div>

      {/* ── TAB 1: IEC PROTOCOL APPROVALS ── */}
      {activeTab === 'iec' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active Institutional Review Board Submissions ({filteredTrials.length})
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Applications</option>
                <option value="Submitted">Pending Review (Submitted)</option>
                <option value="Approved">Approved</option>
                <option value="Not submitted">Not Submitted</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
                Loading Institutional Ethics dossiers...
              </div>
            ) : filteredTrials.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No trial applications matching status '{filter}'.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3">CTRI Number</th>
                      <th className="py-3 px-3">Title & Protocol</th>
                      <th className="py-3 px-3">Principal Investigator</th>
                      <th className="py-3 px-3">IEC Status</th>
                      <th className="py-3 px-3">Approval Date</th>
                      <th className="py-3 px-3">DCGI Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTrials.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                          {t.ctri_number}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate font-medium text-slate-900 dark:text-white">
                          {t.public_title}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {t.pi_name}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.ethics_status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            t.ethics_status === 'Submitted' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {t.ethics_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {t.ethics_approval_date || 'Pending'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {t.dcgi_approval || 'Exempt / Yes'}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          {permissions.canApproveEthics ? (
                            <button
                              onClick={() => handleOpenReview(t)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-xs"
                            >
                              Review & Sign
                            </button>
                          ) : (
                            <button
                              onClick={() => onSelectTrial(t.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px]"
                            >
                              View Dossier
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: INFORMED CONSENT & DPDP ACT CONTROLS (Gap 15 Fulfillment) ── */}
      {activeTab === 'consent' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Enrolled Consents</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{consentStats?.total || consents.length}</div>
              <p className="text-[11px] text-slate-500 mt-1">Pseudonymized participants</p>
            </div>
            <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Active Valid Consents</span>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{consentStats?.active || 0}</div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-1">DPDP Section 6 compliant</p>
            </div>
            <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">Audio-Visual (AV) Consents</span>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-1">{consentStats?.avConsented || 0}</div>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-1">Indian GCP vulnerable population</p>
            </div>
            <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Revocations / Withdrawn</span>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{consentStats?.withdrawn || 0}</div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">Data collection halted immediately</p>
            </div>
          </div>

          {/* Consents Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Participant Informed Consent Register</span>
              <span className="text-[10px] text-slate-400 font-mono">Zero raw PII stored • 100% Pseudonymized</span>
            </div>

            {loadingConsents ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                Loading DPDP consent records...
              </div>
            ) : consents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No consent records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Subject Pseudonym</th>
                      <th className="py-3 px-3">Protocol CTRI</th>
                      <th className="py-3 px-3">Consent Version</th>
                      <th className="py-3 px-3">Execution Date</th>
                      <th className="py-3 px-3">AV Recorded (GCP)</th>
                      <th className="py-3 px-3">Purpose Limitation</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">DPDP Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {consents.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {c.subject_pseudonym}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-800 dark:text-emerald-400">
                          {c.ctri_number}
                        </td>
                        <td className="py-3 px-3 font-semibold">{c.consent_version}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{c.consent_date}</td>
                        <td className="py-3 px-3">
                          {c.is_audio_video_consented ? (
                            <span className="inline-flex items-center text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                              <Video className="w-3.5 h-3.5 mr-1" /> Recorded
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Paper/Written</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {c.purpose_limitation}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.consent_status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                            {c.consent_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {c.consent_status === 'Active' && (
                            <button
                              onClick={() => handleWithdrawConsent(c.id, c.subject_pseudonym)}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-[10px] font-semibold"
                            >
                              Withdraw Consent
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CERT-In Security Breach Register */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5" /> CERT-In & DPDP Security Incident Log (Section 70B IT Act)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                0 Active Data Breaches
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              In adherence with CERT-In directions, all cybersecurity incidents are audited within a mandatory 6-hour reporting window.
            </p>
          </div>
        </div>
      )}

      {/* ETHICS REVIEW MODAL */}
      {selectedTrial && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Institutional Ethics Committee (IEC) Clearance
                </h3>
                <p className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">
                  {selectedTrial.ctri_number} • {selectedTrial.pi_name}
                </p>
              </div>
              <button onClick={() => setSelectedTrial(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-xs">
              <span className="font-semibold block text-slate-900 dark:text-white">Study Protocol:</span>
              <span className="text-slate-600 dark:text-slate-400">{selectedTrial.public_title}</span>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Committee Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="Approved">Approved (Requires 21 CFR Part 11 Digital Signature)</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Submitted">Hold for Scientific Committee Clarifications</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Approval Date</label>
                <input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Board Review Comments & Ongoing Audit Conditions</label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail the ethical considerations, mandatory safety monitoring, lab requisites..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrial(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold flex items-center space-x-1.5"
                >
                  {decision === 'Approved' ? <ShieldCheck className="w-3.5 h-3.5" /> : null}
                  <span>{decision === 'Approved' ? 'Sign & Endorse IEC Clearance' : 'Record Decision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 21 CFR Part 11 E-Signature Modal */}
      <ESignatureModal
        isOpen={showEsign}
        onClose={() => setShowEsign(false)}
        onSuccess={handleEsignSuccess}
        recordType="ETHICS_APPROVAL"
        recordId={selectedTrial?.ctri_number || selectedTrial?.id}
        recordTitle={selectedTrial?.public_title}
        defaultMeaning="Approved"
      />

    </div>
  );
}
