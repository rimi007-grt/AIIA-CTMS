import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, Search, X, Pill, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DictionaryLookupModal({ isOpen, onClose, onSelectTerm }) {
  const [query, setQuery] = useState('');
  const [dictType, setDictType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleSearch(query, dictType);
    }
  }, [isOpen]);

  const handleSearch = async (q, dict) => {
    try {
      setLoading(true);
      const res = await api.searchDictionary(q, dict);
      setResults(res);
    } catch (err) {
      console.error('Dictionary search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Medical Dictionary Coding Lookup (MedDRA & WHO Drug)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Validated coding interface: MedDRA v26.1 Preferred Terms & WHO Drug Global B3
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="my-3 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value, dictType);
              }}
              placeholder="Search by symptom, Ayurvedic herb, or drug (e.g. Ashwagandha, Nausea, Paracetamol, Rash)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Dictionary Scope:</span>
            {[
              { id: 'all', label: 'All Dictionaries' },
              { id: 'meddra', label: 'MedDRA v26.1 (Adverse Events)' },
              { id: 'whodrug', label: 'WHO Drug (Formulations & Concomitants)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setDictType(tab.id);
                  handleSearch(query, tab.id);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                  dictType === tab.id
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Scroll Area */}
        <div className="overflow-y-auto flex-1 border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-600 mb-2" />
              Searching dictionary databases...
            </div>
          ) : results?.totalMatches === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No matching dictionary terms found for "{query}".
            </div>
          ) : (
            <>
              {/* MedDRA Section */}
              {results?.meddra?.length > 0 && (
                <div className="p-2 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    MedDRA v26.1 Adverse Event Preferred Terms ({results.meddra.length})
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                    {results.meddra.map((m, i) => (
                      <div key={i} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-between rounded-lg">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>{m.term}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              {m.code}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">Standard MedDRA Preferred Term (PT)</div>
                        </div>
                        {onSelectTerm && (
                          <button
                            onClick={() => {
                              onSelectTerm({ type: 'meddra', term: m.term, code: m.code });
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WHO Drug Section */}
              {results?.whoDrug?.length > 0 && (
                <div className="p-2 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center">
                    <Pill className="w-3 h-3 mr-1" /> WHO Drug Global B3 Formulations ({results.whoDrug.length})
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                    {results.whoDrug.map((w, i) => (
                      <div key={i} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-between rounded-lg">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>{w.drugName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                              {w.drugCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">{w.category} • ATC: {w.atcClass}</div>
                        </div>
                        {onSelectTerm && (
                          <button
                            onClick={() => {
                              onSelectTerm({ type: 'whodrug', term: w.drugName, code: w.drugCode });
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div>Dictionary Source: MedDRA v26.1 & WHO Drug Global B3 Reference Stub</div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
