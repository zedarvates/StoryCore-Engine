import React, { useState, useRef, useEffect } from 'react';
import { Move, Crosshair } from 'lucide-react';
import type { SurroundConfig } from '../types';

interface SpatialPositionerProps {
  config: SurroundConfig;
  onChange: (config: SurroundConfig) => void;
}

/**
 * SpatialPositioner - 3D audio positioning interface
 * 
 * Features:
 * - 2D top-down view of audio space
 * - Draggable audio source position
 * - X/Y/Z coordinate inputs
 * - Real-time channel level calculation
 * 
 * Requirements: 20.10
 */
export const SpatialPositioner: React.FC<SpatialPositionerProps> = ({ config, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(
    config.spatialPosition ?? { x: 0, y: 0, z: 0 }
  );

  // Canvas dimensions
  const canvasWidth = 400;
  const canvasHeight = 400;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const radius = 180; // Maximum distance from center

  useEffect(() => {
    drawCanvas();
  }, [position, config.mode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const x = (canvasWidth / 8) * i;
      const y = (canvasHeight / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Draw center crosshair
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();

    // Draw listener position (center)
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw speaker positions based on mode
    drawSpeakers(ctx);

    // Draw audio source position
    const sourceX = centerX + position.x * radius;
    const sourceY = centerY - position.y * radius; // Invert Y for canvas coordinates

    // Draw connection line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(sourceX, sourceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw audio source
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw height indicator
    const heightOpacity = (position.z + 1) / 2; // Map -1 to 1 -> 0 to 1
    ctx.fillStyle = `rgba(59, 130, 246, ${heightOpacity})`;
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Front', centerX, 20);
    ctx.fillText('Back', centerX, canvasHeight - 10);
    ctx.textAlign = 'left';
    ctx.fillText('Left', 10, centerY);
    ctx.textAlign = 'right';
    ctx.fillText('Right', canvasWidth - 10, centerY);
  };

  const drawSpeakers = (ctx: CanvasRenderingContext2D) => {
    const speakerRadius = 10;
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;

    if (config.mode === 'stereo') {
      // Left speaker
      ctx.beginPath();
      ctx.arc(centerX - 100, centerY - 100, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right speaker
      ctx.beginPath();
      ctx.arc(centerX + 100, centerY - 100, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (config.mode === '5.1') {
      // Front Left
      ctx.beginPath();
      ctx.arc(centerX - 120, centerY - 120, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Front Right
      ctx.beginPath();
      ctx.arc(centerX + 120, centerY - 120, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center
      ctx.beginPath();
      ctx.arc(centerX, centerY - 140, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Surround Left
      ctx.beginPath();
      ctx.arc(centerX - 140, centerY + 80, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Surround Right
      ctx.beginPath();
      ctx.arc(centerX + 140, centerY + 80, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (config.mode === '7.1') {
      // Front Left
      ctx.beginPath();
      ctx.arc(centerX - 120, centerY - 120, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Front Right
      ctx.beginPath();
      ctx.arc(centerX + 120, centerY - 120, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center
      ctx.beginPath();
      ctx.arc(centerX, centerY - 140, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Side Left
      ctx.beginPath();
      ctx.arc(centerX - 160, centerY, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Side Right
      ctx.beginPath();
      ctx.arc(centerX + 160, centerY, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Surround Left
      ctx.beginPath();
      ctx.arc(centerX - 140, centerY + 100, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Surround Right
      ctx.beginPath();
      ctx.arc(centerX + 140, centerY + 100, speakerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicking on audio source
    const sourceX = centerX + position.x * radius;
    const sourceY = centerY - position.y * radius;
    const distance = Math.sqrt(
      Math.pow(mouseX - sourceX, 2) + Math.pow(mouseY - sourceY, 2)
    );

    if (distance <= 20) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new position
    let newX = (mouseX - centerX) / radius;
    let newY = -(mouseY - centerY) / radius; // Invert Y

    // Clamp to -1 to 1 range
    newX = Math.max(-1, Math.min(1, newX));
    newY = Math.max(-1, Math.min(1, newY));

    const newPosition = { x: newX, y: newY, z: position.z };
    setPosition(newPosition);

    // Calculate channel levels from position
    const channelLevels = calculateChannelLevels(newPosition, config.mode);

    onChange({
      ...config,
      spatialPosition: newPosition,
      channels: channelLevels,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCoordinateChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);

    // Calculate channel levels from position
    const channelLevels = calculateChannelLevels(newPosition, config.mode);

    onChange({
      ...config,
      spatialPosition: newPosition,
      channels: channelLevels,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Move className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Spatial Positioning</h3>
      </div>

      {/* 2D Top-Down View */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Top-Down View</label>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex justify-center">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-auto cursor-move"
          />
        </div>
        <p className="text-xs text-gray-500 text-center">
          <Crosshair className="w-3 h-3 inline mr-1" />
          Drag the blue circle to position the audio source
        </p>
      </div>

      {/* Coordinate Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="x-coordinate" className="text-sm font-medium text-gray-700">X (Left/Right)</label>
          <input
            id="x-coordinate"
            type="number"
            min="-1"
            max="1"
            step="0.1"
            value={position.x.toFixed(2)}
            onChange={(e) => handleCoordinateChange('x', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500">-1 (Left) to 1 (Right)</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="y-coordinate" className="text-sm font-medium text-gray-700">Y (Front/Back)</label>
          <input
            id="y-coordinate"
            type="number"
            min="-1"
            max="1"
            step="0.1"
            value={position.y.toFixed(2)}
            onChange={(e) => handleCoordinateChange('y', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500">-1 (Back) to 1 (Front)</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="z-coordinate" className="text-sm font-medium text-gray-700">Z (Height)</label>
          <input
            id="z-coordinate"
            type="number"
            min="-1"
            max="1"
            step="0.1"
            value={position.z.toFixed(2)}
            onChange={(e) => handleCoordinateChange('z', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500">-1 (Ground) to 1 (Height)</p>
        </div>
      </div>

      {/* Position Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Quick Positions</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleCoordinateChange('x', 0)}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Center
          </button>
          <button
            onClick={() => {
              setPosition({ x: -0.7, y: 0.7, z: 0 });
              const channelLevels = calculateChannelLevels({ x: -0.7, y: 0.7, z: 0 }, config.mode);
              onChange({ ...config, spatialPosition: { x: -0.7, y: 0.7, z: 0 }, channels: channelLevels });
            }}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Front Left
          </button>
          <button
            onClick={() => {
              setPosition({ x: 0.7, y: 0.7, z: 0 });
              const channelLevels = calculateChannelLevels({ x: 0.7, y: 0.7, z: 0 }, config.mode);
              onChange({ ...config, spatialPosition: { x: 0.7, y: 0.7, z: 0 }, channels: channelLevels });
            }}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Front Right
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Calculate channel levels from 3D position
 * Uses distance-based attenuation and angle-based panning
 */
function calculateChannelLevels(
  position: { x: number; y: number; z: number },
  mode: 'stereo' | '5.1' | '7.1'
): SurroundConfig['channels'] {
  const { x, y, z } = position;

  // Helper function to calculate distance-based gain
  const calculateGain = (speakerX: number, speakerY: number, speakerZ: number = 0): number => {
    const distance = Math.sqrt(
      Math.pow(x - speakerX, 2) + Math.pow(y - speakerY, 2) + Math.pow(z - speakerZ, 2)
    );
    // Inverse square law with minimum distance to avoid division by zero
    const minDistance = 0.1;
    const effectiveDistance = Math.max(distance, minDistance);
    const gain = 1 / (effectiveDistance * effectiveDistance);
    // Normalize to 0-100 range
    return Math.min(100, gain * 25);
  };

  if (mode === 'stereo') {
    // Simple stereo panning
    const leftGain = calculateGain(-1, 1);
    const rightGain = calculateGain(1, 1);
    const total = leftGain + rightGain;

    return {
      left: Math.round((leftGain / total) * 100),
      right: Math.round((rightGain / total) * 100),
    };
  }

  if (mode === '5.1') {
    const frontLeft = calculateGain(-0.7, 1);
    const frontRight = calculateGain(0.7, 1);
    const center = calculateGain(0, 1);
    const surroundLeft = calculateGain(-0.7, -1);
    const surroundRight = calculateGain(0.7, -1);
    const lfe = 80; // LFE is typically constant

    const total = frontLeft + frontRight + center + surroundLeft + surroundRight;

    return {
      frontLeft: Math.round((frontLeft / total) * 100),
      frontRight: Math.round((frontRight / total) * 100),
      center: Math.round((center / total) * 100),
      lfe,
      surroundLeft: Math.round((surroundLeft / total) * 100),
      surroundRight: Math.round((surroundRight / total) * 100),
    };
  }

  // 7.1
  const frontLeft = calculateGain(-0.7, 1);
  const frontRight = calculateGain(0.7, 1);
  const center = calculateGain(0, 1);
  const sideLeft = calculateGain(-1, 0);
  const sideRight = calculateGain(1, 0);
  const surroundLeft = calculateGain(-0.7, -1);
  const surroundRight = calculateGain(0.7, -1);
  const lfe = 80; // LFE is typically constant

  const total =
    frontLeft + frontRight + center + sideLeft + sideRight + surroundLeft + surroundRight;

  return {
    frontLeft: Math.round((frontLeft / total) * 100),
    frontRight: Math.round((frontRight / total) * 100),
    center: Math.round((center / total) * 100),
    lfe,
    sideLeft: Math.round((sideLeft / total) * 100),
    sideRight: Math.round((sideRight / total) * 100),
    surroundLeft: Math.round((surroundLeft / total) * 100),
    surroundRight: Math.round((surroundRight / total) * 100),
  };
}
