/**
 * AddonDetailsModal Component
 * Modal affichant les détails complets d'un add-on
 */

import React, { useState, useEffect } from 'react';
import { AddonDetails, useAddonStore, ValidationResult, SecurityReport, QualityReport } from '../../stores/addonStore';

interface AddonDetailsModalProps {
  addon: AddonDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddonDetailsModal: React.FC<AddonDetailsModalProps> = ({
  addon,
  isOpen,
  onClose,
}) => {
  const { enableAddon, disableAddon, uninstallAddon, validateAddon } = useAddonStore();
  const [activeTab, setActiveTab] = useState<'info' | 'permissions' | 'validation'>('info');
  const [validationData, setValidationData] = useState<{
    validation: ValidationResult;
    security: SecurityReport;
    quality: QualityReport;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen && addon) {
      setActiveTab('info');
      setValidationData(null);
    }
  }, [isOpen, addon]);

  if (!isOpen || !addon) return null;

  const handleEnable = async () => {
    try {
      await enableAddon(addon.name);
    } catch (error) {
      console.error('Failed to enable addon:', error);
    }
  };

  const handleDisable = async () => {
    try {
      await disableAddon(addon.name);
    } catch (error) {
      console.error('Failed to disable addon:', error);
    }
  };

  const handleUninstall = async () => {
    if (confirm(`Are you sure you want to uninstall "${addon.name}"?`)) {
      try {
        await uninstallAddon(addon.name);
        onClose();
      } catch (error) {
        console.error('Failed to uninstall addon:', error);
      }
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await validateAddon(addon.name, true);
      setValidationData(result);
      setActiveTab('validation');
    } catch (error) {
      console.error('Failed to validate addon:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {addon.type === 'workflow_addon' && '⚡'}
              {addon.type === 'ui_addon' && '🖥️'}
              {addon.type === 'processing_addon' && '🔧'}
              {addon.type === 'model_addon' && '🤖'}
              {addon.type === 'export_addon' && '📤'}
            </span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {addon.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                v{addon.version} by {addon.author}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Permissions ({addon.permissions.length})
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'validation'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Validation
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{addon.description}</p>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Status
                </h3>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      addon.status === 'enabled'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : addon.status === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {addon.status}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Category: {addon.category}
                  </span>
                  {addon.load_time && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Load time: {addon.load_time.toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {addon.error_message && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                    Error
                  </h3>
                  <p className="text-red-700 dark:text-red-300">{addon.error_message}</p>
                </div>
              )}

              {/* Compatibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Compatibility
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={addon.compatibility_check.engine_version_ok ? '✅' : '❌'}>
                      {addon.compatibility_check.engine_version_ok ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      Engine Version: {addon.compatibility.engine_version || 'Any'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={addon.compatibility_check.python_version_ok ? '✅' : '❌'}>
                      {addon.compatibility_check.python_version_ok ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      Python Version: {addon.compatibility.python_version || 'Any'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={addon.compatibility_check.dependencies_ok ? '✅' : '❌'}>
                      {addon.compatibility_check.dependencies_ok ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      Dependencies: {Object.keys(addon.dependencies).length} required
                    </span>
                  </div>
                </div>
                {addon.compatibility_check.conflicts.length > 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                      Conflicts:
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                      {addon.compatibility_check.conflicts.map((conflict, i) => (
                        <li key={i}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Dependencies */}
              {Object.keys(addon.dependencies).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Dependencies
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(addon.dependencies).map(([name, version]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry Points */}
              {Object.keys(addon.entry_points).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Entry Points
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(addon.entry_points).map(([name, path]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {addon.metadata && Object.keys(addon.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Metadata
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(addon.metadata).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <span className="text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                This add-on requires the following permissions:
              </p>
              {addon.permissions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No permissions required
                </p>
              ) : (
                <div className="space-y-2">
                  {addon.permissions.map((permission, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-xl">🔒</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {permission.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getPermissionDescription(permission)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-6">
              {!validationData ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Click the button below to validate this add-on
                  </p>
                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isValidating ? 'Validating...' : 'Run Validation'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Validation Results */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Validation Results
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                        <p className={`text-lg font-bold ${
                          validationData.validation.is_valid
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {validationData.validation.is_valid ? 'VALID' : 'INVALID'}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Score</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.validation.score.toFixed(1)}/100
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Issues</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.validation.issues_count}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Report */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Security Analysis
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Risk Level
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          validationData.security.risk_level === 'low'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : validationData.security.risk_level === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {validationData.security.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={validationData.security.safe ? '✅' : '⚠️'}>
                          {validationData.security.safe ? '✅' : '⚠️'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {validationData.security.safe ? 'Safe to use' : 'Review required'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quality Report */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Code Quality
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Quality Score
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.quality.score}/100
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Total Lines
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.quality.metrics.total_lines}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Functions
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.quality.metrics.functions}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Classes
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {validationData.quality.metrics.classes}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleUninstall}
            className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
          >
            Uninstall
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium transition-colors"
            >
              Close
            </button>
            {addon.status !== 'error' && (
              <button
                onClick={addon.enabled ? handleDisable : handleEnable}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  addon.enabled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {addon.enabled ? 'Disable' : 'Enable'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for permission descriptions
function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    model_access: 'Access to AI models and generation capabilities',
    file_system_read: 'Read files from the file system',
    file_system_write: 'Write and modify files on the file system',
    network_access: 'Make network requests to external services',
    ui_access: 'Modify and extend the user interface',
    config_access: 'Read and modify application configuration',
    database_access: 'Access to the application database',
    system_info_access: 'Access to system information',
  };
  return descriptions[permission] || 'Custom permission';
}
