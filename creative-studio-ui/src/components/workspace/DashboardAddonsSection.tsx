/**
 * Dashboard Addons Section Component
 * 
 * Displays activated addons as tiles/buttons on the dashboard
 * Provides quick access to addon features and settings
 * Supports launching wizards directly from addon tiles
 */

import { useState, useEffect, useCallback } from 'react';
import { addonManager, AddonInfo, AddonAction } from '@/services/AddonManager';
import { useAppStore } from '@/stores/useAppStore';
import {
  Puzzle,
  Settings,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Info,
  Plus,
  ToggleLeft,
  ToggleRight,
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WizardType } from '@/contexts/WizardContext';

interface DashboardAddonsSectionProps {
  readonly className?: string;
  readonly onLaunchWizard?: (wizardType: WizardType, initialData?: Record<string, unknown>) => void;
  readonly hideHeader?: boolean;
  readonly style?: React.CSSProperties;
}

/**
 * Mapping of addon IDs to their associated wizards
 */
const ADDON_WIZARD_MAP: Record<string, WizardType> = {
  'casting': 'character',
  'storyteller': 'storyteller',
  'world-builder': 'world',
  'object-creator': 'object',
  'scene-generator': 'scene-generator',
  'dialogue-writer': 'dialogue-writer',
  'storyboard-creator': 'storyboard-creator',
  'project-setup': 'project-setup',
};

/**
 * Get icon for addon based on category or custom icon
 */
function getAddonIcon(addon: AddonInfo): string {
  if (addon.icon) {
    return addon.icon;
  }

  // Default icons based on category
  switch (addon.category) {
    case 'ui':
      return '🎨';
    case 'processing':
      return '⚙️';
    case 'export':
      return '📤';
    case 'integration':
      return '🔗';
    case 'utility':
      return '🛠️';
    case 'character':
      return '👤';
    case 'world':
      return '🌍';
    case 'story':
      return '📖';
    default:
      return '📦';
  }
}

/**
 * Get color scheme based on addon status
 */
function getStatusColorScheme(status: AddonInfo['status']) {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        badge: 'bg-green-500/20 text-green-300',
        hover: 'hover:border-green-400/50 hover:bg-green-500/20'
      };
    case 'inactive':
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        badge: 'bg-gray-500-300',
        hover: 'hover:border-gray-/20 text-gray400/50 hover:bg-gray-500/20'
      };
    case 'error':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-300',
        hover: 'hover:border-red-400/50 hover:bg-red-500/20'
      };
    case 'loading':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300',
        hover: 'hover:border-blue-400/50 hover:bg-blue-500/20'
      };
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        badge: 'bg-gray-500/20 text-gray-300',
        hover: 'hover:border-gray-400/50 hover:bg-gray-500/20'
      };
  }
}

/**
 * Check if addon has an associated wizard
 */
function getAddonWizard(addonId: string): WizardType | null {
  return ADDON_WIZARD_MAP[addonId] || null;
}

export function DashboardAddonsSection({
  className = '',
  onLaunchWizard,
  hideHeader = false,
  style = {}
}: DashboardAddonsSectionProps) {
  const [addons, setAddons] = useState<AddonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [hoveredAddon, setHoveredAddon] = useState<string | null>(null);
  const [addonActions, setAddonActions] = useState<Record<string, AddonAction[]>>({});
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null);

  // Get function to open settings modal from store
  const setShowGeneralSettings = useAppStore((state) => state.setShowGeneralSettings);
  const openAddonSettings = useAppStore((state) => state.openAddonSettings);

  // Initialize addons and load them
  useEffect(() => {
    const initializeAddons = async () => {
      try {
        if (!initialized) {
          await addonManager.initialize();
          setInitialized(true);
        }
        // Get ALL addons (both enabled and disabled) to show all available addons
        const allAddons = addonManager.getAddons();
        setAddons(allAddons);

        // Load custom actions for each addon
        const actions: Record<string, AddonAction[]> = {};
        for (const addon of allAddons) {
          try {
            actions[addon.id] = addonManager.getAddonActions(addon.id);
          } catch {
            actions[addon.id] = [];
          }
        }
        setAddonActions(actions);
      } catch (error) {
        console.error('[DashboardAddonsSection] Failed to initialize addons:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAddons();
  }, [initialized]);

  // Handle toggle addon directly from dashboard
  const handleToggleAddon = useCallback(async (addonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingAddon(addonId);
    try {
      const success = await addonManager.toggleAddon(addonId);
      if (success) {
        // Refresh the addons list
        const allAddons = addonManager.getAddons();
        setAddons(allAddons);
      }
    } catch (error) {
      console.error('[DashboardAddonsSection] Failed to toggle addon:', error);
    } finally {
      setTogglingAddon(null);
    }
  }, []);

  // Handle addon click - open settings or perform action
  const handleAddonClick = useCallback((addon: AddonInfo) => {
    if (addon.status === 'active') {
      openAddonSettings(addon.id);
    }
  }, [openAddonSettings]);

  // Handle wizard launch from addon
  const handleLaunchWizard = useCallback((addon: AddonInfo) => {
    const wizardType = getAddonWizard(addon.id);
    if (wizardType && onLaunchWizard) {
      onLaunchWizard(wizardType);
    }
  }, [onLaunchWizard]);

  // Handle custom action from addon
  const handleActionClick = useCallback(async (addonId: string, action: AddonAction) => {
    try {
      await addonManager.executeAddonAction(addonId, action.id);
    } catch (error) {
      console.error(`[DashboardAddonsSection] Failed to execute action ${action.id}:`, error);
    }
  }, []);

  // Handle "Manage Addons" button click
  const handleManageAddons = () => {
    setShowGeneralSettings(true);
  };

  // Refresh addons list
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await addonManager.initialize();
      // Get ALL addons to show all available addons
      const allAddons = addonManager.getAddons();
      setAddons(allAddons);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`addons-section ${className}`} style={style}>
        {!hideHeader && (
          <div className="section-header">
            <h3>
              <Puzzle className="w-5 h-5" />
              <span>Add-ons</span>
            </h3>
          </div>
        )}
        <div className="addons-loading">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading addons...</span>
        </div>
      </div>
    );
  }

  // Don't render section if no addons
  if (addons.length === 0) {
    return (
      <div className={`addons-section ${className}`} style={style}>
        {!hideHeader && (
          <div className="section-header">
            <h3>
              <Puzzle className="w-5 h-5" />
              <span>Add-ons</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageAddons}
              className="text-xs"
            >
              Browse Add-ons
            </Button>
          </div>
        )}
        <div className="addons-empty">
          <p>No add-ons activated yet.</p>
          <p className="text-xs text-muted-foreground">
            Enable add-ons in Settings to extend StoryCore functionality
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`addons-section ${className}`} style={style}>
      {!hideHeader && (
        <div className="section-header">
          <h3>
            <Puzzle className="w-5 h-5" />
            <span>Add-ons</span>
            <span className="addon-count">
              ({addons.filter(a => a.enabled).length}/{addons.length})
            </span>
          </h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-xs h-8 w-8 p-0"
              title="Refresh"
            >
              <Loader2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageAddons}
              className="text-xs"
            >
              Manage
            </Button>
          </div>
        </div>
      )}

      <div className="addons-grid">
        {addons.map((addon) => {
          const colorScheme = getStatusColorScheme(addon.status);
          const hasWizard = getAddonWizard(addon.id) !== null;
          const actions = addonActions[addon.id] || [];
          const isHovered = hoveredAddon === addon.id;
          const isEnabled = addon.enabled;
          const isToggling = togglingAddon === addon.id;

          return (
            <div
              key={addon.id}
              className={`addon-tile ${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover} transition-all duration-200 ${!isEnabled ? 'opacity-60' : ''}`}
              onMouseEnter={() => setHoveredAddon(addon.id)}
              onMouseLeave={() => setHoveredAddon(null)}
            >
              {/* Main tile content - clickable */}
              <button
                className="addon-tile-main w-full text-left"
                onClick={() => handleAddonClick(addon)}
                title={addon.description}
              >
                <div className="addon-tile-header">
                  <span className={`addon-icon ${!isEnabled ? 'grayscale' : ''}`}>
                    {getAddonIcon(addon)}
                  </span>
                  <div className={`addon-status-badge ${colorScheme.badge}`}>
                    {addon.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                    {addon.status === 'error' && <AlertCircle className="w-3 h-3" />}
                    {addon.status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{addon.status}</span>
                  </div>
                </div>

                <div className="addon-tile-content">
                  <h4 className={`addon-name ${colorScheme.text}`}>{addon.name}</h4>
                  <p className="addon-description">{addon.description}</p>
                </div>

                <div className="addon-tile-footer">
                  <span className="addon-version">v{addon.version}</span>
                  <div className="addon-action">
                    <Settings className="w-4 h-4" />
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </button>

              {/* Quick action buttons - shown on hover for active addons */}
              {isHovered && (
                <div className="addon-quick-actions">
                  {/* Toggle Button - Always visible on hover */}
                  <button
                    className={`addon-action-btn toggle-btn ${isEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                    onClick={(e) => handleToggleAddon(addon.id, e)}
                    disabled={isToggling}
                    title={isEnabled ? 'Disable addon' : 'Enable addon'}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isEnabled ? (
                      <>
                        <Power className="w-3 h-3" />
                        <span>ON</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3" />
                        <span>OFF</span>
                      </>
                    )}
                  </button>

                  {/* Wizard Launch Button - Only for active addons */}
                  {isEnabled && hasWizard && onLaunchWizard && (
                    <button
                      className="addon-action-btn wizard-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchWizard(addon);
                      }}
                      title={`Create with ${addon.name}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create</span>
                    </button>
                  )}

                  {/* Settings Button - Only for active addons */}
                  {isEnabled && (
                    <button
                      className="addon-action-btn settings-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddonClick(addon);
                      }}
                      title="Settings"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  )}

                  {/* Custom Actions */}
                  {isEnabled && actions.map((action) => (
                    <button
                      key={action.id}
                      className="addon-action-btn custom-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(addon.id, action);
                      }}
                      title={action.name}
                    >
                      {action.icon || <Zap className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}

              {addon.errorMessage && (
                <div className="addon-error">
                  <AlertCircle className="w-3 h-3" />
                  <span>{addon.errorMessage}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick tip */}
      <div className="addons-tip">
        <span className="text-xs text-muted-foreground">
          💡 Tip: Hover over an addon and click the power button to enable/disable. Click "Create" to launch a wizard!
        </span>
      </div>
    </div>
  );
}

export default DashboardAddonsSection;

