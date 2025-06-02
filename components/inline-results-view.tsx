import React, { useState, useEffect } from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  ChevronUp,
  ChevronDown,
  RotateCcw, 
  AlertTriangle,
  BarChart3,
  FileText,
  Download,
  Mail
} from 'lucide-react';
import { Results } from './results';
import { Config } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import EmailModal from './EmailModal';

interface InlineResultsViewProps {
  isVisible: boolean;
  onClose: () => void;
  results: any[];
  columns: string[];
  executionTime: number;
  chartConfig: Config | null;
  query: string;
  error: string | null;
  onReRunQuery?: () => void;
}

export const InlineResultsView: React.FC<InlineResultsViewProps> = ({
  isVisible,
  onClose,
  results,
  columns,
  executionTime,
  chartConfig,
  query,
  error,
  onReRunQuery
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  // Reset state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsExpanded(true);
    }
  }, [isVisible]);

  const handleEmailClick = () => {
    setIsEmailModalOpen(true);
  };

  // Handle export CSV
  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    
    const headers = columns;
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));
    
    for (const row of results) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + (value !== null && value !== undefined ? value : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'query_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg rounded-b-lg mb-6"
        >
          {/* Header - Always visible even when collapsed */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Query Results
              </h2>
              {!error && results && results.length > 0 && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                  {results.length} {results.length === 1 ? 'row' : 'rows'}
                </span>
              )}
              {!error && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {executionTime}ms
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {error && (
                <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Error
                </span>
              )}
              
              {/* View buttons only if there are results */}
              {!error && results && results.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-1 flex">
                  <button
                    onClick={() => setActiveView('table')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                      activeView === 'table'
                        ? 'bg-white dark:bg-gray-600 text-primary dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setActiveView('chart')}
                    disabled={!chartConfig}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                      activeView === 'chart'
                        ? 'bg-white dark:bg-gray-600 text-primary dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${!chartConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <BarChart3 className="h-3 w-3" />
                    <span>Chart</span>
                  </button>
                </div>
              )}

              {!error && results && results.length > 0 && (
                <>
                  <button
                    onClick={handleEmailClick}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Mail className="h-3 w-3" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export</span>
                  </button>
                </>
              )}
              
              {onReRunQuery && (
                <button
                  onClick={onReRunQuery}
                  title="Re-run Query"
                  className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              
              <button
                onClick={onClose}
                title="Close"
                className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content - Only visible when expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 relative"
                style={{ maxHeight: '70vh', overflowY: 'auto' }}
              >
                {error ? (
                  <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Error Executing Query</h3>
                    <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
                    
                    {onReRunQuery && (
                      <button
                        onClick={onReRunQuery}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center gap-2 mx-auto"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Try Again</span>
                      </button>
                    )}
                  </div>
                ) : results && results.length === 0 ? (
                  <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Query Executed Successfully</h3>
                    <p className="text-blue-600 dark:text-blue-300 mb-2">
                      The query completed successfully but returned no data.
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30 mt-4 text-left max-w-lg mx-auto">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Possible reasons:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>The query condition did not match any records in the database</li>
                        <li>The table or view queried might be empty</li>
                        <li>The query might have filtering conditions that are too restrictive</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {activeView === 'table' ? (
                      <Results 
                        results={results} 
                        columns={columns} 
                        chartConfig={null} 
                        onEmailClick={handleEmailClick} 
                      />
                    ) : (
                      <div className="glass-card p-6">
                        <Results 
                          results={results} 
                          columns={columns} 
                          chartConfig={chartConfig} 
                          onEmailClick={handleEmailClick} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Email Modal */}
      {isEmailModalOpen && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          results={results}
          question={query}
          selectedModel="openai"
          chartElementId="chart-container"
        />
      )}
    </>
  );
};