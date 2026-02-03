/**
 * AddonCard Component
 * Carte d'affichage d'un add-on dans la grille du marketplace
 */

import React from 'react';
import { Addon } from '../../stores/addonStore';

interface AddonCardProps {
  addon: Addon;
  onSelect: () => void;
  onEnable: () => void;
  onDisable: () => void;
}

const typeIcons: Record<string, string> = {
  workflow_addon: '⚡',
  ui_addon: '🖥️',
  processing_addon: '🔧',
  model_addon: '🤖',
  export_addon: '📤',
};

const statusColors: Record<string, string> = {
  enabled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  disabled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const categoryBadgeColors: Record<string, string> = {
  official: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  community: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  templates: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const AddonCard: React.FC<AddonCardProps> = ({
  addon,
  onSelect,
  onEnable,
  onDisable,
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addon.enabled) {
      onDisable();
    } else {
      onEnable();
    }
  };

  return (
    <div
      onClick={onSelect}
      className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcons[addon.type] || '📦'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {addon.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              v{addon.version} • {addon.author}
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[addon.status]
          }`}
        >
          {addon.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
        {addon.description}
      </p>

      {/* Error Message */}
      {addon.error_message && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          ⚠️ {addon.error_message}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Category Badge */}
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            categoryBadgeColors[addon.category]
          }`}
        >
          {addon.category}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Button */}
          {addon.status !== 'error' && (
            <button
              onClick={handleToggle}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                addon.enabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
              }`}
            >
              {addon.enabled ? 'Disable' : 'Enable'}
            </button>
          )}

          {/* Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Details
          </button>
        </div>
      </div>

      {/* Permissions Count */}
      {addon.permissions.length > 0 && (
        <div className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
          🔒 {addon.permissions.length}
        </div>
      )}

      {/* Load Time */}
      {addon.load_time && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-400 dark:text-gray-500">
          ⏱️ {addon.load_time.toFixed(2)}s
        </div>
      )}
    </div>
  );
};
