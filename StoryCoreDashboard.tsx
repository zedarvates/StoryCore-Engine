import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, Info, CheckCircle, AlertCircle, RefreshCw, HardDrive } from 'lucide-react';
import ModelDownloadModal from './ModelDownloadModal';
import { useModelDownload } from './useModelDownload';

interface MissingModel {
  name: string;
  size: string;
  path: string;
}

interface PanelMetrics {
  panel_id: string;
  status: 'ok' | 'auto_fixed' | 'processing';
  sharpness_score: number;
  initial_sharpness?: number;
  improvement_delta?: number;
  autofix_log?: {
    denoising_adjustment: number;
    sharpen_adjustment: number;
    applied_rules: string[];
  };
}

interface ProjectData {
  project_name: string;
  global_seed: number;
  duration_seconds: number;
  genre: string;
  style_anchor: string;
  grid_specification: string;
  qa_score: number;
  panels: PanelMetrics[];
}

interface LLMConfig {
  provider: 'Ollama' | 'OpenAI' | 'OpenRouter' | 'Gemini' | 'Grok';
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout: number;
}

const StoryCoreDashboard: React.FC = () => {
  const [selectedPanel, setSelectedPanel] = useState<string>('panel_01');
  const [denoisingStrength, setDenoisingStrength] = useState(0.35);
  const [sharpenAmount, setSharpenAmount] = useState(1.2);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isModelDownloadOpen, setIsModelDownloadOpen] = useState(false);
  const [modelsAvailable, setModelsAvailable] = useState(false);
  const [missingModels, setMissingModels] = useState<MissingModel[]>([]);
  const [showMissingBanner, setShowMissingBanner] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRepromoting, setIsRepromoting] = useState(false);

  // LLM Configuration state
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'Ollama',
    apiKey: '',
    model: 'gemma3:1b',
    baseUrl: '',
    timeout: 30
  });

  const { checkModelAvailability } = useModelDownload();

  useEffect(() => {
    // Check for missing models on component mount
    setTimeout(checkMissingModels, 2000);

    // Fetch project data from API
    fetchProjectData();

    // Load LLM configuration from localStorage
    loadLLMConfig();
  }, []);

  // Load LLM configuration from localStorage
  const loadLLMConfig = () => {
    try {
      const saved = localStorage.getItem('storycore-llm-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLlmConfig(parsed);
      }
    } catch (error) {
      // Use default config if loading fails
    }
  };

  // Save LLM configuration to localStorage
  const saveLLMConfig = (config: LLMConfig) => {
    try {
      localStorage.setItem('storycore-llm-config', JSON.stringify(config));
    } catch (error) {
      // Handle storage errors gracefully
    }
  };

  // Update LLM config with auto-save
  const updateLLMConfig = (updates: Partial<LLMConfig>) => {
    const newConfig = { ...llmConfig, ...updates };
    setLlmConfig(newConfig);
    saveLLMConfig(newConfig);
  };

  const fetchProjectData = async () => {
    try {
      const response = await fetch('http://localhost:8080/projects/demo-project');
      if (response.ok) {
        const data = await response.json();
        setProjectData(data);
      } else {
        console.warn('Failed to fetch project data from API, using mock data');
      }
    } catch (error) {
      console.warn('API not available, using mock data:', error);
    }
  };

  const checkMissingModels = () => {
    const requiredModels: MissingModel[] = [
      { name: 'flux1-dev.safetensors', size: '11.9 GB', path: './comfyui_portable/ComfyUI/models/checkpoints/' },
      { name: 'ae.safetensors', size: '335 MB', path: './comfyui_portable/ComfyUI/models/vae/' },
      { name: 'clip_l.safetensors', size: '246 MB', path: './comfyui_portable/ComfyUI/models/clip/' },
      { name: 't5xxl_fp16.safetensors', size: '9.45 GB', path: './comfyui_portable/ComfyUI/models/clip/' }
    ];

    // Simulate missing models detection (30% chance for demo)
    const missing = requiredModels.filter(() => Math.random() > 0.7);
    
    if (missing.length > 0) {
      setMissingModels(missing);
      setShowMissingBanner(true);
    }
  };

  const autoFixModels = async () => {
    try {
      // Launch ComfyUI Manager
      const managerUrl = 'http://127.0.0.1:8188/?tab=manager&action=install_models';
      window.open(managerUrl, '_blank');
      
      // Set up refresh callback
      const interval = setInterval(async () => {
        const available = await checkModelsAvailable();
        if (available) {
          clearInterval(interval);
          setShowMissingBanner(false);
          setModelsAvailable(true);
        }
      }, 10000);

      setTimeout(() => clearInterval(interval), 300000);
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
    }
  };

  const checkModelsAvailable = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://127.0.0.1:8188/models/checkpoints');
      const models = await response.json();
      return models.length >= 4;
    } catch {
      return false;
    }
  };

  // Mock data as fallback
  const mockProjectData: ProjectData = {
    project_name: "StoryCore-Engine Demo",
    global_seed: 42,
    duration_seconds: 27,
    genre: "Cinematic Drama",
    style_anchor: "STYLE_CINE_REALISM_V1",
    grid_specification: "3x3",
    qa_score: 4.2,
    panels: [
      {
        panel_id: "panel_01",
        status: "ok",
        sharpness_score: 112.4
      },
      {
        panel_id: "panel_02",
        status: "ok",
        sharpness_score: 98.7
      },
      {
        panel_id: "panel_03",
        status: "processing",
        sharpness_score: 0
      },
      {
        panel_id: "panel_04",
        status: "auto_fixed",
        sharpness_score: 71.8,
        initial_sharpness: 42.3,
        improvement_delta: 29.5,
        autofix_log: {
          denoising_adjustment: -0.05,
          sharpen_adjustment: 0.15,
          applied_rules: ["under_sharpened_correction"]
        }
      },
      {
        panel_id: "panel_05",
        status: "ok",
        sharpness_score: 134.2
      },
      {
        panel_id: "panel_06",
        status: "ok",
        sharpness_score: 89.3
      },
      {
        panel_id: "panel_07",
        status: "processing",
        sharpness_score: 0
      },
      {
        panel_id: "panel_08",
        status: "ok",
        sharpness_score: 156.7
      },
      {
        panel_id: "panel_09",
        status: "ok",
        sharpness_score: 143.1
      }
    ]
  };

  // Use API data if available, otherwise mock data
  const currentProjectData = projectData || mockProjectData;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'auto_fixed':
        return <RefreshCw className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-blue-400 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getQualityTier = (score: number) => {
    if (score >= 150) return "Excellent";
    if (score >= 100) return "Good";
    if (score >= 50) return "Acceptable";
    return "Needs Fix";
  };

  const selectedPanelData = currentProjectData.panels.find((p: PanelMetrics) => p.panel_id === selectedPanel);

  const handleExportProject = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('http://localhost:8080/projects/demo-project/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          output_dir: 'exports'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Project exported successfully!\nExport ID: ${result.export_id}\nLocation: ${result.export_path}`);
      } else {
        alert('Failed to export project');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export project - API not available');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRepromotePanel = async () => {
    try {
      setIsRepromoting(true);
      const response = await fetch(`http://localhost:8080/projects/demo-project/panels/${selectedPanel}/repromote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          denoising_strength: denoisingStrength,
          sharpen_amount: sharpenAmount
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Panel re-promoted successfully!\nNew sharpness: ${result.new_sharpness_score}\nProcessing time: ${result.processing_time_seconds}s`);
        // Refresh project data
        fetchProjectData();
      } else {
        alert('Failed to re-promote panel');
      }
    } catch (error) {
      console.error('Re-promote error:', error);
      alert('Failed to re-promote panel - API not available');
    } finally {
      setIsRepromoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-white">{currentProjectData.project_name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-300">
              <span>Seed: <span className="font-mono text-blue-400">{currentProjectData.global_seed}</span></span>
              <span>QA Score: <span className="font-bold text-green-400">{currentProjectData.qa_score}/5.0</span></span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsModelDownloadOpen(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                modelsAvailable 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>{modelsAvailable ? 'Models Ready' : 'Download Models'}</span>
            </button>
            <button
              onClick={handleExportProject}
              disabled={isExporting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isExporting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Project'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Missing Models Warning Banner */}
      {showMissingBanner && (
        <div className="bg-yellow-900 border border-yellow-600 mx-6 mt-4 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-yellow-200 font-semibold mb-2 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Missing Essential Models
              </h3>
              <div className="text-yellow-100 text-sm mb-3">
                {missingModels.map((model: MissingModel, index: number) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span>❌ {model.name}</span>
                    <span className="text-xs text-yellow-300">{model.size}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={autoFixModels}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Auto-Fix Missing Models (via ComfyUI Manager)</span>
              </button>
            </div>
            <button
              onClick={() => setShowMissingBanner(false)}
              className="text-yellow-400 hover:text-yellow-200 ml-4"
            >
              ✕
            </button>
          </div>
          
          <div className="mt-3">
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="text-yellow-200 text-sm underline hover:text-yellow-100 flex items-center space-x-1"
            >
              <Info className="w-4 h-4" />
              <span>Why are models missing? (Click to expand)</span>
            </button>
            {showInfoPanel && (
              <div className="mt-2 p-3 bg-yellow-800 rounded text-yellow-100 text-sm">
                <p className="mb-2"><strong>Common Reasons:</strong></p>
                <ul className="list-disc list-inside mb-3 space-y-1">
                  <li>Network interruption during download</li>
                  <li>Antivirus software blocking .safetensors files</li>
                  <li>Insufficient disk space (11.4 GB required)</li>
                  <li>ComfyUI not properly configured</li>
                </ul>
                <p className="mb-2"><strong>How Workflow Models Downloader Works:</strong></p>
                <p className="mb-2">Automatically detects missing models from loaded workflows and downloads them directly to the correct ComfyUI directories.</p>
                <a
                  href="https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 underline"
                >
                  📖 View GitHub Repository
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Project Metadata</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span>{currentProjectData.duration_seconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Genre:</span>
                  <span>{currentProjectData.genre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Style Anchor:</span>
                  <span className="font-mono text-xs text-blue-400">{currentProjectData.style_anchor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Grid Spec:</span>
                  <span>{currentProjectData.grid_specification}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Pipeline Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Grid Generation</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Panel Promotion</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Quality Assessment</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-Fix Engine</span>
                  <RefreshCw className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Quality Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mean Sharpness:</span>
                  <span>108.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Panels Auto-Fixed:</span>
                  <span className="text-yellow-400">1/9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="text-green-400">100%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">LLM Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Provider</label>
                  <select
                    value={llmConfig.provider}
                    onChange={(e) => updateLLMConfig({ provider: e.target.value as LLMConfig['provider'] })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Ollama">Ollama</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="OpenRouter">OpenRouter</option>
                    <option value="Gemini">Gemini</option>
                    <option value="Grok">Grok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">API Key</label>
                  <input
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => updateLLMConfig({ apiKey: e.target.value })}
                    placeholder="Enter API key"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Model</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => updateLLMConfig({ model: e.target.value })}
                    placeholder="Model name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {llmConfig.provider === 'Ollama' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Base URL</label>
                    <input
                      type="text"
                      value={llmConfig.baseUrl || 'http://localhost:11434'}
                      onChange={(e) => updateLLMConfig({ baseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Timeout (seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={llmConfig.timeout}
                    onChange={(e) => updateLLMConfig({ timeout: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-8">
            {/* Master Grid View */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Master Coherence Sheet</h2>
                <p className="text-gray-400 text-sm">Visual DNA Locked - 3x3 Grid Anchor</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  {currentProjectData.panels.map((panel: PanelMetrics, index: number) => (
                    <div
                      key={panel.panel_id}
                      className={`aspect-square bg-gray-700 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPanel === panel.panel_id 
                          ? 'border-blue-500 bg-gray-600' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedPanel(panel.panel_id)}
                    >
                      <div className="h-full flex flex-col items-center justify-center p-2">
                        <div className="flex items-center space-x-1 mb-1">
                          {getStatusIcon(panel.status)}
                          <span className="text-xs font-mono">{panel.panel_id.replace('panel_', 'P')}</span>
                        </div>
                        {panel.status !== 'processing' && (
                          <div className="text-xs text-center">
                            <div className="text-gray-300">{panel.sharpness_score.toFixed(1)}</div>
                            <div className="text-gray-500">{getQualityTier(panel.sharpness_score)}</div>
                          </div>
                        )}
                        {panel.status === 'processing' && (
                          <div className="text-xs text-blue-400">Processing...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Panel Promotion Details */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Panel Promotion Details</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Comparison Card */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {selectedPanel.replace('panel_', 'Panel ')} - Promoted Keyframe
                    </h3>
                    {selectedPanelData?.status === 'auto_fixed' && (
                      <div 
                        className="relative"
                        onMouseEnter={() => setShowTooltip(selectedPanel)}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <div className="flex items-center space-x-1 text-yellow-400 cursor-help">
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-sm">AUTO-FIXED</span>
                        </div>
                        
                        {showTooltip === selectedPanel && selectedPanelData?.autofix_log && (
                          <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-600 rounded-lg p-3 text-xs z-10">
                            <div className="font-semibold mb-2">Autofix Applied:</div>
                            <div className="space-y-1 text-gray-300">
                              <div>Denoising: {selectedPanelData.autofix_log.denoising_adjustment > 0 ? '+' : ''}{selectedPanelData.autofix_log.denoising_adjustment}</div>
                              <div>Sharpen: {selectedPanelData.autofix_log.sharpen_adjustment > 0 ? '+' : ''}{selectedPanelData.autofix_log.sharpen_adjustment}</div>
                              <div className="text-yellow-400 mt-2">
                                {selectedPanelData.initial_sharpness?.toFixed(1)} → {selectedPanelData.sharpness_score.toFixed(1)} 
                                ({selectedPanelData.improvement_delta && selectedPanelData.improvement_delta > 0 ? '+' : ''}{selectedPanelData.improvement_delta?.toFixed(1)})
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Before/After Comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Before (Grid Slice)</div>
                      <div className="aspect-video bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">256x256px</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">After (Promoted)</div>
                      <div className="aspect-video bg-gray-700 rounded border-2 border-green-500 flex items-center justify-center">
                        <span className="text-green-400 text-sm">1024x576px</span>
                      </div>
                    </div>
                  </div>

                  {/* QA Badge */}
                  {selectedPanelData && (
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedPanelData.status)}
                        <span className="text-sm">
                          {selectedPanelData.status === 'ok' && 'Quality Check Passed'}
                          {selectedPanelData.status === 'auto_fixed' && 'Auto-Fixed & Improved'}
                          {selectedPanelData.status === 'processing' && 'Processing...'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Sharpness: </span>
                        <span className="font-mono text-green-400">{selectedPanelData.sharpness_score.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Re-Promote Controls */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Manual Re-Promote Controls</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Denoising Strength
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="0.1"
                          max="0.8"
                          step="0.05"
                          value={denoisingStrength}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDenoisingStrength(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="font-mono text-sm w-12 text-right">{denoisingStrength.toFixed(2)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Sharpen Amount
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={sharpenAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSharpenAmount(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="font-mono text-sm w-12 text-right">{sharpenAmount.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                      <button
                        onClick={handleRepromotePanel}
                        disabled={isRepromoting}
                        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          isRepromoting
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{isRepromoting ? 'Re-Promoting...' : 'Manual Re-Promote'}</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        This will override autofix settings and re-process the panel
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Model Download Modal */}
      <ModelDownloadModal
        isOpen={isModelDownloadOpen}
        onClose={() => setIsModelDownloadOpen(false)}
        onModelsAvailable={() => {
          setModelsAvailable(true);
          setIsModelDownloadOpen(false);
        }}
      />
    </div>
  );
};

export default StoryCoreDashboard;