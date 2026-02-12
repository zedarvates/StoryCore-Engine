/**
 * ComfyUI Configuration Window Component
 * 
 * ADVANCED MULTI-SERVER CONFIGURATION
 * 
 * This is the comprehensive ComfyUI configuration interface accessible from:
 * Settings > ComfyUI Configuration (top menu)
 * 
 * Features:
 * - Multi-server management (add/edit/delete multiple ComfyUI instances)
 * - Connection testing with detailed error messages
 * - CORS configuration guidance
 * - Workflow assignments per task type
 * - Default server selection
 * 
 * For quick setup with CORS info, users can also use the dashboard page button
 * (Configuration > ComfyUI Settings), which provides basic connection testing
 * and CORS troubleshooting information.
 * 
 * This advanced interface is recommended for:
 * - Managing multiple ComfyUI servers
 * - Assigning specific workflows to different servers
 * - Production environments with complex setups
 */

import { useState, useEffect } from 'react';
import type {
  ComfyUIConfigurationWindowProps,
  ComfyUIConfiguration,
  ComfyUIServer,
  ValidationResult,
} from '../../types/configuration';
import { useComfyUIConfig } from '../../hooks/useConfigurationHooks';
import { validateComfyUIConfiguration } from '../../services/configurationValidator';
import './ComfyUIConfigurationWindow.css';

export function ComfyUIConfigurationWindow({
  isOpen,
  onClose,
  onSave,
}: ComfyUIConfigurationWindowProps) {
  const comfyuiConfig = useComfyUIConfig();

  // Local state for form
  const [formData, setFormData] = useState<ComfyUIConfiguration | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [editingServer, setEditingServer] = useState<ComfyUIServer | null>(null);
  const [showServerForm, setShowServerForm] = useState(false);

  // Initialize form data when config changes
  useEffect(() => {
    if (comfyuiConfig) {
      setFormData(comfyuiConfig);
    }
  }, [comfyuiConfig]);

  if (!isOpen || !formData) return null;

  // Generate unique ID for new servers
  const generateServerId = () => `server_${Date.now()}`;

  // Handle server field changes
  const handleServerFieldChange = (serverId: string, field: string, value: unknown) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newServers = prev.servers.map(server =>
        server.id === serverId ? { ...server, [field]: value } : server
      );
      return { ...prev, servers: newServers };
    });
  };

  // Add new server
  const handleAddServer = () => {
    const newServer: ComfyUIServer = {
      id: generateServerId(),
      name: '',
      serverUrl: '',
      timeout: 60000,
      enableQueueMonitoring: true,
    };
    setEditingServer(newServer);
    setShowServerForm(true);
  };

  // Edit server
  const handleEditServer = (server: ComfyUIServer) => {
    setEditingServer({ ...server });
    setShowServerForm(true);
  };

  // Delete server
  const handleDeleteServer = (serverId: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newServers = prev.servers.filter(server => server.id !== serverId);
      let newDefaultId = prev.defaultServerId;
      if (prev.defaultServerId === serverId && newServers.length > 0) {
        newDefaultId = newServers[0].id;
      }
      return {
        ...prev,
        servers: newServers,
        defaultServerId: newDefaultId,
      };
    });
  };

  // Set default server
  const handleSetDefaultServer = (serverId: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      return { ...prev, defaultServerId: serverId };
    });
  };

  // Test server connection
  const handleTestConnection = async (serverId: string) => {
    const server = formData?.servers.find(s => s.id === serverId);
    if (!server) return;

    setFormData(prev => {
      if (!prev) return prev;
      const newServers = prev.servers.map(s =>
        s.id === serverId
          ? { ...s, status: 'unknown' as const, errorMessage: undefined }
          : s
      );
      return { ...prev, servers: newServers };
    });

    try {
      // Attempt to fetch system stats from ComfyUI server
      const response = await fetch(`${server.serverUrl}/system_stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(server.timeout || 5000),
      });

      if (response.ok) {
        // Connection successful
        setFormData(prev => {
          if (!prev) return prev;
          const newServers = prev.servers.map(s =>
            s.id === serverId
              ? {
                  ...s,
                  status: 'connected' as const,
                  lastTested: new Date(),
                  errorMessage: undefined,
                  availableWorkflows: [
                    'text2img_basic',
                    'text2img_advanced',
                    'img2img_standard',
                    'upscale_4x',
                    'inpainting',
                  ],
                }
              : s
          );
          return { ...prev, servers: newServers };
        });
      } else if (response.status === 403) {
        // CORS error detected
        setFormData(prev => {
          if (!prev) return prev;
          const newServers = prev.servers.map(s =>
            s.id === serverId
              ? {
                  ...s,
                  status: 'disconnected' as const,
                  lastTested: new Date(),
                  errorMessage: 'CORS Error: ComfyUI is blocking cross-origin requests. See warning above for configuration instructions.',
                }
              : s
          );
          return { ...prev, servers: newServers };
        });
      } else {
        // Other HTTP error
        setFormData(prev => {
          if (!prev) return prev;
          const newServers = prev.servers.map(s =>
            s.id === serverId
              ? {
                  ...s,
                  status: 'disconnected' as const,
                  lastTested: new Date(),
                  errorMessage: `HTTP ${response.status}: ${response.statusText}`,
                }
              : s
          );
          return { ...prev, servers: newServers };
        });
      }
    } catch (error: unknown) {
      // Network error or timeout
      let errorMessage = 'Connection failed';
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorMessage = 'Connection timeout - server may be offline or unreachable';
      } else if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
        errorMessage = 'CORS Error: Enable CORS in ComfyUI settings (see warning above)';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setFormData(prev => {
        if (!prev) return prev;
        const newServers = prev.servers.map(s =>
          s.id === serverId
            ? { 
                ...s, 
                status: 'disconnected' as const, 
                lastTested: new Date(),
                errorMessage,
              }
            : s
        );
        return { ...prev, servers: newServers };
      });
    }
  };

  // Handle workflow assignment
  const handleWorkflowChange = (taskType: string, serverId: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workflowAssignments: {
          ...prev.workflowAssignments,
          [taskType]: serverId,
        },
      };
    });
  };

  // Save server from form
  const handleSaveServer = () => {
    if (!editingServer || !formData) return;

    const isNew = !formData.servers.find(s => s.id === editingServer.id);
    const newServers = isNew
      ? [...formData.servers, editingServer]
      : formData.servers.map(server =>
          server.id === editingServer.id ? editingServer : server
        );

    setFormData({ ...formData, servers: newServers });
    setShowServerForm(false);
    setEditingServer(null);
  };

  // Cancel server form
  const handleCancelServerForm = () => {
    setShowServerForm(false);
    setEditingServer(null);
  };

  // Handle save
  const handleSave = async () => {
    // Validate configuration
    const validation = validateComfyUIConfiguration(formData);
    setValidationErrors(validation);
    
    if (!validation.isValid) {
      return;
    }
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save ComfyUI settings:', error);
      alert(`Failed to save: ${error}`);
    }
  };

  // Get field error
  const getFieldError = (field: string): string | null => {
    const error = validationErrors.errors.find(e => e.field === field);
    return error ? error.message : null;
  };

  // Get status indicator
  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'connected': return <span className="status-indicator connected">●</span>;
      case 'disconnected': return <span className="status-indicator disconnected">●</span>;
      default: return <span className="status-indicator unknown">○</span>;
    }
  };

  // Get all available workflows from all servers
  const getAllWorkflows = () => {
    if (!formData) return [];
    const workflowSet = new Set<string>();
    formData.servers.forEach(server => {
      if (server.availableWorkflows) {
        server.availableWorkflows.forEach(workflow => workflowSet.add(workflow));
      }
    });
    return Array.from(workflowSet);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-window comfyui-configuration-window">
        <div className="modal-header">
          <h2>Multi-Server ComfyUI Configuration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* CORS Warning Banner */}
          <div className="cors-warning-banner">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h4>CORS Configuration Required</h4>
              <p>
                ComfyUI blocks cross-origin requests by default. If you see connection errors or 403 responses, 
                you need to enable CORS in your ComfyUI server.
              </p>
              <details>
                <summary>Quick Fix Instructions</summary>
                <div className="cors-instructions">
                  <p><strong>For StabilityMatrix users:</strong></p>
                  <ol>
                    <li>Open StabilityMatrix settings</li>
                    <li>Add launch arguments: <code>--enable-cors-header --cors-header-value=http://localhost:5173</code></li>
                    <li>Restart ComfyUI</li>
                  </ol>
                  
                  <p><strong>For manual installations:</strong></p>
                  <pre>python main.py --enable-cors-header --cors-header-value=http://localhost:5173</pre>
                  
                  <p><strong>For Docker/Portainer (Ubuntu 24):</strong></p>
                  <pre>command: python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header --cors-header-value=http://localhost:5173</pre>
                  
                  <p>
                    <a 
                      href="https://github.com/yourusername/storycore-engine/blob/main/docs/comfyui-instance-troubleshooting.md#cors-cross-origin-errors" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      📖 View complete CORS configuration guide
                    </a>
                  </p>
                </div>
              </details>
            </div>
          </div>

          {/* Server List */}
          <div className="section">
            <div className="section-header">
              <h3>ComfyUI Servers</h3>
              <button className="add-button" onClick={handleAddServer}>+ Add Server</button>
            </div>

            <div className="server-table">
              <div className="table-header">
                <div>Name</div>
                <div>URL</div>
                <div>Status</div>
                <div>Default</div>
                <div>Actions</div>
              </div>
              {formData?.servers.map(server => (
                <div key={server.id} className="table-row-wrapper">
                  <div className="table-row">
                    <div>{server.name}</div>
                    <div>{server.serverUrl}</div>
                    <div>{getStatusIndicator(server.status)}</div>
                    <div>
                      {formData.defaultServerId === server.id && <span>★</span>}
                      {formData.defaultServerId !== server.id && (
                        <button onClick={() => handleSetDefaultServer(server.id)}>Set Default</button>
                      )}
                    </div>
                    <div className="actions">
                      <button onClick={() => handleTestConnection(server.id)} title="Test Connection">▶</button>
                      <button onClick={() => handleEditServer(server)} title="Edit Server">✏</button>
                      <button onClick={() => handleDeleteServer(server.id)} title="Delete Server">×</button>
                    </div>
                  </div>
                  {server.errorMessage && (
                    <div className="server-error-message">
                      <span className="error-icon">⚠️</span>
                      {server.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Assignments */}
          <div className="section">
            <h3>Workflow Assignments</h3>
            <p className="section-description">
              Assign servers to specific workflow tasks. Select "Use Default" to use the default server.
            </p>

            <div className="workflow-assignments">
              {[
                { key: 'text2img', label: 'Text to Image' },
                { key: 'img2img', label: 'Image to Image' },
                { key: 'upscale', label: 'Upscaling' },
                { key: 'inpainting', label: 'Inpainting' },
              ].map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <select
                    value={formData?.workflowAssignments[key] || ''}
                    onChange={e => handleWorkflowChange(key, e.target.value)}
                  >
                    <option value="">Use Default</option>
                    {formData?.servers.map(server => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!validationErrors.isValid && validationErrors.errors.length > 0}
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Server Form Modal */}
      {showServerForm && editingServer && (
        <div className="modal-overlay">
          <div className="modal-window server-form-modal">
            <div className="modal-header">
              <h2>{editingServer.id ? 'Edit' : 'Add'} ComfyUI Server</h2>
              <button className="close-button" onClick={handleCancelServerForm}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Server Name</label>
                <input
                  type="text"
                  value={editingServer.name}
                  onChange={e => setEditingServer({ ...editingServer, name: e.target.value })}
                  placeholder="e.g., Localhost, GPU Server"
                />
              </div>

              <div className="form-group">
                <label>Server URL</label>
                <input
                  type="text"
                  value={editingServer.serverUrl}
                  onChange={e => setEditingServer({ ...editingServer, serverUrl: e.target.value })}
                  placeholder="http://localhost:8188"
                />
              </div>

              <div className="form-group">
                <label>API Key (optional)</label>
                <input
                  type="password"
                  value={editingServer.apiKey || ''}
                  onChange={e => setEditingServer({ ...editingServer, apiKey: e.target.value })}
                  placeholder="Enter API key if required"
                />
              </div>

              <div className="form-group">
                <label>Timeout (ms)</label>
                <input
                  type="number"
                  value={editingServer.timeout}
                  onChange={e => setEditingServer({ ...editingServer, timeout: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingServer.enableQueueMonitoring}
                    onChange={e => setEditingServer({ ...editingServer, enableQueueMonitoring: e.target.checked })}
                  />
                  Enable queue monitoring
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-button" onClick={handleCancelServerForm}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSaveServer}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


