/**
 * Version Control
 * 
 * Manages versions and snapshots of enhanced content.
 * Provides version history, comparison, and restoration capabilities.
 * 
 * Features:
 * - Version history with timestamps
 * - Before/after comparison
 * - Snapshot creation and restoration
 * - Version metadata tracking
 * - Export capabilities
 * 
 * @module VersionControl
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Divider,
  Alert
} from '@mui/material';
import {
  History as HistoryIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Compare as CompareIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

/**
 * Version snapshot
 */
interface Version {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  layers: any[]; // Layer configuration
  thumbnail?: string;
  metadata: {
    totalLayers: number;
    processingTime: number;
    qualityScore?: number;
    fileSize?: number;
  };
  isOriginal?: boolean;
}

/**
 * Props for VersionControl
 */
interface VersionControlProps {
  versions: Version[];
  currentVersionId?: string;
  onCreateVersion: (name: string, description?: string) => Promise<void>;
  onRestoreVersion: (versionId: string) => Promise<void>;
  onDeleteVersion: (versionId: string) => Promise<void>;
  onCompareVersions: (versionId1: string, versionId2: string) => void;
  onExportVersion: (versionId: string) => Promise<void>;
  maxVersions?: number;
}

/**
 * Version Control Component
 */
export const VersionControl: React.FC<VersionControlProps> = ({
  versions,
  currentVersionId,
  onCreateVersion,
  onRestoreVersion,
  onDeleteVersion,
  onCompareVersions,
  onExportVersion,
  maxVersions = 20
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<string | null>(null);
  const [compareVersion2, setCompareVersion2] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handle version creation
   */
  const handleCreateVersion = useCallback(async () => {
    if (!versionName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateVersion(versionName, versionDescription);
      setCreateDialogOpen(false);
      setVersionName('');
      setVersionDescription('');
    } catch (error) {
      console.error('Failed to create version:', error);
    } finally {
      setIsCreating(false);
    }
  }, [versionName, versionDescription, onCreateVersion]);

  /**
   * Handle version restoration
   */
  const handleRestoreVersion = useCallback(async (versionId: string) => {
    try {
      await onRestoreVersion(versionId);
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  }, [onRestoreVersion]);

  /**
   * Handle version deletion
   */
  const handleDeleteVersion = useCallback((versionId: string) => {
    setVersionToDelete(versionId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (versionToDelete) {
      try {
        await onDeleteVersion(versionToDelete);
      } catch (error) {
        console.error('Failed to delete version:', error);
      }
    }
    setDeleteDialogOpen(false);
    setVersionToDelete(null);
  }, [versionToDelete, onDeleteVersion]);

  /**
   * Handle version comparison
   */
  const handleCompare = useCallback(() => {
    if (compareVersion1 && compareVersion2) {
      onCompareVersions(compareVersion1, compareVersion2);
      setCompareDialogOpen(false);
      setCompareVersion1(null);
      setCompareVersion2(null);
    }
  }, [compareVersion1, compareVersion2, onCompareVersions]);

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Sort versions by timestamp (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card elevation={2}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">
              Version History
            </Typography>
            <Chip
              label={`${versions.length}/${maxVersions}`}
              size="small"
              color={versions.length >= maxVersions ? 'warning' : 'default'}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CompareIcon />}
              onClick={() => setCompareDialogOpen(true)}
              disabled={versions.length < 2}
            >
              Compare
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={versions.length >= maxVersions}
            >
              Save Version
            </Button>
          </Stack>
        </Stack>

        {/* Storage Warning */}
        {versions.length >= maxVersions * 0.8 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You're approaching the version limit ({versions.length}/{maxVersions}). 
            Consider deleting old versions.
          </Alert>
        )}

        {/* Version List */}
        {versions.length === 0 ? (
          <Box p={4} textAlign="center" bgcolor="action.hover" borderRadius={1}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No versions saved yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Create your first version to preserve your work
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Save First Version
            </Button>
          </Box>
        ) : (
          <List>
            {sortedVersions.map((version, index) => (
              <React.Fragment key={version.id}>
                <ListItem
                  sx={{
                    bgcolor: currentVersionId === version.id ? 'primary.lighter' : 'transparent',
                    borderRadius: 1,
                    border: 1,
                    borderColor: currentVersionId === version.id ? 'primary.main' : 'divider',
                    mb: 1
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" fontWeight="medium">
                          {version.name}
                        </Typography>
                        {version.isOriginal && (
                          <Chip label="Original" size="small" color="primary" variant="outlined" />
                        )}
                        {currentVersionId === version.id && (
                          <Chip label="Current" size="small" color="success" icon={<CheckIcon />} />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Box mt={1}>
                        {version.description && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {version.description}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={2} mt={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            📅 {formatTimestamp(version.timestamp)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            🎨 {version.metadata.totalLayers} layers
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ⏱️ {(version.metadata.processingTime / 1000).toFixed(1)}s
                          </Typography>
                          {version.metadata.fileSize && (
                            <Typography variant="caption" color="text.secondary">
                              💾 {formatFileSize(version.metadata.fileSize)}
                            </Typography>
                          )}
                          {version.metadata.qualityScore && (
                            <Typography variant="caption" color="text.secondary">
                              ⭐ {(version.metadata.qualityScore * 100).toFixed(0)}%
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      {currentVersionId !== version.id && (
                        <Tooltip title="Restore this version">
                          <IconButton
                            size="small"
                            onClick={() => handleRestoreVersion(version.id)}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Export version">
                        <IconButton
                          size="small"
                          onClick={() => onExportVersion(version.id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      {!version.isOriginal && (
                        <Tooltip title="Delete version">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteVersion(version.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sortedVersions.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Info Footer */}
        <Box mt={2} p={1.5} bgcolor="info.lighter" borderRadius={1}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <InfoIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Versions preserve your entire layer stack and settings. 
              Restore any version to continue working from that point.
            </Typography>
          </Stack>
        </Box>
      </CardContent>

      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save New Version</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Version Name"
            fullWidth
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="e.g., Final Edit, Draft 2, Before Color Grading"
            required
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={versionDescription}
            onChange={(e) => setVersionDescription(e.target.value)}
            placeholder="Add notes about this version..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateVersion}
            variant="contained"
            disabled={!versionName.trim() || isCreating}
          >
            {isCreating ? 'Saving...' : 'Save Version'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Version?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this version? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Version 1
              </Typography>
              <List dense>
                {versions.map((version) => (
                  <ListItemButton
                    key={version.id}
                    selected={compareVersion1 === version.id}
                    onClick={() => setCompareVersion1(version.id)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={version.name}
                      secondary={formatTimestamp(version.timestamp)}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Version 2
              </Typography>
              <List dense>
                {versions.map((version) => (
                  <ListItemButton
                    key={version.id}
                    selected={compareVersion2 === version.id}
                    onClick={() => setCompareVersion2(version.id)}
                    disabled={compareVersion1 === version.id}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={version.name}
                      secondary={formatTimestamp(version.timestamp)}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCompare}
            variant="contained"
            disabled={!compareVersion1 || !compareVersion2}
          >
            Compare
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default VersionControl;
