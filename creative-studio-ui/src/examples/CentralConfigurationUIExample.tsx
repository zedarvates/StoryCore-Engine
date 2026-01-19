/**
 * Central Configuration UI - Usage Example
 * 
 * This example demonstrates how to integrate the Central Configuration UI
 * into your application.
 */

import React, { useState } from 'react';
import { CentralConfigurationUI } from '../components';

export function CentralConfigurationUIExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState({
    id: 'demo-project-123',
    name: 'My Awesome Project',
  });

  return (
    <div>
      {/* Your application content */}
      <div style={{ padding: '20px' }}>
        <h1>My Application</h1>
        <button onClick={() => setIsOpen(true)}>
          Open Configuration
        </button>
      </div>

      {/* Central Configuration UI */}
      {isOpen && (
        <CentralConfigurationUI
          projectId={currentProject.id}
          projectName={currentProject.name}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Alternative: Embedded in a page (without modal overlay)
 */
export function EmbeddedConfigurationExample() {
  const projectId = 'demo-project-456';
  const projectName = 'Embedded Project';

  return (
    <div style={{ minHeight: '100vh' }}>
      <CentralConfigurationUI
        projectId={projectId}
        projectName={projectName}
        // No onClose prop = no close button
      />
    </div>
  );
}

/**
 * Alternative: Using configuration context directly
 */
import { ConfigurationProvider, useConfiguration } from '../components';

function MyCustomComponent() {
  const {
    projectConfig,
    saveProjectConfig,
    isLoading,
  } = useConfiguration();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Custom Configuration Component</h2>
      <pre>{JSON.stringify(projectConfig, null, 2)}</pre>
      <button
        onClick={() => {
          const currentApi = projectConfig?.api || {
            endpoints: {},
            defaultTimeout: 30000,
            enableLogging: false,
          };
          saveProjectConfig({
            api: {
              ...currentApi,
              enableLogging: true,
            },
          });
        }}
      >
        Enable API Logging
      </button>
    </div>
  );
}

export function CustomConfigurationExample() {
  return (
    <ConfigurationProvider>
      <MyCustomComponent />
    </ConfigurationProvider>
  );
}
