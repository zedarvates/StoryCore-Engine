import React, { useState, useEffect, useCallback } from 'react';
import './ActiveAddonsGrid.css';

// Addon type enum matching Python backend
export type AddonType = 
  | 'workflow_addon'
  | 'ui_addon'
  | 'processing_addon'
  | 'model_addon'
  | 'export_addon';

// Addon state enum matching Python backend
export type AddonState = 
  | 'disabled'
  | 'enabled'
  | 'error'
  | 'loading';

// Addon data from API
export interface AddonData {
  name: string;
  version: string;
  type: AddonType;
  author: string;
  description: string;
  category: 'official' | 'community';
  status: AddonState;
  enabled: boolean;
  permissions: string[];
  dependencies: Record<string, string>;
  metadata: Record<string, any>;
  load_time: number | null;
  error_message: string | null;
  icon?: string;
  has_open?: boolean;
}

// API response for list addons
export interface AddonsListResponse {
  success: boolean;
  count: number;
  addons: AddonData[];
}

// Props for ActiveAddonsGrid
export interface ActiveAddonsGridProps {
  projectId: string;
  onAddonClick?: (addon: AddonData) => void;
  onAddonDisable?: (addonName: string) => void;
  onAddonOpen?: (addonName: string) => void;
  refreshTrigger?: number; // External trigger to refresh data
  className?: string;
}

// Props for individual AddonTile
export interface AddonTileProps {
  addon: AddonData;
  onDisable: () => void;
  onOpen?: () => void;
  onClick?: () => void;
}

// Icon mapping by addon type
const ADDON_TYPE_ICONS: Record<AddonType, string> = {
  workflow_addon: '⚡',
  ui_addon: '🖥️',
  processing_addon: '🔧',
  model_addon: '🤖',
  export_addon: '📤'
};

const ADDON_TYPE_LABELS: Record<AddonType, string> = {
  workflow_addon: 'Workflow',
  ui_addon: 'UI',
  processing_addon: 'Processing',
  model_addon: 'Model',
  export_addon: 'Export'
};

/**
 * Individual addon tile component
 */
const AddonTile: React.FC<AddonTileProps> = ({ addon, onDisable, onOpen, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const handleDisable = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDisabling(true);
    try {
      await onDisable();
    } finally {
      setIsDisabling(false);
    }
  };

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onOpen) return;
    setIsOpening(true);
    try {
      await onOpen();
    } finally {
      setIsOpening(false);
    }
  };

  const icon = addon.icon 
    ? <img src={addon.icon} alt={`${addon.name} icon`} />
    : <div className="default-addon-icon">{ADDON_TYPE_ICONS[addon.type] || '📦'}</div>;
  
  const typeLabel = ADDON_TYPE_LABELS[addon.type] || 'Unknown';

  return (
    <div className="addon-tile-container">
      <button
        className={`addon-tile active`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`${addon.name}: ${addon.description}`}
      >
        {/* Active indicator */}
        <div className="active-indicator" title="Active" />
        
        <div className="addon-icon">
          {icon}
        </div>
        <div className="addon-name">{addon.name}</div>
        <div className="addon-version">v{addon.version}</div>
        
        {/* Open button */}
        {addon.has_open !== false && (
          <button
            className="open-btn"
            onClick={handleOpen}
            disabled={isOpening}
          >
            {isOpening ? 'Opening...' : 'Open'}
          </button>
        )}
      </button>

      {showTooltip && (
        <div className="addon-tooltip">
          <div className="tooltip-title">{addon.name}</div>
          <div className="tooltip-description">{addon.description}</div>
          <div className="tooltip-meta">
            <div>Author: {addon.author || 'Unknown'}</div>
            <div>Type: {typeLabel}</div>
            <div>Category: {addon.category}</div>
            {addon.load_time && <div>Load time: {addon.load_time.toFixed(3)}s</div>}
          </div>
          <div className="tooltip-actions">
            <button
              className="disable-btn"
              onClick={handleDisable}
              disabled={isDisabling}
            >
              {isDisabling ? 'Disabling...' : 'Disable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for fetching enabled addons
 */
const useEnabledAddons = (refreshTrigger?: number) => {
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/addons?status=enabled');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: AddonsListResponse = await response.json();
      if (data.success) {
        setAddons(data.addons);
      } else {
        throw new Error('Failed to fetch addons');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch enabled addons:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons, refreshTrigger]);

  return { addons, isLoading, error, refetch: fetchAddons };
};

/**
 * ActiveAddonsGrid component - displays enabled add-ons as a grid of tiles
 * following the Wizards visual style pattern.
 */
const ActiveAddonsGrid: React.FC<ActiveAddonsGridProps> = ({
  projectId: _projectId,
  onAddonClick,
  onAddonDisable,
  onAddonOpen,
  refreshTrigger,
  className = ''
}) => {
  const { addons, isLoading, error, refetch } = useEnabledAddons(refreshTrigger);

  const handleDisable = useCallback(async (addonName: string) => {
    try {
      const response = await fetch(`/api/addons/${encodeURIComponent(addonName)}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        onAddonDisable?.(addonName);
        refetch();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to disable addon:', errorData);
      }
    } catch (err) {
      console.error('Failed to disable addon:', err);
    }
  }, [onAddonDisable, refetch]);

  const handleOpen = useCallback(async (addonName: string) => {
    try {
      const response = await fetch(`/api/addons/${encodeURIComponent(addonName)}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        onAddonOpen?.(addonName);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to open addon:', errorData);
      }
    } catch (err) {
      console.error('Failed to open addon:', err);
    }
  }, [onAddonOpen]);

  // Listen for addon-enabled / addon-disabled events for real-time sync
  useEffect(() => {
    const handleAddonEnabled = () => {
      refetch();
    };

    const handleAddonDisabled = () => {
      refetch();
    };

    // Listen for custom events (these would be dispatched by the addon system)
    window.addEventListener('addon-enabled', handleAddonEnabled);
    window.addEventListener('addon-disabled', handleAddonDisabled);

    return () => {
      window.removeEventListener('addon-enabled', handleAddonEnabled);
      window.removeEventListener('addon-disabled', handleAddonDisabled);
    };
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`active-addons-grid ${className}`.trim()}>
        <div className="addons-loading">
          <div className="loading-spinner"></div>
          <p>Loading active add-ons...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`active-addons-grid ${className}`.trim()}>
        <h3 className="active-addons-title">Active Add-ons</h3>
        <div className="addons-error">
          <p>Failed to load add-ons: {error}</p>
          <button onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

  // Empty state
  if (addons.length === 0) {
    return (
      <div className={`active-addons-grid ${className}`.trim()}>
        <h3 className="active-addons-title">Active Add-ons</h3>
        <div className="no-addons">
          <div className="no-addons-icon">📦</div>
          <p className="no-addons-text">No add-ons enabled</p>
          <p className="no-addons-text" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Enable add-ons from the Add-ons menu to see them here.
          </p>
        </div>
      </div>
    );
  }

  // Grid with addons
  return (
    <div className={`active-addons-grid ${className}`.trim()}>
      <h3 className="active-addons-title">Active Add-ons ({addons.length})</h3>
      <div className="addons-grid">
        {addons.map((addon) => (
          <AddonTile
            key={addon.name}
            addon={addon}
            onDisable={() => handleDisable(addon.name)}
            onOpen={() => handleOpen(addon.name)}
            onClick={() => onAddonClick?.(addon)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Refresh active addons - can be called externally
 */
export const refreshActiveAddons = () => {
  window.dispatchEvent(new CustomEvent('addon-refresh-request'));
};

export default ActiveAddonsGrid;
