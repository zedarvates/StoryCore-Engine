import React, { useState, useEffect } from 'react';
import './AIGenerationPanel.css';
import { generationHistoryService } from '@/services/GenerationHistoryService';
import { promptGenerationService, GrokPromptOptions } from '@/services/PromptGenerationService';
import { generationQueueService, QueuedGenerationTask } from '@/services/GenerationQueueService';
import { HistoryEntry, GeneratedAsset } from '@/types/generation';
import { useEventListener, QueueUpdatedPayload, HistoryUpdatedPayload, WizardEventType } from '@/services/eventEmitter';
import { getComfyUIServersService } from '@/services/comfyuiServersService';
import { ComfyUIServer } from '@/types/comfyuiServers';
import { logger } from '@/utils/logger';
import { notificationService } from '../services/NotificationService';
import { Reorder, AnimatePresence, motion } from 'framer-motion';

interface GenerationParams {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  frames?: number; // For video generation
}

interface JobStatus {
  job_id: string;
  prompt_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  type: 'flux2_image' | 'ltx2_video';
  created_at: number;
  result?: unknown;
  error?: string;
}

interface ComfyUIOutput {
  images?: Array<{
    filename: string;
    subfolder?: string;
    type?: string;
  }>;
}

interface ComfyUIJobResult {
  outputs?: Record<string, ComfyUIOutput>;
}

const AIGenerationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'grok' | 'queue'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [comfyUIUrl, setComfyUIUrl] = useState<string | null>(null);
  const [grokStatus, setGrokStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [queue, setQueue] = useState<QueuedGenerationTask[]>([]);
  const [availableServers, setAvailableServers] = useState<ComfyUIServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // System maintenance states
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedParams, setAdvancedParams] = useState({
    sampler: 'euler',
    scheduler: 'normal',
    vae: 'baked',
    clip_skip: 1,
    denoise: 1.0,
  });

  // Check for configured ComfyUI server on mount
  useEffect(() => {
    const checkComfyUIConfig = async () => {
      const service = getComfyUIServersService();
      const activeServer = service.getActiveServer();
      const allServers = service.getAllServers();
      setAvailableServers(allServers);

      if (activeServer) {
        setComfyUIUrl(activeServer.serverUrl.replace(/\/$/, ''));
        setSelectedServerId(activeServer.id);
      } else {
        setComfyUIUrl(null);
      }
    };

    checkComfyUIConfig();
    
    // Load local initial state
    setHistory(generationHistoryService.getRecentEntries(10));
    setQueue(generationQueueService.getQueue());
  }, []);

  // Listen to queue updates
  useEventListener(WizardEventType.QUEUE_UPDATED, (payload: QueueUpdatedPayload) => {
    if (payload && payload.queue) {
      setQueue(payload.queue as QueuedGenerationTask[]);
    }
  });

  // Listen to history updates
  useEventListener(WizardEventType.HISTORY_UPDATED, (payload: HistoryUpdatedPayload) => {
    if (payload && payload.entries) {
      setHistory(payload.entries.slice(0, 50)); // Show more in history view if updated
    }
  });

  // Image generation parameters
  const [imageParams, setImageParams] = useState<GenerationParams>({
    prompt: "A beautiful mountain landscape with mountains and a lake, cinematic lighting, highly detailed, photorealistic",
    negative_prompt: "blurry, low quality, distorted, ugly, watermark",
    width: 1024,
    height: 1024,
    steps: 20,
    cfg_scale: 3.5,
    seed: -1
  });

  // Video generation parameters
  const [videoParams, setVideoParams] = useState<GenerationParams>({
    prompt: "A camera slowly zooms in on a beautiful mountain landscape as the sun sets, birds fly across the sky, gentle wind moves through the trees, cinematic lighting",
    negative_prompt: "blurry, low quality, distorted, ugly, watermark, static, frozen",
    width: 768,
    height: 512,
    steps: 25,
    cfg_scale: 3.0,
    seed: -1,
    frames: 25
  });

  const [grokParams, setGrokParams] = useState({
    prompt: "",
    model: "grok-3.1-fast",
    aspectRatio: "16:9",
    quality: "high",
    mode: "textToImage",
    duration: "6s",
    concatenation: false,
    outputCount: 1,
    seed: -1,
    // Advanced settings
    negativePrompt: "blurry, low quality, artifacts, text, watermark",
    creativityScale: 0.7,
    resolution: "1080p",
    fps: 30
  });

  const imageParamsRef = React.useRef(imageParams);
  const videoParamsRef = React.useRef(videoParams);

  useEffect(() => {
    imageParamsRef.current = imageParams;
  }, [imageParams]);

  useEffect(() => {
    videoParamsRef.current = videoParams;
  }, [videoParams]);

  // Check job status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Only check job status if ComfyUI is configured
    if (!comfyUIUrl) {
      return;
    }

    if (currentJob && (currentJob.status === 'queued' || currentJob.status === 'running')) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${comfyUIUrl}/job/${currentJob.job_id}`);
          const jobStatus = await response.json();

          setCurrentJob(jobStatus);

          if (jobStatus.status === 'completed') {
            setIsGenerating(false);
            // Extract generated content URLs from result
            const result = jobStatus.result as ComfyUIJobResult;
            if (result?.outputs) {
              const urls: string[] = [];
              const assets: GeneratedAsset[] = [];
              Object.values(result.outputs).forEach((output) => {
                if (output.images) {
                  output.images.forEach((img) => {
                    if (img.filename) {
                      const url = `${comfyUIUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`;
                      urls.push(url);
                      assets.push({
                        id: crypto.randomUUID(),
                        type: currentJob.type === 'flux2_image' ? 'image' : 'video',
                        url: url,
                        timestamp: Date.now(),
                        relatedAssets: [],
                        metadata: { 
                          format: currentJob.type === 'flux2_image' ? 'png' : 'mp4',
                          fileSize: 0,
                          dimensions: { 
                            width: (currentJob.type === 'flux2_image' ? imageParamsRef.current.width : videoParamsRef.current.width),
                            height: (currentJob.type === 'flux2_image' ? imageParamsRef.current.height : videoParamsRef.current.height)
                          },
                          generationParams: (currentJob.type === 'flux2_image' ? imageParamsRef.current : videoParamsRef.current) as unknown as Record<string, unknown>
                        }
                      });
                    }
                  });
                }
              });
              setGeneratedContent(urls);

              // Log to history
              assets.forEach(asset => {
                generationHistoryService.logGeneration(
                  'comfyui-pipeline',
                  currentJob.type === 'flux2_image' ? 'image' : 'video',
                  (currentJob.type === 'flux2_image' ? imageParamsRef.current : videoParamsRef.current) as unknown as Record<string, unknown>,
                  asset
                );
              });
            }
          } else if (jobStatus.status === 'failed') {
            setIsGenerating(false);
            notificationService.error('Échec de la génération', jobStatus.error || 'Erreur inconnue');
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }, 2000); // Check every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentJob, comfyUIUrl]);

  const addToQueue = (type: 'image' | 'video' | 'grok') => {
    let params: Record<string, unknown>;
    
    if (type === 'image') {
      params = { ...imageParams, ...advancedParams };
    } else if (type === 'video') {
      params = { ...videoParams, ...advancedParams };
    } else {
      params = grokParams as unknown as Record<string, unknown>;
    }
    
    const priority = 1; // Default
    
    generationQueueService.addToQueue({
      type: type === 'grok' ? 'image' : type,
      pipelineId: type === 'grok' ? 'grok-pipeline' : 'comfyui-pipeline',
      params: params,
      priority: priority,
      serverId: type !== 'grok' ? selectedServerId : undefined
    });
    
    notificationService.success('File d\'attente', 'Ajouté à la file d\'attente !');
    setActiveTab('queue');
  };

  const reorderQueue = (newOrder: QueuedGenerationTask[]) => {
    // Only allow reordering if nothing is running or if the running task stays at the top
    setQueue(newOrder);
    // Sync with service
    generationQueueService.updateQueueOrder(newOrder);
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    notificationService.info('Presse-papier', 'Prompt copié !');
  };

  const generateImage = async () => {
    if (!comfyUIUrl) {
      notificationService.warning('Configuration requise', 'ComfyUI n\'est pas configuré. Veuillez configurer un serveur dans les réglages.');
      return;
    }

    if (!imageParams.prompt.trim()) {
      notificationService.warning('Prompt manquant', 'Veuillez saisir un prompt pour la génération d\'image.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      const service = getComfyUIServersService();
      const server = service.getServer(selectedServerId);
      const url = server ? server.serverUrl.replace(/\/$/, '') : comfyUIUrl;
      
      const response = await fetch(`${url}/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...imageParams, ...advancedParams }),
      });

      const result = await response.json();

      if (response.ok) {
        setCurrentJob({
          job_id: result.job_id,
          prompt_id: result.prompt_id,
          status: 'queued',
          type: 'flux2_image',
          created_at: Date.now() / 1000
        });
      } else {
        notificationService.error('Erreur API', result.error || 'Erreur lors du lancement de la génération');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error starting image generation:', error);
      notificationService.error('Erreur Connexion', 'Impossible de contacter le serveur ComfyUI. Vérifiez qu\'il est bien lancé.');
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!comfyUIUrl) {
      notificationService.warning('Configuration requise', 'ComfyUI n\'est pas configuré. Veuillez configurer un serveur dans les réglages.');
      return;
    }

    if (!videoParams.prompt.trim()) {
      notificationService.warning('Prompt manquant', 'Veuillez saisir un prompt pour la génération vidéo.');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      const service = getComfyUIServersService();
      const server = service.getServer(selectedServerId);
      const url = server ? server.serverUrl.replace(/\/$/, '') : comfyUIUrl;

      const response = await fetch(`${url}/generate/video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...videoParams, ...advancedParams }),
      });

      const result = await response.json();

      if (response.ok) {
        setCurrentJob({
          job_id: result.job_id,
          prompt_id: result.prompt_id,
          status: 'queued',
          type: 'ltx2_video',
          created_at: Date.now() / 1000
        });
      } else {
        notificationService.error('Erreur API', result.error || 'Erreur lors du lancement de la génération vidéo');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error starting video generation:', error);
      notificationService.error('Erreur Connexion', 'Impossible de contacter le serveur ComfyUI. Vérifiez qu\'il est bien lancé.');
      setIsGenerating(false);
    }
  };

  const generateWithGrok = async () => {
    setIsGenerating(true);
    setGrokStatus('running');
    setGeneratedContent([]);

    try {
      const response = await fetch('/api/addons/grok-imagine/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: {
            description: grokParams.prompt,
            aspect_ratio: grokParams.aspectRatio,
            style: grokParams.quality  // Map quality to style for now
          },
          config_overrides: {
            model: grokParams.model,
            enable_motion: grokParams.mode.includes('Video'),
            duration_seconds: grokParams.duration === '10s' ? 10 : 6,
            concatenation_enabled: grokParams.concatenation,
            output_count_per_prompt: grokParams.outputCount,
            seed: grokParams.seed,
            negative_prompt: grokParams.negativePrompt,
            creativity_scale: grokParams.creativityScale,
            resolution: grokParams.resolution,
            fps: grokParams.fps
          }
        }),
      });

      const startResult = await response.json();

      if (startResult.job_id) {
        const { job_id } = startResult;
        
        // Poll for status with safety timeout
        let completed = false;
        let pollCount = 0;
        const maxPolls = 100; // ~5 minutes with 3s interval

        while (!completed && pollCount < maxPolls) {
          pollCount++;
          const statusResponse = await fetch(`/api/addons/grok-imagine/status/${job_id}`);
          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.status}`);
          }
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            completed = true;
            setGrokStatus('completed');
            
            const result = statusData.result;
            const urls = [];
            if (result.images) urls.push(...result.images);
            if (result.video) urls.unshift(result.video);
            
            setGeneratedContent(urls);

            // Log to history
            urls.forEach(url => {
              generationHistoryService.logGeneration(
                'grok-pipeline',
                url.endsWith('.mp4') ? 'video' : 'image',
                grokParams as unknown as Record<string, unknown>,
                {
                  id: crypto.randomUUID(),
                  type: url.endsWith('.mp4') ? 'video' : 'image',
                  url: url,
                  timestamp: Date.now(),
                  relatedAssets: [],
                  metadata: result.metadata || {
                    format: url.endsWith('.mp4') ? 'mp4' : 'png',
                    generationParams: grokParams
                  }
                }
              );
            });
          } else if (statusData.status === 'failed') {
            completed = true;
            setGrokStatus('failed');
            notificationService.error('Grok Generation Error', statusData.error || 'Unknown error');
          } else {
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        if (pollCount >= maxPolls) {
          setGrokStatus('failed');
          notificationService.error('Grok Generation Timeout', 'La génération a pris trop de temps. Veuillez vérifier l\'historique plus tard.');
        }
      } else {
        setGrokStatus('failed');
        notificationService.error('Erreur Grok', startResult.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Error with Grok generation:', error);
      setGrokStatus('failed');
      notificationService.error('Erreur Connexion', 'Impossible de contacter l\'addon Grok Imagine.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!grokParams.prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const options: GrokPromptOptions = {
        style: (grokParams.quality === 'cinematic' || grokParams.quality === 'realistic') ? grokParams.quality : 'cinematic',
        motion: grokParams.mode.includes('Video')
      };
      const enhanced = await promptGenerationService.generateGrokPrompt(grokParams.prompt, options);
      setGrokParams(prev => ({ ...prev, prompt: enhanced }));
    } catch (error) {
      logger.error('Failed to enhance Grok prompt', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000000);
    if (activeTab === 'image') {
      setImageParams(prev => ({ ...prev, seed: newSeed }));
    } else if (activeTab === 'video') {
      setVideoParams(prev => ({ ...prev, seed: newSeed }));
    } else {
      setGrokParams(prev => ({ ...prev, seed: newSeed }));
    }
  };

  const updateComfyUI = async () => {
    const confirm = window.confirm(
      '🔄 Update ComfyUI Portable\n\n' +
      'This will:\n' +
      '• Download the latest ComfyUI version\n' +
      '• Update Python requirements\n' +
      '• Restart may be required\n\n' +
      'Continue?'
    );

    if (!confirm) return;

    setIsUpdating(true);
    setUpdateStatus('🔄 Starting ComfyUI update...');

    try {
      if (window.electronAPI?.executeCommand) {
        const result = await window.electronAPI.executeCommand({
          command: 'python tools/comfyui_installer/update_comfyui_simple.py',
          shell: true
        });

        if (result.success) {
          setUpdateStatus('✅ ComfyUI updated successfully!');
        } else {
          setUpdateStatus(`❌ Update failed: ${result.error}`);
        }
      } else {
        setUpdateStatus('📋 Please run this command in your terminal:');
        setUpdateStatus(prev => prev + '\n\npython tools/comfyui_installer/update_comfyui_simple.py');
      }
    } catch (error) {
      console.error('Error executing update:', error);
      setUpdateStatus('❌ Error executing update. Check console for details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const restartServices = async () => {
    const confirm = window.confirm(
      '🔄 Restart Services\n\n' +
      'This will restart ComfyUI and the API server.\n' +
      'Any running generations will be interrupted.\n\n' +
      'Continue?'
    );

    if (!confirm) return;

    setIsRestarting(true);
    setUpdateStatus('🔄 Restarting services...');

    try {
      if (window.electronAPI?.executeCommand) {
        // Run restart script - this will likely disconnect the current session
        await window.electronAPI.executeCommand({
          command: 'python start_storycore_complete.py',
          shell: true
        });
        setUpdateStatus('✅ Restart command sent. Services should restart shortly.');
      } else {
        setUpdateStatus('📋 To restart services, run:');
        setUpdateStatus(prev => prev + '\n\npython start_storycore_complete.py');
      }
    } catch (error) {
      console.error('Error executing restart:', error);
      setUpdateStatus('❌ Error executing restart. Check console for details.');
    } finally {
      setIsRestarting(false);
    }
  };

  const exportHistory = () => {
    const fullHistory = generationHistoryService.getAllEntries();
    if (fullHistory.length === 0) {
      notificationService.info('Historique', 'Aucun historique à exporter.');
      return;
    }
    const data = JSON.stringify(fullHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('Exported full generation history');
  };

  const clearHistory = () => {
    if (window.confirm('🗑️ Clear all generation history? This cannot be undone.')) {
      generationHistoryService.clearHistory();
      setHistory([]);
      logger.info('Cleared generation history');
    }
  };


  return (
    <div className="ai-generation-panel">
      <div className="panel-header">
        <h2>🎨 AI Content Generation</h2>
        {!comfyUIUrl && (
          <div className="config-warning">
            ⚠️ ComfyUI not configured. Please configure a ComfyUI server in Settings to use this feature.
          </div>
        )}
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            🖼️ Image (FLUX.2)
          </button>
          <button
            className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            🎬 Video (LTX-2)
          </button>
          <button
            className={`tab-button ${activeTab === 'grok' ? 'active' : ''}`}
            onClick={() => setActiveTab('grok')}
          >
            🤖 Grok Imagine
          </button>
          <button
            className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            ⏳ Queue ({queue.length})
          </button>
          <button
            className={`tab-button history-tab ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            📜 History
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="history-overlay">
          <div className="history-header">
            <h3>Recent Generations</h3>
            <div className="history-actions">
              <button onClick={exportHistory} title="Export history to JSON" className="history-action-btn">📥 Export Log</button>
              <button onClick={clearHistory} title="Clear all history" className="history-action-btn delete">🗑️ Clear</button>
              <button onClick={() => setShowHistory(false)} className="close-btn">✕</button>
            </div>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p>No generations found yet.</p>
            ) : (
              history.map((item: HistoryEntry) => (
                <div key={item.id} className="history-item">
                  <div className="history-preview">
                    {item.type === 'video' ? (
                      <video src={item.result.url} muted height="60" />
                    ) : (
                      <img src={item.result.url} alt="Generation" height="60" />
                    )}
                  </div>
                  <div className="history-details">
                    <span className="history-type">{item.pipelineId === 'grok-pipeline' ? '🤖 Grok' : '🎨 Comfy'}</span>
<p className="history-prompt">{(item.params as Record<string, unknown>).prompt as string || 'No prompt'}</p>
                    <span className="history-date">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <div className="generation-content">
        {activeTab === 'queue' ? (
          <div className="parameter-section queue-section">
            <div className="section-header">
              <h3>Generation Queue</h3>
              {queue.some(t => t.status === 'completed' || t.status === 'failed') && (
                <button 
                  className="clear-queue-btn" 
                  onClick={() => generationQueueService.clearCompletedTasks()}
                >
                  🧹 Clear Finished
                </button>
              )}
            </div>
            <div className="queue-list">
              {queue.length === 0 ? (
                <div className="empty-queue">
                  <span className="empty-icon">⏳</span>
                  <p>Your generation queue is empty.</p>
                  <p className="empty-hint">Add prompts from other tabs to start queuing.</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={queue} onReorder={reorderQueue} className="reorder-group">
                  {queue.map((task) => (
                    <Reorder.Item key={task.id} value={task} className={`queue-item ${task.status === 'running' ? 'processing' : ''} ${task.status === 'failed' ? 'failed' : ''} ${expandedTaskId === task.id ? 'expanded' : ''}`}>
                      <div className="queue-item-content">
                        <div className="queue-item-info" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
                          <div className="queue-item-header">
                            <span className="queue-type">{task.pipelineId === 'grok-pipeline' ? '🤖 GROK' : '🎨 COMFY'}</span>
                            <span className="queue-status" data-status={task.status}>{task.status.toUpperCase()}</span>
                            {task.retryCount && task.retryCount > 0 && (
                              <span className="retry-badge">Retry {task.retryCount}/{task.maxRetries}</span>
                            )}
                          </div>
                          <p className="queue-prompt">{(task.params as Record<string, unknown>).prompt as string}</p>
                          
                          {task.status === 'running' && task.progress && (
                            <div className="queue-progress-container">
                              <div className="queue-progress-bar" style={{ '--progress-width': `${task.progress.overallProgress}%` } as React.CSSProperties}></div>
                              <span className="queue-progress-text">{Math.round(task.progress.overallProgress)}% - {task.progress.stage}</span>
                            </div>
                          )}

                          {task.status === 'failed' && task.error && (
                            <p className="queue-error-msg">❌ {task.error}</p>
                          )}
                        </div>

                        <div className="queue-actions">
                          <button onClick={(e) => { e.stopPropagation(); copyPrompt((task.params as Record<string, unknown>).prompt as string); }} title="Copy Prompt" className="action-btn">📋</button>
                          {task.status === 'failed' && (
                            <button onClick={(e) => { e.stopPropagation(); generationQueueService.retryTask(task.id); }} title="Retry" className="retry-btn action-btn">🔄</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); generationQueueService.removeTask(task.id); }} className="delete-btn action-btn" title="Remove">✕</button>
                          <div className="drag-handle" title="Drag to reorder">⠿</div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedTaskId === task.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="task-details-pane"
                          >
                            <div className="details-grid">
                              <div className="detail-col">
                                <h5>Generation Params</h5>
                                <pre>{JSON.stringify(task.params, null, 2)}</pre>
                              </div>
                              <div className="detail-col">
                                <h5>Task Info</h5>
                                <ul>
                                  <li>ID: <span>{task.id}</span></li>
                                  <li>Pipeline: <span>{task.pipelineId}</span></li>
                                  <li>Created: <span>{new Date(task.createdAt).toLocaleString()}</span></li>
                                  {task.serverId && <li>Server: <span>{task.serverId}</span></li>}
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        ) : activeTab === 'image' ? (
          <>
            <div className="parameter-section">
              <h3>Image Generation Parameters</h3>

<div className="param-group server-selection">
              <label htmlFor="image-server">ComfyUI Server:</label>
              <select 
                id="image-server"
                value={selectedServerId} 
                title="Select ComfyUI server for image generation"
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedServerId(id);
                  const s = availableServers.find(srv => srv.id === id);
                  if (s) setComfyUIUrl(s.serverUrl.replace(/\/$/, ''));
                }}
              >
                {availableServers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>

            <div className="param-group">
              <label htmlFor="image-prompt-textarea" id="image-prompt-label">Prompt:</label>
              <textarea
                id="image-prompt-textarea"
                value={imageParams.prompt}
                onChange={(e) => setImageParams(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe the image you want to generate..."
                rows={3}
                aria-labelledby="image-prompt-label"
              />
            </div>

            <div className="param-group">
              <label htmlFor="image-negative-prompt-textarea" id="image-negative-prompt-label">Negative Prompt:</label>
              <textarea
                id="image-negative-prompt-textarea"
                value={imageParams.negative_prompt}
                onChange={(e) => setImageParams(prev => ({ ...prev, negative_prompt: e.target.value }))}
                placeholder="What to avoid in the image..."
                rows={2}
                aria-labelledby="image-negative-prompt-label"
              />
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="image-width" id="image-width-label">Width:</label>
                <input
                  id="image-width"
                  type="number"
                  value={imageParams.width}
                  onChange={(e) => setImageParams(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                  min="256"
                  max="2048"
                  step="64"
                  aria-labelledby="image-width-label"
                />
              </div>

              <div className="param-group">
                <label htmlFor="image-height" id="image-height-label">Height:</label>
                <input
                  id="image-height"
                  type="number"
                  value={imageParams.height}
                  onChange={(e) => setImageParams(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                  min="256"
                  max="2048"
                  step="64"
                  aria-labelledby="image-height-label"
                />
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="image-steps" id="image-steps-label">Steps:</label>
                <input
                  id="image-steps"
                  type="number"
                  value={imageParams.steps}
                  onChange={(e) => setImageParams(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                  min="10"
                  max="50"
                  aria-labelledby="image-steps-label"
                />
              </div>

              <div className="param-group">
                <label htmlFor="image-cfg-scale" id="image-cfg-scale-label">CFG Scale:</label>
                <input
                  id="image-cfg-scale"
                  type="number"
                  value={imageParams.cfg_scale}
                  onChange={(e) => setImageParams(prev => ({ ...prev, cfg_scale: parseFloat(e.target.value) }))}
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  aria-labelledby="image-cfg-scale-label"
                />
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="image-seed" id="image-seed-label">Seed:</label>
                <input
                  id="image-seed"
                  type="number"
                  value={imageParams.seed}
                  onChange={(e) => setImageParams(prev => ({ ...prev, seed: parseInt(e.target.value) }))}
                  min="-1"
                  aria-labelledby="image-seed-label"
                />
              </div>

              <div className="param-group">
                <button className="randomize-btn" onClick={randomizeSeed}>
                  🎲 Randomize Seed
                </button>
              </div>
            </div>
          </div>



          </>
        ) : activeTab === 'video' ? (
          <div className="parameter-section">
            <h3>Video Generation Parameters</h3>

            <div className="param-group server-selection">
              <label htmlFor="video-server-select">ComfyUI Server:</label>
              <select 
                id="video-server-select"
                value={selectedServerId} 
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedServerId(id);
                  const s = availableServers.find(srv => srv.id === id);
                  if (s) setComfyUIUrl(s.serverUrl.replace(/\/$/, ''));
                }}
              >
                {availableServers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>

            <div className="param-group">
              <label htmlFor="video-prompt-textarea" id="video-prompt-label">Prompt:</label>
              <textarea
                id="video-prompt-textarea"
                value={videoParams.prompt}
                onChange={(e) => setVideoParams(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe the video scene with movement and timing..."
                rows={3}
                aria-labelledby="video-prompt-label"
              />
            </div>

            <div className="param-group">
              <label htmlFor="video-negative-prompt-textarea" id="video-negative-prompt-label">Negative Prompt:</label>
              <textarea
                id="video-negative-prompt-textarea"
                value={videoParams.negative_prompt}
                onChange={(e) => setVideoParams(prev => ({ ...prev, negative_prompt: e.target.value }))}
                placeholder="What to avoid in the video..."
                rows={2}
                aria-labelledby="video-negative-prompt-label"
              />
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="video-width" id="video-width-label">Width:</label>
                <input
                  id="video-width"
                  type="number"
                  value={videoParams.width}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                  min="256"
                  max="1024"
                  step="64"
                  aria-labelledby="video-width-label"
                />
              </div>

              <div className="param-group">
                <label htmlFor="video-height" id="video-height-label">Height:</label>
                <input
                  id="video-height"
                  type="number"
                  value={videoParams.height}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                  min="256"
                  max="1024"
                  step="64"
                  aria-labelledby="video-height-label"
                />
              </div>

              <div className="param-group">
                <label htmlFor="video-frames" id="video-frames-label">Frames:</label>
                <input
                  id="video-frames"
                  type="number"
                  value={videoParams.frames}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, frames: parseInt(e.target.value) }))}
                  min="16"
                  max="49"
                  aria-labelledby="video-frames-label"
                />
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="video-steps" id="video-steps-label">Steps:</label>
                <input
                  id="video-steps"
                  type="number"
                  value={videoParams.steps}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                  min="15"
                  max="50"
                  aria-labelledby="video-steps-label"
                />
              </div>

              <div className="param-group">
                <label htmlFor="video-cfg-scale" id="video-cfg-scale-label">CFG Scale:</label>
                <input
                  id="video-cfg-scale"
                  type="number"
                  value={videoParams.cfg_scale}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, cfg_scale: parseFloat(e.target.value) }))}
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  aria-labelledby="video-cfg-scale-label"
                />
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="video-seed" id="video-seed-label">Seed:</label>
                <input
                  id="video-seed"
                  type="number"
                  value={videoParams.seed}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, seed: parseInt(e.target.value) }))}
                  min="-1"
                  aria-labelledby="video-seed-label"
                />
              </div>

              <div className="param-group">
                <button className="randomize-btn" onClick={randomizeSeed}>
                  🎲 Randomize Seed
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="parameter-section grok-section">
            <h3>Grok Imagine (xAI)</h3>
            
            <div className="param-group">
              <label>Prompt:</label>
              <div className="prompt-container">
                <textarea
                  value={grokParams.prompt}
                  onChange={(e) => setGrokParams(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe your creative vision..."
                  rows={4}
                />
                <button 
                  className="enhance-btn" 
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || !grokParams.prompt.trim()}
                  title="Enhance with AI"
                >
                  ✨ Optimize
                </button>
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="grok-model-select">Model:</label>
                <select 
                  id="grok-model-select"
                  value={grokParams.model} 
                  onChange={(e) => setGrokParams(prev => ({ ...prev, model: e.target.value }))}
                >
                  <option value="grok-3.1-fast">Grok 3.1 Fast</option>
                  <option value="grok-3.1-quality">Grok 3.1 Quality</option>
                  <option value="grok-2-fast">Grok 2 Fast</option>
                  <option value="grok-2-quality">Grok 2 Quality</option>
                </select>
              </div>

              <div className="param-group">
                <label htmlFor="grok-mode-select">Mode:</label>
                <select 
                  id="grok-mode-select"
                  value={grokParams.mode} 
                  onChange={(e) => setGrokParams(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <option value="textToImage">Text to Image</option>
                  <option value="textToVideo">Text to Video</option>
                  <option value="imageToVideo">Frame to Video</option>
                  <option value="imageToImage">Image to Image</option>
                </select>
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="grok-aspect-ratio-select">Aspect Ratio:</label>
                <select 
                  id="grok-aspect-ratio-select"
                  value={grokParams.aspectRatio} 
                  onChange={(e) => setGrokParams(prev => ({ ...prev, aspectRatio: e.target.value }))}
                >
                  <option value="16:9">16:9 (YouTube)</option>
                  <option value="9:16">9:16 (Shorts/Reels)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="2:3">2:3 (Portrait)</option>
                  <option value="3:2">3:2 (Landscape)</option>
                  <option value="21:9">21:9 (Cinematic)</option>
                </select>
              </div>

              <div className="param-group">
                <label htmlFor="grok-quality-select">Quality:</label>
                <select 
                  id="grok-quality-select"
                  value={grokParams.quality} 
                  onChange={(e) => setGrokParams(prev => ({ ...prev, quality: e.target.value }))}
                >
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="high">High Quality</option>
                  <option value="cinematic">Cinematic</option>
                </select>
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label>Duration:</label>
                <div className="radio-group">
                   <label className="radio-label">
                     <input 
                       type="radio" 
                       name="duration" 
                       value="6s" 
                       checked={grokParams.duration === '6s'} 
                       onChange={() => setGrokParams(prev => ({ ...prev, duration: '6s' }))}
                     /> 6s
                   </label>
                   <label className="radio-label">
                     <input 
                       type="radio" 
                       name="duration" 
                       value="10s" 
                       checked={grokParams.duration === '10s'} 
                       onChange={() => setGrokParams(prev => ({ ...prev, duration: '10s' }))}
                     /> 10s
                   </label>
                </div>
              </div>

              <div className="param-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={grokParams.concatenation} 
                    onChange={(e) => setGrokParams(prev => ({ ...prev, concatenation: e.target.checked }))}
                  /> Concat with next prompt
                </label>
              </div>
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="grok-output-count-input">Output Count:</label>
                <input 
                  id="grok-output-count-input"
                  type="number" 
                  min="1" 
                  max="50" 
                  value={grokParams.outputCount} 
                  onChange={(e) => setGrokParams(prev => ({ ...prev, outputCount: parseInt(e.target.value) }))}
                />
              </div>

              <div className="param-group">
                <label htmlFor="grok-seed-input">Seed:</label>
                <div className="seed-input-container">
                  <input 
                    id="grok-seed-input"
                    type="number" 
                    value={grokParams.seed} 
                    onChange={(e) => setGrokParams(prev => ({ ...prev, seed: parseInt(e.target.value) }))}
                  />
                  <button className="randomize-btn" onClick={randomizeSeed}>
                    🎲
                  </button>
                </div>
              </div>
            </div>

            <div className="advanced-settings-wrapper">
              <div className="advanced-settings-toggle">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="toggle-advanced-btn">
                  {showAdvanced ? '🔽 Hide Advanced Settings' : '▶️ Show Advanced Settings'}
                </button>
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="advanced-params-pane"
                  >
                    <div className="param-group">
                      <label htmlFor="grok-negative-prompt">Negative Prompt:</label>
                      <textarea 
                        id="grok-negative-prompt"
                        value={grokParams.negativePrompt}
                        onChange={(e) => setGrokParams(prev => ({ ...prev, negativePrompt: e.target.value }))}
                        rows={2}
                        className="advanced-textarea"
                      />
                    </div>
                    
                    <div className="param-row">
                      <div className="param-group">
                        <label htmlFor="grok-creativity-scale">Creativity Scale ({grokParams.creativityScale}):</label>
                        <input 
                          id="grok-creativity-scale"
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          value={grokParams.creativityScale} 
                          onChange={(e) => setGrokParams(prev => ({ ...prev, creativityScale: parseFloat(e.target.value) }))}
                        />
                      </div>
                      
                      <div className="param-group">
                        <label htmlFor="grok-resolution-select">Resolution:</label>
                        <select 
                          id="grok-resolution-select"
                          value={grokParams.resolution} 
                          onChange={(e) => setGrokParams(prev => ({ ...prev, resolution: e.target.value }))}
                        >
                          <option value="720p">720p</option>
                          <option value="1080p">1080p</option>
                          <option value="4k">4k (Ultra HD)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {(activeTab === 'image' || activeTab === 'video') && (
          <div className="advanced-settings-wrapper">
            <div className="advanced-settings-toggle">
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="toggle-advanced-btn">
                {showAdvanced ? '🔽 Hide Advanced Settings' : '▶️ Show Advanced Settings'}
              </button>
            </div>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="advanced-params-pane"
                >
                  <div className="param-row">
                    <div className="param-group">
                      <label htmlFor="sampler-select">Sampler:</label>
                      <select id="sampler-select" value={advancedParams.sampler} onChange={(e) => setAdvancedParams(p => ({ ...p, sampler: e.target.value }))}>
                        <option value="euler">Euler</option>
                        <option value="euler_ancestral">Euler A</option>
                        <option value="heun">Heun</option>
                        <option value="dpmpp_2m">DPM++ 2M</option>
                        <option value="dpmpp_sde">DPM++ SDE</option>
                        <option value="uni_pc">UniPC</option>
                      </select>
                    </div>
                    <div className="param-group">
                      <label htmlFor="scheduler-select">Scheduler:</label>
                      <select id="scheduler-select" value={advancedParams.scheduler} onChange={(e) => setAdvancedParams(p => ({ ...p, scheduler: e.target.value }))}>
                        <option value="normal">Normal</option>
                        <option value="karras">Karras</option>
                        <option value="exponential">Exponential</option>
                        <option value="simple">Simple</option>
                        <option value="ddim_uniform">DDIM Uniform</option>
                      </select>
                    </div>
                  </div>
                  <div className="param-row">
                    <div className="param-group">
                      <label htmlFor="vae-select">VAE Mode:</label>
                      <select id="vae-select" value={advancedParams.vae} onChange={(e) => setAdvancedParams(p => ({ ...p, vae: e.target.value }))}>
                        <option value="baked">Baked / Default</option>
                        <option value="vae-ft-mse-840000-ema-pruned">FT-MSE (Recommended)</option>
                        <option value="kl-f8-anime2">KL-F8 Anime</option>
                      </select>
                    </div>
                    <div className="param-group">
                      <label htmlFor="clip-skip-input">CLIP Skip:</label>
                      <input id="clip-skip-input" type="number" min="1" max="4" value={advancedParams.clip_skip} onChange={(e) => setAdvancedParams(p => ({ ...p, clip_skip: parseInt(e.target.value) }))} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="generation-controls">
          <div className="control-group">
            <button
              className="generate-btn"
              onClick={activeTab === 'image' ? generateImage : activeTab === 'video' ?  generateVideo : generateWithGrok}
              disabled={isGenerating || (activeTab !== 'grok' && !comfyUIUrl)}
            >
              {isGenerating ? '⏳ Generating...' : (activeTab === 'image' ? '🎨 Generate Now' : activeTab === 'video' ? '🎬 Generate Now' : '🤖 Grok Imagine')}
            </button>
            <button
              className="queue-btn"
              onClick={() => addToQueue(activeTab === 'grok' ? 'grok' : activeTab as 'image' | 'video')}
              disabled={isGenerating || (activeTab !== 'grok' && !comfyUIUrl)}
            >
              ⏳ Add to Queue
            </button>
          </div>
        </div>

        <div className="system-controls">
          <h4>🔧 System Maintenance</h4>
          <div className="control-buttons">
            <button
              className="system-btn update-btn"
              onClick={updateComfyUI}
              disabled={isUpdating}
            >
              {isUpdating ? '⏳ Updating...' : '🔄 Update ComfyUI Portable'}
            </button>
            <button
              className="system-btn restart-btn"
              onClick={restartServices}
              disabled={isRestarting}
            >
              {isRestarting ? '⏳ Restarting...' : '🔄 Restart Services'}
            </button>
          </div>
          {updateStatus && (
            <div className="update-status">
              {updateStatus}
            </div>
          )}
        </div>

        {(currentJob || (activeTab === 'grok' && grokStatus !== 'idle')) && (
          <div className="job-status">
            <h4>Generation Status</h4>
            <div className="status-info">
              <span
                className="status-indicator"
                data-status={currentJob?.status || (activeTab === 'grok' ? grokStatus : 'idle')}
              ></span>
              <span className="status-text">
                {(activeTab === 'grok' ? grokStatus : currentJob?.status || '').toUpperCase()} - {(activeTab === 'grok' ? 'Grok Imagine' : currentJob?.type?.replace('_', ' ') || '').toUpperCase()}
              </span>
            </div>
            {((activeTab === 'grok' ? grokStatus : currentJob?.status) === 'completed') && (
              <div className="completion-notice">
                ✅ Generation completed! Check the results below.
              </div>
            )}
            {((activeTab === 'grok' ? grokStatus : currentJob?.status) === 'failed') && (
              <div className="error-notice">
                ❌ Error: Generation failed. Check console for details.
              </div>
            )}
          </div>
        )}

        {generatedContent.length > 0 && (
          <div className="generated-results">
            <h4>Generated Content</h4>
            <div className="results-grid">
              {generatedContent.map((url, index) => (
                <div key={index} className="result-item">
                  {url.endsWith('.mp4') ? (
                    <video src={url} controls height="300" />
                  ) : (
                    <img src={url} alt={`Generated content ${index}`} height="300" />
                  )}
                  <div className="result-info">
                    {activeTab === 'image' ? 'Generated Image' : 'Generated Video'} #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIGenerationPanel;
