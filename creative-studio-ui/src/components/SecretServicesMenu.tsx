/**
 * Secret Services Menu Component
 * 
 * Renders a hidden menu that appears when Ctrl+Shift+Alt is held.
 * Provides access to experimental features defined in the feature registry.
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.4, 2.5, 4.4, 7.1
 */

import React, { useMemo, useState } from 'react';
import { useSecretMode } from '@/contexts/SecretModeContext';
import { getEnabledExperimentalFeatures, type ExperimentalFeature } from '@/config/experimentalFeatures';
import '@/styles/secret-services-menu.css';

/**
 * SecretServicesMenu Component
 * 
 * Displays a dropdown menu with experimental features when secret mode is active.
 * Returns null when secret mode is not active to avoid any DOM footprint.
 * 
 * Requirements:
 * - 1.1: Display menu when Ctrl+Shift+Alt is held
 * - 1.2: Hide menu when keys are released
 * - 2.1: Display list of available experimental features
 * - 2.4: Only display enabled features from registry
 * - 2.5: Automatically reflect registry changes
 * - 4.4: Support feature metadata (name, description, category)
 * - 7.1: No DOM footprint when inactive
 */
export const SecretServicesMenu: React.FC = () => {
  // Get secret mode state from context
  const { isSecretMode, setCurrentExperimentalFeature } = useSecretMode();
  
  // State for dropdown open/close
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  /**
   * Get enabled features from registry
   * Requirement 2.4, 2.5: Use useMemo to get enabled features, automatically reflects registry changes
   */
  const enabledFeatures = useMemo(() => getEnabledExperimentalFeatures(), []);
  
  /**
   * Handle feature selection
   * Requirement 2.2: Handle experimental feature selection
   */
  const handleFeatureClick = (feature: ExperimentalFeature) => {
    // Set the current experimental feature in context
    // This will trigger the App component to render the experimental page
    setCurrentExperimentalFeature(feature.id);
    
    // Close dropdown after selection
    setIsDropdownOpen(false);
    
    console.log(`Navigating to experimental feature: ${feature.name} (${feature.path})`);
  };
  
  /**
   * Don't render anything when secret mode is not active
   * Requirement 7.1: No DOM footprint when inactive
   */
  if (!isSecretMode) {
    return null;
  }
  
  return (
    <div className="secret-services-menu">
      <button
        className="secret-menu-trigger"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label="Secret Services - Experimental Features"
      >
        <span className="secret-menu-icon">🔐</span>
        <span className="secret-menu-label">Secret Services</span>
      </button>
      
      {isDropdownOpen && (
        <div className="secret-menu-dropdown">
          <div className="secret-menu-header">
            <span className="secret-menu-title">Experimental Features</span>
            <span className="secret-menu-badge">DEV MODE</span>
          </div>
          
          {enabledFeatures.length === 0 ? (
            <div className="secret-menu-empty">
              No experimental features available
            </div>
          ) : (
            <ul className="secret-menu-list">
              {enabledFeatures.map(feature => (
                <li key={feature.id} className="secret-menu-item">
                  <button
                    onClick={() => handleFeatureClick(feature)}
                    className="secret-menu-item-button"
                  >
                    {feature.icon && (
                      <span className="secret-menu-item-icon">{feature.icon}</span>
                    )}
                    <div className="secret-menu-item-content">
                      <span className="secret-menu-item-name">{feature.name}</span>
                      <span className="secret-menu-item-description">
                        {feature.description}
                      </span>
                    </div>
                    {feature.category && (
                      <span className={`secret-menu-item-category ${feature.category}`}>
                        {feature.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
