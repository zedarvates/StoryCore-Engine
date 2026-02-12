import React, { useState, useEffect } from 'react';
import './AIGenerationPanel.css';

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

const AIGenerationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [comfyUIUrl, setComfyUIUrl] = useState<string | null>(null);

  // System maintenance states
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  // Check for configured ComfyUI server on mount
  useEffect(() => {
    const checkComfyUIConfig = async () => {
      try {
        const { getComfyUIServersService } = await import('@/services/comfyuiServersService');
        const service = getComfyUIServersService();
        const activeServer = service.getActiveServer();
        
        if (activeServer) {
          setComfyUIUrl(activeServer.serverUrl.replace(/\/$/, ''));
        } else {
          setComfyUIUrl(null);
        }
      } catch (error) {
        console.error('[AIGenerationPanel] Failed to check ComfyUI config:', error);
        setComfyUIUrl(null);
      }
    };

    checkComfyUIConfig();
  }, []);

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
            if (jobStatus.result?.outputs) {
              const urls: string[] = [];
              Object.values(jobStatus.result.outputs).forEach((output: unknown) => {
                if (output.images) {
                  output.images.forEach((img: unknown) => {
                    if (img.filename) {
                      urls.push(`${comfyUIUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`);
                    }
                  });
                }
              });
              setGeneratedContent(urls);
            }
          } else if (jobStatus.status === 'failed') {
            setIsGenerating(false);
            alert(`Generation failed: ${jobStatus.error}`);
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

  const generateImage = async () => {
    if (!comfyUIUrl) {
      alert('ComfyUI is not configured. Please configure a ComfyUI server in Settings before generating images.');
      return;
    }

    if (!imageParams.prompt.trim()) {
      alert('Please enter a prompt for image generation');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      const response = await fetch(`${comfyUIUrl}/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageParams),
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
        alert(`Error: ${result.error}`);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error starting image generation:', error);
      alert('Failed to start image generation. Make sure ComfyUI server is running.');
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!comfyUIUrl) {
      alert('ComfyUI is not configured. Please configure a ComfyUI server in Settings before generating videos.');
      return;
    }

    if (!videoParams.prompt.trim()) {
      alert('Please enter a prompt for video generation');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      const response = await fetch(`${comfyUIUrl}/generate/video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoParams),
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
        alert(`Error: ${result.error}`);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error starting video generation:', error);
      alert('Failed to start video generation. Make sure ComfyUI server is running.');
      setIsGenerating(false);
    }
  };

  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000000);
    if (activeTab === 'image') {
      setImageParams(prev => ({ ...prev, seed: newSeed }));
    } else {
      setVideoParams(prev => ({ ...prev, seed: newSeed }));
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
      // Call the update script via a simple approach
      // Since we can't execute Python directly from browser,
      // we'll show instructions to the user
      setUpdateStatus('📋 Please run this command in your terminal:');
      setUpdateStatus(prev => prev + '\n\npython tools/comfyui_installer/update_comfyui_simple.py');

      // Simulate update process (in a real implementation, this would call an API)
      setTimeout(() => {
        setUpdateStatus('✅ Update command prepared!\n\nRun the command shown above in your terminal, then restart the services.');
        setIsUpdating(false);
      }, 2000);

    } catch (error) {
      console.error('Error preparing update:', error);
      setUpdateStatus('❌ Error preparing update. Check console for details.');
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
      // In a real implementation, this would call an API endpoint
      // For now, we'll show instructions
      setUpdateStatus('📋 To restart services, run:');
      setUpdateStatus(prev => prev + '\n\npython start_storycore_complete.py');

      setTimeout(() => {
        setUpdateStatus('✅ Restart command prepared!\n\nRun the command shown above in your terminal.');
        setIsRestarting(false);
      }, 2000);

    } catch (error) {
      console.error('Error preparing restart:', error);
      setUpdateStatus('❌ Error preparing restart. Check console for details.');
      setIsRestarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return '#ff9800';
      case 'running': return '#2196f3';
      case 'completed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  return (
    <div className="ai-generation-panel">
      <div className="panel-header">
        <h2>🎨 AI Content Generation</h2>
        {!comfyUIUrl && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#ff9800',
            color: 'white',
            borderRadius: '4px',
            fontSize: '14px',
            marginTop: '8px'
          }}>
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
        </div>
      </div>

      <div className="generation-content">
        {activeTab === 'image' ? (
          <div className="parameter-section">
            <h3>Image Generation Parameters</h3>

            <div className="param-group">
              <label>Prompt:</label>
              <textarea
                value={imageParams.prompt}
                onChange={(e) => setImageParams(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe the image you want to generate..."
                rows={3}
              />
            </div>

            <div className="param-group">
              <label>Negative Prompt:</label>
              <textarea
                value={imageParams.negative_prompt}
                onChange={(e) => setImageParams(prev => ({ ...prev, negative_prompt: e.target.value }))}
                placeholder="What to avoid in the image..."
                rows={2}
              />
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="image-width">Width:</label>
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
                <label htmlFor="image-height">Height:</label>
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
                <label htmlFor="image-steps">Steps:</label>
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
                <label htmlFor="image-cfg-scale">CFG Scale:</label>
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
                <label htmlFor="image-seed">Seed:</label>
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
        ) : (
          <div className="parameter-section">
            <h3>Video Generation Parameters</h3>

            <div className="param-group">
              <label>Prompt:</label>
              <textarea
                value={videoParams.prompt}
                onChange={(e) => setVideoParams(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe the video scene with movement and timing..."
                rows={3}
              />
            </div>

            <div className="param-group">
              <label>Negative Prompt:</label>
              <textarea
                value={videoParams.negative_prompt}
                onChange={(e) => setVideoParams(prev => ({ ...prev, negative_prompt: e.target.value }))}
                placeholder="What to avoid in the video..."
                rows={2}
              />
            </div>

            <div className="param-row">
              <div className="param-group">
                <label htmlFor="video-width">Width:</label>
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
                <label htmlFor="video-height">Height:</label>
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
                <label htmlFor="video-frames">Frames:</label>
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
                <label htmlFor="video-steps">Steps:</label>
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
                <label htmlFor="video-cfg-scale">CFG Scale:</label>
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
                <label htmlFor="video-seed">Seed:</label>
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
        )}

        <div className="generation-controls">
          <button
            className="generate-btn"
            onClick={activeTab === 'image' ? generateImage : generateVideo}
            disabled={isGenerating || !comfyUIUrl}
          >
            {isGenerating ? '⏳ Generating...' : (activeTab === 'image' ? '🎨 Generate Image' : '🎬 Generate Video')}
          </button>
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

        {currentJob && (
          <div className="job-status">
            <h4>Generation Status</h4>
            <div className="status-info">
              <span
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(currentJob.status) }}
              ></span>
              <span className="status-text">
                {currentJob.status.toUpperCase()} - {currentJob.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            {currentJob.status === 'completed' && (
              <div className="completion-notice">
                ✅ Generation completed! Check the results below.
              </div>
            )}
            {currentJob.status === 'failed' && currentJob.error && (
              <div className="error-notice">
                ❌ Error: {currentJob.error}
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
                  {activeTab === 'image' ? (
                    <img
                      src={url}
                      alt={`Generated ${activeTab} ${index + 1}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.textContent = 'Image failed to load';
                      }}
                    />
                  ) : (
                    <video
                      controls
                      src={url}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.textContent = 'Video failed to load';
                      }}
                    />
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


