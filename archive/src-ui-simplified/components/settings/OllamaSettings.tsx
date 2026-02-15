import React, { useState, useEffect } from 'react';

interface OllamaSettingsProps {
  onConfigChange: (config: { endpoint: string; model: string }) => void;
  initialConfig?: {
    endpoint?: string;
    model?: string;
  };
}

/**
 * OllamaSettings - Component for configuring Ollama LLM connection
 * Provides UI for setting up local Ollama server connection
 */
export const OllamaSettings: React.FC<OllamaSettingsProps> = ({
  onConfigChange,
  initialConfig = {}
}) => {
  const [endpoint, setEndpoint] = useState(initialConfig.endpoint || 'http://localhost:11434');
  const [model, setModel] = useState(initialConfig.model || 'llama2');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    onConfigChange({ endpoint, model });
  }, [endpoint, model, onConfigChange]);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(`${endpoint}/api/tags`);
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="ollama-settings">
      <div className="ollama-settings-form-group">
        <label className="ollama-settings-label">Ollama Endpoint</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="ollama-settings-input"
          placeholder="http://localhost:11434"
        />
      </div>

      <div className="ollama-settings-form-group">
        <label className="ollama-settings-label">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="ollama-settings-input"
          placeholder="llama2"
        />
      </div>

      <div className="ollama-settings-connection">
        <span className={`ollama-settings-status ${isConnected === null ? '' : isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected === null ? 'Not tested' : isConnected ? 'Connected' : 'Disconnected'}
        </span>
        <button
          className="ollama-settings-button"
          onClick={testConnection}
          disabled={isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
};

export default OllamaSettings;

