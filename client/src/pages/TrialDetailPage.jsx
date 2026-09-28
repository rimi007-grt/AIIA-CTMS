import React, { useState, useEffect } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Building,
  User,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ClipboardCheck,
  History,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';

const STAGES = [
  'Ethics Approval',
  'CTRI Registration',
  'Site Activation',
  'Enrollment',
  'Data Collection',
  'Trial Closeout'
];

export default function TrialDetailPage({ trialId, onBack, onNavigateToSafety }) {
  const { user, permissions } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'deviations' | 'safety' | 'ethics' | 'audit'

  // Stage update loading
  const [updatingStage, setUpdatingStage] = useState(false);

  // Ethics Review modal/form state
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [ethicsDecision, setEthicsDecision] = useState('Approved');
  const [ethicsDate, setEthicsDate] = useState(new Date().toISOString().split('T')[0]);
  const [ethicsNotes, setEthicsNotes] = useState('');
  const [ethicsLoading, setEthicsLoading] = useState(false);

  // Protocol Deviation Modal state
  const [showDevModal, setShowDevModal] = useState(false);
  const [devPatientId, setDevPatientId] = useState('');
  const [devType, setDevType] = useState('Visit out of window');
  const [devSeverity, setDevSeverity] = useState('Minor');
  const [devDesc, setDevDesc] = useState('');
  const [devAction, setDevAction] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const loadTrialDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getTrialById(trialId);
      setData(res);
    } catch (err) {
      console.error('Error loading trial detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trialId) {
      loadTrialDetail();
    }
  }, [trialId]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading clinical study dossier...</p>
      </div>
    );
  }

  const { trial, adverseEvents, protocolDeviations, auditLogs } = data;

  const currentStageIndex = STAGES.indexOf(trial.current_stage);

  const handleStageAdvance = async (nextStage) => {
    setUpdatingStage(true);
    try {
      await api.updateTrialStage(trial.id, nextStage);
      await loadTrialDetail();
    } catch (err) {
      alert(err.message || 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleEthicsSubmit = async (e) => {
    e.preventDefault();
    setEthicsLoading(true);
    try {
      await api.updateTrialEthics(trial.id, {
        status: ethicsDecision,
        approval_date: ethicsDate,
        notes: ethicsNotes
      });
      setShowEthicsModal(false);
      await loadTrialDetail();
    } catch (err) {
      alert(err.message || 'Failed to record ethics review');
    } finally {
      setEthicsLoading(false);
    }
  };

  const handleDeviationSubmit = async (e) => {
    e.preventDefault();
    setDevLoading(true);
    try {
      await api.flagDeviation({
        trial_id: trial.id,
        patient_id: devPatientId,
        deviation_type: devType,
        severity: devSeverity,
        description: devDesc,
        action_taken: devAction
      });
      setShowDevModal(false);
      setDevDesc('');
      setDevAction('');
      setDevPatientId('');
      await loadTrialDetail();
    } catch (err) {
      alert(err.message || 'Failed to log deviation');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trial Registry</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-bold text-emerald-800 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
            {trial.ctri_number}
          </span>
          <span className="text-xs px-2.5 py-1 rounded font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {trial.recruitment_status}
          </span>
        </div>
      </div>

      {/* Trial Title Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              <span>{trial.department}</span>
              <span>•</span>
              <span>{trial.phase}</span>
              <span>•</span>
              <span>{trial.study_type}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {trial.public_title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Scientific Title: {trial.scientific_title}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {permissions.canApproveEthics && (
              <button
                onClick={() => setShowEthicsModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs inline-flex items-center space-x-1"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>IEC Review</span>
              </button>
            )}

            {permissions.canFlagDeviation && (
              <button
                onClick={() => setShowDevModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs inline-flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Flag Deviation</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            VISUAL STEPPER: Full Lifecycle Progress
            Ethics Approval → CTRI Registration → Site Activation → Enrollment → Data Collection → Trial Closeout
        ===================================================== */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>Trial Lifecycle Milestone Stepper</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
              Active Stage: {trial.current_stage}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 relative">
            {STAGES.map((stg, idx) => {
              const isPassed = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;

              return (
                <div
                  key={stg}
                  className={`p-3 rounded-xl border transition-all text-center flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm font-bold'
                      : isPassed
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80 font-medium'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 font-normal'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <Activity className="w-4 h-4 text-amber-300 animate-pulse" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider opacity-75">
                      Step {idx + 1}
                    </div>
                    <div className="text-xs mt-0.5 leading-tight">
                      {stg}
                    </div>
                  </div>

                  {permissions.canEditTrial && isPassed && (
                    <button
                      disabled={updatingStage}
                      onClick={() => handleStageAdvance(stg)}
                      className="mt-2 text-[9px] text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Revert
                    </button>
                  )}

                  {permissions.canEditTrial && idx === currentStageIndex + 1 && (
                    <button
                      disabled={updatingStage}
                      onClick={() => handleStageAdvance(stg)}
                      className="mt-2 py-0.5 px-1.5 rounded bg-emerald-700 text-white text-[9px] font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      Advance →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-800 text-emerald-800 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Study Overview
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'safety'
              ? 'border-emerald-800 text-emerald-800 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Adverse Events</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600">
            {adverseEvents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('deviations')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'deviations'
              ? 'border-emerald-800 text-emerald-800 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Protocol Deviations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600">
            {protocolDeviations.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ethics')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'ethics'
              ? 'border-emerald-800 text-emerald-800 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ethics Clearance & DCGI
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'audit'
              ? 'border-emerald-800 text-emerald-800 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit History
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          
          {/* Card 1: Clinical Protocol Details */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              Protocol Design & Interventions
            </h3>

            <div>
              <span className="text-slate-400 text-[11px] block">Target Health Condition / Indication</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{trial.health_condition}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Ayurvedic Investigational Product (IP)</span>
              <span className="font-medium text-emerald-900 dark:text-emerald-300">{trial.intervention}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Comparator / Control Arm</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{trial.comparator}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Study Type</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{trial.study_type}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Trial Phase</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{trial.phase}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Recruitment & Operational Logistics */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              Investigator & Recruitment Logistics
            </h3>

            <div>
              <span className="text-slate-400 text-[11px] block">Principal Investigator (PI)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{trial.pi_name}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Clinical Trial Site</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{trial.site_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Target Sample Size (India)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{trial.target_sample_size_india}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Current Enrolled</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-400">{trial.current_enrollment}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">First Enrollment Date</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{trial.date_of_first_enrollment || 'Pending'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Estimated Duration</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{trial.estimated_duration}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Adverse Events */}
      {activeTab === 'safety' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Linked Adverse Events ({adverseEvents.length})
            </h3>
            {permissions.canReportAE && (
              <button
                onClick={onNavigateToSafety}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white shadow-xs inline-flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>File AE/SAE in Safety Module</span>
              </button>
            )}
          </div>

          {adverseEvents.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No adverse events reported for this trial so far.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Patient ID</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">MedDRA Term</th>
                    <th className="py-2.5 px-3">Severity / Seriousness</th>
                    <th className="py-2.5 px-3">Event Date</th>
                    <th className="py-2.5 px-3">Reporting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {adverseEvents.map(ae => (
                    <tr key={ae.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ae.patient_id}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">{ae.event_description}</td>
                      <td className="py-2.5 px-3">{ae.meddra_term}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ae.seriousness === 'SAE' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {ae.seriousness} ({ae.severity})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{ae.event_date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ae.reporting_status === 'Overdue' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {ae.reporting_status}
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

      {/* TAB CONTENT: Protocol Deviations */}
      {activeTab === 'deviations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Protocol Deviations Logged by Clinical Monitors ({protocolDeviations.length})
            </h3>
            {permissions.canFlagDeviation && (
              <button
                onClick={() => setShowDevModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white shadow-xs inline-flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Flag New Deviation</span>
              </button>
            )}
          </div>

          {protocolDeviations.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No protocol deviations recorded for this clinical study.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Deviation Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Corrective Action Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {protocolDeviations.map(pd => (
                    <tr key={pd.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono text-[11px]">{pd.flagged_date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{pd.deviation_type}</td>
                      <td className="py-2.5 px-3 max-w-xs">{pd.description}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pd.severity === 'Critical' ? 'bg-red-100 text-red-800' : pd.severity === 'Major' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {pd.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{pd.status}</span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-500">{pd.action_taken || 'Pending action'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Ethics Clearance & DCGI */}
      {activeTab === 'ethics' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Institutional Ethics Committee (IEC) Clearance Status
              </h3>
              <p className="text-slate-500 text-[11px]">
                Independent Ethics Committee review notes and DCGI regulatory compliance record
              </p>
            </div>
            {permissions.canApproveEthics && (
              <button
                onClick={() => setShowEthicsModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white shadow-xs"
              >
                Update Ethics Decision
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 block">Approval Status</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5 block">
                {trial.ethics_status}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 block">Approval Date</span>
              <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {trial.ethics_approval_date || 'Awaiting Review'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 block">DCGI Regulatory Clearance</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {trial.dcgi_approval}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ethics Reviewer Commentary & Mandates:
            </h4>
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
              {trial.ethics_notes || 'No review notes appended by Institutional Ethics Committee.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Audit History */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Immutable Audit Trail for {trial.ctri_number} ({auditLogs.length} Records)
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User & Designation</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{log.user_name}</span>
                      <span className="text-[10px] text-slate-400 block">{log.user_role}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-sm">{log.details}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ETHICS COMMITTEE REVIEW MODAL */}
      {showEthicsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Record Ethics Committee (IEC) Clearance
            </h3>
            
            <form onSubmit={handleEthicsSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Decision</label>
                <select
                  value={ethicsDecision}
                  onChange={(e) => setEthicsDecision(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Approved">Approved (Clearance Granted)</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Submitted">Pending Additional Clarifications</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Effective Approval Date</label>
                <input
                  type="date"
                  value={ethicsDate}
                  onChange={(e) => setEthicsDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Committee Comments / Mandates</label>
                <textarea
                  rows={3}
                  required
                  value={ethicsNotes}
                  onChange={(e) => setEthicsNotes(e.target.value)}
                  placeholder="e.g. Cleared subject to mandatory safety monitor reviews and quarterly DSMB submission..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEthicsModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ethicsLoading}
                  className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  {ethicsLoading ? 'Submitting...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLAG PROTOCOL DEVIATION MODAL */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Flag Protocol Deviation (Clinical Monitor)
            </h3>
            
            <form onSubmit={handleDeviationSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Subject / Patient ID (Optional)</label>
                  <input
                    type="text"
                    value={devPatientId}
                    onChange={(e) => setDevPatientId(e.target.value)}
                    placeholder="e.g. P-1008"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Severity</label>
                  <select
                    value={devSeverity}
                    onChange={(e) => setDevSeverity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                  value={devType}
                  onChange={(e) => setDevType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                <label className="block font-semibold mb-1">Observation & Finding Description</label>
                <textarea
                  rows={2}
                  required
                  value={devDesc}
                  onChange={(e) => setDevDesc(e.target.value)}
                  placeholder="Detail the non-compliance observed during monitoring audit..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Corrective & Preventive Action (CAPA)</label>
                <textarea
                  rows={2}
                  value={devAction}
                  onChange={(e) => setDevAction(e.target.value)}
                  placeholder="Instructions for study coordinator or PI to resolve..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={devLoading}
                  className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                >
                  {devLoading ? 'Flagging...' : 'File Deviation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
