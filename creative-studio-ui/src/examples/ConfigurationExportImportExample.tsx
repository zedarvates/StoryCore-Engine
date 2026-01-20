/**
 * Configuration Export/Import Example
 * 
 * Demonstrates the usage of the configuration export/import system
 * for the grid editor.
 */

import React, { useState } from 'react';
import { ConfigurationExportImport } from '../components/gridEditor/ConfigurationExportImport';
import type { GridEditorConfiguration } from '../services/gridEditor/ConfigurationExportImport';
import type { GridLayoutConfig, GridPanel } from '../types/gridEditorAdvanced';

export const ConfigurationExportImportExample: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [configuration, setConfiguration] = useState<GridEditorConfiguration>({
    layout: {
      columns: 3,
      rows: 3,
      gap: 16,
      cellSize: { width: 200, height: 200 },
      snapEnabled: true,
      snapThreshold: 10,
      showGridLines: true
    },
    visualPreferences: {
      theme: 'light',
      showGridLines: true,
      showAlignmentGuides: true,
      animationsEnabled: true
    },
    snapSettings: {
      enabled: true,
      threshold: 10,
      gridSizes: [8, 16, 24, 32]
    },
    panels: []
  });

  const handleImport = (newConfig: GridEditorConfiguration) => {
    setConfiguration(newConfig);
    console.log('Configuration imported:', newConfig);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Configuration Export/Import Example</h1>
      
      <div style={{
        padding: '24px',
        background: '#f5f5f5',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h2 style={{ marginTop: 0 }}>Current Configuration</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <ConfigSection title="Layout">
            <ConfigItem label="Columns" value={configuration.layout.columns} />
            <ConfigItem label="Rows" value={configuration.layout.rows} />
            <ConfigItem label="Gap" value={`${configuration.layout.gap}px`} />
            <ConfigItem 
              label="Cell Size" 
              value={`${configuration.layout.cellSize.width}x${configuration.layout.cellSize.height}`} 
            />
            <ConfigItem label="Snap Enabled" value={configuration.layout.snapEnabled ? 'Yes' : 'No'} />
            <ConfigItem label="Snap Threshold" value={configuration.layout.snapThreshold} />
          </ConfigSection>

          <ConfigSection title="Visual Preferences">
            <ConfigItem label="Theme" value={configuration.visualPreferences.theme || 'default'} />
            <ConfigItem 
              label="Show Grid Lines" 
              value={configuration.visualPreferences.showGridLines ? 'Yes' : 'No'} 
            />
            <ConfigItem 
              label="Show Alignment Guides" 
              value={configuration.visualPreferences.showAlignmentGuides ? 'Yes' : 'No'} 
            />
            <ConfigItem 
              label="Animations" 
              value={configuration.visualPreferences.animationsEnabled ? 'Enabled' : 'Disabled'} 
            />
          </ConfigSection>

          <ConfigSection title="Snap Settings">
            <ConfigItem label="Enabled" value={configuration.snapSettings.enabled ? 'Yes' : 'No'} />
            <ConfigItem label="Threshold" value={configuration.snapSettings.threshold} />
            <ConfigItem 
              label="Grid Sizes" 
              value={configuration.snapSettings.gridSizes.join(', ')} 
            />
          </ConfigSection>

          <ConfigSection title="Panels">
            <ConfigItem label="Count" value={configuration.panels?.length || 0} />
          </ConfigSection>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setShowDialog(true)}
          style={{
            padding: '12px 24px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          📤 Export / 📥 Import Configuration
        </button>

        <button
          onClick={() => {
            setConfiguration({
              ...configuration,
              layout: {
                ...configuration.layout,
                columns: Math.floor(Math.random() * 5) + 2,
                gap: Math.floor(Math.random() * 20) + 8
              }
            });
          }}
          style={{
            padding: '12px 24px',
            background: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🎲 Randomize Configuration
        </button>
      </div>

      {/* Features List */}
      <div style={{
        padding: '24px',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px'
      }}>
        <h2 style={{ marginTop: 0 }}>Features</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <FeatureCard
            icon="📄"
            title="JSON Export"
            description="Export configuration as a JSON file for easy storage and version control"
          />
          <FeatureCard
            icon="📋"
            title="YAML Export"
            description="Export as human-readable YAML format for documentation"
          />
          <FeatureCard
            icon="🔗"
            title="URL Sharing"
            description="Generate shareable URLs with base64-encoded configuration"
          />
          <FeatureCard
            icon="📥"
            title="Import from File"
            description="Import configurations from JSON or YAML files"
          />
          <FeatureCard
            icon="🔄"
            title="Conflict Resolution"
            description="Automatically detect and resolve configuration conflicts"
          />
          <FeatureCard
            icon="📦"
            title="Template Export"
            description="Export reusable templates without panel positions"
          />
          <FeatureCard
            icon="✅"
            title="Validation"
            description="Comprehensive validation with detailed error messages"
          />
          <FeatureCard
            icon="🔍"
            title="Smart Merge"
            description="Intelligent merging of configurations with conflict detection"
          />
        </div>
      </div>

      {/* Usage Instructions */}
      <div style={{
        marginTop: '24px',
        padding: '24px',
        background: '#e3f2fd',
        borderRadius: '12px'
      }}>
        <h3 style={{ marginTop: 0 }}>How to Use</h3>
        <ol style={{ marginBottom: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            Click "Export / Import Configuration" to open the dialog
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Export:</strong> Choose format (JSON, YAML, or URL) and export type (Full or Template)
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Import:</strong> Upload a file or paste a configuration URL
          </li>
          <li style={{ marginBottom: '8px' }}>
            If conflicts are detected, choose a resolution strategy
          </li>
          <li>
            The configuration will be applied to your grid editor
          </li>
        </ol>
      </div>

      {/* Dialog */}
      {showDialog && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowDialog(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999
            }}
          />
          
          {/* Dialog */}
          <ConfigurationExportImport
            currentConfiguration={configuration}
            onImport={handleImport}
            onClose={() => setShowDialog(false)}
          />
        </>
      )}

      {/* Notification Listener */}
      <NotificationListener />
    </div>
  );
};

/**
 * Config Section Component
 */
const ConfigSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <div style={{
      padding: '16px',
      background: 'white',
      borderRadius: '8px'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Config Item Component
 */
const ConfigItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
      <span style={{ color: '#666' }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
};

/**
 * Feature Card Component
 */
const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({
  icon,
  title,
  description
}) => {
  return (
    <div style={{
      padding: '16px',
      background: '#f5f5f5',
      borderRadius: '8px'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
        {description}
      </p>
    </div>
  );
};

/**
 * Notification Listener Component
 */
const NotificationListener: React.FC = () => {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  React.useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{
        message: string;
        type: 'success' | 'error' | 'info';
      }>;
      
      setNotification(customEvent.detail);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    };

    window.addEventListener('grid-config-notification', handleNotification);
    
    return () => {
      window.removeEventListener('grid-config-notification', handleNotification);
    };
  }, []);

  if (!notification) return null;

  const bgColor = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3'
  }[notification.type];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '16px 24px',
        background: bgColor,
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: 10001,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      {notification.message}
    </div>
  );
};

export default ConfigurationExportImportExample;
