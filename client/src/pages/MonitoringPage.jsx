import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCheck
} from 'lucide-react';

export default function MonitoringPage() {
  const { user, permissions } = useAuth();
  const [deviations, setDeviations] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    trial_id: '',
    patient_id: '',
    deviation_type: 'Visit out of window',
    severity: 'Minor',
    description: '',
    action_taken: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [devRes, trialRes] = await Promise.all([
        api.getDeviations({ severity: severityFilter, status: statusFilter }),
        api.getTrials()
      ]);
      setDeviations(devRes.deviations || []);
      setTrials(trialRes.trials || []);
      if (trialRes.trials?.length > 0 && !formData.trial_id) {
        setFormData(prev => ({ ...prev, trial_id: trialRes.trials[0].id }));
      }
    } catch (err) {
      console.error('Error loading deviations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [severityFilter, statusFilter]);

  const handleCreateDeviation = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.flagDeviation(formData);
      setShowModal(false);
      setFormData(prev => ({ ...prev, description: '', action_taken: '', patient_id: '' }));
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to flag deviation');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResolve = async (id) => {
    const action = prompt('Enter Corrective and Preventive Action (CAPA) notes:', 'Corrective instruction provided to site coordinator.');
    if (action === null) return;
    try {
      await api.resolveDeviation(id, { status: 'Resolved', action_taken: action });
      loadData();
    } catch (err) {
      alert('Failed to resolve deviation');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Monitoring & Protocol Deviations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Good Clinical Practice (GCP) quality oversight, deviation tracking & CAPA resolution
          </p>
        </div>

        {permissions.canFlagDeviation && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Flag Protocol Deviation</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Filter By:</span>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Severities</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
            <option value="Critical">Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="text-slate-500">
          Total Findings: <strong>{deviations.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
            Loading GCP protocol deviations...
          </div>
        ) : deviations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No protocol deviations found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Trial / CTRI</th>
                  <th className="py-3 px-3">Subject ID</th>
                  <th className="py-3 px-3">Deviation Type</th>
                  <th className="py-3 px-3">Observation</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Monitor / Auditor</th>
                  <th className="py-3 px-3">Action Taken</th>
                  <th className="py-3 px-3 text-right">Resolve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {deviations.map(pd => (
                  <tr key={pd.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">{pd.flagged_date}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-emerald-800 dark:text-emerald-400 font-bold block">{pd.ctri_number}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">{pd.trial_title}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">{pd.patient_id || 'N/A'}</td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{pd.deviation_type}</td>
                    <td className="py-3 px-3 max-w-xs">{pd.description}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pd.severity === 'Critical' ? 'bg-red-100 text-red-800' : pd.severity === 'Major' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {pd.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pd.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {pd.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px]">{pd.flagged_by_name || 'Clinical Monitor'}</td>
                    <td className="py-3 px-3 max-w-xs text-slate-500">{pd.action_taken || 'Pending CAPA'}</td>
                    <td className="py-3 px-3 text-right">
                      {pd.status !== 'Resolved' && permissions.canFlagDeviation && (
                        <button
                          onClick={() => handleResolve(pd.id)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-300"
                        >
                          Resolve
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Flag New Protocol Deviation (GCP Monitor)
            </h3>
            
            <form onSubmit={handleCreateDeviation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Clinical Trial</label>
                <select
                  value={formData.trial_id}
                  onChange={(e) => setFormData({ ...formData, trial_id: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {trials.map(t => (
                    <option key={t.id} value={t.id}>{t.ctri_number} - {t.public_title.slice(0, 35)}...</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Subject ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    placeholder="e.g. P-1011"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Deviation Classification</label>
                <select
                  value={formData.deviation_type}
                  onChange={(e) => setFormData({ ...formData, deviation_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Visit out of window">Visit out of window</option>
                  <option value="Inclusion/Exclusion criteria violation">Inclusion/Exclusion criteria violation</option>
                  <option value="Dosing non-compliance">Dosing non-compliance</option>
                  <option value="Informed consent violation">Informed consent violation</option>
                  <option value="Lab test missed">Lab test missed</option>
                  <option value="Prohibited concomitant medication">Prohibited concomitant medication</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Observation Description</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the GCP non-compliance..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Corrective Action (CAPA)</label>
                <textarea
                  rows={2}
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                  placeholder="Resolution required..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  {formLoading ? 'Logging...' : 'File Finding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
