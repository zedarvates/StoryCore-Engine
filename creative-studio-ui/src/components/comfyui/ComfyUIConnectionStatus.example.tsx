/**
 * ComfyUIConnectionStatus Example
 * 
 * Demonstrates usage of the ComfyUI connection status components.
 */

import React, { useState } from 'react';
import { ComfyUIConnectionStatus } from './ComfyUIConnectionStatus';
import { ConnectionStatusDisplay } from './ConnectionStatusDisplay';
import { ConnectionInfoModal } from './ConnectionInfoModal';
import type { ConnectionStatus } from './ConnectionStatusDisplay';
import type { ConnectionInfo } from './ConnectionInfoModal';

/**
 * Example 1: Basic Usage with Auto-Update
 */
export const BasicExample: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Basic Connection Status</h2>
      <ComfyUIConnectionStatus
        backendUrl="http://localhost:8000"
        autoUpdate={true}
        updateInterval={5000}
        onStatusChange={(status) => {
          console.log('Status changed:', status);
        }}
      />
    </div>
  );
};

/**
 * Example 2: With Custom Callbacks
 */
export const WithCallbacksExample: React.FC = () => {
  const handleRetry = () => {
    console.log('Retry clicked');
    alert('Retrying connection...');
  };

  const handleConfigure = () => {
    console.log('Configure clicked');
    alert('Opening configuration...');
  };

  const handleViewLogs = () => {
    console.log('View logs clicked');
    alert('Opening logs...');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>With Custom Callbacks</h2>
      <ComfyUIConnectionStatus
        backendUrl="http://localhost:8000"
        onRetry={handleRetry}
        onConfigure={handleConfigure}
        onViewLogs={handleViewLogs}
        onStatusChange={(status) => {
          console.log('Status changed to:', status);
        }}
      />
    </div>
  );
};

/**
 * Example 3: Manual Status Display
 */
export const ManualStatusDisplayExample: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('Connected');

  const statuses: ConnectionStatus[] = ['Connected', 'Connecting', 'Disconnected', 'Error'];

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Manual Status Display</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Select Status: </label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as ConnectionStatus)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <ConnectionStatusDisplay
        status={status}
        message={
          status === 'Connected' 
            ? 'ComfyUI v1.0.0 - 3 items in queue'
            : status === 'Connecting'
            ? 'Connecting to ComfyUI Desktop...'
            : status === 'Disconnected'
            ? 'Not connected to ComfyUI Desktop'
            : 'Connection error'
        }
        details={
          status === 'Connected'
            ? 'Connected to http://localhost:8000'
            : status === 'Error'
            ? 'Failed to connect: Connection refused'
            : undefined
        }
        onAction={() => alert(`Action clicked for ${status}`)}
        onClick={() => alert('Status clicked')}
      />
    </div>
  );
};

/**
 * Example 4: Connection Info Modal
 */
export const ConnectionInfoModalExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scenario, setScenario] = useState<'connected' | 'disconnected'>('connected');

  const connectedInfo: ConnectionInfo = {
    status: 'Connected',
    url: 'http://localhost:8000',
    version: '1.0.0',
    queueDepth: 3,
    corsEnabled: true,
    modelsReady: true,
    workflowsReady: true,
    lastCheck: new Date(),
  };

  const disconnectedInfo: ConnectionInfo = {
    status: 'Disconnected',
    url: 'http://localhost:8000',
    errorMessage: 'Connection refused',
    disconnectionReason: 'Failed to connect to backend',
    suggestedActions: [
      'Start ComfyUI Desktop',
      'Verify the backend URL is correct',
      'Check if port 8000 is available',
    ],
    lastCheck: new Date(),
  };

  const connectionInfo = scenario === 'connected' ? connectedInfo : disconnectedInfo;

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Connection Info Modal</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Scenario: </label>
        <select 
          value={scenario} 
          onChange={(e) => setScenario(e.target.value as 'connected' | 'disconnected')}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="connected">Connected</option>
          <option value="disconnected">Disconnected</option>
        </select>
      </div>

      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          padding: '10px 20px', 
          background: '#3b82f6', 
          color: 'white', 
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Open Modal
      </button>

      <ConnectionInfoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        connectionInfo={connectionInfo}
        onRetry={() => alert('Retry clicked')}
        onConfigure={() => alert('Configure clicked')}
        onViewLogs={() => alert('View logs clicked')}
      />
    </div>
  );
};

/**
 * Example 5: All Status States
 */
export const AllStatesExample: React.FC = () => {
  const statuses: Array<{
    status: ConnectionStatus;
    message: string;
    details?: string;
  }> = [
    {
      status: 'Connected',
      message: 'ComfyUI v1.0.0 - 0 items in queue',
      details: 'Connected to http://localhost:8000',
    },
    {
      status: 'Connecting',
      message: 'Connecting to ComfyUI Desktop...',
    },
    {
      status: 'Disconnected',
      message: 'Not connected to ComfyUI Desktop',
      details: 'Start ComfyUI Desktop to enable real generation',
    },
    {
      status: 'Error',
      message: 'Connection error',
      details: 'Failed to connect: Connection timeout',
    },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>All Status States</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {statuses.map((item, index) => (
          <div key={index}>
            <h3 style={{ marginBottom: '8px', fontSize: '14px', color: '#888' }}>
              {item.status}
            </h3>
            <ConnectionStatusDisplay
              status={item.status}
              message={item.message}
              details={item.details}
              onAction={() => alert(`Action for ${item.status}`)}
              onClick={() => alert(`Clicked ${item.status}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 6: Integration Example
 */
export const IntegrationExample: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Integration Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <ComfyUIConnectionStatus
          backendUrl="http://localhost:8000"
          autoUpdate={true}
          updateInterval={5000}
          onStatusChange={(status) => {
            addLog(`Status changed to: ${status}`);
          }}
          onRetry={() => {
            addLog('Retry button clicked');
          }}
          onConfigure={() => {
            addLog('Configure button clicked');
          }}
          onViewLogs={() => {
            addLog('View logs button clicked');
          }}
        />
      </div>

      <div 
        style={{ 
          background: '#1f2937', 
          padding: '16px', 
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#9ca3af' }}>
          Event Log
        </h3>
        {logs.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: '13px' }}>
            No events yet...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {logs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  fontSize: '12px', 
                  color: '#d1d5db',
                  fontFamily: 'monospace'
                }}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main demo component
 */
export const ComfyUIConnectionStatusDemo: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = [
    { id: 'basic', label: 'Basic Usage', component: BasicExample },
    { id: 'callbacks', label: 'With Callbacks', component: WithCallbacksExample },
    { id: 'manual', label: 'Manual Display', component: ManualStatusDisplayExample },
    { id: 'modal', label: 'Info Modal', component: ConnectionInfoModalExample },
    { id: 'states', label: 'All States', component: AllStatesExample },
    { id: 'integration', label: 'Integration', component: IntegrationExample },
  ];

  const ActiveComponent = examples.find((e) => e.id === activeExample)?.component || BasicExample;

  return (
    <div style={{ padding: '20px' }}>
      <h1>ComfyUI Connection Status Examples</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {examples.map((example) => (
          <button
            key={example.id}
            onClick={() => setActiveExample(example.id)}
            style={{
              padding: '8px 16px',
              background: activeExample === example.id ? '#3b82f6' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {example.label}
          </button>
        ))}
      </div>

      <div style={{ 
        background: '#111827', 
        padding: '20px', 
        borderRadius: '12px',
        minHeight: '400px'
      }}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default ComfyUIConnectionStatusDemo;
