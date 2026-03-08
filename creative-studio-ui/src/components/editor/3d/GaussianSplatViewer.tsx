import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Splat, Environment, Float, Html, Loader } from '@react-three/drei';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

interface GaussianSplatViewerProps {
  /** URL or local path to the .ply or .splat file */
  url: string;
  /** Width of the container */
  width?: string | number;
  /** Height of the container */
  height?: string | number;
  /** Whether to show a watermark or info overlay */
  showInfo?: boolean;
}

/**
 * High-performance Gaussian Splatting Viewer for StoryCore.
 * Integrates with tttLRM output to provide photorealistic 3D visualization.
 */
export const GaussianSplatViewer: React.FC<GaussianSplatViewerProps> = ({ 
  url, 
  width = '100%', 
  height = '500px',
  showInfo = true 
}) => {
  const [error] = useState<string | null>(null);

  // Auto-prefix local paths if needed
  const normalizedUrl = url.startsWith('http') || url.startsWith('blob') 
    ? url 
    : `sc-file:///${url.replace(/\\/g, '/')}`;

  return (
    <Box 
      sx={{ 
        width, 
        height, 
        position: 'relative', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        bgcolor: '#050505',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}
    >
      <Suspense fallback={
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary">Chargement des Gaussians...</Typography>
        </Box>
      }>
        <Canvas 
          flat 
          dpr={[1, 2]} 
          camera={{ position: [0, 1, 3], fov: 45 }}
          gl={{ antialias: false, stencil: false, depth: true }}
        >
          <color attach="background" args={['#050505']} />
          
          {/* Lighting for standard elements (splats use their own spherical harmonics) */}
          <ambientLight intensity={0.5} />
          <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={50} />
          
          <OrbitControls 
            makeDefault 
            enableDamping 
            dampingFactor={0.05}
            rotateSpeed={0.8}
            zoomSpeed={1.0}
            target={[0, 1, 0]} 
          />

          {/* Integration of Gaussian Splatting */}
          <Suspense fallback={null}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
              <Splat 
                src={normalizedUrl} 
                alphaTest={0.1}
              />
            </Float>
          </Suspense>

          <Environment preset="studio" />
          
          {/* Subtle Grid for orientation */}
          <gridHelper args={[20, 20, '#111', '#0a0a0a']} position={[0, -0.01, 0]} />

          {showInfo && (
            <Html position={[-1.5, 2.5, 0]} center>
              <Paper 
                elevation={6}
                sx={{ 
                  p: 1.5, 
                  bgcolor: 'rgba(0, 0, 0, 0.6)', 
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  minWidth: '180px',
                  pointerEvents: 'none'
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                  ✨ tttLRM Reconstruction
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.65rem' }}>
                  Resolution: 1024px High-Res<br />
                  Format: Gaussian Splatting (3DGS)
                </Typography>
              </Paper>
            </Html>
          )}

          {error && (
            <Html center>
              <Paper sx={{ p: 2, bgcolor: 'error.dark', color: 'white' }}>
                <Typography variant="body2">{error}</Typography>
              </Paper>
            </Html>
          )}
        </Canvas>
      </Suspense>
      <Loader />
    </Box>
  );
};
