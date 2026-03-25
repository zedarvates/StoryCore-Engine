import React from 'react';
import { Button } from '@mui/material';
import { useProject } from '../contexts/ProjectContext';

export interface SequenceEditorProps {
  sequenceId?: string;
  onBack?: () => void;
}

export const SequenceEditor: React.FC<SequenceEditorProps> = ({ sequenceId, onBack }) => {
  const { project } = useProject();
  return (
    <div className="sequence-editor">
      <div className="project-cards">
        {project && project.shots?.map((shot) => (
          <div key={shot.id} className="project-card">
            <h3>{shot.name}</h3>
            <p>{shot.description || 'No description'}</p>
            <Button 
              variant="contained"
              color="primary"
              onClick={() => openProjectFolder(project?.path || '')}
            >
              Open Project Folder
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const openProjectFolder = (path: string) => {
  // Implementation to open the folder in OS Explorer
  // Example for Windows: `explorer.exe /select, "path"`
  // Note: This requires proper permissions and may need to be handled via Electron in a real app
};

export default SequenceEditor;