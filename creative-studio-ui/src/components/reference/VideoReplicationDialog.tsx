/**
 * VideoReplicationDialog
 * UI component for uploading reference videos and configuring replication settings
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Chip,
  FormControlLabel,
  Checkbox,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tab,
  Tabs,
} from '@mui/material';
import {
  CloudUpload,
  VideoFile,
  Analytics,
  Person,
  Settings,
  Delete,
  ExpandMore,
  ExpandLess,
  ContentCut,
  Style,
  Timer,
  HighQuality,
} from '@mui/icons-material';
import { videoReplicationService, ReferenceVideo, ReplicationSettings, ShotInfo } from '../../services/videoReplicationService';

// ============================================================================
// Types
// ============================================================================

interface VideoReplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onReplicationComplete?: (projectId: string) => void;
}

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'analyzing' | 'extracting' | 'complete';
  progress: number;
  message: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// Tab Panel Component
// ============================================================================

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// ============================================================================
// VideoReplicationDialog Component
// ============================================================================

export const VideoReplicationDialog: React.FC<VideoReplicationDialogProps> = ({
  open,
  onClose,
  onReplicationComplete,
}: VideoReplicationDialogProps) => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [referenceVideo, setReferenceVideo] = useState<ReferenceVideo | null>(null);
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  const [settings, setSettings] = useState<ReplicationSettings>({
    preserveTiming: true,
    applyDigitalHuman: false,
    transferComposition: true,
    transferStyle: true,
    styleIntensity: 0.8,
    outputResolution: { width: 1920, height: 1080 },
  });
  const [advancedExpanded, setAdvancedExpanded] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress({ stage: 'idle', progress: 0, message: '' });
    setReferenceVideo(null);
    setSelectedShots([]);
    setSettings({
      preserveTiming: true,
      applyDigitalHuman: false,
      transferComposition: true,
      transferStyle: true,
      styleIntensity: 0.8,
      outputResolution: { width: 1920, height: 1080 },
    });
    setTabValue(0);
  };

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      uploadVideo(file);
    }
  }, []);

  // Upload and analyze video
  const uploadVideo = async (file: File) => {
    try {
      setUploadProgress({
        stage: 'uploading',
        progress: 20,
        message: `Uploading ${file.name}...`,
      });

      const video = await videoReplicationService.uploadReferenceVideo(file);
      
      setUploadProgress({
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing video structure...',
      });

      // Structure is already analyzed in upload
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX

      setUploadProgress({
        stage: 'extracting',
        progress: 75,
        message: 'Extracting keyframes and analyzing subjects...',
      });

      // Keyframes and digital human are already analyzed
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX

      setReferenceVideo(video);
      setSelectedShots(video.structure?.shots.map((s: ShotInfo) => s.id) || []);
      
      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Video analysis complete!',
      });
    } catch (error) {
      console.error('[VideoReplicationDialog] Upload failed:', error);
      setUploadProgress({
        stage: 'idle',
        progress: 0,
        message: 'Upload failed. Please try again.',
      });
      setSelectedFile(null);
    }
  };

  // Toggle shot selection
  const toggleShot = (shotId: string) => {
    setSelectedShots((prev) =>
      prev.includes(shotId)
        ? prev.filter((id) => id !== shotId)
        : [...prev, shotId]
    );
  };

  // Select all shots
  const selectAllShots = () => {
    const allIds = referenceVideo?.structure?.shots.map((s: ShotInfo) => s.id) || [];
    setSelectedShots(allIds);
  };

  // Deselect all shots
  const deselectAllShots = () => {
    setSelectedShots([]);
  };

  // Start replication
  const handleStartReplication = async () => {
    if (!referenceVideo || selectedShots.length === 0) return;

    setIsProcessing(true);
    try {
      const project = await videoReplicationService.createReplicationProject(referenceVideo.id);
      // Note: startReplication method needs to be added to service
      // await videoReplicationService.startReplication(project.id, settings, selectedShots);
      onReplicationComplete?.(project.id);
      onClose();
    } catch (error) {
      console.error('[VideoReplicationDialog] Replication failed:', error);
      setIsProcessing(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get composition label
  const getCompositionLabel = (framing: string): string => {
    const labels: Record<string, string> = {
      'close-up': 'Close-Up',
      'medium': 'Medium Shot',
      'wide': 'Wide Shot',
      'extreme-wide': 'Extreme Wide',
    };
    return labels[framing] || framing;
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle checkbox change
  const handleCheckboxChange = (setting: keyof ReplicationSettings) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.checked;
      setSettings((prev) => ({ ...prev, [setting]: value }));
    };
  };

  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setSettings((prev) => ({ ...prev, styleIntensity: newValue as number }));
  };

  // Handle resolution change
  const handleResolutionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const [width, height] = (event.target.value as string).split('x').map(Number);
    setSettings((prev) => ({ ...prev, outputResolution: { width, height } }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideoFile color="primary" />
          <Typography variant="h6">Video Replication</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Upload" icon={<CloudUpload />} iconPosition="start" />
          <Tab 
            label="Review" 
            icon={<Analytics />} 
            iconPosition="start" 
            disabled={!referenceVideo}
          />
          <Tab 
            label="Settings" 
            icon={<Settings />} 
            iconPosition="start" 
            disabled={!referenceVideo}
          />
        </Tabs>

        {/* Tab 1: Upload */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {!selectedFile ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*"
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<CloudUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ mb: 2 }}
                >
                  Select Video File
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: MP4, MOV, AVI, WebM
                </Typography>
              </>
            ) : (
              <Box>
                {/* Preview */}
                {previewUrl && (
                  <Paper sx={{ mb: 3, overflow: 'hidden' }}>
                    <video
                      src={previewUrl}
                      controls
                      style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                    />
                  </Paper>
                )}

                {/* Upload Progress */}
                {uploadProgress.stage !== 'complete' && (
                  <Box sx={{ mb: 3 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress.progress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {uploadProgress.message}
                    </Typography>
                  </Box>
                )}

                {/* Complete State */}
                {uploadProgress.stage === 'complete' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Video uploaded and analyzed successfully!
                  </Alert>
                )}

                {/* Actions */}
                {uploadProgress.stage === 'complete' && (
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button variant="contained" onClick={() => setTabValue(1)}>
                      Review Analysis
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<Delete />}
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setReferenceVideo(null);
                        setUploadProgress({ stage: 'idle', progress: 0, message: '' });
                      }}
                    >
                      Upload Different Video
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab 2: Review Analysis */}
        <TabPanel value={tabValue} index={1}>
          {referenceVideo && (
            <Grid container spacing={3}>
              {/* Video Info */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Video Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><Timer /></ListItemIcon>
                        <ListItemText 
                          primary="Duration" 
                          secondary={formatDuration(referenceVideo.duration)} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><HighQuality /></ListItemIcon>
                        <ListItemText 
                          primary="Resolution" 
                          secondary={`${referenceVideo.resolution.width}x${referenceVideo.resolution.height}`} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><ContentCut /></ListItemIcon>
                        <ListItemText 
                          primary="Detected Shots" 
                          secondary={referenceVideo.structure?.shots.length || 0} 
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Digital Human Detection */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <Person sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Digital Human Detection
                    </Typography>
                    {referenceVideo.digitalHumanAnalysis?.hasDigitalHuman ? (
                      <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Digital human detected in video
                        </Alert>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Subjects Found" 
                              secondary={referenceVideo.digitalHumanAnalysis.subjects.length} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Style" 
                              secondary={referenceVideo.digitalHumanAnalysis.style} 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Quality Score" 
                              secondary={`${Math.round(referenceVideo.digitalHumanAnalysis.overallQuality * 100)}%`} 
                            />
                          </ListItem>
                        </List>
                      </>
                    ) : (
                      <Alert severity="success">
                        No digital human detected - replication will use standard generation
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Shot List */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Shot Selection
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button size="small" onClick={selectAllShots}>
                        Select All
                      </Button>
                      <Button size="small" onClick={deselectAllShots}>
                        Deselect All
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedShots.length} of {referenceVideo.structure?.shots.length || 0} shots selected
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Shot Details */}
              <Grid size={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Shot Details
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <List>
                    {referenceVideo.structure?.shots.map((shot: ShotInfo, index: number) => (
                      <ListItem
                        key={shot.id}
                        button
                        onClick={() => toggleShot(shot.id)}
                        sx={{ 
                          border: 1,
                          borderColor: selectedShots.includes(shot.id) ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: selectedShots.includes(shot.id) ? 'action.selected' : 'transparent',
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={selectedShots.includes(shot.id)}
                            tabIndex={-1}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Shot ${index + 1}: ${formatDuration(shot.startTime)} - ${formatDuration(shot.endTime)}`}
                          secondary={
                            <Box component="span">
                              <Chip 
                                size="small" 
                                label={getCompositionLabel(shot.composition.framing)}
                                sx={{ mr: 1, mt: 0.5 }}
                              />
                              {shot.cameraMovement && (
                                <Chip 
                                  size="small" 
                                  label={shot.cameraMovement}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {shot.composition.ruleOfThirds && (
                            <Chip size="small" label="Rule of Thirds" variant="outlined" />
                          )}
                          {shot.composition.centerComposition && (
                            <Chip size="small" label="Center" variant="outlined" />
                          )}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>

              {/* Navigation */}
              <Grid size={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setTabValue(0)}>
                    Back to Upload
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={() => setTabValue(2)}
                    disabled={selectedShots.length === 0}
                  >
                    Continue to Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Tab 3: Settings */}
        <TabPanel value={tabValue} index={2}>
          {referenceVideo && (
            <Grid container spacing={3}>
              {/* Timing Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <Timer sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Timing
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={settings.preserveTiming}
                          onChange={handleCheckboxChange('preserveTiming')}
                        />
                      }
                      label="Preserve shot timing from original video"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                      Each shot will maintain its original duration
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Composition Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <HighQuality sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Composition
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={settings.transferComposition}
                          onChange={handleCheckboxChange('transferComposition')}
                        />
                      }
                      label="Transfer shot composition and framing"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                      Replicate camera angles and framing
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Style Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <Style sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Style Transfer
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={settings.transferStyle}
                          onChange={handleCheckboxChange('transferStyle')}
                        />
                      }
                      label="Transfer visual style from video"
                    />
                    {settings.transferStyle && (
                      <Box sx={{ ml: 4, mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Style Intensity: {Math.round(settings.styleIntensity * 100)}%
                        </Typography>
                        <Slider
                          value={settings.styleIntensity}
                          onChange={handleSliderChange}
                          min={0}
                          max={1}
                          step={0.1}
                          marks
                          valueLabelDisplay="auto"
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Digital Human Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <Person sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Digital Human
                    </Typography>
                    {referenceVideo.digitalHumanAnalysis?.hasDigitalHuman ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={settings.applyDigitalHuman}
                            onChange={handleCheckboxChange('applyDigitalHuman')}
                          />
                        }
                        label="Apply Digital Human feature extraction"
                      />
                    ) : (
                      <Alert severity="info">
                        No digital human detected - this option is disabled
                      </Alert>
                    )}
                    {settings.applyDigitalHuman && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                        Extract pose, expression, and clothing features for replication
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Output Resolution */}
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Output Resolution
                    </Typography>
                    <FormControl sx={{ minWidth: 200 }}>
                      <InputLabel>Resolution</InputLabel>
                      <Select
                        value={`${settings.outputResolution.width}x${settings.outputResolution.height}`}
                        label="Resolution"
                        onChange={handleResolutionChange}
                      >
                        <MenuItem value="1920x1080">1920x1080 (Full HD)</MenuItem>
                        <MenuItem value="3840x2160">3840x2160 (4K)</MenuItem>
                        <MenuItem value="1280x720">1280x720 (HD)</MenuItem>
                        <MenuItem value="2560x1440">2560x1440 (2K)</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>

              {/* Advanced Settings */}
              <Grid size={12}>
                <Button
                  onClick={() => setAdvancedExpanded(!advancedExpanded)}
                  endIcon={advancedExpanded ? <ExpandLess /> : <ExpandMore />}
                  sx={{ mb: 2 }}
                >
                  Advanced Settings
                </Button>
                <Collapse in={advancedExpanded}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Advanced configuration options for fine-tuning replication behavior.
                      </Typography>
                    </CardContent>
                  </Card>
                </Collapse>
              </Grid>

              {/* Summary */}
              <Grid size={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{selectedShots.length}</strong> shots will be replicated with the above settings.
                  </Typography>
                </Alert>
              </Grid>

              {/* Navigation */}
              <Grid size={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={() => setTabValue(1)}>
                    Back to Review
                  </Button>
                  <Button 
                    variant="contained" 
                    size="large"
                    onClick={handleStartReplication}
                    disabled={isProcessing || selectedShots.length === 0}
                    startIcon={isProcessing ? <CircularProgress size={20} /> : null}
                  >
                    {isProcessing ? 'Processing...' : 'Start Replication'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoReplicationDialog;
