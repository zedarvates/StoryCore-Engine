/**
 * Magic Mask Tool Component
 * 
 * One-click subject isolation for images and videos.
 * Phase 8: UI Integration
 */

import React, { useState, useRef, useEffect } from 'react';
import './MagicMaskTool.css';

interface MaskType {
  id: string;
  description: string;
}

interface MaskResult {
  success: boolean;
  message: string;
  output_path?: string;
}

interface MagicMaskToolProps {
  inputPath: string;
  outputPath?: string;
  onMaskGenerated?: (result: MaskResult) => void;
  onPreviewMask?: (maskPath: string) => void;
}

const API_BASE = 'http://localhost:8001/api/ai/advanced';

export const MagicMaskTool: React.FC<MagicMaskToolProps> = ({
  inputPath,
  outputPath,
  onMaskGenerated,
  onPreviewMask
}) => {
  const [maskTypes, setMaskTypes] = useState<MaskType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('person');
  const [refineEdges, setRefineEdges] = useState(true);
  const [feather, setFeather] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [, setPreviewUrl] = useState<string | null>(null);
  const [maskResult, setMaskResult] = useState<MaskResult | null>(null);
  const [mode, setMode] = useState<'single' | 'video'>('single');
  const [progress, setProgress] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<'add' | 'subtract'>('add');

  // Fetch mask types on mount
  useEffect(() => {
    fetchMaskTypes();
  }, []);

  const fetchMaskTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/mask/types`);
      const data = await response.json();
      setMaskTypes(data.mask_types);
    } catch (error) {
      console.error('Failed to fetch mask types:', error);
      // Fallback types
      setMaskTypes([
        { id: 'person', description: 'Full person segmentation' },
        { id: 'face', description: 'Face only mask' },
        { id: 'body', description: 'Body silhouette' },
        { id: 'background', description: 'Inverted mask (background only)' }
      ]);
    }
  };

  const generateMask = async () => {
    if (!inputPath) return;

    setIsLoading(true);
    setProgress(0);

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const endpoint = mode === 'single' 
        ? `${API_BASE}/mask/generate`
        : `${API_BASE}/mask/rotoscope`;

      const body = mode === 'single' 
        ? {
            input_path: inputPath,
            output_path: outputPath || inputPath.replace(/\.[^.]+$/, '_mask.png'),
            mask_type: selectedType,
            refine_edges: refineEdges,
            feather
          }
        : {
            video_path: inputPath,
            output_dir: outputPath || './output/masks',
            mask_type: selectedType,
            refine_edges: refineEdges,
            apply_to_video: false
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();
      setMaskResult(result);

      if (result.success && result.output_path) {
        setPreviewUrl(`file://${result.output_path}`);
        onMaskGenerated?.(result);
      }
    } catch (error) {
      console.error('Failed to generate mask:', error);
      setMaskResult({
        success: false,
        message: 'Failed to generate mask'
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Canvas drawing for manual refinement
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    drawOnCanvas(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    drawOnCanvas(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawOnCanvas = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fillStyle = brushMode === 'add' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const invertMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div className="magic-mask-tool">
      <div className="tool-header">
        <h3>🎭 Magic Mask</h3>
        <p className="subtitle">One-click subject isolation</p>
      </div>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >
          🖼️ Image
        </button>
        <button
          className={`mode-btn ${mode === 'video' ? 'active' : ''}`}
          onClick={() => setMode('video')}
        >
          🎬 Video
        </button>
      </div>

      {/* Mask Type Selection */}
      <div className="mask-types">
        <label>Select what to isolate:</label>
        <div className="type-grid">
          {maskTypes.map(type => (
            <button
              key={type.id}
              className={`type-btn ${selectedType === type.id ? 'selected' : ''}`}
              onClick={() => setSelectedType(type.id)}
              title={type.description}
            >
              {type.id === 'person' && '👤'}
              {type.id === 'face' && '😊'}
              {type.id === 'body' && '🧍'}
              {type.id === 'hair' && '💇'}
              {type.id === 'hands' && '✋'}
              {type.id === 'background' && '🏞️'}
              <span>{type.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="mask-settings">
        <div className="setting-row">
          <label>
            <input
              type="checkbox"
              checked={refineEdges}
              onChange={(e) => setRefineEdges(e.target.checked)}
            />
            Refine edges
          </label>
        </div>

        <div className="setting-row">
          <label>Feather: {feather}px</label>
          <input
            type="range"
            min="0"
            max="20"
            value={feather}
            onChange={(e) => setFeather(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="generate-btn"
        onClick={generateMask}
        disabled={isLoading || !inputPath}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Processing... {progress}%
          </>
        ) : (
          <>✨ Generate Mask</>
        )}
      </button>

      {/* Progress Bar */}
      {isLoading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Result Preview */}
      {maskResult && (
        <div className={`result ${maskResult.success ? 'success' : 'error'}`}>
          <span>{maskResult.success ? '✅' : '❌'}</span>
          <span>{maskResult.message}</span>
        </div>
      )}

      {/* Manual Refinement Tools */}
      {maskResult?.success && (
        <div className="refinement-tools">
          <h4>🛠️ Manual Refinement</h4>
          
          <div className="brush-tools">
            <button
              className={`brush-btn ${brushMode === 'add' ? 'active' : ''}`}
              onClick={() => setBrushMode('add')}
            >
              ➕ Add
            </button>
            <button
              className={`brush-btn ${brushMode === 'subtract' ? 'active' : ''}`}
              onClick={() => setBrushMode('subtract')}
            >
              ➖ Subtract
            </button>
          </div>

          <div className="setting-row">
            <label>Brush: {brushSize}px</label>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />
          </div>

          <div className="canvas-actions">
            <button onClick={clearCanvas}>🗑️ Clear</button>
            <button onClick={invertMask}>🔄 Invert</button>
          </div>

          <canvas
            ref={canvasRef}
            className="mask-canvas"
            width={400}
            height={300}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-btn"
          onClick={() => onPreviewMask?.(maskResult?.output_path || '')}
          disabled={!maskResult?.success}
        >
          👁️ Preview
        </button>
        <button 
          className="action-btn"
          disabled={!maskResult?.success}
        >
          💾 Save Mask
        </button>
        <button 
          className="action-btn"
          disabled={!maskResult?.success}
        >
          📋 Copy to Clipboard
        </button>
      </div>
    </div>
  );
};

export default MagicMaskTool;