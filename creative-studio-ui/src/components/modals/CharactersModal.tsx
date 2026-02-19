/**
 * CharactersModal - Project character management modal
 *
 * Allows viewing, creating, editing, and deleting project characters.
 * Uses standardized types and components for consistency and to prevent data loss.
 */

import React, { useState } from 'react';
import './SharedModalStyles.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  UserIcon,
  PlusIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CharacterList } from '@/components/character/CharacterList';
import { CharacterEditor } from '@/components/character/CharacterEditor';
import type { Character } from '@/types/character';

interface CharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CharactersModal({ isOpen, onClose }: CharactersModalProps) {
  const project = useAppStore((state) => state.project);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);

  // Local state for editing
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  const handleCharacterClick = (character: Character) => {
    setEditingCharacterId(character.character_id);
  };

  const handleCreateNew = () => {
    onClose(); // Close this modal
    setShowCharacterWizard(true); // Open the wizard
  };

  const handleCloseEditor = () => {
    setEditingCharacterId(null);
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Project Characters</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center no-project-state">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="title">No project open</p>
            <p className="text-sm subtitle">Open a project to manage its characters</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                <span>Characters - {project.project_name}</span>
              </div>
              <Button
                onClick={handleCreateNew}
                size="sm"
                className="flex items-center gap-2"
                variant="outline"
              >
                <PlusIcon className="w-4 h-4" />
                New Character
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Characters List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <CharacterList
              onCharacterClick={handleCharacterClick}
              onCreateClick={handleCreateNew}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Editor Overlay */}
      {editingCharacterId && (
        <CharacterEditor
          characterId={editingCharacterId}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
}


