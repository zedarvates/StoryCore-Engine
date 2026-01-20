import React, { useState } from 'react';
import { ShotFrameViewer, ShotMetadata } from '../components/shot/ShotFrameViewer';

/**
 * Example demonstrating the Shot Frame Viewer component
 * 
 * Features demonstrated:
 * - Editable metadata with real-time validation
 * - Frame-by-frame navigation with arrow keys
 * - In/Out point markers with I/O keyboard shortcuts
 * - Zoom up to 400% for high-quality preview
 * - Frame comparison view (side-by-side and slider modes)
 * - Multiple timecode formats (SMPTE, seconds, frames)
 */
export const ShotFrameViewerExample: React.FC = () => {
  const [shot, setShot] = useState<ShotMetadata>({
    id: 'shot-001',
    name: 'Opening Scene',
    description: 'Wide establishing shot of the city skyline at dawn',
    duration: 5.0,
    startTime: 0,
    endTime: 5.0,
    videoUrl: '/assets/demo/sample-video.mp4', // Replace with actual video URL
    thumbnailUrl: '/assets/demo/sample-thumbnail.jpg',
    frameRate: 30,
    resolution: { width: 1920, height: 1080 },
    position: 0,
    track: 0,
    inPoint: 0,
    outPoint: 150, // 5 seconds at 30fps
    tags: ['establishing', 'exterior', 'dawn'],
    category: 'establishing',
    status: 'ready',
    locked: false,
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
    version: 1
  });

  const [showViewer, setShowViewer] = useState(true);

  const handleUpdate = (updatedShot: ShotMetadata) => {
    setShot(updatedShot);
    console.log('Shot updated:', updatedShot);
  };

  return (
    <div style={{ padding: '24px', background: '#1a1a1a', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '24px' }}>
          Shot Frame Viewer Example
        </h1>

        <div style={{ 
          background: '#2a2a2a', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#aaa'
        }}>
          <h2 style={{ color: '#fff', marginTop: 0 }}>Features</h2>
          <ul>
            <li><strong>Metadata Editing:</strong> All shot metadata is editable with real-time validation</li>
            <li><strong>Frame Navigation:</strong> Use arrow keys (← →) for frame-by-frame navigation</li>
            <li><strong>In/Out Points:</strong> Press 'I' to set in point, 'O' to set out point at current frame</li>
            <li><strong>Zoom:</strong> Ctrl + Mouse Wheel to zoom up to 400% for high-quality preview</li>
            <li><strong>Frame Comparison:</strong> Click "Comparer" to compare two frames side-by-side or with slider</li>
            <li><strong>Timecode Formats:</strong> Switch between SMPTE, seconds, and frames display</li>
            <li><strong>Timeline Markers:</strong> Visual markers show in/out points and current position</li>
            <li><strong>Auto-calculation:</strong> Duration is automatically calculated from in/out points</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '20px' }}>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>←/→:</strong> Navigate frame by frame</li>
            <li><strong>Home:</strong> Jump to in point</li>
            <li><strong>End:</strong> Jump to out point</li>
            <li><strong>I:</strong> Set in point at current frame</li>
            <li><strong>O:</strong> Set out point at current frame</li>
            <li><strong>Ctrl + Wheel:</strong> Zoom in/out</li>
          </ul>
        </div>

        {!showViewer && (
          <button
            onClick={() => setShowViewer(true)}
            style={{
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            Show Shot Frame Viewer
          </button>
        )}

        {showViewer && (
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px',
            overflow: 'hidden',
            height: 'calc(100vh - 400px)',
            minHeight: '600px'
          }}>
            <ShotFrameViewer
              shot={shot}
              onUpdate={handleUpdate}
              onClose={() => setShowViewer(false)}
            />
          </div>
        )}

        <div style={{ 
          marginTop: '24px',
          background: '#2a2a2a',
          padding: '20px',
          borderRadius: '8px',
          color: '#aaa'
        }}>
          <h3 style={{ color: '#fff', marginTop: 0 }}>Current Shot Data</h3>
          <pre style={{ 
            background: '#1a1a1a',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {JSON.stringify(shot, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ShotFrameViewerExample;
