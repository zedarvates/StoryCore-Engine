import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Slider, 
  Stack, 
  Divider, 
  IconButton, 
  Tooltip,
  Alert,
  Fade,
  LinearProgress,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  AutoAwesome, 
  Camera, 
  Settings, 
  Download, 
  History,
  PlayCircleOutline
} from '@mui/icons-material';
import { GaussianSplatViewer } from '../editor/3d/GaussianSplatViewer';

interface TTTLRMToolboxProps {
  /** Optional initial image path */
  initialImagePath?: string;
}

/**
 * AI Reconstruction Toolbox powered by tttLRM.
 * Allows users to convert single images or 360 videos into 3D Gaussian Splats.
 */
export const TTTLRMToolbox: React.FC<TTTLRMToolboxProps> = ({ initialImagePath }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'feedforward' | 'ttt_adapted'>('ttt_adapted');
  const [iterations, setIterations] = useState(50);
  const [resolution, setResolution] = useState(1024);
  const [isConverting, setIsConverting] = useState(false);
  const [meshResult, setMeshResult] = useState<string | null>(null);

  const handleStartReconstruction = async () => {
    setStatus('running');
    setProgress(0);
    setMeshResult(null);
    
    // Fake progress simulation for the UI demo
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      // In real scenario, we would call the actual API created in backend/ttt_lrm_api.py
      const response = await fetch('/api/ttt-lrm/reconstruct/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: initialImagePath || 'mock_input.png',
          mode: mode,
          resolution: resolution,
          num_ttt_iterations: iterations
        })
      });

      if (response.ok) {
        const data = await response.json();
        clearInterval(interval);
        setProgress(100);
        setCurrentResult(data.output_path || 'demo_splat.ply');
        setStatus('complete');
      } else {
        throw new Error('API failed');
      }
    } catch (_error) {
      clearInterval(interval);
      setStatus('error');
    }
  };

  const handleDownload = (path: string) => {
    if (!path) return;
    // In Electron, we might use electronAPI to save. In browser, we use link.
    const link = document.createElement('a');
    link.href = path;
    link.download = path.split('/').pop() || 'reconstruction.ply';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConvertToMesh = async () => {
    if (!currentResult) return;
    
    setIsConverting(true);
    try {
      const outputMeshPath = currentResult.replace('.ply', '.glb');
      const response = await fetch(`/api/ttt-lrm/convert/gs-to-mesh?gs_path=${encodeURIComponent(currentResult)}&output_path=${encodeURIComponent(outputMeshPath)}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeshResult(data.output_path);
      }
    } catch (err) {
      console.error('Mesh conversion failed:', err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Paper 
      elevation={4} 
      sx={{ 
        width: '100%', 
        maxWidth: 1100, 
        mx: 'auto', 
        p: 0, 
        overflow: 'hidden',
        bgcolor: 'rgba(18, 18, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '600px'
      }}
    >
      {/* Left Panel: Controls */}
      <Box sx={{ p: 3, width: { xs: '100%', md: '320px' }, borderRight: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.light', fontWeight: 'bold' }}>
              <AutoAwesome fontSize="small" /> tttLRM Reconstruction
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Génération 3D haute-fidélité via Transformer
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings fontSize="inherit" /> Mode de Reconstruction
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip 
                label="Instant (FF)" 
                onClick={() => setMode('feedforward')}
                color={mode === 'feedforward' ? 'primary' : 'default'}
                variant={mode === 'feedforward' ? 'filled' : 'outlined'}
                size="small"
                sx={{ cursor: 'pointer' }}
              />
              <Chip 
                label="Raffiné (TTT)" 
                onClick={() => setMode('ttt_adapted')}
                color={mode === 'ttt_adapted' ? 'primary' : 'default'}
                variant={mode === 'ttt_adapted' ? 'filled' : 'outlined'}
                size="small"
                sx={{ cursor: 'pointer' }}
              />
            </Stack>
          </Box>

          {mode === 'ttt_adapted' && (
            <Box>
              <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                Itérations TTT <span>{iterations}</span>
              </Typography>
              <Slider 
                value={iterations} 
                min={10} 
                max={200} 
                step={10} 
                onChange={(_, v) => setIterations(v as number)}
                size="small"
              />
            </Box>
          )}

          <Box>
            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              Résolution Cible <span>{resolution}px</span>
            </Typography>
            <Slider 
              value={resolution} 
              min={256} 
              max={1024} 
              step={128} 
              onChange={(_, v) => setResolution(v as number)}
              size="small"
            />
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box>
            <Button 
              fullWidth 
              variant="contained" 
              startIcon={<PlayCircleOutline />}
              onClick={handleStartReconstruction}
              disabled={status === 'running'}
              sx={{ 
                py: 1.5,
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #4A90E2, #9B59B6)',
                '&:hover': { background: 'linear-gradient(45deg, #357ABD, #8E44AD)' }
              }}
            >
              Lancer la Reconstruction
            </Button>
            
            {status === 'running' && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                  Traitement tttLRM : {Math.round(progress)}%
                </Typography>
              </Box>
            )}
          </Box>

          {status === 'complete' && (
            <Fade in>
              <Stack spacing={2}>
                <Alert severity="success" sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)', color: 'success.light', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  Reconstruction réussie à {resolution}px
                </Alert>
                
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={isConverting ? <CircularProgress size={20} color="inherit" /> : <Download />}
                  onClick={meshResult ? () => handleDownload(meshResult) : handleConvertToMesh}
                  disabled={isConverting}
                  sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                >
                  {meshResult ? 'Télécharger Mesh (.glb)' : 'Convertir en Mesh (Export)'}
                </Button>
                
                {meshResult && (
                  <Typography variant="caption" sx={{ color: 'primary.light', textAlign: 'center' }}>
                    Fichier prêt pour Blender :<br/>
                    {meshResult.split('/').pop()}
                  </Typography>
                )}
              </Stack>
            </Fade>
          )}
        </Stack>
      </Box>

      {/* Right Panel: Viewer */}
      <Box sx={{ flexGrow: 1, p: 0, position: 'relative', bgcolor: '#000' }}>
        {currentResult ? (
          <GaussianSplatViewer 
            url={currentResult} 
            height="100%" 
            showInfo={true}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: 'text.secondary', p: 4 }}>
            <Camera sx={{ fontSize: 64, opacity: 0.2 }} />
            <Typography variant="body1" textAlign="center">
              Prêt pour la reconstruction 3D.<br />
              <Typography variant="caption">Branchement natif vers tttLRM (CVPR 2026)</Typography>
            </Typography>
          </Box>
        )}

        {/* Floating Icons */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
          <Tooltip title="Télécharger (.ply)">
            <IconButton 
              onClick={() => currentResult && handleDownload(currentResult)}
              disabled={!currentResult}
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
            >
              <Download fontSize="small" sx={{ color: 'white' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Historique">
            <IconButton sx={{ bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
              <History fontSize="small" sx={{ color: 'white' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};
