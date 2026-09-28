import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  DownloadCloud,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Layers,
  Database,
  Table,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';

export default function ExportPage() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState('trials');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Live data for in-page table preview
  const [trials, setTrials] = useState([]);
  const [adverseEvents, setAdverseEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTableTab, setActiveTableTab] = useState('trials'); // 'trials' | 'safety'

  useEffect(() => {
    async function loadPreviewRecords() {
      try {
        const [tRes, sRes] = await Promise.all([
          api.getTrials(),
          api.getAdverseEvents()
        ]);
        setTrials(tRes.trials || []);
        setAdverseEvents(sRes.adverseEvents || []);
      } catch (err) {
        console.error('Failed to load export records:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadPreviewRecords();
  }, []);

  // Robust file downloader that does NOT prematurely revoke the blob URL
  const downloadFile = (blob, filename) => {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Keep URL alive for 60 seconds so browser download manager finishes saving file
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (e) {
          // ignore cleanup errors
        }
      }, 60000);

      setStatusMessage({
        type: 'success',
        text: `Successfully downloaded '${filename}' (${(blob.size / 1024).toFixed(1)} KB)`
      });

      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Download error:', err);
      setStatusMessage({
        type: 'error',
        text: `Download failed: ${err.message}`
      });
    }
  };

  const handleExportCSV = async (type) => {
    setDownloading(`${type}-csv`);
    setStatusMessage(null);
    try {
      if (type === 'trials') {
        const blob = await api.exportTrialsCSV();
        downloadFile(blob, 'AIIA_Trials_CDISC_Export.csv');
      } else {
        const blob = await api.exportSafetyCSV();
        downloadFile(blob, 'AIIA_Safety_AE_CDISC_Export.csv');
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to download CSV: ' + err.message });
    } finally {
      setDownloading('');
    }
  };

  const handleExportJSON = async (type) => {
    setDownloading(`${type}-json`);
    setStatusMessage(null);
    try {
      const data = type === 'trials' ? await api.exportTrialsJSON() : await api.exportSafetyJSON();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      downloadFile(blob, `AIIA_${type === 'trials' ? 'Trials' : 'Safety'}_CDISC_FHIR_Export.json`);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to download JSON: ' + err.message });
    } finally {
      setDownloading('');
    }
  };

  const handleExportSDTM = async (domain) => {
    setDownloading(`sdtm-${domain}`);
    try {
      let blob;
      if (domain === 'dm') blob = await api.exportSDTM_DM();
      else if (domain === 'vs') blob = await api.exportSDTM_VS();
      else if (domain === 'ex') blob = await api.exportSDTM_EX();
      downloadFile(blob, `SDTM_${domain.toUpperCase()}.csv`);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to download SDTM ${domain.toUpperCase()}: ${err.message}` });
    } finally {
      setDownloading('');
    }
  };

  const handleExportDefineXML = async () => {
    setDownloading('define-xml');
    try {
      const blob = await api.exportDefineXML();
      downloadFile(blob, 'define.xml');
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to download Define-XML: ' + err.message });
    } finally {
      setDownloading('');
    }
  };

  // Inbound FHIR R4 Ingestion Sandbox State
  const [fhirPayload, setFhirPayload] = useState(JSON.stringify({
    resourceType: "ResearchStudy",
    id: "CTRI-2026-09-089412",
    title: "Clinical Evaluation of Ashwagandha Ghana Vati in Generalized Anxiety",
    status: "active",
    category: [{ text: "Interventional Phase 3" }],
    principalInvestigator: { display: "Dr. Anand Vaidya" }
  }, null, 2));
  const [ingestResult, setIngestResult] = useState(null);
  const [ingesting, setIngesting] = useState(false);

  const handleIngestFHIR = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const parsed = JSON.parse(fhirPayload);
      const res = await api.ingestFHIR(parsed);
      setIngestResult(res);
    } catch (err) {
      setIngestResult({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'invalid', diagnostics: err.message }]
      });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Interoperability & Data Export (CDISC / FHIR Standards)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Export clinical trials registry and pharmacovigilance safety datasets adhering to CDISC SDTM and HL7 FHIR v4 ResearchStudy schemas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {trials.length} Trials • {adverseEvents.length} AE/SAEs
          </span>
        </div>
      </div>

      {/* Status Feedback Toast Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between space-x-2 shadow-xs transition-all ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
            : 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Clinical Trials Dataset (CDISC SDTM / FHIR ResearchStudy) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                CDISC SDTM TS / FHIR ResearchStudy
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Clinical Trials Master Dataset
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Standardized export of all {trials.length} registered Ayurveda clinical trials including CTRI identifiers, study phases, intervention mappings, sample targets, and ethics approval dates.
            </p>

            <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 border border-slate-200 dark:border-slate-700">
              <div>• <strong>Total Records:</strong> {trials.length} Active & Completed Studies</div>
              <div>• <strong>Fields:</strong> StudyIdentifier, BriefTitle, StudyPhase, TargetCondition, etc.</div>
              <div>• <strong>Standards:</strong> CDISC Trial Summary Domain / HL7 FHIR</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportCSV('trials')}
              disabled={downloading === 'trials-csv'}
              className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {downloading === 'trials-csv' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              <span>Export CSV (CDISC)</span>
            </button>

            <button
              onClick={() => handleExportJSON('trials')}
              disabled={downloading === 'trials-json'}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {downloading === 'trials-json' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5 text-emerald-700" />}
              <span>Export JSON (FHIR Bundle)</span>
            </button>

            <button
              onClick={() => handlePreview('trials')}
              className="text-xs text-emerald-800 dark:text-emerald-400 hover:underline font-semibold ml-auto flex items-center space-x-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview JSON Schema</span>
            </button>
          </div>
        </div>

        {/* Card 2: Pharmacovigilance AE/SAE Dataset (CDISC SDTM AE Domain / FHIR AdverseEvent) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                <Database className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                CDISC SDTM AE / FHIR AdverseEvent
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Pharmacovigilance Safety Dataset (AE / SAE)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Expedited safety datasets containing all {adverseEvents.length} anonymized subject IDs, MedDRA dictionary terms, severity grades, causality ratings, and regulatory compliance flags.
            </p>

            <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 border border-slate-200 dark:border-slate-700">
              <div>• <strong>Total Records:</strong> {adverseEvents.length} Adverse Incidents</div>
              <div>• <strong>Fields:</strong> SubjectIdentifier, AdverseEventTerm, MedDRACode, SeverityGrade, etc.</div>
              <div>• <strong>Standards:</strong> CDISC AE Domain / WHO Uppsala / FHIR</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportCSV('safety')}
              disabled={downloading === 'safety-csv'}
              className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {downloading === 'safety-csv' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              <span>Export CSV (CDISC)</span>
            </button>

            <button
              onClick={() => handleExportJSON('safety')}
              disabled={downloading === 'safety-json'}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {downloading === 'safety-json' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5 text-amber-700" />}
              <span>Export JSON (FHIR Bundle)</span>
            </button>

            <button
              onClick={() => handlePreview('safety')}
              className="text-xs text-amber-800 dark:text-amber-400 hover:underline font-semibold ml-auto flex items-center space-x-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview JSON Schema</span>
            </button>
          </div>
        </div>

        {/* Card 3: CDISC SDTM Tabulations & Define-XML v2.0 (Gaps 7 & 17) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Layers className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                CDISC SDTM v3.3 / Define-XML 2.0
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              CDISC SDTM Tabulations & Define-XML
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Standardized regulatory submission datasets for Demographics (DM), Vital Signs (VS), and Exposure (EX) alongside Define-XML v2.0 schema definition.
            </p>

            <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 border border-slate-200 dark:border-slate-700">
              <div>• <strong>Domains Mapped:</strong> TS, AE, DM, VS, EX (SDTMIG v3.3)</div>
              <div>• <strong>Metadata Standard:</strong> CDISC Define-XML v2.0 XML Schema</div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold">• <strong>Roadmap Note:</strong> ADaM (ADSL, ADAE) staged under Phase 3</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportDefineXML}
              disabled={downloading === 'define-xml'}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {downloading === 'define-xml' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              <span>Download define.xml</span>
            </button>
            <button
              onClick={() => handleExportSDTM('dm')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-mono font-semibold cursor-pointer"
            >
              DM.csv
            </button>
            <button
              onClick={() => handleExportSDTM('vs')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-mono font-semibold cursor-pointer"
            >
              VS.csv
            </button>
            <button
              onClick={() => handleExportSDTM('ex')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-mono font-semibold cursor-pointer"
            >
              EX.csv
            </button>
          </div>
        </div>

        {/* Card 4: Inbound HL7 FHIR R4 Ingestion Sandbox (Gap 8) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                <FileCode className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                HL7 FHIR R4 Inbound Ingest
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Inbound FHIR R4 Ingestion Sandbox
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Test two-way HL7 FHIR Release 4 interoperability by transmitting inbound ResearchStudy or AdverseEvent JSON payloads into AIIA CTMS.
            </p>

            <div className="mt-2">
              <textarea
                rows={3}
                value={fhirPayload}
                onChange={(e) => setFhirPayload(e.target.value)}
                className="w-full p-2 font-mono text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {ingestResult && (
              <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
                Status 201 Created: {ingestResult.issue?.[0]?.diagnostics || 'Successfully Ingested'}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={handleIngestFHIR}
              disabled={ingesting}
              className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              {ingesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5" />}
              <span>Post to Ingest Endpoint</span>
            </button>
            <span className="text-[10px] text-slate-400">Endpoint: POST /api/export/fhir/ingest</span>
          </div>
        </div>

      </div>


      {/* Live In-Page Table Preview of Data to be Exported */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Live Dataset Preview Table
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTableTab('trials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTableTab === 'trials'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Trials Dataset ({trials.length})
            </button>
            <button
              onClick={() => setActiveTableTab('safety')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTableTab === 'safety'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Safety Dataset ({adverseEvents.length})
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-800 mb-2" />
            Loading export preview table...
          </div>
        ) : activeTableTab === 'trials' ? (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">StudyIdentifier (CTRI)</th>
                  <th className="py-2.5 px-3">BriefTitle</th>
                  <th className="py-2.5 px-3">Phase</th>
                  <th className="py-2.5 px-3">TargetCondition</th>
                  <th className="py-2.5 px-3">LeadInvestigator</th>
                  <th className="py-2.5 px-3">Enrolled / Target</th>
                  <th className="py-2.5 px-3">OverallStatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {trials.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                      {t.ctri_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {t.public_title}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{t.phase}</td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-500">{t.health_condition}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{t.pi_name}</td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      {t.current_enrollment} / {t.target_sample_size_india}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800">
                        {t.recruitment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">SubjectIdentifier</th>
                  <th className="py-2.5 px-3">StudyIdentifier</th>
                  <th className="py-2.5 px-3">AdverseEventTerm (MedDRA)</th>
                  <th className="py-2.5 px-3">SeverityGrade</th>
                  <th className="py-2.5 px-3">Seriousness</th>
                  <th className="py-2.5 px-3">Causality</th>
                  <th className="py-2.5 px-3">ReportingCompliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {adverseEvents.map(ae => (
                  <tr key={ae.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {ae.patient_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                      {ae.ctri_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {ae.meddra_term}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{ae.severity}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ae.seriousness === 'SAE' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {ae.seriousness}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{ae.causality}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ae.reporting_status === 'Overdue' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
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

      {/* Live Interactive JSON Schema Viewer */}
      {previewData && (
        <div id="json-preview-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live CDISC / HL7 FHIR Output Preview ({previewType === 'trials' ? 'ResearchStudy Bundle' : 'AdverseEvent Bundle'})
              </h4>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 inline-flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => setPreviewData(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-950 p-4 text-[11px] font-mono text-emerald-400">
            <pre className="whitespace-pre-wrap">{JSON.stringify(previewData, null, 2)}</pre>
          </div>
        </div>
      )}

    </div>
  );
}
