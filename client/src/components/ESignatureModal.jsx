import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldCheck, Lock, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function ESignatureModal({
  isOpen,
  onClose,
  onSuccess,
  recordType,
  recordId,
  recordTitle,
  defaultMeaning = 'Approved'
}) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [meaning, setMeaning] = useState(defaultMeaning);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Password re-authentication is mandatory for 21 CFR Part 11 compliance.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.eSignRecord({
        password,
        recordType,
        recordId: String(recordId),
        signatureMeaning: meaning,
        reasonComments: comments,
        recordData: { recordType, recordId, recordTitle, timestamp: Date.now() }
      });

      setPassword('');
      setComments('');
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'E-Signature verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                21 CFR Part 11 Electronic Signature
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GCP Compliant Cryptographic Sign-off
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

        {/* Record Context */}
        <div className="my-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Record Type:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{recordType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Record ID:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">#{recordId}</span>
          </div>
          {recordTitle && (
            <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 truncate max-w-[120px]">Title:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px] text-right">{recordTitle}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Signer Info */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Signer Identity
            </label>
            <input
              type="text"
              disabled
              value={`${user?.full_name || 'Current User'} (${user?.designation || 'Staff'})`}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            />
          </div>

          {/* Signature Meaning */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Signature Meaning / Intent <span className="text-red-500">*</span>
            </label>
            <select
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="Approved">Approved (Regulatory / Ethics Clearance)</option>
              <option value="Causality_Certified">Causality Certified (PV Medical Evaluation)</option>
              <option value="Reviewed">Reviewed (Quality Control & Protocol Monitoring)</option>
              <option value="Authored">Authored (Initial Case Report Entry)</option>
            </select>
          </div>

          {/* Password Re-authentication */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Re-authenticate Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password (e.g. password123)"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rationale / Attestation Notes
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Verified against protocol v2.1 and ICMR ethical guidelines"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Legal statement */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
            By clicking "Sign Electronically", I certify under penalty of law that this electronic signature is the legally binding equivalent of my handwritten signature per 21 CFR Part 11 and Indian IT Act 2000.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Sign Electronically</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
