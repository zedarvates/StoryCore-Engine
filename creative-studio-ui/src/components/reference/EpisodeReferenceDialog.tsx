/**
 * EpisodeReferenceDialog Component
 * 
 * UI component for managing episode references and continuity.
 * Allows users to reference previous episodes for visual and narrative consistency.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Alert,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import {
  History,
  Link,
  LinkOff,
  Add,
  Delete,
  Search,
  Visibility,
  VisibilityOff,
  Check,
  Close,
  PlaylistAdd,
} from '@mui/icons-material';
import type { PreviousEpisodeReference } from '../../types/reference';

// ============================================================================
// Types
// ============================================================================

interface EpisodeReferenceDialogProps {
  open: boolean;
  onClose: () => void;
  currentProjectId: string;
  currentEpisodeId?: string;
  currentSequenceId?: string;
  onReferenceAdded?: (reference: PreviousEpisodeReference) => void;
  onReferenceRemoved?: (episodeId: string) => void;
}

// ============================================================================
// Mock Types for Storybook
// ============================================================================

interface EpisodeOption {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: Date;
}

interface ShotOption {
  id: string;
  name: string;
  thumbnail?: string;
}

// ============================================================================
// Component
// ============================================================================

export const EpisodeReferenceDialog: React.FC<EpisodeReferenceDialogProps> = ({
  open,
  onClose,
  currentProjectId,
  currentEpisodeId,
  currentSequenceId,
  onReferenceAdded,
  onReferenceRemoved,
}: EpisodeReferenceDialogProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeOption | null>(null);
  const [selectedShots, setSelectedShots] = useState<ShotOption[]>([]);
  const [continuityNotes, setContinuityNotes] = useState('');
  const [autoLinkCharacters, setAutoLinkCharacters] = useState(true);
  const [autoLinkLocations, setAutoLinkLocations] = useState(true);
  const [autoLinkStyle, setAutoLinkStyle] = useState(false);
  
  // Mock existing references
  const [existingReferences, setExistingReferences] = useState<PreviousEpisodeReference[]>([
    {
      episodeId: 'ep_1',
      episodeName: 'Episode 1: The Beginning',
      referenceShotIds: ['shot_10'],
      continuityNotes: ['Character appearance consistent', 'Location matches previous episode'],
    },
    {
      episodeId: 'ep_2',
      episodeName: 'Episode 2: The Journey',
      referenceShotIds: ['shot_3', 'shot_15'],
      continuityNotes: ['Visual style matches', 'Character outfit change explained'],
    },
  ]);

  // Mock episode list
  const episodes: EpisodeOption[] = [
    { id: 'ep_1', name: 'Episode 1: The Beginning', createdAt: new Date('2024-01-01') },
    { id: 'ep_2', name: 'Episode 2: The Journey', createdAt: new Date('2024-01-15') },
    { id: 'ep_3', name: 'Episode 3: The Confrontation', createdAt: new Date('2024-02-01') },
    { id: 'ep_4', name: 'Episode 4: The Resolution', createdAt: new Date('2024-02-15') },
  ];

  // Mock shots for selected episode
  const availableShots: ShotOption[] = [
    { id: 'shot_1', name: 'Opening Scene' },
    { id: 'shot_2', name: 'Character Introduction' },
    { id: 'shot_3', name: 'Conflict Setup' },
    { id: 'shot_4', name: 'Climax' },
    { id: 'shot_5', name: 'Resolution' },
  ];

  const handleAddReference = () => {
    if (!selectedEpisode) return;

    const newReference: PreviousEpisodeReference = {
      episodeId: selectedEpisode.id,
      episodeName: selectedEpisode.name,
      referenceShotIds: selectedShots.map(s => s.id),
      continuityNotes: continuityNotes ? continuityNotes.split('\n').filter(n => n.trim()) : [],
    };

    setExistingReferences([...existingReferences, newReference]);
    onReferenceAdded?.(newReference);
    
    // Reset form
    setSelectedEpisode(null);
    setSelectedShots([]);
    setContinuityNotes('');
    setTabValue(0);
  };

  const handleRemoveReference = (episodeId: string) => {
    setExistingReferences(prev => prev.filter(r => r.episodeId !== episodeId));
    onReferenceRemoved?.(episodeId);
  };

  const filteredEpisodes = episodes.filter(ep =>
    ep.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History color="primary" />
          <Typography variant="h6">Episode References</Typography>
          {existingReferences.length > 0 && (
            <Chip size="small" label={`${existingReferences.length} references`} sx={{ ml: 2 }} />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Add Reference" icon={<Add />} iconPosition="start" />
          <Tab label="Existing References" icon={<Link />} iconPosition="start" />
          <Tab label="Continuity Check" icon={<Check />} iconPosition="start" />
        </Tabs>

        {/* Tab 0: Add Reference */}
        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Reference Previous Episode
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Link to a previous episode to maintain visual and narrative consistency.
              This allows the AI to reference character appearances, locations, and styles.
            </Typography>

            {/* Search and Select Episode */}
            <Autocomplete
              options={filteredEpisodes}
              getOptionLabel={(option) => option.name}
              value={selectedEpisode}
              onChange={(_, newValue) => setSelectedEpisode(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Episode"
                  placeholder="Search episodes..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.createdAt.toLocaleDateString()}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ mb: 3 }}
            />

            {/* Episode Preview */}
            {selectedEpisode && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {selectedEpisode.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select shots from this episode to reference.
                </Typography>
              </Paper>
            )}

            {/* Select Reference Shots */}
            {selectedEpisode && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Reference Shots
                </Typography>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Select Shots to Reference</InputLabel>
                  <Select
                    multiple
                    value={selectedShots.map(s => s.id)}
                    label="Select Shots to Reference"
                    onChange={(e) => {
                      const shotIds = e.target.value as string[];
                      setSelectedShots(availableShots.filter(s => shotIds.includes(s.id)));
                    }}
                    renderValue={(selectedIds) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedIds.map((id) => {
                          const shot = availableShots.find(s => s.id === id);
                          return shot ? (
                            <Chip key={id} label={shot.name} size="small" />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {availableShots.map((shot) => (
                      <MenuItem key={shot.id} value={shot.id}>
                        {shot.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Continuity Notes */}
            <TextField
              fullWidth
              label="Continuity Notes"
              placeholder="Add notes about what should remain consistent..."
              multiline
              rows={3}
              value={continuityNotes}
              onChange={(e) => setContinuityNotes(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* Auto-Link Options */}
            <Typography variant="subtitle2" gutterBottom>
              Auto-Link Options
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  size="small" 
                  icon={autoLinkCharacters ? <Check /> : <Close />} 
                  label="Auto-link Characters" 
                  color={autoLinkCharacters ? "primary" : "default"}
                  onClick={() => setAutoLinkCharacters(!autoLinkCharacters)}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Automatically match character appearances
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  size="small" 
                  icon={autoLinkLocations ? <Check /> : <Close />} 
                  label="Auto-link Locations" 
                  color={autoLinkLocations ? "primary" : "default"}
                  onClick={() => setAutoLinkLocations(!autoLinkLocations)}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Automatically match environment references
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  size="small" 
                  icon={autoLinkStyle ? <Check /> : <Close />} 
                  label="Auto-link Style" 
                  color={autoLinkStyle ? "primary" : "default"}
                  onClick={() => setAutoLinkStyle(!autoLinkStyle)}
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Automatically match visual style
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Existing References */}
        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Existing Episode References
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and manage all episode references linked to this project.
            </Typography>

            {existingReferences.length === 0 ? (
              <Alert severity="info">
                No episode references added yet. Switch to the "Add Reference" tab to link
                a previous episode.
              </Alert>
            ) : (
              <List>
                {existingReferences.map((ref, index) => (
                  <React.Fragment key={ref.episodeId}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveReference(ref.episodeId)}>
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <History />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="bold">{ref.episodeName}</Typography>
                            <Chip 
                              size="small" 
                              label={`${ref.referenceShotIds.length} shots`} 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {ref.continuityNotes.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                {ref.continuityNotes.map((note, i) => (
                                  <Chip key={i} label={note} size="small" variant="outlined" />
                                ))}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < existingReferences.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Tab 2: Continuity Check */}
        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Continuity Analysis
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Check for visual consistency across referenced episodes.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Check color="success" />
                <Typography fontWeight="bold">Character Consistency</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                All referenced episodes maintain consistent character appearances.
                3 characters matched across episodes.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Check color="success" />
                <Typography fontWeight="bold">Location Consistency</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                2 locations referenced across episodes maintain visual consistency.
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Check color="success" />
                <Typography fontWeight="bold">Style Consistency</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Visual style is consistent across all referenced episodes.
                Color palette matches within 85% similarity.
              </Typography>
            </Paper>

            <Alert severity="success">
              Continuity check passed! All referenced elements are consistent.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {tabValue === 0 && (
          <Button
            variant="contained"
            startIcon={<Link />}
            onClick={handleAddReference}
            disabled={!selectedEpisode || selectedShots.length === 0}
          >
            Add Reference
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EpisodeReferenceDialog;
