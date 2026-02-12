/**
 * ReferenceSheetManager
 * UI component for managing master reference sheets, character appearances, and location appearances
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Alert,
  Dialog as ConfirmDialog,
} from '@mui/material';
import {
  Add,
  Delete,
  Image,
  Person,
  LocationOn,
  Style,
  PhotoCamera,
  Palette,
  LightMode,
  CameraAlt,
} from '@mui/icons-material';
import { 
  referenceSheetService, 
} from '../../services/referenceSheetService';
import type { 
  MasterReferenceSheet, 
  CharacterAppearanceSheet, 
  LocationAppearanceSheet,
  GlobalStyleSheet,
  ReferenceImage,
  AppearanceImage,
} from '../../types/reference';

// ============================================================================
// Types
// ============================================================================

interface ReferenceSheetManagerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectPath?: string;
  onSheetUpdate?: (sheetId: string) => void;
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
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

// ============================================================================
// ReferenceSheetManager Component
// ============================================================================

export const ReferenceSheetManager: React.FC<ReferenceSheetManagerProps> = ({
  open,
  onClose,
  projectId,
  projectPath = '',
  onSheetUpdate,
}: ReferenceSheetManagerProps) => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [masterSheet, setMasterSheet] = useState<MasterReferenceSheet | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterAppearanceSheet | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationAppearanceSheet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: string; id: string }>({
    open: false,
    type: '',
    id: '',
  });
  const [loading, setLoading] = useState(false);

  // Initialize service and load master sheet
  useEffect(() => {
    if (open && projectId) {
      loadMasterSheet();
    }
  }, [open, projectId, projectPath]);

  const loadMasterSheet = async () => {
    setLoading(true);
    try {
      // Initialize the service with project path
      if (projectPath) {
        await referenceSheetService.initialize(projectPath);
      }

      // Try to get existing or create new
      let sheet = await referenceSheetService.getMasterReferenceSheet(projectId);
      
      if (!sheet) {
        sheet = await referenceSheetService.createMasterReferenceSheet(projectId);
      }
      
      setMasterSheet(sheet);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to load master sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Add character appearance
  const handleAddCharacter = async () => {
    if (!masterSheet) return;
    setLoading(true);
    try {
      const newCharacter: CharacterAppearanceSheet = {
        id: `char_${Date.now()}`,
        characterId: `char_def_${Date.now()}`,
        characterName: 'New Character',
        appearanceImages: [],
        styleGuidelines: [],
        colorPalette: [],
        proportions: 'anime standard',
      };
      
      await referenceSheetService.addCharacterAppearance(masterSheet.id, newCharacter);
      await loadMasterSheet();
      setSelectedCharacter(newCharacter);
      onSheetUpdate?.(newCharacter.id);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to add character:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add location appearance
  const handleAddLocation = async () => {
    if (!masterSheet) return;
    setLoading(true);
    try {
      const newLocation: LocationAppearanceSheet = {
        id: `loc_${Date.now()}`,
        locationId: `loc_def_${Date.now()}`,
        locationName: 'New Location',
        referenceImages: [],
        environmentalGuidelines: [],
      };
      
      await referenceSheetService.addLocationAppearance(masterSheet.id, newLocation);
      await loadMasterSheet();
      setSelectedLocation(newLocation);
      onSheetUpdate?.(newLocation.id);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to add location:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update character
  const handleUpdateCharacter = async (character: CharacterAppearanceSheet) => {
    if (!masterSheet) return;
    try {
      await referenceSheetService.updateCharacterAppearance(masterSheet.id, character);
      await loadMasterSheet();
      onSheetUpdate?.(character.id);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to update character:', error);
    }
  };

  // Update location
  const handleUpdateLocation = async (location: LocationAppearanceSheet) => {
    if (!masterSheet) return;
    try {
      await referenceSheetService.updateLocationAppearance(masterSheet.id, location);
      await loadMasterSheet();
      onSheetUpdate?.(location.id);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to update location:', error);
    }
  };

  // Delete character
  const handleDeleteCharacter = async (characterId: string) => {
    if (!masterSheet) return;
    try {
      await referenceSheetService.removeCharacterAppearance(masterSheet.id, characterId);
      await loadMasterSheet();
      setSelectedCharacter(null);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to delete character:', error);
    }
  };

  // Delete location
  const handleDeleteLocation = async (locationId: string) => {
    if (!masterSheet) return;
    try {
      await referenceSheetService.removeLocationAppearance(masterSheet.id, locationId);
      await loadMasterSheet();
      setSelectedLocation(null);
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to delete location:', error);
    }
  };

  // Update style
  const handleUpdateStyle = async (style: Partial<GlobalStyleSheet>) => {
    if (!masterSheet) return;
    try {
      await referenceSheetService.updateGlobalStyle(masterSheet.id, {
        ...masterSheet.styleSheet,
        ...style,
      });
      await loadMasterSheet();
    } catch (error) {
      console.error('[ReferenceSheetManager] Failed to update style:', error);
    }
  };

  // Add reference image to character
  const handleAddCharacterImage = async () => {
    if (!selectedCharacter) return;
    const url = prompt('Enter image URL:');
    if (url) {
      const newImage: AppearanceImage = {
        id: `img_${Date.now()}`,
        url,
        viewType: 'portrait',
        description: '',
      };
      await handleUpdateCharacter({
        ...selectedCharacter,
        appearanceImages: [...selectedCharacter.appearanceImages, newImage],
      });
    }
  };

  // Add reference image to location
  const handleAddLocationImage = async () => {
    if (!selectedLocation) return;
    const url = prompt('Enter image URL:');
    if (url) {
      const newImage: ReferenceImage = {
        id: `img_${Date.now()}`,
        url,
        weight: 0.8,
        source: 'environment',
      };
      await handleUpdateLocation({
        ...selectedLocation,
        referenceImages: [...selectedLocation.referenceImages, newImage],
      });
    }
  };

  // Handle art style change
  const handleArtStyleChange = (event: SelectChangeEvent<string>) => {
    handleUpdateStyle({ artStyle: event.target.value });
  };

  // Handle lighting style change
  const handleLightingStyleChange = (event: SelectChangeEvent<string>) => {
    handleUpdateStyle({ lightingStyle: event.target.value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Style color="primary" />
          <Typography variant="h6">Reference Sheet Manager</Typography>
          {masterSheet && (
            <Chip 
              size="small" 
              label={`${masterSheet.characterSheets.length} Characters • ${masterSheet.locationSheets.length} Locations`}
              sx={{ ml: 2 }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && !masterSheet ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">Loading reference sheets...</Typography>
          </Box>
        ) : !masterSheet ? (
          <Alert severity="error">Failed to load master sheet</Alert>
        ) : (
          <>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Characters" icon={<Person />} iconPosition="start" />
              <Tab label="Locations" icon={<LocationOn />} iconPosition="start" />
              <Tab label="Style" icon={<Palette />} iconPosition="start" />
              <Tab label="Overview" icon={<Style />} iconPosition="start" />
            </Tabs>

            {/* Tab 1: Characters */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Character Appearances
                    </Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddCharacter}>
                      Add
                    </Button>
                  </Box>
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {masterSheet.characterSheets.map((character) => (
                      <ListItemButton
                        key={character.id}
                        selected={selectedCharacter?.id === character.id}
                        onClick={() => setSelectedCharacter(character)}
                        sx={{ 
                          border: 1,
                          borderColor: selectedCharacter?.id === character.id ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {character.characterName.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={character.characterName}
                          secondary={`${character.appearanceImages.length} images`}
                        />
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, type: 'character', id: character.id });
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  {selectedCharacter ? (
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Edit Character
                        </Typography>
                        
                        <TextField
                          fullWidth
                          label="Character Name"
                          value={selectedCharacter.characterName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateCharacter({
                            ...selectedCharacter,
                            characterName: e.target.value,
                          })}
                          sx={{ mb: 2 }}
                        />

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Style Guidelines
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {selectedCharacter.styleGuidelines.map((guideline: string, index: number) => (
                            <Chip
                              key={index}
                              label={guideline}
                              onDelete={() => {
                                const newGuidelines = selectedCharacter.styleGuidelines.filter(
                                  (_: string, i: number) => i !== index
                                );
                                handleUpdateCharacter({
                                  ...selectedCharacter,
                                  styleGuidelines: newGuidelines,
                                });
                              }}
                            />
                          ))}
                          <Chip label="+ Add" onClick={() => {
                            const guideline = prompt('Enter style guideline:');
                            if (guideline) {
                              handleUpdateCharacter({
                                ...selectedCharacter,
                                styleGuidelines: [...selectedCharacter.styleGuidelines, guideline],
                              });
                            }
                          }} />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Color Palette
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          {selectedCharacter.colorPalette.map((color: string, index: number) => (
                            <Box
                              key={index}
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: color,
                                borderRadius: 1,
                                border: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                const newPalette = selectedCharacter.colorPalette.filter(
                                  (_: string, i: number) => i !== index
                                );
                                handleUpdateCharacter({
                                  ...selectedCharacter,
                                  colorPalette: newPalette,
                                });
                              }}
                            />
                          ))}
                          <Chip label="+ Add Color" onClick={() => {
                            const color = prompt('Enter color hex (e.g., #FF6B6B):');
                            if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
                              handleUpdateCharacter({
                                ...selectedCharacter,
                                colorPalette: [...selectedCharacter.colorPalette, color],
                              });
                            }
                          }} />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Appearance Images ({selectedCharacter.appearanceImages.length})
                        </Typography>
                        <Grid container spacing={1}>
                          {selectedCharacter.appearanceImages.map((image: AppearanceImage) => (
                            <Grid size={{ xs: 4 }} key={image.id}>
                              <Card>
                                <CardMedia
                                  component="img"
                                  height={100}
                                  image={image.url}
                                  sx={{ objectFit: 'cover' }}
                                />
                              </Card>
                            </Grid>
                          ))}
                          <Grid size={{ xs: 4 }}>
                            <Card sx={{ 
                              height: 100, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: 2,
                              borderStyle: 'dashed',
                              borderColor: 'divider',
                              cursor: 'pointer',
                            }}
                            onClick={handleAddCharacterImage}
                            >
                              <PhotoCamera color="action" />
                            </Card>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="info">
                      Select a character to edit or add a new one
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 2: Locations */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Location Appearances
                    </Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddLocation}>
                      Add
                    </Button>
                  </Box>
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {masterSheet.locationSheets.map((location) => (
                      <ListItemButton
                        key={location.id}
                        selected={selectedLocation?.id === location.id}
                        onClick={() => setSelectedLocation(location)}
                        sx={{ 
                          border: 1,
                          borderColor: selectedLocation?.id === location.id ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <LocationOn />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={location.locationName}
                          secondary={`${location.referenceImages.length} images`}
                        />
                        <IconButton
                          size="small"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, type: 'location', id: location.id });
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  {selectedLocation ? (
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Edit Location
                        </Typography>
                        
                        <TextField
                          fullWidth
                          label="Location Name"
                          value={selectedLocation.locationName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateLocation({
                            ...selectedLocation,
                            locationName: e.target.value,
                          })}
                          sx={{ mb: 2 }}
                        />

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Environmental Guidelines
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {selectedLocation.environmentalGuidelines.map((guideline: string, index: number) => (
                            <Chip
                              key={index}
                              label={guideline}
                              onDelete={() => {
                                const newGuidelines = selectedLocation.environmentalGuidelines.filter(
                                  (_: string, i: number) => i !== index
                                );
                                handleUpdateLocation({
                                  ...selectedLocation,
                                  environmentalGuidelines: newGuidelines,
                                });
                              }}
                            />
                          ))}
                          <Chip label="+ Add" onClick={() => {
                            const guideline = prompt('Enter environmental guideline:');
                            if (guideline) {
                              handleUpdateLocation({
                                ...selectedLocation,
                                environmentalGuidelines: [...selectedLocation.environmentalGuidelines, guideline],
                              });
                            }
                          }} />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Reference Images ({selectedLocation.referenceImages.length})
                        </Typography>
                        <Grid container spacing={1}>
                          {selectedLocation.referenceImages.map((image: ReferenceImage) => (
                            <Grid size={{ xs: 4 }} key={image.id}>
                              <Card>
                                <CardMedia
                                  component="img"
                                  height={100}
                                  image={image.url}
                                  sx={{ objectFit: 'cover' }}
                                />
                              </Card>
                            </Grid>
                          ))}
                          <Grid size={{ xs: 4 }}>
                            <Card sx={{ 
                              height: 100, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: 2,
                              borderStyle: 'dashed',
                              borderColor: 'divider',
                              cursor: 'pointer',
                            }}
                            onClick={handleAddLocationImage}
                            >
                              <PhotoCamera color="action" />
                            </Card>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="info">
                      Select a location to edit or add a new one
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 3: Style */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <Palette sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Art Style
                      </Typography>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Art Style</InputLabel>
                        <Select
                          value={masterSheet.styleSheet.artStyle}
                          label="Art Style"
                          onChange={handleArtStyleChange}
                        >
                          <MenuItem value="anime">Anime</MenuItem>
                          <MenuItem value="realistic">Realistic</MenuItem>
                          <MenuItem value="cartoon">Cartoon</MenuItem>
                          <MenuItem value="watercolor">Watercolor</MenuItem>
                          <MenuItem value="oil-painting">Oil Painting</MenuItem>
                          <MenuItem value="sketch">Sketch</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <LightMode sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Lighting Style
                      </Typography>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Lighting Style</InputLabel>
                        <Select
                          value={masterSheet.styleSheet.lightingStyle}
                          label="Lighting Style"
                          onChange={handleLightingStyleChange}
                        >
                          <MenuItem value="natural">Natural</MenuItem>
                          <MenuItem value="dramatic">Dramatic</MenuItem>
                          <MenuItem value="cinematic">Cinematic</MenuItem>
                          <MenuItem value="soft">Soft</MenuItem>
                          <MenuItem value="high-contrast">High Contrast</MenuItem>
                          <MenuItem value="neon">Neon</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <Palette sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Global Color Palette
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {masterSheet.styleSheet.colorPalette.map((color: string, index: number) => (
                          <Box
                            key={index}
                            sx={{
                              width: 60,
                              height: 60,
                              bgcolor: color,
                              borderRadius: 1,
                              border: 2,
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'white', textShadow: '0 0 3px black' }}>
                              {color}
                            </Typography>
                          </Box>
                        ))}
                        <Button
                          variant="outlined"
                          onClick={() => {
                            const color = prompt('Enter color hex:');
                            if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
                              handleUpdateStyle({
                                colorPalette: [...masterSheet.styleSheet.colorPalette, color],
                              });
                            }
                          }}
                        >
                          Add Color
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <CameraAlt sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        Composition Guidelines
                      </Typography>
                      <List dense>
                        {masterSheet.styleSheet.compositionGuidelines.map((guideline: string, index: number) => (
                          <ListItem key={index}>
                            <ListItemText primary={guideline} />
                          </ListItem>
                        ))}
                      </List>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() => {
                          const guideline = prompt('Enter composition guideline:');
                          if (guideline) {
                            handleUpdateStyle({
                              compositionGuidelines: [...masterSheet.styleSheet.compositionGuidelines, guideline],
                            });
                          }
                        }}
                      >
                        Add Guideline
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 4: Overview */}
            <TabPanel value={tabValue} index={3}>
              <Alert severity="info" sx={{ mb: 3 }}>
                This is a summary of your master reference sheet. All settings here will be inherited by sequences and shots.
              </Alert>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Overview Statistics
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon><Person /></ListItemIcon>
                          <ListItemText 
                            primary="Characters" 
                            secondary={masterSheet.characterSheets.length} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><LocationOn /></ListItemIcon>
                          <ListItemText 
                            primary="Locations" 
                            secondary={masterSheet.locationSheets.length} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Image /></ListItemIcon>
                          <ListItemText 
                            primary="Total Reference Images" 
                            secondary={
                              masterSheet.characterSheets.reduce((sum: number, c: CharacterAppearanceSheet) => sum + c.appearanceImages.length, 0) +
                              masterSheet.locationSheets.reduce((sum: number, l: LocationAppearanceSheet) => sum + l.referenceImages.length, 0)
                            } 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Style Summary
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Art Style" 
                            secondary={masterSheet.styleSheet.artStyle} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Lighting" 
                            secondary={masterSheet.styleSheet.lightingStyle} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Color Palette" 
                            secondary={`${masterSheet.styleSheet.colorPalette.length} colors`} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Timeline
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Created" 
                            secondary={masterSheet.createdAt.toLocaleDateString()} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Last Updated" 
                            secondary={masterSheet.updatedAt.toLocaleDateString()} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, type: '', id: '' })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: '' })}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (deleteConfirm.type === 'character') {
                handleDeleteCharacter(deleteConfirm.id);
              } else if (deleteConfirm.type === 'location') {
                handleDeleteLocation(deleteConfirm.id);
              }
              setDeleteConfirm({ open: false, type: '', id: '' });
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </ConfirmDialog>
    </Dialog>
  );
};

export default ReferenceSheetManager;
