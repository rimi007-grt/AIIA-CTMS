import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Building,
  User,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

export default function TrialsPage({ onSelectTrial }) {
  const { user, permissions } = useAuth();
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');

  // New Trial Modal state
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [formData, setFormData] = useState({
    ctri_number: '',
    public_title: '',
    scientific_title: '',
    pi_name: user?.full_name || '',
    department: user?.department || 'Kayachikitsa',
    site_name: 'All India Institute of Ayurveda, Sarita Vihar, New Delhi',
    ethics_status: 'Submitted',
    ethics_approval_date: '',
    ethics_notes: '',
    dcgi_approval: 'Yes',
    health_condition: '',
    study_type: 'Interventional',
    phase: 'Phase 2',
    intervention: '',
    comparator: '',
    target_sample_size_india: 100,
    target_sample_size_total: 100,
    current_enrollment: 0,
    recruitment_status: 'Open to recruitment',
    date_of_first_enrollment: '',
    estimated_duration: '18 Months',
    current_stage: 'Ethics Approval'
  });

  const loadTrials = async () => {
    setLoading(true);
    try {
      const res = await api.getTrials({
        search,
        status: statusFilter,
        phase: phaseFilter,
        department: deptFilter,
        sort_by: sortBy,
        order
      });
      setTrials(res.trials || []);
    } catch (err) {
      console.error('Error loading trials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrials();
  }, [search, statusFilter, phaseFilter, deptFilter, sortBy, order]);

  const handleCreateTrial = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await api.createTrial(formData);
      setFormSuccess(`Trial registered successfully! CTRI: ${res.ctri_number}`);
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
        loadTrials();
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to create trial.');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open to recruitment':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Completed':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Not yet recruiting':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Suspended':
      default:
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
    }
  };

  const getEthicsBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
      case 'Submitted':
        return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800';
      default:
        return 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header & Registration CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Trials (CTRI Registry)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active and archived Ayurveda clinical trials registered under CTRI standards
          </p>
        </div>

        {permissions.canCreateTrial && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Trial</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by CTRI, title, drug, condition..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Open to recruitment">Open to recruitment</option>
            <option value="Completed">Completed</option>
            <option value="Not yet recruiting">Not yet recruiting</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Phase */}
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">All Phases</option>
            <option value="Phase 1">Phase 1</option>
            <option value="Phase 2">Phase 2</option>
            <option value="Phase 3">Phase 3</option>
            <option value="Phase 4">Phase 4</option>
          </select>

          {/* Department */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">All Departments</option>
            <option value="Kayachikitsa">Kayachikitsa</option>
            <option value="Panchakarma">Panchakarma</option>
            <option value="Dravyaguna">Dravyaguna</option>
            <option value="Clinical Research">Clinical Research</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none font-medium"
          >
            <option value="created_at">Date Created</option>
            <option value="current_enrollment">Enrollment Count</option>
            <option value="public_title">Trial Title</option>
            <option value="phase">Study Phase</option>
          </select>
        </div>

      </div>

      {/* Trials Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-800" />
            <span>Fetching CTRI clinical trial cohort...</span>
          </div>
        ) : trials.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No clinical trials found matching the applied filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">CTRI Number & Title</th>
                  <th className="py-3 px-3">Indication & Intervention</th>
                  <th className="py-3 px-3">Principal Investigator</th>
                  <th className="py-3 px-3">Phase</th>
                  <th className="py-3 px-3">Accrual Progress</th>
                  <th className="py-3 px-3">Ethics Status</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {trials.map((trial) => {
                  const percent = Math.min(
                    Math.round((trial.current_enrollment / (trial.target_sample_size_india || 1)) * 100),
                    100
                  );

                  return (
                    <tr 
                      key={trial.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectTrial(trial.id)}
                    >
                      {/* CTRI & Title */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                          {trial.ctri_number}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                          {trial.public_title}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span>Dept: {trial.department}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">Stage: {trial.current_stage}</span>
                        </div>
                      </td>

                      {/* Condition & Drug */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {trial.health_condition}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {trial.intervention}
                        </div>
                      </td>

                      {/* PI */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {trial.pi_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {trial.site_name?.split(',')[0]}
                        </div>
                      </td>

                      {/* Phase */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {trial.phase}
                        </span>
                      </td>

                      {/* Enrollment */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-baseline space-x-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {trial.current_enrollment}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            / {trial.target_sample_size_india}
                          </span>
                          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 ml-1">
                            ({percent}%)
                          </span>
                        </div>
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="bg-emerald-700 h-full rounded-full" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      {/* Ethics Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEthicsBadge(trial.ethics_status)}`}>
                          IEC: {trial.ethics_status}
                        </span>
                      </td>

                      {/* Recruitment Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(trial.recruitment_status)}`}>
                          {trial.recruitment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrial(trial.id);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 transition-all inline-flex items-center space-x-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
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

      {/* REGISTER NEW TRIAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Register New Clinical Trial (CTRI Standard)
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 text-red-800 text-xs border border-red-200 shrink-0">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mt-3 p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 shrink-0">
                {formSuccess}
              </div>
            )}

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleCreateTrial} className="overflow-y-auto pr-1 mt-4 space-y-4 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official CTRI Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    pattern="^CTRI\/\d{4}\/\d{2,3}\/\d{6}$"
                    title="Must match official registry format: CTRI/YYYY/MM/NNNNNN (e.g. CTRI/2026/01/089412)"
                    value={formData.ctri_number}
                    onChange={(e) => setFormData({ ...formData, ctri_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. CTRI/2026/01/089412"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Assigned by Clinical Trials Registry - India (ICMR)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Health Condition / Indication <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.health_condition}
                    onChange={(e) => setFormData({ ...formData, health_condition: e.target.value })}
                    placeholder="e.g. Chittodvega / Generalized Anxiety"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Public Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.public_title}
                  onChange={(e) => setFormData({ ...formData, public_title: e.target.value })}
                  placeholder="e.g. Evaluation of Ashwagandha Ghana Vati in Generalized Anxiety"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scientific Title
                </label>
                <textarea
                  rows={2}
                  value={formData.scientific_title}
                  onChange={(e) => setFormData({ ...formData, scientific_title: e.target.value })}
                  placeholder="Full protocol scientific title with design terminology"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Study Type
                  </label>
                  <select
                    value={formData.study_type}
                    onChange={(e) => setFormData({ ...formData, study_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Interventional">Interventional</option>
                    <option value="Observational">Observational</option>
                    <option value="Post-marketing surveillance">Post-marketing surveillance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phase of Trial
                  </label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recruitment Status
                  </label>
                  <select
                    value={formData.recruitment_status}
                    onChange={(e) => setFormData({ ...formData, recruitment_status: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Not yet recruiting">Not yet recruiting</option>
                    <option value="Open to recruitment">Open to recruitment</option>
                    <option value="Completed">Completed</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ayurvedic Intervention <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.intervention}
                    onChange={(e) => setFormData({ ...formData, intervention: e.target.value })}
                    placeholder="e.g. Standardized Ashwagandha Extract 500mg bd"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Comparator / Control <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.comparator}
                    onChange={(e) => setFormData({ ...formData, comparator: e.target.value })}
                    placeholder="e.g. Matched Cellulose Placebo bd"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Sample Size (India)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.target_sample_size_india}
                    onChange={(e) => setFormData({ ...formData, target_sample_size_india: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Enrolled
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.current_enrollment}
                    onChange={(e) => setFormData({ ...formData, current_enrollment: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="e.g. 18 Months"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ethics Committee (IEC) Status
                  </label>
                  <select
                    value={formData.ethics_status}
                    onChange={(e) => setFormData({ ...formData, ethics_status: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Not submitted">Not submitted</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    DCGI Regulatory Approval
                  </label>
                  <select
                    value={formData.dcgi_approval}
                    onChange={(e) => setFormData({ ...formData, dcgi_approval: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5"
                >
                  {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Submit to CTRI Registry</span>}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
