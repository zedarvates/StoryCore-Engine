/**
 * ProjectBranchingDialog Component
 * 
 * UI component for managing project branching, context export/import,
 * and "Start New Project from Here" / "Return to This Moment" features.
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
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Chip,
  Divider,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccountTreeOutlined,
  MergeType,
  ContentCopy,
  History,
  ArrowForward,
  ArrowBack,
  Add,
  Delete,
  Save,
  FolderOpen,
} from '@mui/icons-material';
import type { ContextScope, BranchInfo, ContextExport } from '../../services/projectBranchingService';

// ============================================================================
// Types
// ============================================================================

interface ProjectBranchingDialogProps {
  open: boolean;
  onClose: () => void;
  currentProjectId: string;
  currentShotId?: string;
  onBranchCreated?: (branchInfo: BranchInfo) => void;
  onContextImported?: (context: ContextExport) => void;
}

// ============================================================================
// Component
// ============================================================================

export const ProjectBranchingDialog: React.FC<ProjectBranchingDialogProps> = ({
  open,
  onClose,
  currentProjectId,
  currentShotId,
  onBranchCreated,
  onContextImported,
}: ProjectBranchingDialogProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [branchName, setBranchName] = useState('');
  const [branchDescription, setBranchDescription] = useState('');
  const [contextScope, setContextScope] = useState<ContextScope>('sequence');
  const [includeCharacters, setIncludeCharacters] = useState(true);
  const [includeWorlds, setIncludeWorlds] = useState(true);
  const [includeSequences, setIncludeSequences] = useState(true);
  const [includeShots, setIncludeShots] = useState(false);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [existingBranches, setExistingBranches] = useState<BranchInfo[]>([
    {
      id: 'branch_1',
      projectId: 'project_1',
      name: 'Dark Timeline',
      branchPointId: 'shot_5',
      createdAt: new Date('2024-02-01'),
      status: 'active',
    },
    {
      id: 'branch_2',
      projectId: 'project_1',
      name: 'Victory Path',
      branchPointId: 'shot_5',
      createdAt: new Date('2024-02-05'),
      status: 'active',
    },
  ]);

  const handleCreateBranch = () => {
    if (!branchName.trim()) return;

    const newBranch: BranchInfo = {
      id: `branch_${Date.now()}`,
      projectId: currentProjectId,
      name: branchName,
      branchPointId: currentShotId || 'project_start',
      createdAt: new Date(),
      status: 'active',
    };

    setExistingBranches([...existingBranches, newBranch]);
    onBranchCreated?.(newBranch);
    setBranchName('');
    setBranchDescription('');
  };

  const handleExportContext = () => {
    const contextExport: ContextExport = {
      projectId: currentProjectId,
      exportedAt: new Date(),
      branchPointId: currentShotId || 'project_start',
      contextScope,
      includedAssets: {
        characters: includeCharacters ? ['char_1', 'char_2'] : [],
        worlds: includeWorlds ? ['world_1'] : [],
        sequences: includeSequences ? ['seq_1'] : [],
        shots: includeShots ? currentShotId ? [currentShotId] : [] : [],
      },
      referenceSheets: {
        masterSheet: null,
        sequenceSheets: [],
      },
      metadata: {
        originalProjectName: 'Main Project',
        branchPointDescription: branchDescription,
        exportedBy: 'user',
      },
    };

    console.log('Exporting context:', contextExport);
    onContextImported?.(contextExport);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeOutlined color="primary" />
          <Typography variant="h6">Project Branching</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Create Branch" icon={<Add />} iconPosition="start" />
          <Tab label="Import Context" icon={<FolderOpen />} iconPosition="start" />
          <Tab label="Branch History" icon={<History />} iconPosition="start" />
        </Tabs>

        {/* Tab 0: Create Branch */}
        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Create New Project Branch
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start a new project variation from the current point. This allows you to explore
              different story directions without affecting the main project.
            </Typography>

            {currentShotId && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Branching from shot: <strong>{currentShotId}</strong>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Branch Name"
              placeholder="e.g., Dark Timeline, Victory Path, What If..."
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Description (Optional)"
              placeholder="Describe the story direction for this branch..."
              multiline
              rows={3}
              value={branchDescription}
              onChange={(e) => setBranchDescription(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Include in Branch
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={includeCharacters}
                  onChange={(e) => setIncludeCharacters(e.target.checked)}
                />
                <Typography>Characters & Appearances</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={includeWorlds}
                  onChange={(e) => setIncludeWorlds(e.target.checked)}
                />
                <Typography>Worlds & Environments</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={includeSequences}
                  onChange={(e) => setIncludeSequences(e.target.checked)}
                />
                <Typography>Sequences & Story Structure</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={includeShots}
                  onChange={(e) => setIncludeShots(e.target.checked)}
                />
                <Typography>Current Shot Only</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={includeReferences}
                  onChange={(e) => setIncludeReferences(e.target.checked)}
                />
                <Typography>Reference Sheets & Style Guides</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 1: Import Context */}
        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Import Branch Context
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bring in characters, settings, or style references from another project branch
              to maintain visual and narrative consistency.
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Import Scope</InputLabel>
              <Select
                value={contextScope}
                label="Import Scope"
                onChange={(e) => setContextScope(e.target.value as ContextScope)}
              >
                <MenuItem value="shot">Single Shot</MenuItem>
                <MenuItem value="sequence">Entire Sequence</MenuItem>
                <MenuItem value="act">Full Act</MenuItem>
                <MenuItem value="project">Entire Project</MenuItem>
              </Select>
            </FormControl>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Available Branches
              </Typography>
              <List dense>
                {existingBranches.map((branch) => (
                  <ListItem key={branch.id} disablePadding>
                    <ListItemButton>
                      <ListItemIcon>
                        <MergeType />
                      </ListItemIcon>
                      <ListItemText
                        primary={branch.name}
                        secondary={`Created ${branch.createdAt.toLocaleDateString()}`}
                      />
                      <Chip size="small" label={branch.status} color="primary" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>

            <Alert severity="warning">
              Importing context will merge assets into your current project. Some conflicts
              may require manual resolution.
            </Alert>
          </Box>
        )}

        {/* Tab 2: Branch History */}
        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Branch History
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and manage all project branches created from this project.
            </Typography>

            <List>
              {existingBranches.map((branch, index) => (
                <React.Fragment key={branch.id}>
                  <ListItem>
                    <ListItemIcon>
                      <AccountTreeOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight="bold">{branch.name}</Typography>
                          <Chip size="small" label={branch.status} color="primary" />
                        </Box>
                      }
                      secondary={`From shot: ${branch.branchPointId} • ${branch.createdAt.toLocaleDateString()}`}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" startIcon={<ArrowForward />}>
                        Open
                      </Button>
                      <Button size="small" startIcon={<MergeType />}>
                        Merge
                      </Button>
                    </Box>
                  </ListItem>
                  {index < existingBranches.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tabValue === 0 && (
          <Button
            variant="contained"
            startIcon={<AccountTreeOutlined />}
            onClick={handleCreateBranch}
            disabled={!branchName.trim()}
          >
            Create Branch
          </Button>
        )}
        {tabValue === 1 && (
          <Button
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={handleExportContext}
          >
            Import Selected
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProjectBranchingDialog;
