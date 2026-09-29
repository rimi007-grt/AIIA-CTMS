import React from 'react';
import { Layers, CheckCircle2, Clock, Calendar, X } from 'lucide-react';

export default function StagedRoadmapModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-700 dark:text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Aayu-Setu Platform Architecture & Staged Maturity Model
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluation Transparency: What is Built, Validated, and Staged on the Roadmap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 overflow-y-auto flex-1">
          
          {/* Stage 1 */}
          <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Stage 1</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> BUILT & LIVE
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Core CTMS & ALCOA+ Audit MVP</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Complete operational clinical research execution backbone.</p>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> 7-Role RBAC enforced via JWT & tested matrix</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> 4 tailored dashboards (PI, Ethics, PV, Leadership)</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> Immutable SHA-256 ALCOA+ audit ledger with diffs</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> 21 CFR Part 11 electronic signature sign-offs</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> Entered & validated CTRI registration numbers</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> Configurable KPI alert thresholds</li>
            </ul>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl border-2 border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Stage 2</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-full flex items-center">
                <Clock className="w-3 h-3 mr-1" /> BUILT / DESIGNED
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">NPvCC Safety & Health Stack</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">National safety coordination & Ayushman Bharat interoperability.</p>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> NPvCC national safety coordination apex module</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> NDCT Rules 2019 statutory timeline engines (24h & 14d)</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> MedDRA v26.1 & WHO Drug Global B3 coding lookup</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> Inbound & outbound HL7 FHIR R4 endpoints</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> ABDM 14-digit ABHA validation & zero-PII linking</li>
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0 mt-0.5" /> DPDP Act 2023 subject consent tracking & breach log</li>
            </ul>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 3</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full flex items-center">
                <Calendar className="w-3 h-3 mr-1" /> ROADMAP
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Regulatory Submission Pipeline</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Global regulatory eCTD submission data packages.</p>
            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300 flex-1">
              <li className="flex items-start"><CheckCircle2 className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0 mt-0.5" /> CDISC Define-XML v2.0 metadata generator</li>
              <li className="flex items-start"><Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0 mt-0.5" /> ADaM (Analysis Data Model) standard datasets (ADSL, ADAE)</li>
              <li className="flex items-start"><Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0 mt-0.5" /> Automated eCTD Module 4/5 study packaging</li>
              <li className="flex items-start"><Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0 mt-0.5" /> Direct CDSCO SUGAM portal API gateway synchronization</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>Compliance: Hosted on ISO 27001-certified Indian cloud infrastructure with 5-year log retention</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
