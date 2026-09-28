import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
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
  ExternalLink
} from 'lucide-react';

export default function EthicsPage({ onSelectTrial }) {
  const { user, permissions } = useAuth();
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  // Review Modal
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [decision, setDecision] = useState('Approved');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    loadTrials();
  }, []);

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

    setSubmitting(true);
    try {
      await api.updateTrialEthics(selectedTrial.id, {
        status: decision,
        approval_date: approvalDate,
        notes
      });
      setSelectedTrial(null);
      loadTrials();
    } catch (err) {
      alert(err.message || 'Failed to record ethics review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Institutional Ethics Committee (IEC) Oversight
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ethical review clearance, annual renewals & compliance supervision for Ayurvedic human trials
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-500">Filter Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
          >
            <option value="All">All Applications</option>
            <option value="Submitted">Pending Review (Submitted)</option>
            <option value="Approved">Approved</option>
            <option value="Not submitted">Not Submitted</option>
          </select>
        </div>
      </div>

      {/* Trials Table */}
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
                  <th className="py-3 px-3">Reviewer Notes</th>
                  <th className="py-3 px-3 text-right">IEC Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredTrials.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                      {t.ctri_number}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{t.public_title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{t.health_condition}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{t.pi_name}</div>
                      <div className="text-[10px] text-slate-400">{t.department}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t.ethics_status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : t.ethics_status === 'Submitted'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.ethics_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                      {t.ethics_approval_date || 'Awaiting'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {t.dcgi_approval}
                    </td>
                    <td className="py-3 px-3 max-w-xs text-slate-500 text-[11px]">
                      {t.ethics_notes || 'Pending initial board review'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {permissions.canApproveEthics ? (
                        <button
                          onClick={() => handleOpenReview(t)}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-xs"
                        >
                          Review Clearance
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTrial(t.id)}
                          className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px]"
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
                  <option value="Approved">Approved (Grant Ethical Clearance)</option>
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
                  className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  {submitting ? 'Recording...' : 'Endorse IEC Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
