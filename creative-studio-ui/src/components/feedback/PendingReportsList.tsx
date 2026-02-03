/**
 * PendingReportsList Component
 * 
 * Displays a list of unsent feedback reports that failed to submit automatically.
 * Provides retry and delete functionality for each report.
 * 
 * Requirements: 8.2 - Local storage on failure with retry capability
 * Task: 20.1 - Create pending reports list component
 */

import React, { useState, useEffect } from 'react';
import { PendingReport, RetryStatus, PendingReportsListProps } from './types';

/**
 * PendingReportsList Component
 * 
 * Features:
 * - Display list of unsent reports with metadata
 * - "Retry" button for each report to attempt resubmission
 * - "Delete" button for each report to remove from storage
 * - Show retry status and errors
 * - Refresh list after operations
 */
export const PendingReportsList: React.FC<PendingReportsListProps> = ({ isOpen, onClose }) => {
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [retryStatuses, setRetryStatuses] = useState<Map<string, RetryStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load pending reports from storage
   */
  const loadPendingReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call Python backend to list pending reports
      const response = await fetch('/api/feedback/pending', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to load pending reports: ${response.statusText}`);
      }

      const reports: PendingReport[] = await response.json();
      setPendingReports(reports);

      // Initialize retry statuses
      const statuses = new Map<string, RetryStatus>();
      reports.forEach(report => {
        statuses.set(report.report_id, {
          report_id: report.report_id,
          status: 'idle',
        });
      });
      setRetryStatuses(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending reports');
      console.error('Error loading pending reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Retry submitting a specific report
   */
  const handleRetry = async (reportId: string) => {
    // Update status to retrying
    setRetryStatuses(prev => {
      const updated = new Map(prev);
      updated.set(reportId, { report_id: reportId, status: 'retrying' });
      return updated;
    });

    try {
      // Call Python backend to retry the report
      const response = await fetch(`/api/feedback/retry/${reportId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to retry report: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update status to success
        setRetryStatuses(prev => {
          const updated = new Map(prev);
          updated.set(reportId, { report_id: reportId, status: 'success' });
          return updated;
        });

        // Remove from list after a short delay
        setTimeout(() => {
          setPendingReports(prev => prev.filter(r => r.report_id !== reportId));
          setRetryStatuses(prev => {
            const updated = new Map(prev);
            updated.delete(reportId);
            return updated;
          });
        }, 2000);
      } else {
        // Update status to error
        setRetryStatuses(prev => {
          const updated = new Map(prev);
          updated.set(reportId, {
            report_id: reportId,
            status: 'error',
            error: result.error || 'Retry failed',
          });
          return updated;
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      setRetryStatuses(prev => {
        const updated = new Map(prev);
        updated.set(reportId, {
          report_id: reportId,
          status: 'error',
          error: errorMessage,
        });
        return updated;
      });
      console.error('Error retrying report:', err);
    }
  };

  /**
   * Delete a specific report from storage
   */
  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      // Call Python backend to delete the report
      const response = await fetch(`/api/feedback/delete/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete report: ${response.statusText}`);
      }

      // Remove from list
      setPendingReports(prev => prev.filter(r => r.report_id !== reportId));
      setRetryStatuses(prev => {
        const updated = new Map(prev);
        updated.delete(reportId);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
      console.error('Error deleting report:', err);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string): string => {
    // Format: YYYYMMDD_HHMMSS -> YYYY-MM-DD HH:MM:SS
    if (timestamp.length >= 15) {
      const date = timestamp.substring(0, 8);
      const time = timestamp.substring(9, 15);
      return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)} ${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4, 6)}`;
    }
    return timestamp;
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: RetryStatus | undefined) => {
    if (!status) return null;

    const styles = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      retrying: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Retrying...' },
      success: { bg: 'bg-green-100', text: 'text-green-700', label: 'Success' },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    };

    const style = styles[status.status];

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Load reports when component opens
  useEffect(() => {
    if (isOpen) {
      loadPendingReports();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Pending Feedback Reports</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading pending reports...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && pendingReports.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending reports</h3>
              <p className="mt-1 text-sm text-gray-500">All feedback reports have been submitted successfully.</p>
            </div>
          )}

          {!isLoading && !error && pendingReports.length > 0 && (
            <div className="space-y-4">
              {pendingReports.map((report) => {
                const status = retryStatuses.get(report.report_id);
                const isRetrying = status?.status === 'retrying';

                return (
                  <div
                    key={report.report_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">{report.filename}</h3>
                          {getStatusBadge(status)}
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            <span className="font-medium">Created:</span> {formatTimestamp(report.timestamp)}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span> {formatFileSize(report.size_bytes)}
                          </div>
                          <div>
                            <span className="font-medium">ID:</span> {report.report_id}
                          </div>
                        </div>
                        {status?.error && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <span className="font-medium">Error:</span> {status.error}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleRetry(report.report_id)}
                          disabled={isRetrying}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            isRetrying
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title="Retry submitting this report"
                        >
                          {isRetrying ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Retrying
                            </span>
                          ) : (
                            'Retry'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(report.report_id)}
                          disabled={isRetrying}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            isRetrying
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                          title="Delete this report permanently"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {pendingReports.length > 0 && (
              <span>
                {pendingReports.length} pending {pendingReports.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadPendingReports}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingReportsList;
