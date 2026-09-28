import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  RefreshCw,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
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

export default function SafetyPage() {
  const { user, permissions } = useAuth();
  const [adverseEvents, setAdverseEvents] = useState([]);
  const [safetyKPIs, setSafetyKPIs] = useState(null);
  const [meddraTerms, setMeddraTerms] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [seriousnessFilter, setSeriousnessFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Report Modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [formData, setFormData] = useState({
    patient_id: '',
    trial_id: '',
    event_description: '',
    severity: 'Moderate',
    seriousness: 'SAE',
    event_date: new Date().toISOString().split('T')[0],
    report_date: new Date().toISOString().split('T')[0],
    meddra_term: '',
    meddra_code: '',
    outcome: 'Recovering',
    causality: 'Possible',
    action_taken: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [aeRes, kpiRes, meddraRes, trialRes] = await Promise.all([
        api.getAdverseEvents({
          search,
          severity: severityFilter,
          seriousness: seriousnessFilter,
          status: statusFilter
        }),
        api.getSafetyKPIs(),
        api.getMeddraTerms(),
        api.getTrials()
      ]);

      setAdverseEvents(aeRes.adverseEvents || []);
      setSafetyKPIs(kpiRes);
      setMeddraTerms(meddraRes.meddraTerms || []);
      setTrials(trialRes.trials || []);

      if (trialRes.trials?.length > 0 && !formData.trial_id) {
        setFormData(prev => ({ ...prev, trial_id: trialRes.trials[0].id }));
      }
      if (meddraRes.meddraTerms?.length > 0 && !formData.meddra_term) {
        setFormData(prev => ({
          ...prev,
          meddra_term: meddraRes.meddraTerms[0].term,
          meddra_code: meddraRes.meddraTerms[0].code
        }));
      }
    } catch (err) {
      console.error('Error loading safety module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, severityFilter, seriousnessFilter, statusFilter]);

  const handleMeddraSelect = (termString) => {
    const found = meddraTerms.find(m => m.term === termString);
    if (found) {
      setFormData({
        ...formData,
        meddra_term: found.term,
        meddra_code: found.code
      });
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await api.reportAdverseEvent(formData);
      setFormSuccess(res.message);
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        setFormData(prev => ({
          ...prev,
          patient_id: '',
          event_description: '',
          action_taken: ''
        }));
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to submit AE report.');
    } finally {
      setFormLoading(false);
    }
  };

  const severityChartData = safetyKPIs?.severityCounts?.map(s => ({
    name: s.severity,
    count: s.count,
    color: s.severity === 'Severe' ? '#DC2626' : s.severity === 'Moderate' ? '#D97706' : '#16A34A'
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pharmacovigilance & Safety (AE / SAE) Module
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Adverse Event reporting, MedDRA dictionary classification & expedited regulatory compliance
          </p>
        </div>

        {permissions.canReportAE && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Report Adverse Event (AE / SAE)</span>
          </button>
        )}
      </div>

      {/* Safety Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Events */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Adverse Incidents
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {safetyKPIs?.totalEvents || 0}
            </span>
            <span className="text-xs text-slate-500">logged in trials</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-700">{safetyKPIs?.totalAE || 0} non-serious</span> • <span>{safetyKPIs?.totalSAE || 0} serious</span>
          </div>
        </div>

        {/* Serious Adverse Events (SAEs) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>Serious AEs (SAE)</span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-700 dark:text-red-400">
              {safetyKPIs?.totalSAE || 0}
            </span>
            <span className="text-xs text-red-600/80">Require 24h DCGI notice</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Mandatory regulatory causality audit
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            On-Time Regulatory Filing
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {safetyKPIs?.statusCounts?.find(s => s.reporting_status === 'On-Time')?.count || 0}
            </span>
            <span className="text-xs text-slate-500">on-time reports</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="text-red-600 font-bold">
              {safetyKPIs?.statusCounts?.find(s => s.reporting_status === 'Overdue')?.count || 0} overdue
            </span> for DCGI escalation
          </div>
        </div>

        {/* MedDRA Standardized Dictionary */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            MedDRA Vocabulary
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {meddraTerms.length}
            </span>
            <span className="text-xs text-slate-500">coded Ayurvedic terms</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
            Standardized WHO / ICH coding
          </div>
        </div>

      </div>

      {/* Safety Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Severity Distribution */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Events by Severity Grade
          </h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#D97706" radius={[4, 4, 0, 0]}>
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Trials by Incident Count */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Adverse Event Frequency by Clinical Trial
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
            {safetyKPIs?.byTrial?.slice(0, 5).map(item => (
              <div key={item.ctri_number} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <div className="max-w-md">
                  <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">
                    {item.ctri_number}
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.public_title}
                  </div>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.total_events} events
                  </span>
                  {item.sae_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                      {item.sae_count} SAE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-2 items-center justify-between text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient ID, term, trial..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={seriousnessFilter}
            onChange={(e) => setSeriousnessFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Seriousness</option>
            <option value="AE">Non-Serious AE</option>
            <option value="SAE">Serious (SAE)</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Severities</option>
            <option value="Mild">Mild</option>
            <option value="Moderate">Moderate</option>
            <option value="Severe">Severe</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          >
            <option value="All">All Compliance</option>
            <option value="On-Time">On-Time</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Adverse Events Registry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-800 mb-2" />
            Loading pharmacovigilance records...
          </div>
        ) : adverseEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No adverse event reports matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Patient ID</th>
                  <th className="py-3 px-3">Trial / Study</th>
                  <th className="py-3 px-3">MedDRA Classification</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Severity / Seriousness</th>
                  <th className="py-3 px-3">Reporting Window & Countdown</th>
                  <th className="py-3 px-3">Causality</th>
                  <th className="py-3 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {adverseEvents.map(ae => {
                  const isSAE = ae.seriousness === 'SAE';
                  const isOverdue = ae.reporting_status === 'Overdue';

                  return (
                    <tr key={ae.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      {/* Patient ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {ae.patient_id}
                      </td>

                      {/* Trial */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-mono text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">
                          {ae.ctri_number}
                        </div>
                        <div className="truncate text-slate-800 dark:text-slate-200">
                          {ae.trial_title}
                        </div>
                      </td>

                      {/* MedDRA Term */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {ae.meddra_term}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          MedDRA Code: {ae.meddra_code}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 max-w-xs">
                        <p className="line-clamp-2">{ae.event_description}</p>
                      </td>

                      {/* Severity & Seriousness */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isSAE 
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300' 
                            : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {ae.seriousness} • {ae.severity}
                        </span>
                      </td>

                      {/* Countdown & Reporting Window */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isSAE ? (
                          (() => {
                            const deadlineMs = new Date(ae.event_date).getTime() + 24 * 3600 * 1000;
                            const diffSec = Math.floor((deadlineMs - Date.now()) / 1000);
                            const isPast = diffSec <= 0 || isOverdue;
                            const h = Math.max(0, Math.floor(diffSec / 3600));
                            const m = Math.max(0, Math.floor((diffSec % 3600) / 60));

                            if (ae.reporting_status === 'On-Time' && !isPast) {
                              return (
                                <div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center space-x-1 animate-pulse">
                                    <Clock className="w-3 h-3" />
                                    <span>24h Countdown: {h}h {m}m left</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Statutory Cutoff: {new Date(deadlineMs).toLocaleTimeString()}
                                  </div>
                                </div>
                              );
                            }

                            return isPast ? (
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 animate-pulse flex items-center space-x-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>24h SAE Overdue (Statutory Breach)</span>
                                </span>
                                <div className="text-[10px] text-red-500 font-mono mt-0.5">
                                  Exceeded 24h NDCT Limit
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Filed On-Time ({h}h remaining)</span>
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Reported: {ae.report_date}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Non-Serious AE (7-Day Window)</span>
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Reported: {ae.report_date}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Causality */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ae.causality}
                        </span>
                      </td>

                      {/* Outcome */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400">
                          {ae.outcome}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REPORT ADVERSE EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report Adverse Event / Serious Adverse Event (AE/SAE)
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Regulatory Alert Banner */}
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Mandatory Regulatory Window:</strong> SAEs require expedited filing within <strong>24 hours</strong> to the Licensing Authority (DCGI) and Institutional Ethics Committee.
              </div>
            </div>

            {formError && <div className="mt-2 p-2 bg-red-50 text-red-800 text-xs rounded">{formError}</div>}
            {formSuccess && <div className="mt-2 p-2 bg-emerald-50 text-emerald-800 text-xs rounded">{formSuccess}</div>}

            <form onSubmit={handleReportSubmit} className="mt-4 space-y-3.5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Patient ID (Anonymized) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    placeholder="e.g. P-1055"
                    className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Linked Clinical Trial <span className="text-red-500">*</span></label>
                  <select
                    value={formData.trial_id}
                    onChange={(e) => setFormData({ ...formData, trial_id: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {trials.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.ctri_number} - {t.public_title.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Seriousness Category <span className="text-red-500">*</span></label>
                  <select
                    value={formData.seriousness}
                    onChange={(e) => setFormData({ ...formData, seriousness: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="AE">Non-Serious Adverse Event (AE)</option>
                    <option value="SAE">Serious Adverse Event (SAE - 24h Window)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Severity Grade <span className="text-red-500">*</span></label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Mild">Mild (Well tolerated)</option>
                    <option value="Moderate">Moderate (Interferes with activity)</option>
                    <option value="Severe">Severe (Incapacitating / Hospitalized)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  MedDRA Coded Classification (Dummy Ayurvedic / Clinical Dictionary)
                </label>
                <select
                  value={formData.meddra_term}
                  onChange={(e) => handleMeddraSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                >
                  {meddraTerms.map(m => (
                    <option key={m.code} value={m.term}>
                      [{m.code}] {m.term}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Date of Onset / Event <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Date Reported <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formData.report_date}
                    onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Verbatim Description of Adverse Event <span className="text-red-500">*</span></label>
                <textarea
                  rows={2}
                  required
                  value={formData.event_description}
                  onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                  placeholder="Clinical presentation, time after investigational drug intake, symptoms..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Causality Assessment</label>
                  <select
                    value={formData.causality}
                    onChange={(e) => setFormData({ ...formData, causality: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Certain">Certain (Direct drug cause)</option>
                    <option value="Probable">Probable</option>
                    <option value="Possible">Possible</option>
                    <option value="Unlikely">Unlikely</option>
                    <option value="Unrelated">Unrelated</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Clinical Outcome</label>
                  <select
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Recovered">Recovered / Resolved</option>
                    <option value="Recovering">Recovering / Resolving</option>
                    <option value="Not Recovered">Not Recovered</option>
                    <option value="Fatal">Fatal</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Investigator Action Taken</label>
                <input
                  type="text"
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                  placeholder="e.g. Dose suspended, antihistamine prescribed, inpatient admission..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold"
                >
                  {formLoading ? 'Submitting...' : 'File Safety Report'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
